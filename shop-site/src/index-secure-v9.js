import coreWorker from './index-secure-v7.js';

const PROVIDER='variza';
const PAY_URL='https://variza.ir/api/v1/pay';
const PAYMENT_BASE='https://variza.ir/pay/';
const PAYMENT_TEST_AMOUNT=10000;
const enc=new TextEncoder();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function cleanText(v,max=180){return String(v??'').replace(/\s+/g,' ').trim().slice(0,max)}
function normalizePhone(v){let s=String(v||'').replace(/\D/g,'');if(s.startsWith('0098'))s=s.slice(4);else if(s.startsWith('98'))s=s.slice(2);if(s.startsWith('9'))s='0'+s;return s}
function validPhone(v){return /^09\d{9}$/.test(normalizePhone(v))}
function apiKeyConfigured(env){return typeof env.VARIZA_API_KEY==='string'&&env.VARIZA_API_KEY.trim().length>=20}
function webhookConfigured(env){return typeof env.VARIZA_WEBHOOK_SECRET==='string'&&env.VARIZA_WEBHOOK_SECRET.trim().length>=16}
function gatewayConfigured(env){return apiKeyConfigured(env)&&webhookConfigured(env)}
async function authProbe(request,env){const u=new URL('/api/admin/orders?limit=1',request.url);const r=await coreWorker.fetch(new Request(u,{method:'GET',headers:request.headers}),env);return r.ok}
function toHex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function secureEqual(a,b){
  const [ha,hb]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(String(a))),crypto.subtle.digest('SHA-256',enc.encode(String(b)))]);
  const aa=new Uint8Array(ha),bb=new Uint8Array(hb);let diff=aa.length^bb.length;
  for(let i=0;i<Math.min(aa.length,bb.length);i++)diff|=aa[i]^bb[i];
  return diff===0;
}
async function webhookSignature(secret,raw){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(raw));
  return 'sha256='+toHex(new Uint8Array(sig));
}
async function postVariza(payload,env){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const r=await fetch(PAY_URL,{method:'POST',headers:{'authorization':'Bearer '+env.VARIZA_API_KEY,'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={raw:text}}
    if(!r.ok){const e=new Error('variza_http_'+r.status);e.status=r.status;e.data=data;throw e}
    return data;
  }finally{clearTimeout(timer)}
}
async function paymentConfig(env){
  const enabled=gatewayConfigured(env);
  return json({enabled,provider:PROVIDER,flow:'variza-api-webhook-v1',api_key_configured:apiKeyConfigured(env),webhook_configured:webhookConfigured(env),webhook_url:'https://shop.fireexecutive.ir/api/webhooks/variza',message:enabled?'اتصال واریزا آماده استفاده است.':'اتصال واریزا آماده است؛ API Key و Webhook Secret باید به‌صورت Cloudflare Secret ثبت شوند.'});
}
async function createPaymentTestOrder(request,env){
  if(!(await authProbe(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  let body;try{body=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const phone=normalizePhone(cleanText(body?.phone,30));
  if(!validPhone(phone))return json({error:'شماره موبایل معتبر را وارد کنید'},400);
  const existing=await env.DB.prepare(`SELECT id,order_code,payment_status,payable_amount_toman FROM orders WHERE phone=? AND notes='VARIZA_PAYMENT_TEST' AND payment_status IN ('ready','requested') ORDER BY id DESC LIMIT 1`).bind(phone).first();
  if(existing)return json({ok:true,reused:true,order_code:existing.order_code,phone,amount_toman:existing.payable_amount_toman||PAYMENT_TEST_AMOUNT,track_url:`/track/?code=${encodeURIComponent(existing.order_code)}`});
  const now=new Date().toISOString(),stamp=now.replace(/\D/g,'').slice(2,14),suffix=crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase(),orderCode=`VT-${stamp}-${suffix}`;
  await env.DB.prepare(`INSERT INTO orders(order_code,customer_name,phone,notes,status,created_at,inventory_applied,updated_at,terms_accepted_at,terms_version,payment_method,payment_status,payable_amount_toman,payment_updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderCode,'تست پرداخت واریزا',phone,'VARIZA_PAYMENT_TEST','confirmed',now,0,now,now,'2026-10-02-v1','variza_test','ready',PAYMENT_TEST_AMOUNT,now).run();
  const row=await env.DB.prepare(`SELECT id FROM orders WHERE order_code=? LIMIT 1`).bind(orderCode).first();
  if(!row)return json({error:'ساخت سفارش آزمایشی انجام نشد'},500);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO order_status_history(order_id,from_status,to_status,changed_at) VALUES(?,?,?,?)`).bind(row.id,null,'confirmed',now),
    env.DB.prepare(`INSERT INTO payment_events(order_id,event_type,amount_toman,created_at) VALUES(?,?,?,?)`).bind(row.id,'test_ready',PAYMENT_TEST_AMOUNT,now)
  ]);
  return json({ok:true,reused:false,order_code:orderCode,phone,amount_toman:PAYMENT_TEST_AMOUNT,track_url:`/track/?code=${encodeURIComponent(orderCode)}`},201);
}
async function createPayment(request,env){
  if(!gatewayConfigured(env))return json({error:'واریزا هنوز با API Key و Webhook Secret واقعی فعال نشده است'},503);
  let body;try{body=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const code=cleanText(body?.order_code,40).toUpperCase(),phone=cleanText(body?.phone,30);
  if(!code||!validPhone(phone))return json({error:'کد پیگیری و شماره موبایل معتبر را وارد کنید'},400);
  const order=await env.DB.prepare(`SELECT id,order_code,phone,status,terms_accepted_at,payment_status,payable_amount_toman,payment_gateway_amount_toman,payment_authority,payment_provider FROM orders WHERE order_code=? LIMIT 1`).bind(code).first();
  if(!order||normalizePhone(order.phone)!==normalizePhone(phone))return json({error:'سفارشی با این مشخصات پیدا نشد'},404);
  if(!order.terms_accepted_at)return json({error:'پذیرش قوانین برای این سفارش ثبت نشده است'},409);
  if(!['confirmed','ready_to_ship'].includes(String(order.status)))return json({error:'سفارش هنوز توسط فروشگاه برای پرداخت تأیید نشده است'},409);
  if(order.payment_status==='paid')return json({error:'این سفارش قبلاً پرداخت شده است'},409);
  if(order.payment_status==='requested'&&order.payment_provider===PROVIDER&&order.payment_authority){
    return json({ok:true,provider:PROVIDER,payment_url:PAYMENT_BASE+encodeURIComponent(order.payment_authority),reused:true});
  }
  if(order.payment_status!=='ready'||!Number.isInteger(order.payable_amount_toman))return json({error:'مبلغ نهایی سفارش هنوز برای پرداخت آماده نشده است'},409);
  const origin=new URL(request.url).origin;
  const payload={amount:order.payable_amount_toman,return_url:`${origin}/track/?code=${encodeURIComponent(order.order_code)}`,title:`سفارش ${order.order_code} | سروش ایمنی شهر`,expires_in:'1h'};
  let data;
  try{data=await postVariza(payload,env)}catch(e){
    console.error('variza pay error',e?.status,e?.data||e);
    const status=e?.status===401?502:e?.status===422?409:e?.status===429?429:502;
    return json({error:e?.status===422?'تنظیمات واریزا یا کارت مقصد کامل نیست؛ callback_url و حساب بانکی را بررسی کنید':'ارتباط با واریزا برقرار نشد؛ کمی بعد دوباره تلاش کنید'},status);
  }
  const slug=cleanText(data?.slug,120),payUrl=cleanText(data?.pay_url,500),gatewayAmount=Number(data?.amount);
  if(!slug||!/^https:\/\/variza\.ir\/pay\//i.test(payUrl)||!Number.isInteger(gatewayAmount)||gatewayAmount<1000)return json({error:'پاسخ واریزا برای ساخت لینک پرداخت معتبر نبود'},502);
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE orders SET payment_status='requested',payment_provider=?,payment_authority=?,payment_reference=NULL,payment_gateway_amount_toman=?,payment_requested_at=?,payment_updated_at=? WHERE id=?`).bind(PROVIDER,slug,gatewayAmount,now,now,order.id),
    env.DB.prepare(`INSERT INTO payment_events(order_id,event_type,provider,authority,amount_toman,created_at) VALUES(?,?,?,?,?,?)`).bind(order.id,'requested',PROVIDER,slug,gatewayAmount,now)
  ]);
  return json({ok:true,provider:PROVIDER,payment_url:payUrl,amount_toman:gatewayAmount});
}
async function varizaWebhook(request,env){
  if(!webhookConfigured(env))return json({error:'Webhook واریزا هنوز پیکربندی نشده است'},503);
  const raw=await request.text(),given=request.headers.get('x-webhook-signature')||'',delivery=cleanText(request.headers.get('x-delivery-id'),180),eventHeader=cleanText(request.headers.get('x-event'),80);
  if(!given||!delivery)return json({error:'هدرهای امنیتی وب‌هوک ناقص است'},400);
  const expected=await webhookSignature(env.VARIZA_WEBHOOK_SECRET,raw);
  if(!(await secureEqual(given,expected)))return json({error:'امضای وب‌هوک معتبر نیست'},400);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'بدنه وب‌هوک نامعتبر است'},400)}
  const event=cleanText(body?.event,80),slug=cleanText(body?.slug,120),status=cleanText(body?.status,40),reference=cleanText(body?.attempt_code,120),amount=Number(body?.amount);
  if(eventHeader&&eventHeader!=='payment.paid')return json({error:'رویداد وب‌هوک پشتیبانی نمی‌شود'},400);
  if(event!=='payment.paid'||status!=='paid'||!slug||!Number.isInteger(amount))return json({error:'محتوای وب‌هوک پرداخت معتبر نیست'},400);
  const seen=await env.DB.prepare(`SELECT id FROM payment_events WHERE delivery_id=? LIMIT 1`).bind(delivery).first();
  if(seen)return json({ok:true,duplicate:true});
  const order=await env.DB.prepare(`SELECT id,order_code,payment_status,payable_amount_toman,payment_gateway_amount_toman,payment_provider,payment_authority FROM orders WHERE payment_provider=? AND payment_authority=? LIMIT 1`).bind(PROVIDER,slug).first();
  if(!order)return json({error:'سفارش متناظر با این پرداخت پیدا نشد'},404);
  if(order.payment_status==='paid')return json({ok:true,duplicate:true,order_code:order.order_code});
  const expectedAmount=Number.isInteger(order.payment_gateway_amount_toman)?order.payment_gateway_amount_toman:order.payable_amount_toman;
  if(!Number.isInteger(expectedAmount)||amount!==expectedAmount)return json({error:'مبلغ وب‌هوک با مبلغ سفارش تطبیق ندارد'},409);
  const now=new Date().toISOString(),ref=reference||slug;
  try{
    await env.DB.batch([
      env.DB.prepare(`UPDATE orders SET payment_status='paid',payment_reference=?,payment_paid_at=?,payment_updated_at=? WHERE id=? AND payment_status!='paid'`).bind(ref,now,now,order.id),
      env.DB.prepare(`INSERT INTO payment_events(order_id,event_type,provider,authority,reference,amount_toman,delivery_id,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(order.id,'paid',PROVIDER,slug,ref,amount,delivery,now)
    ]);
  }catch(err){
    const again=await env.DB.prepare(`SELECT payment_status FROM orders WHERE id=? LIMIT 1`).bind(order.id).first();
    if(again?.payment_status==='paid')return json({ok:true,duplicate:true,order_code:order.order_code});
    throw err;
  }
  return json({ok:true,order_code:order.order_code,payment_status:'paid'});
}
async function enhanceOrderStatus(request,env){
  const response=await coreWorker.fetch(request,env);if(!response.ok)return response;
  const data=await response.json();
  const code=cleanText(new URL(request.url).searchParams.get('code'),40).toUpperCase();
  const row=await env.DB.prepare(`SELECT payment_status,payable_amount_toman,payment_gateway_amount_toman,payment_provider,payment_reference,payment_paid_at,notes FROM orders WHERE order_code=? LIMIT 1`).bind(code).first();
  return json({...data,is_payment_test:row?.notes==='VARIZA_PAYMENT_TEST',payment:{...(data.payment||{}),online_enabled:gatewayConfigured(env),status:row?.payment_status||'not_ready',amount_toman:Number.isInteger(row?.payable_amount_toman)?row.payable_amount_toman:null,gateway_amount_toman:Number.isInteger(row?.payment_gateway_amount_toman)?row.payment_gateway_amount_toman:null,provider:row?.payment_provider||null,reference:row?.payment_reference||null,paid_at:row?.payment_paid_at||null}});
}
async function health(request,env){
  const response=await coreWorker.fetch(request,env),data=await response.json().catch(()=>({ok:true,service:'soroush-shop'}));
  return json({...data,payment_gateway:'variza-v1',variza_api_key_configured:apiKeyConfigured(env),variza_webhook_configured:webhookConfigured(env),variza_configured:gatewayConfigured(env),payment_test_order:'admin-v1'});
}
export default{
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
      if(url.pathname==='/api/payment/config'&&request.method==='GET')return paymentConfig(env);
      if(url.pathname==='/api/admin/payment-test-order'&&request.method==='POST')return createPaymentTestOrder(request,env);
      if(url.pathname==='/api/payments/create'&&request.method==='POST')return createPayment(request,env);
      if(url.pathname==='/api/webhooks/variza'&&request.method==='POST')return varizaWebhook(request,env);
      if(url.pathname==='/api/order-status'&&request.method==='GET')return enhanceOrderStatus(request,env);
      return coreWorker.fetch(request,env);
    }catch(err){console.error(err);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}
  }
};

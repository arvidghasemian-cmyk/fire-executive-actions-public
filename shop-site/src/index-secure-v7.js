import coreWorker from './index-secure-v6.js';

const PAYMENT_FLOW='prepared-v1';
const ONLINE_PAYMENT_ENABLED=false;
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function cleanText(v,max=180){return String(v??'').replace(/\s+/g,' ').trim().slice(0,max)}
function normalizePhone(v){let s=String(v||'').replace(/\D/g,'');if(s.startsWith('0098'))s=s.slice(4);else if(s.startsWith('98'))s=s.slice(2);if(s.startsWith('9'))s='0'+s;return s}
function validPhone(v){return /^09\d{9}$/.test(normalizePhone(v))}
async function authProbe(request,env){const u=new URL('/api/admin/orders?limit=1',request.url);const r=await coreWorker.fetch(new Request(u,{method:'GET',headers:request.headers}),env);return r.ok}

async function paymentConfig(){
  return json({enabled:ONLINE_PAYMENT_ENABLED,flow:PAYMENT_FLOW,provider:null,message:'پرداخت آنلاین هنوز فعال نشده است؛ ساختار فروشگاه برای اتصال درگاه واقعی آماده است.'});
}

async function enhanceOrderStatus(request,env){
  const response=await coreWorker.fetch(request,env);if(!response.ok)return response;
  const data=await response.json();
  const code=cleanText(new URL(request.url).searchParams.get('code'),40).toUpperCase();
  const row=await env.DB.prepare(`SELECT payment_status,payable_amount_toman,payment_provider,payment_reference,payment_paid_at FROM orders WHERE order_code=? LIMIT 1`).bind(code).first();
  return json({...data,payment:{online_enabled:ONLINE_PAYMENT_ENABLED,status:row?.payment_status||'not_ready',amount_toman:Number.isInteger(row?.payable_amount_toman)?row.payable_amount_toman:null,provider:row?.payment_provider||null,reference:row?.payment_reference||null,paid_at:row?.payment_paid_at||null}});
}

async function enhanceAdminOrders(request,env){
  const response=await coreWorker.fetch(request,env);if(!response.ok)return response;
  const data=await response.json();const ids=(data.orders||[]).map(o=>o.id);if(!ids.length)return json(data,response.status);
  const ph=ids.map(()=>'?').join(',');
  const {results=[]}=await env.DB.prepare(`SELECT id,payment_status,payable_amount_toman,payment_provider,payment_authority,payment_reference,payment_requested_at,payment_paid_at,payment_updated_at FROM orders WHERE id IN (${ph})`).bind(...ids).all();
  const extra=new Map(results.map(x=>[x.id,x]));
  return json({...data,orders:(data.orders||[]).map(o=>({...o,...(extra.get(o.id)||{})}))},response.status);
}

async function setPaymentReadiness(request,env,id){
  if(!(await authProbe(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  let body;try{body=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const order=await env.DB.prepare(`SELECT id,status,payment_status FROM orders WHERE id=? LIMIT 1`).bind(Number(id)).first();
  if(!order)return json({error:'سفارش پیدا نشد'},404);
  if(order.payment_status==='paid')return json({error:'وضعیت پرداخت‌شده از این مسیر قابل تغییر نیست'},409);
  const ready=body?.ready===true;
  const now=new Date().toISOString();
  if(!ready){
    await env.DB.batch([
      env.DB.prepare(`UPDATE orders SET payment_status='not_ready',payable_amount_toman=NULL,payment_provider=NULL,payment_authority=NULL,payment_reference=NULL,payment_requested_at=NULL,payment_updated_at=? WHERE id=?`).bind(now,order.id),
      env.DB.prepare(`INSERT INTO payment_events(order_id,event_type,created_at) VALUES(?,?,?)`).bind(order.id,'not_ready',now)
    ]);
    return json({ok:true,payment_status:'not_ready'});
  }
  if(!['confirmed','ready_to_ship'].includes(String(order.status)))return json({error:'ابتدا سفارش باید توسط فروشگاه تأیید شود'},409);
  const {results:items=[]}=await env.DB.prepare(`SELECT quantity,unit_price_toman FROM order_items WHERE order_id=? ORDER BY id`).bind(order.id).all();
  if(!items.length||items.some(x=>!Number.isInteger(x.unit_price_toman)))return json({error:'همه اقلام باید قیمت قطعی داشته باشند'},409);
  const amount=Number(body?.amount_toman);
  if(!Number.isInteger(amount)||amount<1000||amount>999999999999)return json({error:'مبلغ نهایی پرداخت معتبر نیست'},400);
  await env.DB.batch([
    env.DB.prepare(`UPDATE orders SET payment_status='ready',payable_amount_toman=?,payment_provider=NULL,payment_authority=NULL,payment_reference=NULL,payment_requested_at=NULL,payment_updated_at=? WHERE id=?`).bind(amount,now,order.id),
    env.DB.prepare(`INSERT INTO payment_events(order_id,event_type,amount_toman,created_at) VALUES(?,?,?,?)`).bind(order.id,'ready',amount,now)
  ]);
  return json({ok:true,payment_status:'ready',amount_toman:amount,online_enabled:ONLINE_PAYMENT_ENABLED});
}

async function createPayment(request,env){
  let body;try{body=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const code=cleanText(body?.order_code,40).toUpperCase(),phone=cleanText(body?.phone,30);
  if(!code||!validPhone(phone))return json({error:'کد پیگیری و شماره موبایل معتبر را وارد کنید'},400);
  const order=await env.DB.prepare(`SELECT id,phone,status,terms_accepted_at,payment_status,payable_amount_toman FROM orders WHERE order_code=? LIMIT 1`).bind(code).first();
  if(!order||normalizePhone(order.phone)!==normalizePhone(phone))return json({error:'سفارشی با این مشخصات پیدا نشد'},404);
  if(!order.terms_accepted_at)return json({error:'پذیرش قوانین برای این سفارش ثبت نشده است'},409);
  if(!['confirmed','ready_to_ship'].includes(String(order.status)))return json({error:'سفارش هنوز توسط فروشگاه برای پرداخت تأیید نشده است'},409);
  if(order.payment_status!=='ready'||!Number.isInteger(order.payable_amount_toman))return json({error:'مبلغ نهایی سفارش هنوز برای پرداخت آماده نشده است'},409);
  if(!ONLINE_PAYMENT_ENABLED)return json({error:'پرداخت آنلاین هنوز فعال نشده است؛ پس از اتصال درگاه واقعی این مرحله بدون تغییر سفارش فعال می‌شود.',payment_status:'ready',amount_toman:order.payable_amount_toman},503);
  return json({error:'ارائه‌دهنده درگاه هنوز پیکربندی نشده است'},503);
}

async function health(request,env){
  const response=await coreWorker.fetch(request,env);const data=await response.json().catch(()=>({ok:true,service:'soroush-shop'}));
  return json({...data,payment_readiness:PAYMENT_FLOW,online_payment_enabled:ONLINE_PAYMENT_ENABLED});
}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
      if(url.pathname==='/api/payment/config'&&request.method==='GET')return paymentConfig();
      if(url.pathname==='/api/order-status'&&request.method==='GET')return enhanceOrderStatus(request,env);
      if(url.pathname==='/api/admin/orders'&&request.method==='GET')return enhanceAdminOrders(request,env);
      const ready=url.pathname.match(/^\/api\/admin\/orders\/(\d+)\/payment-readiness$/);if(ready&&request.method==='PUT')return setPaymentReadiness(request,env,ready[1]);
      if(url.pathname==='/api/payments/create'&&request.method==='POST')return createPayment(request,env);
      return coreWorker.fetch(request,env);
    }catch(err){console.error(err);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}
  }
};

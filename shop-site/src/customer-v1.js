import coreWorker from './sales-tools-v1.js';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const now=()=>new Date().toISOString();
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const enc=new TextEncoder();
const COOKIE='soroush_customer';
const OTP_TTL=5*60*1000,SESSION_TTL=30*24*60*60*1000;
const labels={new:'جدید',contacted:'تماس گرفته شد',quoted:'قیمت اعلام شد',confirmed:'تأیید شد',ready_to_ship:'آماده ارسال',shipped:'ارسال شد',closed:'بسته شد',cancelled:'لغو شد'};
function phone(v){let s=String(v||'').replace(/\D/g,'');if(s.startsWith('0098'))s=s.slice(4);else if(s.startsWith('98'))s=s.slice(2);if(s.startsWith('9'))s='0'+s;return s}
function validPhone(v){return /^09\d{9}$/.test(phone(v))}
function sameOrigin(request){const o=request.headers.get('origin');return !o||o===new URL(request.url).origin}
function rootSecret(env){return clean(env.CUSTOMER_AUTH_SECRET||env.ADMIN_SESSION_SECRET,500)}
function authConfigured(env){return rootSecret(env).length>=32}
function otpSmsConfigured(env){return clean(env.KAVENEGAR_API_KEY,300).length>=10&&clean(env.KAVENEGAR_OTP_TEMPLATE,120).length>=2}
function statusSmsConfigured(env){return clean(env.KAVENEGAR_API_KEY,300).length>=10&&clean(env.KAVENEGAR_STATUS_TEMPLATE,120).length>=2}
function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function mac(env,value){const key=await crypto.subtle.importKey('raw',enc.encode(rootSecret(env)),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))))}
function cookieValue(request){const raw=request.headers.get('cookie')||'';for(const part of raw.split(';')){const [k,...rest]=part.trim().split('=');if(k===COOKIE)return rest.join('=')}return ''}
function randomDigits(){const b=new Uint32Array(1);crypto.getRandomValues(b);return String(b[0]%1000000).padStart(6,'0')}
function randomToken(){const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function body(request){try{const v=await request.json();if(!v||typeof v!=='object'||Array.isArray(v))throw new Error();return v}catch{throw Object.assign(new Error('درخواست معتبر نیست'),{status:400})}}
async function outbox(env,{phone:mobile,kind,order_id=null,order_code=null,order_status=null,provider='kavenegar',provider_message_id=null,status,error=null,sent_at=null}){await env.DB.prepare('INSERT INTO sms_outbox(phone,kind,order_id,order_code,order_status,provider,provider_message_id,status,error,created_at,sent_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(mobile,kind,order_id,order_code,order_status,provider,provider_message_id,status,error,now(),sent_at).run()}
async function kavenegarLookup(env,mobile,template,token,token2=''){
  const key=encodeURIComponent(clean(env.KAVENEGAR_API_KEY,300)),params=new URLSearchParams({receptor:mobile,token:clean(token,100),template:clean(template,120)});if(token2)params.set('token2',clean(token2,100));
  const r=await fetch(`https://api.kavenegar.com/v1/${key}/verify/lookup.json?${params}`,{headers:{accept:'application/json'}});const text=await r.text();let d={};try{d=JSON.parse(text)}catch{}
  if(!r.ok)throw new Error('kavenegar_http_'+r.status);return d;
}
async function sendOtp(env,mobile,code){
  if(env.SMS_TEST_MODE==='1'){await outbox(env,{phone:mobile,kind:'otp',provider:'test',status:'sent',sent_at:now()});return {test_code:code,provider:'test'}}
  if(!otpSmsConfigured(env))return null;
  try{const d=await kavenegarLookup(env,mobile,env.KAVENEGAR_OTP_TEMPLATE,code);const id=String(d?.entries?.[0]?.messageid||'');await outbox(env,{phone:mobile,kind:'otp',provider_message_id:id||null,status:'sent',sent_at:now()});return {provider:'kavenegar'}}catch(e){await outbox(env,{phone:mobile,kind:'otp',status:'failed',error:clean(e.message,300)});throw e}
}
async function requestOtp(request,env){
  if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
  if(!authConfigured(env))return json({error:'ورود مشتری هنوز پیکربندی نشده است'},503);
  const b=await body(request),mobile=phone(b.phone);if(!validPhone(mobile))return json({error:'شماره موبایل معتبر وارد کنید'},400);
  if(env.SMS_TEST_MODE!=='1'&&!otpSmsConfigured(env))return json({error:'سرویس پیامک ورود هنوز فعال نشده است'},503);
  const since=new Date(Date.now()-15*60*1000).toISOString(),rate=await env.DB.prepare('SELECT COUNT(*) c FROM customer_otp_challenges WHERE phone=? AND created_at>=?').bind(mobile,since).first();if(Number(rate?.c||0)>=4)return json({error:'تعداد درخواست کد زیاد است؛ کمی بعد دوباره تلاش کنید'},429);
  const code=env.SMS_TEST_MODE==='1'&&/^\d{6}$/.test(String(env.CUSTOMER_OTP_TEST_CODE||''))?String(env.CUSTOMER_OTP_TEST_CODE):randomDigits(),expires=new Date(Date.now()+OTP_TTL).toISOString(),hash=await mac(env,`otp|${mobile}|${code}|${expires}`);
  await env.DB.prepare('INSERT INTO customer_otp_challenges(phone,code_hash,expires_at,attempts,created_at) VALUES(?,?,?,0,?)').bind(mobile,hash,expires,now()).run();
  try{const sent=await sendOtp(env,mobile,code);return json({ok:true,delivery:sent?.provider||'sms',...(sent?.test_code?{test_code:sent.test_code}:{})})}catch{return json({error:'ارسال پیامک انجام نشد؛ کمی بعد دوباره تلاش کنید'},502)}
}
async function verifyOtp(request,env){
  if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);if(!authConfigured(env))return json({error:'ورود مشتری هنوز پیکربندی نشده است'},503);
  const b=await body(request),mobile=phone(b.phone),code=String(b.code||'').replace(/\D/g,'');if(!validPhone(mobile)||!/^\d{6}$/.test(code))return json({error:'شماره یا کد معتبر نیست'},400);
  const row=await env.DB.prepare('SELECT * FROM customer_otp_challenges WHERE phone=? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1').bind(mobile).first();if(!row||row.expires_at<=now())return json({error:'کد منقضی شده است؛ کد جدید بگیرید'},410);if(Number(row.attempts)>=5)return json({error:'تعداد تلاش مجاز تمام شده است؛ کد جدید بگیرید'},429);
  const expected=await mac(env,`otp|${mobile}|${code}|${row.expires_at}`);if(expected!==row.code_hash){await env.DB.prepare('UPDATE customer_otp_challenges SET attempts=attempts+1 WHERE id=?').bind(row.id).run();return json({error:'کد تأیید نادرست است'},400)}
  const t=now(),latest=await env.DB.prepare('SELECT customer_name FROM orders WHERE phone=? ORDER BY id DESC LIMIT 1').bind(mobile).first(),name=clean(latest?.customer_name,180)||null;
  await env.DB.batch([
    env.DB.prepare('UPDATE customer_otp_challenges SET consumed_at=?,attempts=attempts+1 WHERE id=?').bind(t,row.id),
    env.DB.prepare('INSERT INTO customer_accounts(phone,name,created_at,updated_at,last_login_at) VALUES(?,?,?,?,?) ON CONFLICT(phone) DO UPDATE SET name=COALESCE(customer_accounts.name,excluded.name),updated_at=excluded.updated_at,last_login_at=excluded.last_login_at').bind(mobile,name,t,t,t),
    env.DB.prepare('INSERT INTO customer_notification_preferences(phone,order_status_sms,updated_at) VALUES(?,1,?) ON CONFLICT(phone) DO NOTHING').bind(mobile,t)
  ]);
  const token=randomToken(),tokenHash=await mac(env,'session|'+token),expires=new Date(Date.now()+SESSION_TTL).toISOString();await env.DB.prepare('INSERT INTO customer_sessions(token_hash,phone,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?)').bind(tokenHash,mobile,expires,t,t).run();
  const headers={'set-cookie':`${COOKIE}=${token}; Path=/; Max-Age=${Math.floor(SESSION_TTL/1000)}; HttpOnly; Secure; SameSite=Lax`};return json({ok:true,phone:mobile,name},200,headers);
}
async function session(request,env){if(!authConfigured(env))return null;const token=cookieValue(request);if(!token)return null;const hash=await mac(env,'session|'+token),row=await env.DB.prepare('SELECT s.phone,s.expires_at,a.name FROM customer_sessions s LEFT JOIN customer_accounts a ON a.phone=s.phone WHERE s.token_hash=? LIMIT 1').bind(hash).first();if(!row||row.expires_at<=now())return null;await env.DB.prepare('UPDATE customer_sessions SET last_seen_at=? WHERE token_hash=?').bind(now(),hash).run();return row}
async function me(request,env){const s=await session(request,env);if(!s)return json({error:'نیاز به ورود مشتری'},401);const pref=await env.DB.prepare('SELECT order_status_sms FROM customer_notification_preferences WHERE phone=?').bind(s.phone).first();return json({phone:s.phone,name:s.name||null,order_status_sms:Number(pref?.order_status_sms??1)===1})}
async function orders(request,env){const s=await session(request,env);if(!s)return json({error:'نیاز به ورود مشتری'},401);const {results}=await env.DB.prepare(`SELECT o.order_code,o.status,o.payment_status,o.grand_total_toman,o.payable_amount_toman,o.created_at,o.tracking_number,o.tracking_url,(SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) item_count FROM orders o WHERE o.phone=? AND COALESCE(o.notes,'')<>'VARIZA_PAYMENT_TEST' ORDER BY o.id DESC LIMIT 200`).bind(s.phone).all();return json({orders:results})}
async function preferences(request,env){const s=await session(request,env);if(!s)return json({error:'نیاز به ورود مشتری'},401);if(request.method==='GET')return me(request,env);if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);const b=await body(request),enabled=b.order_status_sms!==false&&b.order_status_sms!==0;await env.DB.prepare('INSERT INTO customer_notification_preferences(phone,order_status_sms,updated_at) VALUES(?,?,?) ON CONFLICT(phone) DO UPDATE SET order_status_sms=excluded.order_status_sms,updated_at=excluded.updated_at').bind(s.phone,enabled?1:0,now()).run();return json({ok:true,order_status_sms:enabled})}
async function logout(request,env){if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);const token=cookieValue(request);if(token&&authConfigured(env)){const hash=await mac(env,'session|'+token);await env.DB.prepare('DELETE FROM customer_sessions WHERE token_hash=?').bind(hash).run()}return json({ok:true},200,{'set-cookie':`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`})}
async function notifyStatus(env,order){
  if(!order||order.notes==='VARIZA_PAYMENT_TEST'||!validPhone(order.phone))return;const pref=await env.DB.prepare('SELECT order_status_sms FROM customer_notification_preferences WHERE phone=?').bind(phone(order.phone)).first();if(Number(pref?.order_status_sms??1)!==1)return;
  const mobile=phone(order.phone),label=labels[order.status]||order.status;
  if(env.SMS_TEST_MODE==='1'){await outbox(env,{phone:mobile,kind:'order_status',order_id:order.id,order_code:order.order_code,order_status:order.status,provider:'test',status:'sent',sent_at:now()});return}
  if(!statusSmsConfigured(env)){await outbox(env,{phone:mobile,kind:'order_status',order_id:order.id,order_code:order.order_code,order_status:order.status,status:'disabled',error:'status template not configured'});return}
  try{const d=await kavenegarLookup(env,mobile,env.KAVENEGAR_STATUS_TEMPLATE,order.order_code,label),id=String(d?.entries?.[0]?.messageid||'');await outbox(env,{phone:mobile,kind:'order_status',order_id:order.id,order_code:order.order_code,order_status:order.status,provider_message_id:id||null,status:'sent',sent_at:now()})}catch(e){await outbox(env,{phone:mobile,kind:'order_status',order_id:order.id,order_code:order.order_code,order_status:order.status,status:'failed',error:clean(e.message,300)})}
}
async function health(request,env){const r=await coreWorker.fetch(request,env),d=await r.json().catch(()=>({ok:true,service:'soroush-shop'}));return json({...d,customer_accounts:'v1',customer_auth:'otp-session-v1',customer_auth_configured:authConfigured(env),sms_notifications:'kavenegar-v1',sms_otp_configured:otpSmsConfigured(env),sms_status_configured:statusSmsConfigured(env)})}

export default{async fetch(request,env){const url=new URL(request.url);try{
  if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
  if(url.pathname==='/api/customer/auth/request'&&request.method==='POST')return requestOtp(request,env);
  if(url.pathname==='/api/customer/auth/verify'&&request.method==='POST')return verifyOtp(request,env);
  if(url.pathname==='/api/customer/logout'&&request.method==='POST')return logout(request,env);
  if(url.pathname==='/api/customer/me'&&request.method==='GET')return me(request,env);
  if(url.pathname==='/api/customer/orders'&&request.method==='GET')return orders(request,env);
  if(url.pathname==='/api/customer/preferences'&&(request.method==='GET'||request.method==='PUT'))return preferences(request,env);
  const adminStatus=url.pathname.match(/^\/api\/admin\/orders\/(\d+)$/);if(adminStatus&&request.method==='PATCH'){
    const before=await env.DB.prepare('SELECT id,order_code,phone,status,notes FROM orders WHERE id=?').bind(Number(adminStatus[1])).first();const response=await coreWorker.fetch(request,env);if(response.ok&&before){const after=await env.DB.prepare('SELECT id,order_code,phone,status,notes FROM orders WHERE id=?').bind(before.id).first();if(after&&after.status!==before.status)await notifyStatus(env,after)}return response;
  }
  return coreWorker.fetch(request,env);
}catch(e){console.error(e);return url.pathname.startsWith('/api/')?json({error:e?.status?e.message:'خطای داخلی سرور'},e?.status||500):new Response('خطای داخلی سرور',{status:500})}}};

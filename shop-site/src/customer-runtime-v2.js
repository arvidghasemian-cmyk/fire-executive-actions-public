import customerWorker from './customer-v1.js';
import coreWorker from './margin-protection-v2.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,max=500)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const now=()=>new Date().toISOString();
const labels={new:'جدید',contacted:'تماس گرفته شد',quoted:'قیمت اعلام شد',confirmed:'تأیید شد',ready_to_ship:'آماده ارسال',shipped:'ارسال شد',closed:'بسته شد',cancelled:'لغو شد'};
function phone(v){let s=String(v||'').replace(/\D/g,'');if(s.startsWith('0098'))s=s.slice(4);else if(s.startsWith('98'))s=s.slice(2);if(s.startsWith('9'))s='0'+s;return s}
function validPhone(v){return /^09\d{9}$/.test(phone(v))}
function authConfigured(env){return clean(env.CUSTOMER_AUTH_SECRET,500).length>=32}
function otpSmsConfigured(env){return clean(env.KAVENEGAR_API_KEY,300).length>=10&&clean(env.KAVENEGAR_OTP_TEMPLATE,120).length>=2}
function statusSmsConfigured(env){return clean(env.KAVENEGAR_API_KEY,300).length>=10&&clean(env.KAVENEGAR_STATUS_TEMPLATE,120).length>=2}
function loginEnabled(env){return authConfigured(env)&&(env.SMS_TEST_MODE==='1'||otpSmsConfigured(env))}
function customerEnv(env){return {...env,ADMIN_SESSION_SECRET:'',CUSTOMER_AUTH_SECRET:clean(env.CUSTOMER_AUTH_SECRET,500)}}
function noLegacyStatusSmsEnv(env){return {...env,SMS_TEST_MODE:'',KAVENEGAR_API_KEY:'',KAVENEGAR_STATUS_TEMPLATE:''}}
async function kavenegarLookup(env,mobile,template,token,token2=''){
 const key=encodeURIComponent(clean(env.KAVENEGAR_API_KEY,300)),params=new URLSearchParams({receptor:mobile,token:clean(token,100),template:clean(template,120)});if(token2)params.set('token2',clean(token2,100));
 const r=await fetch(`https://api.kavenegar.com/v1/${key}/verify/lookup.json?${params}`,{headers:{accept:'application/json'}});const text=await r.text();let data={};try{data=JSON.parse(text)}catch{}
 if(!r.ok)throw new Error('kavenegar_http_'+r.status);return data;
}
async function claimStatus(env,order,mobile){
 const r=await env.DB.prepare(`INSERT OR IGNORE INTO sms_outbox(phone,kind,order_id,order_code,order_status,provider,status,created_at) VALUES(?,'order_status',?,?,?,'kavenegar','pending',?)`).bind(mobile,order.id,order.order_code,order.status,now()).run();
 return Number(r?.meta?.changes||0)===1;
}
async function markStatus(env,order,status,{provider='kavenegar',provider_message_id=null,error=null,sent_at=null}={}){
 await env.DB.prepare(`UPDATE sms_outbox SET provider=?,provider_message_id=?,status=?,error=?,sent_at=? WHERE order_id=? AND kind='order_status' AND order_status=?`).bind(provider,provider_message_id,status,error,sent_at,order.id,order.status).run();
}
async function releaseClaim(env,order){await env.DB.prepare(`DELETE FROM sms_outbox WHERE order_id=? AND kind='order_status' AND order_status=? AND status='pending'`).bind(order.id,order.status).run()}
async function customerWantsStatusSms(env,mobile){const pref=await env.DB.prepare('SELECT order_status_sms FROM customer_notification_preferences WHERE phone=?').bind(mobile).first();return Number(pref?.order_status_sms??1)===1}
async function deliverClaimedStatus(env,order,mobile){
 if(env.SMS_TEST_MODE==='1'){await markStatus(env,order,'sent',{provider:'test',sent_at:now()});return}
 if(!statusSmsConfigured(env)){await markStatus(env,order,'disabled',{error:'status template not configured'});return}
 try{const d=await kavenegarLookup(env,mobile,env.KAVENEGAR_STATUS_TEMPLATE,order.order_code,labels[order.status]||order.status),id=String(d?.entries?.[0]?.messageid||'');await markStatus(env,order,'sent',{provider_message_id:id||null,sent_at:now()})}
 catch(e){await markStatus(env,order,'failed',{error:clean(e?.message||'send failed',300)})}
}
async function health(request,env){
 const r=await coreWorker.fetch(request,env),d=await r.json().catch(()=>({ok:true,service:'soroush-shop'}));
 return json({...d,customer_accounts:'v2',customer_auth:'otp-session-v2',customer_auth_configured:authConfigured(env),customer_login_enabled:loginEnabled(env),sms_notifications:'kavenegar-outbox-v2',sms_otp_configured:otpSmsConfigured(env),sms_status_configured:statusSmsConfigured(env)});
}
function config(env){return json({auth:'otp-session-v2',auth_configured:authConfigured(env),login_enabled:loginEnabled(env),status_sms_enabled:env.SMS_TEST_MODE==='1'||statusSmsConfigured(env)})}

export default{async fetch(request,env){
 const url=new URL(request.url);
 try{
  if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
  if(url.pathname==='/api/customer/config'&&request.method==='GET')return config(env);
  if(url.pathname.startsWith('/api/customer/'))return customerWorker.fetch(request,customerEnv(env));
  const adminStatus=url.pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
  if(adminStatus&&request.method==='PATCH'){
   const id=Number(adminStatus[1]),before=await env.DB.prepare('SELECT id,order_code,phone,status,notes FROM orders WHERE id=?').bind(id).first(),payload=await request.clone().json().catch(()=>({})),target=clean(payload?.status,40);
   let claim=null,mobile='';
   if(before&&target&&target!==before.status&&before.notes!=='VARIZA_PAYMENT_TEST'&&validPhone(before.phone)){mobile=phone(before.phone);if(await customerWantsStatusSms(env,mobile)){claim={...before,status:target};if(!(await claimStatus(env,claim,mobile)))claim=null}}
   const response=await coreWorker.fetch(request,noLegacyStatusSmsEnv(env));
   if(!response.ok){if(claim)await releaseClaim(env,claim);return response}
   if(claim){const after=await env.DB.prepare('SELECT id,order_code,phone,status,notes FROM orders WHERE id=?').bind(id).first();if(after&&after.status===target&&after.status!==before.status)await deliverClaimedStatus(env,after,mobile);else await releaseClaim(env,claim)}
   return response;
  }
  return coreWorker.fetch(request,env);
 }catch(e){console.error(e);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}
}};

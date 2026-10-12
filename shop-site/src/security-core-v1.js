const enc=new TextEncoder();
const LOGIN='/api/admin/login';
const WINDOW_MS=10*60*1000;
const LOCK_MS=15*60*1000;
const MAX_FAILS=5;
const CSP="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' https: data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; media-src 'self'; worker-src 'self' blob:";
const json=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...h}});
function b64url(bytes){let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function fingerprint(request,env){
 const ip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').trim().slice(0,80);
 const secret=String(env.ADMIN_SESSION_SECRET||'shop-admin-rate-limit-fallback-v1');
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(ip))));
}
function sameOrigin(request){const o=request.headers.get('origin');return !o||o===new URL(request.url).origin}
async function gateLogin(request,env,core){
 if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
 const fp=await fingerprint(request,env),now=Date.now(),row=await env.DB.prepare('SELECT fail_count,window_started_at,locked_until FROM admin_login_attempts WHERE fingerprint=? LIMIT 1').bind(fp).first();
 if(row?.locked_until&&Date.parse(row.locked_until)>now){const retry=Math.max(1,Math.ceil((Date.parse(row.locked_until)-now)/1000));return json({error:'به‌دلیل چند تلاش ناموفق، ورود موقتاً محدود شده است. کمی بعد دوباره تلاش کنید.'},429,{'retry-after':String(retry)});}
 const response=await core.fetch(request,env);
 if(response.status===200){await env.DB.prepare('DELETE FROM admin_login_attempts WHERE fingerprint=?').bind(fp).run();return response;}
 if(response.status!==401)return response;
 const start=row?.window_started_at?Date.parse(row.window_started_at):0,fresh=Number.isFinite(start)&&now-start<=WINDOW_MS,count=fresh?Number(row?.fail_count||0)+1:1,windowStart=fresh?row.window_started_at:new Date(now).toISOString(),locked=count>=MAX_FAILS?new Date(now+LOCK_MS).toISOString():null,updated=new Date(now).toISOString();
 await env.DB.prepare(`INSERT INTO admin_login_attempts(fingerprint,fail_count,window_started_at,locked_until,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET fail_count=excluded.fail_count,window_started_at=excluded.window_started_at,locked_until=excluded.locked_until,updated_at=excluded.updated_at`).bind(fp,count,windowStart,locked,updated).run();
 if(locked)return json({error:'به‌دلیل چند تلاش ناموفق، ورود برای ۱۵ دقیقه محدود شد.'},429,{'retry-after':String(LOCK_MS/1000)});
 return response;
}
function harden(response){
 const h=new Headers(response.headers);h.set('x-content-type-options','nosniff');h.set('referrer-policy','strict-origin-when-cross-origin');h.set('x-frame-options','SAMEORIGIN');h.set('permissions-policy','camera=(), microphone=(), geolocation=()');
 if((h.get('content-type')||'').toLowerCase().includes('text/html'))h.set('content-security-policy',CSP);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
export function secureWorker(core){return{async fetch(request,env){
 const url=new URL(request.url);
 try{
  if(url.pathname===LOGIN&&request.method==='POST')return harden(await gateLogin(request,env,core));
  const response=await core.fetch(request,env);return harden(response);
 }catch(err){console.error(err);return harden(url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500,headers:{'content-type':'text/plain; charset=utf-8'}}))}
}}}

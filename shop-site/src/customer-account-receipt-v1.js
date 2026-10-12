import coreWorker from './customer-wishlist-v1.js';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const clean=(v,max=80)=>String(v??'').trim().slice(0,max);

function sameSite(request){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return false;
  const site=(request.headers.get('sec-fetch-site')||'').toLowerCase();
  return !site||site==='same-origin'||site==='same-site'||site==='none';
}

async function customer(request,env){
  const cookie=request.headers.get('cookie')||'';
  const r=await coreWorker.fetch(new Request(new URL('/api/customer/me',request.url),{method:'GET',headers:cookie?{cookie}:{}}),env);
  if(!r.ok)return {response:json({error:'نیاز به ورود مشتری'},401)};
  const d=await r.json();
  if(!d?.phone)return {response:json({error:'نیاز به ورود مشتری'},401)};
  return {phone:d.phone};
}

async function accountReceipt(request,env,rawCode){
  if(!sameSite(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
  const c=await customer(request,env);if(c.response)return c.response;
  const code=clean(rawCode,80);if(!code)return json({error:'کد سفارش معتبر نیست'},400);
  const origin=new URL(request.url).origin;
  const internal=new Request(new URL('/api/order-receipt',request.url),{
    method:'POST',
    headers:{'content-type':'application/json','accept':'text/html','origin':origin},
    body:JSON.stringify({code,phone:c.phone})
  });
  return coreWorker.fetch(internal,env);
}

async function health(request,env){
  const r=await coreWorker.fetch(request,env),d=await r.json().catch(()=>({ok:true,service:'soroush-shop'}));
  return json({...d,customer_account_receipt:'v1'});
}

async function withUi(request,env){
  const r=await coreWorker.fetch(request,env);
  const path=new URL(request.url).pathname;
  if(request.method!=='GET'||!r.ok||(path!=='/account'&&path!=='/account/'))return r;
  const type=r.headers.get('content-type')||'';if(!type.includes('text/html'))return r;
  let body=await r.text();
  if(!body.includes('customer-account-receipt-v1-js'))body=body.replace('</body>','<script id="customer-account-receipt-v1-js" src="/customer-account-receipt.js" defer></script></body>');
  const h=new Headers(r.headers);h.delete('content-length');
  return new Response(body,{status:r.status,statusText:r.statusText,headers:h});
}

export default{async fetch(request,env){
  const u=new URL(request.url);
  try{
    if(u.pathname==='/api/health'&&request.method==='GET')return health(request,env);
    const m=u.pathname.match(/^\/api\/customer\/orders\/([^/]+)\/receipt$/);
    if(m&&request.method==='GET')return accountReceipt(request,env,decodeURIComponent(m[1]));
    return withUi(request,env);
  }catch(e){console.error(e);return u.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}
}};

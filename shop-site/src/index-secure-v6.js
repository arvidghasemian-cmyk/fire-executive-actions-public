import coreWorker from './index-secure-v5.js';

const TERMS_VERSION='2026-10-02-v1';
const PAYMENT_METHOD='manual_confirmation';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});

async function createFinalOrder(request,env){
  let body;
  try{body=await request.clone().json()}catch{return json({error:'بدنه درخواست نامعتبر است'},400)}
  if(body?.terms?.accepted!==true||String(body?.terms?.version||'')!==TERMS_VERSION){
    return json({error:'برای ثبت سفارش باید قوانین خرید و حریم خصوصی را تأیید کنید'},400);
  }
  if(String(body?.payment_method||'')!==PAYMENT_METHOD){
    return json({error:'روش پرداخت انتخاب‌شده فعلاً فعال نیست'},400);
  }
  const response=await coreWorker.fetch(request,env);
  if(response.status!==201)return response;
  const data=await response.json();
  const acceptedAt=new Date().toISOString();
  await env.DB.prepare(`UPDATE orders SET terms_accepted_at=?,terms_version=?,payment_method=? WHERE order_code=?`).bind(acceptedAt,TERMS_VERSION,PAYMENT_METHOD,data.order_code).run();
  return json({...data,terms_version:TERMS_VERSION,payment_method:PAYMENT_METHOD},201);
}

async function enhanceAdminOrders(request,env){
  const response=await coreWorker.fetch(request,env);
  if(!response.ok)return response;
  const data=await response.json();
  const ids=(data.orders||[]).map(o=>o.id);
  if(!ids.length)return json(data,response.status);
  const ph=ids.map(()=>'?').join(',');
  const {results=[]}=await env.DB.prepare(`SELECT id,terms_accepted_at,terms_version,payment_method FROM orders WHERE id IN (${ph})`).bind(...ids).all();
  const extra=new Map(results.map(x=>[x.id,x]));
  return json({...data,orders:(data.orders||[]).map(o=>({...o,...(extra.get(o.id)||{})}))},response.status);
}

async function health(request,env){
  const response=await coreWorker.fetch(request,env);
  const data=await response.json().catch(()=>({ok:true,service:'soroush-shop'}));
  return json({...data,checkout_finalization:'v1',terms_version:TERMS_VERSION,payment_mode:PAYMENT_METHOD});
}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
      if(url.pathname==='/api/orders'&&request.method==='POST')return createFinalOrder(request,env);
      if(url.pathname==='/api/admin/orders'&&request.method==='GET')return enhanceAdminOrders(request,env);
      return coreWorker.fetch(request,env);
    }catch(err){
      console.error(err);
      return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500});
    }
  }
};

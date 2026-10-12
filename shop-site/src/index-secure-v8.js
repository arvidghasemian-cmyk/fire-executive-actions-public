import varizaWorker from './security-production-v1.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const legacyCallback=()=>new Response('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><body>بازگشت نامعتبر از درگاه</body></html>',{status:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/payment/callback/nextpay'&&request.method==='GET')return legacyCallback();
    if(url.pathname==='/api/health'&&request.method==='GET'){
      const r=await varizaWorker.fetch(request,env),d=await r.json();
      return json({...d,payment_gateway:'nextpay-v1',nextpay_configured:false,variza_gateway:'variza-v1',admin_security:'rate-limit-v1',security_headers:'csp-v1'});
    }
    if(url.pathname==='/api/payment/config'&&request.method==='GET'){
      const r=await varizaWorker.fetch(request,env),d=await r.json();
      if(!d.enabled)return json({...d,provider:'nextpay',flow:'nextpay-rest-v1',variza_provider:'variza',variza_flow:'variza-api-webhook-v1'});
      return json(d);
    }
    return varizaWorker.fetch(request,env);
  }
};

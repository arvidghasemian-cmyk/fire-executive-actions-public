import coreWorker from './index-secure-v10.js';
import {validateDiscount,publicShipping,enhanceOrderCreate,enhanceOrderStatus,publicVariants,variantsAdmin,variantItem,reviewsPublic,reviewsAdmin,reviewItem,returnRequest,returnsAdmin,returnItem,fulfillOrder} from './commerce-v2.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function health(request,env){const r=await coreWorker.fetch(request,env),d=await r.json().catch(()=>({ok:true,service:'soroush-shop'}));return json({...d,checkout_financials:'v1',variants:'v1',reviews:'v1',returns:'v1',fulfillment:'v1'})}
async function reviewsEnabled(env){const row=await env.DB.prepare("SELECT value FROM store_settings WHERE key='reviews_enabled' LIMIT 1").first();return !row||String(row.value)!=='0'}
export default{async fetch(request,env){const url=new URL(request.url);try{
  if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
  if(url.pathname==='/api/discounts/validate'&&request.method==='POST')return validateDiscount(request,env);
  if(url.pathname==='/api/shipping-methods'&&request.method==='GET')return publicShipping(url,env);
  if(url.pathname==='/api/orders'&&request.method==='POST')return enhanceOrderCreate(request,env,coreWorker);
  if(url.pathname==='/api/order-status'&&request.method==='GET')return enhanceOrderStatus(request,env,coreWorker);
  const pv=url.pathname.match(/^\/api\/product-variants\/([^/]+)$/);if(pv&&request.method==='GET')return publicVariants(env,decodeURIComponent(pv[1]));
  const va=url.pathname.match(/^\/api\/admin\/variants\/([^/]+)$/);if(va&&(request.method==='GET'||request.method==='POST'))return variantsAdmin(request,env,coreWorker,decodeURIComponent(va[1]));
  const vi=url.pathname.match(/^\/api\/admin\/variants\/item\/(\d+)$/);if(vi&&(request.method==='PUT'||request.method==='DELETE'))return variantItem(request,env,coreWorker,vi[1]);
  const rv=url.pathname.match(/^\/api\/reviews\/([^/]+)$/);if(rv&&(request.method==='GET'||request.method==='POST')){if(!(await reviewsEnabled(env)))return request.method==='GET'?json({reviews:[],enabled:false}):json({error:'ثبت نظر موقتاً غیرفعال است'},403);return reviewsPublic(request,env,decodeURIComponent(rv[1]))}
  if(url.pathname==='/api/admin/reviews'&&request.method==='GET')return reviewsAdmin(request,env,coreWorker);
  const ri=url.pathname.match(/^\/api\/admin\/reviews\/(\d+)$/);if(ri&&request.method==='PUT')return reviewItem(request,env,coreWorker,ri[1]);
  if(url.pathname==='/api/returns'&&request.method==='POST')return returnRequest(request,env);
  if(url.pathname==='/api/admin/returns'&&request.method==='GET')return returnsAdmin(request,env,coreWorker);
  const rt=url.pathname.match(/^\/api\/admin\/returns\/(\d+)$/);if(rt&&request.method==='PUT')return returnItem(request,env,coreWorker,rt[1]);
  const fo=url.pathname.match(/^\/api\/admin\/orders\/(\d+)\/fulfillment$/);if(fo&&request.method==='PUT')return fulfillOrder(request,env,coreWorker,fo[1]);
  return coreWorker.fetch(request,env);
}catch(err){console.error(err);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}}};

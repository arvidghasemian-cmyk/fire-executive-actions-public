import coreWorker from './index-secure-v9.js';
import {publicCatalog,publicCategories,dashboard,adminProducts,createProduct,archiveProduct,updateCommerceProduct,categoriesAdmin,categoryItem,adjustInventory,inventoryHistory,customers,listDiscounts,createDiscount,listShipping,createShipping,settings} from './commerce-v1.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function health(request,env){const r=await coreWorker.fetch(request,env),d=await r.json().catch(()=>({ok:true,service:'soroush-shop'}));return json({...d,commerce_admin:'v1',catalog_create:'v1',categories:'v1',inventory_history:'v1',customers:'v1',discounts:'v1',shipping_rules:'v1',store_settings:'v1'})}

export default{async fetch(request,env){const url=new URL(request.url);try{
  if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
  if(url.pathname==='/api/products'&&request.method==='GET')return publicCatalog(env);
  if(url.pathname==='/api/categories'&&request.method==='GET')return publicCategories(env);
  if(url.pathname==='/api/admin/commerce/dashboard'&&request.method==='GET')return dashboard(request,env,coreWorker);
  if(url.pathname==='/api/admin/commerce/products'&&request.method==='GET')return adminProducts(request,env,coreWorker);
  if(url.pathname==='/api/admin/commerce/products'&&request.method==='POST')return createProduct(request,env,coreWorker);
  const p=url.pathname.match(/^\/api\/admin\/commerce\/products\/([^/]+)$/);if(p&&request.method==='PUT')return updateCommerceProduct(request,env,coreWorker,decodeURIComponent(p[1]));if(p&&request.method==='DELETE')return archiveProduct(request,env,coreWorker,decodeURIComponent(p[1]));
  if(url.pathname==='/api/admin/categories'&&(request.method==='GET'||request.method==='POST'))return categoriesAdmin(request,env,coreWorker);
  const c=url.pathname.match(/^\/api\/admin\/categories\/([^/]+)$/);if(c&&(request.method==='PUT'||request.method==='DELETE'))return categoryItem(request,env,coreWorker,decodeURIComponent(c[1]));
  const a=url.pathname.match(/^\/api\/admin\/inventory\/([^/]+)\/adjust$/);if(a&&request.method==='POST')return adjustInventory(request,env,coreWorker,decodeURIComponent(a[1]));
  const h=url.pathname.match(/^\/api\/admin\/inventory\/([^/]+)\/history$/);if(h&&request.method==='GET')return inventoryHistory(request,env,coreWorker,decodeURIComponent(h[1]));
  if(url.pathname==='/api/admin/customers'&&request.method==='GET')return customers(request,env,coreWorker);
  if(url.pathname==='/api/admin/discounts'&&request.method==='GET')return listDiscounts(request,env,coreWorker);
  if(url.pathname==='/api/admin/discounts'&&request.method==='POST')return createDiscount(request,env,coreWorker);
  if(url.pathname==='/api/admin/shipping'&&request.method==='GET')return listShipping(request,env,coreWorker);
  if(url.pathname==='/api/admin/shipping'&&request.method==='POST')return createShipping(request,env,coreWorker);
  if(url.pathname==='/api/admin/settings'&&(request.method==='GET'||request.method==='PUT'))return settings(request,env,coreWorker);
  return coreWorker.fetch(request,env);
}catch(err){console.error(err);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}}};

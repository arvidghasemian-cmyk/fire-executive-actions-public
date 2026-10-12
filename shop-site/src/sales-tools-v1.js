import coreWorker from './management-v1.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,max=1500)=>String(v??'').trim().slice(0,max);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validUrl(v){return !v||/^https:\/\//i.test(v)||/^\/(?!\/)/.test(v)}
async function adminOK(request,env){
  const probe=new URL('/api/admin/product-details',request.url);
  const r=await coreWorker.fetch(new Request(probe,{method:'GET',headers:request.headers}),env);
  return r.ok;
}
function sameOrigin(request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin}
async function ensureProduct(env,slug){return env.DB.prepare('SELECT slug,name FROM products WHERE slug=? LIMIT 1').bind(slug).first()}
async function readTool(env,slug){return env.DB.prepare('SELECT product_slug,datasheet_url,updated_at FROM product_sales_tools WHERE product_slug=? LIMIT 1').bind(slug).first()}

async function publicTool(env,slug){
  const p=await ensureProduct(env,slug);if(!p)return json({error:'محصول پیدا نشد'},404);
  const row=await readTool(env,slug);
  return json({product_slug:slug,datasheet_url:row?.datasheet_url||null,updated_at:row?.updated_at||null});
}
async function adminList(request,env){
  if(!(await adminOK(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  const {results=[]}=await env.DB.prepare(`SELECT p.slug,p.name,s.datasheet_url,s.updated_at FROM products p LEFT JOIN product_sales_tools s ON s.product_slug=p.slug ORDER BY p.sort_order,p.id`).all();
  return json({products:results});
}
async function adminSave(request,env,slug){
  if(!sameOrigin(request))return json({error:'درخواست از مبدا نامعتبر است'},403);
  if(!(await adminOK(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  if(!(await ensureProduct(env,slug)))return json({error:'محصول پیدا نشد'},404);
  let body;try{body=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const datasheet=clean(body?.datasheet_url,1500);
  if(!validUrl(datasheet))return json({error:'آدرس دیتاشیت باید HTTPS یا مسیر داخلی سایت باشد'},400);
  const t=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO product_sales_tools(product_slug,datasheet_url,updated_at) VALUES(?,?,?) ON CONFLICT(product_slug) DO UPDATE SET datasheet_url=excluded.datasheet_url,updated_at=excluded.updated_at`).bind(slug,datasheet||null,t).run();
  return json({ok:true,product_slug:slug,datasheet_url:datasheet||null,updated_at:t});
}
async function augmentPublicProduct(request,env,slug){
  const r=await coreWorker.fetch(request,env);if(!r.ok)return r;
  const data=await r.json();const row=await readTool(env,slug);
  return json({...data,datasheet_url:row?.datasheet_url||null},r.status);
}
async function enhanceProductPage(request,env,slug){
  const response=await coreWorker.fetch(request,env);if(!response.ok)return response;
  const row=await readTool(env,slug);if(!row?.datasheet_url)return response;
  let body=await response.text();
  const block=`<section class="sales-tools-files" id="salesToolsFiles"><h2>فایل‌های فنی</h2><p>برای بررسی مشخصات رسمی این محصول می‌توانی فایل فنی ثبت‌شده را مشاهده کنی.</p><a class="sales-tools-datasheet" href="${esc(row.datasheet_url)}" target="_blank" rel="noopener">مشاهده دیتاشیت / کاتالوگ محصول ↗</a></section>`;
  const style=`<style id="sales-tools-product-v1">.sales-tools-files{margin:0 0 28px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;padding:16px}.sales-tools-files h2{margin:0 0 6px;font-size:18px}.sales-tools-files p{margin:0 0 12px;color:#667085;font-size:11px;line-height:1.9}.sales-tools-datasheet{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 15px;border-radius:11px;background:#a60f18;color:#fff!important;font-weight:900;text-decoration:none}.sales-tools-datasheet:hover{background:#821019}@media(max-width:560px){.sales-tools-datasheet{width:100%}}</style>`;
  body=body.replace('</head>',style+'</head>').replace('</main>',block+'</main>');
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(body,{status:response.status,headers});
}
async function health(request,env){
  const r=await coreWorker.fetch(request,env),d=await r.json().catch(()=>({ok:true,service:'soroush-shop'}));
  return json({...d,sales_tools:'v1'});
}

export default{async fetch(request,env){const url=new URL(request.url);try{
  if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
  if(url.pathname==='/api/admin/product-sales-tools'&&request.method==='GET')return adminList(request,env);
  const admin=url.pathname.match(/^\/api\/admin\/product-sales-tools\/([^/]+)$/);if(admin&&request.method==='PUT')return adminSave(request,env,decodeURIComponent(admin[1]));
  const pub=url.pathname.match(/^\/api\/product-sales-tools\/([^/]+)$/);if(pub&&request.method==='GET')return publicTool(env,decodeURIComponent(pub[1]));
  const detail=url.pathname.match(/^\/api\/products\/([^/]+)$/);if(detail&&request.method==='GET')return augmentPublicProduct(request,env,decodeURIComponent(detail[1]));
  const page=url.pathname.match(/^\/product\/([^/]+)\/?$/);if(page&&request.method==='GET')return enhanceProductPage(request,env,decodeURIComponent(page[1]));
  return coreWorker.fetch(request,env);
}catch(err){console.error(err);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}}};

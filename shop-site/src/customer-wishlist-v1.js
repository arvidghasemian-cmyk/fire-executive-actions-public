import coreWorker from './customer-receipt-v1.js';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const now=()=>new Date().toISOString();
const clean=(v,max=180)=>String(v??'').trim().slice(0,max);
function sameOrigin(request){const o=request.headers.get('origin');return !o||o===new URL(request.url).origin}

async function customer(request,env){
  const r=await coreWorker.fetch(new Request(new URL('/api/customer/me',request.url),{method:'GET',headers:request.headers}),env);
  if(!r.ok)return {response:json({error:'نیاز به ورود مشتری'},401)};
  const d=await r.json();
  if(!d?.phone)return {response:json({error:'نیاز به ورود مشتری'},401)};
  return {phone:d.phone};
}

async function list(request,env){
  const c=await customer(request,env);if(c.response)return c.response;
  const {results=[]}=await env.DB.prepare(`SELECT p.id,p.slug,p.name,p.status,p.price_toman,p.stock_qty,p.image_url,p.brand,p.model,w.created_at AS saved_at FROM customer_wishlist w JOIN products p ON p.id=w.product_id WHERE w.phone=? AND p.is_active=1 AND p.status<>'hidden' ORDER BY w.created_at DESC LIMIT 200`).bind(c.phone).all();
  return json({items:results});
}

async function add(request,env,slug){
  if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
  const c=await customer(request,env);if(c.response)return c.response;
  slug=clean(slug,160);if(!slug)return json({error:'محصول معتبر نیست'},400);
  const p=await env.DB.prepare(`SELECT id,slug,name FROM products WHERE slug=? AND is_active=1 AND status<>'hidden' LIMIT 1`).bind(slug).first();
  if(!p)return json({error:'محصول پیدا نشد'},404);
  await env.DB.prepare('INSERT INTO customer_wishlist(phone,product_id,created_at) VALUES(?,?,?) ON CONFLICT(phone,product_id) DO NOTHING').bind(c.phone,p.id,now()).run();
  return json({ok:true,saved:true,product:{id:p.id,slug:p.slug,name:p.name}});
}

async function remove(request,env,slug){
  if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
  const c=await customer(request,env);if(c.response)return c.response;
  slug=clean(slug,160);if(!slug)return json({error:'محصول معتبر نیست'},400);
  const p=await env.DB.prepare('SELECT id FROM products WHERE slug=? LIMIT 1').bind(slug).first();
  if(p)await env.DB.prepare('DELETE FROM customer_wishlist WHERE phone=? AND product_id=?').bind(c.phone,p.id).run();
  return json({ok:true,saved:false});
}

function eligible(path){return path==='/'||path==='/account'||path==='/account/'||/^\/category\/[^/]+\/?$/.test(path)||/^\/product\/[^/]+\/?$/.test(path)}
async function withUi(request,env){
  const r=await coreWorker.fetch(request,env);
  if(request.method!=='GET'||!r.ok||!eligible(new URL(request.url).pathname))return r;
  const type=r.headers.get('content-type')||'';if(!type.includes('text/html'))return r;
  let body=await r.text();
  if(!body.includes('customer-wishlist-v1-js'))body=body.replace('</body>','<script id="customer-wishlist-v1-js" src="/wishlist.js" defer></script></body>');
  const h=new Headers(r.headers);h.delete('content-length');
  return new Response(body,{status:r.status,statusText:r.statusText,headers:h});
}

export default{async fetch(request,env){
  const u=new URL(request.url);
  try{
    if(u.pathname==='/api/customer/wishlist'&&request.method==='GET')return list(request,env);
    const m=u.pathname.match(/^\/api\/customer\/wishlist\/([^/]+)$/);
    if(m&&request.method==='PUT')return add(request,env,decodeURIComponent(m[1]));
    if(m&&request.method==='DELETE')return remove(request,env,decodeURIComponent(m[1]));
    return withUi(request,env);
  }catch(e){console.error(e);return u.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}
}};

const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}
});

const enc = new TextEncoder();
const ADMIN_COOKIE='soroush_admin';
const ADMIN_MAX_AGE=8*60*60;

function cleanText(v, max=500){ return String(v ?? '').replace(/\s+/g,' ').trim().slice(0,max); }
function validPhone(v){ const s=String(v||'').replace(/[^\d+]/g,''); return /^(\+98|0098|98|0)?9\d{9}$/.test(s); }
function orderCode(){
  const now = new Date();
  const y=now.getUTCFullYear().toString().slice(-2), m=String(now.getUTCMonth()+1).padStart(2,'0'), d=String(now.getUTCDate()).padStart(2,'0');
  return `SE-${y}${m}${d}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
}
function parseCookies(request){
  const raw=request.headers.get('cookie')||'';
  return Object.fromEntries(raw.split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),x.slice(i+1)]}));
}
function b64url(bytes){
  let bin=''; for(const b of bytes) bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function hmac(secret,message){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(message))));
}
async function secureEqual(a,b){
  const [ha,hb]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(String(a))),crypto.subtle.digest('SHA-256',enc.encode(String(b)))]);
  const aa=new Uint8Array(ha),bb=new Uint8Array(hb); let diff=aa.length^bb.length;
  for(let i=0;i<Math.min(aa.length,bb.length);i++) diff|=aa[i]^bb[i];
  return diff===0;
}
function adminConfigured(env){ return typeof env.ADMIN_TOKEN==='string' && env.ADMIN_TOKEN.length>=12; }
async function issueAdminSession(env){
  const exp=Math.floor(Date.now()/1000)+ADMIN_MAX_AGE;
  const payload=String(exp), sig=await hmac(env.ADMIN_TOKEN,payload);
  return `${payload}.${sig}`;
}
async function isAdmin(request,env){
  if(!adminConfigured(env)) return false;
  const raw=parseCookies(request)[ADMIN_COOKIE]; if(!raw) return false;
  const [exp,sig]=raw.split('.'); if(!exp||!sig||Number(exp)<Math.floor(Date.now()/1000)) return false;
  return secureEqual(sig,await hmac(env.ADMIN_TOKEN,exp));
}
const adminCookie=value=>`${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ADMIN_MAX_AGE}`;

async function apiProducts(env){
  const {results=[]}=await env.DB.prepare(`SELECT slug,name,category,status,price_toman,stock_qty,image_url FROM products WHERE is_active=1 ORDER BY sort_order ASC,id ASC`).all();
  return json({products:results});
}
async function apiProduct(env,slug){
  const row=await env.DB.prepare(`SELECT slug,name,category,status,price_toman,stock_qty,image_url,description FROM products WHERE slug=? AND is_active=1 LIMIT 1`).bind(slug).first();
  return row?json(row):json({error:'محصول پیدا نشد'},404);
}
async function apiOrder(request,env){
  let body; try{body=await request.json()}catch{return json({error:'بدنه درخواست نامعتبر است'},400)}
  const customer=body?.customer||{}, name=cleanText(customer.name,120), phone=cleanText(customer.phone,30), city=cleanText(customer.city,100), company=cleanText(customer.company,140), notes=cleanText(customer.notes,1000);
  if(name.length<2) return json({error:'نام را کامل وارد کنید'},400);
  if(!validPhone(phone)) return json({error:'شماره موبایل معتبر نیست'},400);
  const rawItems=Array.isArray(body?.items)?body.items:[];
  if(!rawItems.length||rawItems.length>30) return json({error:'سبد درخواست نامعتبر است'},400);
  const normalized=[];
  for(const item of rawItems){ const slug=cleanText(item?.slug,120),quantity=Math.max(1,Math.min(20,Number.parseInt(item?.quantity,10)||1)); if(slug) normalized.push({slug,quantity}); }
  if(!normalized.length) return json({error:'هیچ محصول معتبری در سبد نیست'},400);
  const unique=[...new Set(normalized.map(x=>x.slug))], placeholders=unique.map(()=>'?').join(',');
  const {results=[]}=await env.DB.prepare(`SELECT id,slug,name,price_toman,status FROM products WHERE is_active=1 AND slug IN (${placeholders})`).bind(...unique).all();
  const bySlug=new Map(results.map(x=>[x.slug,x])),validItems=normalized.filter(x=>bySlug.has(x.slug));
  if(!validItems.length) return json({error:'محصولات انتخاب‌شده معتبر نیستند'},400);
  const code=orderCode(),createdAt=new Date().toISOString();
  const orderRes=await env.DB.prepare(`INSERT INTO orders(order_code,customer_name,phone,city,company,notes,status,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(code,name,phone,city,company,notes,'new',createdAt).run();
  const orderId=orderRes.meta.last_row_id;
  for(const item of validItems){ const p=bySlug.get(item.slug); await env.DB.prepare(`INSERT INTO order_items(order_id,product_id,product_name,product_slug,quantity,unit_price_toman) VALUES(?,?,?,?,?,?)`).bind(orderId,p.id,p.name,p.slug,item.quantity,p.price_toman??null).run(); }
  return json({ok:true,order_code:code},201);
}

async function adminLogin(request,env){
  if(!adminConfigured(env)) return json({error:'پنل مدیریت هنوز فعال نشده است'},503);
  let body;try{body=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const token=String(body?.token||'');
  if(!(await secureEqual(token,env.ADMIN_TOKEN))) return json({error:'رمز مدیریت نادرست است'},401);
  return json({ok:true},200,{'set-cookie':adminCookie(await issueAdminSession(env))});
}
function adminLogout(){ return json({ok:true},200,{'set-cookie':`${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}); }
async function requireAdmin(request,env){
  if(!adminConfigured(env)) return json({error:'پنل مدیریت هنوز فعال نشده است'},503);
  if(!(await isAdmin(request,env))) return json({error:'نیاز به ورود مدیریت'},401);
  return null;
}
function nullableInteger(v,min=0,max=999999999999){
  if(v===null||v===undefined||v==='') return null;
  const n=Number(v); if(!Number.isInteger(n)||n<min||n>max) return undefined; return n;
}
async function adminProducts(env){
  const {results=[]}=await env.DB.prepare(`SELECT id,slug,name,category,status,price_toman,stock_qty,image_url,description,is_active,sort_order,updated_at FROM products ORDER BY sort_order ASC,id ASC`).all();
  return json({products:results});
}
async function adminUpdateProduct(request,env,slug){
  let b;try{b=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const current=await env.DB.prepare(`SELECT * FROM products WHERE slug=? LIMIT 1`).bind(slug).first();
  if(!current) return json({error:'محصول پیدا نشد'},404);
  const name=cleanText(b.name??current.name,160),category=cleanText(b.category??current.category,80),status=cleanText(b.status??current.status,30);
  if(!name||!category||!['quote','priced','hidden'].includes(status)) return json({error:'اطلاعات محصول معتبر نیست'},400);
  const price=nullableInteger(b.price_toman,0),stock=nullableInteger(b.stock_qty,0,1000000),sort=nullableInteger(b.sort_order,0,1000000);
  if(price===undefined||stock===undefined||sort===undefined) return json({error:'قیمت، موجودی یا ترتیب معتبر نیست'},400);
  const image=cleanText(b.image_url??current.image_url,1000),description=cleanText(b.description??current.description,4000),active=b.is_active===undefined?Number(current.is_active):(b.is_active?1:0);
  await env.DB.prepare(`UPDATE products SET name=?,category=?,status=?,price_toman=?,stock_qty=?,image_url=?,description=?,is_active=?,sort_order=?,updated_at=? WHERE slug=?`).bind(name,category,status,price,stock,image,description,active,sort??current.sort_order,new Date().toISOString(),slug).run();
  return json({ok:true});
}
async function adminOrders(env,limit=80){
  limit=Math.max(1,Math.min(200,Number(limit)||80));
  const {results:orders=[]}=await env.DB.prepare(`SELECT id,order_code,customer_name,phone,city,company,notes,status,created_at FROM orders ORDER BY id DESC LIMIT ?`).bind(limit).all();
  if(!orders.length) return json({orders:[]});
  const ids=orders.map(x=>x.id),ph=ids.map(()=>'?').join(',');
  const {results:items=[]}=await env.DB.prepare(`SELECT order_id,product_name,product_slug,quantity,unit_price_toman FROM order_items WHERE order_id IN (${ph}) ORDER BY id ASC`).bind(...ids).all();
  const grouped=new Map(); for(const it of items){if(!grouped.has(it.order_id))grouped.set(it.order_id,[]);grouped.get(it.order_id).push(it)}
  return json({orders:orders.map(o=>({...o,items:grouped.get(o.id)||[]}))});
}
async function adminUpdateOrder(request,env,id){
  let b;try{b=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const status=cleanText(b.status,30),allowed=['new','contacted','quoted','confirmed','closed','cancelled'];
  if(!allowed.includes(status)) return json({error:'وضعیت سفارش معتبر نیست'},400);
  const r=await env.DB.prepare(`UPDATE orders SET status=? WHERE id=?`).bind(status,Number(id)).run();
  return r.meta.changes?json({ok:true}):json({error:'سفارش پیدا نشد'},404);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/health') return json({ok:true,service:'soroush-shop'});
      if(url.pathname==='/api/products'&&request.method==='GET') return apiProducts(env);
      if(url.pathname.startsWith('/api/products/')&&request.method==='GET') return apiProduct(env,decodeURIComponent(url.pathname.split('/').pop()));
      if(url.pathname==='/api/orders'&&request.method==='POST') return apiOrder(request,env);
      if(url.pathname==='/api/admin/login'&&request.method==='POST') return adminLogin(request,env);
      if(url.pathname==='/api/admin/logout'&&request.method==='POST') return adminLogout();
      if(url.pathname.startsWith('/api/admin/')){
        const denied=await requireAdmin(request,env); if(denied) return denied;
        if(url.pathname==='/api/admin/products'&&request.method==='GET') return adminProducts(env);
        if(url.pathname.startsWith('/api/admin/products/')&&request.method==='PUT') return adminUpdateProduct(request,env,decodeURIComponent(url.pathname.split('/').pop()));
        if(url.pathname==='/api/admin/orders'&&request.method==='GET') return adminOrders(env,url.searchParams.get('limit'));
        const om=url.pathname.match(/^\/api\/admin\/orders\/(\d+)$/); if(om&&request.method==='PATCH') return adminUpdateOrder(request,env,om[1]);
        return json({error:'مسیر مدیریت پیدا نشد'},404);
      }
      if(url.pathname.startsWith('/api/')) return json({error:'مسیر API پیدا نشد'},404);
      return env.ASSETS.fetch(request);
    }catch(err){console.error(err);return json({error:'خطای داخلی سرور'},500)}
  }
};

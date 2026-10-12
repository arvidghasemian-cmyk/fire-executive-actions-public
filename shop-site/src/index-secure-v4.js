import coreWorker from './index-secure-v3-core.js';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function cleanText(v,max=500){return String(v??'').replace(/\s+/g,' ').trim().slice(0,max)}
function normalizePhone(v){let s=String(v||'').replace(/\D/g,'');if(s.startsWith('0098'))s=s.slice(4);else if(s.startsWith('98'))s=s.slice(2);if(s.startsWith('9'))s='0'+s;return s}
function validPhone(v){return /^09\d{9}$/.test(normalizePhone(v))}
function orderCode(){const now=new Date();const y=now.getUTCFullYear().toString().slice(-2),m=String(now.getUTCMonth()+1).padStart(2,'0'),d=String(now.getUTCDate()).padStart(2,'0');return `SE-${y}${m}${d}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fa(n){return new Intl.NumberFormat('fa-IR').format(Number(n)||0)}

async function createOrder(request,env){
  let body;try{body=await request.json()}catch{return json({error:'بدنه درخواست نامعتبر است'},400)}
  const customer=body?.customer||{};
  const name=cleanText(customer.name,120),phone=cleanText(customer.phone,30),province=cleanText(customer.province,100),city=cleanText(customer.city,100),address=cleanText(customer.address,700),postalCode=cleanText(customer.postal_code,20),company=cleanText(customer.company,140),notes=cleanText(customer.notes,1000);
  if(name.length<2)return json({error:'نام را کامل وارد کنید'},400);
  if(!validPhone(phone))return json({error:'شماره موبایل معتبر نیست'},400);
  if(postalCode&&!/^\d{10}$/.test(postalCode.replace(/\D/g,'')))return json({error:'کد پستی باید ۱۰ رقم باشد'},400);
  const rawItems=Array.isArray(body?.items)?body.items:[];
  if(!rawItems.length||rawItems.length>30)return json({error:'سبد درخواست نامعتبر است'},400);
  const normalized=[];
  for(const item of rawItems){const slug=cleanText(item?.slug,120),quantity=Math.max(1,Math.min(20,Number.parseInt(item?.quantity,10)||1));if(slug)normalized.push({slug,quantity})}
  if(!normalized.length)return json({error:'هیچ محصول معتبری در سبد نیست'},400);
  const unique=[...new Set(normalized.map(x=>x.slug))],placeholders=unique.map(()=>'?').join(',');
  const {results=[]}=await env.DB.prepare(`SELECT id,slug,name,price_toman,status FROM products WHERE is_active=1 AND slug IN (${placeholders})`).bind(...unique).all();
  const bySlug=new Map(results.map(x=>[x.slug,x])),validItems=normalized.filter(x=>bySlug.has(x.slug));
  if(!validItems.length)return json({error:'محصولات انتخاب‌شده معتبر نیستند'},400);
  const code=orderCode(),createdAt=new Date().toISOString();
  const orderRes=await env.DB.prepare(`INSERT INTO orders(order_code,customer_name,phone,province,city,address,postal_code,company,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(code,name,phone,province||null,city||null,address||null,postalCode||null,company||null,notes||null,'new',createdAt,createdAt).run();
  const orderId=orderRes.meta.last_row_id,statements=[];
  for(const item of validItems){const p=bySlug.get(item.slug);statements.push(env.DB.prepare(`INSERT INTO order_items(order_id,product_id,product_name,product_slug,quantity,unit_price_toman) VALUES(?,?,?,?,?,?)`).bind(orderId,p.id,p.name,p.slug,item.quantity,p.price_toman??null))}
  statements.push(env.DB.prepare(`INSERT INTO order_status_history(order_id,from_status,to_status,changed_at) VALUES(?,?,?,?)`).bind(orderId,null,'new',createdAt));
  await env.DB.batch(statements);
  const allPriced=validItems.every(i=>Number.isInteger(bySlug.get(i.slug).price_toman));
  const total=allPriced?validItems.reduce((sum,i)=>sum+(bySlug.get(i.slug).price_toman*i.quantity),0):null;
  return json({ok:true,order_code:code,total_toman:total},201);
}

async function enhanceOrderStatus(request,env){
  const response=await coreWorker.fetch(request,env);
  if(!response.ok)return response;
  const data=await response.json();
  const row=await env.DB.prepare(`SELECT province,city,address,postal_code FROM orders WHERE order_code=? LIMIT 1`).bind(data.order_code).first();
  return json({...data,delivery:row||null},response.status);
}

async function enhanceAdminOrders(request,env){
  const response=await coreWorker.fetch(request,env);
  if(!response.ok)return response;
  const data=await response.json();
  const ids=(data.orders||[]).map(o=>o.id);
  if(!ids.length)return json(data,response.status);
  const ph=ids.map(()=>'?').join(',');
  const {results=[]}=await env.DB.prepare(`SELECT id,province,address,postal_code FROM orders WHERE id IN (${ph})`).bind(...ids).all();
  const extra=new Map(results.map(x=>[x.id,x]));
  return json({...data,orders:(data.orders||[]).map(o=>({...o,...(extra.get(o.id)||{})}))},response.status);
}

function productPurchaseBlock(p){
  const quoted=p.status!=='priced'||!Number.isInteger(p.price_toman);
  const price=quoted?'قیمت پس از بررسی فروشگاه اعلام می‌شود':`${fa(p.price_toman)} تومان`;
  const disabled=Number.isInteger(p.stock_qty)&&p.stock_qty<=0?'disabled':'';
  const title=quoted?'استعلام و ثبت درخواست':'افزودن به سبد';
  const button=disabled?'ناموجود':quoted?'افزودن برای استعلام':'افزودن به سبد';
  const stockMeta=Number.isInteger(p.stock_qty)?` · موجودی ${fa(p.stock_qty)} عدد`:'';
  return `<div class="product-buy-panel" data-product-id="${Number(p.id)}" data-product-mode="${quoted?'quote':'priced'}">
    <div class="product-buy-title">${title}</div>
    <div class="product-buy-row">
      <button type="button" class="product-qty-btn" data-dir="-1" aria-label="کاهش تعداد">−</button>
      <strong id="productQty">۱</strong>
      <button type="button" class="product-qty-btn" data-dir="1" aria-label="افزایش تعداد">＋</button>
      <button type="button" id="productAddBtn" class="product-add-btn" ${disabled}>${button}</button>
    </div>
    <div class="product-buy-meta">${price}${stockMeta}</div>
    <div id="productCartMsg" class="product-cart-msg" aria-live="polite"></div>
    <a class="product-cart-link" href="/?openCart=1#products">مشاهده سبد خرید</a>
  </div>`;
}

async function enhanceProductPage(request,env,slug){
  const response=await coreWorker.fetch(request,env);
  if(!response.ok)return response;
  const p=await env.DB.prepare(`SELECT id,slug,name,category,status,price_toman,stock_qty,image_url FROM products WHERE slug=? AND is_active=1 LIMIT 1`).bind(slug).first();
  if(!p)return response;
  const {results:related=[]}=await env.DB.prepare(`SELECT slug,name,price_toman,image_url FROM products WHERE category=? AND slug<>? AND is_active=1 AND status<>'hidden' ORDER BY sort_order ASC,id ASC LIMIT 4`).bind(p.category,p.slug).all();
  let body=await response.text();
  body=body.replace(/<a class="buy-link" href="\/#products">[\s\S]*?<\/a>/,productPurchaseBlock(p));
  const relatedHtml=related.length?`<section class="related-products"><h2>محصولات مرتبط</h2><div class="related-grid">${related.map(r=>`<a class="related-card" href="/product/${encodeURIComponent(r.slug)}/">${r.image_url?`<img src="${esc(r.image_url)}" alt="${esc(r.name)}" loading="lazy" decoding="async">`:''}<strong>${esc(r.name)}</strong><span>${Number.isInteger(r.price_toman)?fa(r.price_toman)+' تومان':'استعلام قیمت'}</span></a>`).join('')}</div></section>`:'';
  if(relatedHtml)body=body.replace('</main>',relatedHtml+'</main>');
  const style=`<style id="product-purchase-v1">
.product-buy-panel{margin-top:16px;border:1px solid #ead8d9;background:#fffafb;border-radius:16px;padding:14px}.product-buy-title{font-weight:900;margin-bottom:9px}.product-buy-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.product-qty-btn{width:38px;height:38px;border:1px solid #e5e7eb;background:#fff;border-radius:10px;font-size:18px;cursor:pointer}.product-add-btn{min-height:40px;border:0;background:#a60f18;color:#fff;border-radius:10px;padding:0 18px;font-weight:900;cursor:pointer}.product-add-btn:disabled{background:#9ca3af;cursor:not-allowed}.product-buy-meta{font-size:11px;color:#667085;margin-top:8px}.product-cart-msg{font-size:11px;color:#067647;font-weight:700;margin-top:8px}.product-cart-link{display:inline-block;margin-top:8px;color:#a60f18;font-size:11px;font-weight:800}.related-products{border-top:1px solid #e5e7eb;padding:24px 0 34px}.related-products h2{font-size:19px}.related-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.related-card{border:1px solid #e5e7eb;border-radius:14px;padding:10px;background:#fff}.related-card img{width:100%;height:120px;object-fit:contain;background:#fff;border-radius:10px}.related-card strong{display:block;font-size:12px;margin-top:7px}.related-card span{font-size:10px;color:#a60f18;font-weight:800}@media(max-width:760px){.related-grid{grid-template-columns:repeat(2,1fr)}}
</style>`;
  const script=`<script id="product-purchase-v1-js">(()=>{const key='soroush_quote_cart_v1',pid=${Number(p.id)},stock=${Number.isInteger(p.stock_qty)?Number(p.stock_qty):'null'};let qty=1;const q=document.getElementById('productQty'),msg=document.getElementById('productCartMsg'),add=document.getElementById('productAddBtn');document.querySelectorAll('.product-qty-btn').forEach(b=>b.addEventListener('click',()=>{qty=Math.max(1,Math.min(20,qty+Number(b.dataset.dir||0)));if(Number.isInteger(stock))qty=Math.min(qty,Math.max(1,stock));q.textContent=new Intl.NumberFormat('fa-IR').format(qty)}));if(add)add.addEventListener('click',()=>{let cart={};try{cart=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}const current=Number(cart[pid]||0),limit=Number.isInteger(stock)?Math.min(20,Math.max(0,stock)):20;cart[pid]=Math.min(limit,current+qty);localStorage.setItem(key,JSON.stringify(cart));msg.textContent='به سبد خرید اضافه شد.';});})();</script>`;
  body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(body,{status:response.status,headers});
}

async function enhanceAdminPage(request,env){
  const response=await coreWorker.fetch(request,env);
  if(!response.ok)return response;
  let body=await response.text();
  const old=`<div class="mut">\${esc(o.customer_name)} — \${esc(o.phone)}\${o.city?' — '+esc(o.city):''}\${o.company?' — '+esc(o.company):''}</div>`;
  const next=`<div class="mut">\${esc(o.customer_name)} — \${esc(o.phone)}\${o.province?' — '+esc(o.province):''}\${o.city?' — '+esc(o.city):''}\${o.company?' — '+esc(o.company):''}</div>\n      \${(o.address||o.postal_code)?\`<div class="mut">آدرس تحویل: \${esc(o.address||'—')}\${o.postal_code?' — کدپستی '+esc(o.postal_code):''}</div>\`:''}`;
  if(body.includes(old))body=body.replace(old,next);
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(body,{status:response.status,headers});
}

async function health(request,env){
  const response=await coreWorker.fetch(request,env);const data=await response.json().catch(()=>({ok:true,service:'soroush-shop'}));return json({...data,checkout_details:'v2',product_purchase:'v1'});
}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
      if(url.pathname==='/api/orders'&&request.method==='POST')return createOrder(request,env);
      if(url.pathname==='/api/order-status'&&request.method==='GET')return enhanceOrderStatus(request,env);
      if(url.pathname==='/api/admin/orders'&&request.method==='GET')return enhanceAdminOrders(request,env);
      const product=url.pathname.match(/^\/product\/([^/]+)\/?$/);if(product&&request.method==='GET')return enhanceProductPage(request,env,decodeURIComponent(product[1]));
      if((url.pathname==='/admin/'||url.pathname==='/admin/index.html')&&request.method==='GET')return enhanceAdminPage(request,env);
      return coreWorker.fetch(request,env);
    }catch(err){console.error(err);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}
  }
};


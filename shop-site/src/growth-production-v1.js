import coreWorker from './variant-production-v1.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isInteger(n)?new Intl.NumberFormat('fa-IR').format(n)+' تومان':'استعلام قیمت';

async function health(request,env){
 const r=await coreWorker.fetch(request,env),d=await r.json().catch(()=>({ok:true,service:'soroush-shop'}));
 return json({...d,growth_tools:'v1',wishlist:'local-v1',cart_recovery:'local-v1',related_products:'v1'});
}

async function productPage(request,env,slug){
 const r=await coreWorker.fetch(request,env);if(!r.ok||!(r.headers.get('content-type')||'').includes('text/html'))return r;
 const p=await env.DB.prepare(`SELECT id,slug,name,category,brand FROM products WHERE slug=? AND is_active=1 AND status<>'hidden' LIMIT 1`).bind(slug).first();if(!p)return r;
 const {results:related=[]}=await env.DB.prepare(`SELECT slug,name,brand,model,status,price_toman,stock_qty,image_url FROM products WHERE id<>? AND category=? AND is_active=1 AND status<>'hidden' ORDER BY CASE WHEN COALESCE(brand,'')=COALESCE(?,'') AND COALESCE(brand,'')<>'' THEN 0 ELSE 1 END,featured DESC,CASE WHEN COALESCE(stock_qty,1)>0 THEN 0 ELSE 1 END,sort_order,id LIMIT 4`).bind(p.id,p.category,p.brand||'').all();
 let body=await r.text();
 const cards=related.map(x=>`<article class="growth-related-card"><a href="/product/${encodeURIComponent(x.slug)}/" class="growth-related-img">${x.image_url?`<img src="${esc(x.image_url)}" alt="${esc(x.name)}" loading="lazy" decoding="async">`:'<span>بدون تصویر</span>'}</a><div><div class="growth-related-meta">${esc([x.brand,x.model].filter(Boolean).join(' · ')||'تجهیزات ایمنی')}</div><a class="growth-related-name" href="/product/${encodeURIComponent(x.slug)}/">${esc(x.name)}</a><div class="growth-related-price">${money(x.status==='priced'?x.price_toman:null)}</div></div></article>`).join('');
 if(cards){
  const section=`<section class="growth-related" id="relatedProductsGrowth"><div class="growth-related-head"><div><h2>محصولات مرتبط</h2><p>کالاهای نزدیک به این محصول برای تکمیل خرید یا مقایسه سریع‌تر.</p></div></div><div class="growth-related-grid">${cards}</div></section>`;
  const style=`<style id="growth-related-v1">.growth-related{border-top:1px solid #e5e7eb;padding:24px 0 34px}.growth-related-head h2{margin:0 0 4px;font-size:18px}.growth-related-head p{margin:0;color:#667085;font-size:10px}.growth-related-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:13px}.growth-related-card{border:1px solid #e5e7eb;border-radius:14px;background:#fff;overflow:hidden}.growth-related-img{display:grid;place-items:center;height:130px;background:#fff;color:#98a2b3;text-decoration:none}.growth-related-img img{width:100%;height:100%;object-fit:contain;padding:9px}.growth-related-card>div{padding:9px}.growth-related-meta{font-size:9px;color:#667085}.growth-related-name{display:block;font-size:11px;font-weight:900;line-height:1.8;color:#172033;text-decoration:none;margin:3px 0}.growth-related-price{font-size:10px;font-weight:800;color:#a60f18}@media(max-width:700px){.growth-related-grid{grid-template-columns:1fr 1fr}.growth-related-img{height:110px}}</style>`;
  body=body.replace('</head>',style+'</head>');
  body=body.includes('</main>')?body.replace('</main>',section+'</main>'):body.replace('</body>',section+'</body>');
 }
 if(!body.includes('/growth-tools.js'))body=body.replace('</body>','<script src="/growth-tools.js" defer></script></body>');
 if(!body.includes('/product-mobile-cta-v1.js'))body=body.replace('</body>','<script src="/product-mobile-cta-v1.js?v=1" defer></script></body>');
 const h=new Headers(r.headers);h.delete('content-length');return new Response(body,{status:r.status,headers:h});
}

export default{async fetch(request,env){const u=new URL(request.url);try{
 if(u.pathname==='/api/health'&&request.method==='GET')return health(request,env);
 const m=u.pathname.match(/^\/product\/([^/]+)\/?$/);if(m&&request.method==='GET')return productPage(request,env,decodeURIComponent(m[1]));
 return coreWorker.fetch(request,env);
}catch(e){console.error(e);return u.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}}};

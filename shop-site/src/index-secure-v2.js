import baseWorker from './index-secure.js';

const enc=new TextEncoder();
const ADMIN_COOKIE='soroush_admin';
const ADMIN_MAX_AGE=8*60*60;
const ADMIN_PASSWORD_SALT='-m_ypYw6c6611ECfPItrdQ';
const ADMIN_PASSWORD_HASH_B64U='a3AHMyGcPzU0v1_Dg9d_RfFqRjBTgegZVrSnjjOBrNs';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const html=(body,status=200,headers={})=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store',...headers}});
function b64url(bytes){let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function secureEqual(a,b){
  const [ha,hb]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(String(a))),crypto.subtle.digest('SHA-256',enc.encode(String(b)))]);
  const aa=new Uint8Array(ha),bb=new Uint8Array(hb);let diff=aa.length^bb.length;
  for(let i=0;i<Math.min(aa.length,bb.length);i++)diff|=aa[i]^bb[i];
  return diff===0;
}
async function passwordDigest(password){
  const d=await crypto.subtle.digest('SHA-256',enc.encode(`${ADMIN_PASSWORD_SALT}:${String(password||'')}`));
  return b64url(new Uint8Array(d));
}
async function hmac(secret,message){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(message))));
}
function adminConfigured(env){return typeof env.ADMIN_SESSION_SECRET==='string'&&env.ADMIN_SESSION_SECRET.length>=32}
async function adminLogin(request,env){
  if(!adminConfigured(env))return json({error:'پنل مدیریت هنوز فعال نشده است'},503);
  let body;try{body=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const password=String(body?.token||'');
  if(!(await secureEqual(await passwordDigest(password),ADMIN_PASSWORD_HASH_B64U)))return json({error:'رمز مدیریت نادرست است'},401);
  const exp=Math.floor(Date.now()/1000)+ADMIN_MAX_AGE;
  const sig=await hmac(env.ADMIN_SESSION_SECRET,String(exp));
  const cookie=`${ADMIN_COOKIE}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ADMIN_MAX_AGE}`;
  return json({ok:true},200,{'set-cookie':cookie});
}
function cleanText(v,max=500){return String(v??'').replace(/\s+/g,' ').trim().slice(0,max)}
function cleanMultiline(v,max=6000){return String(v??'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean).join('\n').slice(0,max)}
function validDocumentUrl(v){return !v||/^https:\/\//i.test(v)||/^\/(?!\/)/.test(v)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fa(n){return new Intl.NumberFormat('fa-IR').format(Number(n)||0)}
function categoryInfo(id){
  const map={
    'gas-detectors':['نشت‌یاب گاز','/category/gas-detectors/'],
    'fire-extinguishers':['کپسول آتش‌نشانی','/category/fire-extinguishers/'],
    'sprinklers':['اسپرینکلر','/category/sprinklers/'],
    'fire-alarm':['اعلام حریق','/category/fire-alarm/'],
    'firebox-hosereel':['فایرباکس و هوزریل','/category/firebox-hosereel/'],
    'fire-pumps':['پمپ آتش‌نشانی','/category/fire-pumps/']
  };
  return map[id]||['محصولات','/'];
}
function effectiveIndexable(p){
  return Number(p.seo_ready)===1&&Boolean(cleanText(p.brand,120))&&Boolean(cleanText(p.model,120))&&cleanText(p.description,4000).length>=30&&Boolean(cleanText(p.image_url,1000))&&Number(p.image_is_sample)!==1;
}
async function productRow(env,slug){
  return env.DB.prepare(`SELECT id,slug,name,category,status,price_toman,stock_qty,image_url,description,brand,model,sku,specs_text,catalog_url,datasheet_url,seo_title,seo_description,image_is_sample,seo_ready,is_active FROM products WHERE slug=? AND is_active=1 LIMIT 1`).bind(slug).first();
}
async function authProbe(request,env){
  const u=new URL('/api/admin/products',request.url);
  const r=await baseWorker.fetch(new Request(u,{method:'GET',headers:request.headers}),env);
  return r.ok;
}
async function publicProduct(env,slug){
  const p=await productRow(env,slug);
  if(!p)return json({error:'محصول پیدا نشد'},404);
  return json({...p,effective_indexable:effectiveIndexable(p)});
}
async function adminDetails(request,env){
  if(!(await authProbe(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  const {results=[]}=await env.DB.prepare(`SELECT slug,brand,model,sku,specs_text,catalog_url,datasheet_url,seo_title,seo_description,image_url,image_is_sample,seo_ready,description FROM products ORDER BY sort_order ASC,id ASC`).all();
  return json({products:results.map(p=>({...p,effective_indexable:effectiveIndexable(p)}))});
}
async function adminUpdateDetails(request,env,slug){
  if(!(await authProbe(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  let b;try{b=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const current=await env.DB.prepare(`SELECT * FROM products WHERE slug=? LIMIT 1`).bind(slug).first();
  if(!current)return json({error:'محصول پیدا نشد'},404);
  const brand=cleanText(b.brand??current.brand,120),model=cleanText(b.model??current.model,120),sku=cleanText(b.sku??current.sku,120);
  const specs=cleanMultiline(b.specs_text??current.specs_text,6000),catalogUrl=cleanText(b.catalog_url??current.catalog_url,1000),datasheetUrl=cleanText(b.datasheet_url??current.datasheet_url,1000),seoTitle=cleanText(b.seo_title??current.seo_title,180),seoDescription=cleanText(b.seo_description??current.seo_description,320);
  const image=cleanText(b.image_url??current.image_url,1000);
  if(image&&!/^https:\/\//i.test(image)&&!image.startsWith('/'))return json({error:'آدرس تصویر باید HTTPS یا مسیر داخلی سایت باشد'},400);
  if(!validDocumentUrl(catalogUrl)||!validDocumentUrl(datasheetUrl))return json({error:'لینک کاتالوگ و دیتاشیت باید HTTPS یا مسیر داخلی سایت باشد'},400);
  const imageIsSample=b.image_is_sample===undefined?Number(current.image_is_sample)!==0:Boolean(b.image_is_sample);
  const seoReady=b.seo_ready===undefined?Number(current.seo_ready)===1:Boolean(b.seo_ready);
  const candidate={...current,brand,model,sku,specs_text:specs,catalog_url:catalogUrl,datasheet_url:datasheetUrl,seo_title:seoTitle,seo_description:seoDescription,image_url:image,image_is_sample:imageIsSample?1:0,seo_ready:seoReady?1:0};
  if(seoReady&&!effectiveIndexable(candidate))return json({error:'برای انتشار در گوگل، برند، مدل، توضیح کافی و تصویر واقعی لازم است و گزینه «تصویر نمونه» باید خاموش باشد'},409);
  await env.DB.prepare(`UPDATE products SET brand=?,model=?,sku=?,specs_text=?,catalog_url=?,datasheet_url=?,seo_title=?,seo_description=?,image_url=?,image_is_sample=?,seo_ready=?,updated_at=? WHERE slug=?`).bind(brand||null,model||null,sku||null,specs||null,catalogUrl||null,datasheetUrl||null,seoTitle||null,seoDescription||null,image||null,imageIsSample?1:0,seoReady?1:0,new Date().toISOString(),slug).run();
  return json({ok:true,effective_indexable:effectiveIndexable(candidate)});
}
function specsRows(text){
  return cleanMultiline(text,6000).split('\n').filter(Boolean).map(line=>{
    const m=line.match(/^(.{1,80}?)[\s]*[:：\-–—][\s]*(.+)$/);
    return m?`<tr><th>${esc(m[1])}</th><td>${esc(m[2])}</td></tr>`:`<tr><td colspan="2">${esc(line)}</td></tr>`;
  }).join('');
}
function specsHighlights(text){
  const items=cleanMultiline(text,6000).split('\n').filter(Boolean).map(line=>{
    const m=line.match(/^(.{1,80}?)[\s]*[:：\-–—][\s]*(.+)$/);
    return m?{label:m[1],value:m[2]}:{label:'ویژگی',value:line};
  }).slice(0,4);
  return items.map(x=>`<div class="product-key-feature"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></div>`).join('');
}
function schemaScript(p,canonical){
  if(!effectiveIndexable(p))return '';
  const product={'@context':'https://schema.org','@type':'Product',name:p.name,url:canonical,image:[p.image_url],description:p.seo_description||p.description,brand:{'@type':'Brand',name:p.brand},model:p.model};
  if(p.sku)product.sku=p.sku;
  if(p.status==='priced'&&Number.isInteger(p.price_toman))product.offers={'@type':'Offer',url:canonical,priceCurrency:'IRR',price:String(p.price_toman*10),availability:Number(p.stock_qty)>0?'https://schema.org/InStock':'https://schema.org/OutOfStock'};
  const [catName,catUrl]=categoryInfo(p.category);
  const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'خانه',item:'https://shop.fireexecutive.ir/'},{'@type':'ListItem',position:2,name:catName,item:'https://shop.fireexecutive.ir'+catUrl},{'@type':'ListItem',position:3,name:p.name,item:canonical}]};
  return `<script type="application/ld+json">${JSON.stringify([product,breadcrumb]).replace(/</g,'\\u003c')}</script>`;
}
async function renderProduct(env,slug){
  const p=await productRow(env,slug);
  if(!p)return html('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="robots" content="noindex"><title>محصول پیدا نشد</title><body><main style="font-family:Tahoma;padding:30px"><h1>محصول پیدا نشد</h1><a href="/">بازگشت به فروشگاه</a></main></body></html>',404);
  const ready=effectiveIndexable(p),[catName,catUrl]=categoryInfo(p.category),canonical=`https://shop.fireexecutive.ir/product/${encodeURIComponent(p.slug)}/`;
  const title=cleanText(p.seo_title,180)||(ready?`${p.name} ${p.brand||''} ${p.model||''} | سروش ایمنی شهر`:`${p.name} | سروش ایمنی شهر`);
  const description=cleanText(p.seo_description,320)||cleanText(p.description,320)||`مشاهده اطلاعات ${p.name} در فروشگاه سروش ایمنی شهر.`;
  const price=p.status==='priced'&&Number.isInteger(p.price_toman)?`${fa(p.price_toman)} تومان`:'استعلام قیمت',stock=Number.isInteger(p.stock_qty)?`${fa(p.stock_qty)} عدد`:'استعلام';
  const meta=[p.brand&&`برند: ${esc(p.brand)}`,p.model&&`مدل: ${esc(p.model)}`,p.sku&&`کد کالا: ${esc(p.sku)}`].filter(Boolean).join(' · '),rows=specsRows(p.specs_text),highlights=specsHighlights(p.specs_text);
  const docs=[p.catalog_url&&{label:'مشاهده کاتالوگ محصول',url:p.catalog_url,type:'catalog'},p.datasheet_url&&{label:'مشاهده دیتاشیت فنی',url:p.datasheet_url,type:'datasheet'}].filter(Boolean);
  const docsHtml=docs.length?`<section class="product-documents" aria-label="کاتالوگ و مدارک فنی"><h2>کاتالوگ و مدارک فنی</h2><div class="product-document-links">${docs.map(d=>`<a class="product-document-link" data-document-type="${d.type}" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.label)}</a>`).join('')}</div></section>`:'';
  const img=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc((Number(p.image_is_sample)===1?'تصویر نمونه ':'')+p.name)}" loading="eager" decoding="async">`:'<div class="noimg">تصویر محصول هنوز ثبت نشده است</div>';
  const notice=Number(p.image_is_sample)===1?'<div class="notice">تصویر فعلی نمونه است و پس از ثبت عکس واقعی همین کالا جایگزین می‌شود.</div>':'';
  return html(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${ready?'index,follow':'noindex,follow'}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="product"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${p.image_url?`<meta property="og:image" content="${esc(p.image_url)}">`:''}<link rel="stylesheet" href="/pages.css?v=3">${schemaScript(p,canonical)}</head><body><header class="top"><div class="wrap"><a class="brand" href="/">سروش <span>ایمنی شهر</span></a><nav class="nav"><a href="/">فروشگاه</a><a href="/track/">پیگیری سفارش</a></nav></div></header><main class="wrap"><div class="crumb"><a href="/">خانه</a> ← <a href="${catUrl}">${esc(catName)}</a> ← ${esc(p.name)}</div><section class="product"><div class="image">${img}</div><div><span class="status ${ready?'published':''}">${ready?'اطلاعات واقعی / قابل ایندکس':'در حال تکمیل / NOINDEX'}</span><h1>${esc(p.name)}</h1>${meta?`<div class="product-meta">${meta}</div>`:''}<p class="lead">${esc(p.description||'اطلاعات این محصول در حال تکمیل است.')}</p>${highlights?`<section class="product-key-features" aria-label="ویژگی‌های کلیدی"><h2>ویژگی‌های کلیدی</h2><div class="product-key-feature-grid">${highlights}</div></section>`:''}<div class="price-box"><div><span>قیمت</span><strong>${price}</strong></div><div><span>موجودی</span><strong>${stock}</strong></div></div>${notice}<a class="buy-link" href="/#products">بازگشت به محصولات و افزودن به سبد</a></div></section><section class="specs"><h2>مشخصات فنی</h2>${rows?`<table class="spec-table"><tbody>${rows}</tbody></table>`:'<p class="lead">مشخصات فنی دقیق هنوز ثبت نشده است.</p>'}</section>${docsHtml}</main><footer class="footer"><div class="wrap">© سروش ایمنی شهر</div></footer></body></html>`);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/health')return json({ok:true,service:'soroush-shop',admin_auth:'sha256-random-password',product_details:'v1'});
      if(url.pathname==='/api/admin/login'&&request.method==='POST')return adminLogin(request,env);
      if(url.pathname==='/api/admin/product-details'&&request.method==='GET')return adminDetails(request,env);
      const adm=url.pathname.match(/^\/api\/admin\/product-details\/([^/]+)$/);if(adm&&request.method==='PUT')return adminUpdateDetails(request,env,decodeURIComponent(adm[1]));
      const api=url.pathname.match(/^\/api\/products\/([^/]+)$/);if(api&&request.method==='GET')return publicProduct(env,decodeURIComponent(api[1]));
      const page=url.pathname.match(/^\/product\/([^/]+)\/?$/);if(page&&request.method==='GET')return renderProduct(env,decodeURIComponent(page[1]));
      return baseWorker.fetch(request,env);
    }catch(err){
      console.error(err);
      return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):html('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><body><main style="font-family:Tahoma;padding:30px">خطای داخلی سرور</main></body></html>',500);
    }
  }
};
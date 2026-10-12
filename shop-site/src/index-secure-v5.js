import coreWorker from './index-secure-v4.js';

const MAX_IMAGE_BYTES=1500000;
const MAX_GALLERY_IMAGES=5;
const enc=new TextEncoder();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function cleanText(v,max=180){return String(v??'').replace(/\s+/g,' ').trim().slice(0,max)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function b64url(bytes){let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function sameOrigin(request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin}
function detectMime(buffer){
  const u=new Uint8Array(buffer);
  if(u.length>=12&&u[0]===0x52&&u[1]===0x49&&u[2]===0x46&&u[3]===0x46&&u[8]===0x57&&u[9]===0x45&&u[10]===0x42&&u[11]===0x50)return 'image/webp';
  if(u.length>=3&&u[0]===0xff&&u[1]===0xd8&&u[2]===0xff)return 'image/jpeg';
  if(u.length>=8&&u[0]===0x89&&u[1]===0x50&&u[2]===0x4e&&u[3]===0x47&&u[4]===0x0d&&u[5]===0x0a&&u[6]===0x1a&&u[7]===0x0a)return 'image/png';
  return null;
}
async function authProbe(request,env){
  const url=new URL('/api/admin/product-details',request.url);
  const response=await coreWorker.fetch(new Request(url,{method:'GET',headers:request.headers}),env);
  return response.ok;
}
async function ensureProduct(env,slug){return env.DB.prepare(`SELECT slug,name,image_url FROM products WHERE slug=? AND is_active=1 LIMIT 1`).bind(slug).first()}
function galleryUrl(id){return `/media/gallery/${id}?v=${id}`}
async function listGallery(request,env,slug){
  if(!(await authProbe(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  const product=await ensureProduct(env,slug);if(!product)return json({error:'محصول پیدا نشد'},404);
  const {results=[]}=await env.DB.prepare(`SELECT id,position,size_bytes,original_name,updated_at FROM product_gallery_images WHERE product_slug=? ORDER BY position ASC,id ASC`).bind(slug).all();
  return json({product_slug:slug,max_images:MAX_GALLERY_IMAGES,images:results.map(x=>({...x,url:galleryUrl(x.id)}))});
}
async function uploadGallery(request,env,slug){
  if(!(await authProbe(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  if(!sameOrigin(request))return json({error:'درخواست از مبدا نامعتبر است'},403);
  const product=await ensureProduct(env,slug);if(!product)return json({error:'محصول پیدا نشد'},404);
  const countRow=await env.DB.prepare(`SELECT COUNT(*) AS c FROM product_gallery_images WHERE product_slug=?`).bind(slug).first();
  if(Number(countRow?.c||0)>=MAX_GALLERY_IMAGES)return json({error:`حداکثر ${MAX_GALLERY_IMAGES} تصویر جانبی برای هر محصول مجاز است`},409);
  const contentLength=Number(request.headers.get('content-length')||0);if(contentLength>MAX_IMAGE_BYTES+300000)return json({error:'حجم فایل بیش از حد مجاز است'},413);
  let form;try{form=await request.formData()}catch{return json({error:'فایل تصویر معتبر نیست'},400)}
  const file=form.get('image');
  if(!file||typeof file.arrayBuffer!=='function')return json({error:'تصویری انتخاب نشده است'},400);
  if(!file.size||file.size>MAX_IMAGE_BYTES)return json({error:'حجم تصویر نهایی باید حداکثر ۱٫۵ مگابایت باشد'},413);
  const buffer=await file.arrayBuffer(),mime=detectMime(buffer);if(!mime)return json({error:'فرمت تصویر مجاز نیست؛ JPG، PNG یا WebP انتخاب کنید'},415);
  const posRow=await env.DB.prepare(`SELECT COALESCE(MAX(position),-1)+1 AS p FROM product_gallery_images WHERE product_slug=?`).bind(slug).first();
  const now=new Date().toISOString();
  const res=await env.DB.prepare(`INSERT INTO product_gallery_images(product_slug,position,mime_type,image_data,size_bytes,original_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`).bind(slug,Number(posRow?.p||0),mime,buffer,file.size,cleanText(file.name||'gallery-image'),now,now).run();
  const id=Number(res.meta.last_row_id);
  return json({ok:true,id,url:galleryUrl(id),mime_type:mime,size_bytes:file.size},201);
}
async function deleteGallery(request,env,slug,id){
  if(!(await authProbe(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  if(!sameOrigin(request))return json({error:'درخواست از مبدا نامعتبر است'},403);
  const row=await env.DB.prepare(`SELECT id FROM product_gallery_images WHERE id=? AND product_slug=? LIMIT 1`).bind(id,slug).first();
  if(!row)return json({error:'تصویر پیدا نشد'},404);
  await env.DB.prepare(`DELETE FROM product_gallery_images WHERE id=? AND product_slug=?`).bind(id,slug).run();
  return json({ok:true});
}
async function reorderGallery(request,env,slug){
  if(!(await authProbe(request,env)))return json({error:'نیاز به ورود مدیریت'},401);
  if(!sameOrigin(request))return json({error:'درخواست از مبدا نامعتبر است'},403);
  let body;try{body=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const ids=Array.isArray(body?.ids)?body.ids.map(Number).filter(Number.isInteger):[];
  const {results=[]}=await env.DB.prepare(`SELECT id FROM product_gallery_images WHERE product_slug=? ORDER BY position,id`).bind(slug).all();
  const current=results.map(x=>Number(x.id));
  if(ids.length!==current.length||ids.some(x=>!current.includes(x))||new Set(ids).size!==ids.length)return json({error:'ترتیب تصاویر نامعتبر است'},400);
  await env.DB.batch(ids.map((id,i)=>env.DB.prepare(`UPDATE product_gallery_images SET position=?,updated_at=? WHERE id=? AND product_slug=?`).bind(i,new Date().toISOString(),id,slug)));
  return json({ok:true});
}
async function serveGallery(request,env,id){
  const row=await env.DB.prepare(`SELECT mime_type,image_data,size_bytes,updated_at FROM product_gallery_images WHERE id=? LIMIT 1`).bind(id).first();
  if(!row)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const digest=await crypto.subtle.digest('SHA-256',enc.encode(String(id)+'|'+row.updated_at+'|'+row.size_bytes));
  const etag='"'+b64url(new Uint8Array(digest)).slice(0,24)+'"';
  const cache='public, max-age=31536000, immutable';
  if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{etag,'cache-control':cache}});
  const bytes=row.image_data instanceof ArrayBuffer?new Uint8Array(row.image_data):new Uint8Array(row.image_data||[]);
  return new Response(request.method==='HEAD'?null:bytes,{status:200,headers:{'content-type':row.mime_type,'content-length':String(row.size_bytes),'cache-control':cache,etag,'x-content-type-options':'nosniff','cross-origin-resource-policy':'same-site'}});
}
async function enhanceProductGallery(request,env,slug){
  const response=await coreWorker.fetch(request,env);if(!response.ok)return response;
  const p=await ensureProduct(env,slug);if(!p)return response;
  const {results=[]}=await env.DB.prepare(`SELECT id,position FROM product_gallery_images WHERE product_slug=? ORDER BY position ASC,id ASC`).bind(slug).all();
  if(!results.length)return response;
  let body=await response.text();
  const thumbs=[];
  if(p.image_url)thumbs.push({src:p.image_url,label:`${p.name} - تصویر اصلی`});
  results.forEach((x,i)=>thumbs.push({src:galleryUrl(x.id),label:`${p.name} - تصویر ${i+2}`}));
  const thumbHtml=`<div class="product-gallery-thumbs" aria-label="گالری تصاویر">${thumbs.map((t,i)=>`<button type="button" class="product-gallery-thumb${i===0?' active':''}" data-src="${esc(t.src)}" data-alt="${esc(t.label)}" aria-label="${esc(t.label)}"><img src="${esc(t.src)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`;
  const open='<section class="product"><div class="image">';
  if(body.includes(open))body=body.replace(open,'<section class="product"><div class="product-gallery"><div class="image" id="productMainImage">');
  const close='</div><div><span class="status';
  if(body.includes(close))body=body.replace(close,`</div>${thumbHtml}</div><div><span class="status`);
  const style=`<style id="product-gallery-v1">.product-gallery{min-width:0}.product-gallery-thumbs{display:flex;gap:8px;overflow-x:auto;padding:9px 1px 3px;scrollbar-width:thin}.product-gallery-thumb{flex:0 0 68px;width:68px;height:68px;border:1px solid #e5e7eb;background:#fff;border-radius:11px;padding:4px;cursor:pointer}.product-gallery-thumb.active{border:2px solid #a60f18;box-shadow:0 0 0 2px rgba(244,181,27,.22)}.product-gallery-thumb img{display:block;width:100%;height:100%;object-fit:contain;border-radius:7px}.product-gallery .image{width:100%}@media(max-width:760px){.product-gallery-thumb{flex-basis:60px;width:60px;height:60px}}</style>`;
  const script=`<script id="product-gallery-v1-js">(()=>{const box=document.getElementById('productMainImage');if(!box)return;document.querySelectorAll('.product-gallery-thumb').forEach(btn=>btn.addEventListener('click',()=>{const src=btn.dataset.src,alt=btn.dataset.alt||'تصویر محصول';box.innerHTML='<img src="'+src.replace(/"/g,'&quot;')+'" alt="'+alt.replace(/"/g,'&quot;')+'" loading="eager" decoding="async">';document.querySelectorAll('.product-gallery-thumb').forEach(x=>x.classList.remove('active'));btn.classList.add('active')}));})();</script>`;
  body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(body,{status:response.status,headers});
}
async function health(request,env){const response=await coreWorker.fetch(request,env);const data=await response.json().catch(()=>({ok:true,service:'soroush-shop'}));return json({...data,product_gallery:'v1'});}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/health'&&request.method==='GET')return health(request,env);
      const list=url.pathname.match(/^\/api\/admin\/product-gallery\/([^/]+)$/);
      if(list&&request.method==='GET')return listGallery(request,env,decodeURIComponent(list[1]));
      if(list&&request.method==='POST')return uploadGallery(request,env,decodeURIComponent(list[1]));
      if(list&&request.method==='PUT')return reorderGallery(request,env,decodeURIComponent(list[1]));
      const del=url.pathname.match(/^\/api\/admin\/product-gallery\/([^/]+)\/(\d+)$/);
      if(del&&request.method==='DELETE')return deleteGallery(request,env,decodeURIComponent(del[1]),Number(del[2]));
      const media=url.pathname.match(/^\/media\/gallery\/(\d+)$/);
      if(media&&(request.method==='GET'||request.method==='HEAD'))return serveGallery(request,env,Number(media[1]));
      const product=url.pathname.match(/^\/product\/([^/]+)\/?$/);
      if(product&&request.method==='GET')return enhanceProductGallery(request,env,decodeURIComponent(product[1]));
      return coreWorker.fetch(request,env);
    }catch(err){console.error(err);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}
  }
};

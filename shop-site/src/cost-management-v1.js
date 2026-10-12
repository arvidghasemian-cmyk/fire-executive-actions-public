import coreWorker from './business-insights-v1.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const clean=(v,max=500)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const int=(v,min=0,max=999999999999)=>{const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:null};
function sameOrigin(request){const o=request.headers.get('origin');return !o||o===new URL(request.url).origin}
async function adminGuard(request,env){
 if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
 const probe=new URL('/api/admin/orders?limit=1',request.url),r=await coreWorker.fetch(new Request(probe,{method:'GET',headers:request.headers}),env);
 if(!r.ok)return json({error:'نیاز به ورود مدیریت'},401);
 return null;
}
async function gaps(env){
 const {results:rows=[]}=await env.DB.prepare(`SELECT p.slug id,p.slug,p.name label,p.sku,p.price_toman reference_price_toman,p.stock_qty,
   CASE WHEN EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1) THEN 'default_for_variants' ELSE 'product' END scope
   FROM products p WHERE p.is_active=1 AND p.status='priced' AND p.cost_price_toman IS NULL
   AND (NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1)
     OR EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1 AND v.cost_price_toman IS NULL))
   ORDER BY COALESCE(p.stock_qty,0) DESC,p.name LIMIT 100`).all();
 const out=[];
 for(const x of rows){
  let ref=Number.isInteger(x.reference_price_toman)?x.reference_price_toman:null;
  if(x.scope==='default_for_variants'){
    const q=await env.DB.prepare(`SELECT MIN(COALESCE(v.price_toman,p.price_toman)) min_price FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.slug=? AND v.is_active=1 AND v.cost_price_toman IS NULL`).bind(x.slug).first();
    if(Number.isInteger(q?.min_price))ref=q.min_price;
  }
  out.push({type:'product',id:x.id,slug:x.slug,label:x.scope==='default_for_variants'?x.label+' — قیمت خرید پایه تنوع‌ها':x.label,sku:x.sku||'',stock_qty:x.stock_qty==null?null:Number(x.stock_qty),reference_price_toman:ref,scope:x.scope});
 }
 return out;
}
function normalizeRows(input){
 if(!Array.isArray(input)||input.length<1||input.length>100)return {error:'بین ۱ تا ۱۰۰ ردیف وارد کنید'};
 const rows=[],seen=new Set();
 for(const raw of input){
  const type=clean(raw?.type,20),id=type==='variant'?int(raw?.id,1,2147483647):clean(raw?.id,120),cost=int(raw?.cost_price_toman,0,999999999999);
  if(!['product','variant'].includes(type)||!id||cost===null)return {error:'یکی از ردیف‌های قیمت خرید معتبر نیست'};
  const key=type+':'+id;if(seen.has(key))return {error:'ردیف تکراری در درخواست وجود دارد'};seen.add(key);rows.push({type,id,cost_price_toman:cost});
 }
 return {rows};
}
async function inspectRows(rows,env){
 const out=[];
 for(const row of rows){
  if(row.type==='product'){
   const p=await env.DB.prepare(`SELECT id,slug,name,sku,price_toman,cost_price_toman FROM products WHERE slug=? AND is_active=1 AND status='priced' LIMIT 1`).bind(row.id).first();
   if(!p)return {error:`محصول ${row.id} پیدا نشد`,status:404};
   if(p.cost_price_toman!==null)return {error:`قیمت خرید «${p.name}» قبلاً ثبت شده؛ برای ویرایش از تب حاشیه سود استفاده کنید`,status:409};
   let ref=Number.isInteger(p.price_toman)?p.price_toman:null;
   const q=await env.DB.prepare(`SELECT MIN(COALESCE(v.price_toman,p.price_toman)) min_price FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.id=? AND v.is_active=1 AND v.cost_price_toman IS NULL`).bind(p.id).first();
   if(Number.isInteger(q?.min_price))ref=q.min_price;
   out.push({...row,label:p.name,sku:p.sku||'',reference_price_toman:ref,warning:ref!==null&&row.cost_price_toman>=ref?'قیمت خرید مساوی یا بیشتر از کمترین قیمت فروش است':null});
  }else{
   const v=await env.DB.prepare(`SELECT v.id,v.title,v.sku,v.price_toman,v.cost_price_toman,p.name,p.price_toman product_price,p.cost_price_toman product_cost FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND v.is_active=1 AND p.is_active=1 LIMIT 1`).bind(row.id).first();
   if(!v)return {error:`تنوع کالا ${row.id} پیدا نشد`,status:404};
   if(v.cost_price_toman!==null||v.product_cost!==null)return {error:`قیمت خرید مؤثر «${v.name} — ${v.title}» قبلاً ثبت شده؛ برای ویرایش از تب حاشیه سود استفاده کنید`,status:409};
   const ref=Number.isInteger(v.price_toman)?v.price_toman:(Number.isInteger(v.product_price)?v.product_price:null);
   out.push({...row,label:v.name+' — '+v.title,sku:v.sku||'',reference_price_toman:ref,warning:ref!==null&&row.cost_price_toman>=ref?'قیمت خرید مساوی یا بیشتر از قیمت فروش است':null});
  }
 }
 return {rows:out,warnings:out.filter(x=>x.warning).length};
}
async function preview(request,env){
 const denied=await adminGuard(request,env);if(denied)return denied;let b;try{b=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
 const parsed=normalizeRows(b.rows);if(parsed.error)return json({error:parsed.error},400);
 const checked=await inspectRows(parsed.rows,env);if(checked.error)return json({error:checked.error},checked.status||400);
 return json({ok:true,count:checked.rows.length,warnings:checked.warnings,requires_warning_ack:checked.warnings>0,rows:checked.rows});
}
async function apply(request,env){
 const denied=await adminGuard(request,env);if(denied)return denied;let b;try{b=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
 if(b.confirm!==true)return json({error:'ابتدا پیش‌نمایش تغییرات را تأیید کنید'},400);
 const parsed=normalizeRows(b.rows);if(parsed.error)return json({error:parsed.error},400);
 const checked=await inspectRows(parsed.rows,env);if(checked.error)return json({error:checked.error},checked.status||400);
 if(checked.warnings>0&&b.acknowledge_warnings!==true)return json({error:'حداقل یک قیمت خرید مساوی یا بیشتر از قیمت فروش است؛ هشدار را تأیید کنید',warnings:checked.warnings},409);
 const batchId=crypto.randomUUID(),t=now(),stmts=[];
 for(const row of checked.rows){
  if(row.type==='product')stmts.push(env.DB.prepare('UPDATE products SET cost_price_toman=?,updated_at=? WHERE slug=? AND cost_price_toman IS NULL').bind(row.cost_price_toman,t,row.id));
  else stmts.push(env.DB.prepare('UPDATE product_variants SET cost_price_toman=?,updated_at=? WHERE id=? AND cost_price_toman IS NULL').bind(row.cost_price_toman,t,row.id));
  stmts.push(env.DB.prepare(`INSERT INTO audit_log(action,entity_type,entity_id,details_json,created_at) VALUES('cost_price_bulk_update',?,?,?,?)`).bind(row.type,String(row.id),JSON.stringify({batch_id:batchId,before:null,after:row.cost_price_toman,source:'cost-management-v1',warning:row.warning||null}),t));
 }
 await env.DB.batch(stmts);
 return json({ok:true,batch_id:batchId,updated:checked.rows.length,warnings:checked.warnings});
}
async function gapList(request,env){const denied=await adminGuard(request,env);if(denied)return denied;return json({gaps:await gaps(env)});}
export default{async fetch(request,env){const u=new URL(request.url);try{
 if(u.pathname==='/api/admin/cost-management/gaps'&&request.method==='GET')return gapList(request,env);
 if(u.pathname==='/api/admin/cost-management/preview'&&request.method==='POST')return preview(request,env);
 if(u.pathname==='/api/admin/cost-management/apply'&&request.method==='PUT')return apply(request,env);
 if(u.pathname==='/api/health'&&request.method==='GET'){const r=await coreWorker.fetch(request,env),d=await r.json();return json({...d,cost_management:'bulk-v1'})}
 return coreWorker.fetch(request,env);
}catch(e){console.error(e);return u.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}}};

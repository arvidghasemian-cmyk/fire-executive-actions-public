const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const digits=v=>String(v??'').replace(/[۰-۹]/g,c=>c.charCodeAt(0)-1776).replace(/[٠-٩]/g,c=>c.charCodeAt(0)-1632);
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
export function phone(v){let s=digits(v).replace(/[\s()-]/g,'');if(s.startsWith('+98'))s='0'+s.slice(3);if(s.startsWith('0098'))s='0'+s.slice(4);if(s.startsWith('98'))s='0'+s.slice(2);return s}
function fail(message,status=400){throw Object.assign(new Error(message),{status})}
function safeVariantId(v){if(v===null||v===undefined||v==='')return null;const n=Number(digits(v));if(!Number.isSafeInteger(n)||n<1)fail('تنوع انتخاب‌شده معتبر نیست');return n}

export async function quote(body,env){
 const items=body.items;if(!Array.isArray(items)||!items.length||items.length>30)fail('سبد خرید معتبر نیست');
 const merged=new Map();
 for(const it of items){
  const slug=clean(it?.slug,140),variantId=safeVariantId(it?.variant_id),q=Number(digits(it?.quantity));
  if(!slug||!Number.isInteger(q)||q<1||q>20)fail('تعداد کالا باید بین ۱ تا ۲۰ باشد');
  const key=variantId?`v:${variantId}`:`p:${slug}`,old=merged.get(key);
  if(old&&old.slug!==slug)fail('تنوع انتخاب‌شده با محصول مطابقت ندارد');
  const quantity=(old?.quantity||0)+q;if(quantity>20)fail('حداکثر تعداد هر کالا یا تنوع ۲۰ عدد است');
  merged.set(key,{slug,variant_id:variantId,quantity});
 }
 const slugs=[...new Set([...merged.values()].map(x=>x.slug))],ph=slugs.map(()=>'?').join(',');
 const {results:rows=[]}=await env.DB.prepare(`SELECT * FROM products WHERE slug IN (${ph}) AND is_active=1 AND status<>'hidden'`).bind(...slugs).all();
 if(rows.length!==slugs.length)fail('یکی از کالاهای سبد دیگر قابل سفارش نیست؛ سبد را به‌روز کنید',409);
 const bySlug=new Map(rows.map(x=>[x.slug,x])),productIds=rows.map(x=>x.id),pp=productIds.map(()=>'?').join(',');
 const {results:variantCounts=[]}=await env.DB.prepare(`SELECT product_id,COUNT(*) c FROM product_variants WHERE product_id IN (${pp}) AND is_active=1 GROUP BY product_id`).bind(...productIds).all();
 const hasVariants=new Set(variantCounts.filter(x=>Number(x.c)>0).map(x=>Number(x.product_id)));
 const variantIds=[...new Set([...merged.values()].map(x=>x.variant_id).filter(Boolean))];let variants=[];
 if(variantIds.length){const vp=variantIds.map(()=>'?').join(',');({results:variants=[]}=await env.DB.prepare(`SELECT * FROM product_variants WHERE id IN (${vp}) AND is_active=1`).bind(...variantIds).all());if(variants.length!==variantIds.length)fail('یکی از تنوع‌های انتخاب‌شده دیگر قابل سفارش نیست؛ سبد را به‌روز کنید',409)}
 const byVariant=new Map(variants.map(x=>[Number(x.id),x])),lines=[],quantities=new Map();
 for(const item of merged.values()){
  const p=bySlug.get(item.slug);let v=null;
  if(item.variant_id){v=byVariant.get(item.variant_id);if(!v||Number(v.product_id)!==Number(p.id))fail('تنوع انتخاب‌شده با محصول مطابقت ندارد',409)}
  else if(hasVariants.has(Number(p.id)))fail(`برای ${p.name} ابتدا مدل / تنوع موردنظر را انتخاب کنید`,409);
  const stock=v?v.stock_qty:p.stock_qty;
  if(Number(p.track_inventory)&&!Number(p.allow_backorder)&&(stock===null||stock===undefined||Number(stock)<item.quantity))fail('موجودی '+p.name+(v?' — '+v.title:'')+' کافی نیست',409);
  const unit=p.status==='priced'?(Number.isInteger(v?.price_toman)?v.price_toman:p.price_toman):null;
  lines.push({product:p,variant:v,quantity:item.quantity,unit_price_toman:Number.isInteger(unit)?unit:null});
  quantities.set(p.slug,(quantities.get(p.slug)||0)+item.quantity);
 }
 const priced=lines.every(x=>Number.isInteger(x.unit_price_toman)),subtotal=priced?lines.reduce((n,x)=>n+x.unit_price_toman*x.quantity,0):null;
 const shippingCode=clean(body.shipping_method,80)||'manual';const ship=await env.DB.prepare('SELECT * FROM shipping_methods WHERE code=? AND is_active=1').bind(shippingCode).first();if(!ship)fail('روش ارسال معتبر نیست');
 const zones=JSON.parse(ship.provinces_json||'[]');if(zones.length&&!zones.includes(clean(body.customer?.province,100)))fail('روش ارسال برای استان انتخاب‌شده فعال نیست');
 let discount=null,amount=0;const code=clean(body.discount_code,80).toUpperCase(),now=Date.now();
 const usable=d=>d.is_active&&(!d.starts_at||Date.parse(d.starts_at)<=now)&&(!d.ends_at||Date.parse(d.ends_at)>=now)&&(d.max_uses===null||d.used_count<d.max_uses)&&(d.min_order_toman===null||subtotal>=d.min_order_toman);
 if(code){discount=await env.DB.prepare('SELECT * FROM discounts WHERE code=?').bind(code).first();if(!priced||!discount||!usable(discount))fail('کد تخفیف برای این سفارش قابل استفاده نیست',409)}
 if(!code&&priced){const {results}=await env.DB.prepare('SELECT * FROM discounts WHERE automatic=1 AND is_active=1 ORDER BY id').all();const value=d=>d.type==='percent'?Math.round(subtotal*d.value/100):d.type==='fixed'?Math.min(subtotal,d.value):ship.price_toman;discount=results.filter(usable).sort((a,b)=>value(b)-value(a))[0]||null}
 if(discount)amount=discount.type==='percent'?Math.round(subtotal*discount.value/100):discount.type==='fixed'?Math.min(subtotal,discount.value):0;
 let shipping=priced?ship.price_toman:0;if((priced&&ship.free_over_toman!==null&&subtotal>=ship.free_over_toman)||discount?.type==='free_shipping')shipping=0;
 const {results:settings}=await env.DB.prepare("SELECT key,value FROM store_settings WHERE key IN('tax_enabled','tax_percent')").all();const cfg=Object.fromEntries(settings.map(x=>[x.key,x.value]));const tax=priced&&cfg.tax_enabled==='1'?Math.round((subtotal-amount+shipping)*Math.min(100,Math.max(0,Number(cfg.tax_percent)||0))/100):0;
 const total=priced?subtotal-amount+shipping+tax:null;if(total!==null&&(!Number.isSafeInteger(total)||total>999999999999))fail('مبلغ سفارش بیش از سقف مجاز است');
 return {rows,quantities,lines,subtotal_toman:subtotal,discount_code:discount?.code||null,discount_toman:amount,shipping_method:shippingCode,shipping_toman:shipping,tax_toman:tax,grand_total_toman:total};
}

export async function checkout(request,env,preview=false){
 try{
  const b=await request.json();if(!b||typeof b!=='object')return json({error:'درخواست نامعتبر است'},400);
  if(preview){const q=await quote(b,env);const {rows,quantities,lines,...amounts}=q;return json(amounts)}
  if(b.terms?.accepted!==true||b.terms?.version!=='2026-10-02-v1')return json({error:'قوانین خرید و حریم خصوصی را تأیید کنید'},400);
  if(b.payment_method!=='manual_confirmation')return json({error:'روش پرداخت معتبر نیست'},400);
  const c=b.customer||{},name=clean(c.name,120),mobile=phone(c.phone),postal=digits(c.postal_code).trim();if(name.length<2||!/^09\d{9}$/.test(mobile)||(postal&&!/^\d{10}$/.test(postal)))return json({error:'نام، شماره موبایل یا کدپستی معتبر نیست'},400);
  const key=request.headers.get('idempotency-key');if(key&&!/^[a-zA-Z0-9_-]{16,100}$/.test(key))return json({error:'شناسه درخواست معتبر نیست'},400);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(b))))).map(x=>x.toString(16).padStart(2,'0')).join('');
  async function existing(){if(!key)return null;const old=await env.DB.prepare('SELECT order_code,request_hash,grand_total_toman FROM orders WHERE request_key=?').bind(key).first();return old?old.request_hash===hash?json({ok:true,order_code:old.order_code,total_toman:old.grand_total_toman,reused:true},200):json({error:'شناسه درخواست برای سبد دیگری استفاده شده است'},409):null}
  const old=await existing();if(old)return old;
  const q=await quote(b,env),time=new Date().toISOString(),orderCode='SE-'+crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
  const stm=[env.DB.prepare(`INSERT INTO orders(order_code,customer_name,phone,province,city,address,postal_code,company,notes,status,created_at,updated_at,terms_accepted_at,terms_version,payment_method,subtotal_toman,discount_code,discount_toman,shipping_method,shipping_toman,tax_toman,grand_total_toman,request_key,request_hash) VALUES(?,?,?,?,?,?,?,?,?,'new',?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderCode,name,mobile,clean(c.province,100),clean(c.city,100),clean(c.address,700),postal,clean(c.company,140),clean(c.notes,1000),time,time,time,b.terms.version,b.payment_method,q.subtotal_toman,q.discount_code,q.discount_toman,q.shipping_method,q.shipping_toman,q.tax_toman,q.grand_total_toman,key,hash)];
  for(const line of q.lines){const p=line.product,v=line.variant;stm.push(env.DB.prepare('INSERT INTO order_items(order_id,product_id,product_name,product_slug,quantity,unit_price_toman,variant_id,variant_title,variant_sku) VALUES((SELECT id FROM orders WHERE order_code=?),?,?,?,?,?,?,?,?)').bind(orderCode,p.id,p.name,p.slug,line.quantity,line.unit_price_toman,v?.id||null,v?.title||null,v?.sku||null))}
  stm.push(env.DB.prepare("INSERT INTO order_status_history(order_id,to_status,changed_at) VALUES((SELECT id FROM orders WHERE order_code=?),'new',?)").bind(orderCode,time));
  try{await env.DB.batch(stm)}catch(e){const again=await existing();if(again)return again;if(String(e).includes('discount unavailable'))return json({error:'ظرفیت یا زمان تخفیف تغییر کرده است؛ دوباره بررسی کنید'},409);throw e}
  const {rows,quantities,lines,...amounts}=q;return json({ok:true,order_code:orderCode,total_toman:q.subtotal_toman,...amounts,terms_version:b.terms.version,payment_method:b.payment_method},201);
 }catch(e){if(e instanceof SyntaxError)return json({error:'درخواست نامعتبر است'},400);if(e.status)return json({error:e.message},e.status);console.error(e);return json({error:'ثبت سفارش انجام نشد؛ دوباره تلاش کنید'},500)}
}

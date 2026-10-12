import coreWorker from './sales-growth-v1.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const clean=(v,max=500)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const int=(v,min=0,max=999999999999)=>{const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:null};
function sameOrigin(request){const o=request.headers.get('origin');return !o||o===new URL(request.url).origin}
async function adminGuard(request,env){
  const probe=new URL('/api/admin/orders?limit=1',request.url);
  const r=await coreWorker.fetch(new Request(probe,{method:'GET',headers:request.headers}),env);
  if(!r.ok)return json({error:'نیاز به ورود مدیریت'},401);
  if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
  return null;
}
async function readPolicy(env){
  const {results=[]}=await env.DB.prepare("SELECT key,value FROM store_settings WHERE key IN ('margin_protection_enabled','min_gross_margin_percent')").all();
  const map=Object.fromEntries(results.map(x=>[x.key,x.value]));
  return {enabled:map.margin_protection_enabled!=='0',min_margin_percent:int(map.min_gross_margin_percent??0,0,80)??0};
}
function floorPrice(cost,margin){
  if(!Number.isInteger(cost)||cost<0)return null;
  const den=100-margin;
  return Math.ceil(cost*100/den);
}
function rowMetrics(price,cost,margin){
  if(!Number.isInteger(price)||price<0)return {status:'no_price',floor_price_toman:null,max_safe_discount_toman:0,max_safe_discount_percent:0,current_margin_percent:null};
  if(!Number.isInteger(cost)||cost<0)return {status:'missing_cost',floor_price_toman:null,max_safe_discount_toman:0,max_safe_discount_percent:0,current_margin_percent:null};
  const floor=floorPrice(cost,margin),cap=Math.max(0,price-floor);
  const pct=price>0?Math.max(0,Math.floor(cap*100/price)):0;
  const current=price>0?((price-cost)*100/price):0;
  return {status:price<floor?'below_floor':'ok',floor_price_toman:floor,max_safe_discount_toman:cap,max_safe_discount_percent:pct,current_margin_percent:Math.round(current*10)/10};
}
async function itemRows(items,env){
  if(!Array.isArray(items)||!items.length||items.length>50)return [];
  const normalized=[];
  for(const x of items){
    const slug=clean(x?.slug,120),quantity=int(x?.quantity,1,20),variant_id=x?.variant_id==null?null:int(x.variant_id,1,2147483647);
    if(!slug||quantity===null||(x?.variant_id!=null&&variant_id===null))continue;
    normalized.push({slug,quantity,variant_id});
  }
  if(!normalized.length)return [];
  const slugs=[...new Set(normalized.map(x=>x.slug))],ph=slugs.map(()=>'?').join(',');
  const {results:products=[]}=await env.DB.prepare(`SELECT id,slug,name,category,price_toman,cost_price_toman,is_active,status FROM products WHERE slug IN (${ph}) AND is_active=1 AND status<>'hidden'`).bind(...slugs).all();
  const pm=new Map(products.map(p=>[p.slug,p]));
  const vids=[...new Set(normalized.map(x=>x.variant_id).filter(Number.isInteger))];let variants=[];
  if(vids.length){const vph=vids.map(()=>'?').join(',');({results:variants=[]}=await env.DB.prepare(`SELECT id,product_id,title,price_toman,cost_price_toman,is_active FROM product_variants WHERE id IN (${vph})`).bind(...vids).all())}
  const vm=new Map(variants.map(v=>[Number(v.id),v])),out=[];
  for(const x of normalized){
    const p=pm.get(x.slug);if(!p)continue;
    let price=p.price_toman,cost=p.cost_price_toman,label=p.name,variant_id=null;
    if(x.variant_id!==null){
      const v=vm.get(x.variant_id);if(!v||Number(v.product_id)!==Number(p.id)||!Number(v.is_active))continue;
      price=Number.isInteger(v.price_toman)?v.price_toman:p.price_toman;
      cost=Number.isInteger(v.cost_price_toman)?v.cost_price_toman:p.cost_price_toman;
      label=p.name+' — '+v.title;variant_id=Number(v.id);
    }
    if(!Number.isInteger(price))continue;
    out.push({product_id:Number(p.id),slug:p.slug,category:p.category,label,variant_id,quantity:x.quantity,unit_price_toman:price,cost_price_toman:Number.isInteger(cost)?cost:null});
  }
  return out;
}
async function basketGuard(items,env){
  const policy=await readPolicy(env),rows=await itemRows(items,env);
  if(!policy.enabled)return {enabled:false,limited:false,capacity_toman:Number.MAX_SAFE_INTEGER,missing_cost_items:0,below_floor_items:0,rows};
  let capacity=0,missing=0,below=0;
  for(const row of rows){
    const m=rowMetrics(row.unit_price_toman,row.cost_price_toman,policy.min_margin_percent);
    row.margin=m;
    if(m.status==='missing_cost'){missing+=row.quantity;continue}
    if(m.status==='below_floor')below+=row.quantity;
    capacity+=m.max_safe_discount_toman*row.quantity;
  }
  return {enabled:true,limited:false,capacity_toman:Math.max(0,capacity),missing_cost_items:missing,below_floor_items:below,rows,policy};
}
async function orderGuard(orderCode,env){
  const policy=await readPolicy(env);
  const {results:rows=[]}=await env.DB.prepare(`SELECT oi.quantity,oi.unit_price_toman,p.cost_price_toman product_cost,v.cost_price_toman variant_cost
    FROM order_items oi JOIN products p ON p.id=oi.product_id LEFT JOIN product_variants v ON v.id=oi.variant_id
    JOIN orders o ON o.id=oi.order_id WHERE o.order_code=?`).bind(orderCode).all();
  if(!policy.enabled)return {enabled:false,capacity_toman:Number.MAX_SAFE_INTEGER,missing_cost_items:0,below_floor_items:0};
  let capacity=0,missing=0,below=0;
  for(const row of rows){
    const cost=Number.isInteger(row.variant_cost)?row.variant_cost:row.product_cost;
    const m=rowMetrics(row.unit_price_toman,Number.isInteger(cost)?cost:null,policy.min_margin_percent),q=Number(row.quantity)||0;
    if(m.status==='missing_cost'){missing+=q;continue}
    if(m.status==='below_floor')below+=q;
    capacity+=m.max_safe_discount_toman*q;
  }
  return {enabled:true,capacity_toman:Math.max(0,capacity),missing_cost_items:missing,below_floor_items:below,policy};
}
async function capJsonResponse(response,items,env){
  if(!response.ok)return response;
  const data=await response.json(),candidate=Number(data.discount_toman)||0;
  if(candidate<=0)return json(data,response.status);
  const g=await basketGuard(items,env);if(!g.enabled)return json(data,response.status);
  const applied=Math.min(candidate,g.capacity_toman),limited=applied<candidate;
  return json({...data,discount_toman:applied,margin_guard:{limited}},response.status);
}
async function discountPreview(request,env){
  let body={};try{body=await request.clone().json()}catch{}
  const r=await coreWorker.fetch(request,env);
  if(!r.ok||!Array.isArray(body.items))return r;
  return capJsonResponse(r,body.items,env);
}
async function promotionPreview(request,env){
  let body={};try{body=await request.clone().json()}catch{}
  const r=await coreWorker.fetch(request,env);
  if(!r.ok)return r;
  const d=await r.json(),candidate=Number(d.discount_toman)||0,g=await basketGuard(body.items,env);
  if(!g.enabled||candidate<=0)return json({...d,margin_guard:{limited:false}},r.status);
  const applied=Math.min(candidate,g.capacity_toman),limited=applied<candidate;
  return json({...d,discount_toman:applied,label:limited&&d.label?d.label+' (محدود به سقف امن سود)':d.label,margin_guard:{limited}},r.status);
}
async function ruleRows(env,scopeType,scopeValue){
  let products=[];
  if(scopeType==='product'){
    const p=await env.DB.prepare(`SELECT id,slug,name,price_toman,cost_price_toman FROM products WHERE slug=? AND is_active=1 AND status='priced' LIMIT 1`).bind(scopeValue).first();
    if(p)products=[p];
  }else if(scopeType==='category'){
    ({results:products=[]}=await env.DB.prepare(`SELECT id,slug,name,price_toman,cost_price_toman FROM products WHERE category=? AND is_active=1 AND status='priced' ORDER BY name`).bind(scopeValue).all());
  }
  const rows=[];
  for(const p of products){
    if(Number.isInteger(p.price_toman))rows.push({label:p.name,price_toman:p.price_toman,cost_price_toman:Number.isInteger(p.cost_price_toman)?p.cost_price_toman:null});
    const {results:vars=[]}=await env.DB.prepare(`SELECT title,price_toman,cost_price_toman FROM product_variants WHERE product_id=? AND is_active=1 ORDER BY id`).bind(p.id).all();
    for(const v of vars){
      const price=Number.isInteger(v.price_toman)?v.price_toman:p.price_toman;
      if(!Number.isInteger(price))continue;
      rows.push({label:p.name+' — '+v.title,price_toman:price,cost_price_toman:Number.isInteger(v.cost_price_toman)?v.cost_price_toman:(Number.isInteger(p.cost_price_toman)?p.cost_price_toman:null)});
    }
  }
  return rows;
}
async function percentSafety(env,percent,scopeType,scopeValue){
  const policy=await readPolicy(env);if(!policy.enabled)return {ok:true,policy};
  const rows=await ruleRows(env,scopeType,scopeValue);
  if(!rows.length)return {ok:false,error:'کالای قیمت‌دار برای ارزیابی حاشیه سود پیدا نشد'};
  const missing=rows.filter(x=>!Number.isInteger(x.cost_price_toman));
  if(missing.length)return {ok:false,error:'ابتدا قیمت خرید همه کالاهای مشمول را ثبت کنید',missing:missing.slice(0,5).map(x=>x.label)};
  let worst=null;
  for(const row of rows){
    const m=rowMetrics(row.price_toman,row.cost_price_toman,policy.min_margin_percent);
    if(!worst||m.max_safe_discount_percent<worst.max_safe_discount_percent)worst={...m,label:row.label};
  }
  if(Number(percent)>worst.max_safe_discount_percent)return {ok:false,error:`این تخفیف از سقف امن حاشیه سود بیشتر است؛ حداکثر مجاز ${worst.max_safe_discount_percent}٪ است`,max_safe_percent:worst.max_safe_discount_percent,worst_item:worst.label};
  return {ok:true,max_safe_percent:worst.max_safe_discount_percent,policy};
}
async function validateTierWrite(request,env,id){
  let b;try{b=await request.clone().json()}catch{return null}
  if(id){
    const old=await env.DB.prepare('SELECT * FROM quantity_discount_rules WHERE id=?').bind(Number(id)).first();
    if(!old)return null;b={...old,...b};
  }
  if(b.is_active===false||b.is_active===0)return null;
  const percent=int(b.percent_off,1,70);if(percent===null)return null;
  return percentSafety(env,percent,clean(b.scope_type,20),clean(b.scope_value,120));
}
async function validateBundleWrite(request,env,id){
  let b;try{b=await request.clone().json()}catch{return null}
  if(id){
    const old=await env.DB.prepare('SELECT * FROM sales_bundles WHERE id=?').bind(Number(id)).first();
    if(!old)return null;
    if(!Array.isArray(b.items)){const {results=[]}=await env.DB.prepare('SELECT product_slug,quantity FROM sales_bundle_items WHERE bundle_id=?').bind(Number(id)).all();b.items=results}
    b={...old,...b};
  }
  if(b.is_active===false||b.is_active===0)return null;
  const percent=int(b.percent_off,1,50);if(percent===null||!Array.isArray(b.items))return null;
  let worst={ok:true,max_safe_percent:100};
  for(const x of b.items){
    const s=await percentSafety(env,percent,'product',clean(x.product_slug||x.slug,120));
    if(!s.ok)return s;
    if(s.max_safe_percent<worst.max_safe_percent)worst=s;
  }
  return worst;
}
async function enforceOrder(request,env){
  const r=await coreWorker.fetch(request,env);if(!r.ok)return r;
  const d=await r.json();if(!d.order_code)return json(d,r.status);
  const o=await env.DB.prepare(`SELECT id,subtotal_toman,discount_code,discount_toman,coupon_discount_toman,automatic_discount_toman,shipping_toman,tax_toman,grand_total_toman,payment_status,payable_amount_toman FROM orders WHERE order_code=? LIMIT 1`).bind(d.order_code).first();
  if(!o)return json(d,r.status);
  const g=await orderGuard(d.order_code,env);if(!g.enabled)return json(d,r.status);
  const requested=Math.max(0,Number(o.discount_toman)||0),cap=Math.max(0,Number(g.capacity_toman)||0),applied=Math.min(requested,cap),reduced=Math.max(0,requested-applied);
  let coupon=Math.max(0,Number(o.coupon_discount_toman)||0),auto=Math.max(0,Number(o.automatic_discount_toman)||0),discountCode=o.discount_code;
  if(reduced>0){
    if(auto>=coupon&&auto>0)auto=Math.min(auto,applied);
    else if(coupon>0)coupon=Math.min(coupon,applied);
    if(coupon===0&&requested>0&&auto===0&&discountCode){
      const disc=await env.DB.prepare('SELECT type FROM discounts WHERE code=? LIMIT 1').bind(discountCode).first();
      if(disc&&disc.type!=='free_shipping'){await env.DB.prepare('UPDATE discounts SET used_count=CASE WHEN used_count>0 THEN used_count-1 ELSE 0 END,updated_at=? WHERE code=?').bind(now(),discountCode).run();discountCode=null}
    }
  }
  const subtotal=Number(o.subtotal_toman)||0,shipping=Number(o.shipping_toman)||0;
  const {results:settings=[]}=await env.DB.prepare("SELECT key,value FROM store_settings WHERE key IN ('tax_enabled','tax_percent')").all(),sm=Object.fromEntries(settings.map(x=>[x.key,x.value]));
  const tax=sm.tax_enabled==='1'?Math.round(Math.max(0,subtotal-applied+shipping)*Math.max(0,Math.min(100,Number(sm.tax_percent)||0))/100):0;
  const grand=Math.max(0,subtotal-applied+shipping+tax),payable=o.payable_amount_toman==null?null:(o.payment_status==='paid'?o.payable_amount_toman:grand);
  await env.DB.prepare(`UPDATE orders SET discount_code=?,discount_toman=?,coupon_discount_toman=?,automatic_discount_toman=?,tax_toman=?,grand_total_toman=?,payable_amount_toman=?,margin_min_percent=?,margin_discount_cap_toman=?,margin_discount_reduced_toman=?,margin_guard_applied=? WHERE id=?`).bind(discountCode,applied,coupon,auto,tax,grand,payable,g.policy.min_margin_percent,cap,reduced,reduced>0?1:0,o.id).run();
  if(reduced>0)await env.DB.prepare(`INSERT OR IGNORE INTO margin_guard_events(order_id,requested_discount_toman,applied_discount_toman,discount_cap_toman,min_margin_percent,missing_cost_items,below_floor_items,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(o.id,requested,applied,cap,g.policy.min_margin_percent,g.missing_cost_items,g.below_floor_items,now()).run();
  return json({...d,discount_toman:applied,coupon_discount_toman:coupon,automatic_discount_toman:auto,tax_toman:tax,grand_total_toman:grand,margin_guard_applied:reduced>0},r.status);
}
async function overview(request,env){
  const denied=await adminGuard(request,env);if(denied)return denied;
  const policy=await readPolicy(env),{results:products=[]}=await env.DB.prepare(`SELECT id,slug,name,price_toman,cost_price_toman,is_active,status FROM products WHERE is_active=1 ORDER BY name`).all(),rows=[];
  for(const p of products){
    if(Number.isInteger(p.price_toman))rows.push({type:'product',id:p.slug,label:p.name,price_toman:p.price_toman,cost_price_toman:Number.isInteger(p.cost_price_toman)?p.cost_price_toman:null,...rowMetrics(p.price_toman,Number.isInteger(p.cost_price_toman)?p.cost_price_toman:null,policy.min_margin_percent)});
    const {results:vars=[]}=await env.DB.prepare(`SELECT id,title,price_toman,cost_price_toman,is_active FROM product_variants WHERE product_id=? AND is_active=1 ORDER BY sort_order,id`).bind(p.id).all();
    for(const v of vars){const price=Number.isInteger(v.price_toman)?v.price_toman:p.price_toman;if(!Number.isInteger(price))continue;const cost=Number.isInteger(v.cost_price_toman)?v.cost_price_toman:(Number.isInteger(p.cost_price_toman)?p.cost_price_toman:null);rows.push({type:'variant',id:Number(v.id),product_slug:p.slug,label:p.name+' — '+v.title,price_toman:price,cost_price_toman:Number.isInteger(cost)?cost:null,variant_cost_price_toman:Number.isInteger(v.cost_price_toman)?v.cost_price_toman:null,...rowMetrics(price,cost,policy.min_margin_percent)})}
  }
  return json({policy,summary:{rows:rows.length,missing_cost:rows.filter(x=>x.status==='missing_cost').length,below_floor:rows.filter(x=>x.status==='below_floor').length,safe:rows.filter(x=>x.status==='ok').length},rows});
}
async function settingsWrite(request,env){
  const denied=await adminGuard(request,env);if(denied)return denied;let b;try{b=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const margin=int(b.min_margin_percent,0,80);if(margin===null)return json({error:'حداقل حاشیه سود باید بین ۰ تا ۸۰ درصد باشد'},400);
  const enabled=b.enabled===false||b.enabled===0?0:1,t=now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO store_settings(key,value,updated_at) VALUES('margin_protection_enabled',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(String(enabled),t),
    env.DB.prepare(`INSERT INTO store_settings(key,value,updated_at) VALUES('min_gross_margin_percent',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(String(margin),t),
    env.DB.prepare(`INSERT INTO audit_log(action,entity_type,entity_id,details_json,created_at) VALUES('margin_policy_update','store_settings','margin_protection',?,?)`).bind(JSON.stringify({enabled:!!enabled,min_margin_percent:margin}),t)
  ]);
  return json({ok:true,enabled:!!enabled,min_margin_percent:margin});
}
async function costWrite(request,env){
  const denied=await adminGuard(request,env);if(denied)return denied;let b;try{b=await request.json()}catch{return json({error:'درخواست نامعتبر است'},400)}
  const type=clean(b.type,20),cost=b.cost_price_toman===null||b.cost_price_toman===''?null:int(b.cost_price_toman,0,999999999999),t=now();
  if(!['product','variant'].includes(type)||cost===null&&b.cost_price_toman!==null&&b.cost_price_toman!=='')return json({error:'قیمت خرید معتبر نیست'},400);
  if(type==='product'){
    const slug=clean(b.id,120);const p=await env.DB.prepare('SELECT id FROM products WHERE slug=? LIMIT 1').bind(slug).first();if(!p)return json({error:'محصول پیدا نشد'},404);
    await env.DB.batch([env.DB.prepare('UPDATE products SET cost_price_toman=?,updated_at=? WHERE slug=?').bind(cost,t,slug),env.DB.prepare(`INSERT INTO audit_log(action,entity_type,entity_id,details_json,created_at) VALUES('cost_price_update','product',?,?,?)`).bind(slug,JSON.stringify({cost_price_toman:cost}),t)]);
  }else{
    const id=int(b.id,1,2147483647);if(id===null)return json({error:'تنوع کالا معتبر نیست'},400);const v=await env.DB.prepare('SELECT id FROM product_variants WHERE id=? LIMIT 1').bind(id).first();if(!v)return json({error:'تنوع کالا پیدا نشد'},404);
    await env.DB.batch([env.DB.prepare('UPDATE product_variants SET cost_price_toman=?,updated_at=? WHERE id=?').bind(cost,t,id),env.DB.prepare(`INSERT INTO audit_log(action,entity_type,entity_id,details_json,created_at) VALUES('cost_price_update','variant',?,?,?)`).bind(String(id),JSON.stringify({cost_price_toman:cost}),t)]);
  }
  return json({ok:true});
}
async function health(request,env){
  const r=await coreWorker.fetch(request,env),d=await r.json().catch(()=>({ok:true}));return json({...d,margin_protection:'v1',margin_policy:'gross-margin-v1'});
}
export default{async fetch(request,env){
  const u=new URL(request.url);
  try{
    if(u.pathname==='/api/health'&&request.method==='GET')return health(request,env);
    if(u.pathname==='/api/admin/margin-protection'&&request.method==='GET')return overview(request,env);
    if(u.pathname==='/api/admin/margin-protection/settings'&&request.method==='PUT')return settingsWrite(request,env);
    if(u.pathname==='/api/admin/margin-protection/cost'&&request.method==='PUT')return costWrite(request,env);
    if(u.pathname==='/api/promotions/preview'&&request.method==='POST')return promotionPreview(request,env);
    if(u.pathname==='/api/discounts/validate'&&request.method==='POST')return discountPreview(request,env);
    if(u.pathname==='/api/orders'&&request.method==='POST')return enforceOrder(request,env);
    if(u.pathname==='/api/admin/promotions/tiers'&&request.method==='POST'){const s=await validateTierWrite(request,env);if(s&&!s.ok)return json(s,409);return coreWorker.fetch(request,env)}
    let m=u.pathname.match(/^\/api\/admin\/promotions\/tiers\/(\d+)$/);
    if(m&&request.method==='PUT'){const s=await validateTierWrite(request,env,m[1]);if(s&&!s.ok)return json(s,409);return coreWorker.fetch(request,env)}
    if(u.pathname==='/api/admin/promotions/bundles'&&request.method==='POST'){const s=await validateBundleWrite(request,env);if(s&&!s.ok)return json(s,409);return coreWorker.fetch(request,env)}
    m=u.pathname.match(/^\/api\/admin\/promotions\/bundles\/(\d+)$/);
    if(m&&request.method==='PUT'){const s=await validateBundleWrite(request,env,m[1]);if(s&&!s.ok)return json(s,409);return coreWorker.fetch(request,env)}
    return coreWorker.fetch(request,env);
  }catch(e){console.error(e);return u.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}
}};

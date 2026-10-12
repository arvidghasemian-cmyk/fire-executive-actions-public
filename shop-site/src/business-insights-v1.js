import coreWorker from './customer-runtime-v2.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,max=500)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const int=(v,min,max,def)=>{const x=Number(v);return Number.isInteger(x)&&x>=min&&x<=max?x:def};
const n=v=>Number(v)||0;
function sameOrigin(request){const o=request.headers.get('origin');return !o||o===new URL(request.url).origin}
function since(days){return new Date(Date.now()-days*86400000).toISOString()}
async function adminGuard(request,env){
 if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
 const probe=new URL('/api/admin/orders?limit=1',request.url),r=await coreWorker.fetch(new Request(probe,{method:'GET',headers:request.headers}),env);
 if(!r.ok)return json({error:'نیاز به ورود مدیریت'},401);
 return null;
}
const realOrder="COALESCE(o.notes,'')<>'VARIZA_PAYMENT_TEST'";
async function paidSummary(env,cutoff){
 const row=await env.DB.prepare(`SELECT COUNT(*) paid_orders,
   COALESCE(SUM(COALESCE(o.grand_total_toman,o.payable_amount_toman,0)),0) revenue_toman,
   COALESCE(SUM(CASE WHEN COALESCE(o.subtotal_toman,0)-COALESCE(o.discount_toman,0)>0 THEN COALESCE(o.subtotal_toman,0)-COALESCE(o.discount_toman,0) ELSE 0 END),0) merchandise_net_toman
   FROM orders o WHERE o.payment_status='paid' AND ${realOrder} AND COALESCE(o.payment_paid_at,o.updated_at,o.created_at)>=?`).bind(cutoff).first()||{};
 const {results:items=[]}=await env.DB.prepare(`SELECT oi.quantity,oi.unit_price_toman,p.cost_price_toman product_cost,v.cost_price_toman variant_cost
   FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id
   LEFT JOIN product_variants v ON v.id=oi.variant_id
   WHERE o.payment_status='paid' AND ${realOrder} AND COALESCE(o.payment_paid_at,o.updated_at,o.created_at)>=?`).bind(cutoff).all();
 let units=0,knownUnits=0,cogs=0;
 for(const x of items){const q=Math.max(0,n(x.quantity));units+=q;const cost=Number.isInteger(x.variant_cost)?x.variant_cost:(Number.isInteger(x.product_cost)?x.product_cost:null);if(Number.isInteger(cost)){knownUnits+=q;cogs+=cost*q}}
 const coverage=units?Math.round(knownUnits*1000/units)/10:100,paidOrders=n(row.paid_orders),revenue=n(row.revenue_toman),merch=n(row.merchandise_net_toman),complete=units===knownUnits;
 const grossProfit=complete?merch-cogs:null,grossMargin=complete&&merch>0?Math.round((grossProfit*1000)/merch)/10:(complete?0:null);
 return {paid_orders:paidOrders,revenue_toman:revenue,average_order_toman:paidOrders?Math.round(revenue/paidOrders):0,merchandise_net_toman:merch,cogs_toman:complete?cogs:null,gross_profit_toman:grossProfit,gross_margin_percent:grossMargin,cost_coverage_percent:coverage,sold_units:units,cost_known_units:knownUnits};
}
async function inventorySummary(env){
 const main=await env.DB.prepare(`SELECT
   COALESCE(SUM(CASE WHEN p.stock_qty>0 AND p.cost_price_toman IS NOT NULL THEN p.stock_qty*p.cost_price_toman ELSE 0 END),0) known_value,
   COALESCE(SUM(CASE WHEN p.stock_qty>0 THEN p.stock_qty ELSE 0 END),0) units,
   COALESCE(SUM(CASE WHEN p.stock_qty>0 AND p.cost_price_toman IS NOT NULL THEN p.stock_qty ELSE 0 END),0) known_units
   FROM products p WHERE p.is_active=1 AND p.track_inventory=1 AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1)`).first()||{};
 const vars=await env.DB.prepare(`SELECT
   COALESCE(SUM(CASE WHEN v.stock_qty>0 AND COALESCE(v.cost_price_toman,p.cost_price_toman) IS NOT NULL THEN v.stock_qty*COALESCE(v.cost_price_toman,p.cost_price_toman) ELSE 0 END),0) known_value,
   COALESCE(SUM(CASE WHEN v.stock_qty>0 THEN v.stock_qty ELSE 0 END),0) units,
   COALESCE(SUM(CASE WHEN v.stock_qty>0 AND COALESCE(v.cost_price_toman,p.cost_price_toman) IS NOT NULL THEN v.stock_qty ELSE 0 END),0) known_units
   FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.is_active=1 AND p.is_active=1 AND p.track_inventory=1`).first()||{};
 const units=n(main.units)+n(vars.units),known=n(main.known_units)+n(vars.known_units);
 return {known_cost_value_toman:n(main.known_value)+n(vars.known_value),stock_units:units,cost_known_units:known,cost_coverage_percent:units?Math.round(known*1000/units)/10:100};
}
async function lowStock(env){
 const {results:main=[]}=await env.DB.prepare(`SELECT p.slug,p.name,p.stock_qty,p.low_stock_threshold FROM products p
   WHERE p.is_active=1 AND p.track_inventory=1 AND p.stock_qty IS NOT NULL AND p.stock_qty<=p.low_stock_threshold
   AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1)
   ORDER BY p.stock_qty ASC,p.name LIMIT 12`).all();
 const {results:vars=[]}=await env.DB.prepare(`SELECT p.slug,p.name,v.title,v.stock_qty,p.low_stock_threshold FROM product_variants v JOIN products p ON p.id=v.product_id
   WHERE v.is_active=1 AND p.is_active=1 AND p.track_inventory=1 AND v.stock_qty IS NOT NULL AND v.stock_qty<=p.low_stock_threshold
   ORDER BY v.stock_qty ASC,p.name,v.sort_order LIMIT 12`).all();
 return [...main.map(x=>({slug:x.slug,label:x.name,stock_qty:n(x.stock_qty),threshold:n(x.low_stock_threshold),kind:'product'})),...vars.map(x=>({slug:x.slug,label:x.name+' — '+x.title,stock_qty:n(x.stock_qty),threshold:n(x.low_stock_threshold),kind:'variant'}))].sort((a,b)=>a.stock_qty-b.stock_qty||a.label.localeCompare(b.label,'fa')).slice(0,12);
}
async function slowMovers(env,cutoff){
 const {results:main=[]}=await env.DB.prepare(`SELECT p.slug,p.name,p.stock_qty,p.cost_price_toman,p.price_toman,
   (SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=p.id AND oi.variant_id IS NULL AND o.payment_status='paid' AND ${realOrder} AND COALESCE(o.payment_paid_at,o.updated_at,o.created_at)>=?) sold_recent,
   (SELECT MAX(COALESCE(o.payment_paid_at,o.updated_at,o.created_at)) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=p.id AND oi.variant_id IS NULL AND o.payment_status='paid' AND ${realOrder}) last_paid_sale
   FROM products p WHERE p.is_active=1 AND p.status='priced' AND p.stock_qty>0 AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1)`).bind(cutoff).all();
 const {results:vars=[]}=await env.DB.prepare(`SELECT p.slug,p.name,v.title,v.stock_qty,COALESCE(v.cost_price_toman,p.cost_price_toman) cost_price_toman,COALESCE(v.price_toman,p.price_toman) price_toman,
   (SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.variant_id=v.id AND o.payment_status='paid' AND ${realOrder} AND COALESCE(o.payment_paid_at,o.updated_at,o.created_at)>=?) sold_recent,
   (SELECT MAX(COALESCE(o.payment_paid_at,o.updated_at,o.created_at)) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.variant_id=v.id AND o.payment_status='paid' AND ${realOrder}) last_paid_sale
   FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.is_active=1 AND p.is_active=1 AND p.status='priced' AND v.stock_qty>0`).bind(cutoff).all();
 const rows=[...main.map(x=>({...x,label:x.name,kind:'product'})),...vars.map(x=>({...x,label:x.name+' — '+x.title,kind:'variant'}))]
   .filter(x=>n(x.sold_recent)===0).map(x=>({slug:x.slug,label:x.label,kind:x.kind,stock_qty:n(x.stock_qty),last_paid_sale:x.last_paid_sale||null,inventory_cost_toman:Number.isInteger(x.cost_price_toman)?n(x.stock_qty)*x.cost_price_toman:null,price_toman:Number.isInteger(x.price_toman)?x.price_toman:null}));
 rows.sort((a,b)=>(b.inventory_cost_toman??-1)-(a.inventory_cost_toman??-1)||b.stock_qty-a.stock_qty||a.label.localeCompare(b.label,'fa'));
 return rows.slice(0,12);
}
function maskPhone(v){const s=clean(v,30);return s.length>=7?s.slice(0,4)+'***'+s.slice(-4):s}
async function repeatCustomers(env,cutoff){
 const {results=[]}=await env.DB.prepare(`SELECT o.phone,MAX(o.customer_name) customer_name,COUNT(*) order_count,COALESCE(SUM(COALESCE(o.grand_total_toman,o.payable_amount_toman,0)),0) spent_toman
   FROM orders o WHERE o.payment_status='paid' AND ${realOrder} AND o.phone<>'' AND COALESCE(o.payment_paid_at,o.updated_at,o.created_at)>=? GROUP BY o.phone HAVING COUNT(*)>=2 ORDER BY spent_toman DESC,order_count DESC LIMIT 10`).bind(cutoff).all();
 return results.map(x=>({customer_name:x.customer_name||'مشتری',phone_masked:maskPhone(x.phone),order_count:n(x.order_count),spent_toman:n(x.spent_toman)}));
}
async function costGaps(env){
 const {results:main=[]}=await env.DB.prepare(`SELECT p.slug,p.name,p.sku,p.stock_qty,p.price_toman FROM products p
   WHERE p.is_active=1 AND p.status='priced' AND p.cost_price_toman IS NULL
   AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1)
   ORDER BY COALESCE(p.stock_qty,0) DESC,p.name LIMIT 100`).all();
 const {results:vars=[]}=await env.DB.prepare(`SELECT p.slug,p.name,v.title,v.sku,v.stock_qty,COALESCE(v.price_toman,p.price_toman) price_toman FROM product_variants v JOIN products p ON p.id=v.product_id
   WHERE p.is_active=1 AND p.status='priced' AND v.is_active=1 AND v.cost_price_toman IS NULL AND p.cost_price_toman IS NULL
   ORDER BY COALESCE(v.stock_qty,0) DESC,p.name,v.sort_order LIMIT 100`).all();
 return [...main.map(x=>({slug:x.slug,label:x.name,sku:x.sku||'',kind:'product',stock_qty:x.stock_qty==null?null:n(x.stock_qty),price_toman:Number.isInteger(x.price_toman)?x.price_toman:null})),...vars.map(x=>({slug:x.slug,label:x.name+' — '+x.title,sku:x.sku||'',kind:'variant',stock_qty:x.stock_qty==null?null:n(x.stock_qty),price_toman:Number.isInteger(x.price_toman)?x.price_toman:null}))].sort((a,b)=>(b.stock_qty??-1)-(a.stock_qty??-1)||a.label.localeCompare(b.label,'fa')).slice(0,100);
}
async function insights(request,env){
 const guard=await adminGuard(request,env);if(guard)return guard;
 const url=new URL(request.url),days=int(url.searchParams.get('days'),7,365,30),slowDays=int(url.searchParams.get('slow_days'),30,365,60);
 const [sales,inventory,low,slow,repeat,gaps]=await Promise.all([paidSummary(env,since(days)),inventorySummary(env),lowStock(env),slowMovers(env,since(slowDays)),repeatCustomers(env,since(90)),costGaps(env)]);
 return json({period_days:days,slow_days:slowDays,sales,inventory,low_stock:low,slow_movers:slow,repeat_customers_90d:repeat,cost_gaps:gaps,generated_at:new Date().toISOString()});
}
function csvCell(v){let s=String(v??'').replace(/[\r\n]+/g,' ').trim();if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function csvResponse(rows,filename){return new Response('\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="${filename}"`,'cache-control':'no-store','x-content-type-options':'nosniff'}})}
async function inventoryExport(env){
 const {results:main=[]}=await env.DB.prepare(`SELECT p.slug,p.name,p.sku,p.stock_qty,p.price_toman,p.cost_price_toman FROM products p WHERE p.is_active=1 AND p.track_inventory=1 AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1) ORDER BY p.name`).all();
 const {results:vars=[]}=await env.DB.prepare(`SELECT p.slug,p.name,v.title,v.sku,v.stock_qty,COALESCE(v.price_toman,p.price_toman) price_toman,COALESCE(v.cost_price_toman,p.cost_price_toman) cost_price_toman FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.is_active=1 AND p.track_inventory=1 AND v.is_active=1 ORDER BY p.name,v.sort_order,v.id`).all();
 const rows=[['نوع','نام کالا','SKU','موجودی','قیمت فروش (تومان)','قیمت خرید (تومان)','وضعیت قیمت خرید','slug']];
 for(const x of main)rows.push(['محصول',x.name,x.sku||'',x.stock_qty??'',x.price_toman??'',x.cost_price_toman??'',Number.isInteger(x.cost_price_toman)?'ثبت شده':'ناقص',x.slug]);
 for(const x of vars)rows.push(['تنوع',x.name+' — '+x.title,x.sku||'',x.stock_qty??'',x.price_toman??'',x.cost_price_toman??'',Number.isInteger(x.cost_price_toman)?'ثبت شده':'ناقص',x.slug]);
 return rows;
}
async function salesExport(env,days){
 const cutoff=since(days),{results=[]}=await env.DB.prepare(`SELECT o.order_code,o.customer_name,o.phone,o.payment_paid_at,o.status,COALESCE(o.grand_total_toman,o.payable_amount_toman,0) total_toman,o.discount_toman,o.shipping_toman,o.tax_toman FROM orders o WHERE o.payment_status='paid' AND ${realOrder} AND COALESCE(o.payment_paid_at,o.updated_at,o.created_at)>=? ORDER BY COALESCE(o.payment_paid_at,o.updated_at,o.created_at) DESC,o.id DESC LIMIT 5000`).bind(cutoff).all();
 return [['کد سفارش','تاریخ پرداخت','مشتری','موبایل ماسک‌شده','وضعیت','مبلغ نهایی (تومان)','تخفیف','ارسال','مالیات'],...results.map(x=>[x.order_code,x.payment_paid_at||'',x.customer_name||'',maskPhone(x.phone),x.status||'',x.total_toman??0,x.discount_toman??0,x.shipping_toman??0,x.tax_toman??0])];
}
async function exportCsv(request,env,type){
 const guard=await adminGuard(request,env);if(guard)return guard;
 if(type==='inventory')return csvResponse(await inventoryExport(env),'soroush-inventory.csv');
 if(type==='sales'){const days=int(new URL(request.url).searchParams.get('days'),7,365,30);return csvResponse(await salesExport(env,days),`soroush-paid-sales-${days}d.csv`)}
 return json({error:'نوع خروجی معتبر نیست'},404);
}
export default{async fetch(request,env){const url=new URL(request.url);try{
 if(url.pathname==='/api/admin/business-insights'&&request.method==='GET')return insights(request,env);
 const exp=url.pathname.match(/^\/api\/admin\/business-insights\/export\/(inventory|sales)\.csv$/);if(exp&&request.method==='GET')return exportCsv(request,env,exp[1]);
 if(url.pathname==='/api/health'&&request.method==='GET'){const r=await coreWorker.fetch(request,env),d=await r.json();return json({...d,business_insights:'v2'})}
 return coreWorker.fetch(request,env);
}catch(e){console.error(e);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}}};

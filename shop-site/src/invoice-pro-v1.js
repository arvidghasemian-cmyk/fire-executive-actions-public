import coreWorker from './admin-rbac-v1.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v==null?'استعلامی':new Intl.NumberFormat('fa-IR').format(Number(v)||0)+' تومان';
const qty=v=>new Intl.NumberFormat('fa-IR').format(Number(v)||0);
const orderLabels={new:'جدید',contacted:'تماس گرفته شد',quoted:'قیمت اعلام شد',confirmed:'تأییدشده',ready_to_ship:'آماده ارسال',shipped:'ارسال‌شده',closed:'بسته‌شده',cancelled:'لغوشده'};
const paymentLabels={not_ready:'در انتظار تعیین مبلغ',ready:'آماده پرداخت',requested:'لینک پرداخت صادرشده',paid:'پرداخت‌شده',failed:'ناموفق'};
function dateFa(v){if(!v)return '—';try{return new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return esc(v)}}
async function settings(env){const {results=[]}=await env.DB.prepare("SELECT key,value FROM store_settings WHERE key IN ('store_name','phone','address','whatsapp')").all();return Object.fromEntries(results.map(x=>[x.key,x.value]))}
function htmlPage(o,s){
 const paid=o.payment_status==='paid';
 const ref=(o.payments||[]).find(x=>x.reference)?.reference||'';
 const rows=(o.items||[]).map((i,n)=>{
  const variant=[i.variant_title,i.variant_sku?`SKU: ${i.variant_sku}`:''].filter(Boolean).join(' — ');
  const unit=i.unit_price_toman;
  return `<tr><td>${qty(n+1)}</td><td><strong>${esc(i.product_name)}</strong>${variant?`<small>${esc(variant)}</small>`:''}</td><td>${qty(i.quantity)}</td><td>${money(unit)}</td><td>${money(unit==null?null:Number(unit)*Number(i.quantity||0))}</td></tr>`;
 }).join('');
 const address=[o.province,o.city,o.address].filter(Boolean).map(esc).join('، ');
 const seller=[s.phone,s.address].filter(Boolean).map(esc).join(' — ');
 const discountTitle=o.discount_code?`تخفیف (${esc(o.discount_code)})`:'تخفیف';
 const paidAt=o.payment_paid_at?`<div><span>زمان پرداخت</span><b>${dateFa(o.payment_paid_at)}</b></div>`:'';
 const refRow=ref?`<div><span>شناسه پرداخت</span><b dir="ltr">${esc(ref)}</b></div>`:'';
 return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>صورتحساب ${esc(o.order_code)}</title><style>
 @page{size:A4;margin:11mm}*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#17202a;font-family:Tahoma,Arial,sans-serif;line-height:1.7}.sheet{width:210mm;min-height:277mm;margin:18px auto;background:#fff;padding:13mm;box-shadow:0 4px 24px #0002}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #b4161d;padding-bottom:13px}.brand h1{font-size:25px;margin:0;color:#a80f18}.brand p{margin:4px 0 0;font-size:11px;color:#667085}.doc{text-align:left}.doc h2{margin:0;font-size:20px}.doc b{font-size:12px}.status{display:inline-block;margin-top:7px;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;background:${paid?'#e8f8ef':'#fff3e8'};color:${paid?'#087443':'#a34b00'}}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.box{border:1px solid #d8dde6;border-radius:11px;padding:11px;font-size:11px}.box h3{font-size:11px;margin:0 0 6px;color:#667085}.box p{margin:2px 0}.finance{margin-top:14px;margin-right:auto;width:min(380px,100%);border:1px solid #d8dde6;border-radius:11px;padding:10px 14px}.finance div{display:flex;justify-content:space-between;gap:15px;padding:4px 0;font-size:11px}.finance .grand{margin-top:5px;padding-top:8px;border-top:2px solid #b4161d;font-size:14px;color:#a80f18}.payment{margin-top:12px;border-radius:11px;background:#f8fafc;padding:10px 14px}.payment div{display:flex;justify-content:space-between;gap:15px;font-size:10px;padding:2px 0}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:10.5px}th{background:#f2f4f7}th,td{border:1px solid #d8dde6;padding:8px;text-align:right;vertical-align:top}td:first-child,th:first-child{text-align:center;width:36px}td:nth-child(3),th:nth-child(3){text-align:center;width:60px}small{display:block;color:#667085;margin-top:2px}.notice{margin-top:22px;border-top:1px dashed #aab2bf;padding-top:12px;font-size:9.5px;color:#667085}.actions{width:210mm;margin:12px auto;display:flex;justify-content:flex-end;gap:8px}.actions button{border:0;border-radius:9px;padding:10px 18px;background:#a80f18;color:#fff;font:inherit;font-weight:700;cursor:pointer}.actions button.secondary{background:#475467}@media(max-width:760px){.sheet{width:100%;min-height:0;margin:0;padding:16px;box-shadow:none}.top{display:block}.doc{text-align:right;margin-top:12px}.meta{grid-template-columns:1fr}.actions{width:100%;padding:0 12px}}@media print{body{background:#fff}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.actions{display:none}a{color:inherit;text-decoration:none}}
 </style></head><body><div class="actions"><button class="secondary" onclick="history.back()">بازگشت</button><button onclick="window.print()">چاپ / ذخیره PDF</button></div><main class="sheet"><section class="top"><div class="brand"><h1>${esc(s.store_name||'سروش ایمنی شهر')}</h1><p>${seller||'فروش تخصصی تجهیزات ایمنی و آتش‌نشانی'}</p></div><div class="doc"><h2>صورتحساب فروش</h2><b>شماره سفارش: ${esc(o.order_code)}</b><br><b>تاریخ ثبت: ${dateFa(o.created_at)}</b><br><span class="status">${esc(orderLabels[o.status]||o.status||'—')} · ${esc(paymentLabels[o.payment_status]||o.payment_status||'—')}</span></div></section><section class="meta"><div class="box"><h3>خریدار</h3><p><strong>${esc(o.customer_name||'—')}</strong>${o.company?` — ${esc(o.company)}`:''}</p><p dir="ltr" style="text-align:right">${esc(o.phone||'—')}</p><p>${address||'—'}${o.postal_code?` — کدپستی ${esc(o.postal_code)}`:''}</p></div><div class="box"><h3>فروشنده</h3><p><strong>${esc(s.store_name||'سروش ایمنی شهر')}</strong></p><p>${esc(s.phone||'—')}</p><p>${esc(s.address||'—')}</p></div></section><table><thead><tr><th>ردیف</th><th>شرح کالا</th><th>تعداد</th><th>قیمت واحد</th><th>مبلغ</th></tr></thead><tbody>${rows||'<tr><td colspan="5">قلمی ثبت نشده است.</td></tr>'}</tbody></table><section class="finance"><div><span>جمع کالاها</span><b>${money(o.subtotal_toman)}</b></div><div><span>${discountTitle}</span><b>${Number(o.discount_toman||0)>0?'− ':''}${money(o.discount_toman||0)}</b></div><div><span>هزینه ارسال</span><b>${money(o.shipping_toman||0)}</b></div><div><span>مالیات</span><b>${money(o.tax_toman||0)}</b></div><div class="grand"><span>جمع نهایی</span><b>${money(o.grand_total_toman)}</b></div>${o.payable_amount_toman!=null&&o.payable_amount_toman!==o.grand_total_toman?`<div><span>مبلغ قابل پرداخت</span><b>${money(o.payable_amount_toman)}</b></div>`:''}</section><section class="payment"><div><span>وضعیت پرداخت</span><b>${esc(paymentLabels[o.payment_status]||o.payment_status||'—')}</b></div>${paidAt}${refRow}</section><p class="notice">این سند، صورتحساب فروشگاه و خلاصه اطلاعات ثبت‌شده سفارش است. در صورت نیاز به صورتحساب رسمی/مالیاتی، مدارک قانونی مربوط باید جداگانه مطابق مقررات صادر شود.</p></main></body></html>`;
}
async function invoice(request,env,id){
 const detailRequest=new Request(new URL(`/api/admin/manage/orders/${id}`,request.url),{method:'GET',headers:request.headers});
 const detailResponse=await coreWorker.fetch(detailRequest,env);
 if(!detailResponse.ok)return detailResponse;
 const data=await detailResponse.json();
 const o=data?.order;
 if(!o)return new Response(JSON.stringify({error:'سفارش پیدا نشد'}),{status:404,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
 const s=await settings(env);
 return new Response(htmlPage(o,s),{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
}
export default{async fetch(request,env){
 const url=new URL(request.url),m=url.pathname.match(/^\/api\/admin\/manage\/orders\/(\d+)\/invoice$/);
 if(m&&request.method==='GET')return invoice(request,env,m[1]);
 return coreWorker.fetch(request,env);
}};

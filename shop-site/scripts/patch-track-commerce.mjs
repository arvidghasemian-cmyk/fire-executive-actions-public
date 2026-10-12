import fs from 'node:fs';
const path='shop-site/public/track/index.html';
let s=fs.readFileSync(path,'utf8');
if(!s.includes('.commerce-order{'))s=s.replace('</style>','.commerce-order{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}.commerce-order h3{font-size:12px;margin:0 0 8px}.finance-row{display:flex;justify-content:space-between;gap:10px;font-size:10px;padding:4px 0}.finance-row.grand{font-size:12px;font-weight:800;color:var(--r);border-top:1px dashed var(--line);margin-top:5px;padding-top:8px}.tracking-box{margin-top:9px;padding:10px;border-radius:11px;background:#f8fafc;font-size:10px;line-height:1.9}.return-box{margin-top:10px}.return-box textarea{width:100%;min-height:70px;border:1px solid var(--line);border-radius:10px;padding:9px;font:inherit;resize:vertical}.return-box button{width:100%;margin-top:7px}.receipt-box{margin-top:10px}.receipt-box button{width:100%;background:#344054}</style>');
else if(!s.includes('.receipt-box{'))s=s.replace('</style>','.receipt-box{margin-top:10px}.receipt-box button{width:100%;background:#344054}</style>');
const marker='async function startPayment(){';
const helper=`function commerceOrderHtml(d){const f=d.financials||{},u=d.fulfillment||{};let h='<div class="commerce-order"><h3>جمع‌بندی و ارسال</h3>';if(Number.isInteger(f.subtotal_toman)){h+='<div class="finance-row"><span>جمع کالاها</span><b>'+money(f.subtotal_toman)+'</b></div>';if(Number(f.discount_toman)>0)h+='<div class="finance-row"><span>تخفیف'+(f.discount_code?' ('+esc(f.discount_code)+')':'')+'</span><b>− '+money(f.discount_toman)+'</b></div>';h+='<div class="finance-row"><span>هزینه ارسال</span><b>'+money(f.shipping_toman||0)+'</b></div>';if(Number(f.tax_toman)>0)h+='<div class="finance-row"><span>مالیات</span><b>'+money(f.tax_toman)+'</b></div>';if(Number.isInteger(f.grand_total_toman))h+='<div class="finance-row grand"><span>جمع نهایی</span><b>'+money(f.grand_total_toman)+'</b></div>'}else h+='<div class="pay-muted">مبلغ نهایی پس از استعلام و تأیید فروشگاه مشخص می‌شود.</div>';if(u.tracking_number||u.tracking_url){h+='<div class="tracking-box"><b>رهگیری ارسال</b><br>'+(u.tracking_number?'کد رهگیری: '+esc(u.tracking_number)+'<br>':'')+(u.tracking_url?'<a href="'+esc(u.tracking_url)+'" target="_blank" rel="noopener">مشاهده وضعیت مرسوله</a>':'')+'</div>'}h+='<div class="receipt-box"><button type="button" id="orderReceipt">دریافت رسید / PDF</button></div>';if(!['cancelled'].includes(d.status)){h+='<div class="return-box"><textarea id="returnReason" placeholder="اگر نیاز به مرجوعی دارید، دلیل را بنویسید."></textarea><button type="button" id="returnRequest">ثبت درخواست مرجوعی</button><div id="returnMsg"></div></div>'}return h+'</div>'}
function openReceipt(){if(!lastLookup)return;const f=document.createElement('form');f.method='POST';f.action='/api/order-receipt';f.target='_blank';f.style.display='none';for(const [name,value] of Object.entries({code:lastLookup.code,phone:lastLookup.phone})){const i=document.createElement('input');i.type='hidden';i.name=name;i.value=value;f.appendChild(i)}document.body.appendChild(f);f.submit();f.remove()}
async function submitReturn(){if(!lastLookup)return;const reason=document.getElementById('returnReason')?.value.trim(),msg=document.getElementById('returnMsg');if(!reason||reason.length<5){if(msg)msg.innerHTML='<div class="notice">دلیل مرجوعی را کامل‌تر بنویسید.</div>';return}try{const r=await fetch('/api/returns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({order_code:lastLookup.code,phone:lastLookup.phone,reason})}),d=await r.json();if(!r.ok)throw new Error(d.error||'ثبت درخواست انجام نشد');msg.innerHTML='<div class="notice ok">درخواست مرجوعی ثبت شد و توسط فروشگاه بررسی می‌شود.</div>';document.getElementById('returnRequest').disabled=true}catch(e){msg.innerHTML='<div class="notice">'+esc(e.message)+'</div>'}}
`;
if(!s.includes('function commerceOrderHtml(d)')){
  if(!s.includes(marker))throw new Error('track start payment marker not found');
  s=s.replace(marker,helper+marker);
}else{
  if(!s.includes("id=\"orderReceipt\"")){
    const returnStart="if(!['cancelled'].includes(d.status)){h+='<div class=\"return-box\">";
    if(!s.includes(returnStart))throw new Error('receipt insertion marker not found');
    s=s.replace(returnStart,"h+='<div class=\"receipt-box\"><button type=\"button\" id=\"orderReceipt\">دریافت رسید / PDF</button></div>';"+returnStart);
  }
  if(!s.includes('function openReceipt()')){
    if(!s.includes('async function submitReturn(){'))throw new Error('receipt helper marker not found');
    s=s.replace('async function submitReturn(){',"function openReceipt(){if(!lastLookup)return;const f=document.createElement('form');f.method='POST';f.action='/api/order-receipt';f.target='_blank';f.style.display='none';for(const [name,value] of Object.entries({code:lastLookup.code,phone:lastLookup.phone})){const i=document.createElement('input');i.type='hidden';i.name=name;i.value=value;f.appendChild(i)}document.body.appendChild(f);f.submit();f.remove()}\nasync function submitReturn(){");
  }
}
const old='${paymentHtml(d,cfg)}<div class="timeline">';
const neu='${paymentHtml(d,cfg)}${commerceOrderHtml(d)}<div class="timeline">';
if(s.includes(old))s=s.replace(old,neu);
else if(!s.includes('${commerceOrderHtml(d)}'))throw new Error('track render marker not found');
const bind="const pay=document.getElementById('payNow');if(pay)pay.onclick=startPayment;const ret=document.getElementById('returnRequest');if(ret)ret.onclick=submitReturn";
const bindNew="const pay=document.getElementById('payNow');if(pay)pay.onclick=startPayment;const receipt=document.getElementById('orderReceipt');if(receipt)receipt.onclick=openReceipt;const ret=document.getElementById('returnRequest');if(ret)ret.onclick=submitReturn";
if(s.includes(bind))s=s.replace(bind,bindNew);
else if(!s.includes('receipt.onclick=openReceipt')){
  const legacy="const pay=document.getElementById('payNow');if(pay)pay.onclick=startPayment";
  if(s.includes(legacy))s=s.replace(legacy,legacy+";const receipt=document.getElementById('orderReceipt');if(receipt)receipt.onclick=openReceipt");
  else throw new Error('receipt bind marker not found');
}
fs.writeFileSync(path,s);
console.log('tracking commerce patch applied');

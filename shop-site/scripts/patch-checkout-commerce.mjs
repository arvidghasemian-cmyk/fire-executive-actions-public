import fs from 'node:fs';
const path='shop-site/public/index.html';
let s=fs.readFileSync(path,'utf8');
const css=`<style id="checkout-commerce-v1">
.checkout-commerce{margin:12px 0;border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#f9fafb}.checkout-commerce-title{font-size:12px;font-weight:900;margin-bottom:8px}.checkout-commerce-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.checkout-commerce-field{display:grid;gap:5px}.checkout-commerce-field label{font-size:10px;font-weight:800;color:#475467}.checkout-commerce-field input,.checkout-commerce-field select{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#fff;width:100%}.checkout-discount-row{display:grid;grid-template-columns:1fr auto;gap:7px}.checkout-discount-row button{border:0;border-radius:10px;padding:9px 12px;background:#111827;color:#fff;font-weight:800}.checkout-financial-summary{margin-top:9px;padding-top:8px;border-top:1px dashed #d0d5dd;font-size:10px;line-height:2;color:#475467}.checkout-financial-summary div{display:flex;justify-content:space-between;gap:12px}.checkout-financial-summary .grand{font-size:12px;font-weight:900;color:#a60f18}.checkout-commerce-msg{font-size:9px;margin-top:6px;color:#667085}.checkout-commerce-msg.ok{color:#067647}.checkout-commerce-msg.bad{color:#b42318}@media(max-width:560px){.checkout-commerce-grid{grid-template-columns:1fr}}
</style>`;
if(!s.includes('id="checkout-commerce-v1"'))s=s.replace('</head>',css+'\n</head>');
const paymentTitle='<div class="checkout-final-title">روش پرداخت</div>';
const block=`<div class="checkout-commerce" id="checkoutCommerceBlock">
  <div class="checkout-commerce-title">تخفیف و ارسال</div>
  <div class="checkout-commerce-grid">
    <div class="checkout-commerce-field"><label for="checkoutShippingMethod">روش ارسال</label><select id="checkoutShippingMethod"><option value="manual">هماهنگی با فروشگاه</option></select></div>
    <div class="checkout-commerce-field"><label for="checkoutDiscountCode">کد تخفیف</label><div class="checkout-discount-row"><input id="checkoutDiscountCode" autocomplete="off"><button type="button" id="checkoutApplyDiscount">اعمال</button></div></div>
  </div>
  <div id="checkoutCommerceMsg" class="checkout-commerce-msg"></div>
  <div id="checkoutFinancialSummary" class="checkout-financial-summary"></div>
</div>`;
if(!s.includes('id="checkoutCommerceBlock"')){
  if(!s.includes(paymentTitle))throw new Error('checkout payment title not found');
  s=s.replace(paymentTitle,block+'\n  '+paymentTitle);
}
const oldPayload="items,terms:{accepted:true,version:'2026-10-02-v1'},payment_method:'manual_confirmation'};";
const newPayload="items,terms:{accepted:true,version:'2026-10-02-v1'},payment_method:'manual_confirmation',discount_code:document.getElementById('checkoutDiscountCode')?.value.trim()||'',shipping_method:document.getElementById('checkoutShippingMethod')?.value||'manual'};";
if(s.includes(oldPayload))s=s.replace(oldPayload,newPayload);
else if(!s.includes("discount_code:document.getElementById('checkoutDiscountCode')"))throw new Error('checkout commerce payload marker not found');
const script=`<script id="checkout-commerce-v1-js">(()=>{
  const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0),money=n=>fa(n)+' تومان';
  let discountAmount=0,discountFreeShipping=false,shippingMethods=[];
  function subtotal(){try{const e=cartEntries();if(!e.length||e.some(x=>!Number.isFinite(x.product.price)))return null;return e.reduce((s,x)=>s+Number(x.product.price)*x.qty,0)}catch{return null}}
  function selectedShipping(sub){const code=document.getElementById('checkoutShippingMethod')?.value||'manual',m=shippingMethods.find(x=>x.code===code);if(!m||sub==null)return 0;let v=Number(m.price_toman)||0;if(Number.isInteger(m.free_over_toman)&&sub>=m.free_over_toman)v=0;if(discountFreeShipping)v=0;return v}
  function renderSummary(){const box=document.getElementById('checkoutFinancialSummary');if(!box)return;const sub=subtotal();if(sub==null){box.innerHTML='<div><span>جمع کالاها</span><b>پس از استعلام قیمت</b></div>';return}const ship=selectedShipping(sub),grand=Math.max(0,sub-discountAmount+ship);box.innerHTML='<div><span>جمع کالاها</span><b>'+money(sub)+'</b></div>'+(discountAmount?'<div><span>تخفیف</span><b>− '+money(discountAmount)+'</b></div>':'')+'<div><span>ارسال</span><b>'+(ship?money(ship):'۰ / طبق هماهنگی')+'</b></div><div class="grand"><span>جمع برآوردی</span><b>'+money(grand)+'</b></div>'}
  async function loadShipping(){const sel=document.getElementById('checkoutShippingMethod'),msg=document.getElementById('checkoutCommerceMsg');if(!sel)return;try{const province=document.getElementById('customerProvince')?.value.trim()||'',r=await fetch('/api/shipping-methods?province='+encodeURIComponent(province),{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'خطا');shippingMethods=d.methods||[];sel.innerHTML=shippingMethods.map(x=>'<option value="'+String(x.code).replace(/"/g,'')+'">'+x.title+(Number(x.price_toman)>0?' — '+money(x.price_toman):'')+'</option>').join('')||'<option value="manual">هماهنگی با فروشگاه</option>';msg.textContent='';renderSummary()}catch(e){msg.className='checkout-commerce-msg bad';msg.textContent='روش‌های ارسال دریافت نشد؛ هماهنگی با فروشگاه انتخاب شد.';renderSummary()}}
  async function applyDiscount(){const input=document.getElementById('checkoutDiscountCode'),msg=document.getElementById('checkoutCommerceMsg'),sub=subtotal();discountAmount=0;discountFreeShipping=false;if(!input?.value.trim()){msg.textContent='';renderSummary();return}if(sub==null){msg.className='checkout-commerce-msg';msg.textContent='برای کالاهای استعلامی، تخفیف پس از قطعی‌شدن قیمت بررسی می‌شود.';return}try{const r=await fetch('/api/discounts/validate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:input.value.trim(),subtotal_toman:sub})}),d=await r.json();if(!r.ok)throw new Error(d.error||'کد تخفیف معتبر نیست');discountAmount=Number(d.discount_toman)||0;discountFreeShipping=!!d.free_shipping;msg.className='checkout-commerce-msg ok';msg.textContent=d.free_shipping?'ارسال رایگان اعمال شد.':'تخفیف '+money(discountAmount)+' اعمال شد.';renderSummary()}catch(e){msg.className='checkout-commerce-msg bad';msg.textContent=e.message;renderSummary()}}
  window.refreshCommerceCheckout=()=>{discountAmount=0;discountFreeShipping=false;const msg=document.getElementById('checkoutCommerceMsg');if(msg){msg.className='checkout-commerce-msg';msg.textContent=''}loadShipping();renderSummary()};
  document.addEventListener('click',e=>{if(e.target?.id==='checkoutBtn')setTimeout(window.refreshCommerceCheckout,0);if(e.target?.id==='checkoutApplyDiscount')applyDiscount()});
  document.addEventListener('change',e=>{if(e.target?.id==='checkoutShippingMethod')renderSummary();if(e.target?.id==='customerProvince')loadShipping()});
})();</script>`;
if(!s.includes('id="checkout-commerce-v1-js"'))s=s.replace('</body>',script+'\n</body>');
if(!s.includes('id="checkoutCommerceBlock"')||!s.includes("shipping_method:document.getElementById('checkoutShippingMethod')"))throw new Error('checkout commerce patch failed');
fs.writeFileSync(path,s);
console.log('checkout commerce patch applied');

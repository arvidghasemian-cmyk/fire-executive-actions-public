import fs from 'node:fs';
const home='shop-site/public/index.html';let s=fs.readFileSync(home,'utf8');
if(!s.includes('sales-growth-checkout-v1')){
 const decl="let discountAmount=0,discountFreeShipping=false,shippingMethods=[];";
 if(!s.includes(decl))throw new Error('sales growth checkout declaration marker not found');
 s=s.replace(decl,"let discountAmount=0,discountFreeShipping=false,shippingMethods=[],automaticDiscountAmount=0,automaticDiscountLabel='';");
 const start=s.indexOf('  function renderSummary(){'),end=s.indexOf('  async function loadShipping()',start);if(start<0||end<0)throw new Error('sales growth renderSummary markers not found');
 const replacement=`  function renderSummary(){const box=document.getElementById('checkoutFinancialSummary');if(!box)return;const sub=subtotal();if(sub==null){box.innerHTML='<div><span>جمع کالاها</span><b>پس از استعلام قیمت</b></div>';return}const ship=selectedShipping(sub),effective=Math.max(discountAmount,automaticDiscountAmount),grand=Math.max(0,sub-effective+ship),autoWins=automaticDiscountAmount>discountAmount;box.innerHTML='<div><span>جمع کالاها</span><b>'+money(sub)+'</b></div>'+(effective?'<div><span>'+(autoWins?'تخفیف خودکار':'کد تخفیف')+'</span><b>− '+money(effective)+'</b></div>':'')+'<div><span>ارسال</span><b>'+(ship?money(ship):'۰ / طبق هماهنگی')+'</b></div><div class="grand"><span>جمع برآوردی</span><b>'+money(grand)+'</b></div>'}
  async function refreshPromotions(){const msg=document.getElementById('checkoutPromotionMsg');automaticDiscountAmount=0;automaticDiscountLabel='';let items=[];try{items=cartEntries().map(x=>({slug:x.product.slug,quantity:x.qty,...(x.variant?{variant_id:x.variant.id}:{})}))}catch{}if(!items.length){if(msg)msg.textContent='';renderSummary();return}try{const r=await fetch('/api/promotions/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items})}),d=await r.json();if(!r.ok)throw new Error(d.error||'خطا');automaticDiscountAmount=Number(d.discount_toman)||0;automaticDiscountLabel=d.label||'';if(msg)msg.textContent=automaticDiscountAmount?(automaticDiscountLabel+' — '+money(automaticDiscountAmount)+'؛ از تخفیف خودکار و کد مبلغی، گزینه بهتر اعمال می‌شود.'):'در حال حاضر تخفیف خودکار واجد شرایط نیست.'}catch(e){if(msg)msg.textContent='محاسبه پیشنهاد خودکار انجام نشد.'}renderSummary()}
`;
 s=s.slice(0,start)+replacement+s.slice(end);
 const refresh="window.refreshCommerceCheckout=()=>{discountAmount=0;discountFreeShipping=false;const msg=document.getElementById('checkoutCommerceMsg');if(msg){msg.className='checkout-commerce-msg';msg.textContent=''}loadShipping();renderSummary()};";
 if(!s.includes(refresh))throw new Error('sales growth refresh marker not found');
 s=s.replace(refresh,"window.refreshCommerceCheckout=()=>{discountAmount=0;discountFreeShipping=false;automaticDiscountAmount=0;automaticDiscountLabel='';const msg=document.getElementById('checkoutCommerceMsg');if(msg){msg.className='checkout-commerce-msg';msg.textContent=''}loadShipping();refreshPromotions();renderSummary()};");
 s=s.replace('<div id="checkoutCommerceMsg" class="checkout-commerce-msg"></div>','<div id="checkoutCommerceMsg" class="checkout-commerce-msg"></div><div id="checkoutPromotionMsg" class="checkout-commerce-msg"></div>');
 s=s.replace('</body>','<!-- sales-growth-checkout-v1 -->\n</body>');
 fs.writeFileSync(home,s);
}
const admin='shop-site/public/admin/index.html';let a=fs.readFileSync(admin,'utf8');if(!a.includes('/admin/sales-growth-admin.js')){a=a.replace('</body>','<script src="/admin/sales-growth-admin.js" defer></script>\n</body>');fs.writeFileSync(admin,a)}
console.log('sales growth storefront and admin patch applied');

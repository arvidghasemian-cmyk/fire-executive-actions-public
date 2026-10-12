import fs from 'node:fs';

const path='shop-site/public/index.html';
let s=fs.readFileSync(path,'utf8');
const TERMS_VERSION='2026-10-02-v1';

const css=`<style id="checkout-final-v3">
.checkout-final-block{margin:12px 0;border:1px solid #e5e7eb;border-radius:14px;background:#fff;padding:12px}.checkout-final-title{font-weight:900;font-size:12px;margin-bottom:8px}.checkout-payment-option{display:flex;align-items:flex-start;gap:8px;border:1px solid #e8eaee;border-radius:12px;padding:10px;background:#fff}.checkout-payment-option input{margin-top:3px}.checkout-payment-option strong{display:block;font-size:11px}.checkout-payment-option small{display:block;color:#667085;font-size:9px;line-height:1.7;margin-top:2px}.checkout-payment-option.active{border-color:#efc24f;background:#fffaf0}.checkout-payment-disabled{margin-top:7px;border:1px dashed #d0d5dd;border-radius:12px;padding:9px 10px;color:#98a2b3;font-size:10px;background:#f9fafb}.checkout-terms{display:flex;align-items:flex-start;gap:10px;margin-top:12px;font-size:10px;line-height:1.9;color:#344054;border:1px solid transparent;border-radius:11px;padding:8px 9px}.checkout-terms.invalid{border-color:#fecdd3;background:#fff7f8}.checkout-terms input{margin-top:5px;transform:scale(1.18);flex:0 0 auto}.checkout-terms a{color:#a60f18;font-weight:800}.checkout-terms-error{display:none;color:#b42318;background:#fff1f3;border:1px solid #fecdd3;border-radius:10px;padding:8px 10px;margin-top:8px;font-size:9px;line-height:1.8}.checkout-terms-error.show{display:block}@media(max-width:560px){.checkout-final-block{padding:11px}.checkout-payment-option{padding:9px}.checkout-payment-option strong{font-size:10px}.checkout-payment-option small,.checkout-payment-disabled,.checkout-terms{font-size:9px}}
</style>`;
if(!s.includes('id="checkout-final-v3"'))s=s.replace('</head>',css+'\n</head>');

const marker='<div class="order-success" id="orderSuccess"></div>';
const finalBlock=`<div class="checkout-final-block" id="checkoutFinalBlock">
  <div class="checkout-final-title">روش پرداخت</div>
  <label class="checkout-payment-option active"><input type="radio" name="payment_method" value="manual_confirmation" checked><span><strong>هماهنگی و پرداخت پس از تأیید فروشگاه</strong><small>پس از بررسی موجودی، قیمت نهایی و هزینه ارسال با شما هماهنگ می‌شود.</small></span></label>
  <div class="checkout-payment-disabled">پرداخت آنلاین — پس از اتصال درگاه واقعی فعال می‌شود.</div>
  <label class="checkout-terms" id="checkoutTermsLabel"><input id="acceptTerms" type="checkbox"><span>قوانین <a href="/purchase-rules/" target="_blank" rel="noopener">خرید</a> و <a href="/privacy/" target="_blank" rel="noopener">حریم خصوصی</a> را خوانده‌ام و می‌پذیرم.</span></label>
  <div class="checkout-terms-error" id="termsError" role="alert" aria-live="polite">برای ادامه، قوانین خرید و حریم خصوصی را تأیید کنید.</div>
</div>`;
if(s.includes(marker)&&!s.includes('id="checkoutFinalBlock"'))s=s.replace(marker,finalBlock+marker);

const payloadPattern=/const payload=\{customer:\{name:document\.getElementById\('customerName'\)\.value\.trim\(\),phone:document\.getElementById\('customerPhone'\)\.value\.trim\(\),province:document\.getElementById\('customerProvince'\)\.value\.trim\(\),city:document\.getElementById\('customerCity'\)\.value\.trim\(\),address:document\.getElementById\('customerAddress'\)\.value\.trim\(\),postal_code:document\.getElementById\('customerPostal'\)\.value\.trim\(\),company:document\.getElementById\('customerCompany'\)\.value\.trim\(\),notes:document\.getElementById\('customerNotes'\)\.value\.trim\(\)\},items\};/;
const payloadReplacement=`const termsBox=document.getElementById('acceptTerms'),termsError=document.getElementById('termsError'),termsLabel=document.getElementById('checkoutTermsLabel');
  if(!termsBox||!termsBox.checked){if(termsError)termsError.classList.add('show');if(termsLabel)termsLabel.classList.add('invalid');if(termsBox){termsBox.focus({preventScroll:true});termsBox.scrollIntoView({behavior:'smooth',block:'center'})}return}
  if(termsError)termsError.classList.remove('show');if(termsLabel)termsLabel.classList.remove('invalid');
  const payload={customer:{name:document.getElementById('customerName').value.trim(),phone:document.getElementById('customerPhone').value.trim(),province:document.getElementById('customerProvince').value.trim(),city:document.getElementById('customerCity').value.trim(),address:document.getElementById('customerAddress').value.trim(),postal_code:document.getElementById('customerPostal').value.trim(),company:document.getElementById('customerCompany').value.trim(),notes:document.getElementById('customerNotes').value.trim()},items,terms:{accepted:true,version:'${TERMS_VERSION}'},payment_method:'manual_confirmation'};`;
if(payloadPattern.test(s))s=s.replace(payloadPattern,payloadReplacement);
else if(!s.includes("payment_method:'manual_confirmation'"))throw new Error('checkout payload marker not found');

const inlineValidation=`<script id="checkout-terms-inline-validation">(()=>{const box=document.getElementById('acceptTerms'),err=document.getElementById('termsError'),label=document.getElementById('checkoutTermsLabel');if(!box)return;box.addEventListener('change',()=>{if(box.checked){if(err)err.classList.remove('show');if(label)label.classList.remove('invalid')}})})();</script>`;
if(!s.includes('id="checkout-terms-inline-validation"'))s=s.replace('</body>',inlineValidation+'\n</body>');

s=s.replace("btn.textContent=allPriced?'تأیید و ثبت سفارش':'ثبت درخواست';","btn.textContent=allPriced?'ثبت سفارش و دریافت کد پیگیری':'ثبت درخواست و دریافت کد پیگیری';");

if(!s.includes('id="checkoutFinalBlock"'))throw new Error('checkout final block missing');
if(s.includes('id="acceptTerms" type="checkbox" required'))throw new Error('native checkbox validation still enabled');
if(!s.includes(`terms:{accepted:true,version:'${TERMS_VERSION}'},payment_method:'manual_confirmation'`))throw new Error('checkout terms payload missing');
if(!s.includes('/purchase-rules/')||!s.includes('/privacy/'))throw new Error('checkout legal links missing');
if(!s.includes('checkout-terms-inline-validation'))throw new Error('inline terms validation missing');

fs.writeFileSync(path,s);
console.log('checkout finalization patch applied');

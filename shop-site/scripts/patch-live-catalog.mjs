import fs from 'node:fs';
const path='shop-site/public/index.html';
let s=fs.readFileSync(path,'utf8');

s=s.replace(
  '<div class="stock" style="color:#b54708">قیمت و موجودی: در انتظار ثبت اطلاعات واقعی</div>',
  '<div class="stock" style="color:${p.stock==null?"#b54708":"var(--green)"}">${p.stock==null?"موجودی: استعلام":"موجودی: "+fa(p.stock)+" عدد"}</div>'
);

const priceRowPattern=/<div class="price-row"><span class="price">(?:استعلام پس از تکمیل|استعلام قیمت)<\/span>(?:<a class="add"[^>]*>←<\/a>|<button class="add"[^>]*>＋<\/button>)<\/div>/;
const livePriceRow='<div class="price-row"><span class="price">${Number.isFinite(p.price)?money(p.price):"استعلام قیمت"}</span><button class="add" type="button" onclick="add(${p.id})" aria-label="افزودن ${p.name} به سبد">＋</button></div>';
if(priceRowPattern.test(s)){
  s=s.replace(priceRowPattern,livePriceRow);
}else if(!s.includes('Number.isFinite(p.price)?money(p.price)')){
  throw new Error('live price-row marker not found');
}

s=s.replace(
  "document.getElementById('total').textContent=entries.length?fa(count)+' قلم':'۰ قلم';",
  "const allPriced=entries.length>0&&entries.every(x=>Number.isFinite(x.product.price));\n  const pricedTotal=entries.reduce((sum,x)=>sum+(Number.isFinite(x.product.price)?x.product.price*x.qty:0),0);\n  document.getElementById('total').textContent=allPriced?money(pricedTotal):(entries.length?fa(count)+' قلم / استعلام':'۰ قلم');"
);

const cardImageFix=`<style id="live-product-card-image-fix">
.product .pimg{height:auto!important;aspect-ratio:5/4;overflow:hidden!important;display:grid!important;place-items:center!important;background:#fff!important;padding:10px!important}
.product .pimg img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;position:static!important}
.product .pbody{position:relative!important;z-index:2;background:#fff!important}
.product .pbody h3,.product .pbody .sku,.product .pbody .stock,.product .price-row{position:static!important;transform:none!important}
@media(max-width:560px){.product .pimg{aspect-ratio:1/1.12}}
</style>`;
if(!s.includes('id="live-product-card-image-fix"'))s=s.replace('</head>',cardImageFix+'\n</head>');

const homeCleanup=`<style id="home-redundant-sections-cleanup">
.mini-trust,#categories{display:none!important}
</style>
<script id="home-redundant-sections-cleanup-js">
(function(){
  function removeClosestBlockByText(text){
    const all=[...document.querySelectorAll('section,div')];
    const node=all.find(el=>el.children.length>0&&el.textContent&&el.textContent.includes(text));
    if(!node)return;
    const section=node.closest('section');
    if(section){section.remove();return;}
    node.remove();
  }
  function cleanupHome(){
    document.querySelectorAll('.mini-trust,#categories').forEach(el=>el.remove());
    removeClosestBlockByText('محصولات پرکاربرد را سریع‌تر پیدا کن');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanupHome,{once:true});
  else cleanupHome();
})();
</script>`;
if(!s.includes('id="home-redundant-sections-cleanup"'))s=s.replace('</head>',homeCleanup+'\n</head>');

const approvedTheme=`<style id="approved-crimson-gold-theme">
:root{--red:#a60f18!important;--red-dark:#821019!important;--gold:#f4b51b;--gold-soft:#fff4c7;--gold-line:#efc24f;--ink:#111827}
a{transition:color .18s ease,background .18s ease,border-color .18s ease}
.btn.red,.search button,.search-btn,button[type="submit"].red{background:var(--red)!important;border-color:var(--red)!important;color:#fff!important}
.btn.red:hover,.search button:hover,.search-btn:hover{background:var(--red-dark)!important;border-color:var(--red-dark)!important}
.price,.section-more,.view-all,.product a:hover{color:var(--red)!important}
.add{color:var(--red)!important;background:#fff1f2!important;border-color:#f7d7da!important}.add:hover{background:var(--red)!important;color:#fff!important}
.filter.active{background:var(--red)!important;border-color:var(--red)!important;color:#fff!important}
.filter:not(.active):hover{border-color:var(--gold-line)!important;background:var(--gold-soft)!important;color:#5b3a00!important}
.product{border-color:#e8e9ed!important;box-shadow:0 5px 18px rgba(17,24,39,.035)}.product:hover{border-color:var(--gold-line)!important;box-shadow:0 12px 30px rgba(17,24,39,.08)!important}
.sample-badge{background:var(--gold-soft)!important;color:#795400!important;border:1px solid #ffe08a!important}
#products h2,.products-head h2,.section-head h2{position:relative}#products h2:before,.products-head h2:before,.section-head h2:before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--gold);margin-left:8px;vertical-align:middle}
.hero{border-color:#f1d5d7!important;box-shadow:0 8px 28px rgba(166,15,24,.055)!important}.hero .btn:not(.red){border-color:#e8b8bc!important;color:var(--ink)!important;background:#fff!important}.hero .btn:not(.red):hover{border-color:var(--gold-line)!important;background:var(--gold-soft)!important}.hero h1 span,.hero h2 span,.hero .red,.hero strong[style*="color"]{color:var(--red)!important}
.search input:focus,.search-box input:focus,input[type="search"]:focus{outline:none!important;border-color:var(--gold-line)!important;box-shadow:0 0 0 3px rgba(244,181,27,.18)!important}.cart-count,.badge-count{background:var(--red)!important;color:#fff!important}.footer{background:#101a2b!important}
@media(max-width:560px){.product{border-radius:16px!important}.price{font-weight:900!important}}
</style>`;
if(!s.includes('id="approved-crimson-gold-theme"'))s=s.replace('</head>',approvedTheme+'\n</head>');

s=s.replace('<span class="sample-badge">${p.badge}</span>','${p.badge?`<span class="sample-badge">${p.badge}</span>`:""}');

const oldEnd='loadCart();render();renderCart();';
const newEnd=`async function syncCatalog(){
  try{
    const res=await fetch('/api/products',{cache:'no-store'});
    if(!res.ok)return;
    const data=await res.json();
    const bySlug=new Map((data.products||[]).map(x=>[x.slug,x]));
    products.forEach(p=>{
      const row=bySlug.get(p.slug); if(!row)return;
      p.price=Number.isFinite(row.price_toman)?row.price_toman:null;
      p.stock=Number.isFinite(row.stock_qty)?row.stock_qty:null;
      p.status=row.status||'quote';
      if(row.image_url){p.img=row.image_url;p.srcset='';if(String(row.image_url).startsWith('/media/product/'))p.badge='';}
    });
    render();renderCart();
  }catch(e){console.warn('catalog sync skipped')}
}
loadCart();render();renderCart();syncCatalog();`;
if(!s.includes('async function syncCatalog()')){
  if(!s.includes(oldEnd))throw new Error('catalog sync marker not found');
  s=s.replace(oldEnd,newEnd);
}

const checkoutCss=`<style id="checkout-pro-v2">
.checkout-summary{border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;padding:11px;margin:10px 0}.checkout-summary-title{font-weight:900;font-size:12px;margin-bottom:7px}.checkout-summary-row{display:flex;justify-content:space-between;gap:10px;font-size:10px;padding:5px 0;border-bottom:1px dashed #e5e7eb}.checkout-summary-row:last-child{border-bottom:0}.checkout-summary-total{display:flex;justify-content:space-between;gap:10px;font-weight:900;color:#a60f18;margin-top:8px}.checkout-shipping-note{font-size:9px;color:#667085;line-height:1.8;margin-top:7px}.checkout-field input:focus,.checkout-field textarea:focus{border-color:#efc24f!important;box-shadow:0 0 0 3px rgba(244,181,27,.14)}
</style>`;
if(!s.includes('id="checkout-pro-v2"'))s=s.replace('</head>',checkoutCss+'\n</head>');

const cityField='<div class="checkout-field"><label for="customerCity">شهر</label><input id="customerCity" name="city" autocomplete="address-level2"></div>';
const deliveryFields='<div class="checkout-field"><label for="customerProvince">استان</label><input id="customerProvince" name="province" autocomplete="address-level1" required></div><div class="checkout-field"><label for="customerCity">شهر</label><input id="customerCity" name="city" autocomplete="address-level2" required></div><div class="checkout-field"><label for="customerPostal">کد پستی (اختیاری)</label><input id="customerPostal" name="postal_code" inputmode="numeric" maxlength="10" autocomplete="postal-code" placeholder="۱۰ رقم"></div>';
if(s.includes(cityField))s=s.replace(cityField,deliveryFields);
const companyField='<div class="checkout-field"><label for="customerCompany">نام شرکت / پروژه</label><input id="customerCompany" name="company"></div>';
if(s.includes(companyField)&&!s.includes('id="customerAddress"'))s=s.replace(companyField,companyField+'<div class="checkout-field full"><label for="customerAddress">آدرس تحویل (در صورت نیاز به ارسال)</label><textarea id="customerAddress" name="address" autocomplete="street-address" placeholder="خیابان، کوچه، پلاک و توضیحات دسترسی"></textarea></div>');
const successMarker='<div class="order-success" id="orderSuccess"></div>';
if(s.includes(successMarker)&&!s.includes('id="checkoutSummary"'))s=s.replace(successMarker,'<div class="checkout-summary" id="checkoutSummary"></div><div class="checkout-shipping-note">هزینه و روش ارسال پس از بررسی سفارش و مقصد هماهنگ می‌شود و فعلاً به جمع کالاها اضافه نشده است.</div>'+successMarker);

const checkoutOpen="document.getElementById('checkoutBtn').onclick=()=>{\n  if(!cartEntries().length){const t=document.getElementById('toast');t.textContent='ابتدا یک محصول اضافه کن';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1200);return}\n  checkoutBackdrop.classList.add('open');checkoutBackdrop.setAttribute('aria-hidden','false');\n};";
const summaryFn=`function checkoutEsc(v){return String(v??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function renderCheckoutSummary(){
  const entries=cartEntries(),box=document.getElementById('checkoutSummary');
  if(!box)return;
  const allPriced=entries.length>0&&entries.every(function(x){return Number.isFinite(x.product.price)});
  const total=entries.reduce(function(sum,x){return sum+(Number.isFinite(x.product.price)?x.product.price*x.qty:0)},0);
  box.innerHTML='<div class="checkout-summary-title">خلاصه سفارش</div>'+entries.map(function(x){const p=x.product;return '<div class="checkout-summary-row"><span>'+checkoutEsc(p.name)+' × '+fa(x.qty)+'</span><strong>'+(Number.isFinite(p.price)?money(p.price*x.qty):'استعلام')+'</strong></div>'}).join('')+'<div class="checkout-summary-total"><span>جمع کالاها</span><span>'+(allPriced?money(total):'دارای قلم استعلامی')+'</span></div>';
  const btn=document.getElementById('submitOrder');if(btn)btn.textContent=allPriced?'تأیید و ثبت سفارش':'ثبت درخواست';
}
document.getElementById('checkoutBtn').onclick=()=>{
  if(!cartEntries().length){const t=document.getElementById('toast');t.textContent='ابتدا یک محصول اضافه کن';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1200);return}
  renderCheckoutSummary();checkoutBackdrop.classList.add('open');checkoutBackdrop.setAttribute('aria-hidden','false');
};`;
if(s.includes(checkoutOpen)&&!s.includes('function renderCheckoutSummary()'))s=s.replace(checkoutOpen,summaryFn);

const oldPayload="const payload={customer:{name:document.getElementById('customerName').value.trim(),phone:document.getElementById('customerPhone').value.trim(),city:document.getElementById('customerCity').value.trim(),company:document.getElementById('customerCompany').value.trim(),notes:document.getElementById('customerNotes').value.trim()},items};";
const newPayload="const payload={customer:{name:document.getElementById('customerName').value.trim(),phone:document.getElementById('customerPhone').value.trim(),province:document.getElementById('customerProvince').value.trim(),city:document.getElementById('customerCity').value.trim(),address:document.getElementById('customerAddress').value.trim(),postal_code:document.getElementById('customerPostal').value.trim(),company:document.getElementById('customerCompany').value.trim(),notes:document.getElementById('customerNotes').value.trim()},items};";
if(s.includes(oldPayload))s=s.replace(oldPayload,newPayload);

const finalInit='loadCart();render();renderCart();syncCatalog();';
if(s.includes(finalInit)&&!s.includes("openCart=1"))s=s.replace(finalInit,finalInit+"\ntry{if(new URLSearchParams(location.search).get('openCart')==='1')setTimeout(()=>document.getElementById('drawer').classList.add('open'),250)}catch(e){}");

if(!s.includes('Number.isFinite(p.price)?money(p.price)'))throw new Error('live price rendering was not installed');
if(!s.includes("p.srcset='';"))throw new Error('live image srcset reset was not installed');
if(!s.includes('live-product-card-image-fix'))throw new Error('product card image containment fix was not installed');
if(!s.includes("startsWith('/media/product/')"))throw new Error('uploaded image badge reset was not installed');
if(!s.includes('home-redundant-sections-cleanup'))throw new Error('home redundant section cleanup was not installed');
if(!s.includes('approved-crimson-gold-theme'))throw new Error('approved crimson/gold theme was not installed');
if(!s.includes('id="customerProvince"')||!s.includes('id="checkoutSummary"'))throw new Error('checkout pro fields were not installed');
if(!s.includes('postal_code:document.getElementById'))throw new Error('checkout delivery payload was not installed');

fs.writeFileSync(path,s);
console.log('live catalog patch applied');
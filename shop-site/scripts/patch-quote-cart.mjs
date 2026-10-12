import fs from 'node:fs';
const path='shop-site/public/index.html';
let s=fs.readFileSync(path,'utf8');

const css=`
/* Quote cart + checkout */
.qty-row{display:flex;align-items:center;gap:7px;margin-top:8px}
.qty-btn{width:28px;height:28px;border:1px solid var(--line);background:#fff;border-radius:8px;cursor:pointer}
.cart-item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start}
.cart-item small{color:var(--muted)}
.cart-remove{border:0;background:#fff0f1;color:var(--red);border-radius:8px;padding:5px 8px;cursor:pointer}
.checkout-note{font-size:10px;color:var(--muted);margin:8px 0}
.modal-backdrop{position:fixed;inset:0;background:rgba(17,24,39,.52);display:none;align-items:flex-end;justify-content:center;z-index:150}
.modal-backdrop.open{display:flex}
.checkout-modal{width:min(560px,100%);background:#fff;border-radius:22px 22px 0 0;padding:18px;max-height:90vh;overflow:auto}
.checkout-modal h3{margin:0 0 5px}
.checkout-modal p{margin:0 0 14px;color:var(--muted);font-size:11px}
.checkout-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.checkout-field{display:grid;gap:5px}
.checkout-field.full{grid-column:1/-1}
.checkout-field label{font-size:11px;font-weight:700}
.checkout-field input,.checkout-field textarea{border:1px solid var(--line);border-radius:10px;padding:10px;outline:0}
.checkout-field textarea{min-height:82px;resize:vertical}
.checkout-actions{display:flex;gap:8px;margin-top:14px}
.checkout-actions .btn{flex:1}
.order-success{display:none;border:1px solid #abefc6;background:#ecfdf3;color:#067647;border-radius:12px;padding:12px;margin-top:12px;font-size:11px}
.order-success.show{display:block}
@media(max-width:560px){.checkout-fields{grid-template-columns:1fr}.checkout-field.full{grid-column:auto}}
`;
if(!s.includes('/* Quote cart + checkout */')) s=s.replace('</style>',css+'\n</style>');

const oldDrawer='<aside class="drawer" id="drawer"><div class="drawer-head"><strong>سبد خرید</strong><button class="icon-btn" id="closeDrawer">✕</button></div><div class="drawer-list" id="cartList"><div style="color:#98a2b3;font-size:11px">سبد خرید خالی است.</div></div><div class="drawer-foot"><div class="drawer-total"><span>جمع</span><strong id="total">۰ تومان</strong></div><button class="btn btn-red">ادامه ثبت سفارش</button></div></aside>';
const newDrawer=`<aside class="drawer" id="drawer"><div class="drawer-head"><strong>سبد خرید</strong><button class="icon-btn" id="closeDrawer">✕</button></div><div class="drawer-list" id="cartList"><div style="color:#98a2b3;font-size:11px">سبد خرید خالی است.</div></div><div class="drawer-foot"><div class="drawer-total"><span>جمع</span><strong id="total">۰ تومان</strong></div><div class="checkout-note">تا زمان ثبت قیمت واقعی، این سبد برای ارسال درخواست خرید/استعلام استفاده می‌شود.</div><button class="btn btn-red" id="checkoutBtn">ادامه درخواست</button></div></aside>

<div class="modal-backdrop" id="checkoutBackdrop" aria-hidden="true">
  <section class="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle">
    <div class="drawer-head">
      <div><h3 id="checkoutTitle">ثبت درخواست خرید</h3><p>نام و شماره تماس را وارد کن؛ درخواست در فروشگاه ثبت می‌شود.</p></div>
      <button class="icon-btn" id="closeCheckout" type="button">✕</button>
    </div>
    <form id="checkoutForm">
      <div class="checkout-fields">
        <div class="checkout-field"><label for="customerName">نام و نام خانوادگی</label><input id="customerName" name="name" required autocomplete="name"></div>
        <div class="checkout-field"><label for="customerPhone">شماره موبایل</label><input id="customerPhone" name="phone" required inputmode="tel" autocomplete="tel" placeholder="09xxxxxxxxx"></div>
        <div class="checkout-field"><label for="customerCity">شهر</label><input id="customerCity" name="city" autocomplete="address-level2"></div>
        <div class="checkout-field"><label for="customerCompany">نام شرکت / پروژه</label><input id="customerCompany" name="company"></div>
        <div class="checkout-field full"><label for="customerNotes">توضیحات</label><textarea id="customerNotes" name="notes" placeholder="مدل، تعداد، زمان تحویل یا هر توضیح دیگر"></textarea></div>
      </div>
      <div class="order-success" id="orderSuccess"></div>
      <div class="checkout-actions">
        <button type="button" class="btn btn-white" id="cancelCheckout">انصراف</button>
        <button type="submit" class="btn btn-red" id="submitOrder">ثبت درخواست</button>
      </div>
    </form>
  </section>
</div>`;
if(!s.includes('id="checkoutBackdrop"')){
  if(!s.includes(oldDrawer)) throw new Error('drawer marker not found');
  s=s.replace(oldDrawer,newDrawer);
}

s=s.replace('<div class="price-row"><span class="price">استعلام پس از تکمیل</span><a class="add" href="/product/${p.slug}/" aria-label="مشاهده محصول">←</a></div>',
'<div class="price-row"><span class="price">استعلام قیمت</span><button class="add" type="button" onclick="add(${p.id})" aria-label="افزودن ${p.name} به سبد">＋</button></div>');

const newCart=`const CART_KEY='soroush_quote_cart_v1';
function loadCart(){
  try{cart=JSON.parse(localStorage.getItem(CART_KEY)||'{}')||{}}catch(e){cart={}}
}
function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(cart))}
function add(id){
  cart[id]=(cart[id]||0)+1;
  saveCart();renderCart();
  const t=document.getElementById('toast');t.textContent='به سبد درخواست اضافه شد';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1200);
}
function changeQty(id,delta){
  const next=(cart[id]||0)+delta;
  if(next<=0)delete cart[id];else cart[id]=Math.min(next,20);
  saveCart();renderCart();
}
function removeCart(id){delete cart[id];saveCart();renderCart()}
function cartEntries(){return Object.entries(cart).map(([id,qty])=>({product:products.find(p=>p.id==id),qty:Number(qty)})).filter(x=>x.product&&x.qty>0)}
function renderCart(){
  const entries=cartEntries(),count=entries.reduce((sum,x)=>sum+x.qty,0);
  document.getElementById('cartCount').textContent=fa(count);
  document.getElementById('cartList').innerHTML=entries.length?entries.map(({product:p,qty})=>\`
    <div class="cart-item">
      <div><strong>\${p.name}</strong><br><small>تعداد: \${fa(qty)}</small>
        <div class="qty-row"><button class="qty-btn" type="button" onclick="changeQty(\${p.id},1)">＋</button><button class="qty-btn" type="button" onclick="changeQty(\${p.id},-1)">−</button></div>
      </div>
      <button class="cart-remove" type="button" onclick="removeCart(\${p.id})">حذف</button>
    </div>\`).join(''):'<div style="color:#98a2b3;font-size:11px">سبد درخواست خالی است.</div>';
  document.getElementById('total').textContent=entries.length?fa(count)+' قلم':'۰ قلم';
}
const drawer=document.getElementById('drawer');
const checkoutBackdrop=document.getElementById('checkoutBackdrop');
document.getElementById('cartBtn').onclick=()=>drawer.classList.add('open');
document.getElementById('mobileCart').onclick=()=>drawer.classList.add('open');
document.getElementById('closeDrawer').onclick=()=>drawer.classList.remove('open');
document.getElementById('checkoutBtn').onclick=()=>{
  if(!cartEntries().length){const t=document.getElementById('toast');t.textContent='ابتدا یک محصول اضافه کن';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1200);return}
  checkoutBackdrop.classList.add('open');checkoutBackdrop.setAttribute('aria-hidden','false');
};
function closeCheckout(){checkoutBackdrop.classList.remove('open');checkoutBackdrop.setAttribute('aria-hidden','true')}
document.getElementById('closeCheckout').onclick=closeCheckout;
document.getElementById('cancelCheckout').onclick=closeCheckout;
checkoutBackdrop.addEventListener('click',e=>{if(e.target===checkoutBackdrop)closeCheckout()});
document.getElementById('checkoutForm').onsubmit=async e=>{
  e.preventDefault();
  const btn=document.getElementById('submitOrder'),success=document.getElementById('orderSuccess');
  const items=cartEntries().map(x=>({slug:x.product.slug,quantity:x.qty}));
  const payload={customer:{name:document.getElementById('customerName').value.trim(),phone:document.getElementById('customerPhone').value.trim(),city:document.getElementById('customerCity').value.trim(),company:document.getElementById('customerCompany').value.trim(),notes:document.getElementById('customerNotes').value.trim()},items};
  btn.disabled=true;btn.textContent='در حال ثبت...';success.classList.remove('show');
  try{
    const res=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'خطا در ثبت درخواست');
    success.style='';success.textContent='درخواست با موفقیت ثبت شد. کد پیگیری: '+data.order_code;success.classList.add('show');
    cart={};saveCart();renderCart();e.target.reset();
  }catch(err){
    success.textContent='ثبت آنلاین انجام نشد: '+err.message;success.style.background='#fff1f3';success.style.borderColor='#fecdd3';success.style.color='#b42318';success.classList.add('show');
  }finally{btn.disabled=false;btn.textContent='ثبت درخواست'}
};
loadCart();render();renderCart();`;
if(!s.includes("const CART_KEY='soroush_quote_cart_v1'")){
  const cartBlock=/function add\(id\)\{\}[\s\S]*?render\(\);renderCart\(\);/;
  if(!cartBlock.test(s)) throw new Error('cart JS marker not found');
  s=s.replace(cartBlock,newCart);
}

fs.writeFileSync(path,s);
console.log('quote cart patch applied');

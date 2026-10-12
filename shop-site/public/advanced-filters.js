(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const digits=v=>String(v??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[,٬،\s]/g,'');
 const num=v=>{const s=digits(v);return /^\d+$/.test(s)?Number(s):null};
 const normalize=v=>String(v??'').trim().replace(/ي|ى/g,'ی').replace(/ك/g,'ک').toLowerCase();
 let catalog=new Map(),observer=null;
 function productOf(card){
  const a=card.querySelector('a[href*="/product/"]');
  if(a){try{const m=new URL(a.href,location.origin).pathname.match(/^\/product\/([^/]+)\/?$/);if(m){const p=catalog.get(decodeURIComponent(m[1]));if(p)return p}}catch{}}
  const title=normalize(card.querySelector('.pbody h3')?.textContent||card.getAttribute('aria-label')?.replace(/^مشاهده\s+/,'')||'');
  if(!title)return null;
  for(const p of catalog.values())if(normalize(p.name)===title)return p;
  return null;
 }
 function apply(){
  const grid=document.getElementById('productGrid'),brand=document.getElementById('advancedBrand'),status=document.getElementById('advancedPriceStatus'),min=document.getElementById('advancedMinPrice'),max=document.getElementById('advancedMaxPrice'),count=document.getElementById('advancedFilterCount');if(!grid||!brand)return;
  const b=normalize(brand.value),st=status.value,lo=num(min.value),hi=num(max.value),active=!!(b||st||lo!==null||hi!==null);let visible=0,total=0;
  grid.querySelectorAll('.product').forEach(card=>{total++;const p=productOf(card);let ok=!active||!!p;
   if(ok&&active&&b&&normalize(p?.brand)!==b)ok=false;
   if(ok&&active&&st==='priced'&&p?.status!=='priced')ok=false;
   if(ok&&active&&st==='quote'&&p?.status==='priced')ok=false;
   if(ok&&active&&(lo!==null||hi!==null)){if(p?.status!=='priced'||!Number.isInteger(p?.price_toman))ok=false;else if(lo!==null&&p.price_toman<lo)ok=false;else if(hi!==null&&p.price_toman>hi)ok=false}
   card.hidden=!ok;if(ok)visible++;
  });
  if(count)count.textContent=`${new Intl.NumberFormat('fa-IR').format(visible)} از ${new Intl.NumberFormat('fa-IR').format(total)} کالا`;
 }
 async function init(){
  const sort=document.getElementById('sort'),grid=document.getElementById('productGrid');if(!sort||!grid||document.getElementById('advancedProductFilters'))return;
  let data;try{const r=await fetch('/api/products',{cache:'no-store'});if(!r.ok)return;data=await r.json()}catch{return}
  for(const p of data.products||[])catalog.set(p.slug,p);
  const brands=[...new Set((data.products||[]).map(p=>String(p.brand||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa'));
  const box=document.createElement('section');box.id='advancedProductFilters';box.className='advanced-product-filters';box.setAttribute('aria-label','فیلتر پیشرفته محصولات');
  box.innerHTML=`<div class="apf-head"><strong>فیلتر دقیق‌تر</strong><span id="advancedFilterCount"></span></div><div class="apf-grid"><label>برند<select id="advancedBrand"><option value="">همه برندها</option>${brands.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><label>نوع قیمت<select id="advancedPriceStatus"><option value="">همه</option><option value="priced">دارای قیمت</option><option value="quote">استعلام قیمت</option></select></label><label>حداقل قیمت (تومان)<input id="advancedMinPrice" inputmode="numeric" placeholder="مثلاً ۱۰۰۰۰۰"></label><label>حداکثر قیمت (تومان)<input id="advancedMaxPrice" inputmode="numeric" placeholder="مثلاً ۵۰۰۰۰۰"></label><button type="button" id="advancedFilterReset">پاک‌کردن فیلتر</button></div>`;
  const anchor=sort.parentElement||sort;anchor.insertAdjacentElement('afterend',box);
  const style=document.createElement('style');style.id='advanced-product-filters-style';style.textContent='.advanced-product-filters{margin:12px 0 18px;border:1px solid #e5e7eb;background:#fff;border-radius:16px;padding:12px}.apf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;font-size:11px}.apf-head span{color:#667085}.apf-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.apf-grid label{font-size:9px;font-weight:800;display:grid;gap:4px}.apf-grid select,.apf-grid input{width:100%;min-height:38px;border:1px solid #d0d5dd;border-radius:9px;padding:7px;background:#fff;font:inherit}.apf-grid button{align-self:end;min-height:38px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;font:inherit;font-weight:800;cursor:pointer}@media(max-width:760px){.apf-grid{grid-template-columns:1fr 1fr}.apf-grid button{grid-column:1/-1}}';document.head.appendChild(style);
  for(const id of ['advancedBrand','advancedPriceStatus','advancedMinPrice','advancedMaxPrice'])document.getElementById(id).addEventListener(id.includes('Price')?'input':'change',apply);
  document.getElementById('advancedFilterReset').addEventListener('click',()=>{document.getElementById('advancedBrand').value='';document.getElementById('advancedPriceStatus').value='';document.getElementById('advancedMinPrice').value='';document.getElementById('advancedMaxPrice').value='';apply()});
  observer=new MutationObserver(apply);observer.observe(grid,{childList:true});apply();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

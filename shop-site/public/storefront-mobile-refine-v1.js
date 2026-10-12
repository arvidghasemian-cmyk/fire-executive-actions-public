(()=>{
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(v)=>`${new Intl.NumberFormat('fa-IR').format(Math.round(Number(v)||0))} تومان`;

  function enhance(box){
    if(!box||box.dataset.mobileRefine==='ready')return;
    const grid=box.querySelector('.apf-grid');
    const head=box.querySelector('.apf-head');
    if(!grid||!head)return;
    box.dataset.mobileRefine='ready';
    box.classList.add('apf-mobile-collapsible');
    if(!grid.id)grid.id='advancedFilterControls';
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='apf-mobile-toggle';
    toggle.textContent='نمایش فیلترها';
    toggle.setAttribute('aria-controls',grid.id);
    toggle.setAttribute('aria-expanded','false');
    head.insertAdjacentElement('afterend',toggle);
    toggle.addEventListener('click',()=>{
      const open=box.classList.toggle('is-open');
      toggle.textContent=open?'بستن فیلترها':'نمایش فیلترها';
      toggle.setAttribute('aria-expanded',String(open));
    });
  }

  function productShelfShell(){
    let shelf=document.getElementById('mobileProductShelf');
    if(shelf)return shelf;
    const cats=document.getElementById('homeV2Categories');
    if(!cats)return null;
    shelf=document.createElement('section');
    shelf.id='mobileProductShelf';
    shelf.className='mobile-product-shelf';
    shelf.setAttribute('aria-labelledby','mobileProductShelfTitle');
    shelf.innerHTML=`<div class="container"><div class="mobile-product-shelf-head"><div><h2 id="mobileProductShelfTitle">محصولات فروشگاه</h2><p>چند کالای واقعی برای دسترسی سریع؛ برای جزئیات روی محصول بزنید.</p></div><span class="mobile-product-shelf-count" data-mobile-product-count>در حال بارگذاری</span></div><div class="mobile-product-shelf-grid" data-mobile-product-grid></div><button class="mobile-product-more" type="button" data-mobile-product-more hidden>نمایش ۴ محصول دیگر</button></div>`;
    cats.insertAdjacentElement('afterend',shelf);
    return shelf;
  }

  function normalizedProducts(rows){
    return (Array.isArray(rows)?rows:[])
      .filter(p=>p&&p.id!=null&&p.slug&&p.name&&String(p.status||'').toLowerCase()!=='disabled')
      .map(p=>({...p,_featured:Number(p.featured)===1?1:0,_stock:Number(p.stock_qty),_price:Number(p.price_toman)}))
      .sort((a,b)=>b._featured-a._featured||((b._stock>0)-(a._stock>0))||Number(a.id)-Number(b.id));
  }

  function productCard(p){
    const priced=Number.isFinite(p._price)&&p._price>0;
    const stockKnown=Number.isFinite(p._stock);
    const unavailable=stockKnown&&p._stock<=0;
    const href=`/product/${encodeURIComponent(String(p.slug))}/`;
    const img=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`:`<span class="mobile-product-placeholder">تصویر محصول</span>`;
    const stock=stockKnown?(p._stock>0?`موجودی: ${new Intl.NumberFormat('fa-IR').format(p._stock)} عدد`:'ناموجود'):'موجودی: استعلام';
    return `<article class="mobile-product-card" data-mobile-product-id="${esc(p.id)}"><a class="mobile-product-card-media" href="${href}" aria-label="مشاهده ${esc(p.name)}">${img}</a><div class="mobile-product-card-body"><a class="mobile-product-card-title" href="${href}">${esc(p.name)}</a><span class="mobile-product-stock">${stock}</span><div class="mobile-product-card-meta"><span class="mobile-product-price">${priced?money(p._price):'استعلام قیمت'}</span><button class="mobile-product-add" type="button" data-mobile-add="${esc(p.id)}" data-product-href="${href}" aria-label="افزودن ${esc(p.name)} به سبد" ${unavailable?'disabled':''}>＋</button></div></div></article>`;
  }

  function bindShelfInteractions(shelf){
    shelf.querySelectorAll('.mobile-product-card-media img').forEach(img=>{
      img.addEventListener('error',()=>{
        const box=img.parentElement;if(!box)return;
        img.remove();
        if(!box.querySelector('.mobile-product-placeholder'))box.insertAdjacentHTML('beforeend','<span class="mobile-product-placeholder">تصویر محصول</span>');
      },{once:true});
    });
    shelf.querySelectorAll('[data-mobile-add]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const id=String(btn.dataset.mobileAdd||'');
        const original=[...document.querySelectorAll('#productGrid .add')].find(x=>String(x.getAttribute('onclick')||'').includes(`add(${id})`));
        if(original){original.click();return;}
        if(typeof globalThis.add==='function'){globalThis.add(Number(id));return;}
        location.href=btn.dataset.productHref||'/';
      });
    });
  }

  async function initProductShelf(){
    if(!matchMedia('(max-width:760px)').matches)return;
    const layoutSettings=await (globalThis.HomeLayoutV1?.ready||Promise.resolve({})).catch(()=>({}));
    if(String(layoutSettings.home_mobile_show_products??'1')==='0')return;
    const shelf=productShelfShell();
    if(!shelf||shelf.dataset.productsReady==='ready')return;
    shelf.dataset.productsReady='loading';
    const grid=shelf.querySelector('[data-mobile-product-grid]');
    const count=shelf.querySelector('[data-mobile-product-count]');
    const more=shelf.querySelector('[data-mobile-product-more]');
    try{
      const res=await fetch('/api/products',{cache:'no-store'});
      if(!res.ok)throw new Error('products');
      const data=await res.json();
      const items=normalizedProducts(data.products);
      if(!items.length)throw new Error('empty');
      const requested=['4','8','12'].includes(String(layoutSettings.home_mobile_product_count))?Number(layoutSettings.home_mobile_product_count):8;
      let shown=Math.min(requested,items.length);
      const render=()=>{
        grid.innerHTML=items.slice(0,shown).map(productCard).join('');
        count.textContent=`${new Intl.NumberFormat('fa-IR').format(shown)} از ${new Intl.NumberFormat('fa-IR').format(items.length)}`;
        more.hidden=shown>=items.length;
        more.textContent=shown>=items.length?'':`نمایش ${new Intl.NumberFormat('fa-IR').format(Math.min(4,items.length-shown))} محصول دیگر`;
        bindShelfInteractions(shelf);
      };
      more.addEventListener('click',()=>{shown=Math.min(shown+4,items.length);render()});
      render();
      shelf.dataset.productsReady='ready';
      document.dispatchEvent(new CustomEvent('home:mobile-shelf-ready',{detail:{shown,total:items.length}}));
    }catch(e){
      shelf.dataset.productsReady='error';
      count.textContent='—';
      grid.innerHTML='<div class="mobile-product-shelf-error" style="grid-column:1/-1">محصولات در حال حاضر بارگذاری نشدند. از دسته‌بندی‌های بالا وارد فهرست کالاها شوید.</div>';
      more.hidden=true;
    }
  }

  function init(){
    if(location.pathname!=='/'&&location.pathname!=='')return;
    const existing=document.getElementById('advancedProductFilters');
    if(existing)enhance(existing);else{
      const observer=new MutationObserver(()=>{
        const box=document.getElementById('advancedProductFilters');
        if(box){enhance(box);observer.disconnect()}
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }

    if(document.getElementById('homeV2Categories'))initProductShelf();else{
      const shelfObserver=new MutationObserver(()=>{
        if(document.getElementById('homeV2Categories')){initProductShelf();shelfObserver.disconnect()}
      });
      shelfObserver.observe(document.body,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

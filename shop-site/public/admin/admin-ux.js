// admin-ux-v1
// qa-retrigger: hidden quick-payment regression coverage
(()=>{
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const panel=document.getElementById('panel');
    if(!panel)return;
    const style=document.createElement('style');
    style.id='admin-ux-v1';
    style.textContent=`
      .admin-quick-nav{position:sticky;top:8px;z-index:30;display:flex;gap:7px;overflow-x:auto;align-items:center;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border:1px solid #e5e7eb;border-radius:16px;padding:8px;margin-bottom:12px;box-shadow:0 8px 24px rgba(17,24,39,.08);scrollbar-width:thin}
      .admin-quick-nav button{white-space:nowrap;border:1px solid #e5e7eb;background:#fff;color:#344054;border-radius:999px;padding:8px 12px;font-weight:800;font-size:11px;cursor:pointer}
      .admin-quick-nav button.primary{background:#a60f18;border-color:#a60f18;color:#fff}
      .admin-quick-nav button.warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
      .admin-secondary-section{position:relative}
      .admin-secondary-section .admin-secondary-label{display:inline-flex;align-items:center;gap:6px;border:1px solid #e5e7eb;background:#f8fafc;color:#475467;border-radius:999px;padding:4px 9px;font-size:9px;font-weight:800;margin-right:6px}
      .admin-section-toggle{border:1px solid #e5e7eb!important;background:#fff!important;color:#344054!important}
      .admin-secondary-section.admin-section-collapsed>.grid,
      .admin-secondary-section.admin-section-collapsed>#productCount,
      .admin-secondary-section.admin-section-collapsed>#products,
      .admin-secondary-section.admin-section-collapsed>#orders,
      .admin-secondary-section.admin-section-collapsed>.payment-test-box{display:none!important}
      .admin-secondary-section.admin-section-collapsed{padding-bottom:12px}
      .admin-focus-ring{animation:adminPulse 1.1s ease}
      @keyframes adminPulse{0%{box-shadow:0 0 0 0 rgba(166,15,24,.30)}100%{box-shadow:0 0 0 12px rgba(166,15,24,0)}}
      @media(max-width:720px){.admin-quick-nav{top:4px;border-radius:13px;margin-left:-4px;margin-right:-4px}.admin-quick-nav button{padding:8px 10px;font-size:10px}.admin-secondary-section .toolbar>div:first-child{min-width:0}}
    `;
    document.head.appendChild(style);

    function installEditorStatePreserver(){
      if(window.__adminProductEditorStateV1||typeof window.loadProducts!=='function')return;
      window.__adminProductEditorStateV1=true;
      const rawLoadProducts=window.loadProducts;
      let forcedSlug='';
      document.addEventListener('click',e=>{
        const button=e.target.closest?.('.uploadImage,.deleteImage,.save');
        if(!button)return;
        const card=button.closest('.prod[data-slug]');
        if(card)forcedSlug=card.dataset.slug||'';
      },true);
      window.loadProducts=async function(...args){
        const openSlugs=new Set([...document.querySelectorAll('#products .prod[data-slug]')].filter(card=>card.querySelector('details.advanced:not(.manageProductActions)')?.open).map(card=>card.dataset.slug));
        if(forcedSlug)openSlugs.add(forcedSlug);
        try{return await rawLoadProducts.apply(this,args)}finally{
          openSlugs.forEach(slug=>{
            const card=[...document.querySelectorAll('#products .prod[data-slug]')].find(x=>x.dataset.slug===slug);
            const details=card?.querySelector('details.advanced:not(.manageProductActions)');
            if(details)details.open=true;
          });
          forcedSlug='';
        }
      };
    }
    installEditorStatePreserver();

    const waitForShell=()=>{
      const shell=panel.querySelector('.commerce-shell');
      if(!shell){setTimeout(waitForShell,40);return}
      if(document.getElementById('adminQuickNav'))return;

      const cards=[...panel.children].filter(el=>el.matches?.('section.card')&&!el.classList.contains('commerce-shell'));
      const productSection=cards.find(s=>s.querySelector('#products'));
      const orderSection=cards.find(s=>s.querySelector('#orders'));

      function prepareSecondary(section,type){
        if(!section)return;
        section.classList.add('admin-secondary-section');
        if(type==='orders')section.classList.add('admin-section-collapsed');
        section.dataset.secondaryType=type;
        const toolbar=section.querySelector('.toolbar');
        const title=toolbar?.querySelector('h2');
        const desc=toolbar?.querySelector('.mut');
        if(type==='products'){
          if(title)title.textContent='محصولات، تصاویر و SEO';
          if(desc)desc.textContent='جستجو و ویرایش جزئیات کامل محصول، عکس اصلی، گالری، مشخصات فنی و SEO.';
        }else{
          if(title)title.textContent='عملیات سریع سفارش و پرداخت';
          if(desc)desc.textContent='کنترل‌های پرداخت و نمای سریع سفارش‌ها؛ مدیریت کامل سفارش از تب «سفارش‌ها» انجام می‌شود.';
        }
        if(toolbar){
          const actions=toolbar.lastElementChild;
          const toggle=document.createElement('button');
          toggle.type='button';toggle.className='btn gray admin-section-toggle';
          toggle.textContent=section.classList.contains('admin-section-collapsed')?'باز کردن':'جمع کردن';
          toggle.onclick=()=>setCollapsed(section,!section.classList.contains('admin-section-collapsed'),true);
          if(actions&&actions!==toolbar.firstElementChild)actions.appendChild(toggle);else toolbar.appendChild(toggle);
          const badge=document.createElement('span');badge.className='admin-secondary-label';badge.textContent=type==='products'?'ویرایش کامل':'بخش تکمیلی';title?.insertAdjacentElement('afterend',badge);
        }
      }
      function setCollapsed(section,collapsed,scroll=false){
        if(!section)return;
        section.classList.toggle('admin-section-collapsed',collapsed);
        const b=section.querySelector('.admin-section-toggle');if(b)b.textContent=collapsed?'باز کردن':'جمع کردن';
        if(!collapsed&&scroll){section.scrollIntoView({behavior:'smooth',block:'start'});section.classList.remove('admin-focus-ring');requestAnimationFrame(()=>section.classList.add('admin-focus-ring'))}
      }
      prepareSecondary(productSection,'products');
      prepareSecondary(orderSection,'orders');

      const nav=document.createElement('nav');nav.id='adminQuickNav';nav.className='admin-quick-nav';nav.setAttribute('aria-label','دسترسی سریع مدیریت');
      nav.innerHTML=`
        <button type="button" class="primary" data-admin-pane="dash">داشبورد</button>
        <button type="button" data-admin-pane="newProduct">＋ محصول جدید</button>
        <button type="button" data-admin-target="products">محصولات و تصاویر</button>
        <button type="button" data-admin-pane="orderManager">سفارش‌ها</button>
        <button type="button" class="warn" data-admin-target="orders">پرداخت سریع</button>
        <button type="button" data-admin-pane="reports">گزارش‌ها</button>
        <button type="button" data-admin-pane="inventory">انبار</button>
        <button type="button" data-admin-pane="customers">مشتریان</button>
        <button type="button" data-admin-pane="settings">تنظیمات</button>`;
      panel.insertBefore(nav,shell);

      function activatePane(name){
        const selector=`.commerce-tab[data-pane="${String(name).replace(/"/g,'\\"')}"]`;
        const tab=document.querySelector(selector);
        if(tab){tab.click();shell.scrollIntoView({behavior:'smooth',block:'start'});shell.classList.remove('admin-focus-ring');requestAnimationFrame(()=>shell.classList.add('admin-focus-ring'))}
      }
      nav.addEventListener('click',e=>{
        const button=e.target.closest('button');if(!button)return;
        if(button.dataset.adminPane)return activatePane(button.dataset.adminPane);
        if(button.dataset.adminTarget==='products')setCollapsed(productSection,false,true);
        if(button.dataset.adminTarget==='orders')setCollapsed(orderSection,false,true);
      });

      document.addEventListener('shop:products',()=>{
        const count=document.querySelectorAll('#products .prod').length;
        const b=nav.querySelector('[data-admin-target="products"]');
        if(b&&count)b.textContent=`محصولات و تصاویر (${new Intl.NumberFormat('fa-IR').format(count)})`;
      });
    };
    waitForShell();
  });
})();

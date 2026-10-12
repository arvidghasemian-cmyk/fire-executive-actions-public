(()=>{
  const homePath=()=>location.pathname==='/'||location.pathname==='';

  const icons={
    brand:`<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M25 5c2.2 7-1.7 10.2-5 13.3-2.7 2.6-5 5-5 9.2 0 6.2 4.5 10.5 10.7 10.5 6.4 0 11.3-4.5 11.3-11 0-5.4-3.1-9.1-7.3-12.7.2 3.9-1.4 6.4-4.1 8.7.1-5.5-3-8.6-.6-18Z" fill="currentColor" opacity=".97"/><path d="M24.7 24.3c-3 2.4-4.8 4.4-4.8 7.2 0 3.1 2.2 5.4 5.5 5.4 3.1 0 5.5-2.3 5.5-5.5 0-2.5-1.5-4.7-3.7-6.9.1 1.9-.6 3.4-2 4.7.1-2.1-.4-3.5-.5-4.9Z" fill="#ffd766"/></svg>`,
    cart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>`,
    search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`
  };

  function originalHeader(){return document.querySelector('.header')}

  function originalSearchParts(){
    const header=originalHeader();
    const box=header?.querySelector('.search');
    return {input:box?.querySelector('input')||null,button:box?.querySelector('button')||null};
  }

  function originalCartButton(){
    const header=originalHeader();
    if(!header)return null;
    return header.querySelector('[aria-label*="سبد"],[title*="سبد"],#cartBtn,.cart-btn,.icon-btn')||
      [...header.querySelectorAll('button')].find(btn=>!btn.closest('.search'))||null;
  }

  function extractCartCount(){
    const header=originalHeader();
    const source=header?.querySelector('[id*="cart" i][id*="count" i],[class*="cart" i][class*="count" i],.icon-btn .badge,.icon-btn [class*="badge" i]');
    const raw=(source?.textContent||originalCartButton()?.textContent||'').trim();
    const match=raw.match(/[0-9۰-۹٠-٩]+/);
    return match?match[0]:'۰';
  }

  function syncCartCount(node){
    if(node)node.textContent=extractCartCount();
  }

  function activateSearch(value){
    const q=String(value||'').trim();
    const {input,button}=originalSearchParts();
    if(input){
      input.value=q;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    document.body.classList.toggle('mobile-search-active',Boolean(q));
    if(q){
      if(button)button.click();
      else input?.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));
      setTimeout(()=>document.getElementById('products')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }
  }

  function openCart(){
    const source=originalCartButton();
    if(source){source.click();return;}
    const drawer=document.getElementById('drawer');
    if(drawer){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false')}
  }

  function upgradeBrandLogo(shell){
    const brand=shell?.querySelector('.mobile-header-v1-brand');
    if(!brand||brand.dataset.logoV3==='ready')return;
    const img=new Image();
    img.className='mobile-header-v1-brand-logo-img';
    img.alt='سروش ایمنی شهر — فروش تجهیزات ایمنی و آتش‌نشانی';
    img.width=300;img.height=99;
    img.decoding='async';img.fetchPriority='high';
    img.addEventListener('load',()=>{
      brand.dataset.logoV3='ready';
      brand.classList.add('mobile-header-v1-brand-logo-ready');
      brand.replaceChildren(img);
    },{once:true});
    img.src='/assets/brand/soroush-logo-header-v2.webp?v=2';
  }

  function mount(){
    if(!homePath()||document.querySelector('.mobile-header-v1'))return;
    const legacy=originalHeader();
    if(!legacy)return;

    const shell=document.createElement('section');
    shell.className='mobile-header-v1';
    shell.setAttribute('aria-label','هدر فروشگاه');
    shell.innerHTML=`<div class="mobile-header-v1-card"><div class="mobile-header-v1-top"><a class="mobile-header-v1-brand" href="/" aria-label="سروش ایمنی شهر"><span class="mobile-header-v1-art">${icons.brand}</span><span class="mobile-header-v1-copy"><strong>سروش ایمنی شهر</strong><small>تجهیزات تخصصی ایمنی و آتش‌نشانی</small></span></a><button class="mobile-header-v1-cart" type="button" aria-label="باز کردن سبد خرید">${icons.cart}<span class="mobile-header-v1-cart-count" data-mobile-header-cart-count>${extractCartCount()}</span></button></div><form class="mobile-header-v1-search" role="search"><span class="mobile-header-v1-search-icon">${icons.search}</span><input type="search" autocomplete="off" enterkeyhint="search" aria-label="جستجوی محصولات" placeholder="جستجوی کپسول، دتکتور، اسپرینکلر و..."><button type="submit">جستجو</button></form></div>`;

    legacy.insertAdjacentElement('afterend',shell);
    upgradeBrandLogo(shell);
    const input=shell.querySelector('input[type="search"]');
    const form=shell.querySelector('form');
    const cart=shell.querySelector('.mobile-header-v1-cart');
    const count=shell.querySelector('[data-mobile-header-cart-count]');

    const original=originalSearchParts().input;
    if(original?.value)input.value=original.value;

    input.addEventListener('input',()=>{
      const value=input.value;
      const parts=originalSearchParts();
      if(parts.input){parts.input.value=value;parts.input.dispatchEvent(new Event('input',{bubbles:true}))}
      if(!String(value).trim())document.body.classList.remove('mobile-search-active');
    });
    form.addEventListener('submit',e=>{e.preventDefault();activateSearch(input.value)});
    cart.addEventListener('click',openCart);

    const observer=new MutationObserver(()=>syncCartCount(count));
    observer.observe(legacy,{childList:true,subtree:true,characterData:true,attributes:true});

    const navSearch=document.querySelector('.storefront-mobile-nav [data-v2-search]');
    navSearch?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      shell.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>input.focus(),180);
    },true);

    document.body.classList.add('mobile-header-v1-ready');
    document.documentElement.dataset.mobileHeaderV1='ready';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

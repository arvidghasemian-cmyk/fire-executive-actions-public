(()=>{
  const path=location.pathname.replace(/\/+/g,'/');
  if(!/^\/product\/[^/]+\/?$/.test(path)||document.querySelector('.product-mobile-cta-v1'))return;
  const panel=document.querySelector('.product-buy-panel');
  const add=panel?.querySelector('#productAddBtn');
  if(!panel||!add)return;
  const mode=panel.dataset.productMode==='quote'?'quote':'priced';
  const meta=panel.querySelector('.product-buy-meta');
  const bar=document.createElement('div');
  bar.className='product-mobile-cta-v1';
  bar.dataset.mode=mode;
  bar.innerHTML=`<div class="product-mobile-cta-copy"><strong>${mode==='quote'?'استعلام این محصول':'خرید این محصول'}</strong><span></span></div><button type="button" class="product-mobile-cta-button"></button>`;
  const copy=bar.querySelector('span'),button=bar.querySelector('button');
  const sync=()=>{
    button.textContent=add.textContent.trim();
    button.disabled=add.disabled;
    const msg=panel.querySelector('#productCartMsg')?.textContent?.trim();
    copy.textContent=msg||meta?.textContent?.trim()||'';
  };
  button.addEventListener('click',()=>{
    if(add.disabled)return;
    add.click();
    setTimeout(sync,80);
  });
  new MutationObserver(sync).observe(add,{attributes:true,childList:true,characterData:true,subtree:true});
  if(meta)new MutationObserver(sync).observe(meta,{childList:true,characterData:true,subtree:true});
  sync();
  document.body.appendChild(bar);
  document.body.classList.add('product-mobile-cta-ready');
})();
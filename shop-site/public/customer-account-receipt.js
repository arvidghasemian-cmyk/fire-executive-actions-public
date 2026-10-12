(()=>{
  const MARK='customer-account-receipt-v1';
  if(window[MARK])return;window[MARK]=true;
  function enhance(){
    document.querySelectorAll('.order').forEach(order=>{
      if(order.querySelector('.customer-account-receipt'))return;
      const code=(order.querySelector('.order-head strong')?.textContent||'').trim();
      const actions=order.querySelector('.actions');
      if(!code||!actions)return;
      const a=document.createElement('a');
      a.className='btn gray customer-account-receipt';
      a.href='/api/customer/orders/'+encodeURIComponent(code)+'/receipt';
      a.target='_blank';a.rel='noopener';a.textContent='رسید / PDF';
      actions.appendChild(a);
    });
  }
  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',enhance,{once:true});
  enhance();
})();

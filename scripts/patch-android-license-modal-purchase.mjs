import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');
const MARKER='FEP-ANDROID-LICENSE-MODAL-PURCHASE-v2';
if(s.includes(MARKER)){console.log('Android license modal purchase actions already present');process.exit(0);}
const bodyClose=s.lastIndexOf('</body>');
if(bodyClose<0)throw new Error('Android license modal purchase patch aborted: </body> not found');

const block=String.raw`<script>
/* FEP-ANDROID-LICENSE-MODAL-PURCHASE-v2 — single purchase entry plus recovery from license status modal */
(()=>{
'use strict';
function closeStatusModal(){
  const modal=document.getElementById('fepLicenseModal')||document.getElementById('licenseModal');
  if(!modal)return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
}
function openPurchase(){
  if(!window.FEPBilling?.openPurchase){
    if(typeof toast==='function')toast('بخش خرید هنوز آماده نشده است.','err');
    return;
  }
  closeStatusModal();
  window.FEPBilling.openPurchase();
}
function openRecovery(){
  if(!window.FEPBilling?.openRecovery){
    if(typeof toast==='function')toast('بازیابی خرید هنوز آماده نشده است.','err');
    return;
  }
  closeStatusModal();
  window.FEPBilling.openRecovery();
}
function attachActions(){
  const modal=document.getElementById('fepLicenseModal')||document.getElementById('licenseModal');
  if(!modal)return false;
  const body=document.getElementById('fepLicenseModalBody')||document.getElementById('modalBody');
  if(!body)return false;
  let box=document.getElementById('fepBillingModalActions');
  if(box)return true;
  box=document.createElement('div');
  box.id='fepBillingModalActions';
  box.style.cssText='display:grid;grid-template-columns:1fr;gap:8px;margin-top:14px';
  box.innerHTML='<button id="fepModalBuySubscription" type="button" style="background:#9f1d27;color:#fff;font-weight:800;min-height:46px">خرید اشتراک</button><button id="fepModalRecoverPurchase" type="button" style="background:#334155;color:#fff;font-weight:800;min-height:42px">بازیابی خرید قبلی</button>';
  const actions=modal.querySelector('.actions');
  if(actions)actions.insertAdjacentElement('beforebegin',box);else body.insertAdjacentElement('afterend',box);
  box.querySelector('#fepModalBuySubscription').addEventListener('click',openPurchase);
  box.querySelector('#fepModalRecoverPurchase').addEventListener('click',openRecovery);
  return true;
}
function init(){
  attachActions();
  const observer=new MutationObserver(()=>attachActions());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(attachActions,250);
  setTimeout(attachActions,750);
  setTimeout(attachActions,1600);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
</script>
`;
s=s.slice(0,bodyClose)+block+s.slice(bodyClose);
if(!s.includes(MARKER))throw new Error('Android license modal purchase marker missing');
await writeFile(path,s,'utf8');
console.log('Android license status modal simplified purchase/recovery actions applied');

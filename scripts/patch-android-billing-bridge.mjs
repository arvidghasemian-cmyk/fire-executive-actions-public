import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');
const MARKER='FEP-ANDROID-BILLING-BRIDGE-v1';
if(s.includes(MARKER)){console.log('Android billing bridge already present');process.exit(0);}
const bodyClose=s.lastIndexOf('</body>');
if(bodyClose<0)throw new Error('Android billing bridge aborted: </body> not found');
const block=String.raw`<style id="fepBillingBridgeStyle">html.fep-auth-pending body>#fepBillingOverlay{visibility:visible!important}</style>
<script>
/* FEP-ANDROID-BILLING-BRIDGE-v1 — expired license + first-run recovery bridge */
(()=>{
'use strict';
async function reconcileExpired(){
  if(typeof LicenseManager==='undefined')return;
  try{
    const st=await LicenseManager.checkStatus();
    if(st?.status==='invalid'&&st?.reason==='expired'){
      window.__fepTrialExpired=true;
      document.documentElement.classList.remove('fep-auth-pending');
      document.getElementById('fepTrialOnboard')?.remove();
      setTimeout(()=>window.FEPBilling?.openPurchase?.(),250);
    }
  }catch(_){}
}
function injectRecovery(){
  const card=document.getElementById('fepTrialCard');
  if(!card||document.getElementById('fepTrialRecoverBilling'))return;
  const b=document.createElement('button');
  b.id='fepTrialRecoverBilling';
  b.type='button';
  b.textContent='قبلاً خریده‌ام؛ بازیابی خرید';
  b.style.background='#334155';
  b.onclick=()=>window.FEPBilling?.openRecovery?.();
  card.appendChild(b);
}
const observer=new MutationObserver(()=>injectRecovery());
observer.observe(document.documentElement,{childList:true,subtree:true});
function init(){injectRecovery();reconcileExpired();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('load',()=>setTimeout(init,400));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(init,150);});
})();
</script>
`;
s=s.slice(0,bodyClose)+block+s.slice(bodyClose);
if(!s.includes(MARKER))throw new Error('Android billing bridge marker missing');
await writeFile(path,s,'utf8');
console.log('Android expired/recovery billing bridge applied');

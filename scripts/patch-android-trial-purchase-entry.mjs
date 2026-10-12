import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');
const MARKER='FEP-ANDROID-TRIAL-PURCHASE-ENTRY-v1';
if(s.includes(MARKER)){console.log('Android Trial purchase entry already present');process.exit(0);}
const bodyClose=s.lastIndexOf('</body>');
if(bodyClose<0)throw new Error('Android Trial purchase entry patch aborted: </body> not found');

const block=String.raw`<script>
/* FEP-ANDROID-TRIAL-PURCHASE-ENTRY-v1 — persistent purchase/recovery actions on the mandatory Trial gate */
(()=>{
'use strict';
let scheduled=false;
function setMessage(text){
  const msg=document.getElementById('fepTrialMsg');
  if(msg)msg.textContent=text||'';
}
function callBilling(method){
  let tries=0;
  const run=()=>{
    const fn=window.FEPBilling&&window.FEPBilling[method];
    if(typeof fn==='function'){fn();return;}
    if(++tries<20){setTimeout(run,100);return;}
    setMessage('بخش خرید هنوز آماده نشده است. چند لحظه بعد دوباره تلاش کنید.');
  };
  run();
}
function ensureActions(){
  scheduled=false;
  const card=document.getElementById('fepTrialCard');
  if(!card)return false;
  let box=document.getElementById('fepTrialPurchaseActions');
  if(!box){
    box=document.createElement('div');
    box.id='fepTrialPurchaseActions';
    box.style.cssText='margin-top:16px;padding-top:14px;border-top:1px solid #334155';
    box.innerHTML='<div style="font-size:12px;line-height:1.8;color:#cbd5e1;margin-bottom:4px">دوره آزمایشی شما تمام شده یا قبلاً از آن استفاده کرده‌اید؟</div><button id="fepTrialBuySubscription" type="button">خرید اشتراک</button><button id="fepTrialRecoverPurchase" type="button" style="background:#334155">بازیابی خرید قبلی</button>';
    card.appendChild(box);
  }
  const legacyRecovery=document.getElementById('fepTrialRecoverBilling');
  if(legacyRecovery)legacyRecovery.style.display='none';
  const buy=document.getElementById('fepTrialBuySubscription');
  const recover=document.getElementById('fepTrialRecoverPurchase');
  if(buy&&!buy.dataset.fepBound){buy.dataset.fepBound='1';buy.addEventListener('click',()=>callBilling('openPurchase'));}
  if(recover&&!recover.dataset.fepBound){recover.dataset.fepBound='1';recover.addEventListener('click',()=>callBilling('openRecovery'));}
  return true;
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(ensureActions,60);}
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.addEventListener('load',()=>{schedule();setTimeout(schedule,400);setTimeout(schedule,1200);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
window.FEPTrialPurchaseEntry={ensure:ensureActions,openPurchase:()=>callBilling('openPurchase'),openRecovery:()=>callBilling('openRecovery')};
})();
</script>
`;
s=s.slice(0,bodyClose)+block+s.slice(bodyClose);
if(!s.includes(MARKER)||!s.includes('fepTrialBuySubscription')||!s.includes('fepTrialRecoverPurchase'))throw new Error('Android Trial purchase entry marker/actions missing');
await writeFile(path,s,'utf8');
console.log('Android Trial gate purchase/recovery actions applied');

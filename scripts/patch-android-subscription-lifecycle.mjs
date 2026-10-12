import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');
const MARKER='FEP-ANDROID-SUBSCRIPTION-LIFECYCLE-v1';
if(s.includes(MARKER)){console.log('Android subscription lifecycle patch already present');process.exit(0);}
const bodyClose=s.lastIndexOf('</body>');
if(bodyClose<0)throw new Error('Android subscription lifecycle patch aborted: </body> not found');

const block=String.raw`<script>
/* FEP-ANDROID-SUBSCRIPTION-LIFECYCLE-v1 — active renewal + remaining days + paid expiry UX without deleting local data */
(()=>{
'use strict';
let lastStatus=null;
let wrapped=false;
let scheduled=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const daysLeft=st=>st?.expiresAt?Math.max(0,Math.ceil((new Date(st.expiresAt)-new Date())/86400000)):null;
const isPaidProfessional=st=>st?.plan?.type==='professional'&&st?.plan?.trial!==true;
const isPaidActive=st=>st?.status==='active'&&isPaidProfessional(st);
const isPaidExpired=st=>st?.status==='invalid'&&st?.reason==='expired'&&isPaidProfessional(st);
const isTrialExpired=st=>st?.status==='invalid'&&st?.reason==='expired'&&st?.plan?.trial===true;
const setText=(el,value)=>{const v=String(value??'');if(el&&el.textContent!==v)el.textContent=v;};

function faDate(value){
  if(!value)return '—';
  const d=new Date(value);
  return Number.isFinite(d.getTime())?d.toLocaleDateString('fa-IR'):'—';
}
function purchaseLabel(st){return (isPaidActive(st)||isPaidExpired(st))?'تمدید اشتراک':'خرید اشتراک';}
function purchaseTitle(st){
  if(isPaidExpired(st))return 'تمدید اشتراک منقضی‌شده';
  if(isPaidActive(st))return 'تمدید اشتراک حرفه‌ای';
  return 'خرید نسخه حرفه‌ای';
}
function purchaseIntro(st){
  if(isPaidExpired(st))return 'اشتراک حرفه‌ای شما به پایان رسیده است. اطلاعات و پروژه‌های قبلی روی دستگاه حذف نمی‌شوند. یکی از دوره‌ها را برای تمدید انتخاب کنید.';
  if(isPaidActive(st)){
    const left=daysLeft(st);
    return 'اشتراک حرفه‌ای شما فعال است'+(left!==null?' و '+left+' روز اعتبار باقی مانده است.':'')+' با تمدید، مدت جدید به اعتبار فعلی اضافه می‌شود.';
  }
  if(isTrialExpired(st))return 'دوره آزمایشی به پایان رسیده است. برای ادامه استفاده از قابلیت‌های حرفه‌ای، یکی از دوره‌ها را انتخاب کنید.';
  return 'یکی از دوره‌ها را انتخاب کنید. مبلغ و شرایط از سرور دریافت می‌شود و داخل APK قابل تغییر نیست.';
}
function unlockExpired(st){
  if(st?.status!=='invalid'||st?.reason!=='expired')return;
  document.documentElement.classList.remove('fep-auth-pending');
  document.getElementById('fepTrialOnboard')?.remove();
  if(isPaidExpired(st)){
    window.__fepSubscriptionExpired=true;
    window.__fepTrialExpired=false;
  }else if(isTrialExpired(st)){
    window.__fepTrialExpired=true;
  }
}
function renderVisibleLicense(st){
  const section=document.getElementById('licenseSection');
  const card=document.getElementById('licenseCard');
  if(!section)return;
  if(isPaidExpired(st)){
    if(card)card.style.display='none';
    let expired=document.getElementById('fepSubscriptionExpiredCard');
    if(!expired){
      section.innerHTML='<div id="fepSubscriptionExpiredCard" style="background:rgba(127,29,29,.12);padding:15px;border-radius:10px;border:1px solid rgba(248,113,113,.48)"><strong style="color:#fca5a5">اشتراک حرفه‌ای منقضی شده است</strong><div style="margin-top:9px;line-height:1.9;font-size:12px"><div>اعتبار قبلی تا: <b>'+esc(faDate(st.expiresAt))+'</b></div><div style="margin-top:7px;color:#cbd5e1">اطلاعات، پروژه‌ها و سوابق قبلی شما حذف نمی‌شوند.</div></div><button id="fepExpiredRenew" type="button" style="width:100%;margin-top:12px;padding:11px;border:0;border-radius:9px;background:#9f1d27;color:#fff;font:inherit;font-weight:800">تمدید اشتراک</button></div>';
      expired=document.getElementById('fepSubscriptionExpiredCard');
    }
    const renew=document.getElementById('fepExpiredRenew');
    if(renew)renew.onclick=()=>window.FEPBilling?.openPurchase?.();
    return;
  }
  if(!isPaidActive(st))return;
  const host=document.getElementById('fepActiveLicenseCard')||document.getElementById('fepAndroidLicenseActive')||section.firstElementChild;
  if(!host)return;
  let panel=document.getElementById('fepLicenseLifecyclePanel');
  if(!panel){panel=document.createElement('div');panel.id='fepLicenseLifecyclePanel';panel.style.cssText='margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,.22);font-size:12px;line-height:1.9';host.appendChild(panel);}
  const left=daysLeft(st);
  const html='<div>روزهای باقی‌مانده: <b>'+(left===null?'—':esc(left))+'</b></div><button id="fepLifecycleRenew" type="button" style="width:100%;margin-top:9px;padding:10px;border:0;border-radius:9px;background:#9f1d27;color:#fff;font:inherit;font-weight:800">تمدید اشتراک</button>';
  if(panel.innerHTML!==html)panel.innerHTML=html;
  const renew=document.getElementById('fepLifecycleRenew');
  if(renew)renew.onclick=()=>window.FEPBilling?.openPurchase?.();
}
function renderBillingCard(st){
  const box=document.getElementById('fepBillingCard');
  if(!box)return;
  const h=box.querySelector('h3'),p=box.querySelector('p'),b=box.querySelector('#fepBuyOpen');
  setText(h,(isPaidActive(st)||isPaidExpired(st))?'تمدید و مدیریت اشتراک':'خرید و مدیریت مجوز');
  setText(p,isPaidExpired(st)?'اشتراک شما منقضی شده است. اطلاعات قبلی محفوظ می‌ماند و با تمدید دوباره قابل استفاده است.':isPaidActive(st)?'اشتراک حرفه‌ای فعال است. برای افزودن اعتبار می‌توانید اشتراک را تمدید کنید.':'نسخه حرفه‌ای را به‌صورت ماهانه یا سالانه تهیه کنید. خریدهای قبلی نیز با تأیید شماره موبایل قابل بازیابی هستند.');
  if(b){setText(b,purchaseLabel(st));b.onclick=()=>window.FEPBilling?.openPurchase?.();}
}
function renderModal(st){
  const box=document.getElementById('fepBillingModalActions');
  const buy=document.getElementById('fepModalBuySubscription');
  if(!box||!buy)return;
  setText(buy,purchaseLabel(st));
  let hint=document.getElementById('fepModalSubscriptionHint');
  if(!hint){hint=document.createElement('div');hint.id='fepModalSubscriptionHint';hint.style.cssText='padding:10px 11px;border-radius:9px;background:rgba(15,23,42,.62);color:#cbd5e1;font-size:11px;line-height:1.8;text-align:right';box.insertAdjacentElement('afterbegin',hint);}
  let text='برای فعال‌سازی امکانات حرفه‌ای می‌توانید اشتراک ماهانه یا سالانه تهیه کنید.';
  if(isPaidActive(st)){
    const left=daysLeft(st);
    text='اشتراک حرفه‌ای فعال است'+(left!==null?' — '+left+' روز باقی‌مانده':'')+'. تمدید، مدت جدید را به اعتبار فعلی اضافه می‌کند.';
  }else if(isPaidExpired(st))text='اشتراک حرفه‌ای منقضی شده است. اطلاعات قبلی شما حذف نشده و با تمدید دوباره در دسترس خواهد بود.';
  else if(isTrialExpired(st))text='دوره آزمایشی پایان یافته است. برای ادامه استفاده از امکانات حرفه‌ای اشتراک تهیه کنید.';
  setText(hint,text);
}
function tunePurchaseOverlay(st){
  const root=document.getElementById('fepBillingOverlay');
  if(!root)return;
  setText(root.querySelector('#fepBillingBox h2'),purchaseTitle(st));
  setText(root.querySelector('#fepBillingBody > p'),purchaseIntro(st));
  root.querySelectorAll('.fepPlan button').forEach(b=>{if(!b.disabled&&(isPaidActive(st)||isPaidExpired(st)))setText(b,'پرداخت و تمدید');});
}
function wrapPurchase(){
  if(wrapped||!window.FEPBilling?.openPurchase)return;
  const original=window.FEPBilling.openPurchase.bind(window.FEPBilling);
  window.FEPBilling.openPurchase=async()=>{
    let st=lastStatus;
    try{if(typeof LicenseManager!=='undefined')st=await LicenseManager.checkStatus();}catch(_){}
    lastStatus=st||lastStatus;
    await original();
    tunePurchaseOverlay(lastStatus);
    setTimeout(()=>tunePurchaseOverlay(lastStatus),250);
  };
  wrapped=true;
}
async function sync(){
  scheduled=false;
  if(typeof LicenseManager==='undefined'){setTimeout(schedule,180);return;}
  try{
    const st=await LicenseManager.checkStatus();
    lastStatus=st;
    try{window.__fepActiveLicenseStatus=st;}catch(_){}
    unlockExpired(st);
    wrapPurchase();
    renderVisibleLicense(st);
    renderBillingCard(st);
    renderModal(st);
    tunePurchaseOverlay(st);
  }catch(_){}
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(sync,80);}

const observer=new MutationObserver(()=>schedule());
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.addEventListener('load',()=>{schedule();setTimeout(schedule,700);setTimeout(schedule,1700);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
document.addEventListener('click',()=>setTimeout(schedule,80),true);
window.FEPSubscriptionLifecycle={sync:schedule,getStatus:()=>lastStatus};
})();
</script>
`;
s=s.slice(0,bodyClose)+block+s.slice(bodyClose);
if(!s.includes(MARKER))throw new Error('Android subscription lifecycle marker missing');
await writeFile(path,s,'utf8');
console.log('Android subscription active/renew/expiry lifecycle patch applied');

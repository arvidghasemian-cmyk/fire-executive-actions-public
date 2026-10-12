import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');
const MARKER='FEP-ANDROID-LICENSE-GATES-QA-v5';
const MANDATORY_MARKER='FEP-ANDROID-MANDATORY-OTP-GATE-v1';
if(s.includes(MARKER)&&s.includes(MANDATORY_MARKER)){console.log('Android license gate/registration patch already present');process.exit(0);}
const headClose=s.lastIndexOf('</head>');
if(headClose<0) throw new Error('Android mandatory OTP gate patch aborted: </head> not found');
const headGuard=String.raw`<style id="fepMandatoryOtpGuardStyle">
html.fep-auth-pending body{overflow:hidden!important;background:#07111c!important}
html.fep-auth-pending body>*:not(#fepTrialOnboard){visibility:hidden!important}
html.fep-auth-pending #fepTrialOnboard{visibility:visible!important}
</style>
<script>/* FEP-ANDROID-MANDATORY-OTP-GATE-v1 */document.documentElement.classList.add('fep-auth-pending');</script>
`;
s=s.slice(0,headClose)+headGuard+s.slice(headClose);
const bodyClose=s.lastIndexOf('</body>');
if(bodyClose<0) throw new Error('Android license gate patch aborted: </body> not found');

const block=String.raw`<script>
/* FEP-ANDROID-LICENSE-GATES-QA-v5 — mandatory first-run OTP + signed 5-day Trial + entitlement gates */
(()=>{
'use strict';
const FEATURES={ncr:'ncr',gps:'gps',pdf:'report_pdf'};
const API='https://fire-executive-pro-api.arvidghasemian.workers.dev';
let qaMode='real';
const featureLabel={ncr:'NCR',gps:'GPS پروژه',report_pdf:'چاپ / ذخیره PDF'};
const activeStatus=()=>{try{return (typeof __fepActiveLicenseStatus!=='undefined'&&__fepActiveLicenseStatus)||null;}catch(_){return null;}};
function isDeveloper(){return activeStatus()?.status==='active'&&activeStatus()?.plan?.type==='developer';}
function allowed(feature){if(isDeveloper()&&qaMode==='free')return false;if(isDeveloper()&&qaMode==='trial')return true;const x=activeStatus();if(!x||x.status!=='active')return false;if(x.plan?.trial===true||x.plan?.type==='developer')return true;const f=Array.isArray(x.features)?x.features:[];return f.includes('*')||f.includes(feature);}
function deny(feature){const msg='این قابلیت در مجوز فعلی فعال نیست. برای استفاده از «'+(featureLabel[feature]||feature)+'» از بخش «مجوز» برنامه، مجوز مناسب را فعال کنید.';if(typeof toast==='function')toast('🔒 '+msg,'err');else alert(msg);}
function updateLockUi(){const n=!allowed(FEATURES.ncr),g=!allowed(FEATURES.gps),p=!allowed(FEATURES.pdf);document.querySelectorAll('.tabBtn[data-tab="ncr"],[data-smart-go="ncr"]').forEach(e=>e.toggleAttribute('data-fep-gate-locked',n));document.getElementById('btnPrint')?.toggleAttribute('data-fep-gate-locked',p);document.getElementById('peLocationSection')?.toggleAttribute('data-fep-gate-locked',g);}
function daysLeft(x){if(!x?.expiresAt)return null;const n=Math.max(0,Math.ceil((new Date(x.expiresAt)-new Date())/86400000));return x?.plan?.trial===true?Math.min(5,n):n;}
function syncLicenseUi(x){
  if(!x||x.status!=='active')return;
  const section=document.getElementById('licenseSection');
  const card=document.getElementById('licenseCard');
  if(card)card.style.display='none';
  if(!section)return;
  const trial=x.plan?.trial===true;
  const left=daysLeft(x);
  const expiry=x.expiresAt?new Date(x.expiresAt).toLocaleDateString('fa-IR'):'—';
  section.innerHTML='<div id="fepAndroidLicenseActive" style="background:rgba(22,101,52,.10);padding:15px;border-radius:10px;border:1px solid rgba(34,197,94,.45)"><strong style="color:#86efac">'+(trial?'دوره آزمایشی ۵ روزه فعال است':'مجوز فعال است')+'</strong>'+(trial&&left!==null?'<div style="margin-top:8px;font-size:12px">روز باقی‌مانده: <b>'+left+'</b></div>':'')+'<div style="margin-top:6px;font-size:11px;opacity:.8">اعتبار تا: '+expiry+'</div></div>';
}
function css(){if(document.getElementById('fepGateQaStyle'))return;const st=document.createElement('style');st.id='fepGateQaStyle';st.textContent='[data-fep-gate-locked]{opacity:.68!important;filter:saturate(.65)}#fepTrialOnboard{position:fixed;inset:0;z-index:2147483600;background:linear-gradient(180deg,#07111c,#0b1420);display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl;visibility:visible!important}#fepTrialCard{width:min(100%,430px);background:#111923;color:#fff;border:1px solid #334155;border-radius:18px;padding:20px;box-shadow:0 24px 70px #0008}#fepTrialCard h2{margin:0 0 8px;font-size:21px}#fepTrialCard p{color:#cbd5e1;line-height:1.8;font-size:13px}#fepTrialCard .privacyNote{margin-top:8px;padding:9px 10px;border-radius:9px;background:#0b1220;color:#94a3b8;font-size:11px;line-height:1.8}#fepTrialCard input{width:100%;box-sizing:border-box;margin:6px 0;padding:12px;border-radius:10px;border:1px solid #94a3b8;background:#f8fafc;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;caret-color:#0f172a;font:inherit}#fepTrialCard input::placeholder{color:#64748b;opacity:1}#fepTrialCard button{width:100%;padding:12px;margin-top:9px;border:0;border-radius:10px;background:#9f1d27;color:#fff;font:inherit;font-weight:800}#fepTrialCard button:disabled{opacity:.6}#fepTrialCard label{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#cbd5e1;line-height:1.7;margin-top:8px}#fepTrialCard label input{width:auto;margin-top:4px}#fepTrialMsg{min-height:22px;color:#fca5a5;font-size:12px;margin-top:8px}';document.head.appendChild(st);}
function unlockApp(){document.documentElement.classList.remove('fep-auth-pending');}
async function refreshLicense(){if(typeof LicenseManager==='undefined')return null;const x=await LicenseManager.checkStatus();try{window.__fepActiveLicenseStatus=x;}catch(_){}updateLockUi();syncLicenseUi(x);return x;}
function apiError(x){const m={INVALID_MOBILE:'شماره موبایل معتبر نیست.',OTP_RATE_LIMITED:'تعداد درخواست کد زیاد است. کمی بعد دوباره تلاش کنید.',OTP_INVALID:'کد تأیید صحیح نیست.',OTP_EXPIRED:'کد تأیید منقضی شده است.',TRIAL_ALREADY_USED:'دوره آزمایشی قبلاً برای این کاربر یا این نصب استفاده شده است.',PRIVACY_NOT_ACCEPTED:'پذیرش قوانین و حریم خصوصی الزامی است.'};return x?.message||m[x?.error]||'ارتباط با سرور انجام نشد.';}
function showOnboard(){
  if(document.getElementById('fepTrialOnboard'))return;
  if(typeof LicenseManager==='undefined'){setTimeout(showOnboard,150);return;}
  const root=document.createElement('div');root.id='fepTrialOnboard';
  root.innerHTML='<div id="fepTrialCard"><h2>ورود و فعال‌سازی دوره آزمایشی</h2><p>برای ورود به نرم‌افزار، نام و شماره موبایل خود را وارد کنید. یک کد تأیید برای شما پیامک می‌شود و بعد از تأیید، دوره آزمایشی ۵ روزه فعال خواهد شد.</p><div class="privacyNote">شماره موبایل پس از تأیید برای ایجاد حساب، مدیریت مجوز و سوابق دوره آزمایشی در سامانه ذخیره می‌شود.</div><input id="fepTrialName" autocomplete="name" placeholder="نام و نام خانوادگی"><input id="fepTrialMobile" inputmode="tel" autocomplete="tel" placeholder="شماره موبایل، مثال 0912…"><label><input id="fepTrialConsent" type="checkbox"> قوانین استفاده و حریم خصوصی را می‌پذیرم.</label><button id="fepTrialSend" type="button">ارسال کد تأیید</button><div id="fepTrialMsg"></div><div id="fepTrialVerifyBox" hidden><input id="fepTrialCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="کد ۶ رقمی"><button id="fepTrialVerify" type="button">تأیید کد و ورود به نرم‌افزار</button></div></div>';
  document.body.appendChild(root);
  let challenge='';
  const msg=t=>{root.querySelector('#fepTrialMsg').textContent=t||'';};
  const busy=b=>root.querySelectorAll('button').forEach(x=>x.disabled=b);
  root.querySelector('#fepTrialSend').onclick=async()=>{
    const fullName=root.querySelector('#fepTrialName').value.trim(),mobile=root.querySelector('#fepTrialMobile').value.trim(),consent=root.querySelector('#fepTrialConsent').checked;
    if(fullName.length<2){msg('نام و نام خانوادگی را وارد کنید.');return;}
    if(!/^09\d{9}$/.test(mobile)){msg('شماره موبایل را به شکل 09xxxxxxxxx وارد کنید.');return;}
    if(!consent){msg('ابتدا پذیرش قوانین و حریم خصوصی را تأیید کنید.');return;}
    busy(true);msg('در حال ارسال کد تأیید…');
    try{
      const r=await fetch(API+'/api/v1/otp/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mobile,installationId:LicenseManager.getInstallId()})});
      const x=await r.json();if(!r.ok||!x.ok)throw x;
      challenge=x.challengeId;root.querySelector('#fepTrialVerifyBox').hidden=false;msg('کد تأیید ارسال شد.');root.querySelector('#fepTrialCode').focus();
    }catch(e){msg(apiError(e));}
    finally{busy(false);}
  };
  root.querySelector('#fepTrialVerify').onclick=async()=>{
    const code=root.querySelector('#fepTrialCode').value.trim(),fullName=root.querySelector('#fepTrialName').value.trim(),mobile=root.querySelector('#fepTrialMobile').value.trim();
    if(!challenge){msg('ابتدا کد تأیید را درخواست کنید.');return;}
    if(!/^\d{6}$/.test(code)){msg('کد ۶ رقمی را وارد کنید.');return;}
    busy(true);msg('در حال تأیید و فعال‌سازی دوره آزمایشی…');
    try{
      const r=await fetch(API+'/api/v1/otp/verify-trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({challengeId:challenge,code,mobile,installationId:LicenseManager.getInstallId(),fullName,privacyAccepted:true,appVersion:'61.2.0'})});
      const x=await r.json();if(!r.ok||!x.ok||!x.licenseCode)throw x;
      const a=await LicenseManager.activateLicenseCode(x.licenseCode);if(!a.valid)throw {message:LicenseManager.reasonFa(a.reason)};
      const confirmed=await refreshLicense();if(!confirmed||confirmed.status!=='active')throw {message:'مجوز صادر شد اما ذخیره‌سازی محلی آن تأیید نشد.'};
      msg('تأیید شد. در حال ورود به نرم‌افزار…');
      setTimeout(()=>window.location.reload(),350);
    }catch(e){msg(apiError(e));busy(false);}
  };
}
async function firstLaunch(){
  if(typeof LicenseManager==='undefined'){setTimeout(firstLaunch,150);return;}
  try{
    const x=await refreshLicense();
    if(x?.status==='active'){unlockApp();return;}
    showOnboard();
  }catch(_){showOnboard();}
}
const originalActivateTab=(typeof activateTab==='function')?activateTab:null;if(originalActivateTab){activateTab=function(tab,source){if(tab==='ncr'&&!allowed(FEATURES.ncr)){deny(FEATURES.ncr);return false;}return originalActivateTab(tab,source);};}
document.addEventListener('click',e=>{const t=e.target;if(t.closest?.('.tabBtn[data-tab="ncr"],[data-smart-go="ncr"],[data-check-ncr],[data-reg-ncr],[data-numeric-ncr],.elevNcrCreate,#sec-ncr button')&&!allowed(FEATURES.ncr)){e.preventDefault();e.stopImmediatePropagation();deny(FEATURES.ncr);return;}if(t.closest?.('#peLocationSection button')&&!allowed(FEATURES.gps)){e.preventDefault();e.stopImmediatePropagation();deny(FEATURES.gps);return;}if(t.closest?.('#btnPrint')&&!allowed(FEATURES.pdf)){e.preventDefault();e.stopImmediatePropagation();deny(FEATURES.pdf);}},true);
document.addEventListener('focusin',e=>{if((e.target?.id==='peGeoLat'||e.target?.id==='peGeoLng')&&!allowed(FEATURES.gps)){e.target.blur();deny(FEATURES.gps);}},true);
if(typeof androidNativePrintDocument==='function'){const p=androidNativePrintDocument;androidNativePrintDocument=async d=>{if(!allowed(FEATURES.pdf)){deny(FEATURES.pdf);return;}return p(d);};}
css();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(firstLaunch,0),{once:true});else setTimeout(firstLaunch,0);
window.addEventListener('load',()=>setTimeout(firstLaunch,250),{once:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)firstLaunch();});
window.FEPFeatureGateQA={allowed,deny,getMode:()=>qaMode,setMode:m=>{if(isDeveloper()&&['real','free','trial'].includes(m)){qaMode=m;updateLockUi();}},showTrialRegistration:showOnboard,refreshLicense};
})();
</script>
`;
s=s.slice(0,bodyClose)+block+s.slice(bodyClose);
if(!s.includes(MARKER)||!s.includes(MANDATORY_MARKER))throw new Error('Android mandatory OTP/license gate marker missing');
await writeFile(path,s,'utf8');
console.log('Android mandatory first-run OTP + signed Trial gate applied');

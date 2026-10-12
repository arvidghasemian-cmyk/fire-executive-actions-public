import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');
const MARKER='FEP-ANDROID-LICENSE-STATUS-SYNC-v2';
if(s.includes(MARKER)){console.log('Android license status sync patch already present');process.exit(0);}
const bodyClose=s.lastIndexOf('</body>');
if(bodyClose<0) throw new Error('Android license status sync patch aborted: </body> not found');

const block=String.raw`<script>
/* FEP-ANDROID-LICENSE-STATUS-SYNC-v2 — keep visible license card aligned with signed local Trial + safe OTP delivery QA | فعال‌سازی دوره آزمایشی ۵ روزه */
(()=>{
'use strict';
const API='https://fire-executive-pro-api.arvidghasemian.workers.dev';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const daysLeft=s=>{if(s?.permanent)return null;if(!s?.expiresAt)return null;const n=Math.max(0,Math.ceil((new Date(s.expiresAt)-new Date())/86400000));return s?.plan?.trial===true?Math.min(5,n):n;};
function apiError(x){const m={INVALID_MOBILE:'شماره موبایل معتبر نیست.',OTP_RATE_LIMITED:'تعداد درخواست کد زیاد است. کمی بعد دوباره تلاش کنید.'};return x?.message||m[x?.error]||'ارتباط با سرور انجام نشد.';}
function ensureQaStyle(){
  if(document.getElementById('fepOtpQaStyle'))return;
  const st=document.createElement('style');
  st.id='fepOtpQaStyle';
  st.textContent='#fepOtpQaOverlay{position:fixed;inset:0;z-index:2147483640;background:rgba(3,9,16,.92);display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl}#fepOtpQaCard{width:min(100%,430px);background:#111923;color:#fff;border:1px solid #334155;border-radius:18px;padding:20px;box-shadow:0 24px 70px #0008}#fepOtpQaCard h3{margin:0 0 8px;font-size:19px}#fepOtpQaCard p{color:#cbd5e1;line-height:1.8;font-size:12px}#fepOtpQaCard input{width:100%;box-sizing:border-box;margin:7px 0;padding:12px;border-radius:10px;border:1px solid #475569;background:#0b1220;color:#fff;font:inherit}#fepOtpQaCard button{width:100%;padding:12px;margin-top:9px;border:0;border-radius:10px;background:#9f1d27;color:#fff;font:inherit;font-weight:800}#fepOtpQaCard button.secondary{background:#334155}#fepOtpQaMsg{min-height:22px;margin-top:8px;font-size:12px;color:#fca5a5}#fepOtpQaSuccess{display:none;margin-top:10px;padding:10px;border-radius:9px;background:rgba(22,101,52,.14);border:1px solid rgba(34,197,94,.35);color:#bbf7d0;font-size:12px;line-height:1.8}';
  document.head.appendChild(st);
}
function showOtpQa(){
  if(document.getElementById('fepOtpQaOverlay')||typeof LicenseManager==='undefined')return;
  ensureQaStyle();
  const root=document.createElement('div');
  root.id='fepOtpQaOverlay';
  root.innerHTML='<div id="fepOtpQaCard"><h3>آزمایش دریافت کد پیامک</h3><p>این صفحه فقط مسیر ارسال پیامک را آزمایش می‌کند و هیچ تغییری در Trial یا لایسنس فعلی شما ایجاد نمی‌کند.</p><input id="fepOtpQaMobile" inputmode="tel" autocomplete="tel" placeholder="شماره موبایل، مثال 0912…"><button id="fepOtpQaSend" type="button">ارسال کد آزمایشی</button><div id="fepOtpQaMsg"></div><div id="fepOtpQaSuccess"><b>کد ارسال شد.</b><br>اگر پیامک را دریافت کردی، مسیر ارسال OTP سالم است.<input id="fepOtpQaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="کد ۶ رقمی دریافت‌شده (صرفاً برای مشاهده صفحه)"></div><button id="fepOtpQaClose" class="secondary" type="button">بستن</button></div>';
  document.body.appendChild(root);
  const msg=t=>{root.querySelector('#fepOtpQaMsg').textContent=t||'';};
  const send=root.querySelector('#fepOtpQaSend');
  root.querySelector('#fepOtpQaClose').onclick=()=>root.remove();
  send.onclick=async()=>{
    const mobile=root.querySelector('#fepOtpQaMobile').value.trim();
    if(!/^09\d{9}$/.test(mobile)){msg('شماره موبایل را به شکل 09xxxxxxxxx وارد کنید.');return;}
    send.disabled=true;msg('در حال ارسال کد آزمایشی…');
    try{
      const r=await fetch(API+'/api/v1/otp/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mobile,installationId:LicenseManager.getInstallId()})});
      const x=await r.json();
      if(!r.ok||!x.ok)throw x;
      msg('');root.querySelector('#fepOtpQaSuccess').style.display='block';root.querySelector('#fepOtpQaCode').focus();
    }catch(e){msg(apiError(e));send.disabled=false;}
  };
}
async function syncVisibleLicenseStatus(){
  if(typeof LicenseManager==='undefined')return null;
  const st=await LicenseManager.checkStatus();
  try{window.__fepActiveLicenseStatus=st;}catch(_){}
  const section=document.getElementById('licenseSection');
  const card=document.getElementById('licenseCard');
  if(st?.status==='active'){
    if(card)card.style.display='none';
    if(section){
      const left=daysLeft(st);
      const trial=st.plan?.trial===true;
      const expiry=st.permanent?'دائمی':(st.expiresAt?new Date(st.expiresAt).toLocaleDateString('fa-IR'):'—');
      section.innerHTML='<div id="fepActiveLicenseCard" style="background:rgba(22,101,52,.10);padding:15px;border-radius:10px;border:1px solid rgba(34,197,94,.45)"><strong style="color:#86efac">'+(trial?'دوره آزمایشی فعال است':'مجوز فعال است')+'</strong><div style="margin-top:10px;line-height:1.9;font-size:12px"><div>نوع: <b>'+(trial?'آزمایشی ۵ روزه':esc(st.plan?.type||'فعال'))+'</b></div><div>اعتبار تا: <b>'+esc(expiry)+'</b></div>'+(trial&&left!==null?'<div>روز باقی‌مانده: <b>'+left+'</b></div>':'')+'</div><button id="fepOtpQaOpen" type="button" style="width:100%;margin-top:12px;padding:11px;border:1px solid rgba(148,163,184,.35);border-radius:9px;background:#334155;color:#fff;font:inherit;font-weight:800">آزمایش دریافت کد پیامک</button></div>';
      document.getElementById('fepOtpQaOpen')?.addEventListener('click',showOtpQa);
    }
  }
  return st;
}
window.FEPSyncVisibleLicenseStatus=syncVisibleLicenseStatus;
window.FEPShowOtpQa=showOtpQa;
window.addEventListener('load',()=>{setTimeout(syncVisibleLicenseStatus,700);setTimeout(syncVisibleLicenseStatus,1800);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncVisibleLicenseStatus();});
})();
</script>
`;
s=s.slice(0,bodyClose)+block+s.slice(bodyClose);
if(!s.includes(MARKER))throw new Error('Android license status sync marker missing');
await writeFile(path,s,'utf8');
console.log('Android visible Trial/license status sync + safe OTP delivery QA patch applied');

import { readFile, writeFile } from 'node:fs/promises';
const file='www/index.html'; let html=await readFile(file,'utf8'); const MARK='FEP-ANDROID-DATA-BACKUP-v14';
if(html.includes(MARK)){console.log('Backup patch already applied');process.exit(0);}
if(!html.includes('id="btnBackup"')||!html.includes('id="btnRestoreFile"')) throw new Error('Expected backup/restore controls were not found in stable baseline');
const patch=String.raw`<script>/* FEP-ANDROID-DATA-BACKUP-v1 | FEP-ANDROID-DATA-BACKUP-v2 | FEP-ANDROID-DATA-BACKUP-v3 | FEP-ANDROID-DATA-BACKUP-v4 | FEP-ANDROID-DATA-BACKUP-v5 | FEP-ANDROID-DATA-BACKUP-v6 | FEP-ANDROID-DATA-BACKUP-v7 | FEP-ANDROID-DATA-BACKUP-v8 | FEP-ANDROID-DATA-BACKUP-v9 | FEP-ANDROID-DATA-BACKUP-v10 | FEP-ANDROID-DATA-BACKUP-v11 | FEP-ANDROID-DATA-BACKUP-v12 | FEP-ANDROID-DATA-BACKUP-v13 | FEP-ANDROID-DATA-BACKUP-v14 */
(()=>{'use strict';
const FORMAT='fire-executive-pro-backup',VERSION=1,DB_NAME='fireExecDB',BACKUP_MODE_KEY='fep_backup_mode_v1';
const BACKUP_MODE_LABELS={auto:'خودکار',daily:'روزانه',weekly:'هفتگی',off:'خاموش'};
function getBackupMode(){let m='auto';try{m=localStorage.getItem(BACKUP_MODE_KEY)||'auto';}catch(_){ }return Object.prototype.hasOwnProperty.call(BACKUP_MODE_LABELS,m)?m:'auto';}
function setBackupMode(mode){const m=Object.prototype.hasOwnProperty.call(BACKUP_MODE_LABELS,mode)?mode:'auto';try{localStorage.setItem(BACKUP_MODE_KEY,m);}catch(_){ }return m;}
function backupModeHelp(mode){return mode==='daily'?'روزانه فقط یک‌بار در هر روز پشتیبان خودکار ساخته می‌شود (تا ۷ روز).':mode==='weekly'?'هفتگی فقط یک‌بار در هر هفته پشتیبان خودکار ساخته می‌شود (تا ۴ هفته).':mode==='off'?'پشتیبان خودکار خاموش است؛ پشتیبان دستی و نسخه ایمنی قبل از بازیابی همچنان فعال‌اند.':'در حالت خودکار، هنگام کار با برنامه آخرین نسخه و نسخه‌های روزانه/هفتگی به‌صورت هوشمند به‌روزرسانی می‌شوند.';}
const SENSITIVE=new Set(['fep_install_id_v2','fep_license_v2','fep_license_clock_v2','fep_license_v1','FEP_LICENSE_V1']);
const isSensitive=k=>SENSITIVE.has(String(k))||/^fep_(?:otp|auth|trial|billing|recovery)/i.test(String(k));
const RESTORE_PRESERVE=new Set([BACKUP_MODE_KEY,'fireExecAppVersion']);
const isRestorePreserved=k=>RESTORE_PRESERVE.has(String(k));
const faDigits=v=>String(v).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const J_MONTHS=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function jDiv(a,b){return Math.trunc(a/b);}function jMod(a,b){return a-Math.trunc(a/b)*b;}
function jG2d(gy,gm,gd){let d=jDiv((gy+jDiv(gm-8,6)+100100)*1461,4)+jDiv(153*jMod(gm+9,12)+2,5)+gd-34840408;d=d-jDiv(jDiv(gy+100100+jDiv(gm-8,6),100)*3,4)+752;return d;}
function jD2g(jdn){let j=4*jdn+139361631;j=j+jDiv(jDiv(4*jdn+183187720,146097)*3,4)*4-3908;const i=jDiv(jMod(j,1461),4)*5+308,gd=jDiv(jMod(i,153),5)+1,gm=jMod(jDiv(i,153),12)+1,gy=jDiv(j,1461)-100100+jDiv(8-gm,6);return{gy,gm,gd};}
function jCal(jy){const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];let gy=jy+621,leapJ=-14,jp=breaks[0],jm,jump,n,i;if(jy<jp||jy>=breaks[breaks.length-1])throw new Error('invalid_jalali_year');for(i=1;i<breaks.length;i++){jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ+=jDiv(jump,33)*8+jDiv(jMod(jump,33),4);jp=jm;}n=jy-jp;leapJ+=jDiv(n,33)*8+jDiv(jMod(n,33)+3,4);if(jMod(jump,33)===4&&jump-n===4)leapJ++;const leapG=jDiv(gy,4)-jDiv((jDiv(gy,100)+1)*3,4)-150,march=20+leapJ-leapG;if(jump-n<6)n=n-jump+jDiv(jump+4,33)*33;let leap=jMod(jMod(n+1,33)-1,4);if(leap===-1)leap=4;return{leap,gy,march};}
function jD2j(jdn){const gy=jD2g(jdn).gy;let jy=gy-621,r=jCal(jy),jdn1f=jG2d(gy,3,r.march),k=jdn-jdn1f,jm,jd;if(k>=0){if(k<=185){jm=1+jDiv(k,31);jd=jMod(k,31)+1;return{jy,jm,jd};}k-=186;}else{jy--;k+=179;if(r.leap===1)k++;}jm=7+jDiv(k,30);jd=jMod(k,30)+1;return{jy,jm,jd};}
function jalaliParts(d){return jD2j(jG2d(d.getFullYear(),d.getMonth()+1,d.getDate()));}
function fileDate(d){const j=jalaliParts(d),p=n=>String(n).padStart(2,'0');return j.jy+'-'+p(j.jm)+'-'+p(j.jd);}
function safeName(){const d=new Date(),p=n=>String(n).padStart(2,'0');return 'Fire-Executive-Pro-Backup-'+fileDate(d)+'-'+p(d.getHours())+'-'+p(d.getMinutes())+'.json';}
function snapshotNames(){const d=new Date(),jd=fileDate(d);return{dailyFileName:'Daily-'+jd+'.json',weeklyFileName:'Weekly-'+jd+'.json'};}
function readableJalali(ms){const d=new Date(Number(ms)||Date.now()),j=jalaliParts(d),p=n=>String(n).padStart(2,'0');return faDigits(j.jd)+' '+J_MONTHS[j.jm-1]+' '+faDigits(j.jy)+' — ساعت '+faDigits(p(d.getHours())+':'+p(d.getMinutes()));}
function readLocal(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&!isSensitive(k)&&!isRestorePreserved(k))out[k]=localStorage.getItem(k);}return out;}
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('idb_open_failed'));});}
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('idb_request_failed'));});
async function readDb(strict=false){let db;try{db=await openDb();}catch(e){if(strict)throw(e||new Error('idb_open_failed'));return{name:DB_NAME,stores:{}};}try{const stores={};for(const name of Array.from(db.objectStoreNames)){const tx=db.transaction(name,'readonly'),s=tx.objectStore(name),keys=await req(s.getAllKeys()),values=await req(s.getAll());stores[name]={keyPath:s.keyPath||null,entries:values.map((value,i)=>({key:keys[i],value}))};}return{name:DB_NAME,stores};}finally{db.close();}}
const PROJECT_STATE_KEY='fireExecState_v2';
function parseProjectStateValue(v){if(v==null)return null;if(typeof v==='string'){try{return JSON.parse(v);}catch(_){return null;}}return(typeof v==='object'?v:null);}
function validateProjectState(state){
 if(!state||typeof state!=='object'||Array.isArray(state)||!Array.isArray(state.projects)||!state.projects.length||!state.data||typeof state.data!=='object'||Array.isArray(state.data))throw new Error('invalid_project_state');
 const ids=state.projects.map(p=>p&&String(p.id||''));
 if(ids.some(id=>!id)||new Set(ids).size!==ids.length)throw new Error('invalid_project_ids');
 if(!ids.includes(String(state.activeId||'')))throw new Error('invalid_active_project');
 for(const id of ids){
  const d=state.data[id];
  if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('missing_project_data:'+id);
  if(d.hydraulicNetwork!=null&&(!d.hydraulicNetwork||typeof d.hydraulicNetwork!=='object'||!Array.isArray(d.hydraulicNetwork.nodes||[])||!Array.isArray(d.hydraulicNetwork.pipes||[])))throw new Error('invalid_hydraulic_network:'+id);
  if(d.systemEquipment!=null&&!Array.isArray(d.systemEquipment))throw new Error('invalid_system_equipment:'+id);
  if(d.topologyConnections!=null&&!Array.isArray(d.topologyConnections))throw new Error('invalid_topology_connections:'+id);
  for(const k of ['hydraulicBranchAnalysis','pumpDesignPoint','pumpCandidate']){
   const snap=d[k];if(snap&&snap.projectId!=null&&String(snap.projectId)!==id)throw new Error('project_snapshot_scope_mismatch:'+id+':'+k);
  }
 }
 return state;
}
function findIndexedProjectState(indexed){
 const kv=indexed&&indexed.stores&&indexed.stores.kv;if(!kv||!Array.isArray(kv.entries))return null;
 const e=kv.entries.find(x=>x&&String(x.key)==='state');return e?parseProjectStateValue(e.value):null;
}
function syncBackupProjectState(local,indexed){
 let state=null;
 if(local&&Object.prototype.hasOwnProperty.call(local,PROJECT_STATE_KEY))state=parseProjectStateValue(local[PROJECT_STATE_KEY]);
 if(state){try{validateProjectState(state);}catch(_){state=null;}}
 if(!state)state=findIndexedProjectState(indexed);
 state=validateProjectState(state);
 if(!local||typeof local!=='object'||Array.isArray(local))throw new Error('invalid_backup_local_storage');
 local[PROJECT_STATE_KEY]=JSON.stringify(state);
 if(!indexed||!indexed.stores||typeof indexed.stores!=='object'||Array.isArray(indexed.stores))throw new Error('invalid_backup_stores');
 let kv=indexed.stores.kv;if(!kv){kv=indexed.stores.kv={keyPath:null,entries:[]};}
 if(!Array.isArray(kv.entries))throw new Error('invalid_backup_kv_store');
 const existing=kv.entries.find(x=>x&&String(x.key)==='state');
 if(existing)existing.value=JSON.parse(JSON.stringify(state));else kv.entries.push({key:'state',value:JSON.parse(JSON.stringify(state))});
 return state;
}
async function makeBackup(){const localStorage=readLocal(),indexedDB=await readDb(true);syncBackupProjectState(localStorage,indexedDB);const b={format:FORMAT,version:VERSION,createdAt:new Date().toISOString(),app:'Fire Executive Pro',scope:'user-data-only',securityNote:'license, installation identity and authentication data are intentionally excluded',localStorage,indexedDB};validate(b);return b;}
let autoBusy=false,lastAutoStarted=0;
async function saveAutoSnapshot(reason){
 const mode=getBackupMode();if(mode==='off')return{skipped:true,mode:'off',why:'disabled'};
 const now=Date.now();if(autoBusy||now-lastAutoStarted<4000)return null;
 const nativeBackup=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.FepBackup;
 if(!nativeBackup||typeof nativeBackup.saveAutoJson!=='function')return null;
 if((mode==='daily'||mode==='weekly')&&typeof nativeBackup.getAutoInfo==='function'){
  try{const info=await nativeBackup.getAutoInfo();if(mode==='daily'&&info&&info.dailyCurrent===true)return{skipped:true,mode,why:'daily-already-saved'};if(mode==='weekly'&&info&&info.weeklyCurrent===true)return{skipped:true,mode,why:'weekly-already-saved'};}catch(e){console.warn('FEP scheduled backup check failed',e);}
 }
 lastAutoStarted=now;autoBusy=true;
 try{const b=await makeBackup(),names=snapshotNames();b.autoBackup={reason:String(reason||'background'),savedAt:new Date().toISOString(),mode,dailyFileName:names.dailyFileName,weeklyFileName:names.weeklyFileName};const content=JSON.stringify(b);if(!content||content.length<2)throw new Error('auto_backup_content_empty');return await nativeBackup.saveAutoJson({content,reason:String(reason||'background'),mode,dailyFileName:names.dailyFileName,weeklyFileName:names.weeklyFileName});}
 finally{autoBusy=false;}
}
async function getAutoInfo(){const nativeBackup=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.FepBackup;if(!nativeBackup||typeof nativeBackup.getAutoInfo!=='function')return null;try{return await nativeBackup.getAutoInfo();}catch(_){return null;}}
function updateAutoStatus(info){const el=document.getElementById('fepAutoBackupStatus'),btn=document.getElementById('btnRestoreAutoBackup'),mode=getBackupMode(),label=BACKUP_MODE_LABELS[mode];if(!el)return;if(info&&info.exists){const d=new Date(Number(info.modifiedAt)||Date.now()),daily=Number(info.dailyCount)||0,weekly=Number(info.weeklyCount)||0;el.textContent='حالت: '+label+' • آخرین پشتیبان خودکار: '+faDigits(d.toLocaleString('fa-IR'))+' • '+faDigits(info.bytes||0)+' بایت • روزانه: '+faDigits(daily)+'/۷ • هفتگی: '+faDigits(weekly)+'/۴';if(btn)btn.disabled=false;}else{el.textContent='حالت: '+label+' • '+(mode==='off'?'پشتیبان خودکار خاموش است.':'هنوز پشتیبان خودکار داخلی ساخته نشده است.')+' ظرفیت نگهداری: ۷ نسخه روزانه + ۴ نسخه هفتگی.';if(btn)btn.disabled=true;}}
async function refreshAutoStatus(){updateAutoStatus(await getAutoInfo());}
async function deliver(obj){const nativeBackup=window.Capacitor?.Plugins?.FepBackup;if(!nativeBackup||typeof nativeBackup.saveJson!=='function')throw new Error('native_backup_unavailable');const content=JSON.stringify(obj,null,2);if(!content||content.length<2)throw new Error('backup_content_empty');const result=await nativeBackup.saveJson({fileName:safeName(),content});if(!result||result.saved!==true||result.verified!==true||!Number.isFinite(Number(result.bytes))||Number(result.bytes)<=0)throw new Error('backup_not_saved_or_empty');return result;}
function validate(b){
 if(!b||b.format!==FORMAT||b.version!==VERSION||!b.localStorage||typeof b.localStorage!=='object'||Array.isArray(b.localStorage)||!b.indexedDB||typeof b.indexedDB!=='object'||Array.isArray(b.indexedDB))throw new Error('invalid_backup');
 const stores=b.indexedDB.stores;if(!stores||typeof stores!=='object'||Array.isArray(stores))throw new Error('invalid_backup_stores');
 for(const [name,src] of Object.entries(stores)){if(!name||!src||typeof src!=='object'||!Array.isArray(src.entries))throw new Error('invalid_backup_store');for(const e of src.entries){if(!e||typeof e!=='object'||!Object.prototype.hasOwnProperty.call(e,'value'))throw new Error('invalid_backup_entry');}}
 for(const [k,v] of Object.entries(b.localStorage)){if(typeof k!=='string'||(v!==null&&typeof v!=='string'))throw new Error('invalid_backup_local_storage');}
 syncBackupProjectState(b.localStorage,b.indexedDB);
}
function ensureRestoreConfirmModal(){
 let overlay=document.getElementById('fepRestoreConfirmOverlay');
 if(overlay)return overlay;
 overlay=document.createElement('div');
 overlay.id='fepRestoreConfirmOverlay';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-labelledby','fepRestoreConfirmTitle');
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.62);direction:rtl';
 const card=document.createElement('div');
 card.style.cssText='width:min(92vw,520px);max-height:82vh;overflow:auto;border:1px solid var(--border);border-radius:18px;background:var(--card);color:var(--text);box-shadow:0 22px 65px rgba(0,0,0,.45);padding:20px';
 const title=document.createElement('div');title.id='fepRestoreConfirmTitle';title.textContent='تأیید بازیابی';title.style.cssText='font-size:19px;font-weight:900;margin-bottom:12px';
 const msg=document.createElement('div');msg.id='fepRestoreConfirmMessage';msg.style.cssText='white-space:pre-line;line-height:2;font-size:15px;color:var(--text)';
 const safety=document.createElement('div');safety.id='fepRestoreConfirmSafety';safety.textContent='قبل از بازیابی، یک نسخه ایمنی از وضعیت فعلی ساخته می‌شود.';safety.style.cssText='margin-top:14px;padding:10px 12px;border-radius:12px;background:var(--chip);color:var(--muted);font-size:12px;line-height:1.8';
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;justify-content:flex-start;flex-wrap:wrap;margin-top:18px';
 const ok=document.createElement('button');ok.type='button';ok.id='fepRestoreConfirmOk';ok.className='btn';ok.textContent='بازیابی';
 const cancel=document.createElement('button');cancel.type='button';cancel.id='fepRestoreConfirmCancel';cancel.className='btn ghost';cancel.textContent='انصراف';
 actions.append(ok,cancel);card.append(title,msg,safety,actions);overlay.appendChild(card);document.body.appendChild(overlay);
 return overlay;
}
function fepRestoreConfirm(message,options){
 const opts=options||{},overlay=ensureRestoreConfirmModal(),msg=document.getElementById('fepRestoreConfirmMessage'),title=document.getElementById('fepRestoreConfirmTitle'),ok=document.getElementById('fepRestoreConfirmOk'),cancel=document.getElementById('fepRestoreConfirmCancel'),safety=document.getElementById('fepRestoreConfirmSafety');
 title.textContent=opts.title||'تأیید بازیابی';msg.textContent=String(message||'آیا بازیابی انجام شود؟');ok.textContent=opts.confirmLabel||'بازیابی';cancel.textContent=opts.cancelLabel||'انصراف';safety.style.display=opts.hideSafety?'none':'block';
 overlay.style.display='flex';
 return new Promise(function(resolve){
  let done=false;
  function finish(value){if(done)return;done=true;overlay.style.display='none';ok.removeEventListener('click',yes);cancel.removeEventListener('click',no);overlay.removeEventListener('click',outside);document.removeEventListener('keydown',key);resolve(value);}
  function yes(){finish(true);}function no(){finish(false);}function outside(e){if(e.target===overlay)finish(false);}function key(e){if(e.key==='Escape'||e.key==='Esc')finish(false);}
  ok.addEventListener('click',yes);cancel.addEventListener('click',no);overlay.addEventListener('click',outside);document.addEventListener('keydown',key);setTimeout(function(){try{ok.focus();}catch(_){ }},0);
 });
}
async function savePreRestoreSafety(){
 const nativeBackup=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.FepBackup;
 if(!nativeBackup||typeof nativeBackup.savePreRestoreJson!=='function')throw new Error('pre_restore_backup_unavailable');
 const b=await makeBackup();b.preRestoreSafety={savedAt:new Date().toISOString(),purpose:'before-restore'};
 const content=JSON.stringify(b);if(!content||content.length<2)throw new Error('pre_restore_backup_empty');
 const r=await nativeBackup.savePreRestoreJson({content});
 if(!r||r.saved!==true||r.verified!==true)throw new Error('pre_restore_backup_failed');
 return r;
}
async function getPreRestoreInfo(){const nativeBackup=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.FepBackup;if(!nativeBackup||typeof nativeBackup.getPreRestoreInfo!=='function')return null;try{return await nativeBackup.getPreRestoreInfo();}catch(_){return null;}}
function updatePreRestoreStatus(info){const el=document.getElementById('fepPreRestoreStatus'),btn=document.getElementById('btnRestorePreRestore');if(!el)return;if(info&&info.exists){el.textContent='نسخه ایمنی قبل از بازیابی: '+readableJalali(info.modifiedAt)+' • '+faDigits(info.bytes||0)+' بایت';if(btn)btn.disabled=false;}else{el.textContent='هنوز نسخه ایمنی قبل از بازیابی ساخته نشده است.';if(btn)btn.disabled=true;}}
async function refreshPreRestoreStatus(){updatePreRestoreStatus(await getPreRestoreInfo());}
async function onRestorePreRestore(ev){if(ev){ev.preventDefault();ev.stopImmediatePropagation();}const nativeBackup=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.FepBackup;if(!nativeBackup||typeof nativeBackup.loadPreRestoreJson!=='function'){alert('نسخه ایمنی قبل از بازیابی در دسترس نیست.');return;}const btn=document.getElementById('btnRestorePreRestore'),old=btn&&btn.textContent;try{if(btn){btn.disabled=true;btn.textContent='در حال خواندن نسخه ایمنی…';}const r=await nativeBackup.loadPreRestoreJson();if(!r||!r.found||!r.content)throw new Error('pre_restore_not_found');const b=JSON.parse(r.content);const ok=await restoreBackup(b,'وضعیت دستگاه به حالت قبل از آخرین بازیابی برگردد؟\n\nاین عملیات برای نجات اطلاعات قبل از بازیابی قبلی است. لایسنس و شناسه نصب تغییر نمی‌کنند.',{skipSafety:true,title:'بازگردانی وضعیت قبلی',confirmLabel:'بازگردانی'});if(ok){alert('وضعیت قبل از آخرین بازیابی با موفقیت برگردانده شد. برنامه دوباره بارگذاری می‌شود.');location.reload();}}catch(e){console.error('FEP pre-restore recovery failed',e);alert('نسخه ایمنی قبل از بازیابی معتبر نیست یا بازیابی آن ممکن نشد.');}finally{if(btn)btn.textContent=old||'↶ بازگردانی وضعیت قبل از آخرین بازیابی';refreshPreRestoreStatus();}}
async function restoreDb(data){
 if(!data||!data.stores)throw new Error('idb_restore_data_missing');
 const db=await openDb();
 try{
  const allNames=Array.from(db.objectStoreNames);if(!allNames.length)return;
  const unknown=Object.keys(data.stores).filter(n=>!db.objectStoreNames.contains(n));if(unknown.length)throw new Error('idb_restore_unknown_store:'+unknown.join(','));
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(allNames,'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('idb_restore_failed'));tx.onabort=()=>reject(tx.error||new Error('idb_restore_aborted'));
   for(const name of allNames){const store=tx.objectStore(name),src=data.stores[name];store.clear();if(!src)continue;for(const e of src.entries){if(store.keyPath)store.put(e.value);else store.put(e.value,e.key);}}
  });
 }finally{db.close();}
}
function restoreLocal(data){
 const keep={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(isSensitive(k)||isRestorePreserved(k)))keep[k]=localStorage.getItem(k);}
 const remove=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&!isSensitive(k)&&!isRestorePreserved(k))remove.push(k);}for(const k of remove)localStorage.removeItem(k);
 for(const [k,v] of Object.entries(data||{})){if(!isSensitive(k)&&!isRestorePreserved(k))localStorage.setItem(k,String(v));}
 for(const [k,v] of Object.entries(keep)){if(v!==null)localStorage.setItem(k,v);}
}
function keySig(v){try{return JSON.stringify(v);}catch(_){return String(v);}}
async function verifyRestored(b){
 const expectedLocal={};for(const [k,v] of Object.entries(b.localStorage||{})){if(!isSensitive(k)&&!isRestorePreserved(k))expectedLocal[k]=String(v);}
 const actualLocal=readLocal(),ek=Object.keys(expectedLocal).sort(),ak=Object.keys(actualLocal).sort();
 if(keySig(ek)!==keySig(ak))throw new Error('restore_verify_local_keys');
 for(const k of ek){if(String(actualLocal[k])!==expectedLocal[k])throw new Error('restore_verify_local_value:'+k);}
 const actualDb=await readDb(true),expectedStores=b.indexedDB.stores||{},actualStores=actualDb.stores||{};
 const names=Array.from(new Set([...Object.keys(expectedStores),...Object.keys(actualStores)])).sort();
 for(const name of names){
  const exp=(expectedStores[name]&&expectedStores[name].entries)||[],act=(actualStores[name]&&actualStores[name].entries)||[];
  if(exp.length!==act.length)throw new Error('restore_verify_count:'+name);
  const expMap=new Map(exp.map(e=>[keySig(e.key),keySig(e.value)])),actMap=new Map(act.map(e=>[keySig(e.key),keySig(e.value)]));
  const expKeys=[...expMap.keys()].sort(),actKeys=[...actMap.keys()].sort();
  if(keySig(expKeys)!==keySig(actKeys))throw new Error('restore_verify_keys:'+name);
  for(const k of expKeys){if(actMap.get(k)!==expMap.get(k))throw new Error('restore_verify_value:'+name+':'+k);}
 }
 return true;
}
async function restoreBackup(b,message,options){validate(b);const opts=options||{};const approved=await fepRestoreConfirm(message||'بازیابی پشتیبان، اطلاعات پروژه‌ای فعلی این دستگاه را با نسخه پشتیبان جایگزین می‌کند.\n\nلایسنس و شناسه نصب تغییر نمی‌کنند.\n\nادامه می‌دهید؟',{title:opts.title||'تأیید بازیابی',confirmLabel:opts.confirmLabel||'بازیابی',cancelLabel:'انصراف',hideSafety:!!opts.skipSafety});if(!approved)return false;if(!opts.skipSafety){try{await savePreRestoreSafety();await refreshPreRestoreStatus();}catch(e){console.error('FEP pre-restore safety backup failed',e);alert('برای حفظ امنیت اطلاعات، بازیابی متوقف شد چون ساخت پشتیبان قبل از بازیابی موفق نبود. لطفاً دوباره تلاش کنید.');return false;}}await restoreDb(b.indexedDB);restoreLocal(b.localStorage);await verifyRestored(b);return true;}
async function onRestoreAuto(ev){if(ev){ev.preventDefault();ev.stopImmediatePropagation();}const nativeBackup=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.FepBackup;if(!nativeBackup||typeof nativeBackup.loadAutoJson!=='function'){alert('پشتیبان خودکار داخلی در این نسخه در دسترس نیست.');return;}const btn=document.getElementById('btnRestoreAutoBackup'),old=btn&&btn.textContent;try{if(btn){btn.disabled=true;btn.textContent='در حال بررسی پشتیبان…';}const r=await nativeBackup.loadAutoJson();if(!r||!r.found||!r.content)throw new Error('auto_backup_not_found');const b=JSON.parse(r.content);const ok=await restoreBackup(b,'بازیابی اضطراری، اطلاعات فعلی پروژه‌ای این دستگاه را با آخرین پشتیبان خودکار داخلی جایگزین می‌کند.\n\nلایسنس و شناسه نصب تغییر نمی‌کنند.\n\nادامه می‌دهید؟');if(ok){alert('آخرین پشتیبان خودکار با موفقیت بازیابی شد. برنامه دوباره بارگذاری می‌شود.');location.reload();}}catch(e){console.error('FEP auto restore failed',e);alert('پشتیبان خودکار معتبر پیدا نشد یا بازیابی آن ممکن نشد.');}finally{if(btn){btn.textContent=old||'↩ بازیابی آخرین پشتیبان خودکار';}refreshAutoStatus();}}
async function listSnapshots(){const nativeBackup=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.FepBackup;if(!nativeBackup||typeof nativeBackup.listSnapshots!=='function')return[];const r=await nativeBackup.listSnapshots();return Array.isArray(r&&r.items)?r.items:[];}
function renderSnapshotList(items){const box=document.getElementById('fepAutoBackupList');if(!box)return;box.innerHTML='';if(!items.length){const empty=document.createElement('div');empty.className='note';empty.textContent='هنوز نسخه روزانه یا هفتگی برای انتخاب وجود ندارد.';box.appendChild(empty);return;}items.slice().sort((a,b)=>(Number(b.modifiedAt)||0)-(Number(a.modifiedAt)||0)).forEach(function(item){const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:9px 10px;margin-top:7px;border:1px solid var(--border);border-radius:10px;background:var(--chip)';const info=document.createElement('div');info.style.cssText='min-width:0;flex:1';const title=document.createElement('div');title.style.fontWeight='800';title.textContent=(item.type==='weekly'?'هفتگی':'روزانه')+' — '+readableJalali(item.modifiedAt);const name=document.createElement('div');name.className='note';name.style.cssText='margin-top:3px;direction:ltr;text-align:left;overflow-wrap:anywhere';name.textContent=String(item.fileName||'');const btn=document.createElement('button');btn.type='button';btn.className='btn small ghost';btn.textContent='بازیابی این نسخه';btn.addEventListener('click',function(){restoreNamedSnapshot(item);});info.append(title,name);row.append(info,btn);box.appendChild(row);});}
async function refreshSnapshotList(){const box=document.getElementById('fepAutoBackupList');if(!box)return;try{renderSnapshotList(await listSnapshots());}catch(e){console.error('FEP snapshot list failed',e);box.innerHTML='<div class="note">خواندن فهرست نسخه‌های پشتیبان ممکن نشد.</div>';}}
async function onBrowseSnapshots(ev){if(ev){ev.preventDefault();ev.stopImmediatePropagation();}const box=document.getElementById('fepAutoBackupList');if(!box)return;const open=box.style.display!=='none';if(open){box.style.display='none';return;}box.style.display='block';box.innerHTML='<div class="note">در حال خواندن نسخه‌ها…</div>';await refreshSnapshotList();}
async function restoreNamedSnapshot(item){const nativeBackup=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.FepBackup;if(!nativeBackup||typeof nativeBackup.loadSnapshotJson!=='function')return alert('بازیابی نسخه انتخابی در دسترس نیست.');try{const r=await nativeBackup.loadSnapshotJson({type:String(item.type||''),fileName:String(item.fileName||'')});if(!r||!r.found||!r.content)throw new Error('snapshot_not_found');const b=JSON.parse(r.content),label=(item.type==='weekly'?'هفتگی':'روزانه')+' '+readableJalali(item.modifiedAt);const ok=await restoreBackup(b,'نسخه «'+label+'» بازیابی شود؟\n\nاطلاعات پروژه‌ای فعلی با این نسخه جایگزین می‌شود. لایسنس و شناسه نصب تغییر نمی‌کنند.');if(ok){alert('نسخه انتخاب‌شده با موفقیت بازیابی شد. برنامه دوباره بارگذاری می‌شود.');location.reload();}}catch(e){console.error('FEP named snapshot restore failed',e);alert('نسخه انتخاب‌شده معتبر نیست یا بازیابی آن ممکن نشد.');}}
async function onBackup(ev){ev.preventDefault();ev.stopImmediatePropagation();const btn=ev.currentTarget,old=btn.textContent;try{btn.disabled=true;btn.textContent='در حال ذخیره پشتیبان…';const b=await makeBackup(),saved=await deliver(b);const items=Object.values(b.indexedDB.stores||{}).reduce((n,s)=>n+(s.entries||[]).length,0);alert('فایل پشتیبان با موفقیت ذخیره و دوباره خوانده شد.\nمسیر: '+(saved.path||'Downloads/FireExecutivePro')+'\nحجم واقعی: '+faDigits(saved.bytes)+' بایت\n'+faDigits(Object.keys(b.localStorage).length)+' مورد از حافظه برنامه و '+faDigits(items)+' رکورد IndexedDB در فایل قرار گرفت.\n\nاطلاعات لایسنس و شناسه نصب عمداً داخل پشتیبان نیست.');}catch(e){console.error('FEP backup failed',e);alert('فایل پشتیبان ذخیره نشد یا تأیید صحت آن ناموفق بود. لطفاً دوباره تلاش کنید.');}finally{btn.disabled=false;btn.textContent=old;}}
async function onRestore(ev){ev.stopImmediatePropagation();const input=ev.currentTarget,file=input.files&&input.files[0];if(!file)return;try{if(!file.size)throw new Error('empty_backup_file');const b=JSON.parse(await file.text()),ok=await restoreBackup(b);if(ok){alert('بازیابی اطلاعات با موفقیت انجام شد. برنامه برای بارگذاری اطلاعات بازیابی‌شده دوباره باز می‌شود.');location.reload();}}catch(e){console.error('FEP restore failed',e);alert('فایل پشتیبان معتبر Fire Executive Pro نیست یا بازیابی آن ممکن نشد.');}finally{input.value='';}}
function updateBackupModeUi(){const mode=getBackupMode(),sel=document.getElementById('fepBackupModeSelect'),help=document.getElementById('fepBackupModeHelp');if(sel&&sel.value!==mode)sel.value=mode;if(help)help.textContent=backupModeHelp(mode);}
async function onBackupModeChange(ev){const mode=setBackupMode(ev&&ev.currentTarget?ev.currentTarget.value:'auto');updateBackupModeUi();await refreshAutoStatus();const list=document.getElementById('fepAutoBackupList');if(list&&list.style.display!=='none')refreshSnapshotList();if(mode!=='off'){setTimeout(function(){saveAutoSnapshot('mode-change').then(function(){refreshAutoStatus();if(list&&list.style.display!=='none')refreshSnapshotList();}).catch(function(e){console.warn('FEP mode-change auto backup failed',e);});},4200);}}
function boot(){
 const backup=document.getElementById('btnBackup'),restore=document.getElementById('btnRestoreFile');if(!backup||!restore)return;
 backup.textContent='💾 پشتیبان کامل اطلاعات';backup.title='پروژه‌ها، چک‌لیست‌ها، NCR و عکس‌ها؛ بدون لایسنس';backup.addEventListener('click',onBackup,true);restore.addEventListener('change',onRestore,true);
 let modeRow=document.getElementById('fepBackupModeRow');
 if(!modeRow){modeRow=document.createElement('div');modeRow.id='fepBackupModeRow';modeRow.style.cssText='display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin:10px 0 4px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--chip)';const label=document.createElement('label');label.setAttribute('for','fepBackupModeSelect');label.textContent='حالت پشتیبان خودکار';label.style.fontWeight='800';const sel=document.createElement('select');sel.id='fepBackupModeSelect';sel.style.cssText='min-width:170px;padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font:inherit';[['auto','خودکار'],['daily','روزانه'],['weekly','هفتگی'],['off','خاموش']].forEach(function(pair){const o=document.createElement('option');o.value=pair[0];o.textContent=pair[1];sel.appendChild(o);});const help=document.createElement('div');help.id='fepBackupModeHelp';help.className='note';help.style.cssText='width:100%;text-align:center;margin-top:2px';modeRow.append(label,sel,help);backup.insertAdjacentElement('afterend',modeRow);}
 const modeSelect=document.getElementById('fepBackupModeSelect');if(modeSelect)modeSelect.addEventListener('change',onBackupModeChange,true);updateBackupModeUi();
 let autoBtn=document.getElementById('btnRestoreAutoBackup');if(!autoBtn){autoBtn=document.createElement('button');autoBtn.type='button';autoBtn.id='btnRestoreAutoBackup';autoBtn.className='btn small ghost';autoBtn.textContent='↩ بازیابی آخرین پشتیبان خودکار';autoBtn.style.marginInlineStart='6px';modeRow.insertAdjacentElement('afterend',autoBtn);}autoBtn.addEventListener('click',onRestoreAuto,true);
 let browse=document.getElementById('btnBrowseAutoBackups');if(!browse){browse=document.createElement('button');browse.type='button';browse.id='btnBrowseAutoBackups';browse.className='btn small ghost';browse.textContent='🗂 نسخه‌های روزانه و هفتگی';browse.style.marginInlineStart='6px';autoBtn.insertAdjacentElement('afterend',browse);}browse.addEventListener('click',onBrowseSnapshots,true);
 let preBtn=document.getElementById('btnRestorePreRestore');if(!preBtn){preBtn=document.createElement('button');preBtn.type='button';preBtn.id='btnRestorePreRestore';preBtn.className='btn small ghost';preBtn.textContent='↶ بازگردانی وضعیت قبل از آخرین بازیابی';preBtn.style.marginInlineStart='6px';browse.insertAdjacentElement('afterend',preBtn);}preBtn.addEventListener('click',onRestorePreRestore,true);
 let status=document.getElementById('fepAutoBackupStatus');if(!status){status=document.createElement('div');status.id='fepAutoBackupStatus';status.className='note';status.style.marginTop='8px';preBtn.insertAdjacentElement('afterend',status);}
 let preStatus=document.getElementById('fepPreRestoreStatus');if(!preStatus){preStatus=document.createElement('div');preStatus.id='fepPreRestoreStatus';preStatus.className='note';preStatus.style.marginTop='5px';status.insertAdjacentElement('afterend',preStatus);}
 let list=document.getElementById('fepAutoBackupList');if(!list){list=document.createElement('div');list.id='fepAutoBackupList';list.style.cssText='display:none;margin-top:8px';preStatus.insertAdjacentElement('afterend',list);}
 const note=backup.closest('.card')&&backup.closest('.card').querySelector('.note');if(note&&note!==status)note.textContent='💾 پشتیبان دستی همیشه فعال است. حالت پشتیبان خودکار را می‌توانید روی خودکار، روزانه، هفتگی یا خاموش بگذارید. نسخه ایمنی قبل از بازیابی مستقل از این تنظیم باقی می‌ماند.';
 refreshAutoStatus();refreshPreRestoreStatus();setTimeout(function(){saveAutoSnapshot('startup-safety').then(function(){refreshAutoStatus();if(list.style.display!=='none')refreshSnapshotList();}).catch(function(e){console.warn('FEP startup auto backup failed',e);});},5000);
}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')saveAutoSnapshot('background').catch(function(e){console.warn('FEP background auto backup failed',e);});});window.addEventListener('pagehide',function(){saveAutoSnapshot('pagehide').catch(function(e){console.warn('FEP pagehide auto backup failed',e);});});window.FEPAutoBackup={save:saveAutoSnapshot,restore:onRestoreAuto,info:getAutoInfo,list:listSnapshots,restoreSnapshot:restoreNamedSnapshot,savePreRestore:savePreRestoreSafety,restorePreRestore:onRestorePreRestore,preRestoreInfo:getPreRestoreInfo,confirmRestore:fepRestoreConfirm,getMode:getBackupMode,setMode:setBackupMode};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();})();</script>`;
const bodyClose=html.lastIndexOf('</body>');if(bodyClose<0)throw new Error('Backup patch aborted: </body> not found');html=html.slice(0,bodyClose)+patch+'\n'+html.slice(bodyClose);if(!html.includes(MARK))throw new Error('Backup patch marker missing after injection');await writeFile(file,html,'utf8');const verify=await readFile(file,'utf8');if(!verify.includes(MARK))throw new Error('Backup patch verification failed after write');console.log('Applied and verified '+MARK);

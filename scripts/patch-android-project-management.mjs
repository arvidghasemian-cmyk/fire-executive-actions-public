import {readFile,writeFile} from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');
const MARK='FEP-ANDROID-PROJECT-BULK-DELETE-v2';
if(s.includes(MARK)){console.log('Project bulk delete patch already applied.');process.exit(0);}

const listAnchor='<div id="projectCenterList" style="margin-top:12px"></div>';
if(!s.includes(listAnchor))throw new Error('Project center list anchor not found');

const bulkUi=`<!-- ${MARK} -->
<style>
.projectBulkBar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 0;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:var(--chip)}
.projectBulkBar .bulkCount{font-size:11px;font-weight:800;color:var(--muted);margin-inline-start:auto}
.projectSelectBox{display:flex;align-items:flex-start;gap:8px;min-width:0}
.projectSelectBox input{width:20px;height:20px;min-width:20px;margin-top:2px;accent-color:#8f1d24}
@media(max-width:640px){.projectBulkBar .bulkCount{width:100%;margin-inline-start:0}.projectSelectBox{width:100%}}
</style>
<div class="projectBulkBar" id="projectBulkBar">
  <button class="btn small ghost" type="button" id="btnProjectSelectAll">انتخاب همهٔ نمایش‌داده‌شده‌ها</button>
  <button class="btn small ghost" type="button" id="btnProjectClearSelection">لغو انتخاب</button>
  <button class="btn small danger" type="button" id="btnProjectDeleteSelected" disabled>حذف انتخاب‌شده‌ها</button>
  <span class="bulkCount" id="projectBulkCount">۰ پروژه انتخاب شده</span>
</div>
${listAnchor}`;
s=s.replace(listAnchor,bulkUi);

const deleteOld=`function deleteProjectFromCenter(id){
  if(S.projects.length<=1){toast(' حداقل یک پروژه باید وجود داشته باشد','err');return;}
  const p=S.projects.find(x=>x.id===id);if(!p)return;
  if(!confirm('پروژه «'+p.name+'» و تمام داده‌های آن حذف شود؟'))return;
  S.projects=S.projects.filter(x=>x.id!==id);delete S.data[id];
  if(S.activeId===id)S.activeId=S.projects[0].id;
  saveAll();refreshAllUI();renderProjectCenter();toast(' پروژه حذف شد');
}`;
const deleteNew=`const projectBulkSelection=new Set();
function syncProjectBulkControls(){
  if(!S||!Array.isArray(S.projects))return;
  const valid=new Set(S.projects.map(p=>p.id));
  [...projectBulkSelection].forEach(id=>{if(!valid.has(id))projectBulkSelection.delete(id);});
  const count=projectBulkSelection.size;
  if($('projectBulkCount'))$('projectBulkCount').textContent=faN(count)+' پروژه انتخاب شده';
  if($('btnProjectDeleteSelected'))$('btnProjectDeleteSelected').disabled=count===0;
  document.querySelectorAll('.projectBulkCheck').forEach(cb=>{cb.checked=projectBulkSelection.has(cb.dataset.projectId);});
}
function toggleProjectBulkSelection(id,checked){
  if(checked)projectBulkSelection.add(id);else projectBulkSelection.delete(id);
  syncProjectBulkControls();
}
function selectAllVisibleProjects(){
  document.querySelectorAll('.projectBulkCheck').forEach(cb=>projectBulkSelection.add(cb.dataset.projectId));
  syncProjectBulkControls();
}
function clearProjectBulkSelection(){
  projectBulkSelection.clear();syncProjectBulkControls();
}
function projectPhotoIdsForRemoval(id){
  const d=S.data?.[id],ids=new Set();
  if(!d)return ids;
  Object.keys(d.photoMeta||{}).forEach(x=>{if(x)ids.add(x);});
  (Array.isArray(d.ncrs)?d.ncrs:[]).filter(Boolean).forEach(n=>{
    try{ncrPhotoIds(n,'before').forEach(x=>{if(x)ids.add(x);});ncrPhotoIds(n,'after').forEach(x=>{if(x)ids.add(x);});}catch(e){}
  });
  return ids;
}
function retainedProjectPhotoIds(excluded){
  const keep=new Set();
  (S.projects||[]).forEach(p=>{
    if(excluded.has(p.id))return;
    projectPhotoIdsForRemoval(p.id).forEach(x=>keep.add(x));
  });
  return keep;
}
async function purgeProjectPhotosBeforeDelete(ids){
  const removed=new Set(ids),owned=new Set(),retained=retainedProjectPhotoIds(removed);
  ids.forEach(id=>projectPhotoIdsForRemoval(id).forEach(x=>owned.add(x)));
  for(const phid of owned){
    if(retained.has(phid))continue;
    await idbDel('photos',phid);
    try{delete photoCache[phid];}catch(e){}
  }
  return owned.size;
}
async function deleteSelectedProjectsFromCenter(){
  const ids=[...projectBulkSelection].filter(id=>S.projects.some(p=>p.id===id));
  if(!ids.length){toast(' پروژه‌ای برای حذف انتخاب نشده است','err');return;}
  if(S.projects.length-ids.length<1){toast(' حداقل یک پروژه باید باقی بماند. یک پروژه را از انتخاب خارج کنید.','err');return;}
  if(!confirm(faN(ids.length)+' پروژه انتخاب شده است. همهٔ پروژه‌های انتخاب‌شده و تمام داده‌های آن‌ها حذف شوند؟'))return;
  try{await purgeProjectPhotosBeforeDelete(ids);}catch(e){console.error('project photo purge failed',e);toast(' حذف پروژه متوقف شد؛ پاک‌سازی عکس‌های پروژه کامل نشد.','err');return;}
  const removed=new Set(ids);
  S.projects=S.projects.filter(p=>!removed.has(p.id));
  ids.forEach(id=>delete S.data[id]);
  if(removed.has(S.activeId))S.activeId=S.projects[0].id;
  projectBulkSelection.clear();
  saveAll();refreshAllUI();renderProjectCenter();
  if(typeof activateTab==='function')activateTab('projects');
  toast(' '+faN(ids.length)+' پروژه و داده‌های وابسته حذف شد');
}
async function deleteProjectFromCenter(id){
  if(S.projects.length<=1){toast(' حداقل یک پروژه باید وجود داشته باشد','err');return;}
  const p=S.projects.find(x=>x.id===id);if(!p)return;
  if(!confirm('پروژه «'+p.name+'» و تمام داده‌های آن حذف شود؟'))return;
  try{await purgeProjectPhotosBeforeDelete([id]);}catch(e){console.error('project photo purge failed',e);toast(' حذف پروژه متوقف شد؛ پاک‌سازی عکس‌های پروژه کامل نشد.','err');return;}
  S.projects=S.projects.filter(x=>x.id!==id);delete S.data[id];
  projectBulkSelection.delete(id);
  if(S.activeId===id)S.activeId=S.projects[0].id;
  saveAll();refreshAllUI();renderProjectCenter();
  if(typeof activateTab==='function')activateTab('projects');
  toast(' پروژه و داده‌های وابسته حذف شد');
}`;
if(!s.includes(deleteOld))throw new Error('Project delete function anchor not found');
s=s.replace(deleteOld,deleteNew);

const cardOld=`return \`<div class="projectCard \${p.id===S.activeId?'active':''}">
            <div>
              <div class="projectCardName">\${esc(p.name||'پروژه بدون نام')}</div>`;
const cardNew=`return \`<div class="projectCard \${p.id===S.activeId?'active':''}">
            <label class="projectSelectBox" title="انتخاب برای حذف گروهی">
              <input class="projectBulkCheck" type="checkbox" data-project-id="\${p.id}" onchange="toggleProjectBulkSelection('\${p.id}',this.checked)" \${projectBulkSelection.has(p.id)?'checked':''}>
              <span>
                <div class="projectCardName">\${esc(p.name||'پروژه بدون نام')}</div>`;
if(!s.includes(cardOld))throw new Error('Project card start anchor not found');
s=s.replace(cardOld,cardNew);

const metaClose=`                \${p.id===S.activeId?'<span class="projectStatus done">✓ پروژه فعال</span>':''}
              </div>
            </div>
            <div class="projectCardActions">`;
const metaCloseNew=`                \${p.id===S.activeId?'<span class="projectStatus done">✓ پروژه فعال</span>':''}
              </div>
              </span>
            </label>
            <div class="projectCardActions">`;
if(!s.includes(metaClose))throw new Error('Project card meta close anchor not found');
s=s.replace(metaClose,metaCloseNew);

const renderTail=`  document.querySelectorAll('.projectMonthHead').forEach(h=>h.onclick=()=>{
    const id='pm_'+h.dataset.month.replace('-','_');$(id)?.classList.toggle('collapsed');
  });
}`;
const renderTailNew=`  document.querySelectorAll('.projectMonthHead').forEach(h=>h.onclick=()=>{
    const id='pm_'+h.dataset.month.replace('-','_');$(id)?.classList.toggle('collapsed');
  });
  syncProjectBulkControls();
}`;
if(!s.includes(renderTail))throw new Error('Project render tail anchor not found');
s=s.replace(renderTail,renderTailNew);

const bindAnchor=`/* ================= پشتیبان‌گیری و بازیابی ================= */`;
const bindCode=`document.addEventListener('DOMContentLoaded',()=>{
  $('btnProjectSelectAll')?.addEventListener('click',selectAllVisibleProjects);
  $('btnProjectClearSelection')?.addEventListener('click',clearProjectBulkSelection);
  $('btnProjectDeleteSelected')?.addEventListener('click',deleteSelectedProjectsFromCenter);
  syncProjectBulkControls();
});

${bindAnchor}`;
if(!s.includes(bindAnchor))throw new Error('Backup section anchor not found');
s=s.replace(bindAnchor,bindCode);

await writeFile(path,s,'utf8');
console.log('Project deletion UX patched: stay on Projects + multi-select + photo-safe bulk delete.');

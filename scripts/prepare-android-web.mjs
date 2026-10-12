import { mkdir, rm, copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'www');
const files = [
  'index.html',
  'license-manager-v61.js',
  'manifest.json',
  'sw.js',
  'fire-executive-fe-final-v3.svg',
  'fire-executive-header-v1.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of files) {
  await copyFile(join(root, file), join(out, file));
}
const androidIndex = join(out, 'index.html');
let androidHtml = await readFile(androidIndex, 'utf8');
const swStart = androidHtml.indexOf("if('serviceWorker' in navigator){");
const swEndMarker = "window.addEventListener('online'";
const swEnd = swStart >= 0 ? androidHtml.indexOf(swEndMarker, swStart) : -1;
if (swStart < 0 || swEnd < 0) {
  throw new Error('Android cache patch: service worker registration block not found');
}
const nativeOffline = `/* FEP-ANDROID-NATIVE-CACHE-v1 */
if(statusEl){
  statusEl.textContent='آفلاین داخلی اندروید فعال است';
  statusEl.style.color='var(--ok)';
}
`;
androidHtml = androidHtml.slice(0, swStart) + nativeOffline + androidHtml.slice(swEnd);
if (androidHtml.includes("navigator.serviceWorker.register(")) {
  throw new Error('Android cache patch: service worker registration still present');
}
/* FEP-ANDROID-CALC-AUDIT-v3
   Android-only regulatory wording correction. Stable web index.html is not modified.
   Deliberately uses plain string tokens (no regex literals) to keep the build patch syntax-safe. */
const replaceOnce = (from, to, label) => {
  const first = androidHtml.indexOf(from);
  if (first < 0) throw new Error('Android calc audit: missing ' + label);
  if (androidHtml.indexOf(from, first + from.length) >= 0) {
    throw new Error('Android calc audit: duplicate ' + label);
  }
  androidHtml = androidHtml.slice(0, first) + to + androidHtml.slice(first + from.length);
};

replaceOnce("if(dp<25||dp>87)", "if(dp<25||dp>90)", "stair pressure condition");
replaceOnce("25 تا 87 Pa پیش‌فرض این ابزار است.", "25 تا 90 Pa این ابزار است.", "stair pressure warning");
replaceOnce("title:'تعداد خاموش‌کننده دستی (NFPA 10)'", "title:'برآورد اولیه خاموش‌کننده دستی'", "extinguisher title");
replaceOnce("['سطح پوشش هر کپسول',fmt(per,0)+' m²']", "['سطح پوشش فرضی هر کپسول',fmt(per,0)+' m²']", "extinguisher coverage label");
replaceOnce("['تعداد حداقل',faN(cnt)+' عدد']", "['برآورد اولیه تعداد',faN(cnt)+' عدد']", "extinguisher count label");
replaceOnce("['حداکثر فاصله دسترسی',fmt(trav,0)+' m']", "['فاصله دسترسی فرضی',fmt(trav,0)+' m']", "extinguisher travel label");
replaceOnce(
  "showRes(9,lastRes[9].lines,'حداقل '+fmt(cnt,0)+' کپسول');",
  "showRes(9,lastRes[9].lines,'برآورد اولیه: '+fmt(cnt,0)+' کپسول','<div class=\"warnBadge\">⚠️ این خروجی برآورد اولیه است؛ انتخاب نهایی نوع، تعداد، اندازه و جانمایی خاموش‌کننده باید با نوع تصرف، سطح خطر، کلاس حریق، رتبه خاموش‌کننده و فاصله دسترسی طبق مرجع پروژه کنترل شود.</div>');",
  "extinguisher result"
);

if (androidHtml.includes("if(dp<25||dp>87)") || androidHtml.includes("25 تا 87 Pa پیش‌فرض این ابزار است.")) {
  throw new Error('Android calc audit: old stair pressure rule remains');
}
if (!androidHtml.includes("if(dp<25||dp>90)") || !androidHtml.includes("25 تا 90 Pa این ابزار است.")) {
  throw new Error('Android calc audit: corrected stair pressure rule missing');
}
if (!androidHtml.includes("برآورد اولیه خاموش‌کننده دستی") || !androidHtml.includes("برآورد اولیه تعداد")) {
  throw new Error('Android calc audit: extinguisher wording not applied');
}


/* FEP-ANDROID-SELECTED-PATH-WORDING-v1
   Android-only conceptual cleanup for calculator 12.
   Formulas, inputs, stored values and calculation engine are intentionally unchanged. */
replaceOnce(
  ' ۱۲) مسیر بحرانی شبکه</h3>',
  ' ۱۲) مسیر هیدرولیکی انتخاب‌شده</h3>',
  'selected path card title'
);
replaceOnce(
  "lastRes[12]={title:'محاسبه مسیر بحرانی شبکه اسپرینکلر',lines:[",
  "lastRes[12]={title:'محاسبه مسیر هیدرولیکی انتخاب‌شده',lines:[",
  'selected path invalid-result title'
);
replaceOnce(
  "lastRes[12]={title:'مسیر بحرانی شبکه اسپرینکلر',lines};",
  "lastRes[12]={title:'مسیر هیدرولیکی انتخاب‌شده',lines};",
  'selected path result title'
);
replaceOnce(
  "let extra='<div class=\"warnBadge\"> بیشترین افت در سگمنت '+maxLoss.i+' رخ داده است؛ این شاخص برای بازبینی مسیر بحرانی مفید است.</div>';",
  "let extra='<div class=\"warnBadge\"> بیشترین افت در مسیر واردشده مربوط به سگمنت '+maxLoss.i+' است. این نتیجه فقط بین سگمنت‌های همین مسیر مقایسه شده و بحرانی‌ترین مسیر کل شبکه را اثبات نمی‌کند.</div>';",
  'selected path max-loss wording'
);
replaceOnce(
  "if(maxVel>6)extra+='<div class=\"warnBadge\"> سرعت بیش از ۶ m/s در حداقل یک سگمنت دیده شد؛ قطر مسیر را با معیار پروژه کنترل کنید.</div>';",
  "if(maxVel>6)extra+='<div class=\"warnBadge\"> سرعت بیش از ۶ m/s در حداقل یک سگمنت دیده شد. در این ابزار، ۶ m/s فعلاً معیار کنترلی داخلی/پروژه است و تا تأیید بند دقیق مرجع نباید به‌عنوان حد عمومی و قطعی NFPA 13 تلقی شود؛ قطر مسیر را با مبنای پروژه کنترل کنید.</div>';",
  'selected path velocity wording'
);

if(androidHtml.includes(' ۱۲) مسیر بحرانی شبکه</h3>') ||
   androidHtml.includes("title:'مسیر بحرانی شبکه اسپرینکلر'") ||
   androidHtml.includes("title:'محاسبه مسیر بحرانی شبکه اسپرینکلر'")){
  throw new Error('Android selected-path wording: old critical-path claims remain');
}
if(!androidHtml.includes(' ۱۲) مسیر هیدرولیکی انتخاب‌شده</h3>') ||
   !androidHtml.includes("title:'مسیر هیدرولیکی انتخاب‌شده'") ||
   !androidHtml.includes('معیار کنترلی داخلی/پروژه')){
  throw new Error('Android selected-path wording: corrected wording missing');
}


/* FEP-ANDROID-NETWORK-PATH-AUDIT-v1
   Android-only: correct local-loss pressure units and compare directed source-to-terminal paths.
   Does not solve looped networks or redistribute branch flows automatically. */
function androidRunNetworkV1(){
  const n=netData(),issues=[];
  if(!n.nodes.length||!n.pipes.length)issues.push('حداقل یک Node و یک Pipe لازم است.');
  const nodeIds=n.nodes.map(x=>x.id);
  const pipeIds=n.pipes.map(x=>x.id);
  if(new Set(nodeIds).size!==nodeIds.length)issues.push('شناسه Node تکراری است.');
  if(new Set(pipeIds).size!==pipeIds.length)issues.push('شناسه Pipe تکراری است.');
  n.pipes.forEach(p=>{
    if(!n.nodes.some(x=>x.id===p.from)||!n.nodes.some(x=>x.id===p.to))issues.push('اتصال نامعتبر: '+p.id);
    if(p.from===p.to)issues.push('اتصال خودارجاع در '+p.id);
    if(p.L<=0||p.d<=0||p.C<=0||p.Q<0)issues.push('پارامتر نامعتبر در '+p.id);
  });
  if(issues.length){
    $('netResult').innerHTML='<div class="auditItem bad"><b> خطا</b><span class="auditSmall">'+issues.map(esc).join('<br>')+'</span></div>';
    return;
  }

  const nm=Object.fromEntries(n.nodes.map(x=>[x.id,x]));
  const out=n.pipes.map((p,idx)=>{
    const area=Math.PI*Math.pow(p.d/1000,2)/4;
    const vel=(p.Q/60000)/area;
    const hf=netHazen(p.Q,p.L,p.C,p.d);
    const hMinor=(Math.max(0,p.K)*1000*vel*vel/2)/100000;
    const dz=nm[p.to].elev-nm[p.from].elev;
    const hp=0.0980665*dz;
    return {...p,_idx:idx,vel,hf,hMinor,hElevation:hp,total:hf+hMinor+hp};
  });

  const outgoing={},indegree={},outdegree={};
  n.nodes.forEach(x=>{outgoing[x.id]=[];indegree[x.id]=0;outdegree[x.id]=0;});
  out.forEach(p=>{
    outgoing[p.from].push(p);
    indegree[p.to]=(indegree[p.to]||0)+1;
    outdegree[p.from]=(outdegree[p.from]||0)+1;
  });
  const sources=n.nodes.filter(x=>(indegree[x.id]||0)===0&&(outdegree[x.id]||0)>0).map(x=>x.id);
  const terminals=new Set(n.nodes.filter(x=>(outdegree[x.id]||0)===0&&(indegree[x.id]||0)>0).map(x=>x.id));
  const paths=[];
  let cycleDetected=false,truncated=false;
  const MAX_PATHS=500;
  function dfs(nodeId,segs,seen){
    if(paths.length>=MAX_PATHS){truncated=true;return;}
    if(terminals.has(nodeId)&&segs.length){
      const nodes=[segs[0].from].concat(segs.map(x=>x.to));
      const sums=segs.reduce((a,x)=>({friction:a.friction+x.hf,minor:a.minor+x.hMinor,elevation:a.elevation+x.hElevation,total:a.total+x.total}),{friction:0,minor:0,elevation:0,total:0});
      paths.push({nodes,segs:segs.slice(),...sums});
    }
    for(const p of (outgoing[nodeId]||[])){
      if(seen.has(p.to)){cycleDetected=true;continue;}
      const next=new Set(seen);next.add(p.to);
      dfs(p.to,segs.concat(p),next);
      if(truncated)return;
    }
  }
  sources.forEach(src=>dfs(src,[],new Set([src])));
  paths.sort((a,b)=>b.total-a.total);

  const worstPipe=out.reduce((a,b)=>a.total>b.total?a:b);
  let html='<div class="auditItem ok"><b> تحلیل شبکه انجام شد</b>';
  html+='<span class="auditSmall">تعداد Pipe: '+faN(out.length)+' · مبدأهای جهت‌دار: '+faN(sources.length)+' · انتهای مسیر: '+faN(terminals.size)+'</span>';
  if(paths.length){
    const best=paths[0];
    html+='<span class="auditSmall">مسیر با بیشترین نیاز فشار در شبکه واردشده: <strong>'+best.nodes.map(esc).join(' ← ')+'</strong> ('+fmt(best.total,3)+' bar)</span>';
    html+='<span class="auditSmall">بیشترین ΔP تک‌لوله: <strong>'+esc(worstPipe.id)+'</strong> ('+fmt(worstPipe.total,3)+' bar)</span>';
  }else{
    html+='<span class="auditSmall">مسیر کامل مبدأ تا انتها پیدا نشد؛ فقط افت تک‌لوله‌ها نمایش داده می‌شود.</span>';
  }
  html+='</div>';

  if(paths.length){
    html+='<div class="tableWrap"><table><thead><tr><th>مسیر</th><th>اصطکاک</th><th>موضعی</th><th>ارتفاع</th><th>جمع ΔP</th></tr></thead><tbody>';
    html+=paths.slice(0,10).map((p,i)=>'<tr><td>'+(i===0?'★ ':'')+p.nodes.map(esc).join(' ← ')+'</td><td>'+fmt(p.friction,3)+' bar</td><td>'+fmt(p.minor,3)+' bar</td><td>'+fmt(p.elevation,3)+' bar</td><td><b>'+fmt(p.total,3)+' bar</b></td></tr>').join('');
    html+='</tbody></table></div>';
  }

  html+='<div class="tableWrap"><table><thead><tr><th>Pipe</th><th>سرعت</th><th>افت اصطکاک</th><th>افت موضعی</th><th>ارتفاع</th><th>جمع ΔP</th></tr></thead><tbody>';
  html+=out.map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+fmt(x.vel,2)+' m/s</td><td>'+fmt(x.hf,3)+' bar</td><td>'+fmt(x.hMinor,3)+' bar</td><td>'+fmt(x.hElevation,3)+' bar</td><td>'+fmt(x.total,3)+' bar</td></tr>').join('');
  html+='</tbody></table></div>';

  const notes=[];
  notes.push('مقایسه مسیرها بر اساس جهت From → To و دبی Q واردشده برای هر Pipe انجام می‌شود؛ برنامه در این مرحله دبی شاخه‌ها را خودش بالانس یا بازتوزیع نمی‌کند.');
  notes.push('افت موضعی K به فشار دینامیکی آب تبدیل و سپس به bar تبدیل می‌شود: ΔPminor = Kρv²/2.');
  if(!sources.length)notes.push('مبدأ جهت‌دار با indegree صفر پیدا نشد؛ این وضعیت می‌تواند ناشی از حلقه یا جهت‌گذاری نامناسب اتصالات باشد.');
  if(cycleDetected)notes.push('حداقل یک حلقه شناسایی شد؛ مسیر حلقوی در مقایسه خودکار مسیرها دنبال نشده است.');
  if(truncated)notes.push('تعداد مسیرها از '+MAX_PATHS+' بیشتر شد؛ نمایش مسیرها برای کنترل کارایی محدود شده است.');
  html+='<div class="warnBadge">⚠️ '+notes.map(esc).join('<br>')+'</div>';
  $('netResult').innerHTML=html;
}
const runNetStart=androidHtml.indexOf('function runNetwork(){');
const runNetEnd=runNetStart>=0?androidHtml.indexOf('\nfunction exportNet(){',runNetStart):-1;
if(runNetStart<0||runNetEnd<0)throw new Error('Android network path audit: runNetwork block not found');
const androidRunNetworkCode=androidRunNetworkV1.toString().replace('function androidRunNetworkV1()','function runNetwork()');
androidHtml=androidHtml.slice(0,runNetStart)+androidRunNetworkCode+androidHtml.slice(runNetEnd);
if(!androidHtml.includes('ΔPminor = Kρv²/2')||!androidHtml.includes('مسیر با بیشترین نیاز فشار در شبکه واردشده')){
  throw new Error('Android network path audit: generated logic missing');
}


/* FEP-ANDROID-PROJECT-SCOPED-SYSTEM-MODEL-v1
   Android-only: equipment + topology live inside the active project state.
   Legacy global lists are migrated once into the active project, never copied to every project. */
replaceOnce(
  "photoMeta:{},parkingZones:[],parkingFans:[]};}",
  "photoMeta:{},parkingZones:[],parkingFans:[],systemEquipment:[],topologyConnections:[],hydraulicBranchAnalysis:null,pumpDesignPoint:null,pumpCandidate:null};}",
  'project model default arrays'
);

const eqStoreStart=androidHtml.indexOf("const KEY='FEP_EQUIPMENT_V55';");
const eqStoreEnd=eqStoreStart>=0?androidHtml.indexOf('function escE(',eqStoreStart):-1;
if(eqStoreStart<0||eqStoreEnd<0)throw new Error('Android project model: equipment storage block not found');
const eqProjectStore=`const KEY='FEP_EQUIPMENT_V55',MIG='FEP_EQUIPMENT_PROJECT_MIGRATED_V1';
function bucket(){const d=D();if(!Array.isArray(d.systemEquipment)){d.systemEquipment=[];if(!localStorage.getItem(MIG)){try{const legacy=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(legacy)&&legacy.length)d.systemEquipment=legacy;}catch(e){}localStorage.setItem(MIG,'1');saveAll();}}return d.systemEquipment;}
function get(){return bucket();}
function save(a){const d=D();d.systemEquipment=Array.isArray(a)?a:[];saveAll();}
`;
androidHtml=androidHtml.slice(0,eqStoreStart)+eqProjectStore+androidHtml.slice(eqStoreEnd);

const topoStoreStart=androidHtml.indexOf("const CK='FEP_CONNECTIONS_V56';");
const topoStoreEnd=topoStoreStart>=0?androidHtml.indexOf('function eq(){',topoStoreStart):-1;
if(topoStoreStart<0||topoStoreEnd<0)throw new Error('Android project model: topology storage block not found');
const topoProjectStore=`const CK='FEP_CONNECTIONS_V56',MIG='FEP_CONNECTIONS_PROJECT_MIGRATED_V1';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const typeLabel={duct:'کانال هوا',pipe:'لوله',control:'فرمان / کنترل',alarm:'اعلام حریق'};
function load(){const d=D();if(!Array.isArray(d.topologyConnections)){d.topologyConnections=[];if(!localStorage.getItem(MIG)){try{const legacy=JSON.parse(localStorage.getItem(CK)||'[]');if(Array.isArray(legacy)&&legacy.length)d.topologyConnections=legacy;}catch(e){}localStorage.setItem(MIG,'1');saveAll();}}return d.topologyConnections;}
function save(a){const d=D();d.topologyConnections=Array.isArray(a)?a:[];saveAll();}
`;
androidHtml=androidHtml.slice(0,topoStoreStart)+topoProjectStore+androidHtml.slice(topoStoreEnd);

replaceOnce(
  "window.FEPTopology={get:load,refresh:fill};",
  "window.FEPTopology={get:load,set:save,refresh:fill};",
  'topology setter exposure'
);

replaceOnce(
  "localStorage.setItem('FEP_CONNECTIONS_V56',JSON.stringify(a));",
  "FEPTopology.set(a);",
  'pressure-loss project topology write'
);

const refreshUiStart=androidHtml.indexOf('function refreshAllUI(){');
const refreshProjectCall=refreshUiStart>=0?androidHtml.indexOf('renderProjectCenter();',refreshUiStart):-1;
if(refreshUiStart<0||refreshProjectCall<0)throw new Error('Android project model: refreshAllUI anchor not found');
const refreshInsertAt=refreshProjectCall+'renderProjectCenter();'.length;
androidHtml=androidHtml.slice(0,refreshInsertAt)+"\ntry{window.FEPEquipment?.render();window.FEPTopology?.refresh();window.FEPPathAnalyzer?.fill();window.FEPPumpDesign?.refresh();}catch(e){console.warn('project model refresh',e);}"+androidHtml.slice(refreshInsertAt);

if(!androidHtml.includes('systemEquipment:[],topologyConnections:[]') ||
   !androidHtml.includes('FEP_EQUIPMENT_PROJECT_MIGRATED_V1') ||
   !androidHtml.includes('FEP_CONNECTIONS_PROJECT_MIGRATED_V1') ||
   !androidHtml.includes('window.FEPTopology={get:load,set:save,refresh:fill}') ||
   !androidHtml.includes("FEPTopology.set(a);")){
  throw new Error('Android project-scoped system model: generated logic missing');
}
if(androidHtml.includes("localStorage.setItem('FEP_CONNECTIONS_V56',JSON.stringify(a));")){
  throw new Error('Android project-scoped system model: legacy direct topology write remains');
}


replaceOnce(
  "function saveNet(){saveAll();renderNet();}",
  "function saveNet(){const d=D();if(d.hydraulicBranchAnalysis)d.hydraulicBranchAnalysis={...d.hydraulicBranchAnalysis,stale:true};if(d.pumpDesignPoint)d.pumpDesignPoint={...d.pumpDesignPoint,stale:true};saveAll();renderNet();window.FEPPumpDesign?.invalidate?.();}",
  'pump point staleness on network edit'
);

/* FEP-ANDROID-BRANCHED-NETWORK-SOLVER-v1
   Android-only: upgrade the legacy v3.8 card into a directed branched-network analysis.
   Supports acyclic single-parent branches. Loops/merges are explicitly rejected, not guessed. */

// Node editor: add optional demand and required terminal pressure.
replaceOnce(
  '<div class="row"><input id="netNodeId" placeholder="N1"><input id="netNodeElev" type="number" value="0" placeholder="ارتفاع"></div>',
  '<div class="row"><label style="flex:1;min-width:0">شناسه Node<input id="netNodeId" type="text" placeholder="N1"></label><label style="flex:1;min-width:0">ارتفاع (m)<input id="netNodeElev" type="number" value="0" placeholder="ارتفاع (m)"></label></div><div class="row"><label style="flex:1;min-width:0">تقاضای دبی (L/min)<input id="netNodeDemand" type="number" min="0" value="0" placeholder="تقاضای دبی (L/min)"></label><label style="flex:1;min-width:0">فشار لازم (bar)<input id="netNodeReqP" type="number" min="0" step="0.01" value="0" placeholder="فشار لازم (bar)"></label></div>',
  'branched solver node inputs'
);

// Existing simple comparison is loss-only, not full pressure demand.
replaceOnce(
  'مسیر با بیشترین نیاز فشار در شبکه واردشده:',
  'مسیر با بیشترین افت فشار تجمعی در شبکه واردشده:',
  'network cumulative-loss wording'
);

// Show the new node fields in the current network list.
replaceOnce(
  'ارتفاع: \${fmt(x.elev,2)} m <button class="btn ghost" onclick="netDelNode(\${i})">حذف</button>',
  'ارتفاع: \${fmt(x.elev,2)} m | تقاضا: \${fmt(x.demandLpm||0,1)} L/min | فشار لازم: \${fmt(x.requiredBar||0,2)} bar <button class="btn ghost" onclick="netDelNode(\${i})">حذف</button>',
  'branched solver node list'
);

// Persist demand/required pressure when creating a node.
const initNetNeedle="n.nodes.push({id,elev});$('netNodeId').value='';saveNet();";
if(!androidHtml.includes(initNetNeedle))throw new Error('Android branched solver: initNet node push not found');
androidHtml=androidHtml.replace(
  initNetNeedle,
  "const demandLpm=Math.max(0,parseFloat($('netNodeDemand')?.value)||0),requiredBar=Math.max(0,parseFloat($('netNodeReqP')?.value)||0);n.nodes.push({id,elev,demandLpm,requiredBar});$('netNodeId').value='';if($('netNodeDemand'))$('netNodeDemand').value='0';if($('netNodeReqP'))$('netNodeReqP').value='0';saveNet();"
);

// Replace the legacy solver IIFE as one self-contained block.
const oldSolverStart=androidHtml.indexOf('/* ================= حل شبکه گره‌ای ================= */');
const oldSolverEnd=oldSolverStart>=0?androidHtml.indexOf('/* ================= بانک مبحث ۳ ================= */',oldSolverStart):-1;
if(oldSolverStart<0||oldSolverEnd<0)throw new Error('Android branched solver: legacy solver block not found');

const branchedSolver=`/* ================= تحلیل شاخه‌ای شبکه — Android ================= */
(function(){
const NS=window.FEPNetworkSolver={
 version:'4.0-branch',
 solve(net,opts={}){
  const nodes=Array.isArray(net?.nodes)?net.nodes:[],pipes=Array.isArray(net?.pipes)?net.pipes:[];
  if(!nodes.length)return {ok:false,error:'شبکه فاقد Node است.'};
  if(!pipes.length)return {ok:false,error:'شبکه فاقد Pipe است.'};
  const ids=new Set(nodes.map(n=>n.id));
  const valid=pipes.filter(p=>ids.has(p.from)&&ids.has(p.to)&&p.from!==p.to);
  if(!valid.length)return {ok:false,error:'هیچ Pipe معتبر بین Nodeها وجود ندارد.'};

  const incoming={},outgoing={};
  nodes.forEach(n=>{incoming[n.id]=[];outgoing[n.id]=[];});
  valid.forEach(p=>{outgoing[p.from].push(p);incoming[p.to].push(p);});

  const autoSource=nodes.find(n=>incoming[n.id].length===0&&outgoing[n.id].length>0)?.id||nodes[0].id;
  const sourceId=opts.sourceId||autoSource;
  if(!ids.has(sourceId))return {ok:false,error:'Node منبع پیدا نشد.'};

  const sourceP=Number.isFinite(Number(opts.sourcePressureBar))?Number(opts.sourcePressureBar):7;
  const rho=Number(opts.rho||1000),g=9.80665;
  const reachable=new Set(),visiting=new Set();
  let cycle=false;
  function mark(id){
    if(visiting.has(id)){cycle=true;return;}
    if(reachable.has(id))return;
    visiting.add(id);reachable.add(id);
    (outgoing[id]||[]).forEach(p=>mark(p.to));
    visiting.delete(id);
  }
  mark(sourceId);
  if(cycle)return {ok:false,error:'شبکه دارای حلقه است. تحلیل شاخه‌ای این مرحله فقط شبکه بدون حلقه را حل می‌کند.'};

  const merge=nodes.find(n=>n.id!==sourceId&&reachable.has(n.id)&&(incoming[n.id]||[]).filter(p=>reachable.has(p.from)).length>1);
  if(merge)return {ok:false,error:'گره '+merge.id+' بیش از یک مسیر ورودی دارد. تحلیل شاخه‌ای این مرحله شبکه‌های ادغام‌شونده/حلقوی را حل نمی‌کند.'};

  const unreachable=nodes.filter(n=>!reachable.has(n.id)).map(n=>n.id);
  const demand={};
  nodes.forEach(n=>demand[n.id]=Math.max(0,Number(n.demandLpm||0)));
  const demandMode=Object.values(demand).some(v=>v>0);

  const memo={};
  function subtree(id){
    if(memo[id]!=null)return memo[id];
    let q=demand[id]||0;
    (outgoing[id]||[]).forEach(p=>{if(reachable.has(p.to))q+=subtree(p.to);});
    memo[id]=q;return q;
  }
  subtree(sourceId);

  function flowFor(p){return demandMode?Math.max(0,subtree(p.to)):Math.max(0,Number(p.Q||0));}
  function lossParts(p,q){
    const d=Math.max(1,Number(p.diameterMm||p.d||50));
    const L=Math.max(0,Number(p.lengthM||p.L||p.length||0));
    const C=Math.max(1,Number(p.C||100));
    const qSI=q/60000,area=Math.PI*Math.pow(d/1000,2)/4,velocity=area?qSI/area:0;
    const friction=6.05e5*Math.pow(Math.max(q,0),1.85)/(Math.pow(C,1.85)*Math.pow(d,4.87))*L;
    const K=Math.max(0,Number(p.K||p.minorK||0));
    const minor=(K*rho*velocity*velocity/2)/100000;
    const from=nodes.find(n=>n.id===p.from)||{elev:0},to=nodes.find(n=>n.id===p.to)||{elev:0};
    const elevation=(rho*g*(Number(to.elev||0)-Number(from.elev||0)))/100000;
    return {velocity,friction,minor,elevation,total:friction+minor+elevation};
  }

  const pressure={[sourceId]:sourceP},pathLoss={[sourceId]:0},pathNodes={[sourceId]:[sourceId]},results=[];
  function propagate(id){
    for(const p of (outgoing[id]||[])){
      if(!reachable.has(p.to))continue;
      const q=flowFor(p),m=lossParts(p,q);
      pressure[p.to]=(pressure[id]??sourceP)-m.total;
      pathLoss[p.to]=(pathLoss[id]||0)+m.total;
      pathNodes[p.to]=(pathNodes[id]||[id]).concat(p.to);
      results.push({...p,flowLpm:q,velocity:m.velocity,frictionBar:m.friction,minorBar:m.minor,elevationBar:m.elevation,totalLossBar:m.total,upstreamPressureBar:pressure[id],downstreamPressureBar:pressure[p.to]});
      propagate(p.to);
    }
  }
  propagate(sourceId);

  const terminals=nodes.filter(n=>reachable.has(n.id)&&(outgoing[n.id]||[]).filter(p=>reachable.has(p.to)).length===0&&n.id!==sourceId).map(n=>{
    const requiredBar=Math.max(0,Number(n.requiredBar||0));
    const cumulativeLossBar=pathLoss[n.id]||0;
    return {id:n.id,pressureBar:pressure[n.id],demandLpm:demand[n.id],requiredBar,cumulativeLossBar,requiredSourceBar:requiredBar+cumulativeLossBar,path:pathNodes[n.id]||[sourceId,n.id]};
  });
  const controlling=terminals.reduce((a,b)=>!a||b.requiredSourceBar>a.requiredSourceBar?b:a,null);
  const minTerminal=terminals.reduce((a,b)=>!a||b.pressureBar<a.pressureBar?b:a,null);
  const sourceFlowLpm=demandMode?subtree(sourceId):(outgoing[sourceId]||[]).reduce((sum,p)=>sum+flowFor(p),0);
  return {ok:true,version:this.version,mode:demandMode?'node-demand':'entered-pipe-flow',sourceId,sourcePressureBar:sourceP,sourceFlowLpm,results,terminals,controlling,minTerminal,unreachable};
 }
};

function mount(){
 let lastBranchResult=null,lastBranchProjectId=null;
 const host=document.querySelector('#sec-network, #hydraulicNetwork, [data-network-editor]');
 if(!host||document.getElementById('v38SolverCard'))return;
 const card=document.createElement('section');card.id='v38SolverCard';card.className='card';
 card.innerHTML='<h3> تحلیل شاخه‌ای شبکه</h3><div class="muted" style="margin-bottom:8px">برای شبکه‌های جهت‌دار و بدون حلقه. اگر «تقاضای گره» ثبت شده باشد، دبی شاخه‌ها از مجموع تقاضای پایین‌دست محاسبه می‌شود؛ در غیر این صورت Q واردشده هر Pipe استفاده می‌شود.</div><div class="grid"><label>فشار منبع برای کنترل فشار باقیمانده (bar)<input id="v38SourceP" type="number" step="0.1" value="7"></label><label>شناسه Node منبع<input id="v38SourceId" type="text" placeholder="خالی = تشخیص خودکار"></label></div><button class="btn primary" id="v38Solve" type="button">تحلیل شاخه‌ای</button><div id="v38Out" class="result" style="margin-top:10px"></div>';
 host.appendChild(card);
 document.getElementById('v38Solve').onclick=runBranchAnalysis;

 const pumpCard=document.createElement('section');pumpCard.id='fepPumpDesignCard';pumpCard.className='card';
 pumpCard.innerHTML='<h3> نقطه طراحی اولیه پمپ</h3>'+
  '<div class="muted" style="margin-bottom:8px">این بخش از آخرین تحلیل شاخه‌ای، دبی منبع و فشار لازم مسیر کنترل‌کننده را می‌گیرد. خروجی «نقطه طراحی اولیه» است و به‌تنهایی انتخاب نهایی پمپ یا تأیید NFPA 20 محسوب نمی‌شود.</div>'+
  '<div class="grid">'+
   '<label>فشار قابل اتکای منبع قبل از پمپ (bar)<input id="pumpAvailP" type="number" min="0" step="0.01" value="0"></label>'+
   '<label>افت خارج از مدل شبکه (bar)<input id="pumpExtraLoss" type="number" min="0" step="0.01" value="0"></label>'+
   '<label>حاشیه طراحی کاربر (%)<input id="pumpMargin" type="number" min="0" step="1" value="0"></label>'+
  '</div>'+
  '<div class="actions" style="margin-top:8px"><button class="btn primary" id="pumpCalcPoint" type="button">محاسبه و ذخیره نقطه طراحی</button><button class="btn ghost" id="pumpClearPoint" type="button">پاک‌کردن نقطه ذخیره‌شده</button></div>'+
  '<div id="pumpPointOut" class="result" style="margin-top:10px"></div>';
 host.appendChild(pumpCard);

 const pumpCheckCard=document.createElement('section');pumpCheckCard.id='fepPumpCheckCard';pumpCheckCard.className='card';
 pumpCheckCard.innerHTML='<h3> کنترل پمپ انتخابی با نقطه طراحی</h3>'+
   '<div class="muted" style="margin-bottom:8px">مشخصات پمپ و چند نقطه واقعی از منحنی Q-H کاتالوگ را وارد کنید. برنامه فقط در محدوده نقاط واردشده درون‌یابی می‌کند و خارج از محدوده منحنی نتیجه تأییدی نمی‌دهد.</div>'+
   '<div class="grid">'+
     '<label>نام / مدل پمپ<input id="pumpCandidateName" type="text" placeholder="مثلاً Fire Pump FP-01"></label>'+
     '<label>دبی نامی<input id="pumpRatedQ" type="number" min="0" step="0.1" placeholder="مثلاً 300"></label>'+
     '<label>واحد دبی نامی<select id="pumpRatedQUnit"><option value="gpm">gpm</option><option value="lpm">L/min</option></select></label>'+
     '<label>هد نامی<input id="pumpRatedH" type="number" min="0" step="0.1" placeholder="مثلاً 85"></label>'+
     '<label>واحد هد<select id="pumpRatedHUnit"><option value="m">mH₂O</option><option value="bar">bar</option></select></label>'+
   '</div>'+
   '<label style="display:block;margin-top:8px">نقاط منحنی Q-H — هر خط: دبی ، هد<textarea id="pumpCurveText" rows="5" placeholder="مثال: 0,95 ؛ 300,85 ؛ 450,75"></textarea></label>'+
   '<div class="grid" style="margin-top:8px">'+
     '<label>واحد دبی منحنی<select id="pumpCurveQUnit"><option value="gpm">gpm</option><option value="lpm">L/min</option></select></label>'+
     '<label>واحد هد منحنی<select id="pumpCurveHUnit"><option value="m">mH₂O</option><option value="bar">bar</option></select></label>'+
   '</div>'+
   '<div class="actions" style="margin-top:8px"><button class="btn primary" id="pumpCheckSelected" type="button">ذخیره و کنترل پمپ</button><button class="btn ghost" id="pumpClearSelected" type="button">پاک‌کردن پمپ انتخابی</button></div>'+
   '<div id="pumpSelectedOut" class="result" style="margin-top:10px"></div>';
 host.appendChild(pumpCheckCard);

 function pumpQToLpm(v,unit){v=Number(v);return unit==='gpm'?v*3.785411784:v;}
 function pumpHToM(v,unit){v=Number(v);return unit==='bar'?v*10.19716213:v;}
 function parsePumpCurve(text,qUnit,hUnit){
   const rows=String(text||'').split(/\\n+/).map(x=>x.trim()).filter(Boolean),pts=[];
   for(let i=0;i<rows.length;i++){
     const parts=rows[i].split(/[;,\\t ]+/).filter(Boolean);
     if(parts.length<2)return {ok:false,error:'فرمت خط '+(i+1)+' منحنی نامعتبر است. هر خط باید دبی و هد داشته باشد.'};
     const q=Number(parts[0]),h=Number(parts[1]);
     if(!Number.isFinite(q)||!Number.isFinite(h)||q<0||h<0)return {ok:false,error:'عدد نامعتبر در خط '+(i+1)+' منحنی.'};
     pts.push({qLpm:pumpQToLpm(q,qUnit),headM:pumpHToM(h,hUnit),rawQ:q,rawH:h});
   }
   if(pts.length<2)return {ok:false,error:'حداقل دو نقطه از منحنی پمپ لازم است.'};
   pts.sort((a,b)=>a.qLpm-b.qLpm);
   for(let i=1;i<pts.length;i++)if(Math.abs(pts[i].qLpm-pts[i-1].qLpm)<1e-9)return {ok:false,error:'دو نقطه منحنی دبی یکسان دارند؛ دبی هر نقطه باید یکتا باشد.'};
   return {ok:true,points:pts};
 }
 function pumpCurveAt(points,qLpm){
   if(!Array.isArray(points)||points.length<2)return {ok:false,reason:'curve'};
   const min=points[0].qLpm,max=points[points.length-1].qLpm;
   if(qLpm<min||qLpm>max)return {ok:false,reason:'range',min,max};
   for(const p of points)if(Math.abs(p.qLpm-qLpm)<1e-9)return {ok:true,headM:p.headM,left:p,right:p};
   for(let i=1;i<points.length;i++){
     const a=points[i-1],b=points[i];
     if(qLpm>=a.qLpm&&qLpm<=b.qLpm){
       const t=(qLpm-a.qLpm)/(b.qLpm-a.qLpm);
       return {ok:true,headM:a.headM+(b.headM-a.headM)*t,left:a,right:b};
     }
   }
   return {ok:false,reason:'range',min,max};
 }
 function pumpCurveMonotonicWarning(points){
   for(let i=1;i<points.length;i++)if(points[i].headM>points[i-1].headM+1e-9)return true;
   return false;
 }
 function renderPumpCandidate(candidate){
   const out=document.getElementById('pumpSelectedOut');if(!out)return;
   if(!candidate){out.innerHTML='<span class="muted">هنوز پمپ انتخابی برای پروژه فعال ذخیره نشده است.</span>';return;}
   const d=typeof D==='function'?D():null,point=d?.pumpDesignPoint||null;
   const stale=!point||point.stale||candidate.checkStale||candidate.checkedAgainst!==point.savedAt;
   const staleHtml=stale?'<div class="warnBadge" style="margin-bottom:8px">⚠️ نتیجه کنترل با نقطه طراحی فعلی همگام نیست؛ پس از به‌روزرسانی شبکه/نقطه طراحی، پمپ را دوباره کنترل کنید.</div>':'';
   let body=staleHtml+'<b>'+String(candidate.name||'پمپ انتخابی')+'</b><br>'+
     'نامی: '+Number(candidate.ratedQLpm||0).toFixed(1)+' L/min · '+Number(candidate.ratedHeadM||0).toFixed(1)+' mH₂O<br>'+
     'تعداد نقاط منحنی: '+Number(candidate.points?.length||0);
   if(candidate.check&&candidate.check.status==='inside'){
     const c=candidate.check,cls=c.marginHeadM>=0?'ok':'bad';
     body+='<div class="auditItem '+cls+'" style="margin-top:8px"><b>'+(c.marginHeadM>=0?'هد منحنی در نقطه طراحی کافی است':'هد منحنی در نقطه طراحی کافی نیست')+'</b>'+
       '<span class="auditSmall">Q طراحی='+Number(c.designQLpm).toFixed(1)+' L/min · هد لازم='+Number(c.requiredHeadM).toFixed(2)+' mH₂O · هد منحنی≈'+Number(c.availableHeadM).toFixed(2)+' mH₂O · حاشیه='+Number(c.marginHeadM).toFixed(2)+' mH₂O</span></div>';
   }else if(candidate.check&&candidate.check.status==='outside'){
     const c=candidate.check;
     body+='<div class="auditItem warn" style="margin-top:8px"><b>قابل تأیید نیست — دبی طراحی خارج از محدوده منحنی واردشده است</b>'+
       '<span class="auditSmall">Q طراحی='+Number(c.designQLpm).toFixed(1)+' L/min · بازه منحنی='+Number(c.minQLpm).toFixed(1)+' تا '+Number(c.maxQLpm).toFixed(1)+' L/min. برون‌یابی انجام نشده است.</span></div>';
   }
   if(candidate.nonMonotonic)body+='<div class="warnBadge" style="margin-top:8px">⚠️ در نقاط واردشده، هد در بخشی از منحنی با افزایش دبی بیشتر شده است. ترتیب/اعداد کاتالوگ را دوباره کنترل کنید.</div>';
   body+='<div class="warnBadge" style="margin-top:8px">⚠️ این کنترل فقط تطابق Q-H منحنی واردشده با نقطه طراحی فعلی را بررسی می‌کند. وضعیت تأییدیه/لیستینگ پمپ، توان موتور، NPSH، فشار پوسته، کنترلر، آرایش پمپ‌خانه و الزامات دقیق مرجع پروژه جداگانه بررسی می‌شوند.</div>';
   out.innerHTML=body;
 }
 function refreshPumpCandidate(){
   const d=typeof D==='function'?D():null,c=d?.pumpCandidate||null;
   if(c){
     if(document.getElementById('pumpCandidateName'))document.getElementById('pumpCandidateName').value=c.name||'';
     if(document.getElementById('pumpRatedQ'))document.getElementById('pumpRatedQ').value=c.ratedQRaw??'';
     if(document.getElementById('pumpRatedQUnit'))document.getElementById('pumpRatedQUnit').value=c.ratedQUnit||'gpm';
     if(document.getElementById('pumpRatedH'))document.getElementById('pumpRatedH').value=c.ratedHRaw??'';
     if(document.getElementById('pumpRatedHUnit'))document.getElementById('pumpRatedHUnit').value=c.ratedHUnit||'m';
     if(document.getElementById('pumpCurveText'))document.getElementById('pumpCurveText').value=c.curveText||'';
     if(document.getElementById('pumpCurveQUnit'))document.getElementById('pumpCurveQUnit').value=c.curveQUnit||'gpm';
     if(document.getElementById('pumpCurveHUnit'))document.getElementById('pumpCurveHUnit').value=c.curveHUnit||'m';
   }
   renderPumpCandidate(c);
 }
 function checkSelectedPump(){
   const d=typeof D==='function'?D():null,point=d?.pumpDesignPoint||null;
   if(!point){if(typeof toast==='function')toast('ابتدا نقطه طراحی اولیه پمپ را محاسبه و ذخیره کنید','err');return;}
   if(point.stale){if(typeof toast==='function')toast('نقطه طراحی قدیمی است؛ ابتدا تحلیل شبکه و نقطه طراحی را دوباره محاسبه کنید','err');return;}
   const name=document.getElementById('pumpCandidateName').value.trim()||'پمپ انتخابی';
   const ratedQRaw=parseFloat(document.getElementById('pumpRatedQ').value),ratedHRaw=parseFloat(document.getElementById('pumpRatedH').value);
   const ratedQUnit=document.getElementById('pumpRatedQUnit').value,ratedHUnit=document.getElementById('pumpRatedHUnit').value;
   const curveText=document.getElementById('pumpCurveText').value,curveQUnit=document.getElementById('pumpCurveQUnit').value,curveHUnit=document.getElementById('pumpCurveHUnit').value;
   if(!(ratedQRaw>0)||!(ratedHRaw>0)){if(typeof toast==='function')toast('دبی و هد نامی پمپ را وارد کنید','err');return;}
   const parsed=parsePumpCurve(curveText,curveQUnit,curveHUnit);
   if(!parsed.ok){if(typeof toast==='function')toast(parsed.error,'err');return;}
   const qDesign=Number(point.flowLpm||0),requiredHeadM=Number(point.designHeadM||0);
   const at=pumpCurveAt(parsed.points,qDesign);
   const check=at.ok?{status:'inside',designQLpm:qDesign,requiredHeadM,availableHeadM:at.headM,marginHeadM:at.headM-requiredHeadM,left:at.left,right:at.right}:{status:'outside',designQLpm:qDesign,requiredHeadM,minQLpm:at.min,maxQLpm:at.max};
   const candidate={
     version:'1.0',
     projectId:(typeof S!=='undefined'?S.activeId:''),
     name,
     ratedQRaw,ratedQUnit,ratedQLpm:pumpQToLpm(ratedQRaw,ratedQUnit),
     ratedHRaw,ratedHUnit,ratedHeadM:pumpHToM(ratedHRaw,ratedHUnit),
     curveText,curveQUnit,curveHUnit,points:parsed.points,
     nonMonotonic:pumpCurveMonotonicWarning(parsed.points),
     checkedAgainst:point.savedAt,
     checkStale:false,
     check,
     savedAt:new Date().toISOString()
   };
   d.pumpCandidate=candidate;if(typeof saveAll==='function')saveAll();
   renderPumpCandidate(candidate);
   if(typeof toast==='function')toast(at.ok?'کنترل منحنی پمپ انجام و ذخیره شد':'پمپ ذخیره شد؛ دبی طراحی خارج از بازه منحنی است',at.ok?'ok':'err');
 }
 function renderPumpPoint(point){
   const out=document.getElementById('pumpPointOut');if(!out)return;
   if(!point){out.innerHTML='<span class="muted">هنوز نقطه طراحی برای پروژه فعال ذخیره نشده است. ابتدا «تحلیل شاخه‌ای» را اجرا کنید.</span>';return;}
   const staleNote=point.stale?'<div class="warnBadge" style="margin-bottom:8px">⚠️ شبکه هیدرولیکی بعد از ذخیره این نقطه تغییر کرده است؛ برای استفاده مهندسی، تحلیل شاخه‌ای و نقطه طراحی را دوباره محاسبه کنید.</div>':'';
   out.innerHTML=staleNote+'<b>نقطه طراحی اولیه ذخیره‌شده</b><br>'+
     'دبی طراحی: <b>'+Number(point.flowLpm||0).toFixed(1)+' L/min</b> ('+Number(point.flowGpm||0).toFixed(1)+' gpm)<br>'+
     'فشار لازم در Node منبع شبکه: <b>'+Number(point.requiredNetworkBar||0).toFixed(3)+' bar</b><br>'+
     'افت خارج از مدل: '+Number(point.externalLossBar||0).toFixed(3)+' bar<br>'+
     'فشار قابل اتکای قبل از پمپ: '+Number(point.availableSourceBar||0).toFixed(3)+' bar<br>'+
     'افزایش فشار پایه موردنیاز: <b>'+Number(point.baseBoostBar||0).toFixed(3)+' bar</b><br>'+
     'حاشیه طراحی کاربر: '+Number(point.marginPct||0).toFixed(1)+'٪<br>'+
     'افزایش فشار طراحی اولیه: <b>'+Number(point.designBoostBar||0).toFixed(3)+' bar</b> ≈ <b>'+Number(point.designHeadM||0).toFixed(1)+' mH₂O</b><br>'+
     'مسیر کنترل‌کننده: <b>'+((point.path||[]).join(' ← ')||'—')+'</b>'+
     '<div class="warnBadge" style="margin-top:8px">⚠️ این مقدار فقط اختلاف فشار اولیه موردنیاز بر اساس شبکه مدل‌شده است. شرایط واقعی مکش/منبع، اختلاف تراز پمپ با نقطه مرجع، افت شیرآلات و تجهیزات خارج از مدل، الزامات بهره‌برداری، منحنی سازنده و مرجع دقیق پروژه باید جداگانه کنترل شوند.</div>';
 }
 function refreshPumpPoint(){
   lastBranchResult=null;lastBranchProjectId=null;
   const p=(typeof D==='function'?D().pumpDesignPoint:null)||null;
   if(document.getElementById('pumpAvailP')&&p){
     document.getElementById('pumpAvailP').value=Number(p.availableSourceBar||0);
     document.getElementById('pumpExtraLoss').value=Number(p.externalLossBar||0);
     document.getElementById('pumpMargin').value=Number(p.marginPct||0);
   }
   renderPumpPoint(p);
   refreshPumpCandidate();
 }
 function calculatePumpPoint(){
   const r=lastBranchResult;
   if(!r||!r.ok){renderPumpPoint((typeof D==='function'?D().pumpDesignPoint:null)||null);if(typeof toast==='function')toast('ابتدا تحلیل شاخه‌ای شبکه را اجرا کنید','err');return;}
   if(lastBranchProjectId!==(typeof S!=='undefined'?S.activeId:null)){lastBranchResult=null;lastBranchProjectId=null;if(typeof toast==='function')toast('پروژه فعال تغییر کرده است؛ تحلیل شبکه را برای همین پروژه دوباره اجرا کنید','err');return;}
   if(!r.controlling||!r.terminals.length){if(typeof toast==='function')toast('مسیر انتهایی قابل تحلیل پیدا نشد','err');return;}
   if(!r.terminals.some(t=>Number(t.requiredBar||0)>0)){if(typeof toast==='function')toast('برای ساخت نقطه طراحی، فشار لازم حداقل یک Node انتهایی را ثبت کنید','err');return;}
   const flowLpm=Math.max(0,Number(r.sourceFlowLpm||0));
   if(!(flowLpm>0)){if(typeof toast==='function')toast('دبی منبع صفر است؛ تقاضای گره‌ها یا Q لوله‌های مبدأ را کنترل کنید','err');return;}
   const availableSourceBar=Math.max(0,parseFloat(document.getElementById('pumpAvailP').value)||0);
   const externalLossBar=Math.max(0,parseFloat(document.getElementById('pumpExtraLoss').value)||0);
   const marginPct=Math.max(0,parseFloat(document.getElementById('pumpMargin').value)||0);
   const requiredNetworkBar=Math.max(0,Number(r.controlling.requiredSourceBar||0));
   const requiredDischargeBar=requiredNetworkBar+externalLossBar;
   const baseBoostBar=Math.max(0,requiredDischargeBar-availableSourceBar);
   const designBoostBar=baseBoostBar*(1+marginPct/100);
   const point={
     version:'1.0',
     projectId:(typeof S!=='undefined'?S.activeId:''),
     stale:false,
     flowLpm,
     flowGpm:flowLpm/3.785411784,
     flowBasis:r.mode,
     sourceNode:r.sourceId,
     controllingTerminal:r.controlling.id,
     path:r.controlling.path||[],
     requiredNetworkBar,
     externalLossBar,
     requiredDischargeBar,
     availableSourceBar,
     baseBoostBar,
     marginPct,
     designBoostBar,
     designHeadM:designBoostBar*10.19716213,
     savedAt:new Date().toISOString()
   };
   const d=typeof D==='function'?D():null;
   if(d){
     d.pumpDesignPoint=point;
     if(d.pumpCandidate)d.pumpCandidate={...d.pumpCandidate,checkStale:true};
     if(typeof saveAll==='function')saveAll();
   }
   renderPumpPoint(point);
   renderPumpCandidate(d?.pumpCandidate||null);
   if(typeof toast==='function')toast('نقطه طراحی اولیه پمپ در پروژه فعال ذخیره شد');
 }
 window.FEPPumpDesign={
   setAnalysis:r=>{lastBranchResult=r;lastBranchProjectId=r?(typeof S!=='undefined'?S.activeId:null):null;},
   calculate:calculatePumpPoint,
   refresh:refreshPumpPoint,
   refreshCandidate:refreshPumpCandidate,
   invalidate:()=>{lastBranchResult=null;lastBranchProjectId=null;renderPumpPoint((typeof D==='function'?D().pumpDesignPoint:null)||null);renderPumpCandidate((typeof D==='function'?D().pumpCandidate:null)||null);}
 };
 document.getElementById('pumpCalcPoint').onclick=calculatePumpPoint;
 document.getElementById('pumpCheckSelected').onclick=checkSelectedPump;
 document.getElementById('pumpClearSelected').onclick=()=>{
   const d=typeof D==='function'?D():null;if(d){d.pumpCandidate=null;if(typeof saveAll==='function')saveAll();}
   ['pumpCandidateName','pumpRatedQ','pumpRatedH','pumpCurveText'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
   renderPumpCandidate(null);if(typeof toast==='function')toast('پمپ انتخابی از پروژه فعال پاک شد');
 };
 document.getElementById('pumpClearPoint').onclick=()=>{
   const d=typeof D==='function'?D():null;if(d){d.pumpDesignPoint=null;if(d.pumpCandidate)d.pumpCandidate={...d.pumpCandidate,checkStale:true};if(typeof saveAll==='function')saveAll();}
   renderPumpPoint(null);renderPumpCandidate(d?.pumpCandidate||null);if(typeof toast==='function')toast('نقطه طراحی پمپ از پروژه فعال پاک شد');
 };
 refreshPumpPoint();

 function runBranchAnalysis(){
  try{
  const net=typeof netData==='function'?netData():(typeof D==='function'?(D().hydraulicNetwork||{nodes:[],pipes:[]}):{nodes:[],pipes:[]});
  const sourcePressureRaw=parseFloat(document.getElementById('v38SourceP').value);\n  const r=NS.solve(net,{sourcePressureBar:Number.isFinite(sourcePressureRaw)?sourcePressureRaw:7,sourceId:document.getElementById('v38SourceId').value.trim()||undefined});
  const out=document.getElementById('v38Out');
  if(!r.ok){out.innerHTML='<b> '+r.error+'</b>';lastBranchResult=null;window.FEPPumpDesign?.setAnalysis(null);return;}
  lastBranchResult=r;window.FEPPumpDesign?.setAnalysis(r);
  const branchStore=typeof D==='function'?D():null;
  if(branchStore){
    branchStore.hydraulicBranchAnalysis={
      version:r.version||'4.0-branch',
      projectId:(typeof S!=='undefined'?S.activeId:''),
      stale:false,
      savedAt:new Date().toISOString(),
      mode:r.mode,
      sourceId:r.sourceId,
      sourcePressureBar:r.sourcePressureBar,
      sourceFlowLpm:r.sourceFlowLpm,
      results:(r.results||[]).map(x=>({...x})),
      terminals:(r.terminals||[]).map(x=>({...x,path:Array.isArray(x.path)?x.path.slice():[]})),
      controlling:r.controlling?({...r.controlling,path:Array.isArray(r.controlling.path)?r.controlling.path.slice():[]}):null,
      minTerminal:r.minTerminal?({...r.minTerminal,path:Array.isArray(r.minTerminal.path)?r.minTerminal.path.slice():[]}):null,
      unreachable:Array.isArray(r.unreachable)?r.unreachable.slice():[]
    };
    if(typeof saveAll==='function')saveAll();
  }
  const mode=r.mode==='node-demand'?'دبی محاسبه‌شده از تقاضای گره‌ها':'دبی Q واردشده در Pipeها';
  const ctrl=r.controlling;
  const terminalRows=r.terminals.slice().sort((a,b)=>b.requiredSourceBar-a.requiredSourceBar).map(t=>{
    const margin=t.pressureBar-t.requiredBar;
    const reqKnown=t.requiredBar>0;
    const status=reqKnown?(margin>=0?'✓ کافی':'⚠ کمبود'):'— ثبت نشده';
    const statusClass=reqKnown?(margin>=0?'ok':'bad'):'';
    return '<tr class="'+statusClass+'"><td>'+t.id+'</td><td>'+t.demandLpm.toFixed(1)+'</td><td>'+t.cumulativeLossBar.toFixed(3)+'</td><td>'+t.pressureBar.toFixed(3)+'</td><td>'+(reqKnown?t.requiredBar.toFixed(3):'—')+'</td><td>'+(reqKnown?margin.toFixed(3):'—')+'</td><td>'+t.requiredSourceBar.toFixed(3)+'</td><td>'+status+'</td></tr>';
  }).join('');
  const anyRequired=r.terminals.some(t=>t.requiredBar>0);
  let summary='<b> تحلیل انجام شد</b><br><span class="muted">حالت: '+mode+'</span><br>'+
    (r.sourceFlowLpm!=null?'دبی محاسباتی منبع: <b>'+r.sourceFlowLpm.toFixed(1)+' L/min</b><br>':'')+
    (ctrl?'مسیر کنترل‌کننده بین مسیرهای مدل‌شده: <b>'+ctrl.path.join(' ← ')+'</b><br>':'')+
    (ctrl&&anyRequired?'فشار لازم در Node منبع بر اساس فشار لازم ثبت‌شده انتهای مسیر: <b>'+ctrl.requiredSourceBar.toFixed(3)+' bar</b><br>':'')+
    (ctrl&&!anyRequired?'بیشترین افت تجمعی مسیرها تا انتها: <b>'+ctrl.cumulativeLossBar.toFixed(3)+' bar</b><br>':'')+
    (r.minTerminal?'کمترین فشار باقیمانده با فشار منبع واردشده: <b>'+r.minTerminal.pressureBar.toFixed(3)+' bar</b><br>':'')+
    'تعداد Pipe تحلیل‌شده: '+r.results.length+
    (r.unreachable.length?'<br> Nodeهای خارج از مسیر منبع: '+r.unreachable.join(', '):'<br> همه Nodeهای مدل‌شده از منبع قابل دسترس‌اند');
  if(r.terminals.length){
    summary+='<div class="tableWrap" style="margin-top:10px"><table><thead><tr><th>Node انتهایی</th><th>تقاضا L/min</th><th>افت تجمعی bar</th><th>فشار موجود bar</th><th>فشار لازم bar</th><th>حاشیه bar</th><th>فشار لازم در منبع bar</th><th>وضعیت</th></tr></thead><tbody>'+terminalRows+'</tbody></table></div>';
  }
  summary+='<div class="warnBadge" style="margin-top:8px">⚠️ فشار لازم در Node منبع فقط بر اساس افت‌های مدل و فشار لازم ثبت‌شده گره‌های انتهایی محاسبه می‌شود؛ این عدد به‌تنهایی هد نهایی پمپ نیست و شرایط منبع، افت تجهیزات خارج از مدل و حاشیه طراحی باید جداگانه کنترل شوند. تحلیل حاضر برای شبکه شاخه‌ای بدون حلقه/ادغام چندمسیره است.</div>';
  out.innerHTML=summary;
  }catch(e){
   const out=document.getElementById('v38Out');
   const msg='خطا در اجرای تحلیل شاخه‌ای: '+(e&&e.message?e.message:String(e));
   if(out)out.innerHTML='<b>'+msg+'</b>';
   if(typeof toast==='function')toast(msg,'err');
   console.error('FEP branch analysis',e);
  }
 }
 document.getElementById('v38Solve').onclick=runBranchAnalysis;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else setTimeout(mount,0);
})();
`;

androidHtml=androidHtml.slice(0,oldSolverStart)+branchedSolver+androidHtml.slice(oldSolverEnd);

if(!androidHtml.includes('id="netNodeDemand"') ||
   !androidHtml.includes('id="netNodeReqP"') ||
   !androidHtml.includes("version:'4.0-branch'") ||
   !androidHtml.includes('تحلیل شاخه‌ای شبکه') ||
   !androidHtml.includes('مسیر با بیشترین افت فشار تجمعی در شبکه واردشده:') ||
   !androidHtml.includes('Node انتهایی') ||
   !androidHtml.includes('این عدد به‌تنهایی هد نهایی پمپ نیست') ||
   !androidHtml.includes("pumpCard.id='fepPumpDesignCard'") ||
   !androidHtml.includes('نقطه طراحی اولیه پمپ') ||
   !androidHtml.includes("version:'1.0'") ||
   !androidHtml.includes('designHeadM:designBoostBar*10.19716213') ||
   !androidHtml.includes('پروژه فعال تغییر کرده است؛ تحلیل شبکه را برای همین پروژه دوباره اجرا کنید') ||
   !androidHtml.includes('شبکه هیدرولیکی بعد از ذخیره این نقطه تغییر کرده است') ||
   !androidHtml.includes('stale:false') ||
   !androidHtml.includes("pumpCheckCard.id='fepPumpCheckCard'") ||
   !androidHtml.includes('کنترل پمپ انتخابی با نقطه طراحی') ||
   !androidHtml.includes('برون‌یابی انجام نشده است') ||
   !androidHtml.includes('function pumpCurveAt(points,qLpm)') ||
   !androidHtml.includes("checkedAgainst:point.savedAt")){
  throw new Error('Android branched solver: generated UI/logic missing');
}
if(androidHtml.includes("window.S?.data?.[window.S?.activeId]?.network")){
  throw new Error('Android branched solver: legacy wrong network source remains');
}


if(!androidHtml.includes('id="v38Solve" type="button"') ||
   !androidHtml.includes('function runBranchAnalysis(){') ||
   !androidHtml.includes("document.getElementById('v38Solve').onclick=runBranchAnalysis;") ||
   !androidHtml.includes('خطا در اجرای تحلیل شاخه‌ای:')){
  throw new Error('Android branch-analysis click binding hardening missing');
}



/* FEP-ANDROID-REPORT-APPROVAL-GUARD-v1
   Do not auto-report "approved" while applicable checklist/regulatory items are still pending.
   Explicit user-entered m.result remains authoritative. */
replaceOnce(
  "const numericFailed=numericResults.filter(r=>r.ok===false).length;\nconst autoStatus=openCritical?'عدم تأیید':(untrackedChecklistFailures||numericFailed)?'نیازمند اصلاح':activeNcr.length?'تأیید مشروط به رفع موارد':'مورد تأیید';\nconst status=m.result||autoStatus;",
  "const numericFailed=numericResults.filter(r=>r.ok===false).length;\nlet pendingApplicableChecks=0;\ntry{allCheckItems().forEach(it=>{const st=d.checks?.[it.id];if(!st||!st.s)pendingApplicableChecks++;});(typeof REG_CHECKS!=='undefined'?REG_CHECKS:[]).forEach(r=>{try{if(r.when(d)){const st=d.regChecks?.[r.id];if(!st||!st.s)pendingApplicableChecks++;}}catch(e){}});}catch(e){}\nconst autoStatus=openCritical?'عدم تأیید':(untrackedChecklistFailures||numericFailed)?'نیازمند اصلاح':activeNcr.length?'تأیید مشروط به رفع موارد':pendingApplicableChecks?'در انتظار تکمیل بررسی':'مورد تأیید';\nconst status=m.result||autoStatus;",
  'report approval pending-check guard'
);
if(!androidHtml.includes('let pendingApplicableChecks=0;') ||
   !androidHtml.includes("pendingApplicableChecks?'در انتظار تکمیل بررسی':'مورد تأیید'") ||
   androidHtml.includes("activeNcr.length?'تأیید مشروط به رفع موارد':'مورد تأیید'")){
  throw new Error('Android report approval pending-check guard missing');
}


/* FEP-ANDROID-HYDRAULIC-REPORT-v1
   Android-only: add project-scoped hydraulic network / pump status to professional report. */
const reportFnPos=androidHtml.indexOf('function buildReportHTML(map){');
if(reportFnPos<0)throw new Error('Android hydraulic report: buildReportHTML not found');

const reportVarsNeedle="const numericResults=Object.values(d.numericResults||{}).filter(x=>x&&x.title).sort((a,b)=>(a.ts||0)-(b.ts||0));";
const reportVarsReplacement=reportVarsNeedle+"\n"+
"const hydraulicNetwork=d.hydraulicNetwork||{nodes:[],pipes:[]};\n"+
"const hydraulicNodes=Array.isArray(hydraulicNetwork.nodes)?hydraulicNetwork.nodes:[];\n"+
"const hydraulicPipes=Array.isArray(hydraulicNetwork.pipes)?hydraulicNetwork.pipes:[];\n"+
"const hydraulicAnalysis=d.hydraulicBranchAnalysis||null;\n"+
"const pumpPoint=d.pumpDesignPoint||null;\n"+
"const pumpCandidate=d.pumpCandidate||null;\n"+
"const hydraulicAnalysisStale=!!hydraulicAnalysis?.stale;\n"+
"const pumpPointStale=!!pumpPoint?.stale;\n"+
"const pumpCandidateStale=!!pumpCandidate&&(!pumpPoint||pumpPointStale||!!pumpCandidate.checkStale||pumpCandidate.checkedAgainst!==pumpPoint.savedAt);";
if(!androidHtml.includes(reportVarsNeedle))throw new Error('Android hydraulic report: report vars anchor missing');
androidHtml=androidHtml.replace(reportVarsNeedle,reportVarsReplacement);

const reportInsertNeedle="h+='<section class=\"section pagebreak\"><h2>۶. کنترل کیفیت محاسبات</h2>'";
if(!androidHtml.includes(reportInsertNeedle))throw new Error('Android hydraulic report: section 6 anchor missing');

const hydraulicReportCode=
"let hydraulicReport='<section class=\"section pagebreak\"><h2>۵-الف. شبکه هیدرولیکی و پمپ</h2>';\n"+
"hydraulicReport+='<div class=\"summary\"><div class=\"stat\"><b>'+faN(hydraulicNodes.length)+'</b>Node</div><div class=\"stat\"><b>'+faN(hydraulicPipes.length)+'</b>Pipe</div><div class=\"stat\"><b>'+(hydraulicAnalysis?(hydraulicAnalysisStale?'قدیمی':'ثبت‌شده'):'—')+'</b>تحلیل شاخه‌ای</div><div class=\"stat\"><b>'+(pumpPoint?(pumpPointStale?'قدیمی':'ثبت‌شده'):'—')+'</b>نقطه طراحی پمپ</div></div>';\n"+
"if(hydraulicAnalysis){\n"+
" const a=hydraulicAnalysis,ctrl=a.controlling||null,minT=a.minTerminal||null;\n"+
" hydraulicReport+=(hydraulicAnalysisStale?'<div class=\"note\" style=\"margin-top:10px;border-color:#d97706\"><b>⚠️ تحلیل شاخه‌ای قدیمی است.</b> شبکه بعد از این تحلیل تغییر کرده و اعداد زیر برای استفاده مهندسی باید دوباره محاسبه شوند.</div>':'<div class=\"note\" style=\"margin-top:10px\"><b>تحلیل شاخه‌ای معتبر برای وضعیت ذخیره‌شده شبکه</b></div>');\n"+
" hydraulicReport+='<table class=\"tbl\" style=\"margin-top:8px\"><tr><th>مبنای دبی</th><td>'+esc(a.mode==='node-demand'?'تقاضای گره‌های پایین‌دست':'Q واردشده Pipeها')+'</td><th>Node منبع</th><td>'+esc(a.sourceId||'—')+'</td></tr><tr><th>دبی منبع</th><td>'+esc(Number(a.sourceFlowLpm||0).toFixed(1))+' L/min</td><th>فشار منبع واردشده</th><td>'+esc(Number(a.sourcePressureBar||0).toFixed(3))+' bar</td></tr><tr><th>مسیر کنترل‌کننده</th><td colspan=\"3\">'+esc(ctrl&&Array.isArray(ctrl.path)?ctrl.path.join(' ← '):'—')+'</td></tr><tr><th>فشار لازم در منبع</th><td>'+(ctrl?esc(Number(ctrl.requiredSourceBar||0).toFixed(3))+' bar':'—')+'</td><th>کمترین فشار باقیمانده</th><td>'+(minT?esc(Number(minT.pressureBar||0).toFixed(3))+' bar':'—')+'</td></tr></table>';\n"+
"}else{hydraulicReport+='<div class=\"note\" style=\"margin-top:10px\">هنوز تحلیل شاخه‌ای ذخیره‌شده‌ای برای این پروژه وجود ندارد.</div>';}\n"+
"if(pumpPoint){\n"+
" hydraulicReport+=(pumpPointStale?'<div class=\"note\" style=\"margin-top:10px;border-color:#d97706\"><b>⚠️ نقطه طراحی پمپ قدیمی است.</b> شبکه پس از ذخیره این نقطه تغییر کرده است.</div>':'');\n"+
" hydraulicReport+='<h3 style=\"margin:14px 0 6px\">نقطه طراحی اولیه پمپ</h3><table class=\"tbl\"><tr><th>دبی طراحی</th><td>'+esc(Number(pumpPoint.flowLpm||0).toFixed(1))+' L/min ('+esc(Number(pumpPoint.flowGpm||0).toFixed(1))+' gpm)</td><th>Node / مسیر کنترل‌کننده</th><td>'+esc((pumpPoint.path||[]).join(' ← ')||pumpPoint.controllingTerminal||'—')+'</td></tr><tr><th>فشار لازم شبکه</th><td>'+esc(Number(pumpPoint.requiredNetworkBar||0).toFixed(3))+' bar</td><th>افت خارج از مدل</th><td>'+esc(Number(pumpPoint.externalLossBar||0).toFixed(3))+' bar</td></tr><tr><th>فشار قابل اتکای قبل از پمپ</th><td>'+esc(Number(pumpPoint.availableSourceBar||0).toFixed(3))+' bar</td><th>حاشیه طراحی کاربر</th><td>'+esc(Number(pumpPoint.marginPct||0).toFixed(1))+'٪</td></tr><tr><th>افزایش فشار طراحی</th><td>'+esc(Number(pumpPoint.designBoostBar||0).toFixed(3))+' bar</td><th>هد معادل</th><td>'+esc(Number(pumpPoint.designHeadM||0).toFixed(2))+' mH₂O</td></tr></table>';\n"+
"}else{hydraulicReport+='<div class=\"note\" style=\"margin-top:10px\">نقطه طراحی اولیه پمپ برای این پروژه ذخیره نشده است.</div>';}\n"+
"if(pumpCandidate){\n"+
" const pc=pumpCandidate,chk=pc.check||null;\n"+
" hydraulicReport+='<h3 style=\"margin:14px 0 6px\">کنترل Q-H پمپ انتخابی</h3>'+(pumpCandidateStale?'<div class=\"note\" style=\"border-color:#d97706\"><b>⚠️ نتیجه کنترل پمپ قدیمی/ناهمگام است و باید دوباره کنترل شود.</b></div>':'')+'<table class=\"tbl\" style=\"margin-top:8px\"><tr><th>نام / مدل</th><td>'+esc(pc.name||'—')+'</td><th>نقاط منحنی</th><td>'+faN(Array.isArray(pc.points)?pc.points.length:0)+'</td></tr><tr><th>دبی نامی</th><td>'+esc(Number(pc.ratedQLpm||0).toFixed(1))+' L/min</td><th>هد نامی</th><td>'+esc(Number(pc.ratedHeadM||0).toFixed(1))+' mH₂O</td></tr>';\n"+
" if(chk&&chk.status==='inside')hydraulicReport+='<tr><th>وضعیت Q-H</th><td colspan=\"3\">'+(Number(chk.marginHeadM||0)>=0?'هد منحنی در نقطه طراحی کافی است':'هد منحنی در نقطه طراحی کافی نیست')+' — هد لازم '+esc(Number(chk.requiredHeadM||0).toFixed(2))+' mH₂O، هد منحنی '+esc(Number(chk.availableHeadM||0).toFixed(2))+' mH₂O، حاشیه '+esc(Number(chk.marginHeadM||0).toFixed(2))+' mH₂O</td></tr>';\n"+
" else if(chk&&chk.status==='outside')hydraulicReport+='<tr><th>وضعیت Q-H</th><td colspan=\"3\">قابل تأیید نیست — دبی طراحی '+esc(Number(chk.designQLpm||0).toFixed(1))+' L/min خارج از بازه منحنی '+esc(Number(chk.minQLpm||0).toFixed(1))+' تا '+esc(Number(chk.maxQLpm||0).toFixed(1))+' L/min است؛ برون‌یابی انجام نشده است.</td></tr>';\n"+
" else hydraulicReport+='<tr><th>وضعیت Q-H</th><td colspan=\"3\">کنترل معتبر ذخیره نشده است.</td></tr>';\n"+
" hydraulicReport+='</table><div class=\"note\" style=\"margin-top:8px\">این بخش فقط تطابق Q-H منحنی واردشده با نقطه طراحی را گزارش می‌کند و به‌تنهایی تأیید نهایی پمپ یا انطباق کامل با NFPA 20 محسوب نمی‌شود.</div>';\n"+
"}else{hydraulicReport+='<div class=\"note\" style=\"margin-top:10px\">پمپ انتخابی برای این پروژه ذخیره نشده است.</div>';}\n"+
"hydraulicReport+='</section>';\n"+
"h+=hydraulicReport;\n";

androidHtml=androidHtml.replace(reportInsertNeedle,hydraulicReportCode+reportInsertNeedle);

if(!androidHtml.includes('۵-الف. شبکه هیدرولیکی و پمپ') ||
   !androidHtml.includes('hydraulicBranchAnalysis') ||
   !androidHtml.includes('نتیجه کنترل پمپ قدیمی/ناهمگام است') ||
   !androidHtml.includes('برون‌یابی انجام نشده است.</td></tr>')){
  throw new Error('Android hydraulic report patch missing');
}

/* FEP-ANDROID-HYDRAULIC-OVERFLOW-FIX-v1
   Root-cause fix: explicit text inputs + narrow grids on small mobile widths.
   No calculation logic or formulas are changed. */
const hydraulicOverflowCss=`<style id="fepHydraulicOverflowFix">
@media(max-width:700px){
  #v38SolverCard .grid,#fepPumpDesignCard .grid,#fepPumpCheckCard .grid{
    grid-template-columns:minmax(0,1fr)!important;
  }
  #sec-network input,#sec-network select,#sec-network textarea{
    max-width:100%;
    min-width:0;
  }
}
</style>`;
if(!androidHtml.includes('id="fepHydraulicOverflowFix"')){
  const hydraulicHeadClose=androidHtml.indexOf('</head>');
  if(hydraulicHeadClose<0)throw new Error('Android hydraulic overflow fix: </head> not found');
  androidHtml=androidHtml.slice(0,hydraulicHeadClose)+hydraulicOverflowCss+androidHtml.slice(hydraulicHeadClose);
}

/* FEP-ANDROID-NETWORK-PIPE-LABELS-SAFE-v2
   Android-only: explicit pipe labels/units. Keep the Build #174 layout structure unchanged. */
replaceOnce(
  '<div class="row"><input id="netPipeId" placeholder="Pipe-1"><input id="netFrom" placeholder="از N1"><input id="netTo" placeholder="به N2"></div>\n<div class="row"><input id="netLen" type="number" value="10" placeholder="طول"><input id="netDia" type="number" value="50" placeholder="قطر"><input id="netC" type="number" value="120" placeholder="C"></div>\n<div class="row"><input id="netFlow" type="number" value="100" placeholder="دبی"><input id="netK" type="number" value="0" placeholder="K"></div>',
  '<div class="row"><label style="flex:1;min-width:0">شناسه Pipe<input id="netPipeId" type="text" placeholder="Pipe-1"></label><label style="flex:1;min-width:0">Node مبدأ<input id="netFrom" type="text" placeholder="N1"></label><label style="flex:1;min-width:0">Node مقصد<input id="netTo" type="text" placeholder="N2"></label></div>\n<div class="row"><label style="flex:1;min-width:0">طول (m)<input id="netLen" type="number" value="10" placeholder="طول (m)"></label><label style="flex:1;min-width:0">قطر داخلی (mm)<input id="netDia" type="number" value="50" placeholder="قطر داخلی (mm)"></label><label style="flex:1;min-width:0">ضریب Hazen–Williams (C)<input id="netC" type="number" value="120" placeholder="C"></label></div>\n<div class="row"><label style="flex:1;min-width:0">دبی دستی (L/min) — اختیاری<input id="netFlow" type="number" value="100" min="0" placeholder="اختیاری"></label><label style="flex:1;min-width:0">ضریب افت موضعی (K)<input id="netK" type="number" value="0" min="0" step="0.01" placeholder="K"></label></div>',
  'safe network pipe labels'
);

/* FEP-ANDROID-NETWORK-EDITOR-EDIT-v1
   Android-only: edit/cancel existing hydraulic nodes and pipes without delete/recreate. */
replaceOnce(
  '<button class="btn primary" id="netAddNode" style="margin-top:8px">+ Node</button><div id="netNodes" class="list" style="margin-top:10px"></div>',
  '<div class="actions" style="margin-top:8px"><button class="btn primary" id="netAddNode">+ Node</button><button class="btn ghost" id="netCancelNodeEdit" type="button" hidden>لغو ویرایش</button></div><div id="netNodes" class="list" style="margin-top:10px"></div>',
  'network node edit controls'
);
replaceOnce(
  '<button class="btn primary" id="netAddPipe" style="margin-top:8px">+ Pipe</button><div id="netPipes" class="list" style="margin-top:10px"></div>',
  '<div class="actions" style="margin-top:8px"><button class="btn primary" id="netAddPipe">+ Pipe</button><button class="btn ghost" id="netCancelPipeEdit" type="button" hidden>لغو ویرایش</button></div><div id="netPipes" class="list" style="margin-top:10px"></div>',
  'network pipe edit controls'
);

const renderNetStart=androidHtml.indexOf('function renderNet(){');
if(renderNetStart<0)throw new Error('Android network editor edit: renderNet not found');
androidHtml=androidHtml.slice(0,renderNetStart)+"let netNodeEditIndex=-1,netPipeEditIndex=-1;\n"+androidHtml.slice(renderNetStart);

replaceOnce(
  '<button class="btn ghost" onclick="netDelNode(\${i})">حذف</button>',
  '<button class="btn ghost" onclick="netEditNode(\${i})">ویرایش</button> <button class="btn ghost" onclick="netDelNode(\${i})">حذف</button>',
  'network node edit button'
);
replaceOnce(
  '<button class="btn ghost" onclick="netDelPipe(\${i})">حذف</button>',
  '<button class="btn ghost" onclick="netEditPipe(\${i})">ویرایش</button> <button class="btn ghost" onclick="netDelPipe(\${i})">حذف</button>',
  'network pipe edit button'
);

const initStart=androidHtml.indexOf('function initNet(){');
const initEnd=initStart>=0?androidHtml.indexOf('/* ================= تحلیل شاخه‌ای شبکه — Android ================= */',initStart):-1;
if(initStart<0||initEnd<0)throw new Error('Android network editor edit: initNet block not found');

const editorCode=`
function resetNetNodeEditor(){
  netNodeEditIndex=-1;
  if($('netNodeId'))$('netNodeId').value='';
  if($('netNodeElev'))$('netNodeElev').value='0';
  if($('netNodeDemand'))$('netNodeDemand').value='0';
  if($('netNodeReqP'))$('netNodeReqP').value='0';
  if($('netAddNode'))$('netAddNode').textContent='+ Node';
  if($('netCancelNodeEdit'))$('netCancelNodeEdit').hidden=true;
}
function resetNetPipeEditor(){
  netPipeEditIndex=-1;
  if($('netPipeId'))$('netPipeId').value='';
  if($('netFrom'))$('netFrom').value='';
  if($('netTo'))$('netTo').value='';
  if($('netLen'))$('netLen').value='10';
  if($('netDia'))$('netDia').value='50';
  if($('netC'))$('netC').value='120';
  if($('netFlow'))$('netFlow').value='100';
  if($('netK'))$('netK').value='0';
  if($('netAddPipe'))$('netAddPipe').textContent='+ Pipe';
  if($('netCancelPipeEdit'))$('netCancelPipeEdit').hidden=true;
}
window.netEditNode=function(i){
  const n=netData(),x=n.nodes[i];if(!x)return;
  netNodeEditIndex=i;
  $('netNodeId').value=x.id||'';
  $('netNodeElev').value=Number(x.elev||0);
  $('netNodeDemand').value=Number(x.demandLpm||0);
  $('netNodeReqP').value=Number(x.requiredBar||0);
  $('netAddNode').textContent='ذخیره ویرایش Node';
  $('netCancelNodeEdit').hidden=false;
  $('netNodeId').focus();
};
window.netEditPipe=function(i){
  const n=netData(),x=n.pipes[i];if(!x)return;
  netPipeEditIndex=i;
  $('netPipeId').value=x.id||'';
  $('netFrom').value=x.from||'';
  $('netTo').value=x.to||'';
  $('netLen').value=Number(x.L||0);
  $('netDia').value=Number(x.d||0);
  $('netC').value=Number(x.C||0);
  $('netFlow').value=Number(x.Q||0);
  $('netK').value=Number(x.K||0);
  $('netAddPipe').textContent='ذخیره ویرایش Pipe';
  $('netCancelPipeEdit').hidden=false;
  $('netPipeId').focus();
};
window.netCancelNodeEdit=resetNetNodeEditor;
window.netCancelPipeEdit=resetNetPipeEditor;
function initNet(){
  if(!$('netAddNode'))return;
  renderNet();
  resetNetNodeEditor();
  resetNetPipeEditor();
  $('netCancelNodeEdit').onclick=resetNetNodeEditor;
  $('netCancelPipeEdit').onclick=resetNetPipeEditor;

  $('netAddNode').onclick=()=>{
    const id=$('netNodeId').value.trim(),elev=parseFloat($('netNodeElev').value);
    const demandLpm=Math.max(0,parseFloat($('netNodeDemand')?.value)||0),requiredBar=Math.max(0,parseFloat($('netNodeReqP')?.value)||0);
    if(!id||!Number.isFinite(elev)){toast(' شناسه و ارتفاع Node را وارد کنید','err');return;}
    const n=netData();
    const dup=n.nodes.findIndex((x,j)=>x.id===id&&j!==netNodeEditIndex);
    if(dup>=0){toast(' شناسه Node تکراری است','err');return;}
    if(netNodeEditIndex>=0&&n.nodes[netNodeEditIndex]){
      const oldId=n.nodes[netNodeEditIndex].id;
      n.nodes[netNodeEditIndex]={id,elev,demandLpm,requiredBar};
      if(oldId!==id)n.pipes.forEach(p=>{if(p.from===oldId)p.from=id;if(p.to===oldId)p.to=id;});
    }else n.nodes.push({id,elev,demandLpm,requiredBar});
    resetNetNodeEditor();saveNet();
  };

  $('netAddPipe').onclick=()=>{
    const id=$('netPipeId').value.trim(),from=$('netFrom').value.trim(),to=$('netTo').value.trim(),
      L=parseFloat($('netLen').value),d=parseFloat($('netDia').value),C=parseFloat($('netC').value),
      Q=parseFloat($('netFlow').value),K=parseFloat($('netK').value)||0;
    if(!id||!from||!to||![L,d,C,Q].every(Number.isFinite)||L<=0||d<=0||C<=0||Q<0){toast(' اطلاعات Pipe ناقص یا نامعتبر است','err');return;}
    const n=netData();
    if(!n.nodes.some(x=>x.id===from)||!n.nodes.some(x=>x.id===to)){toast(' Node مبدأ یا مقصد در شبکه ثبت نشده است','err');return;}
    if(from===to){toast(' مبدأ و مقصد Pipe نمی‌تواند یکسان باشد','err');return;}
    const dup=n.pipes.findIndex((x,j)=>x.id===id&&j!==netPipeEditIndex);
    if(dup>=0){toast(' شناسه Pipe تکراری است','err');return;}
    const value={id,from,to,L,d,C,Q,K};
    if(netPipeEditIndex>=0&&n.pipes[netPipeEditIndex])n.pipes[netPipeEditIndex]=value;else n.pipes.push(value);
    resetNetPipeEditor();saveNet();
  };

  $('netRun').onclick=runNetwork;
  $('netClear').onclick=()=>{if(confirm('شبکه این پروژه پاک شود؟')){D()[NET_KEY]={nodes:[],pipes:[]};resetNetNodeEditor();resetNetPipeEditor();saveNet();$('netResult').innerHTML='';}};
  $('netExport').onclick=exportNet;
}
`;

androidHtml=androidHtml.slice(0,initStart)+editorCode+androidHtml.slice(initEnd);

if(!androidHtml.includes('id="netCancelNodeEdit"') ||
   !androidHtml.includes('id="netCancelPipeEdit"') ||
   !androidHtml.includes('window.netEditNode=function') ||
   !androidHtml.includes('window.netEditPipe=function') ||
   !androidHtml.includes("n.pipes.forEach(p=>{if(p.from===oldId)p.from=id;if(p.to===oldId)p.to=id;})")){
  throw new Error('Android network editor edit: generated controls/logic missing');
}

if(!androidHtml.includes('دبی دستی (L/min) — اختیاری') ||
   !androidHtml.includes('ضریب Hazen–Williams (C)') ||
   !androidHtml.includes('قطر داخلی (mm)')){
  throw new Error('Android safe pipe labels patch missing');
}

if(!androidHtml.includes('id="fepHydraulicOverflowFix"') ||
   !androidHtml.includes('id="netNodeId" type="text"') ||
   !androidHtml.includes('id="netPipeId" type="text"') ||
   !androidHtml.includes('id="netFrom" type="text"') ||
   !androidHtml.includes('id="netTo" type="text"') ||
   !androidHtml.includes('id="v38SourceId" type="text"') ||
   !androidHtml.includes('id="pumpCandidateName" type="text"')){
  throw new Error('Android hydraulic overflow root-cause fix missing');
}

/* FEP-ANDROID-NFPA13-WORDING-v1
   Android-only: remove unsupported definitive wording from the standards cards.
   Calculation values and engine logic are intentionally unchanged. */
const nfpa13Wording = [
  ["b:'حداقل فشار کاری دورترین هد ۰٫۵ بار (7 psi).'", "b:'کنترل داخلی فعلی برنامه: ۰٫۵ bar / 7 psi. این مقدار تا تطبیق با نوع اسپرینکلر، کاربرد و ویرایش NFPA 13 پروژه، حداقل عمومی و قطعی تلقی نشود.'"],
  ["b:'چگالی طراحی: LH ۴٫۱، OH1 ۶٫۱، OH2 ۸٫۱ L/min/m² روی ۱۳۹ m².'", "b:'مقادیر داخلی فعلی برنامه: LH ۴٫۱، OH1 ۶٫۱، OH2 ۸٫۱ L/min/m² و مساحت ۱۳۹ m². این مقادیر باید با طبقه‌بندی خطر، نوع سیستم و ویرایش NFPA 13 پروژه تطبیق داده شوند.'"],
  ["b:'دبی هوزاستریم: LH صفر، OH حدود ۹۵۰ و EH حدود ۱۹۰۰ L/min.'", "b:'مقادیر داخلی فعلی هوزاستریم: LH صفر، OH حدود ۹۵۰ و EH حدود ۱۹۰۰ L/min. برای طراحی نهایی، مقدار لازم باید از مرجع دقیق پروژه تعیین شود.'"],
  ["b:'سایز اسمی بر اساس جدول دبی GPM.'", "b:'جدول داخلی دبی–سایز برنامه فقط پیشنهاد اولیه است و جایگزین محاسبه هیدرولیکی و کنترل ویرایش NFPA 13 پروژه نیست.'"],
  ["b:'حداکثر فاصله بین هدها ۴٫۶ m؛ حداقل ۰٫۴۵ m فضای آزاد زیر هد.'", "b:'اعداد داخلی فعلی برنامه برای فاصله هد/فضای آزاد نباید به‌عنوان قاعده عمومی همه انواع اسپرینکلر و همه شرایط نصب تلقی شوند؛ جانمایی نهایی باید با نوع هد، خطر، سقف/مانع و ویرایش NFPA 13 پروژه کنترل شود.'"],
  ["b:'روش H-W با C=120 برای فولادی سیاه.'", "b:'برنامه در برخی محاسبات فولادی از C=120 استفاده می‌کند. این مقدار یک ورودی/پیش‌فرض داخلی است و باید با جنس و وضعیت لوله و مرجع دقیق پروژه کنترل شود.'"]
];
for (const [from,to] of nfpa13Wording) replaceOnce(from,to,'NFPA 13 standards wording');
if (!androidHtml.includes('مقادیر داخلی فعلی برنامه: LH ۴٫۱') || !androidHtml.includes('جدول داخلی دبی–سایز برنامه فقط پیشنهاد اولیه است')) {
  throw new Error('Android NFPA 13 wording patch missing');
}


/* FEP-ANDROID-FIRE-PUMP-WORDING-v1
   Android-only: qualify unverified NFPA 20/37 numeric claims.
   No pump, hydraulic, diesel-ventilation, or other calculation logic is changed. */
const firePumpWording = [
  ["b:'پمپ در ۱۵۰٪ دبی نامی حداقل ۶۵٪ فشار نامی.'", "b:'کنترل مرجع پمپ: عملکرد در نقاط دبی/فشار باید با منحنی تأییدشده سازنده و ویرایش NFPA 20 مورد استفاده پروژه تطبیق داده شود. عدد ۱۵۰٪ دبی / ۶۵٪ فشار تا تأیید بند دقیق مرجع، در این برنامه الزام قطعی تلقی نمی‌شود.'"],
  ["b:'حجم باک: حداقل ۱ گالن بر اسب‌بخار-ساعت + ۵٪ ذخیره.'", "b:'ظرفیت مخزن سوخت دیزل باید بر اساس توان موتور، مدت کارکرد موردنیاز، مصرف سوخت سازنده و ویرایش NFPA 20/مرجع پروژه تعیین شود. رابطه ۱ گالن بر اسب‌بخار-ساعت + ۵٪ تا تأیید بند دقیق مرجع، الزام قطعی تلقی نمی‌شود.'"],
  ["b:'تامین هوای احتراق مطابق NFPA 37.'", "b:'هوای احتراق و تهویه موتور دیزل باید با داده‌های سازنده و مرجع دقیق پروژه کنترل شود؛ ارجاع کلی NFPA 37 به‌تنهایی مبنای یک ضریب عددی ثابت در برنامه نیست.'"]
];
for (const [from,to] of firePumpWording) replaceOnce(from,to,'fire pump standards wording');
if (!androidHtml.includes('عدد ۱۵۰٪ دبی / ۶۵٪ فشار تا تأیید بند دقیق مرجع') ||
    !androidHtml.includes('رابطه ۱ گالن بر اسب‌بخار-ساعت + ۵٪ تا تأیید بند دقیق مرجع')) {
  throw new Error('Android fire pump wording patch missing');
}


/* FEP-ANDROID-STANDARDS-AUDIT-v1
   Android-only full standards-card audit. Numerical/blanket claims that are not
   traceable to the currently verified project sources are qualified. No calculation
   engine, project data, backup/restore, licensing, or stable web logic is changed. */
const standardsAuditWording = [
  ["b:'حداقل اختلاف فشار حدود ۲۵–۵۰ Pa.'", "b:'مبحث ۳ پروژه برای سامانه فشار مثبت راه‌پله بازه ۲۵ تا ۹۰ Pa را مبنای کنترل قرار می‌دهد. شرایط طراحی و سناریوی باز/بسته بودن درها نیز باید کنترل شود.'"],
  ["b:'کلاس A: فاصله دسترسی کم‌خطر ۲۳ m و پرخطر ۱۵ m.'", "b:'فاصله دسترسی خاموش‌کننده به نوع خطر، رتبه و چیدمان بستگی دارد. اعداد ۲۳ m و ۱۵ m تا تطبیق با جدول/بند دقیق و ویرایش NFPA 10 پروژه، در برنامه الزام عمومی تلقی نمی‌شوند.'"],
  ["b:'ارتفاع دستگیره ≤ ۱٫۵ m و کف کپسول ≥ ۱۰ cm.'", "b:'ارتفاع نصب خاموش‌کننده به وزن/نوع تجهیز و شرایط نصب وابسته است. اعداد ۱٫۵ m و ۱۰ cm تا تطبیق با بند دقیق و ویرایش NFPA 10 پروژه، الزام عمومی تلقی نمی‌شوند.'"],
  ["b:'سقف صاف: حداکثر فاصله ۹٫۱ m.'", "b:'فاصله‌گذاری دتکتور دود به نوع دتکتور، هندسه و ارتفاع سقف، جریان هوا و شرایط محیط وابسته است. عدد ۹٫۱ m تا تطبیق با بند دقیق و ویرایش NFPA 72 پروژه، قاعده عمومی تلقی نمی‌شود.'"],
  ["b:'شاسی دستی در ارتفاع ۱٫۲–۱٫۴ m و فاصله دسترسی ≤ ۶۱ m.'", "b:'محل، ارتفاع و فاصله دسترسی شستی دستی باید با طرح اعلام حریق و بند/ویرایش دقیق NFPA 72 پروژه کنترل شود؛ اعداد ۱٫۲–۱٫۴ m و ۶۱ m در این بانک فعلاً الزام قطعی معرفی نمی‌شوند.'"],
  ["b:'فلوسوئیچ و تامپر سوئیچ به پنل اعلام متصل شود.'", "b:'مانیتورینگ فلوسوئیچ و وضعیت شیرهای کنترلی باید بر اساس معماری سامانه اطفا/اعلام و مرجع دقیق پروژه تعیین شود؛ اتصال و نوع سیگنال باید با نقشه و استاندارد مربوط کنترل شود.'"],
  ["b:'حداقل ۶ تعویض هوا در ساعت + کنترل CO.'", "b:'تهویه عادی و کنترل دود پارکینگ باید با مبحث ۳، مبحث ۱۴ و سناریوی پروژه تطبیق داده شود. عدد ۶ ACH در این بانک تا استخراج بند دقیق مرجع، الزام عمومی تلقی نمی‌شود.'"],
  ["b:'محفظه راه‌پله با مقاومت ≥ ۲ ساعت.'", "b:'درجه مقاومت حریق دوربند راه‌پله به ارتفاع، تعداد طبقات، نوع تصرف و شرایط ساختمان وابسته است و باید از بند/جدول دقیق مبحث ۳ پروژه تعیین شود؛ ۲ ساعت الزام عمومی همه ساختمان‌ها نیست.'"],
  ["b:'روشنایی اضطراری و تابلو EXIT در مسیر تخلیه.'", "b:'روشنایی اضطراری و علائم خروج باید بر اساس الزامات مسیر خروج و بندهای قابل اعمال مبحث ۳ پروژه کنترل شوند؛ جانمایی و مشخصات نهایی وابسته به طرح است.'"],
  ["b:'تهویه موتورخانه شامل هوای احتراق + هوای دفع حرارت.'", "b:'تهویه موتورخانه باید هم‌زمان نیاز هوای احتراق، دفع حرارت و الزامات سازنده تجهیزات را پوشش دهد و با بند دقیق مبحث ۱۴ پروژه تطبیق داده شود.'"],
  ["b:'فضای سرویس اطراف تجهیزات و مسیر مستقل دودکش.'", "b:'فضای سرویس تجهیزات و مسیر/اجرای دودکش باید بر اساس نوع دستگاه، دستورالعمل سازنده و بندهای دقیق مبحث ۱۴ پروژه کنترل شود؛ این کارت عدد یا قاعده عمومی مستقلی تعیین نمی‌کند.'"],
  ["b:'روش دبی بر خودرو ۹۲۰ m³/h یا ۶ ACH.'", "b:'۹۲۰ m³/h به‌ازای هر خودرو و ۶ ACH منطق/مقادیر داخلی فعلی برنامه برای برآورد اولیه‌اند. در منابع پروژه‌ای فعلی مبنای کافی برای معرفی آن‌ها به‌عنوان الزام عمومی ASHRAE تأیید نشده است؛ طراحی نهایی باید با مرجع دقیق پروژه کنترل شود.'"]
];
for (const [from,to] of standardsAuditWording) replaceOnce(from,to,'standards full audit wording');
if (!androidHtml.includes('بازه ۲۵ تا ۹۰ Pa') ||
    !androidHtml.includes('۲ ساعت الزام عمومی همه ساختمان‌ها نیست') ||
    !androidHtml.includes('۹۲۰ m³/h به‌ازای هر خودرو و ۶ ACH منطق/مقادیر داخلی فعلی برنامه')) {
  throw new Error('Android standards full audit patch missing');
}



/* FEP-ANDROID-LEGACY-CALC-AUDIT-v1
   Source-backed corrections and wording hardening for legacy engineering calculators.
   - NFPA 13: Light Hazard combined hose allowance; minimum effective density/area design areas.
   - NFPA 10: Class A extinguisher count based on A rating + hazard area/unit A + travel-distance check.
   - Parking / pressure / pipe sizing: clarify preliminary/internal assumptions without changing formulas. */

replaceOnce(
  "const HAZ={LH:{den:4.1,hose:0},OH1:{den:6.1,hose:950},OH2:{den:8.1,hose:950},EH1:{den:12.2,hose:1900},EH2:{den:16.3,hose:1900}};",
  "const HAZ={LH:{den:4.1,hose:380,minArea:139},OH1:{den:6.1,hose:950,minArea:139},OH2:{den:8.1,hose:950,minArea:139},EH1:{den:12.2,hose:1900,minArea:232},EH2:{den:16.3,hose:1900,minArea:232}};",
  'NFPA13 hazard demand table'
);


const calc1ResultStart=androidHtml.indexOf("lastRes[1]={title:'دبی تخلیه دود پارکینگ'");
const calc1ResultEnd=calc1ResultStart>=0?androidHtml.indexOf("\n}",calc1ResultStart):-1;
if(calc1ResultStart<0||calc1ResultEnd<0)throw new Error('Android calc audit: missing parking ventilation result block');
const calc1SafeResult=`lastRes[1]={title:'برآورد اولیه تهویه پارکینگ (ACH/خودرو)',lines:[['حجم پارکینگ',fmt(V,0)+' m³'],['دبی ACH',fmt(qACH,0)+' m³/h'],['دبی بر مبنای خودرو',fmt(qCO,0)+' m³/h'],['دبی برآوردی حاکم',fmt(qEx,0)+' m³/h'],['هوای جبرانی ('+fmt(ratio*100,0)+'٪)',fmt(mk,0)+' m³/h']]};
showRes(1,lastRes[1].lines,'دبی برآوردی: '+fmt(qEx,0)+' m³/h',(qCO>qACH?'<div class="warnBadge"> مبنای داخلی «دبی بر خودرو» حاکم شده است؛ این عدد معیار کنترل دود حریق تلقی نمی‌شود.</div>':'<div class="warnBadge"> مبنای ACH حاکم شده است؛ این خروجی برآورد تهویه است و معیار مستقل کنترل دود حریق نیست.</div>'));`;
androidHtml=androidHtml.slice(0,calc1ResultStart)+calc1SafeResult+androidHtml.slice(calc1ResultEnd);



const calc2Start=androidHtml.indexOf("const hz=$('c2Haz').value,area=v('c2Area'),den=HAZ[hz].den,hose=HAZ[hz].hose;");
const calc2End=calc2Start>=0?androidHtml.indexOf("\n}",calc2Start):-1;
if(calc2Start<0||calc2End<0)throw new Error('Android calc audit: missing sprinkler demand block');
const calc2Safe=`const hz=$('c2Haz').value,inputArea=v('c2Area'),den=HAZ[hz].den,hose=HAZ[hz].hose,minArea=HAZ[hz].minArea||0;
const area=Math.max(inputArea,minArea),qSpr=den*area,q=qSpr+hose;
const lines=[['چگالی طراحی',fmt(den,1)+' L/min/m²'],['مساحت واردشده',fmt(inputArea,0)+' m²'],['مساحت مؤثر محاسبه',fmt(area,0)+' m²'],['دبی اسپرینکلر',fmt(qSpr,0)+' L/min'],['تقاضای هوز ترکیبی',fmt(hose,0)+' L/min'],['دبی کل',fmt(q,0)+' L/min'],['معادل',fmt(q/3.785,0)+' GPM']];
lastRes[2]={title:'دبی اسپرینکلر (Hazard & Demand)',lines};
let extra=inputArea<minArea?'<div class="warnBadge">⚠️ مساحت واردشده کمتر از حداقل ناحیه مبنای این نقطه چگالی/مساحت بود؛ محاسبه با '+fmt(minArea,0)+' m² انجام شد.</div>':'';
extra+='<div class="warnBadge">مقادیر این ابزار بر مبنای نقاط کلاسیک density/area و تقاضای هوز بررسی‌شده NFPA 13 هستند؛ ویرایش و شرایط دقیق پروژه همچنان باید کنترل شود.</div>';
showRes(2,lines,'دبی کل: '+fmt(q,0)+' L/min',extra);`;
androidHtml=androidHtml.slice(0,calc2Start)+calc2Safe+androidHtml.slice(calc2End);






replaceOnce(
  "else extra+='<div class=\"warnBadge\" style=\"background:rgba(22,163,74,.12);color:var(--ok)\"> سرعت جریان در محدوده قابل قبول</div>';",
  "else extra+='<div class=\"warnBadge\" style=\"background:rgba(22,163,74,.12);color:var(--ok)\"> سرعت جریان زیر آستانه داخلی ۶ m/s است؛ این آستانه به‌تنهایی حد قطعی NFPA 13 تلقی نمی‌شود.</div>';",
  'pipe velocity wording'
);





replaceOnce(
  '<div class="formRow"><div class="field"><label>مساحت (m²)</label><input type="number" id="c9Area" value="600"></div><div class="field"><label>خطر</label><select id="c9Haz"><option value="200">کم</option><option value="150" selected>متوسط</option><option value="100">زیاد</option></select></div></div>',
  '<div class="formRow"><div class="field"><label>مساحت Class A (m²)</label><input type="number" id="c9Area" value="600"></div><div class="field"><label>سطح خطر</label><select id="c9Haz"><option value="light">کم</option><option value="ordinary" selected>متوسط</option><option value="extra">زیاد</option></select></div><div class="field"><label>ریتینگ A خاموش‌کننده</label><input type="number" id="c9RatingA" min="1" step="1" value="2" placeholder="مثلاً 2 برای 2-A"></div></div>',
  'NFPA10 Class A inputs'
);






const calc9Start=androidHtml.indexOf("const a=v('c9Area'),per=Math.max(1,v('c9Haz'));");
const calc9End=calc9Start>=0?androidHtml.indexOf("\n}",calc9Start):-1;
if(calc9Start<0||calc9End<0)throw new Error('Android calc audit: missing extinguisher calculation block');
const calc9Safe=`const a=v('c9Area'),haz=$('c9Haz').value,rating=v('c9RatingA');
const cfg={light:{label:'کم',perA:279,minRating:2},ordinary:{label:'متوسط',perA:139,minRating:2},extra:{label:'زیاد',perA:92.9,minRating:4}}[haz]||{label:'متوسط',perA:139,minRating:2};
if(!(rating>0)){showRes(9,[['وضعیت','ریتینگ A نامعتبر است']],'محاسبه انجام نشد','<div class="warnBadge">ریتینگ A باید بیشتر از صفر باشد.</div>');return;}
const coverage=Math.min(1045,cfg.perA*rating),cnt=Math.max(1,Math.ceil(a/coverage)),trav=22.9;
const lines=[['دامنه','Class A'],['مساحت',fmt(a,0)+' m²'],['سطح خطر',cfg.label],['ریتینگ واردشده',fmt(rating,0)+'-A'],['حداقل ریتینگ این سطح خطر',fmt(cfg.minRating,0)+'-A'],['حداکثر سطح پوشش محاسباتی هر خاموش‌کننده',fmt(coverage,1)+' m²'],['تعداد بر مبنای مساحت',faN(cnt)+' عدد'],['حداکثر فاصله دسترسی Class A',fmt(trav,1)+' m']];
lastRes[9]={title:'برآورد خاموش‌کننده Class A (NFPA 10)',lines};
let extra=rating<cfg.minRating?'<div class="warnBadge">⚠️ ریتینگ واردشده از حداقل ریتینگ این سطح خطر کمتر است؛ نتیجه برای انتخاب نهایی معتبر نیست.</div>':'<div class="warnBadge" style="background:rgba(22,163,74,.12);color:var(--ok)">ریتینگ واردشده حداقل ریتینگ جدول Class A را برآورده می‌کند.</div>';
extra+='<div class="warnBadge">⚠️ تعداد فوق فقط کنترل مساحت Class A است؛ فاصله پیمایش واقعی 22.9 m و سایر کلاس‌های حریق باید جداگانه روی نقشه کنترل شوند.</div>';
showRes(9,lines,'برآورد Class A: '+fmt(cnt,0)+' خاموش‌کننده',extra);`;
androidHtml=androidHtml.slice(0,calc9Start)+calc9Safe+androidHtml.slice(calc9End);


replaceOnce(
  "if(num('c9Area')<=0)issues.push('مساحت برای تعداد خاموش‌کننده باید بیشتر از صفر باشد.');",
  "if(num('c9Area')<=0)issues.push('مساحت برای تعداد خاموش‌کننده باید بیشتر از صفر باشد.');\nif($('c9RatingA')&&(!Number.isFinite(num('c9RatingA'))||num('c9RatingA')<=0))issues.push('ریتینگ A خاموش‌کننده باید بیشتر از صفر باشد.');",
  'NFPA10 audit input'
);

replaceOnce(
  "if(n===9)return pos('c9Area');",
  "if(n===9)return pos('c9Area')&&pos('c9RatingA');",
  'NFPA10 bulk input validation'
);

if(!androidHtml.includes("LH:{den:4.1,hose:380,minArea:139}") ||
   !androidHtml.includes("EH2:{den:16.3,hose:1900,minArea:232}") ||
   !androidHtml.includes("id=\"c9RatingA\"") ||
   !androidHtml.includes("برآورد خاموش‌کننده Class A (NFPA 10)") ||
   !androidHtml.includes("مساحت مؤثر محاسبه") ||
   !androidHtml.includes("سرعت جریان زیر آستانه داخلی ۶ m/s")){
  throw new Error('Android legacy calculator audit patch missing');
}



/* FEP-ANDROID-LEGACY-CALC-AUDIT-v2
   Follow-up consistency / unit audit. No stable-web change. */
replaceOnce(
  "b:'مقادیر داخلی فعلی برنامه: LH ۴٫۱، OH1 ۶٫۱، OH2 ۸٫۱ L/min/m² و مساحت ۱۳۹ m². این مقادیر باید با طبقه‌بندی خطر، نوع سیستم و ویرایش NFPA 13 پروژه تطبیق داده شوند.'",
  "b:'نقاط کلاسیک داخلی ابزار: LH ۴٫۱، OH1 ۶٫۱، OH2 ۸٫۱، EH1 ۱۲٫۲ و EH2 ۱۶٫۳ L/min/m²؛ در این روش حداقل ناحیه LH/OH برابر ۱۳۹ m² و EH برابر ۲۳۲ m² اعمال می‌شود. ویرایش و شرایط دقیق پروژه باید جداگانه کنترل شوند.'",
  'sprinkler standards density-area consistency'
);
replaceOnce(
  "b:'مقادیر داخلی فعلی هوزاستریم: LH صفر، OH حدود ۹۵۰ و EH حدود ۱۹۰۰ L/min. برای طراحی نهایی، مقدار لازم باید از مرجع دقیق پروژه تعیین شود.'",
  "b:'تقاضای هوز ترکیبی استفاده‌شده در ابزار کلاسیک: LH حدود ۳۸۰، OH حدود ۹۵۰ و EH حدود ۱۹۰۰ L/min. مقدار نهایی باید با ویرایش و شرایط دقیق پروژه کنترل شود.'",
  'sprinkler standards hose consistency'
);
replaceOnce(
  "P<minP?'<div class=\"warnBadge\"> فشار کمتر از حداقل NFPA 13 ('+(sys==='m'?'0.5 bar':'7 psi')+')</div>':'<div class=\"warnBadge\" style=\"background:rgba(22,163,74,.12);color:var(--ok)\"> فشار در محدوده مجاز</div>'",
  "P<minP?'<div class=\"warnBadge\"> فشار کمتر از آستانه داخلی فعلی ('+(sys==='m'?'0.5 bar':'7 psi')+') است؛ نوع اسپرینکلر و مرجع پروژه کنترل شود.</div>':'<div class=\"warnBadge\" style=\"background:rgba(22,163,74,.12);color:var(--ok)\"> فشار برابر یا بالاتر از آستانه داخلی فعلی است؛ این به‌تنهایی تأیید NFPA 13 نیست.</div>'",
  'sprinkler nozzle pressure wording'
);
replaceOnce(
  "['معادل ستون آب',fmt(pTot*10,2)+' m']",
  "['معادل ستون آب',fmt(pTot*10.19716213,2)+' mH₂O']",
  'bar to water head conversion'
);
replaceOnce(
  "let extra='<div class=\"warnBadge\">طول معادل: جدول NFPA 13 (Sch40) با ضریب تطبیق قطر داخلی برای '+sched.label+'</div>';",
  "let extra='<div class=\"warnBadge\">طول معادل: جدول داخلی با مبنای Sch40 و ضریب تطبیق قطر داخلی برای '+sched.label+'؛ مبنای مرجع این جدول هنوز باید برای پروژه کنترل شود.</div>';",
  'equivalent length wording'
);

if(!androidHtml.includes('LH حدود ۳۸۰') ||
   !androidHtml.includes('حداقل ناحیه LH/OH برابر ۱۳۹ m² و EH برابر ۲۳۲ m²') ||
   !androidHtml.includes('pTot*10.19716213') ||
   !androidHtml.includes('این به‌تنهایی تأیید NFPA 13 نیست')){
  throw new Error('Android legacy calculator audit v2 missing');
}


/* FEP-ANDROID-LEGACY-CALC-AUDIT-v3
   Final consistency fixes from independent calculator QA. */
replaceOnce(
  '> ۱) دبی تخلیه دود پارکینگ</h3><div class="sub">مبحث ۳ — ۶ تعویض هوا + CO (۹۲۰ m³/h هر خودرو)</div>',
  '> ۱) برآورد تهویه پارکینگ (ACH/خودرو)</h3><div class="sub">روش داخلی اولیه — الزام دقیق تهویه/کنترل دود پروژه باید جداگانه کنترل شود.</div>',
  'parking calculator heading'
);
replaceOnce(
  "const baseLeakArea=Math.max(0.01,closed*doorA*0.01*(1+leak/100));",
  "const baseLeakArea=closed>0?Math.max(0.01,closed*doorA*0.01*(1+leak/100)):0;",
  'zero closed-door leakage'
);
replaceOnce(
  "9:{formula:'N = ceil(Area/Coverage) ؛ کنترل فاصله دسترسی',units:'Area: m² | N: عدد',reference:'NFPA 10 — پوشش/فاصله در داده‌های فعلی سامانه',assumptions:'نوع خطر، ریتینگ واقعی خاموش‌کننده و هندسه مسیر دسترسی باید کنترل شوند.'},",
  "9:{formula:'Coverage = min(1045, A-rating×Area-per-unit-A) ؛ N = ceil(Area/Coverage)',units:'Area: m² | Rating: A | N: عدد',reference:'NFPA 10 — Class A rating / floor-area / travel-distance criteria',assumptions:'این محاسبه فقط Class A و کنترل مساحت را پوشش می‌دهد؛ مسیر واقعی 22.9 m و سایر کلاس‌های حریق جداگانه کنترل شوند.'},",
  'extinguisher trace consistency'
);
if(!androidHtml.includes('۱) برآورد تهویه پارکینگ (ACH/خودرو)') ||
   !androidHtml.includes('closed>0?Math.max(0.01,closed*doorA*0.01') ||
   !androidHtml.includes('Coverage = min(1045, A-rating×Area-per-unit-A)')){
  throw new Error('Android legacy calculator audit v3 missing');
}


/* FEP-ANDROID-CALC-QA-CONSISTENCY-v1
   Internal QA consistency only: the calculator already uses 25-90 Pa,
   so the audit warning must use the same range. No engineering formula is changed. */
replaceOnce(
  "if(num('c7DP')<25||num('c7DP')>87)warnings.push('ΔP راه‌پله خارج از بازه 25–87 Pa پیش‌فرض ابزار است؛ معیار پروژه را کنترل کنید.');",
  "if(num('c7DP')<25||num('c7DP')>90)warnings.push('ΔP راه‌پله خارج از بازه 25–90 Pa این ابزار است؛ معیار پروژه را کنترل کنید.');",
  'stair pressure audit range consistency'
);
if(androidHtml.includes('25–87 Pa پیش‌فرض ابزار') || !androidHtml.includes("num('c7DP')>90")){
  throw new Error('Android stair-pressure QA range consistency patch missing');
}


/* FEP-ANDROID-PIPE-SIZING-UNIT-FIX-v1
   Internal-table unit correction only.
   The stored thresholds match L/min-scale capacities, while the UI input is GPM.
   Keep the user input in GPM and convert to L/min before table lookup. */
replaceOnce(
  "const PIPE_SIZES=[['100','1\" (25mm)'],['190','1¼\" (32mm)'],['290','1½\" (40mm)'],['590','2\" (50mm)'],['900','2½\" (65mm)'],['1590','3\" (80mm)'],['3000','4\" (100mm)'],['6500','6\" (150mm)'],['99999','8\" (200mm)']];",
  "const PIPE_SIZES_LPM=[['100','1\" (25mm)'],['190','1¼\" (32mm)'],['290','1½\" (40mm)'],['590','2\" (50mm)'],['900','2½\" (65mm)'],['1590','3\" (80mm)'],['3000','4\" (100mm)'],['6500','6\" (150mm)'],['99999','8\" (200mm)']];",
  'pipe sizing threshold unit constant'
);

replaceOnce(
  "const g=v('c8Gpm');\nlet sz=PIPE_SIZES.find(s=>g<=parseFloat(s[0]))||PIPE_SIZES[PIPE_SIZES.length-1];\nlastRes[8]={title:'سایزینگ لوله اطفاء (Schedule)',lines:[['دبی جریان',fmt(g,0)+' GPM ('+fmt(g*3.785,0)+' L/min)'],['سایز اسمی پیشنهادی',sz[1]]]};\nshowRes(8,lastRes[8].lines,'سایز: '+sz[1]);",
  "const g=v('c8Gpm'),qLpm=g*3.785411784;\nlet sz=PIPE_SIZES_LPM.find(s=>qLpm<=parseFloat(s[0]))||PIPE_SIZES_LPM[PIPE_SIZES_LPM.length-1];\nlastRes[8]={title:'پیشنهاد اولیه سایز لوله از جدول داخلی',lines:[['دبی جریان',fmt(g,0)+' GPM ('+fmt(qLpm,0)+' L/min)'],['سایز اسمی پیشنهادی جدول داخلی',sz[1]]]};\nshowRes(8,lastRes[8].lines,'سایز پیشنهادی: '+sz[1],'<div class=\"warnBadge\">جدول داخلی بر حسب L/min ارزیابی می‌شود؛ ورودی GPM پیش از Lookup به L/min تبدیل شده است. انتخاب نهایی باید با محاسبه هیدرولیکی، قطر داخلی و افت فشار کنترل شود.</div>');",
  'pipe sizing GPM to LPM lookup'
);



if(androidHtml.includes('let sz=PIPE_SIZES.find') ||
   !androidHtml.includes('const PIPE_SIZES_LPM=') ||
   !androidHtml.includes('qLpm=g*3.785411784') ||
   !androidHtml.includes('جدول داخلی بر حسب L/min ارزیابی می‌شود')){
  throw new Error('Android pipe sizing unit fix missing');
}


/* FEP-ANDROID-CHECKLIST-STANDARDS-HARDENING-v1
   Wording-only safety hardening: remove blanket parking compliance claims that
   are not yet tied to a verified project clause. No calculator/checklist state logic changes. */
replaceOnce(
  "'تعویض هوای حداقل ۶ بار در ساعت برقرار است'",
  "'تهویه عادی و کنترل دود پارکینگ با مقادیر الزام‌آور مبحث ۳/مبحث ۱۴ و مبنای طراحی پروژه تطبیق داده شده است'",
  'parking checklist ACH wording'
);
replaceOnce(
  "'پوشش اسپرینکلر کامل پارکینگ (OH1/OH2)'",
  "'پوشش و طبقه‌بندی خطر اسپرینکلر پارکینگ با مبنای طراحی و ویرایش مرجع پروژه تطبیق داده شده است'",
  'parking checklist sprinkler hazard wording'
);
if(androidHtml.includes('تعویض هوای حداقل ۶ بار در ساعت برقرار است') ||
   androidHtml.includes('پوشش اسپرینکلر کامل پارکینگ (OH1/OH2)') ||
   !androidHtml.includes('تهویه عادی و کنترل دود پارکینگ با مقادیر الزام‌آور مبحث ۳/مبحث ۱۴') ||
   !androidHtml.includes('پوشش و طبقه‌بندی خطر اسپرینکلر پارکینگ با مبنای طراحی')){
  throw new Error('Android parking checklist standards hardening missing');
}


/* FEP-ANDROID-STAIR-PRESSURE-OPEN-DOOR-v1
   Engineering correction:
   - open-door airflow uses user-entered design velocity: Qopen = A * V
   - closed-door leakage still uses the pressure-difference orifice relation
   - 25-90 Pa check is retained for stair pressure target
   Default open-door velocity is 1.0 m/s as a project input, not a blanket code claim. */

replaceOnce(
  '<div class="formRow"><div class="field"><label>درب باز</label><input type="number" id="c7Open" value="1"></div><div class="field"><label>ارتفاع (m)</label><input type="number" id="c7H" value="30"></div><div class="field"><label>نشتی (٪)</label><input type="number" id="c7Leak" value="20"></div><div class="field"><label>درب بسته</label><input type="number" id="c7Closed" value="10"></div><div class="field"><label>عرض درب</label><input type="number" id="c7DoorW" value="0.9"></div><div class="field"><label>ارتفاع درب</label><input type="number" id="c7DoorH" value="2.1"></div><div class="field"><label>ΔP (Pa)</label><input type="number" id="c7DP" value="50"></div></div>',
  '<div class="formRow"><div class="field"><label>درب باز</label><input type="number" id="c7Open" value="1"></div><div class="field"><label>سرعت طراحی درب باز (m/s)</label><input type="number" id="c7OpenVel" value="1" min="0.1" step="0.1"></div><div class="field"><label>ارتفاع (m)</label><input type="number" id="c7H" value="30"></div><div class="field"><label>نشتی (٪)</label><input type="number" id="c7Leak" value="20"></div><div class="field"><label>درب بسته</label><input type="number" id="c7Closed" value="10"></div><div class="field"><label>عرض درب</label><input type="number" id="c7DoorW" value="0.9"></div><div class="field"><label>ارتفاع درب</label><input type="number" id="c7DoorH" value="2.1"></div><div class="field"><label>ΔP در حالت بسته (Pa)</label><input type="number" id="c7DP" value="50"></div></div>',
  'stair pressure open-door velocity input'
);

const stairOldCalc = `const open=v('c7Open'),closed=v('c7Closed'),h=v('c7H'),leak=v('c7Leak');
const w=v('c7DoorW'),dh=v('c7DoorH'),dp=v('c7DP');
const rho=1.2,Cd=0.65,doorA=Math.max(0,w*dh),floors=Math.max(1,Math.ceil(h/3));
const qOne=Cd*doorA*Math.sqrt(2*Math.max(dp,0)/rho)*3600;
const qOpen=open*qOne;
const baseLeakArea=closed>0?Math.max(0.01,closed*doorA*0.01*(1+leak/100)):0;
const qLeak=Cd*baseLeakArea*Math.sqrt(2*Math.max(dp,0)/rho)*3600;
const tot=(qOpen+qLeak)*1.15;
const lines=[['تعداد طبقات (تقریبی)',fmt(floors,0)],['سطح هر درب',fmt(doorA,2)+' m²'],['ΔP طراحی',fmt(dp,0)+' Pa'],['دبی هر درب باز',fmt(qOne,0)+' m³/h'],['دبی درب‌های باز',fmt(qOpen,0)+' m³/h'],['دبی نشتی درب‌های بسته',fmt(qLeak,0)+' m³/h'],['ضریب اطمینان', '۱۵٪'],['دبی فن برآوردی',fmt(tot,0)+' m³/h'],['معادل',fmt(tot/3600,2)+' m³/s']];
lastRes[7]={title:'برآورد دبی فن فشار مثبت راه‌پله',lines};
let extra='<div class="warnBadge"> این نتیجه «برآورد جریان از بازشوها» است؛ انتخاب نهایی فن باید با سناریوی درهای باز/بسته، مسیر نشت، فشار هدف و الزامات مرجع پروژه کنترل شود.</div>';
if(dp<25||dp>90)extra+='<div class="warnBadge"> ΔP واردشده خارج از بازه 25 تا 90 Pa این ابزار است.</div>';
if(open<1)extra+='<div class="warnBadge"> حداقل یک سناریوی درب باز برای کنترل عملکرد سیستم در نظر بگیرید.</div>';
showRes(7,lines,'دبی فن برآوردی: '+fmt(tot,0)+' m³/h',extra);`;

const stairNewCalc = `const open=v('c7Open'),closed=v('c7Closed'),h=v('c7H'),leak=v('c7Leak');
const w=v('c7DoorW'),dh=v('c7DoorH'),dp=v('c7DP'),openVel=v('c7OpenVel');
const rho=1.2,Cd=0.65,doorA=Math.max(0,w*dh),floors=Math.max(1,Math.ceil(h/3));
const qOne=doorA*Math.max(0,openVel)*3600;
const qOpen=open*qOne;
const baseLeakArea=closed>0?Math.max(0.01,closed*doorA*0.01*(1+leak/100)):0;
const qLeak=Cd*baseLeakArea*Math.sqrt(2*Math.max(dp,0)/rho)*3600;
const tot=(qOpen+qLeak)*1.15;
const lines=[['تعداد طبقات (تقریبی)',fmt(floors,0)],['سطح هر درب',fmt(doorA,2)+' m²'],['سرعت طراحی درب باز',fmt(openVel,2)+' m/s'],['ΔP درب‌های بسته',fmt(dp,0)+' Pa'],['دبی هر درب باز',fmt(qOne,0)+' m³/h'],['دبی درب‌های باز',fmt(qOpen,0)+' m³/h'],['سطح نشتی معادل درب‌های بسته',fmt(baseLeakArea,4)+' m²'],['دبی نشتی درب‌های بسته',fmt(qLeak,0)+' m³/h'],['ضریب اطمینان داخلی', '۱۵٪'],['دبی فن برآوردی',fmt(tot,0)+' m³/h'],['معادل',fmt(tot/3600,2)+' m³/s']];
lastRes[7]={title:'برآورد دبی فن فشار مثبت راه‌پله',lines};
let extra='<div class="warnBadge">دبی درب باز از Q=A×V و سرعت طراحی واردشده توسط کاربر محاسبه می‌شود؛ ΔP فقط برای برآورد نشتی درب‌های بسته استفاده می‌شود.</div>';
extra+='<div class="warnBadge">سرعت 1.0 m/s مقدار پیش‌فرض ابزار است و باید با مبنای طراحی/مرجع پروژه تطبیق داده شود.</div>';
if(dp<25||dp>90)extra+='<div class="warnBadge"> ΔP واردشده خارج از بازه 25 تا 90 Pa این ابزار است.</div>';
if(open<1)extra+='<div class="warnBadge"> حداقل یک سناریوی درب باز برای کنترل عملکرد سیستم در نظر بگیرید.</div>';
showRes(7,lines,'دبی فن برآوردی: '+fmt(tot,0)+' m³/h',extra);`;

replaceOnce(stairOldCalc, stairNewCalc, 'stair pressure open-door calculation');

replaceOnce(
  "if(num('c7DoorW')<=0||num('c7DoorH')<=0)issues.push('ابعاد درب راه‌پله باید بزرگ‌تر از صفر باشد.');",
  "if(num('c7DoorW')<=0||num('c7DoorH')<=0)issues.push('ابعاد درب راه‌پله باید بزرگ‌تر از صفر باشد.');\nif($('c7OpenVel')&&(!Number.isFinite(num('c7OpenVel'))||num('c7OpenVel')<=0))issues.push('سرعت طراحی درب باز باید بزرگ‌تر از صفر باشد.');",
  'stair pressure audit velocity validation'
);

replaceOnce(
  "if(n===7)return pos('c7DoorW')&&pos('c7DoorH')&&pos('c7DP')&&Number.isFinite(x('c7Open'))&&x('c7Open')>=1&&nonneg('c7Closed')&&nonneg('c7Leak')&&x('c7Leak')<=100;",
  "if(n===7)return pos('c7DoorW')&&pos('c7DoorH')&&pos('c7DP')&&pos('c7OpenVel')&&Number.isFinite(x('c7Open'))&&x('c7Open')>=1&&nonneg('c7Closed')&&nonneg('c7Leak')&&x('c7Leak')<=100;",
  'stair pressure bulk velocity validation'
);

if(!androidHtml.includes('id="c7OpenVel"') ||
   !androidHtml.includes("const qOne=doorA*Math.max(0,openVel)*3600") ||
   !androidHtml.includes("ΔP فقط برای برآورد نشتی درب‌های بسته") ||
   !androidHtml.includes("pos('c7OpenVel')")){
  throw new Error('Android stair pressure open-door correction missing');
}


/* FEP-ANDROID-PARKING-VENT-REFERENCE-GUIDE-v1
   Regulatory-basis correction only:
   - removes the unsupported automatic 6 ACH + 85% makeup preset
   - preserves the audit inputs, calculation, save flow, and button position
   - the former preset button becomes a non-destructive reference guide. */
replaceOnce(
  '<div class="sub">اتصال الزامات: حداقل ۶ ACH از مبحث ۳؛ الزام‌های عددی مبحث ۱۴ (ویرایش ۱۳۹۶) باید از بند/جدول منبع وارد شوند.</div>',
  '<div class="sub">مبنای ممیزی: دبی تهویه عادی باید از الزام قابل استناد مبحث ۱۴/طرح پروژه وارد شود؛ دبی حالت حریق نیز باید با سناریوی کنترل دود و مرجع قابل اعمال پروژه کنترل شود.</div>',
  'parking ventilation audit subtitle'
);

replaceOnce(
  '<button class="btn ghost" id="btnPVDefault"> پیش‌فرض مبحث ۳</button>',
  '<button class="btn ghost" id="btnPVDefault"> راهنمای مبنای مقرراتی</button>',
  'parking ventilation preset button label'
);

const pvDefaultOld = `if($('btnPVDefault'))$('btnPVDefault').onclick=()=>{
$('pvFan').value=Math.round(6*(+$('pvL').value||60)*(+$('pvW').value||30)*(+$('pvH').value||3));
$('pvMakeupReq').value=85;
$('pvMakeup').value=Math.round((+$('pvFan').value)*0.85);
toast(' پیش‌فرض مبحث ۳ (۶ ACH + جبرانی ۸۵٪) اعمال شد');
};`;

const pvDefaultNew = `if($('btnPVDefault'))$('btnPVDefault').onclick=()=>{
toast('مبحث ۳ برای دبی عادی این بخش عدد ثابت ۶ ACH/۸۵٪ تعیین نمی‌کند؛ مقدار الزام مبحث ۱۴ و مبنای حالت حریق را از مرجع پروژه وارد کنید.');
};`;

replaceOnce(pvDefaultOld,pvDefaultNew,'parking ventilation reference guide behavior');

if(androidHtml.includes('حداقل ۶ ACH از مبحث ۳') ||
   androidHtml.includes('پیش‌فرض مبحث ۳ (۶ ACH + جبرانی ۸۵٪) اعمال شد') ||
   androidHtml.includes("Math.round(6*(+$('pvL').value") ||
   !androidHtml.includes('راهنمای مبنای مقرراتی') ||
   !androidHtml.includes('مقدار الزام مبحث ۱۴ و مبنای حالت حریق را از مرجع پروژه وارد کنید')){
  throw new Error('Android parking ventilation unsafe preset removal missing');
}


/* FEP-ANDROID-CALC-TRACE-CONSISTENCY-v2
   Trace/report wording only. Keep engineering trace aligned with the already-audited
   calculator implementations; no calculation behavior is changed. */
replaceOnce(
  "2:{formula:'Q = Density×Area + Hose Stream',units:'Density: L/min/m² | Q: L/min',reference:'NFPA 13 — مبنای Hazard/Demand ثبت‌شده در سامانه',assumptions:'مساحت و چگالی باید با طبقه‌بندی خطر و ناحیه طراحی واقعی تطبیق داده شوند.'},",
  "2:{formula:'Effective Area = max(Input Area, minimum area of selected hazard point) ؛ Q = Density×Effective Area + Hose Stream',units:'Density: L/min/m² | Area: m² | Q: L/min',reference:'نقاط کلاسیک density/area و تقاضای هوز در ابزار NFPA 13',assumptions:'حداقل ناحیه و هوز داخلی ابزار با نقطه خطر انتخابی اعمال می‌شوند؛ ویرایش و شرایط دقیق پروژه باید جداگانه کنترل شوند.'},",
  'calc trace sprinkler effective area'
);
replaceOnce(
  "7:{formula:'Q = Cd×A×√(2ΔP/ρ)×3600 ؛ Qfan ≈ (Qopen+Qleak)×1.15',units:'ΔP: Pa | Q: m³/h',reference:'NFPA 92 — فقط به‌عنوان برآورد جریان از بازشوها در این سامانه',assumptions:'این نتیجه طراحی نهایی فن نیست؛ نشت واقعی، سناریوی درها، فشار هدف و مسیرهای خروج هوا باید جداگانه بررسی شوند.'},",
  "7:{formula:'Qopen = Adoor×Vopen×3600 ؛ Qleak = Cd×Aleak×√(2ΔP/ρ)×3600 ؛ Qfan ≈ (Qopen+Qleak)×1.15',units:'Vopen: m/s | ΔP: Pa | Q: m³/h',reference:'برآورد فشار مثبت با تفکیک سناریوی درب باز و نشتی درب بسته',assumptions:'Vopen ورودی کاربر است؛ 1.0 m/s پیش‌فرض ابزار الزام عمومی نیست. نشتی پایه و 15٪ حاشیه نیز فرض داخلی‌اند و باید با مبنای پروژه کنترل شوند.'},",
  'calc trace stair open door method'
);
replaceOnce(
  "8:{formula:'انتخاب سایز از جدول ظرفیت دبی فعلی سامانه',units:'Q: GPM',reference:'Schedule table موجود در سامانه',assumptions:'انتخاب نهایی قطر باید با محاسبه هیدرولیکی، سرعت، افت فشار و ضوابط پروژه کنترل شود.'},",
  "8:{formula:'Q_L/min = Q_GPM×3.785411784 ؛ سپس انتخاب اولین سایز دارای آستانه داخلی کافی',units:'ورودی: GPM | جدول داخلی: L/min',reference:'جدول داخلی پیشنهادی سایز؛ نه جایگزین محاسبه هیدرولیکی',assumptions:'انتخاب نهایی قطر باید با قطر داخلی واقعی، سرعت، افت فشار، اتصالات و مرجع پروژه کنترل شود.'},",
  'calc trace pipe sizing units'
);
replaceOnce(
  "13:{formula:'V=L×W×H ؛ Q_M14=14.4×A_floor ؛ ACH=Qfan/V ؛ کنترل Qfan≥Q_M14 و CO<25ppm و Makeup≥ratio×Qfan',units:'V: m³ | A_floor: m² | Q: m³/h | ACH: 1/h | CO: ppm',reference:'مبحث ۳ + مبحث ۱۴ بند ۱۴-۴-۴-۴-۶، صفحه چاپی ۴۳؛ مبنای پارکینگ ۴ L/s·m² کف و CO<25ppm.',assumptions:'مبنای ۴ L/s·m² مستقیماً از بند منبع اعمال می‌شود؛ کاهش ظرفیت یا شرایط خاص به‌صورت خودکار فرض نمی‌شود.'}",
  "13:{formula:'V=L×W×H ؛ Q_M14=14.4×A_floor ؛ ACH=Qfan/V ؛ کنترل Qfan≥Q_M14 و CO<25ppm و Makeup≥ratio×Qfan',units:'V: m³ | A_floor: m² | Q: m³/h | ACH: 1/h | CO: ppm',reference:'مبحث ۳ + مبحث ۱۴ بند ۱۴-۴-۴-۴-۶، صفحه چاپی ۴۳؛ مبنای پارکینگ ۴ L/s·m² کف و CO<25ppm.',assumptions:'مبنای ۴ L/s·m² مستقیماً از بند منبع اعمال می‌شود؛ کاهش ظرفیت یا شرایط خاص به‌صورت خودکار فرض نمی‌شود.'}",
  'calc trace parking ventilation reference'
);

if(androidHtml.includes("7:{formula:'Q = Cd×A×√(2ΔP/ρ)") ||
   androidHtml.includes("8:{formula:'انتخاب سایز از جدول ظرفیت دبی فعلی سامانه'") ||
   androidHtml.includes("assumptions:'عدد الزام‌آور مبحث ۱۴ حدس زده نمی‌شود؛ حالت حریق جداگانه بررسی می‌شود.'") ||
   !androidHtml.includes("Qopen = Adoor×Vopen×3600") ||
   !androidHtml.includes("ورودی: GPM | جدول داخلی: L/min") ||
   !androidHtml.includes("Q_M14=14.4×A_floor") ||
   !androidHtml.includes("CO<25ppm")){
  throw new Error('Android calc trace consistency v2 missing');
}


/* FEP-ANDROID-CALC-QA-LABEL-CONSISTENCY-v1
   UI/QA consistency only; no engineering formula changes. */
replaceOnce(
  '<label>نشتی (٪)</label><input type="number" id="c7Leak" value="20">',
  '<label>افزایش نشتی نسبت به پایه ۱٪ (٪)</label><input type="number" id="c7Leak" value="20">',
  'stair leakage field label'
);
replaceOnce(
  "if(speed6!=null&&speed6>5)add('افت فشار لوله‌کشی: سرعت جریان '+speed6+' m/s است؛ مقدار بالا بوده و قطر/دبی مسیر باید بازبینی شود.');",
  "if(speed6!=null&&speed6>6)add('افت فشار لوله‌کشی: سرعت جریان '+speed6+' m/s از آستانه داخلی ۶ m/s بالاتر است؛ قطر/دبی مسیر باید بازبینی شود.');",
  'Hazen QA velocity threshold consistency'
);
if(!androidHtml.includes('افزایش نشتی نسبت به پایه ۱٪ (٪)') ||
   androidHtml.includes("speed6!=null&&speed6>5") ||
   !androidHtml.includes("speed6!=null&&speed6>6")){
  throw new Error('Android QA label consistency patch missing');
}


/* FEP-ANDROID-CALC-STALE-SAVE-GUARD-v1
   Prevent saving a stale calculation result after inputs in the same calculator card
   have changed. No calculation formula or existing saved record is modified. */

const staleSaveHelperAnchor = 'function bindCalcEvents(){';
if(!androidHtml.includes(staleSaveHelperAnchor)) throw new Error('Android stale-save guard: bindCalcEvents anchor missing');
const staleSaveHelper = `const calcRunSignatures={};

function calcCardFor(n){
  let btn=null;
  if(n===11)btn=$('btnHydChain');
  else if(n===12)btn=$('btnCriticalPath');
  else if(n===13)btn=$('btnParkingVentAudit');
  else btn=document.querySelector('button[data-calc="'+n+'"]');
  return btn?.closest('.card')||null;
}

function calcInputSnapshot(n){
  const card=calcCardFor(n);
  const out={};
  if(!card)return out;
  card.querySelectorAll('input,select,textarea').forEach(el=>{
    const key=el.id||el.name;
    if(!key)return;
    if(el.type==='radio'||el.type==='checkbox'){
      if(el.checked)out[key]=el.value;
      return;
    }
    out[key]=el.value;
  });
  return out;
}

function calcInputSignature(n){
  const rows=Object.entries(calcInputSnapshot(n)).map(([k,v])=>[k,String(v??'')]);
  rows.sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
  return JSON.stringify(rows);
}

function runCalcStamped(n,fn){
  lastRes[n]=null;
  calcRunSignatures[n]='';
  const out=fn();
  if(lastRes[n])calcRunSignatures[n]=calcInputSignature(n);
  return out;
}

function bindCalcEvents(){`;
androidHtml=androidHtml.replace(staleSaveHelperAnchor,staleSaveHelper);

replaceOnce(
  "if($('btnParkingVentAudit'))$('btnParkingVentAudit').onclick=runParkingVentAudit;",
  "if($('btnParkingVentAudit'))$('btnParkingVentAudit').onclick=()=>runCalcStamped(13,runParkingVentAudit);",
  'stale-save parking audit binding'
);
replaceOnce(
  "if($('btnHydChain'))$('btnHydChain').onclick=runHydraulicChain;",
  "if($('btnHydChain'))$('btnHydChain').onclick=()=>runCalcStamped(11,runHydraulicChain);",
  'stale-save hydraulic chain binding'
);
replaceOnce(
  "if($('btnCriticalPath'))$('btnCriticalPath').onclick=()=>runCriticalPath();",
  "if($('btnCriticalPath'))$('btnCriticalPath').onclick=()=>runCalcStamped(12,runCriticalPath);",
  'stale-save selected path binding'
);
replaceOnce(
  "document.querySelectorAll('button[data-calc]').forEach(b=>{\nb.onclick=()=>runCalc(parseInt(b.dataset.calc));\n});",
  "document.querySelectorAll('button[data-calc]').forEach(b=>{\nb.onclick=()=>{const n=parseInt(b.dataset.calc);runCalcStamped(n,()=>runCalc(n));};\n});",
  'stale-save ordinary calculator binding'
);
replaceOnce(
  "function saveCalc(n){\nif(!lastRes[n]){toast(' ابتدا دکمه «محاسبه» را بزنید','err');return;}\nif(!calcAuditGate(n))return;",
  "function saveCalc(n){\nif(!lastRes[n]){toast(' ابتدا دکمه «محاسبه» را بزنید','err');return;}\nif(!calcRunSignatures[n]||calcRunSignatures[n]!==calcInputSignature(n)){toast(' ورودی‌های این محاسبه بعد از آخرین اجرا تغییر کرده‌اند؛ ابتدا دوباره «محاسبه» را بزنید.','err');return;}\nif(!calcAuditGate(n))return;",
  'stale-save saveCalc gate'
);

if(!androidHtml.includes('const calcRunSignatures={};') ||
   !androidHtml.includes('function calcInputSignature(n)') ||
   !androidHtml.includes('runCalcStamped(13,runParkingVentAudit)') ||
   !androidHtml.includes('runCalcStamped(11,runHydraulicChain)') ||
   !androidHtml.includes('runCalcStamped(12,runCriticalPath)') ||
   !androidHtml.includes('ورودی‌های این محاسبه بعد از آخرین اجرا تغییر کرده‌اند')){
  throw new Error('Android stale calculation save guard missing');
}





/* FEP-ANDROID-SCOPED-CALC-SNAPSHOT-v1
   Store only the inputs belonging to the calculator being saved. */
replaceOnce(
  "if(!calcAuditGate(n))return;\nconst inputs={};\ndocument.querySelectorAll('#sec-calcs input,#sec-calcs select').forEach(el=>{if(el.id)inputs[el.id]=el.value;});",
  "if(!calcAuditGate(n))return;\nconst inputs=calcInputSnapshot(n);",
  'manual calculator scoped input snapshot'
);
replaceOnce(
  "function bulkCalcSnapshot(n){\n const inputs={};\n document.querySelectorAll('#sec-calcs input,#sec-calcs select').forEach(el=>{if(el.id)inputs[el.id]=el.value;});",
  "function bulkCalcSnapshot(n){\n const inputs=calcInputSnapshot(n);",
  'bulk calculator scoped input snapshot'
);
if(!androidHtml.includes('function calcInputSnapshot(n)') ||
   !androidHtml.includes('const inputs=calcInputSnapshot(n);') ||
   androidHtml.includes("document.querySelectorAll('#sec-calcs input,#sec-calcs select').forEach(el=>{if(el.id)inputs[el.id]=el.value;});")){
  throw new Error('Android scoped calculation input snapshot missing');
}

/* FEP-ANDROID-SCOPED-CALC-AUDIT-GATE-v1
   Keep the full-page QA report, but only current-calculator critical input errors
   are allowed to block saving that calculator. No engineering formula changes. */
const scopedAuditOld = `function calcAuditGate(n){
const r=runCalcAudit();
const critical=r.issues.filter(x=>x&&x.trim()).length;
if(critical){toast(' ثبت محاسبه متوقف شد: ابتدا خطاهای ورودی را اصلاح کنید','err');return false;}
return true;
}`;

const scopedAuditNew = `function calcScopedCriticalIssues(n){
const issues=[],num=id=>parseFloat($(id)?.value),bad=id=>!Number.isFinite(num(id));
if(n===1){if(bad('c1L')||bad('c1W')||bad('c1H')||num('c1L')<=0||num('c1W')<=0||num('c1H')<=0)issues.push('ابعاد پارکینگ باید بزرگ‌تر از صفر باشند.');if(bad('c1ACH')||num('c1ACH')<1||num('c1ACH')>20)issues.push('ACH پارکینگ باید در بازه ورودی ۱ تا ۲۰ باشد.');if(bad('c1Car')||num('c1Car')<0)issues.push('تعداد خودرو نمی‌تواند منفی باشد.');}
if(n===2){if(bad('c2Area')||num('c2Area')<=0)issues.push('مساحت ناحیه طراحی اسپرینکلر باید بیشتر از صفر باشد.');}
if(n===3){if(bad('c3Den')||bad('c3Area')||num('c3Den')<=0||num('c3Area')<=0)issues.push('چگالی و مساحت طراحی اسپرینکلر باید بیشتر از صفر باشند.');if(bad('c3Hose')||num('c3Hose')<0||bad('c3Imb')||num('c3Imb')<0)issues.push('دبی شلنگ و درصد ناموازنی نمی‌توانند منفی باشند.');}
if(n===4){const k=$('c4K')?.value==='c'?num('c4Kc'):parseFloat($('c4K')?.value);if(bad('c4P')||num('c4P')<=0)issues.push('فشار نازل باید بزرگ‌تر از صفر باشد.');if(!Number.isFinite(k)||k<=0)issues.push('K-factor نازل باید بزرگ‌تر از صفر باشد.');}
if(n===5){if(bad('c5Q')||bad('c5Dur')||num('c5Q')<=0||num('c5Dur')<=0)issues.push('برای حجم مخزن، دبی و مدت تأمین باید بیشتر از صفر باشند.');if(bad('c5Safe')||num('c5Safe')<0||num('c5Safe')>100)issues.push('درصد ضریب اطمینان مخزن باید بین ۰ تا ۱۰۰ باشد.');}
if(n===6){if(bad('c6Q')||bad('c6L')||num('c6Q')<=0||num('c6L')<=0)issues.push('برای Hazen-Williams دبی و طول مسیر باید بیشتر از صفر باشند.');if(bad('c6C')||num('c6C')<50||num('c6C')>180)issues.push('ضریب C باید در بازه ورودی ۵۰ تا ۱۸۰ باشد.');if(['c6Elb','c6Tee','c6Chk','c6Gate'].some(id=>bad(id)||num(id)<0))issues.push('تعداد اتصالات Hazen-Williams نمی‌تواند منفی یا نامعتبر باشد.');}
if(n===7){if(bad('c7Open')||num('c7Open')<1)issues.push('برای سناریوی فشار مثبت باید حداقل یک درب باز تعریف شود.');if(bad('c7Closed')||num('c7Closed')<0)issues.push('تعداد درب بسته نامعتبر است.');if(bad('c7DP')||num('c7DP')<=0)issues.push('اختلاف فشار راه‌پله باید بزرگ‌تر از صفر باشد.');if(num('c7Open')+num('c7Closed')<=0)issues.push('حداقل یک درب باید در سناریوی راه‌پله تعریف شود.');if(bad('c7DoorW')||bad('c7DoorH')||num('c7DoorW')<=0||num('c7DoorH')<=0)issues.push('ابعاد درب راه‌پله باید بزرگ‌تر از صفر باشد.');if($('c7OpenVel')&&(bad('c7OpenVel')||num('c7OpenVel')<=0))issues.push('سرعت طراحی درب باز باید بزرگ‌تر از صفر باشد.');if(bad('c7Leak')||num('c7Leak')<0||num('c7Leak')>100)issues.push('درصد افزایش نشتی باید بین ۰ تا ۱۰۰ باشد.');}
if(n===8){if(bad('c8Gpm')||num('c8Gpm')<=0)issues.push('دبی سایزینگ لوله باید بیشتر از صفر باشد.');}
if(n===9){if(bad('c9Area')||num('c9Area')<=0)issues.push('مساحت Class A باید بیشتر از صفر باشد.');if($('c9RatingA')&&(bad('c9RatingA')||num('c9RatingA')<=0))issues.push('ریتینگ A خاموش‌کننده باید بیشتر از صفر باشد.');}
if(n===10){if(bad('c10P')||bad('c10dT')||num('c10P')<=0||num('c10dT')<=0)issues.push('توان و ΔT موتورخانه باید بیشتر از صفر باشند.');if(bad('c10Vol')||num('c10Vol')<0)issues.push('حجم موتورخانه نمی‌تواند منفی باشد.');const mode=$('c10Mode')?.value||'mfr';if(mode==='mfr'&&((bad('c10MfrComb')||num('c10MfrComb')<=0)||(bad('c10MfrHeat')||num('c10MfrHeat')<=0)))issues.push('در حالت داده سازنده، هوای احتراق و گرمای دفع‌شده باید بیشتر از صفر باشند.');}
if(n===11){if(bad('hcQ')||num('hcQ')<=0)issues.push('دبی زنجیره هیدرولیکی باید بزرگ‌تر از صفر باشد.');if(bad('hcK')||num('hcK')<=0)issues.push('K-factor زنجیره هیدرولیکی باید بزرگ‌تر از صفر باشد.');if(bad('hcBranches')||num('hcBranches')<1)issues.push('تعداد شاخه‌ها باید حداقل یک باشد.');if(bad('hcMinP')||num('hcMinP')<0||bad('hcFriction')||num('hcFriction')<0||bad('hcFittings')||num('hcFittings')<0)issues.push('فشار حداقل و افت‌های زنجیره هیدرولیکی نمی‌توانند منفی باشند.');if(bad('hcElev'))issues.push('اختلاف ارتفاع زنجیره هیدرولیکی نامعتبر است.');if(bad('hcMargin')||num('hcMargin')<0||num('hcMargin')>100)issues.push('حاشیه زنجیره هیدرولیکی باید بین ۰ تا ۱۰۰ درصد باشد.');}
if(n===12){for(let i=1;i<=6;i++){if(bad('c12Q'+i)||bad('c12L'+i)||bad('c12D'+i)||bad('c12C'+i)||bad('c12K'+i)||bad('c12R'+i)||num('c12Q'+i)<0||num('c12L'+i)<0||num('c12D'+i)<=0||num('c12C'+i)<50||num('c12C'+i)>180||num('c12K'+i)<0)issues.push('پارامترهای سگمنت '+i+' مسیر انتخاب‌شده نامعتبر است.');}if(bad('c12Residual')||bad('c12Equip')||bad('c12Margin')||num('c12Residual')<0||num('c12Equip')<0||num('c12Margin')<0||num('c12Margin')>100)issues.push('پارامترهای فشار مسیر انتخاب‌شده نامعتبر هستند.');}
if(n===13){if(bad('pvL')||bad('pvW')||bad('pvH')||num('pvL')<=0||num('pvW')<=0||num('pvH')<=0)issues.push('ابعاد ممیزی تهویه پارکینگ باید کامل و بزرگ‌تر از صفر باشند.');if(['pvFan','pvMakeup','pvM14Req','pvMakeupReq','pvFire'].some(id=>bad(id)||num(id)<0)||num('pvMakeupReq')>100)issues.push('یکی از ورودی‌های دبی/درصد ممیزی تهویه نامعتبر است.');}
return issues;
}
function calcAuditGate(n){
runCalcAudit();
const critical=calcScopedCriticalIssues(n);
if(critical.length){toast(' ثبت این محاسبه متوقف شد: '+critical[0],'err');return false;}
return true;
}`;

replaceOnce(scopedAuditOld,scopedAuditNew,'scoped calculator audit gate');

if(!androidHtml.includes('function calcScopedCriticalIssues(n)') ||
   !androidHtml.includes('const critical=calcScopedCriticalIssues(n);') ||
   androidHtml.includes("const critical=r.issues.filter(x=>x&&x.trim()).length;")){
  throw new Error('Android scoped calculator audit gate missing');
}



/* FEP-ANDROID-PROJECT-ISOLATION-TRANSIENTS-v1
   Project-isolation hardening:
   - stamp transient calculator results with the active project id
   - prevent cross-project save of a transient result
   - refresh project-scoped network/parking UI on project switches
   - clear stale transient result/editor state when active project changes
   No stored project data or engineering formula is changed. */

replaceOnce(
  "const calcRunSignatures={};",
  "const calcRunSignatures={},calcRunProjects={};",
  'calculator project stamp map'
);

replaceOnce(
  "function runCalcStamped(n,fn){\n  lastRes[n]=null;\n  calcRunSignatures[n]='';\n  const out=fn();\n  if(lastRes[n])calcRunSignatures[n]=calcInputSignature(n);\n  return out;\n}",
  "function runCalcStamped(n,fn){\n  lastRes[n]=null;\n  calcRunSignatures[n]='';\n  calcRunProjects[n]='';\n  const out=fn();\n  if(lastRes[n]){calcRunSignatures[n]=calcInputSignature(n);calcRunProjects[n]=(typeof S!=='undefined'?S.activeId:'');}\n  return out;\n}",
  'calculator project-aware stamping'
);

replaceOnce(
  "if(!calcRunSignatures[n]||calcRunSignatures[n]!==calcInputSignature(n)){toast(' ورودی‌های این محاسبه بعد از آخرین اجرا تغییر کرده‌اند؛ ابتدا دوباره «محاسبه» را بزنید.','err');return;}",
  "if(!calcRunProjects[n]||calcRunProjects[n]!==S.activeId){toast(' این نتیجه متعلق به پروژه فعال فعلی نیست؛ ابتدا در همین پروژه دوباره «محاسبه» را بزنید.','err');return;}\nif(!calcRunSignatures[n]||calcRunSignatures[n]!==calcInputSignature(n)){toast(' ورودی‌های این محاسبه بعد از آخرین اجرا تغییر کرده‌اند؛ ابتدا دوباره «محاسبه» را بزنید.','err');return;}",
  'cross-project calculator save gate'
);

const refreshOld = `function refreshAllUI(){
document.documentElement.setAttribute('data-theme',S.theme||'light');
renderHeader();
renderTabs();
renderTypeBar();
renderDash();
renderFloors();
renderRuleEngine();
renderChecklist();
renderNcr();
renderStd();
bindReportInputs();
renderProjectCenter();
try{window.FEPEquipment?.render();window.FEPTopology?.refresh();window.FEPPathAnalyzer?.fill();window.FEPPumpDesign?.refresh();}catch(e){console.warn('project model refresh',e);}
}`;

const refreshNew = `let fepLastUiProjectId=null;
function clearProjectTransientUi(){
  Object.keys(lastRes).forEach(k=>delete lastRes[k]);
  Object.keys(calcRunSignatures).forEach(k=>delete calcRunSignatures[k]);
  Object.keys(calcRunProjects).forEach(k=>delete calcRunProjects[k]);
  if(Array.isArray(pendingPhotos.before))pendingPhotos.before.length=0;
  if(Array.isArray(pendingPhotos.after))pendingPhotos.after.length=0;
  try{window.__pendingChecklistNcr=null;window.__pendingRegNcr=null;window.__pendingNumericNcr=null;window.__pendingElevatorNcr=null;}catch(_){}
  try{if(typeof resetNetNodeEditor==='function')resetNetNodeEditor();if(typeof resetNetPipeEditor==='function')resetNetPipeEditor();}catch(_){}
  ['netResult','pzResult','v38Out','hydChainRes','res12','parkingVentAuditRes'].forEach(id=>{const el=$(id);if(el)el.innerHTML='';});
  document.querySelectorAll('#sec-calcs .resBox').forEach(el=>{el.innerHTML='';});
}
function refreshAllUI(){
const projectChanged=fepLastUiProjectId!==S.activeId;
fepLastUiProjectId=S.activeId;
if(projectChanged)clearProjectTransientUi();
document.documentElement.setAttribute('data-theme',S.theme||'light');
renderHeader();
renderTabs();
renderTypeBar();
renderDash();
renderFloors();
renderRuleEngine();
renderChecklist();
renderNcr();
renderStd();
bindReportInputs();
renderProjectCenter();
try{if(typeof renderNet==='function')renderNet();if(typeof renderPz==='function')renderPz();window.FEPEquipment?.render();window.FEPTopology?.refresh();window.FEPPathAnalyzer?.fill();window.FEPPumpDesign?.refresh();}catch(e){console.warn('project model refresh',e);}
}`;

replaceOnce(refreshOld,refreshNew,'project-scoped UI refresh');

if(!androidHtml.includes('const calcRunSignatures={},calcRunProjects={};') ||
   !androidHtml.includes("calcRunProjects[n]=(typeof S!=='undefined'?S.activeId:'')") ||
   !androidHtml.includes("calcRunProjects[n]!==S.activeId") ||
   !androidHtml.includes('function clearProjectTransientUi()') ||
   !androidHtml.includes("if(typeof renderNet==='function')renderNet()") ||
   !androidHtml.includes("if(typeof renderPz==='function')renderPz()")){
  throw new Error('Android project-isolation transient hardening missing');
}


/* FEP-ANDROID-BULK-CALC-STALE-GUARD-v1
   Use the same last-result invalidation/stamping path for Run All.
   Also require manufacturer data before bulk-running diesel ventilation in mfr mode.
   No engineering formula changes. */
replaceOnce(
  "if(n===10)return pos('c10P')&&pos('c10dT')&&nonneg('c10Vol');",
  "if(n===10){if(!(pos('c10P')&&pos('c10dT')&&nonneg('c10Vol')))return false;const mode=$('c10Mode')?.value||'mfr';if(mode==='mfr')return pos('c10MfrComb')&&pos('c10MfrHeat');return true;}",
  'bulk diesel manufacturer input validation'
);
replaceOnce(
  "   runCalc(n);\n   if(lastRes[n]){executed++;if(replaceBulkCalc(n))saved++;}",
  "   runCalcStamped(n,()=>runCalc(n));\n   if(lastRes[n]){executed++;if(replaceBulkCalc(n))saved++;}",
  'bulk ordinary calculation stale invalidation'
);
replaceOnce(
  "try{if(bulkCalcInputValid(11)){runHydraulicChain();if(lastRes[11]){executed++;if(replaceBulkCalc(11))saved++;}}else skipped++;}catch(e){skipped++;}",
  "try{if(bulkCalcInputValid(11)){runCalcStamped(11,runHydraulicChain);if(lastRes[11]){executed++;if(replaceBulkCalc(11))saved++;}else skipped++;}else skipped++;}catch(e){skipped++;}",
  'bulk hydraulic chain stale invalidation'
);
replaceOnce(
  "try{if(bulkCalcInputValid(12)&&runCriticalPath()){executed++;if(replaceBulkCalc(12))saved++;}else skipped++;}catch(e){skipped++;}",
  "try{if(bulkCalcInputValid(12)&&runCalcStamped(12,runCriticalPath)&&lastRes[12]){executed++;if(replaceBulkCalc(12))saved++;}else skipped++;}catch(e){skipped++;}",
  'bulk selected path stale invalidation'
);
replaceOnce(
  "try{if(bulkCalcInputValid(13)&&runParkingVentAudit()){executed++;if(replaceBulkCalc(13))saved++;}else skipped++;}catch(e){skipped++;}",
  "try{if(bulkCalcInputValid(13)&&runCalcStamped(13,runParkingVentAudit)&&lastRes[13]){executed++;if(replaceBulkCalc(13))saved++;}else skipped++;}catch(e){skipped++;}",
  'bulk parking audit stale invalidation'
);

if(androidHtml.includes("   runCalc(n);\n   if(lastRes[n])") ||
   !androidHtml.includes("runCalcStamped(n,()=>runCalc(n))") ||
   !androidHtml.includes("runCalcStamped(11,runHydraulicChain)") ||
   !androidHtml.includes("runCalcStamped(12,runCriticalPath)") ||
   !androidHtml.includes("runCalcStamped(13,runParkingVentAudit)") ||
   !androidHtml.includes("if(mode==='mfr')return pos('c10MfrComb')&&pos('c10MfrHeat')")){
  throw new Error('Android bulk calculation stale guard missing');
}



/* FEP-ANDROID-CALC-INPUT-VALIDATION-v1\n   Input validation consistency only; no engineering formula changes. */
replaceOnce(
  "if(n===4)return pos('c4P');",
  "if(n===4){const k=$('c4K')?.value==='c'?x('c4Kc'):parseFloat($('c4K')?.value);return pos('c4P')&&Number.isFinite(k)&&k>0;}",
  "bulk nozzle K validation"
);
replaceOnce(
  "if(n===6)return pos('c6Q')&&pos('c6L')&&Number.isFinite(x('c6C'))&&x('c6C')>=50&&x('c6C')<=180;",
  "if(n===6)return pos('c6Q')&&pos('c6L')&&Number.isFinite(x('c6C'))&&x('c6C')>=50&&x('c6C')<=180&&['c6Elb','c6Tee','c6Chk','c6Gate'].every(nonneg);",
  "bulk Hazen fitting validation"
);
replaceOnce(
  "if(n===11)return pos('hcQ')&&pos('hcK')&&Number.isFinite(x('hcBranches'))&&x('hcBranches')>=1;",
  "if(n===11)return pos('hcQ')&&pos('hcK')&&Number.isFinite(x('hcBranches'))&&x('hcBranches')>=1&&nonneg('hcMinP')&&nonneg('hcFriction')&&Number.isFinite(x('hcElev'))&&nonneg('hcFittings')&&nonneg('hcMargin')&&x('hcMargin')<=100;",
  "bulk hydraulic-chain validation completeness"
);
if(!androidHtml.includes("Number.isFinite(k)&&k>0") || !androidHtml.includes("['c6Elb','c6Tee','c6Chk','c6Gate'].every(nonneg)") || !androidHtml.includes("nonneg('hcMinP')&&nonneg('hcFriction')")){throw new Error('Android bulk calculator validation hardening missing');}

replaceOnce(
  "const minP=n('hcMinP'), friction=n('hcFriction'), elev=n('hcElev'), fittings=n('hcFittings'), margin=n('hcMargin');\nconst rhoWater=1000, g=9.80665;",
  "const minP=n('hcMinP'), friction=n('hcFriction'), elev=n('hcElev'), fittings=n('hcFittings'), margin=n('hcMargin');\nconst raw=id=>parseFloat($(id)?.value),inputIssues=[];\nif(!Number.isFinite(raw('hcQ'))||raw('hcQ')<=0)inputIssues.push('دبی تقاضا باید بیشتر از صفر باشد.');\nif(!Number.isFinite(raw('hcK'))||raw('hcK')<=0)inputIssues.push('K-factor باید بیشتر از صفر باشد.');\nif(!Number.isFinite(raw('hcBranches'))||raw('hcBranches')<1)inputIssues.push('تعداد شاخه‌ها باید حداقل یک باشد.');\nif(!Number.isFinite(raw('hcMinP'))||raw('hcMinP')<0||!Number.isFinite(raw('hcFriction'))||raw('hcFriction')<0||!Number.isFinite(raw('hcFittings'))||raw('hcFittings')<0)inputIssues.push('فشار حداقل و افت‌های ورودی نمی‌توانند منفی یا نامعتبر باشند.');\nif(!Number.isFinite(raw('hcElev')))inputIssues.push('اختلاف ارتفاع نامعتبر است.');\nif(!Number.isFinite(raw('hcMargin'))||raw('hcMargin')<0||raw('hcMargin')>100)inputIssues.push('حاشیه طراحی باید بین ۰ تا ۱۰۰ درصد باشد.');\nif(inputIssues.length){lastRes[11]=null;const box=$('hydChainRes');if(box){box.innerHTML='<div class=\"warnBadge\">'+inputIssues.join('<br>')+'</div>';box.classList.add('show');}return false;}\nconst rhoWater=1000, g=9.80665;",
  'hydraulic-chain invalid-input early return'
);
if(!androidHtml.includes("if(inputIssues.length){lastRes[11]=null") || !androidHtml.includes("raw('hcK')<=0")){throw new Error('Android hydraulic-chain early validation missing');}

/* FEP-ANDROID-M3-TRAVEL-DISTANCE-v1
   Correct Mبحث 3 table 3-6-3-2-1 maximum travel-distance mapping.
   Android-only: stable web index.html remains unchanged. */
replaceOnce(
  "const NC_TRAVEL={office:{no:30,yes:23,label:'اداری/حرفه‌ای'},educational:{no:30,yes:23,label:'آموزشی/فرهنگی'},assembly:{no:23,yes:23,label:'تجمعی'},residential:{no:23,yes:23,label:'مسکونی'},health1:{no:60,yes:75,label:'درمانی/مراقبتی د-۱'},industrial1:{no:60,yes:75,label:'صنعتی ص-۱'},industrial2:{no:90,yes:120,label:'صنعتی ص-۲'},other:{no:90,yes:120,label:'متفرقه'}};",
  "const NC_TRAVEL={office:{no:60,yes:90,label:'اداری/حرفه‌ای'},educational:{no:60,yes:75,label:'آموزشی/فرهنگی'},assembly:{no:60,yes:75,label:'تجمعی'},residential:{no:60,yes:75,label:'مسکونی'},health1:{no:60,yes:75,label:'درمانی/مراقبتی د-۱'},industrial1:{no:60,yes:75,label:'صنعتی ص-۱'},industrial2:{no:90,yes:120,label:'صنعتی ص-۲'},other:{no:90,yes:120,label:'متفرقه'}};",
  "M3 maximum travel-distance table mapping"
);
if(!androidHtml.includes("office:{no:60,yes:90,label:'اداری/حرفه‌ای'}") ||
   !androidHtml.includes("educational:{no:60,yes:75,label:'آموزشی/فرهنگی'}") ||
   !androidHtml.includes("assembly:{no:60,yes:75,label:'تجمعی'}") ||
   !androidHtml.includes("residential:{no:60,yes:75,label:'مسکونی'}")){
  throw new Error('Android M3 travel-distance correction missing');
}

/* FEP-ANDROID-M3-HIGHRISE-EMERGENCY-POWER-v1
   Mبحث 3 high-rise emergency power belongs to 3-10-4-4 (printed page 187).
   Keep 3-11-2-9 in the standards bank for deep buildings; only smart-rule scoping is corrected. */
replaceOnce(
  "{id:'m3-emergency-power',title:'بارهای برق اضطراری تجهیزات ایمنی حریق کنترل شود',src:'مبحث ۳',ref:'3-11-2-9 / صفحه 196',scope:'smart',when:d=>hasOcc(d,'highrise')||getBuildingTypes().includes('highrise'),why:'به‌علت بلندمرتبه بودن پروژه این کنترل فعال شده است.'},",
  "{id:'m3-emergency-power',title:'بارهای برق اضطراری تجهیزات ایمنی حریق کنترل شود',src:'مبحث ۳',ref:'3-10-4-4 / صفحه 187',scope:'smart',when:d=>hasOcc(d,'highrise')||getBuildingTypes().includes('highrise'),why:'به‌علت بلندمرتبه بودن پروژه این کنترل فعال شده است.'},",
  "M3 high-rise emergency-power smart reference"
);
replaceOnce(
  "{t:'برق اضطراری تجهیزات ایمنی',ref:'مبحث ۳ (3-11-2-9)',on:has('highrise')||has('hospital'),why:'فهرست بارهای اضطراری بند 3-11-2-9 کنترل شود.'},",
  "{t:'برق اضطراری تجهیزات ایمنی',ref:'مبحث ۳ (3-10-4-4)',on:has('highrise'),why:'بارهای برق اضطراری ساختمان بلندمرتبه مطابق بند 3-10-4-4 کنترل شود.'},",
  "M3 high-rise emergency-power rule-engine reference"
);
if(!androidHtml.includes("ref:'3-10-4-4 / صفحه 187'") ||
   !androidHtml.includes("ref:'مبحث ۳ (3-10-4-4)',on:has('highrise')") ||
   androidHtml.includes("ref:'مبحث ۳ (3-11-2-9)',on:has('highrise')||has('hospital')")){
  throw new Error('Android M3 high-rise emergency-power scope/reference correction missing');
}

/* FEP-ANDROID-M3-CORRIDOR-EXCEPTIONS-v1
   Mبحث 3 clause 3-6-3-2-5 has a 1.10 m general corridor width plus explicit exceptions.
   With width-only input, values below 1.10 m cannot be classified conclusively. */
replaceOnce(
  "function createNcrFromNumeric(r){",
  "function ncReviewMsg(el,title,detail,ref,data){\n if(!el)return;\n const d=D();d.numericResults=d.numericResults||{};\n if(data){d.numericResults[data.type]={...data,title,detail,ref,ok:null,review:true,ts:Date.now()};saveAll();}\n el.classList.remove('pass','fail');el.classList.add('ncResult');\n const sourceLink=numericSourceHtml(data?.type||'',ref,title);\n el.innerHTML='<b>⚠️ '+esc(title)+'</b><br>'+esc(detail)+'<div style=\"margin-top:8px\">'+sourceLink+'</div><div class=\"syncBadge\">نیازمند تعیین شرایط استثناء؛ NCR خودکار ایجاد نشد</div>';\n el.querySelectorAll('[data-numeric-source]').forEach(b=>b.onclick=e=>{e.stopPropagation();openNumericSourceEvidence(b.dataset.numericSource,b.dataset.numericTitle,b.dataset.numericRef);});\n renderRegChecklist();\n}\nfunction createNcrFromNumeric(r){",
  'numeric regulatory review-state helper'
);
replaceOnce(
  "if(c!=null)ncMsg($('ncCorridorOut'),c>=1.10,'کنترل حداقل عرض کریدور',`عرض واقعی ${c.toFixed(2)} m — حداقل عمومی بیان‌شده در بند: 1.10 m.`,'3-6-3-2-5',{type:'corridor',actual:c.toFixed(2)+' m',limit:'1.10 m',systemHint:'راه خروج'});",
  "if(c!=null){const data={type:'corridor',actual:c.toFixed(2)+' m',limit:'1.10 m عمومی؛ استثنائات بند 3-6-3-2-5',systemHint:'راه خروج'};const cText=c.toFixed(2);if(c>=1.10)ncMsg($('ncCorridorOut'),true,'کنترل حداقل عرض کریدور','عرض واقعی '+cText+' m — حداقل عمومی بند 3-6-3-2-5 برابر 1.10 m است.','3-6-3-2-5',data);else ncReviewMsg($('ncCorridorOut'),'کنترل عرض کریدور','عرض واقعی '+cText+' m از حد عمومی 1.10 m کمتر است، اما بند 3-6-3-2-5 برای برخی شرایط مقادیر 0.60 m، 0.90 m، 1.80 m، 2.40 m و 2.45 m را مقرر کرده است. چون این فرم نوع کریدور، بار تصرف و شرایط استثناء را دریافت نمی‌کند، نتیجه قطعی صادر نمی‌شود.','3-6-3-2-5',data);}",
  'M3 corridor exception-aware numeric result'
);
replaceOnce(
  "numericResults.map(r=>'<tr><td>'+esc(r.title||'—')+'</td><td>'+esc(r.actual||'—')+'</td><td>'+esc(r.limit||'—')+'</td><td><b style=\"color:'+(r.ok?'#166534':'#991b1b')+'\">'+(r.ok?'تأیید شد':'عدم انطباق')+'</b></td><td>'+esc(r.ref||'—')+'</td></tr>').join('')",
  "numericResults.map(r=>'<tr><td>'+esc(r.title||'—')+'</td><td>'+esc(r.actual||'—')+'</td><td>'+esc(r.limit||'—')+'</td><td><b style=\"color:'+(r.ok===true?'#166534':r.ok===false?'#991b1b':'#92400e')+'\">'+(r.ok===true?'تأیید شد':r.ok===false?'عدم انطباق':'نیازمند بررسی')+'</b></td><td>'+esc(r.ref||'—')+'</td></tr>').join('')",
  'tri-state numeric result in final report'
);
if(!androidHtml.includes('function ncReviewMsg(') ||
   !androidHtml.includes('نیازمند تعیین شرایط استثناء؛ NCR خودکار ایجاد نشد') ||
   !androidHtml.includes('استثنائات بند 3-6-3-2-5') ||
   !androidHtml.includes("r.ok===true?'تأیید شد':r.ok===false?'عدم انطباق':'نیازمند بررسی'")){
  throw new Error('Android M3 corridor exception-aware review state missing');
}

/* FEP-ANDROID-M3-FIRE-ACCESS-v1
   Correct Mبحث 3 table 3-12-2 road-width/distance mapping.
   Distance beyond the table triggers clause 3-12-3 review instead of an automatic NCR. */
replaceOnce(
  "const fh=ncNum('ncFireH'),fr=ncNum('ncFireRoad'),fd=ncNum('ncFireDist');\n if(fh!=null&&fr!=null&&fd!=null){\n   let reqRoad,maxDist;if(fh<=15){reqRoad=6;maxDist=8;}else if(fh<=25){reqRoad=8;maxDist=12.5;}else if(fh<=35){reqRoad=10;maxDist=14.5;}else{reqRoad=12;maxDist=null;}\n   const ok=fr>=reqRoad&&(maxDist==null||fd<=maxDist);\n   const detail=`ارتفاع ${fh.toFixed(2)} m → حداقل عرض معبر ${reqRoad} m؛ عرض موجود ${fr.toFixed(2)} m. ${maxDist==null?'برای ارتفاع بیش از 35 m، شرط فاصله جدول در این حالت محدودیت عددی نمایش‌داده‌شده ندارد.':`حداکثر فاصله حاشیه معبر ${maxDist} m؛ مقدار موجود ${fd.toFixed(2)} m.`}`;\n   ncMsg($('ncFireOut'),ok,'کنترل اولیه دسترسی خودروی آتش‌نشانی',detail,'جدول 3-12-2',{type:'fire-access',actual:`عرض ${fr.toFixed(2)} m / فاصله ${fd.toFixed(2)} m`,limit:`عرض ${reqRoad} m${maxDist==null?'':` / فاصله ≤ ${maxDist} m`}`,systemHint:'دسترسی آتش نشانی'});\n }",
  "const fh=ncNum('ncFireH'),fr=ncNum('ncFireRoad'),fd=ncNum('ncFireDist');\n if(fh!=null&&fr!=null&&fd!=null){\n   let reqRoad,maxDist;if(fh<=15){reqRoad=6;maxDist=12.5;}else if(fh<=25){reqRoad=8;maxDist=12.5;}else if(fh<=35){reqRoad=10;maxDist=14.5;}else{reqRoad=12;maxDist=14.5;}\n   const widthOk=fr>=reqRoad,distOk=fd<=maxDist;\n   const data={type:'fire-access',actual:'عرض '+fr.toFixed(2)+' m / فاصله '+fd.toFixed(2)+' m',limit:'عرض '+reqRoad+' m / فاصله ≤ '+maxDist+' m',systemHint:'دسترسی آتش نشانی'};\n   if(!widthOk){\n     ncMsg($('ncFireOut'),false,'کنترل اولیه دسترسی خودروی آتش‌نشانی','ارتفاع '+fh.toFixed(2)+' m → حداقل عرض معبر جدول '+reqRoad+' m است؛ عرض موجود '+fr.toFixed(2)+' m. حداکثر فاصله حاشیه معبر تا ساختمان در این رده '+maxDist+' m است.','جدول 3-12-2',data);\n   }else if(distOk){\n     ncMsg($('ncFireOut'),true,'کنترل اولیه دسترسی خودروی آتش‌نشانی','ارتفاع '+fh.toFixed(2)+' m → حداقل عرض معبر '+reqRoad+' m و حداکثر فاصله حاشیه معبر تا ساختمان '+maxDist+' m است؛ عرض موجود '+fr.toFixed(2)+' m و فاصله موجود '+fd.toFixed(2)+' m.','جدول 3-12-2',data);\n   }else{\n     ncReviewMsg($('ncFireOut'),'کنترل دسترسی خودروی آتش‌نشانی','عرض معبر '+fr.toFixed(2)+' m حداقل جدول را تأمین می‌کند، اما فاصله '+fd.toFixed(2)+' m از حداکثر '+maxDist+' m جدول بیشتر است. مطابق بند 3-12-3 باید امکان ورود و استقرار خودروی آتش‌نشانی داخل مجموعه و شرایط همان بند بررسی شود؛ چون این فرم آن اطلاعات را دریافت نمی‌کند، نتیجه قطعی صادر نمی‌شود.','جدول 3-12-2 و بند 3-12-3',data);\n   }\n }",
  'M3 fire-apparatus access table and review path'
);
if(!androidHtml.includes('if(fh<=15){reqRoad=6;maxDist=12.5;}') ||
   !androidHtml.includes('else{reqRoad=12;maxDist=14.5;}') ||
   !androidHtml.includes("ncReviewMsg($('ncFireOut')") ||
   androidHtml.includes('reqRoad=6;maxDist=8') ||
   androidHtml.includes('reqRoad=12;maxDist=null')){
  throw new Error('Android M3 fire-apparatus access correction missing');
}

/* FEP-ANDROID-M3-FIRE-SEPARATION-PAGE-v1
   Correct printed-page citation for clause 3-8-7-3: page 161 in the project Mبحث 3 reference PDF. */
replaceOnce(
  "ref:'3-8-7-3 / صفحه 162'",
  "ref:'3-8-7-3 / صفحه 161'",
  'M3 fire-separation smart-check page citation'
);
replaceOnce(
  "{ch:'3-8-7-3',title:'درجه مقاومت دیوار جداکننده آتش',kind:'الزام',ref:'3-8-7-3',page:'162'",
  "{ch:'3-8-7-3',title:'درجه مقاومت دیوار جداکننده آتش',kind:'الزام',ref:'3-8-7-3',page:'161'",
  'M3 fire-separation standards-bank page'
);
replaceOnce(
  "source:'مبحث ۳، بند 3-8-7-3، صفحه چاپی 162'",
  "source:'مبحث ۳، بند 3-8-7-3، صفحه چاپی 161'",
  'M3 fire-separation source page'
);
if(!androidHtml.includes("ref:'3-8-7-3 / صفحه 161'") ||
   !androidHtml.includes("ref:'3-8-7-3',page:'161'") ||
   androidHtml.includes("ref:'3-8-7-3 / صفحه 162'")){
  throw new Error('Android M3 fire-separation page citation correction missing');
}

/* FEP-ANDROID-M15-UNKNOWN-NOT-NCR-v1
   Unknown/unstated inspection data is not evidence of noncompliance.
   Keep M15-2-7-6 requirements unchanged; reserve NCR for explicit 'no' or measured exceedance. */
replaceOnce(
  "if(n.workflowStatus==='closed'){\n   d.elevatorVerification[key]={ncrId:n.id,result:status==='bad'?'bad':'ok',ts:Date.now()};\n }",
  "if(n.workflowStatus==='closed'&&(status==='bad'||status==='ok')){\n   d.elevatorVerification[key]={ncrId:n.id,result:status,ts:Date.now()};\n }",
  'elevator closed-NCR verification only on definite results'
);
replaceOnce(
  " ].forEach(x=>{const v=elevatorVal(x[0]);if(v)add(v==='yes'?'ok':'bad',x[1],v==='yes'?'تأمین شده است.':'تأمین نشده است.','مبحث ۱۵، 15-2-7-6');else add('bad',x[1],'ساختمان مشمول اعلام حریق ثبت شده ولی وضعیت این کنترل مشخص نشده است.','مبحث ۱۵، 15-2-7-6');});",
  " ].forEach(x=>{const v=elevatorVal(x[0]);if(v==='yes')add('ok',x[1],'تأمین شده است.','مبحث ۱۵، 15-2-7-6');else if(v==='no')add('bad',x[1],'تأمین نشده است.','مبحث ۱۵، 15-2-7-6');else add('info',x[1],'وضعیت این کنترل هنوز مشخص نشده است؛ برای نتیجه قطعی باید در بازدید/مدارک پروژه تعیین شود.','مبحث ۱۵، 15-2-7-6');});",
  'M15 fire-alarm unknown finding tri-state'
);
replaceOnce(
  " else add('bad','فاصله حسگر از مرکز بازشوی آسانسور','ساختمان مشمول اعلام حریق است ولی فاصله حسگر ثبت نشده است.','مبحث ۱۵، 15-2-7-6');",
  " else add('info','فاصله حسگر از مرکز بازشوی آسانسور','فاصله حسگر هنوز ثبت نشده است؛ بند 15-2-7-6 حداکثر فاصله افقی 1.5 m را مقرر می‌کند و برای نتیجه قطعی باید مقدار واقعی ثبت شود.','مبحث ۱۵، 15-2-7-6');",
  'M15 detector-distance unknown finding tri-state'
);
if(!androidHtml.includes("else add('info',x[1],'وضعیت این کنترل هنوز مشخص نشده است") ||
   !androidHtml.includes("else add('info','فاصله حسگر از مرکز بازشوی آسانسور'") ||
   !androidHtml.includes("status==='bad'||status==='ok'") ||
   androidHtml.includes("else add('bad',x[1],'ساختمان مشمول اعلام حریق ثبت شده ولی وضعیت این کنترل مشخص نشده است.")){
  throw new Error('Android M15 unknown-vs-noncompliance correction missing');
}

/* FEP-ANDROID-M15-STRETCHER-COMPLETENESS-v1
   Mبحث 15: clause 15-2-1-4 requires visible identification and service to all floors;
   clause 15-2-1-10 contains the stretcher-car dimensional/operational requirements. */
replaceOnce("'elCabW','elCabD','elDoorW','elRelevel','elDoorHold','elFireCap','elAllFloors','elFireKey',","'elCabW','elCabD','elDoorW','elRelevel','elDoorHold','elStretcherSign','elStretcherAllFloors','elFireCap','elAllFloors','elFireKey',",'M15 stretcher persisted fields');
replaceOnce("<div class=\"formRow\">\n <div class=\"field\"><label>تراز مجدد طبقه</label><select id=\"elRelevel\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n <div class=\"field\"><label>امکان بازماندن طولانی‌تر در</label><select id=\"elDoorHold\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n</div>\n</div>\n<div class=\"card\">\n<h3> آسانسور دسترسی آتش‌نشانی</h3>","<div class=\"formRow\">\n <div class=\"field\"><label>تراز مجدد طبقه</label><select id=\"elRelevel\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n <div class=\"field\"><label>امکان بازماندن طولانی‌تر در</label><select id=\"elDoorHold\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n</div>\n<div class=\"formRow\">\n <div class=\"field\"><label>علامت مخصوص قابل رؤیت برانکاردبر</label><select id=\"elStretcherSign\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n <div class=\"field\"><label>برانکاردبر به همه طبقات سرویس می‌دهد</label><select id=\"elStretcherAllFloors\"><option value=\"\">نامشخص</option><option value=\"yes\">بله</option><option value=\"no\">خیر</option></select></div>\n</div>\n</div>\n<div class=\"card\">\n<h3> آسانسور دسترسی آتش‌نشانی</h3>",'M15 stretcher visible-sign and all-floor inputs');
replaceOnce("if(stretcher>=1){\n     const cw=elevatorVal('elCabW'),cd=elevatorVal('elCabD'),dw=elevatorVal('elDoorW');","if(stretcher>=1){\n     [['elStretcherSign','علامت مخصوص قابل رؤیت برانکاردبر'],['elStretcherAllFloors','سرویس برانکاردبر به همه طبقات']].forEach(x=>{const v=elevatorVal(x[0]);if(v==='yes')add('ok',x[1],'تأمین شده است.','مبحث ۱۵، 15-2-1-4');else if(v==='no')add('bad',x[1],'تأمین نشده است.','مبحث ۱۵، 15-2-1-4');else add('info',x[1],'وضعیت این الزام هنوز مشخص نشده است.','مبحث ۱۵، 15-2-1-4');});\n     const cw=elevatorVal('elCabW'),cd=elevatorVal('elCabD'),dw=elevatorVal('elDoorW');",'M15 stretcher clause 15-2-1-4 checks');
replaceOnce("if(cw!=null&&cd!=null)add(cw>=1100&&cd>=2100?'ok':'bad','ابعاد کابین برانکاردبر','ابعاد ثبت‌شده '+cw+' × '+cd+' mm؛ حداقل کنترل نمونه 1100 × 2100 mm.','مبحث ۱۵، الزامات آسانسور برانکاردبر');","if(cw!=null&&cd!=null)add(cw>=1100&&cd>=2100?'ok':'bad','ابعاد کابین برانکاردبر','ابعاد ثبت‌شده '+cw+' × '+cd+' mm؛ حداقل 1100 × 2100 mm.','مبحث ۱۵، 15-2-1-10');",'M15 stretcher cabin exact reference');
replaceOnce("if(dw!=null)add(dw>=900?'ok':'bad','عرض بازشوی در برانکاردبر','عرض ثبت‌شده '+dw+' mm؛ حداقل کنترل نمونه 900 mm.','مبحث ۱۵، الزامات آسانسور برانکاردبر');","if(dw!=null)add(dw>=900?'ok':'bad','عرض بازشوی در برانکاردبر','عرض ثبت‌شده '+dw+' mm؛ حداقل 900 mm.','مبحث ۱۵، 15-2-1-10');",'M15 stretcher door exact reference');
replaceOnce("[['elRelevel','تراز مجدد طبقه'],['elDoorHold','بازماندن طولانی‌تر در']].forEach(x=>{const v=elevatorVal(x[0]);if(v)add(v==='yes'?'ok':'bad',x[1],v==='yes'?'تأمین شده است.':'تأمین نشده است.','مبحث ۱۵، الزامات آسانسور برانکاردبر');});","[['elRelevel','تراز مجدد طبقه'],['elDoorHold','بازماندن طولانی‌تر در']].forEach(x=>{const v=elevatorVal(x[0]);if(v)add(v==='yes'?'ok':'bad',x[1],v==='yes'?'تأمین شده است.':'تأمین نشده است.','مبحث ۱۵، 15-2-1-10');});",'M15 stretcher operational exact reference');
if(!androidHtml.includes('id="elStretcherSign"') ||
   !androidHtml.includes('id="elStretcherAllFloors"') ||
   !androidHtml.includes("'elStretcherSign','elStretcherAllFloors'") ||
   !androidHtml.includes("'مبحث ۱۵، 15-2-1-10'")){
  throw new Error('Android M15 stretcher completeness patch missing');
}

/* FEP-ANDROID-M15-HOSPITAL-BED-ELEVATOR-v1
   Mبحث 15 clauses 15-2-1-6 and 15-2-1-11.
   Hospital >1 floor: at least one bed elevator unless a suitable ramp exists; unknown data remains non-conclusive. */
replaceOnce("'elCabW','elCabD','elDoorW','elRelevel','elDoorHold','elStretcherSign','elStretcherAllFloors','elFireCap','elAllFloors','elFireKey',","'elCabW','elCabD','elDoorW','elRelevel','elDoorHold','elStretcherSign','elStretcherAllFloors','elHospitalRamp','elBedCount','elBedCabW','elBedCabD','elBedDoorW','elBedDoorH','elBedVVVF','elBedRelevel','elBedDoorHold','elBedKey','elBedEmergencyPower','elFireCap','elAllFloors','elFireKey',",'M15 hospital bed-elevator persisted fields');
replaceOnce("</div>\n</div>\n<div class=\"card\">\n<h3> آسانسور دسترسی آتش‌نشانی</h3>\n<div class=\"formRow\">\n <div class=\"field\"><label>ظرفیت حداقل 1000 kg / 13 نفر</label><select id=\"elFireCap\">","</div>\n</div>\n<div class=\"card\">\n<h3> آسانسور تخت‌بر بیمارستان</h3>\n<div class=\"sub\" style=\"margin-bottom:10px\">کنترل بندهای 15-2-1-6 و 15-2-1-11؛ برای بیمارستان بیش از یک طبقه، وجود حداقل یک تخت‌بر الزامی است مگر سطح شیبدار مناسب وجود داشته باشد.</div>\n<div class=\"formRow\">\n <div class=\"field\"><label>سطح شیبدار مناسب بین طبقات وجود دارد؟</label><select id=\"elHospitalRamp\"><option value=\"\">نامشخص</option><option value=\"yes\">بله</option><option value=\"no\">خیر</option></select></div>\n <div class=\"field\"><label>تعداد آسانسور تخت‌بر</label><input id=\"elBedCount\" type=\"number\" min=\"0\" step=\"1\" value=\"0\"></div>\n</div>\n<div class=\"formRow\">\n <div class=\"field\"><label>عرض مفید کابین تخت‌بر (mm)</label><input id=\"elBedCabW\" type=\"number\" placeholder=\"1400\"></div>\n <div class=\"field\"><label>عمق مفید کابین تخت‌بر (mm)</label><input id=\"elBedCabD\" type=\"number\" placeholder=\"2400\"></div>\n <div class=\"field\"><label>عرض بازشوی در تخت‌بر (mm)</label><input id=\"elBedDoorW\" type=\"number\" placeholder=\"1300\"></div>\n <div class=\"field\"><label>ارتفاع بازشوی در تخت‌بر (mm)</label><input id=\"elBedDoorH\" type=\"number\" placeholder=\"2100\"></div>\n</div>\n<div class=\"formRow\">\n <div class=\"field\"><label>کنترل سرعت ولتاژ/فرکانس متغیر (VVVF)</label><select id=\"elBedVVVF\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n <div class=\"field\"><label>تراز مجدد طبقه</label><select id=\"elBedRelevel\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n <div class=\"field\"><label>بازماندن طولانی‌تر در</label><select id=\"elBedDoorHold\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n</div>\n<div class=\"formRow\">\n <div class=\"field\"><label>کلید مخصوص کاربران آموزش‌دیده</label><select id=\"elBedKey\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n <div class=\"field\"><label>برق اضطراری با هدایت به نزدیک‌ترین طبقه</label><select id=\"elBedEmergencyPower\"><option value=\"\">نامشخص</option><option value=\"yes\">تأمین است</option><option value=\"no\">تأمین نیست</option></select></div>\n</div>\n</div>\n<div class=\"card\">\n<h3> آسانسور دسترسی آتش‌نشانی</h3>\n<div class=\"formRow\">\n <div class=\"field\"><label>ظرفیت حداقل 1000 kg / 13 نفر</label><select id=\"elFireCap\">",'M15 hospital bed-elevator UI card');
replaceOnce("const stretcher=elevatorVal('elStretcherCount')??0,fire=elevatorVal('elFireCount')??0,maxDist=elevatorVal('elMaxDist'),shafts=elevatorVal('elShaftCount');","const stretcher=elevatorVal('elStretcherCount')??0,bed=elevatorVal('elBedCount')??0,fire=elevatorVal('elFireCount')??0,maxDist=elevatorVal('elMaxDist'),shafts=elevatorVal('elShaftCount');",'M15 bed-elevator count binding');
replaceOnce(" }\n if(maxDist!=null)add(maxDist<=40?'ok':'bad','فاصله دسترسی تا آسانسور','بیشترین فاصله ثبت‌شده '+maxDist+' m؛ حداکثر 40 m.','مبحث ۱۵، 15-2-2-1-1');"," }\n\n const hospitalProject=getBuildingTypes().includes('hospital')||hasOcc(D(),'hospital');\n if(hospitalProject){\n   if(floors==null){\n     add('info','الزام تخت‌بر بیمارستان','پروژه بیمارستانی است، اما تعداد طبقات در فرم آسانسور مشخص نشده است؛ برای تعیین شمول بند 15-2-1-6 تعداد طبقات را ثبت کنید.','مبحث ۱۵، 15-2-1-6');\n   }else if(floors>1){\n     const ramp=elevatorVal('elHospitalRamp');\n     if(bed>=1){\n       add('ok','حداقل یک آسانسور تخت‌بر بیمارستان','برای بیمارستان بیش از یک طبقه، حداقل یک تخت‌بر ثبت شده است.','مبحث ۱۵، 15-2-1-6');\n     }else if(ramp==='yes'){\n       add('info','استثناء سطح شیبدار بیمارستان','طبق ورودی پروژه سطح شیبدار مناسب وجود دارد؛ استثناء بند 15-2-1-6 اعمال شده و الزام تعداد تخت‌بر از این بند فعال نشد.','مبحث ۱۵، 15-2-1-6');\n     }else if(ramp==='no'){\n       add('bad','حداقل یک آسانسور تخت‌بر بیمارستان','بیمارستان بیش از یک طبقه است و سطح شیبدار مناسب ندارد؛ حداقل یک آسانسور تخت‌بر لازم است.','مبحث ۱۵، 15-2-1-6');\n     }else{\n       add('info','الزام تخت‌بر بیمارستان','بیمارستان بیش از یک طبقه است و تخت‌بر ثبت نشده؛ وضعیت سطح شیبدار مناسب هنوز مشخص نیست، بنابراین نتیجه قطعی صادر نمی‌شود.','مبحث ۱۵، 15-2-1-6');\n     }\n     if(bed>=1){\n       const bw=elevatorVal('elBedCabW'),bd=elevatorVal('elBedCabD'),bdw=elevatorVal('elBedDoorW'),bdh=elevatorVal('elBedDoorH');\n       if(bw!=null||bd!=null){\n         if(bw!=null&&bd!=null)add(bw>=1400&&bd>=2400?'ok':'bad','ابعاد کابین تخت‌بر','ابعاد ثبت‌شده '+bw+' × '+bd+' mm؛ حداقل 1400 × 2400 mm.','مبحث ۱۵، 15-2-1-11');\n         else add('info','ابعاد کابین تخت‌بر','برای نتیجه قطعی باید هر دو بعد مفید کابین ثبت شوند.','مبحث ۱۵، 15-2-1-11');\n       }else add('info','ابعاد کابین تخت‌بر','ابعاد کابین تخت‌بر هنوز ثبت نشده است.','مبحث ۱۵، 15-2-1-11');\n       if(bdw!=null||bdh!=null){\n         if(bdw!=null&&bdh!=null)add(bdw>=1300&&bdh>=2100?'ok':'bad','ابعاد بازشوی در تخت‌بر','عرض/ارتفاع ثبت‌شده '+bdw+' × '+bdh+' mm؛ حداقل 1300 × 2100 mm.','مبحث ۱۵، 15-2-1-11');\n         else add('info','ابعاد بازشوی در تخت‌بر','برای نتیجه قطعی باید عرض و ارتفاع بازشوی در ثبت شوند.','مبحث ۱۵، 15-2-1-11');\n       }else add('info','ابعاد بازشوی در تخت‌بر','ابعاد بازشوی در تخت‌بر هنوز ثبت نشده است.','مبحث ۱۵، 15-2-1-11');\n       [\n        ['elBedVVVF','سیستم کنترل سرعت ولتاژ و فرکانس متغیر'],\n        ['elBedRelevel','تراز مجدد طبقه تخت‌بر'],\n        ['elBedDoorHold','بازماندن طولانی‌تر در تخت‌بر'],\n        ['elBedKey','کلید مخصوص کاربران آموزش‌دیده'],\n        ['elBedEmergencyPower','برق اضطراری و هدایت به نزدیک‌ترین طبقه']\n       ].forEach(x=>{const v=elevatorVal(x[0]);if(v==='yes')add('ok',x[1],'تأمین شده است.','مبحث ۱۵، 15-2-1-11');else if(v==='no')add('bad',x[1],'تأمین نشده است.','مبحث ۱۵، 15-2-1-11');else add('info',x[1],'وضعیت این الزام هنوز مشخص نشده است.','مبحث ۱۵، 15-2-1-11');});\n     }\n   }else{\n     add('info','آستانه تخت‌بر بیمارستان','تعداد طبقات ثبت‌شده بیش از یک طبقه نیست؛ الزام خاص بند 15-2-1-6 از این ورودی فعال نشد.','مبحث ۱۵، 15-2-1-6');\n   }\n }\n if(maxDist!=null)add(maxDist<=40?'ok':'bad','فاصله دسترسی تا آسانسور','بیشترین فاصله ثبت‌شده '+maxDist+' m؛ حداکثر 40 m.','مبحث ۱۵، 15-2-2-1-1');",'M15 hospital bed-elevator applicability and specification checks');
replaceOnce("if($('elStretcherCount'))$('elStretcherCount').value='0';if($('elFireCount'))$('elFireCount').value='0';","if($('elStretcherCount'))$('elStretcherCount').value='0';if($('elBedCount'))$('elBedCount').value='0';if($('elFireCount'))$('elFireCount').value='0';",'M15 bed-elevator clear reset');
replaceOnce("این دکمه تمام پنج بخش بالا را یکجا بررسی می‌کند.","این دکمه تمام بخش‌های بالا را یکجا بررسی می‌کند.",'elevator final-check scope wording');
if(!androidHtml.includes('id="elBedCount"') ||
   !androidHtml.includes('id="elHospitalRamp"') ||
   !androidHtml.includes("getBuildingTypes().includes('hospital')||hasOcc(D(),'hospital')") ||
   !androidHtml.includes("'مبحث ۱۵، 15-2-1-11'")){
  throw new Error('Android M15 hospital bed-elevator patch missing');
}

/* FEP-ANDROID-M15-GENERAL-EMERGENCY-POWER-v1
   Mبحث 15 clause 15-2-8 (printed page 38).
   Applicability is user/project-reference driven; unknown applicability remains non-conclusive. */
replaceOnce("'elCabW','elCabD','elDoorW','elRelevel','elDoorHold','elStretcherSign','elStretcherAllFloors','elHospitalRamp','elBedCount','elBedCabW','elBedCabD','elBedDoorW','elBedDoorH','elBedVVVF','elBedRelevel','elBedDoorHold','elBedKey','elBedEmergencyPower','elFireCap','elAllFloors','elFireKey',","'elCabW','elCabD','elDoorW','elRelevel','elDoorHold','elStretcherSign','elStretcherAllFloors','elHospitalRamp','elBedCount','elBedCabW','elBedCabD','elBedDoorW','elBedDoorH','elBedVVVF','elBedRelevel','elBedDoorHold','elBedKey','elBedEmergencyPower','elEmergencyRequired','elEmergencyPerGroup','elEmergencySelectable','elEmergencyAuto','elFireCap','elAllFloors','elFireKey',",'M15 general emergency-power persisted fields');
replaceOnce("</div>\n</div>\n<div class=\"card\">\n<h3> آسانسور دسترسی آتش‌نشانی</h3>\n<div class=\"formRow\">\n <div class=\"field\"><label>ظرفیت حداقل 1000 kg / 13 نفر</label><select id=\"elFireCap\">","</div>\n</div>\n<div class=\"card\">\n<h3> برق اضطراری عمومی آسانسورها</h3>\n<div class=\"sub\" style=\"margin-bottom:10px\">کنترل بند 15-2-8 مبحث ۱۵؛ شمول این بند باید ابتدا بر اساس مرجع قابل اعمال پروژه تعیین شود.</div>\n<div class=\"formRow\">\n <div class=\"field\"><label>وجود برق اضطراری برای ساختمان طبق مرجع پروژه ضروری است؟</label><select id=\"elEmergencyRequired\"><option value=\"\">نامشخص</option><option value=\"yes\">بله</option><option value=\"no\">خیر</option></select></div>\n <div class=\"field\"><label>حداقل یک آسانسور از هر گروه از برق اضطراری تغذیه می‌شود</label><select id=\"elEmergencyPerGroup\"><option value=\"\">نامشخص</option><option value=\"yes\">تأمین است</option><option value=\"no\">تأمین نیست</option></select></div>\n</div>\n<div class=\"formRow\">\n <div class=\"field\"><label>خط تغذیه می‌تواند هر آسانسور دیگر را به‌صورت انتخابی تغذیه کند</label><select id=\"elEmergencySelectable\"><option value=\"\">نامشخص</option><option value=\"yes\">تأمین است</option><option value=\"no\">تأمین نیست</option></select></div>\n <div class=\"field\"><label>سیستم برق اضطراری به‌صورت خودکار فعال می‌شود</label><select id=\"elEmergencyAuto\"><option value=\"\">نامشخص</option><option value=\"yes\">بله</option><option value=\"no\">خیر</option></select></div>\n</div>\n</div>\n<div class=\"card\">\n<h3> آسانسور دسترسی آتش‌نشانی</h3>\n<div class=\"formRow\">\n <div class=\"field\"><label>ظرفیت حداقل 1000 kg / 13 نفر</label><select id=\"elFireCap\">",'M15 general emergency-power UI card');
replaceOnce(" }\n if(maxDist!=null)add(maxDist<=40?'ok':'bad','فاصله دسترسی تا آسانسور','بیشترین فاصله ثبت‌شده '+maxDist+' m؛ حداکثر 40 m.','مبحث ۱۵، 15-2-2-1-1');"," }\n\n const emergencyRequired=elevatorVal('elEmergencyRequired');\n if(emergencyRequired==='yes'){\n   if(count==null||count<=0){\n     add('info','برق اضطراری عمومی آسانسورها','برق اضطراری برای ساختمان مشمول ثبت شده است، اما تعداد آسانسورها برای ارزیابی بند 15-2-8 مشخص/مثبت نیست.','مبحث ۱۵، 15-2-8');\n   }else{\n     [\n      ['elEmergencyPerGroup','تغذیه حداقل یک آسانسور از هر گروه با برق اضطراری'],\n      ['elEmergencySelectable','قابلیت تغذیه انتخابی سایر آسانسورها از خط برق اضطراری'],\n      ['elEmergencyAuto','فعال‌شدن خودکار سیستم برق اضطراری']\n     ].forEach(x=>{const v=elevatorVal(x[0]);if(v==='yes')add('ok',x[1],'تأمین شده است.','مبحث ۱۵، 15-2-8');else if(v==='no')add('bad',x[1],'تأمین نشده است.','مبحث ۱۵، 15-2-8');else add('info',x[1],'وضعیت این الزام هنوز مشخص نشده است؛ نتیجه قطعی صادر نمی‌شود.','مبحث ۱۵، 15-2-8');});\n   }\n }else if(emergencyRequired==='no'){\n   add('info','شمول برق اضطراری عمومی آسانسورها','طبق ورودی پروژه، وجود برق اضطراری برای ساختمان ضروری ثبت نشده است؛ این ماژول صحت شمول را مستقل تعیین نمی‌کند و باید با مرجع قابل اعمال پروژه تطبیق داده شود.','مبحث ۱۵، 15-2-8');\n }else{\n   add('info','شمول برق اضطراری عمومی آسانسورها','هنوز مشخص نشده است که وجود برق اضطراری برای ساختمان طبق مرجع پروژه ضروری است یا خیر؛ تا تعیین شمول، عدم انطباق صادر نمی‌شود.','مبحث ۱۵، 15-2-8');\n }\n if(maxDist!=null)add(maxDist<=40?'ok':'bad','فاصله دسترسی تا آسانسور','بیشترین فاصله ثبت‌شده '+maxDist+' m؛ حداکثر 40 m.','مبحث ۱۵، 15-2-2-1-1');",'M15 general emergency-power checks');
if(!androidHtml.includes('id="elEmergencyRequired"') ||
   !androidHtml.includes('id="elEmergencyPerGroup"') ||
   !androidHtml.includes('id="elEmergencySelectable"') ||
   !androidHtml.includes('id="elEmergencyAuto"') ||
   !androidHtml.includes("'مبحث ۱۵، 15-2-8'")){
  throw new Error('Android M15 general emergency-power patch missing');
}

/* FEP-ANDROID-M15-FIRE-ALARM-RECALL-v1
   Mبحث 15 clause 15-2-7-6 (printed page 38): post-detector elevator response.
   Unknown inspection state remains informational and does not create an NCR. */
replaceOnce("'elHallFireProtection','elIndependentFeed','elFreshAirDuct','elFreshAirDuctGuard','elFireAlarmRequired','elDetMachine','elDetShaft','elDetMachineEntry','elDetLanding','elDetDist','elAlarmInterface','elFireSign','elEarthing'","'elHallFireProtection','elIndependentFeed','elFreshAirDuct','elFreshAirDuctGuard','elFireAlarmRequired','elDetMachine','elDetShaft','elDetMachineEntry','elDetLanding','elDetDist','elAlarmInterface','elAlarmRecall','elAlarmDoorRestriction','elAlarmManualKey','elFireSign','elEarthing'",'M15 fire-alarm recall persisted fields');
replaceOnce("<div class=\"formRow\">\n<div class=\"field\"><label>ارت و هم‌بندی ریل‌ها و قطعات فلزی آسانسور</label><select id=\"elEarthing\"><option value=\"\">نامشخص</option><option value=\"yes\">تأمین است</option><option value=\"no\">تأمین نیست</option></select></div>\n</div>\n<div class=\"sub\" style=\"margin-top:8px\">کنترل‌های این بخش از الزامات حریق مبحث ۱۵ استخراج شده‌اند؛ کنترل ارت و هم‌بندی نیز در همان مبحث به مبحث ۱۳ ارجاع داده شده است.</div>","<div class=\"formRow\">\n<div class=\"field\"><label>پس از فعال‌شدن حسگرها، همه آسانسورها به طبقه تعیین‌شده منتقل می‌شوند</label><select id=\"elAlarmRecall\"><option value=\"\">نامشخص</option><option value=\"yes\">بله</option><option value=\"no\">خیر</option></select></div>\n<div class=\"field\"><label>درها فقط در طبقه ورودی یا طبقه از پیش تعریف‌شده باز می‌شوند</label><select id=\"elAlarmDoorRestriction\"><option value=\"\">نامشخص</option><option value=\"yes\">بله</option><option value=\"no\">خیر</option></select></div>\n<div class=\"field\"><label>تمام آسانسورها قابلیت کنترل دستی با کلید آتش‌نشان دارند</label><select id=\"elAlarmManualKey\"><option value=\"\">نامشخص</option><option value=\"yes\">دارد</option><option value=\"no\">ندارد</option></select></div>\n</div>\n<div class=\"formRow\">\n<div class=\"field\"><label>ارت و هم‌بندی ریل‌ها و قطعات فلزی آسانسور</label><select id=\"elEarthing\"><option value=\"\">نامشخص</option><option value=\"yes\">تأمین است</option><option value=\"no\">تأمین نیست</option></select></div>\n</div>\n<div class=\"sub\" style=\"margin-top:8px\">کنترل‌های این بخش از الزامات حریق مبحث ۱۵ استخراج شده‌اند؛ کنترل ارت و هم‌بندی نیز در همان مبحث به مبحث ۱۳ ارجاع داده شده است.</div>",'M15 fire-alarm recall UI controls');
replaceOnce(
  " [\n  ['elDetMachine','حسگر موتورخانه آسانسور'],['elDetShaft','حسگر چاه آسانسور'],\n  ['elDetMachineEntry','حسگر راهرو و ورودی موتورخانه'],['elDetLanding','حسگر جلوی درهای طبقات آسانسور'],\n  ['elAlarmInterface','ارتباط اعلام حریق با کنترل آسانسور']\n ].forEach(x=>{const v=elevatorVal(x[0]);if(v==='yes')add('ok',x[1],'تأمین شده است.','مبحث ۱۵، 15-2-7-6');else if(v==='no')add('bad',x[1],'تأمین نشده است.','مبحث ۱۵، 15-2-7-6');else add('info',x[1],'وضعیت این کنترل هنوز مشخص نشده است؛ برای نتیجه قطعی باید در بازدید/مدارک پروژه تعیین شود.','مبحث ۱۵، 15-2-7-6');});",
  " [\n  ['elDetMachine','حسگر موتورخانه آسانسور'],['elDetShaft','حسگر چاه آسانسور'],\n  ['elDetMachineEntry','حسگر راهرو و ورودی موتورخانه'],['elDetLanding','حسگر جلوی درهای طبقات آسانسور'],\n  ['elAlarmInterface','ارتباط اعلام حریق با کنترل آسانسور'],\n  ['elAlarmRecall','انتقال همه آسانسورها به طبقه تعیین‌شده پس از فعال‌شدن حسگرها'],\n  ['elAlarmDoorRestriction','ممانعت از بازشدن درها در طبقات غیر از ورودی/از پیش تعریف‌شده'],\n  ['elAlarmManualKey','قابلیت کنترل دستی تمام آسانسورها با کلید آتش‌نشان']\n ].forEach(x=>{const v=elevatorVal(x[0]);if(v==='yes')add('ok',x[1],'تأمین شده است.','مبحث ۱۵، 15-2-7-6');else if(v==='no')add('bad',x[1],'تأمین نشده است.','مبحث ۱۵، 15-2-7-6');else add('info',x[1],'وضعیت این کنترل هنوز مشخص نشده است؛ برای نتیجه قطعی باید در بازدید/مدارک پروژه تعیین شود.','مبحث ۱۵، 15-2-7-6');});",
  'M15 fire-alarm recall checks'
);
if(!androidHtml.includes('id="elAlarmRecall"') ||
   !androidHtml.includes('id="elAlarmDoorRestriction"') ||
   !androidHtml.includes('id="elAlarmManualKey"') ||
   !androidHtml.includes("['elAlarmRecall','انتقال همه آسانسورها به طبقه تعیین‌شده پس از فعال‌شدن حسگرها']")){
  throw new Error('Android M15 fire-alarm recall patch missing');
}

/* FEP-ANDROID-PARKING-CAR-RATE-v1
   Make the legacy per-car ventilation rate explicit and user-editable.
   Default remains 920 m3/h per car, so existing default behavior is preserved. */
replaceOnce(
  '<div class="formRow"><div class="field"><label>طول (m)</label><input type="number" id="c1L" value="60"></div><div class="field"><label>عرض (m)</label><input type="number" id="c1W" value="40"></div><div class="field"><label>ارتفاع (m)</label><input type="number" id="c1H" value="3"></div><div class="field"><label>ACH</label><input type="number" id="c1ACH" value="6"></div><div class="field"><label>خودروها</label><input type="number" id="c1Car" value="120"></div></div>',
  '<div class="formRow"><div class="field"><label>طول (m)</label><input type="number" id="c1L" value="60"></div><div class="field"><label>عرض (m)</label><input type="number" id="c1W" value="40"></div><div class="field"><label>ارتفاع (m)</label><input type="number" id="c1H" value="3"></div><div class="field"><label>ACH</label><input type="number" id="c1ACH" value="6"></div><div class="field"><label>خودروها</label><input type="number" id="c1Car" value="120"></div><div class="field"><label>نرخ فرضی هر خودرو (m³/h)</label><input type="number" id="c1CarRate" value="920" min="1" step="10"></div></div>',
  'parking per-car rate input'
);

replaceOnce(
  "const V=v('c1L')*v('c1W')*v('c1H'),qACH=V*v('c1ACH'),qCO=v('c1Car')*920;",
  "const V=v('c1L')*v('c1W')*v('c1H'),qACH=V*v('c1ACH'),carRate=Math.max(0,v('c1CarRate')),qCO=v('c1Car')*carRate;",
  'parking per-car rate calculation'
);

replaceOnce(
  "lastRes[1]={title:'برآورد اولیه تهویه پارکینگ (ACH/خودرو)',lines:[['حجم پارکینگ',fmt(V,0)+' m³'],['دبی ACH',fmt(qACH,0)+' m³/h'],['دبی بر مبنای خودرو',fmt(qCO,0)+' m³/h'],['دبی برآوردی حاکم',fmt(qEx,0)+' m³/h'],['هوای جبرانی ('+fmt(ratio*100,0)+'٪)',fmt(mk,0)+' m³/h']]};",
  "lastRes[1]={title:'برآورد اولیه تهویه پارکینگ (ACH/خودرو)',lines:[['حجم پارکینگ',fmt(V,0)+' m³'],['دبی ACH',fmt(qACH,0)+' m³/h'],['نرخ فرضی هر خودرو',fmt(carRate,0)+' m³/h'],['دبی بر مبنای خودرو',fmt(qCO,0)+' m³/h'],['دبی برآوردی حاکم',fmt(qEx,0)+' m³/h'],['هوای جبرانی ('+fmt(ratio*100,0)+'٪)',fmt(mk,0)+' m³/h']]};",
  'parking per-car rate result line'
);







replaceOnce(
  "1:{formula:'V = L×W×H ؛ Q = max(V×ACH, تعداد خودرو×920) ؛ هوای جبرانی = Q×نسبت',units:'V: m³ | Q: m³/h',reference:'مبنای محاسبات فعلی سامانه؛ مقدار 920 برای هر خودرو یک فرض داخلی ابزار است.',assumptions:'ACH و نرخ CO باید با سناریوی واقعی، الزامات پروژه و مبنای طراحی کنترل شوند.'},",
  "1:{formula:'V = L×W×H ؛ Q = max(V×ACH, تعداد خودرو×CarRate) ؛ هوای جبرانی = Q×نسبت',units:'V: m³ | CarRate: m³/h per car | Q: m³/h',reference:'برآورد داخلی اولیه؛ نرخ هر خودرو ورودی قابل‌ویرایش است و پیش‌فرض آن 920 است.',assumptions:'ACH، نرخ هر خودرو و نسبت جبرانی باید با سناریوی واقعی و مبنای طراحی پروژه کنترل شوند.'},",
  'parking trace per-car rate'
);

replaceOnce(
  "if(n===1)return pos('c1L')&&pos('c1W')&&pos('c1H')&&Number.isFinite(x('c1ACH'))&&x('c1ACH')>=1&&x('c1ACH')<=20&&nonneg('c1Car');",
  "if(n===1)return pos('c1L')&&pos('c1W')&&pos('c1H')&&Number.isFinite(x('c1ACH'))&&x('c1ACH')>=1&&x('c1ACH')<=20&&nonneg('c1Car')&&pos('c1CarRate');",
  'parking bulk rate validation'
);

replaceOnce(
  "const positive=['c1L','c1W','c1H','c1ACH','c1Car','c2Area'",
  "const positive=['c1L','c1W','c1H','c1ACH','c1Car','c1CarRate','c2Area'",
  'parking audit positive inputs'
);

replaceOnce(
  "if(num('c1L')<=0||num('c1W')<=0||num('c1H')<=0)issues.push('ابعاد پارکینگ باید بزرگ‌تر از صفر باشند.');",
  "if(num('c1L')<=0||num('c1W')<=0||num('c1H')<=0)issues.push('ابعاد پارکینگ باید بزرگ‌تر از صفر باشند.');\nif($('c1CarRate')&&(!Number.isFinite(num('c1CarRate'))||num('c1CarRate')<=0))issues.push('نرخ فرضی هر خودرو باید بزرگ‌تر از صفر باشد.');",
  'parking audit rate validation'
);

replaceOnce(
  "if(n===1){if(bad('c1L')||bad('c1W')||bad('c1H')||num('c1L')<=0||num('c1W')<=0||num('c1H')<=0)issues.push('ابعاد پارکینگ باید بزرگ‌تر از صفر باشند.');if(bad('c1ACH')||num('c1ACH')<1||num('c1ACH')>20)issues.push('ACH پارکینگ باید در بازه ورودی ۱ تا ۲۰ باشد.');if(bad('c1Car')||num('c1Car')<0)issues.push('تعداد خودرو نمی‌تواند منفی باشد.');}",
  "if(n===1){if(bad('c1L')||bad('c1W')||bad('c1H')||num('c1L')<=0||num('c1W')<=0||num('c1H')<=0)issues.push('ابعاد پارکینگ باید بزرگ‌تر از صفر باشند.');if(bad('c1ACH')||num('c1ACH')<1||num('c1ACH')>20)issues.push('ACH پارکینگ باید در بازه ورودی ۱ تا ۲۰ باشد.');if(bad('c1Car')||num('c1Car')<0)issues.push('تعداد خودرو نمی‌تواند منفی باشد.');if(bad('c1CarRate')||num('c1CarRate')<=0)issues.push('نرخ فرضی هر خودرو باید بزرگ‌تر از صفر باشد.');}",
  'parking scoped rate validation'
);

if(!androidHtml.includes('id="c1CarRate"') ||
   !androidHtml.includes("qCO=v('c1Car')*carRate") ||
   !androidHtml.includes("pos('c1CarRate')") ||
   androidHtml.includes("qCO=v('c1Car')*920")){
  throw new Error('Android parking per-car rate parameterization missing');
}



/* FEP-ANDROID-CHECKLIST-STANDARDS-HARDENING-v2
   Wording-only hardening for legacy warehouse/hospital checklist items whose
   universal numeric/equipment wording is not yet tied to a verified project clause. */
replaceOnce(
  "'فاصله آزاد زیر هد حداقل ۰٫۴۵ متر'",
  "'فاصله آزاد زیر اسپرینکلر با نوع هد، آرایش انبارش و مبنای طراحی پروژه تطبیق داده شده است'",
  'warehouse sprinkler clearance wording'
);
replaceOnce(
  "'خاموش‌کننده Clean Agent/CO2 در OR و ICU'",
  "'نوع و جانمایی خاموش‌کننده در OR و ICU با کلاس خطر، تجهیزات موجود و طرح مصوب پروژه تطبیق داده شده است'",
  'hospital extinguisher wording'
);
replaceOnce(
  "'عرض کریدور تخلیه ≥ ۲٫۴ متر'",
  "'عرض کریدور تخلیه با کاربری، بار تخلیه، طرح مصوب و مرجع قابل اعمال پروژه تطبیق داده شده است'",
  'hospital corridor width wording'
);
if(androidHtml.includes('فاصله آزاد زیر هد حداقل ۰٫۴۵ متر') ||
   androidHtml.includes('خاموش‌کننده Clean Agent/CO2 در OR و ICU') ||
   androidHtml.includes('عرض کریدور تخلیه ≥ ۲٫۴ متر') ||
   !androidHtml.includes('فاصله آزاد زیر اسپرینکلر با نوع هد') ||
   !androidHtml.includes('نوع و جانمایی خاموش‌کننده در OR و ICU') ||
   !androidHtml.includes('عرض کریدور تخلیه با کاربری')){
  throw new Error('Android checklist standards hardening v2 missing');
}


/* FEP-ANDROID-DIESEL-VENT-v2
   Two-mode diesel room ventilation:
   - manufacturer-data mode: preferred engineering path
   - legacy estimate mode: preserved for backward compatibility, explicitly marked approximate */
const dieselOldUi = '<div class="formRow"><div class="field"><label>توان</label><input type="number" id="c10P" value="500"></div><div class="field"><label>واحد</label><select id="c10Unit"><option value="kW" selected>kW</option><option value="HP">HP</option></select></div><div class="field"><label>خنک‌کاری</label><select id="c10Cool"><option value="rad" selected>رادیاتور</option><option value="hx">مبدل</option></select></div><div class="field"><label>ΔT</label><select id="c10dT"><option value="5">۵</option><option value="10">۱۰</option><option value="15" selected>۱۵</option><option value="20">۲۰</option></select></div><div class="field"><label>حجم اتاق</label><input type="number" id="c10Vol" value="300"></div></div>';
const dieselNewUi = '<div class="field"><label>روش محاسبه</label><select id="c10Mode"><option value="mfr" selected>دقیق‌تر — داده سازنده</option><option value="est">برآورد اولیه — ضرایب داخلی قدیمی</option></select></div><div class="formRow"><div class="field"><label>توان</label><input type="number" id="c10P" value="500"></div><div class="field"><label>واحد</label><select id="c10Unit"><option value="kW" selected>kW</option><option value="HP">HP</option></select></div><div class="field"><label>ΔT مجاز اتاق (°C)</label><select id="c10dT"><option value="5">۵</option><option value="10">۱۰</option><option value="15" selected>۱۵</option><option value="20">۲۰</option></select></div><div class="field"><label>حجم اتاق (m³)</label><input type="number" id="c10Vol" value="300"></div><div class="field" id="c10CombField"><label for="c10MfrComb">هوای احتراق از دیتاشیت (m³/h) <span id="c10CombReq" style="color:#b91c1c;font-weight:900">* اجباری</span></label><input type="number" id="c10MfrComb" value="" min="0" inputmode="decimal" aria-describedby="c10MfrHint" placeholder="از دیتاشیت؛ مثلاً 250"></div><div class="field" id="c10HeatField"><label for="c10MfrHeat">گرمای دفع‌شده به اتاق از دیتاشیت (kW) <span id="c10HeatReq" style="color:#b91c1c;font-weight:900">* اجباری</span></label><input type="number" id="c10MfrHeat" value="" min="0" inputmode="decimal" aria-describedby="c10MfrHint" placeholder="از دیتاشیت؛ مثلاً 40"></div><div class="field"><label>حاشیه طراحی (%)</label><input type="number" id="c10Margin" value="0" min="0"></div><div class="field"><label>خنک‌کاری — فقط حالت برآورد</label><select id="c10Cool"><option value="rad" selected>رادیاتور</option><option value="hx">مبدل</option></select></div></div><div id="c10MfrHint" class="warnBadge"><b>در حالت «داده سازنده»، دو فیلد ستاره‌دار اجباری هستند.</b><br>«هوای احتراق» و «گرمای دفع‌شده به اتاق» را از دیتاشیت همان موتور/ژنراتور وارد کنید. برنامه برای این دو مقدار عدد حدسی جایگزین نمی‌کند.</div><div id="c10MfrStatus" class="muted" style="margin:8px 0 2px;font-weight:700">برای فعال شدن «محاسبه»، هر دو مقدار اجباری را وارد کنید.</div>';
replaceOnce(dieselOldUi, dieselNewUi, 'diesel ventilation inputs');

const dieselOldCalc = `let P=v('c10P');if($('c10Unit').value==='HP')P*=0.746;
const dT=Math.max(0.1,v('c10dT')),cool=$('c10Cool').value,vol=v('c10Vol');
const Qc=P*2.4,H=cool==='rad'?0.35*P:0.10*P,Qcool=2985*H/dT,tot=(Qc+Qcool)*1.1;
const lines=[['توان معادل',fmt(P,0)+' kW'],['هوای احتراق',fmt(Qc,0)+' m³/h'],['هوای دفع حرارت',fmt(Qcool,0)+' m³/h'],['دبی کل تهویه (+۱۰٪)',fmt(tot,0)+' m³/h'],['معادل',fmt(tot/3600,2)+' m³/s']];
if(vol>0)lines.push(['تعویض هوا معادل',fmt(tot/vol,0)+' ACH']);
lastRes[10]={title:'تهویه موتورخانه دیزل (مبحث ۱۴)',lines};
showRes(10,lines,'دبی کل: '+fmt(tot,0)+' m³/h');`;
const dieselNewCalc = `let P=v('c10P');if($('c10Unit').value==='HP')P*=0.746;
const dT=Math.max(0.1,v('c10dT')),cool=$('c10Cool').value,vol=v('c10Vol'),mode=$('c10Mode')?.value||'mfr';
const margin=Math.max(0,v('c10Margin')),rho=1.2,cp=1.005;
let Qc=0,Qcool=0,tot=0,lines=[],extra='';
if(mode==='mfr'){
  Qc=Math.max(0,v('c10MfrComb'));
  const heat=Math.max(0,v('c10MfrHeat'));
  if(Qc<=0||heat<=0){
    showRes(10,[['وضعیت','ورودی دیتاشیت ناقص است']],'محاسبه انجام نشد','<div class="warnBadge">⚠️ برای حالت داده سازنده، «هوای احتراق» و «گرمای دفع‌شده به اتاق» باید از دیتاشیت همان موتور/ژنراتور وارد شوند.</div>');
    return;
  }
  Qcool=heat*3600/(rho*cp*dT);
  tot=(Qc+Qcool)*(1+margin/100);
  lines=[['روش','داده سازنده'],['توان معادل',fmt(P,0)+' kW'],['هوای احتراق دیتاشیت',fmt(Qc,0)+' m³/h'],['گرمای دفع‌شده به اتاق',fmt(heat,1)+' kW'],['هوای لازم برای دفع گرما',fmt(Qcool,0)+' m³/h'],['حاشیه طراحی',fmt(margin,0)+'٪'],['دبی کل تهویه',fmt(tot,0)+' m³/h'],['معادل',fmt(tot/3600,2)+' m³/s']];
  extra='<div class="warnBadge">✓ این حالت از داده همان تجهیز استفاده می‌کند. صحت ورودی دیتاشیت، مسیر ورود/خروج هوا، افت فشار لوورها/کانال و الزامات پروژه باید جداگانه کنترل شوند.</div>';
}else{
  Qc=P*2.4;
  const H=cool==='rad'?0.35*P:0.10*P;
  Qcool=2985*H/dT;
  tot=(Qc+Qcool)*1.1;
  lines=[['روش','برآورد اولیه قدیمی'],['توان معادل',fmt(P,0)+' kW'],['هوای احتراق تخمینی',fmt(Qc,0)+' m³/h'],['هوای دفع حرارت تخمینی',fmt(Qcool,0)+' m³/h'],['دبی کل تهویه (+۱۰٪ داخلی)',fmt(tot,0)+' m³/h'],['معادل',fmt(tot/3600,2)+' m³/s']];
  extra='<div class="warnBadge">⚠️ این حالت فقط برای برآورد اولیه و سازگاری با محاسبات قبلی نگه داشته شده است. ضرایب ۲٫۴، ۰٫۳۵/۰٫۱۰ و ۱۰٪ الزام عمومی استاندارد نیستند؛ برای طراحی نهایی از داده سازنده استفاده کنید.</div>';
}
if(vol>0)lines.push(['تعویض هوا معادل',fmt(tot/vol,1)+' ACH']);
lastRes[10]={title:'تهویه موتورخانه دیزل',lines};
showRes(10,lines,'دبی کل: '+fmt(tot,0)+' m³/h',extra);`;
replaceOnce(dieselOldCalc, dieselNewCalc, 'diesel ventilation calculation');

const dieselRequiredRuntimeCode = `/* FEP-ANDROID-DIESEL-REQUIRED-UX-v1 */
function dieselRequiredNum(id){const el=document.getElementById(id),n=parseFloat(el?.value);return Number.isFinite(n)?n:0;}
function syncDieselRequiredUx(){
 const mode=document.getElementById('c10Mode')?.value||'mfr';
 const mfr=mode==='mfr';
 const comb=document.getElementById('c10MfrComb'),heat=document.getElementById('c10MfrHeat');
 const combReq=document.getElementById('c10CombReq'),heatReq=document.getElementById('c10HeatReq');
 const status=document.getElementById('c10MfrStatus');
 const calc=document.querySelector('[data-calc="10"]');
 [comb,heat].filter(Boolean).forEach(function(el){el.required=mfr;el.setAttribute('aria-required',mfr?'true':'false');});
 if(combReq)combReq.style.display=mfr?'inline':'none';
 if(heatReq)heatReq.style.display=mfr?'inline':'none';
 const ready=!mfr||(dieselRequiredNum('c10MfrComb')>0&&dieselRequiredNum('c10MfrHeat')>0);
 if(calc){
   calc.disabled=!ready;
   calc.setAttribute('aria-disabled',ready?'false':'true');
   calc.style.opacity=ready?'':'0.55';
   calc.style.cursor=ready?'':'not-allowed';
   calc.title=ready?'محاسبه تهویه موتورخانه':'ابتدا هوای احتراق و گرمای دفع‌شده را از دیتاشیت وارد کنید';
 }
 if(status){
   if(!mfr){status.textContent='حالت برآورد اولیه فعال است؛ ورودی‌های دیتاشیت در این حالت اجباری نیستند.';status.style.color='';}
   else if(ready){status.textContent='✓ ورودی‌های اجباری کامل است؛ محاسبه آماده اجراست.';status.style.color='var(--ok,#15803d)';}
   else{status.textContent='⚠️ برای فعال شدن «محاسبه»، هوای احتراق و گرمای دفع‌شده دیتاشیت را وارد کنید.';status.style.color='var(--bad,#b91c1c)';}
 }
}
function bindDieselRequiredUx(){
 const mode=document.getElementById('c10Mode'),comb=document.getElementById('c10MfrComb'),heat=document.getElementById('c10MfrHeat');
 [mode,comb,heat].filter(Boolean).forEach(function(el){
   if(el.dataset.fepDieselRequiredBound)return;
   el.dataset.fepDieselRequiredBound='1';
   if(el.tagName==='SELECT')el.addEventListener('change',syncDieselRequiredUx);
   else{el.addEventListener('input',syncDieselRequiredUx);el.addEventListener('change',syncDieselRequiredUx);}
 });
 syncDieselRequiredUx();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindDieselRequiredUx,{once:true});else bindDieselRequiredUx();
window.addEventListener('pageshow',bindDieselRequiredUx);
setTimeout(bindDieselRequiredUx,250);
window.FEPDieselRequiredUx={sync:syncDieselRequiredUx};
`;

replaceOnce(
  "/* ================= ردیابی مهندسی محاسبات ================= */",
  dieselRequiredRuntimeCode + "\n/* ================= ردیابی مهندسی محاسبات ================= */",
  'diesel manufacturer required-input runtime'
);


replaceOnce(
  "10:{formula:'Qcomb = P×2.4 ؛ Qcool = 2985×H/ΔT ؛ Qtotal = (Qcomb+Qcool)×1.10',units:'P: kW | Q: m³/h | ΔT: °C',reference:'مبحث ۱۴ / NFPA 37 — ساختار محاسبات فعلی سامانه',assumptions:'بار حرارتی، هوای احتراق، آرایش رادیاتور و شرایط واقعی اتاق باید با طراحی پروژه تطبیق داده شوند.'},",
  "10:{formula:'حالت سازنده: Qcool = Heat×3600/(ρ×cp×ΔT) ؛ Qtotal = (Qcomb+Qcool)×(1+Margin/100). حالت برآورد: منطق قدیمی برنامه.',units:'Heat: kW | Q: m³/h | ΔT: °C',reference:'داده سازنده تجهیز + موازنه حرارتی اتاق؛ حالت برآورد صرفاً منطق داخلی قدیمی سامانه است.',assumptions:'در حالت سازنده، Qcomb و Heat باید از دیتاشیت همان تجهیز وارد شوند. افت فشار مسیر هوا، لوورها/کانال و شرایط نصب جداگانه کنترل شوند.'},",
  "diesel calculation trace"
);


/* FEP-ANDROID-ENGINEERING-HELP-v1
   Android-only contextual help for the Engineering tools menu and tool pages.
   Navigation targets and calculation engines are intentionally unchanged. */
const engineeringHelpStyle = `<style id="fepEngineeringHelpStyle">
.engineeringHelpToggle{display:block!important;position:relative!important;inset:auto!important;float:none!important;box-sizing:border-box;width:100%!important;grid-column:1/-1;margin:0 0 10px!important;padding:10px 12px!important;border:1px dashed var(--border);border-radius:12px;background:var(--card);color:var(--text);font-weight:800;cursor:pointer;z-index:2;transform:none!important}
.engineeringHelpPanel.engineeringHelpOn{overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;align-content:start}
.navGroupPanel.engineeringHelpOn .tabBtn{height:auto;min-height:58px;align-items:flex-start;flex-direction:column;gap:4px}
.engHelpDesc{display:none;font-size:11px;font-weight:500;line-height:1.65;opacity:.78;text-align:right;white-space:normal}
.navGroupPanel.engineeringHelpOn .engHelpDesc{display:block}
.toolIntroHelp{margin:0 0 14px;border:1px solid var(--border);border-radius:12px;background:var(--chip);overflow:hidden}
.toolIntroHelp summary{cursor:pointer;padding:11px 13px;font-weight:800;list-style:none}
.toolIntroHelp summary::-webkit-details-marker{display:none}
.toolIntroHelpBody{padding:0 13px 13px;line-height:1.9}
.toolIntroHelpBody p{margin:5px 0}
</style>`;
if (!androidHtml.includes('id="fepEngineeringHelpStyle"')) {
  if (androidHtml.includes('</head>')) androidHtml=androidHtml.replace('</head>',engineeringHelpStyle+'</head>');
  else androidHtml=engineeringHelpStyle+androidHtml;
}

const engineeringHelpRuntime = `<script id="fepEngineeringHelpRuntime">
(function(){
const HELP={
 dxfreview:['بررسی نقشه DXF','فایل DXF/DWG را برای استخراج ساختار، هندسه و کنترل‌های اولیه نقشه بررسی می‌کند.','فایل نقشه، واحد و رشته نقشه.','خلاصه نقشه، هندسه استخراج‌شده و کنترل‌های قابل انجام.'],
 calcs:['محاسبات','مجموعه محاسبات پایه آتش‌نشانی مانند اسپرینکلر، هیدرولیک، فشار مثبت، مخزن و تهویه.','اطلاعات فنی متناسب با محاسبه انتخابی.','نتیجه عددی، هشدارها و مبنای محاسبه.'],
 duct:['کانال','مسیر کانال را قطعه‌به‌قطعه تعریف و افت فشار مسیر هوا را برآورد می‌کند.','دبی، ابعاد/مشخصات کانال و اجزای مسیر.','افت فشار مسیر و اطلاعات لازم برای انتخاب فن.'],
 fan:['انتخاب فن','نقطه کار موردنیاز را با منحنی واردشده فن مقایسه می‌کند.','دبی، فشار، حاشیه طراحی و نقاط منحنی فن.','کنترل نقطه کار و خروجی مهندسی انتخاب فن.'],
 smoke:['کنترل دود','سناریوهای کنترل دود و عملکرد اجزای مرتبط را برای بررسی مهندسی ثبت و مقایسه می‌کند.','سناریو و داده‌های سیستم کنترل دود.','نتیجه کنترل سناریو و موارد نیازمند بررسی.'],
 network:['شبکه هیدرولیکی','گره‌ها و لوله‌های شبکه را تعریف می‌کند تا ارتباط و افت‌های شبکه بررسی شوند.','گره، ارتفاع، لوله، طول، قطر، C، دبی و K.','نمای شبکه و نتایج تحلیل هیدرولیکی واردشده.'],
 hydloss:['افت فشار مسیر','افت فشار یک مسیر مشخص لوله یا کانال را از پارامترهای واردشده محاسبه می‌کند.','نوع مسیر، دبی، طول/ابعاد و ضرایب افت.','افت فشار محاسبه‌شده و امکان انتقال آن به مسیر فعال.'],
 topology:['توپولوژی','نحوه اتصال تجهیزات را به صورت مبدأ ← مقصد تعریف می‌کند.','تجهیز مبدأ و مقصد، نوع اتصال، دبی و افت اختیاری.','زنجیره اتصال تجهیزات برای تحلیل مسیر سیستم.'],
 pathanalysis:['تحلیل مسیر','بین تجهیزات متصل، یک مسیر انتخابی را بررسی و افت‌های ثبت‌شده آن را جمع‌بندی می‌کند.','مبدأ، مقصد و اطلاعات اتصالات ثبت‌شده.','جزئیات مسیر و جمع افت؛ این ابزار به‌تنهایی بحرانی‌ترین مسیر کل شبکه را اثبات نمی‌کند.'],
 equipment:['تجهیزات سیستم','تجهیزات پروژه را با مشخصات فنی و موقعیتشان ثبت می‌کند تا در مسیرها و تحلیل‌ها استفاده شوند.','نوع تجهیز، موقعیت، دبی/فشار، زون و مرجع.','فهرست تجهیزات قابل استفاده در توپولوژی و تحلیل.'],

};
function desc(id){return HELP[id]?HELP[id][1]:'';}
window.fepEnsureToolIntro=function(tab,sec){
 if(!HELP[tab]||!sec||sec.querySelector('.toolIntroHelp'))return;
 const h=HELP[tab],box=document.createElement('details');box.className='toolIntroHelp';
 box.innerHTML='<summary>❓ این ابزار چه کاری انجام می‌دهد؟</summary><div class="toolIntroHelpBody"><p><b>کاربرد:</b> '+h[1]+'</p><p><b>ورودی‌های اصلی:</b> '+h[2]+'</p><p><b>خروجی:</b> '+h[3]+'</p></div>';
 sec.insertBefore(box,sec.firstChild);
};
window.fepBindEngineeringHelp=function(){
 const buttons=Array.from(document.querySelectorAll('.tabBtn')).filter(function(b){return HELP[b.dataset.tab];});
 if(!buttons.length)return;
 const parents=buttons.map(function(b){return b.parentElement;}).filter(Boolean);
 let panel=buttons[0].closest('.navGroupPanel');
 if(!panel){
   panel=parents.find(function(p){return buttons.filter(function(b){return b.parentElement===p;}).length>=2;})||parents[0];
 }
 if(!panel)return;
 panel.classList.add('engineeringHelpPanel');
 function fitEngineeringPanel(){
   if(!panel.classList.contains('engineeringHelpOn')){panel.style.maxHeight='';panel.style.overflowY='';return;}
   const rect=panel.getBoundingClientRect();
   const reserve=Math.max(72,(window.visualViewport?window.innerHeight-window.visualViewport.height:0)+64);
   const available=Math.max(180,window.innerHeight-Math.max(8,rect.top)-reserve);
   panel.style.maxHeight=available+'px';
   panel.style.overflowY='auto';
 }
 let toggle=panel.querySelector(':scope > .engineeringHelpToggle');
 if(!toggle){
   toggle=document.createElement('button');toggle.type='button';toggle.className='engineeringHelpToggle';toggle.textContent='❓ راهنمای ابزارها';
   toggle.onclick=function(e){e.preventDefault();e.stopPropagation();const on=panel.classList.toggle('engineeringHelpOn');toggle.textContent=on?'✓ بستن راهنمای ابزارها':'❓ راهنمای ابزارها';requestAnimationFrame(fitEngineeringPanel);};
 }
 const firstTool=buttons.find(function(b){return b.parentElement===panel;})||panel.firstElementChild;
 if(toggle.parentElement!==panel)panel.insertBefore(toggle,firstTool);
 else if(toggle!==panel.firstElementChild)panel.insertBefore(toggle,firstTool);
 buttons.forEach(function(b){
   if(b.querySelector('.engHelpDesc'))return;
   const id=b.dataset.tab,d=document.createElement('span');d.className='engHelpDesc';d.textContent=desc(id);b.appendChild(d);
 });
};
function bootEngineeringHelp(){window.fepBindEngineeringHelp();setTimeout(window.fepBindEngineeringHelp,250);setTimeout(window.fepBindEngineeringHelp,900);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootEngineeringHelp,{once:true});else bootEngineeringHelp();
window.addEventListener('resize',function(){const p=document.querySelector('.engineeringHelpPanel.engineeringHelpOn');if(p){const r=p.getBoundingClientRect(),reserve=72;p.style.maxHeight=Math.max(180,window.innerHeight-Math.max(8,r.top)-reserve)+'px';}});
})();
</script>`;
if (!androidHtml.includes('id="fepEngineeringHelpRuntime"')) {
  if (androidHtml.includes('</head>')) androidHtml=androidHtml.replace('</head>',engineeringHelpRuntime+'</head>');
  else androidHtml=engineeringHelpRuntime+androidHtml;
}

replaceOnce(
  " sec.classList.remove('hidden');\n const g=groupForTab(tab);",
  " sec.classList.remove('hidden');\n if(typeof window.fepEnsureToolIntro==='function')window.fepEnsureToolIntro(tab,sec);\n const g=groupForTab(tab);",
  'engineering tool page help hook'
);
replaceOnce(
  " host.querySelectorAll('.navGroupBtn').forEach(b=>b.onclick=(e)=>{",
  " if(typeof window.fepBindEngineeringHelp==='function')window.fepBindEngineeringHelp();\n\n host.querySelectorAll('.navGroupBtn').forEach(b=>b.onclick=(e)=>{",
  'engineering menu help hook'
);
if(!androidHtml.includes('id="fepEngineeringHelpStyle"') ||
   !androidHtml.includes('id="fepEngineeringHelpRuntime"') ||
   !androidHtml.includes('fepBindEngineeringHelp') ||
   !androidHtml.includes('fepEnsureToolIntro') ||
   !androidHtml.includes('راهنمای ابزارها') ||
   !androidHtml.includes('این ابزار چه کاری انجام می‌دهد؟')){
 throw new Error('Android engineering contextual help missing');
}

/* FEP-ANDROID-CALC-BASIS-v1
   First calculation-basis UI: Hazen-Williams + preliminary pipe sizing.
   Explanatory only; calculation formulas and stored results are not changed. */
const calcBasisStyle = `<style id="fepCalcBasisStyle">
.calcBasis{margin-top:10px;border:1px solid var(--border);border-radius:12px;background:var(--chip);overflow:hidden}
.calcBasis summary{cursor:pointer;padding:11px 13px;font-weight:800;list-style:none}
.calcBasis summary::-webkit-details-marker{display:none}
.calcBasisBody{padding:0 13px 13px;line-height:1.9}
.calcBasisBody p{margin:6px 0}
.calcBasisBody .formula{direction:ltr;text-align:left;font-family:monospace;background:var(--card);border:1px solid var(--border);border-radius:9px;padding:8px 10px;overflow:auto}
.calcBasisBody .basisNote{margin-top:8px;padding:8px 10px;border-radius:9px;background:rgba(245,158,11,.12)}
</style>`;
if (!androidHtml.includes('id="fepCalcBasisStyle"')) {
  androidHtml = androidHtml.replace('</head>', calcBasisStyle + '</head>');
}

const basis6 = `<details class="calcBasis" id="calcBasis6"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش:</b> افت اصطکاکی لوله با رابطه Hazen–Williams محاسبه می‌شود.</p>
<div class="formula">ΔP/L = 6.05×10^5 × Q^1.85 / (C^1.85 × d^4.87)</div>
<p><b>ورودی‌های مؤثر:</b> Q دبی بر حسب L/min، L طول مستقیم بر حسب m، C ضریب Hazen–Williams، و d قطر داخلی واقعی لوله بر حسب mm.</p>
<p><b>قطر داخلی:</b> نرم‌افزار برای Sch40 و Sch10 از قطر داخلی متناظر با سایز انتخابی استفاده می‌کند؛ بنابراین قطر اسمی مستقیماً به‌عنوان قطر هیدرولیکی استفاده نمی‌شود.</p>
<p><b>اتصالات:</b> طول معادل زانو، سه‌راهی، شیر یک‌طرفه و شیر کشویی به طول مستقیم افزوده می‌شود.</p>
<p><b>سرعت:</b> از رابطه v = Q/A با سطح مقطع بر اساس قطر داخلی محاسبه می‌شود.</p>
<p><b>خروجی:</b> افت در ۱۰۰ متر، سرعت جریان، افت فشار کل و معادل متر ستون آب نمایش داده می‌شود.</p>
<div class="basisNote">⚠️ جدول طول معادل اتصالات و روش تطبیق آن برای Scheduleهای مختلف هنوز در ممیزی مرجع قرار دارد؛ تا تأیید منبع، این قسمت نباید به‌عنوان الزام قطعی NFPA 13 تلقی شود.</div>
</div></details>`;

const basis8 = `<details class="calcBasis" id="calcBasis8"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش:</b> این ابزار دبی ورودی بر حسب GPM را با جدول داخلی دبی–سایز مقایسه و اولین سایز اسمی دارای ظرفیت جدولی کافی را پیشنهاد می‌کند.</p>
<p><b>خروجی:</b> سایز نمایش‌داده‌شده یک <b>پیشنهاد اولیه</b> برای بررسی است.</p>
<div class="basisNote">⚠️ این بخش جایگزین محاسبه هیدرولیکی شبکه نیست. انتخاب نهایی قطر باید با دبی واقعی مسیر، قطر داخلی، افت فشار، سرعت، اتصالات و الزامات مرجع پروژه کنترل شود. مبنای دقیق جدول دبی–سایز نیز در ممیزی مرجع قرار دارد.</div>
</div></details>`;

const insertBasisAfterResult = (resultId, basisHtml, basisId) => {
  const tokens = [
    '<div class="resBox" id="' + resultId + '"></div>',
    '<div id="' + resultId + '" class="resBox"></div>'
  ];
  const token = tokens.find(t => androidHtml.includes(t));
  if (!token) throw new Error('Android calc basis: missing ' + resultId);
  const pos = androidHtml.indexOf(token);
  if (androidHtml.includes('id="' + basisId + '"')) throw new Error('Android calc basis: duplicate ' + basisId);
  androidHtml = androidHtml.slice(0, pos + token.length) + basisHtml + androidHtml.slice(pos + token.length);
};
insertBasisAfterResult('res6', basis6, 'calcBasis6');
insertBasisAfterResult('res8', basis8, 'calcBasis8');

const basis2 = `<details class="calcBasis" id="calcBasis2"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش:</b> این ابزار برآورد تقاضای آب اسپرینکلر را با روش چگالی × مساحت انجام می‌دهد و سپس مقدار شلنگ/هوز انتخاب‌شده در جدول داخلی را اضافه می‌کند.</p>
<div class="formula">Qspr = Density × Area<br>Qtotal = Qspr + Qhose</div>
<p><b>ورودی‌های مؤثر:</b> گروه خطر انتخابی و مساحت طراحی. چگالی و مقدار شلنگ از جدول داخلی برنامه برای گروه خطر انتخاب‌شده خوانده می‌شوند.</p>
<p><b>خروجی:</b> دبی اسپرینکلر، دبی افزوده شلنگ، دبی کل بر حسب L/min و معادل GPM.</p>
<div class="basisNote">⚠️ این خروجی یک برآورد تقاضای آب بر پایه مقادیر داخلی برنامه است، نه محاسبه هیدرولیکی کامل شبکه. مقادیر چگالی، مساحت طراحی و تقاضای شلنگ باید با طبقه‌بندی خطر، نوع سیستم و ویرایش مرجع پروژه کنترل شوند؛ تا پایان ممیزی، اعداد جدول داخلی به‌عنوان الزام قطعی NFPA 13 معرفی نمی‌شوند.</div>
</div></details>`;

const basis3 = `<details class="calcBasis" id="calcBasis3"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش:</b> این ابزار دبی زون طراحی را از حاصل‌ضرب چگالی در مساحت می‌گیرد، درصد ناموازنی واردشده توسط کاربر را روی آن اعمال می‌کند و سپس دبی شلنگ را اضافه می‌کند.</p>
<div class="formula">Qzone = Density × Area<br>Qspr = Qzone × (1 + Imbalance/100)<br>Qtotal = Qspr + Qhose</div>
<p><b>ورودی‌های مؤثر:</b> چگالی، مساحت طراحی، دبی شلنگ و درصد ناموازنی؛ همه این مقادیر در این ابزار ورودی کاربر هستند.</p>
<p><b>خروجی:</b> دبی زون، دبی پس از اعمال درصد ناموازنی، دبی کل و تبدیل آن به GPM و m³/h.</p>
<div class="basisNote">⚠️ درصد «ناموازنی» در این ابزار یک ورودی محاسباتی است و در این مرحله به‌عنوان ضریب الزامی NFPA 13 تأیید نشده است. انتخاب نهایی تقاضای طراحی باید با محاسبات هیدرولیکی شبکه و مرجع دقیق پروژه کنترل شود.</div>
</div></details>`;

insertBasisAfterResult('res2', basis2, 'calcBasis2');
insertBasisAfterResult('res3', basis3, 'calcBasis3');

const basis1 = `<details class="calcBasis" id="calcBasis1"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش فعلی ابزار:</b> ابتدا حجم پارکینگ از طول × عرض × ارتفاع محاسبه می‌شود. سپس دو دبی مستقل ساخته می‌شود: دبی مبتنی بر تعویض هوا و دبی مبتنی بر تعداد خودرو. مقدار بزرگ‌تر به‌عنوان دبی حاکم انتخاب می‌شود.</p>
<div class="formula">V = L × W × H<br>QACH = V × ACH<br>Qcar = Ncars × 920 m³/h<br>Qexhaust = max(QACH, Qcar)<br>Qmakeup = Qexhaust × Makeup%</div>
<p><b>ورودی‌های مؤثر:</b> ابعاد پارکینگ، ACH، تعداد خودرو و درصد هوای جبرانی.</p>
<p><b>خروجی:</b> حجم، هر دو دبی مقایسه‌ای، دبی تخلیه حاکم و هوای جبرانی.</p>
<div class="basisNote">⚠️ ضریب ۹۲۰ m³/h برای هر خودرو و انتخاب بزرگ‌ترِ دو روش، منطق داخلی فعلی برنامه است. در فایل‌های مرجع پروژه‌ای که اکنون قابل استناد بودند، مبنای کافی برای معرفی این عدد و این قاعده به‌عنوان الزام قطعی مقررات پیدا نشد؛ بنابراین نتیجه باید برآورد اولیه تلقی و با سناریوی کنترل دود/تهویه و مرجع دقیق پروژه کنترل شود.</div>
</div></details>`;

const basis7 = `<details class="calcBasis" id="calcBasis7"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش فعلی ابزار:</b> جریان عبوری از درب باز و سطح نشتی درب‌های بسته با رابطه جریان از بازشو بر اساس اختلاف فشار برآورد می‌شود و در پایان ۱۵٪ ضریب اطمینان اعمال می‌شود.</p>
<div class="formula">Q = Cd × A × √(2ΔP/ρ)<br>Cd = 0.65 &nbsp; | &nbsp; ρ = 1.2 kg/m³<br>Qfan = (Qopen + Qleak) × 1.15</div>
<p><b>درب باز:</b> سطح هر درب از عرض × ارتفاع محاسبه و برای تعداد درهای باز اعمال می‌شود.</p>
<p><b>درب بسته:</b> ابزار سطح نشتی پایه را برابر ۱٪ مجموع سطح درهای بسته در نظر می‌گیرد و درصد نشتی ورودی کاربر را نیز روی آن اعمال می‌کند.</p>
<p><b>خروجی:</b> دبی درهای باز، دبی نشتی درهای بسته و دبی برآوردی فن بر حسب m³/h و m³/s.</p>
<div class="basisNote">⚠️ Cd=0.65، فرض نشتی پایه ۱٪، ضریب اطمینان ۱۵٪ و تبدیل ارتفاع به تعداد طبقات با تقسیم بر ۳، فرض‌های داخلی این ابزار هستند و در این مرحله به‌عنوان الزام قطعی مرجع معرفی نمی‌شوند. انتخاب نهایی فن باید سناریوهای درهای باز/بسته، مسیرهای واقعی نشت، نیروی بازکردن در، فشار هدف و مرجع پروژه را کنترل کند.</div>
</div></details>`;

insertBasisAfterResult('res1', basis1, 'calcBasis1');
insertBasisAfterResult('res7', basis7, 'calcBasis7');

const basis4 = `<details class="calcBasis" id="calcBasis4"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش:</b> دبی یک نازل اسپرینکلر از K-Factor و فشار ورودی با رابطه استاندارد نازل محاسبه می‌شود.</p>
<div class="formula">Q = K × √P</div>
<p><b>واحدها:</b> در حالت متریک، K بر حسب L/min/bar⁰·⁵ و P بر حسب bar است؛ در حالت امپریال، K بر حسب GPM/psi⁰·⁵ و P بر حسب psi است.</p>
<p><b>خروجی:</b> دبی نازل در سیستم واحد انتخابی و تبدیل آن به واحد دیگر.</p>
<div class="basisNote">⚠️ خود رابطه Q=K√P مبنای محاسبه این ابزار است؛ اما کنترل حداقل فشار فعلی برنامه (۰٫۵ bar / ۷ psi) تا تأیید دقیق نوع اسپرینکلر، کاربرد و ویرایش مرجع پروژه نباید به‌عنوان حداقل عمومی و قطعی NFPA 13 تلقی شود.</div>
</div></details>`;

const basis5 = `<details class="calcBasis" id="calcBasis5"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش:</b> حجم موردنیاز از دبی کل × مدت تأمین به‌دست می‌آید و درصد اطمینان واردشده توسط کاربر به آن افزوده می‌شود.</p>
<div class="formula">V = Q × t × (1 + Safety/100) / 1000</div>
<p><b>ورودی‌های مؤثر:</b> Q بر حسب L/min، مدت تأمین بر حسب دقیقه و درصد اطمینان.</p>
<p><b>ابعاد نمایشی:</b> برای مخزن مکعبی، ضلع از ریشه سوم حجم محاسبه می‌شود. برای مخزن استوانه‌ای، ابزار صرفاً حالت D=H را برای یک برآورد هندسی نمایش می‌دهد.</p>
<div class="basisNote">⚠️ این ابزار محاسبه حجمی است. مدت تأمین، دبی‌های همزمان، حجم غیرقابل‌استفاده، ذخیره اختصاصی و سناریوی حریق باید از مبنای طراحی و مرجع پروژه تعیین شوند؛ درصد اطمینان ورودی کاربر نیز الزام ثابت استاندارد محسوب نمی‌شود.</div>
</div></details>`;

insertBasisAfterResult('res4', basis4, 'calcBasis4');
insertBasisAfterResult('res5', basis5, 'calcBasis5');

const basis9 = `<details class="calcBasis" id="calcBasis9"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش فعلی ابزار:</b> مساحت طبقه بر سطح پوشش فرضی هر خاموش‌کننده تقسیم و نتیجه رو به بالا گرد می‌شود.</p>
<div class="formula">N = ceil(Area / Coverage)</div>
<p><b>خروجی:</b> برآورد اولیه تعداد و فاصله دسترسی فرضی بر اساس گروه خطر انتخابی.</p>
<div class="basisNote">⚠️ این محاسبه فقط برآورد اولیه است. انتخاب نهایی نوع، تعداد، ظرفیت/ریتینگ و جانمایی خاموش‌کننده به کلاس حریق، نوع تصرف، سطح خطر، فاصله دسترسی و مرجع پروژه وابسته است؛ اعداد پوشش داخلی برنامه به‌تنهایی معیار نهایی NFPA 10 نیستند.</div>
</div></details>`;

const basis10 = `<details class="calcBasis" id="calcBasis10"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش ترجیحی — داده سازنده:</b> هوای احتراق و گرمای دفع‌شده به اتاق مستقیماً از دیتاشیت همان موتور/ژنراتور گرفته می‌شوند. هوای لازم برای دفع گرما از موازنه حرارتی هوا محاسبه می‌شود.</p>
<div class="formula">Qcool = Heat × 3600 / (ρ × cp × ΔT)<br>ρ = 1.2 kg/m³ &nbsp; | &nbsp; cp = 1.005 kJ/kg·K<br>Qtotal = (Qcomb + Qcool) × (1 + Margin/100)</div>
<p><b>حاشیه طراحی:</b> در حالت داده سازنده پیش‌فرض صفر است و فقط با مبنای مشخص پروژه تغییر داده می‌شود.</p>
<p><b>حالت برآورد اولیه:</b> برای سازگاری با محاسبات قبلی برنامه حفظ شده و از ضرایب داخلی قدیمی ۲٫۴، ۰٫۳۵/۰٫۱۰، ۲۹۸۵ و ۱۰٪ استفاده می‌کند.</p>
<div class="basisNote">⚠️ حالت برآورد، طراحی نهایی نیست و ضرایب آن الزام عمومی مبحث ۱۴ یا NFPA تلقی نمی‌شوند. برای طراحی نهایی، داده سازنده همان تجهیز، مسیر واقعی ورود/خروج هوا، افت فشار لوورها/کانال و شرایط پروژه کنترل شود.</div>
</div></details>`;

const basis11 = `<details class="calcBasis" id="calcBasis11"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش فعلی ابزار:</b> دبی کل به‌طور مساوی بین شاخه‌ها تقسیم می‌شود؛ فشار نازل از K-Factor، افت ارتفاع از هد استاتیکی و افت اصطکاک/اتصالات از ورودی کاربر گرفته می‌شود.</p>
<div class="formula">Qbranch = Qtotal / N<br>Pnozzle = (Qbranch/K)²<br>Pelev = ρgΔz/100000<br>Pdesign = (Pnozzle + Pfriction + Pfittings + Pelev) × (1 + Margin/100)</div>
<div class="basisNote">⚠️ تقسیم مساوی دبی بین شاخه‌ها یک ساده‌سازی است و جایگزین حل گره‌به‌گره شبکه نیست. افت‌های مسیر و حاشیه طراحی باید از شبکه و مبنای واقعی پروژه تعیین شوند.</div>
</div></details>`;

const basis12 = `<details class="calcBasis" id="calcBasis12"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش:</b> برای هر یک از شش سگمنت ورودی، سرعت، افت Hazen–Williams، افت موضعی بر اساس K و اثر ارتفاع محاسبه و سپس با فشار باقیمانده و افت تجهیزات جمع می‌شود.</p>
<div class="formula">v = Q/A<br>ΔPlocal = Kρv²/2/100000<br>Pbase = Presidual + ΣΔPfriction + ΣΔPlocal + ΣΔPelev + Pequipment<br>Pdesign = Pbase × (1 + Margin/100)</div>
<div class="basisNote">⚠️ ابزار مسیر واردشده را محاسبه می‌کند؛ خودش کل شبکه را حل نمی‌کند و اثبات نمی‌کند این مسیر واقعاً بحرانی‌ترین مسیر شبکه است. دبی سگمنت‌ها، قطر داخلی، C، K، فشار باقیمانده و حاشیه باید از سناریوی واقعی پروژه تعیین شوند. کنترل ۶ m/s نیز در این مرحله معیار داخلی/پروژه است، نه حد عمومی و قطعی NFPA 13 تا زمانی که بند دقیق مرجع تأیید شود.</div>
</div></details>`;

insertBasisAfterResult('res9', basis9, 'calcBasis9');
insertBasisAfterResult('res10', basis10, 'calcBasis10');
insertBasisAfterResult('hydChainRes', basis11, 'calcBasis11');
insertBasisAfterResult('res12', basis12, 'calcBasis12');

const basis13 = `<details class="calcBasis" id="calcBasis13"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">
<p><b>روش ممیزی:</b> حجم پارکینگ از ابعاد محاسبه می‌شود. ACH واقعی از نسبت دبی فن تخلیه عادی به حجم پارکینگ و نسبت هوای جبرانی از دبی جبرانی به دبی تخلیه به‌دست می‌آید.</p>
<div class="formula">V = L × W × H<br>ACH = Qfan / V<br>Makeup% = Qmakeup / Qfan × 100</div>
<p><b>کنترل قبولی:</b> اگر مقدار عددی الزام مبحث ۱۴ توسط کاربر وارد شده باشد، دبی فن با همان مقدار مقایسه می‌شود. نسبت هوای جبرانی نیز با حداقل درصد واردشده کنترل می‌شود. دبی حالت حریق جداگانه ثبت می‌شود و در این ابزار به‌تنهایی معیار قبولی حریق نیست.</p>
<div class="basisNote">⚠️ این بخش عمداً عدد الزام‌آور مبحث ۱۴ را حدس نمی‌زند. مقدار الزام باید از بند/جدول قابل استناد نسخه مقرراتی پروژه وارد شود. «پیش‌فرض مبحث ۳» فقط داده‌ای را اعمال می‌کند که در منطق فعلی ابزار برای مبحث ۳ تعریف شده و جایگزین بررسی کامل مبحث ۱۴ و شرایط پروژه نیست.</div>
</div></details>`;

insertBasisAfterResult('parkingVentAuditRes', basis13, 'calcBasis13');



if (!androidHtml.includes('id="calcBasis1"') || !androidHtml.includes('id="calcBasis2"') || !androidHtml.includes('id="calcBasis3"') || !androidHtml.includes('id="calcBasis4"') || !androidHtml.includes('id="calcBasis5"') || !androidHtml.includes('id="calcBasis6"') || !androidHtml.includes('id="calcBasis7"') || !androidHtml.includes('id="calcBasis8"') || !androidHtml.includes('id="calcBasis9"') || !androidHtml.includes('id="calcBasis10"') || !androidHtml.includes('id="calcBasis11"') || !androidHtml.includes('id="calcBasis12"') || !androidHtml.includes('id="calcBasis13"')) {
  throw new Error('Android calc basis: generated basis panels missing');
}
if (!androidHtml.includes('جدول طول معادل اتصالات و روش تطبیق آن') || !androidHtml.includes('این بخش جایگزین محاسبه هیدرولیکی شبکه نیست') || !androidHtml.includes('دقیق‌تر — داده سازنده') || !androidHtml.includes('Qcool = Heat × 3600')) {
  throw new Error('Android calc basis: safety wording missing');
}

/* FEP-ANDROID-LEGACY-CALC-BASIS-AUDIT-v1
   Runs after calcBasis panels have been inserted. */
const basis2Start=androidHtml.indexOf('<details class="calcBasis" id="calcBasis2">');
const basis2End=basis2Start>=0?androidHtml.indexOf('</details>',basis2Start):-1;
if(basis2Start<0||basis2End<0)throw new Error('Android calc audit: missing calcBasis2');
const basis2New='<details class="calcBasis" id="calcBasis2"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">'+
'<p><b>روش:</b> برآورد تقاضای آب با روش چگالی × مساحت انجام می‌شود و تقاضای هوز ترکیبی به آن افزوده می‌شود.</p>'+
'<div class="formula">Qspr = Density × Effective Area<br>Qtotal = Qspr + Qhose</div>'+
'<p><b>کنترل ناحیه:</b> در این روش کلاسیک، برای LH/OH حداقل 139 m² و برای EH حداقل 232 m² در محاسبه اعمال می‌شود.</p>'+
'<div class="basisNote">⚠️ جدول داخلی این ابزار برای نقاط کلاسیک density/area و تقاضای هوز با NFPA 13 ممیزی شده است: هوز ترکیبی LH/OH/EH به‌ترتیب 380/950/1900 L/min. این ابزار جایگزین محاسبه هیدرولیکی کامل یا کنترل ویرایش دقیق پروژه نیست.</div>'+
'</div></details>';
androidHtml=androidHtml.slice(0,basis2Start)+basis2New+androidHtml.slice(basis2End+'</details>'.length);

const basis7Start=androidHtml.indexOf('<details class="calcBasis" id="calcBasis7">');
const basis7End=basis7Start>=0?androidHtml.indexOf('</details>',basis7Start):-1;
if(basis7Start<0||basis7End<0)throw new Error('Android calc audit: missing calcBasis7');
const basis7New='<details class="calcBasis" id="calcBasis7"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">'+
'<p><b>روش فعلی ابزار:</b> جریان عبوری از بازشو و سطح نشتی با رابطه اختلاف فشار برآورد و در پایان ۱۵٪ ضریب اطمینان داخلی اعمال می‌شود.</p>'+
'<div class="formula">Q = Cd × A × √(2ΔP/ρ)<br>Cd = 0.65 &nbsp; | &nbsp; ρ = 1.2 kg/m³<br>Qfan = (Qopen + Qleak) × 1.15</div>'+
'<p><b>درب بسته:</b> سطح نشتی پایه ابزار برابر ۱٪ مجموع سطح درهای بسته است و درصد نشتی ورودی کاربر نیز اعمال می‌شود.</p>'+
'<div class="basisNote">⚠️ Cd=0.65، نشتی پایه ۱٪، ضریب اطمینان ۱۵٪ و تبدیل ارتفاع به تعداد طبقات با تقسیم بر ۳ فرض‌های داخلی این ابزار هستند. جریان «درب باز» در این نسخه با رابطه بازشو و همان ΔP محاسبه می‌شود و نباید با معیار سرعت عبور از در باز در سایر ضوابط اشتباه شود. انتخاب نهایی فن باید سناریوی پروژه، مسیرهای واقعی نشت، نیروی بازکردن در و مرجع دقیق را کنترل کند.</div>'+
'</div></details>';
androidHtml=androidHtml.slice(0,basis7Start)+basis7New+androidHtml.slice(basis7End+'</details>'.length);

const basis9Start=androidHtml.indexOf('<details class="calcBasis" id="calcBasis9">');
const basis9End=basis9Start>=0?androidHtml.indexOf('</details>',basis9Start):-1;
if(basis9Start<0||basis9End<0)throw new Error('Android calc audit: missing calcBasis9');
const basis9New='<details class="calcBasis" id="calcBasis9"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">'+
'<p><b>دامنه:</b> این ابزار فقط برای جانمایی اولیه خاموش‌کننده‌های <b>Class A</b> است.</p>'+
'<div class="formula">Area/ext = min(1045, A-rating × Area-per-unit-A)<br>N = ceil(Area / Area/ext)</div>'+
'<p><b>مقادیر مبنا:</b> سطح پوشش هر واحد A برای خطر کم/متوسط/زیاد به‌ترتیب 279 / 139 / 92.9 m² است؛ حداقل ریتینگ تکی 2-A / 2-A / 4-A و حداکثر فاصله دسترسی Class A برابر 22.9 m کنترل می‌شود.</p>'+
'<div class="basisNote">⚠️ نتیجه فقط Class A را پوشش می‌دهد. خطرهای Class B/C/D/K، شکل واقعی مسیر دسترسی، موانع و انتخاب نوع خاموش‌کننده باید جداگانه با NFPA 10 و مرجع پروژه کنترل شوند.</div>'+
'</div></details>';
androidHtml=androidHtml.slice(0,basis9Start)+basis9New+androidHtml.slice(basis9End+'</details>'.length);

if(!androidHtml.includes('هوز ترکیبی LH/OH/EH به‌ترتیب 380/950/1900 L/min') ||
   !androidHtml.includes('جریان «درب باز» در این نسخه') ||
   !androidHtml.includes('Area/ext = min(1045, A-rating × Area-per-unit-A)')){
  throw new Error('Android post-basis engineering audit missing');
}

/* FEP-ANDROID-PIPE-SIZING-BASIS-UNIT-FIX-v1
   Runs after calcBasis8 is generated. */
const pipeBasisStart=androidHtml.indexOf('<details class="calcBasis" id="calcBasis8">');
const pipeBasisEnd=pipeBasisStart>=0?androidHtml.indexOf('</details>',pipeBasisStart):-1;
if(pipeBasisStart<0||pipeBasisEnd<0)throw new Error('Android pipe sizing basis panel missing');
let pipeBasis=androidHtml.slice(pipeBasisStart,pipeBasisEnd+'</details>'.length);
pipeBasis=pipeBasis.replace(
  '<p><b>روش:</b> این ابزار دبی ورودی بر حسب GPM را با جدول داخلی دبی–سایز مقایسه و اولین سایز اسمی دارای ظرفیت جدولی کافی را پیشنهاد می‌کند.</p>',
  '<p><b>روش:</b> ورودی کاربر بر حسب GPM است؛ برنامه ابتدا آن را به L/min تبدیل می‌کند و سپس با جدول داخلی دبی–سایز که آستانه‌های آن بر حسب L/min هستند مقایسه می‌کند.</p>'
);
if(!pipeBasis.includes('آستانه‌های آن بر حسب L/min هستند'))throw new Error('Android pipe sizing basis unit wording missing');
androidHtml=androidHtml.slice(0,pipeBasisStart)+pipeBasis+androidHtml.slice(pipeBasisEnd+'</details>'.length);

/* FEP-ANDROID-STAIR-PRESSURE-BASIS-v1
   Runs after calcBasis7 generation. */
const stairBasisStart2=androidHtml.indexOf('<details class="calcBasis" id="calcBasis7">');
const stairBasisEnd2=stairBasisStart2>=0?androidHtml.indexOf('</details>',stairBasisStart2):-1;
if(stairBasisStart2<0||stairBasisEnd2<0)throw new Error('Android calcBasis7 missing for open-door update');
const stairBasisNew2='<details class="calcBasis" id="calcBasis7"><summary>📘 مبنای محاسبه و توضیحات</summary><div class="calcBasisBody">'+
'<p><b>روش:</b> سناریوی درب باز و درب بسته جدا محاسبه می‌شوند.</p>'+
'<div class="formula">Qopen = Adoor × Vopen<br>Qleak = Cd × Aleak × √(2ΔP/ρ)<br>Qfan = (Qopen,total + Qleak) × 1.15</div>'+
'<p><b>درب باز:</b> سرعت طراحی Vopen ورودی کاربر است؛ مقدار پیش‌فرض ابزار 1.0 m/s است و الزام عمومی تلقی نمی‌شود.</p>'+
'<p><b>درب بسته:</b> رابطه اختلاف فشار فقط برای نشتی معادل درب‌های بسته استفاده می‌شود.</p>'+
'<div class="basisNote">⚠️ Cd=0.65، نشتی پایه ۱٪، ضریب اطمینان ۱۵٪ و تبدیل ارتفاع به تعداد طبقات با تقسیم بر ۳ همچنان فرض‌های داخلی ابزار هستند. فشار هدف 25 تا 90 Pa کنترل می‌شود، اما انتخاب نهایی فن باید سناریوی پروژه، نیروی بازکردن در، مسیرهای واقعی نشت و مرجع دقیق طراحی را کنترل کند.</div>'+
'</div></details>';
androidHtml=androidHtml.slice(0,stairBasisStart2)+stairBasisNew2+androidHtml.slice(stairBasisEnd2+'</details>'.length);
if(!androidHtml.includes('Qopen = Adoor × Vopen') || !androidHtml.includes('سرعت طراحی Vopen ورودی کاربر است')){
  throw new Error('Android stair pressure basis update missing');
}

/* FEP-ANDROID-PARKING-VENT-BASIS-v2
   Runs after calcBasis13 generation. */
const pvBasisStart=androidHtml.indexOf('<details class="calcBasis" id="calcBasis13">');
const pvBasisEnd=pvBasisStart>=0?androidHtml.indexOf('</details>',pvBasisStart):-1;
if(pvBasisStart<0||pvBasisEnd<0)throw new Error('Android calcBasis13 missing');
let pvBasis=androidHtml.slice(pvBasisStart,pvBasisEnd+'</details>'.length);
pvBasis=pvBasis.replace(
  '<div class="basisNote">⚠️ این بخش عمداً عدد الزام‌آور مبحث ۱۴ را حدس نمی‌زند. مقدار الزام باید از بند/جدول قابل استناد نسخه مقرراتی پروژه وارد شود. «پیش‌فرض مبحث ۳» فقط داده‌ای را اعمال می‌کند که در منطق فعلی ابزار برای مبحث ۳ تعریف شده و جایگزین بررسی کامل مبحث ۱۴ و شرایط پروژه نیست.</div>',
  '<div class="basisNote">⚠️ این بخش عمداً عدد الزام‌آور تهویه عادی یا نسبت هوای جبرانی را حدس نمی‌زند. مقدارهای مرجع باید از مبحث ۱۴/طرح مصوب پروژه وارد شوند. برای حالت حریق نیز دبی و سناریوی کنترل دود باید با مرجع قابل اعمال پروژه کنترل شود؛ دکمه راهنما هیچ عددی را در فرم تغییر نمی‌دهد.</div>'
);
if(!pvBasis.includes('دکمه راهنما هیچ عددی را در فرم تغییر نمی‌دهد'))throw new Error('Android parking ventilation basis update missing');
androidHtml=androidHtml.slice(0,pvBasisStart)+pvBasis+androidHtml.slice(pvBasisEnd+'</details>'.length);

/* FEP-ANDROID-PARKING-CAR-RATE-BASIS-v1
   Runs after calcBasis1 generation and prior basis audits. */
const parkingBasisStart=androidHtml.indexOf('<details class="calcBasis" id="calcBasis1">');
const parkingBasisEnd=parkingBasisStart>=0?androidHtml.indexOf('</details>',parkingBasisStart):-1;
if(parkingBasisStart<0||parkingBasisEnd<0)throw new Error('Android calcBasis1 missing for parking car-rate update');
let parkingBasis=androidHtml.slice(parkingBasisStart,parkingBasisEnd+'</details>'.length);
parkingBasis=parkingBasis
 .replace('Qcar = Ncars × 920 m³/h','Qcar = Ncars × CarRate')
 .replace('ابعاد پارکینگ، ACH، تعداد خودرو و درصد هوای جبرانی.','ابعاد پارکینگ، ACH، تعداد خودرو، نرخ فرضی هر خودرو و درصد هوای جبرانی.')
 .replace('⚠️ ضریب ۹۲۰ m³/h برای هر خودرو و انتخاب بزرگ‌ترِ دو روش، منطق داخلی فعلی برنامه است. در فایل‌های مرجع پروژه‌ای که اکنون قابل استناد بودند، مبنای کافی برای معرفی این عدد و این قاعده به‌عنوان الزام قطعی مقررات پیدا نشد؛ بنابراین نتیجه باید برآورد اولیه تلقی و با سناریوی کنترل دود/تهویه و مرجع دقیق پروژه کنترل شود.','⚠️ نرخ پیش‌فرض ۹۲۰ m³/h برای هر خودرو فقط فرض داخلی اولیه و قابل‌ویرایش است؛ انتخاب بزرگ‌ترِ دو روش نیز منطق داخلی ابزار است. این مقادیر الزام قطعی مقرراتی تلقی نمی‌شوند و باید با سناریوی تهویه/کنترل دود و مرجع دقیق پروژه تطبیق داده شوند.');
if(!parkingBasis.includes('Qcar = Ncars × CarRate') || !parkingBasis.includes('نرخ فرضی هر خودرو') || !parkingBasis.includes('قابل‌ویرایش است')){
  throw new Error('Android parking car-rate basis update missing');
}
androidHtml=androidHtml.slice(0,parkingBasisStart)+parkingBasis+androidHtml.slice(parkingBasisEnd+'</details>'.length);

if(!androidHtml.includes('id="fepEngineeringHelpRuntime"') ||
   !androidHtml.includes('fepBindEngineeringHelp') ||
   !androidHtml.includes('❓ راهنمای ابزارها')){
  throw new Error('Final Android output lost engineering help runtime');
}

/* FEP-ANDROID-FLOOR-NOTE-BORDER-v1 */
const floorNoteBorderCss="<style id=\"fepFloorNoteBorderFix\">\n#sec-floors #flNote{\n  display:block!important;width:100%!important;box-sizing:border-box!important;\n  border:1px solid var(--line)!important;border-block:1px solid var(--line)!important;border-inline:1px solid var(--line)!important;\n  border-radius:14px!important;outline:none!important;box-shadow:none!important;\n  background:var(--surface,#fff)!important;-webkit-appearance:none!important;appearance:none!important;\n}\n#sec-floors #flNote:focus,#sec-floors #flNote:focus-visible{\n  border:1px solid var(--brand)!important;border-block:1px solid var(--brand)!important;border-inline:1px solid var(--brand)!important;\n  outline:2px solid color-mix(in srgb,var(--brand) 16%,transparent)!important;outline-offset:1px!important;box-shadow:none!important;\n}\n</style>";
const floorNoteBorderMarker='<!-- FEP-ANDROID-FLOOR-NOTE-BORDER-v1 -->';
if(!androidHtml.includes('id="fepFloorNoteBorderFix"')){
 const floorNoteHeadClose=androidHtml.indexOf('</head>');
 if(floorNoteHeadClose<0)throw new Error('Android floor note border fix: </head> not found');
 androidHtml=androidHtml.slice(0,floorNoteHeadClose)+floorNoteBorderMarker+floorNoteBorderCss+androidHtml.slice(floorNoteHeadClose);
}
if(!androidHtml.includes('id="flNote"')||!androidHtml.includes('id="fepFloorNoteBorderFix"')||!androidHtml.includes('FEP-ANDROID-FLOOR-NOTE-BORDER-v1'))throw new Error('Android floor note border fix missing');


/* FEP-ANDROID-REFERENCE-FULLSCREEN-v10 */
const fepEvidenceFullscreenCss="<style id=\"fepEvidenceFullscreenStyle\">\n#intelligenceEvidenceModal.fepEvidenceFullscreen{padding:0!important;align-items:stretch!important;justify-content:stretch!important;background:#555!important}\n#intelligenceEvidenceModal.fepEvidenceFullscreen .intelligenceEvidenceBox{position:relative!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important;background:#555!important}\n#intelligenceEvidenceModal.fepEvidenceFullscreen .intelligenceEvidenceBox>.cardHead{position:absolute!important;z-index:30!important;top:max(6px,env(safe-area-inset-top))!important;left:6px!important;right:auto!important;width:auto!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;pointer-events:none!important}\n#intelligenceEvidenceModal.fepEvidenceFullscreen .intelligenceEvidenceBox>.cardHead>div:first-child{display:none!important}\n#intelligenceEvidenceModal .fepEvidenceHeadActions{display:flex;align-items:center;gap:5px;pointer-events:auto}\n#intelligenceEvidenceModal.fepEvidenceFullscreen .fepEvidenceHeadActions{padding:3px;border-radius:12px;background:rgba(20,20,22,.48)}\n#fepEvidenceFullscreenBtn,#intelligenceEvidenceModal.fepEvidenceFullscreen #btnIntelligenceEvidenceClose{display:inline-grid!important;place-items:center!important;min-width:36px!important;width:36px!important;height:36px!important;padding:0!important;border-radius:9px!important;font:900 16px/1 inherit!important}\n#intelligenceEvidenceModal.fepEvidenceFullscreen #fepEvidenceFullscreenBtn,#intelligenceEvidenceModal.fepEvidenceFullscreen #btnIntelligenceEvidenceClose{border:1px solid rgba(255,255,255,.22)!important;background:rgba(255,255,255,.12)!important;color:#fff!important}\n#intelligenceEvidenceModal.fepEvidenceFullscreen .intelligenceEvidenceImageWrap{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;overflow:auto!important;overscroll-behavior:contain!important;touch-action:none!important;background:#555!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important}\n#intelligenceEvidenceModal.fepEvidenceFullscreen .intelligenceEvidenceImageWrap::-webkit-scrollbar{display:none!important}\n#fepEvidenceCropStage{position:relative!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important;transform-origin:0 0!important}\n#fepEvidenceCropStage #intelligenceEvidenceImage{position:absolute!important;display:block!important;max-width:none!important;min-width:0!important;height:auto!important;max-height:none!important;max-width:none!important;aspect-ratio:auto!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;user-select:none!important;-webkit-user-select:none!important;-webkit-user-drag:none!important}\nbody.fepEvidenceFullscreenOpen{overflow:hidden!important}\n</style>";
const fepEvidenceFullscreenJs="<script id=\"fepEvidenceFullscreenScript\">\n/* FEP-ANDROID-REFERENCE-FULLSCREEN-v10 */\n(function(){\n const S={zoom:1,startZoom:1,startDist:0,ax:0,ay:0,lastX:0,lastY:0,pinch:false,crop:null,lastTap:0};\n const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));\n const modal=()=>document.getElementById('intelligenceEvidenceModal');\n const wrap=()=>modal()?.querySelector('.intelligenceEvidenceImageWrap')||null;\n const img=()=>document.getElementById('intelligenceEvidenceImage');\n const btn=()=>document.getElementById('fepEvidenceFullscreenBtn');\n function stage(){\n   const w=wrap(),im=img();if(!w||!im)return null;\n   let st=document.getElementById('fepEvidenceCropStage');\n   if(!st){st=document.createElement('div');st.id='fepEvidenceCropStage';im.parentNode.insertBefore(st,im);st.appendChild(im);}\n   return st;\n }\n function detectCrop(){\n   const im=img();if(!im||!im.naturalWidth||!im.naturalHeight)return null;\n   try{\n     const max=900,k=Math.min(1,max/im.naturalWidth,max/im.naturalHeight);\n     const cw=Math.max(1,Math.round(im.naturalWidth*k)),ch=Math.max(1,Math.round(im.naturalHeight*k));\n     const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const x=cv.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,cw,ch);\n     const d=x.getImageData(0,0,cw,ch).data;\n     const rowNeed=Math.max(5,Math.floor(cw*0.007));\n     const dark=p=>((d[p]*299+d[p+1]*587+d[p+2]*114)/1000)<205;\n     let minY=-1,maxY=-1;\n     for(let y=0;y<ch;y++){let n=0;for(let xx=0;xx<cw;xx+=2){const p=(y*cw+xx)*4;if(dark(p)&&++n>=rowNeed){minY=y;break;}}if(minY>=0)break;}\n     for(let y=ch-1;y>=0;y--){let n=0;for(let xx=0;xx<cw;xx+=2){const p=(y*cw+xx)*4;if(dark(p)&&++n>=rowNeed){maxY=y;break;}}if(maxY>=0)break;}\n     if(minY<0||maxY<minY)return {x:0,y:0,w:im.naturalWidth,h:im.naturalHeight};\n     const contentH=maxY-minY+1,colNeed=Math.max(3,Math.floor(contentH*0.004));\n     let minX=-1,maxX=-1;\n     for(let xx=0;xx<cw;xx++){let n=0;for(let y=minY;y<=maxY;y+=2){const p=(y*cw+xx)*4;if(dark(p)&&++n>=colNeed){minX=xx;break;}}if(minX>=0)break;}\n     for(let xx=cw-1;xx>=0;xx--){let n=0;for(let y=minY;y<=maxY;y+=2){const p=(y*cw+xx)*4;if(dark(p)&&++n>=colNeed){maxX=xx;break;}}if(maxX>=0)break;}\n     if(minX<0||maxX<minX){minX=0;maxX=cw-1;}\n     const padX=Math.max(8,Math.round((maxX-minX+1)*0.025)),padY=Math.max(6,Math.round((maxY-minY+1)*0.018));\n     minX=Math.max(0,minX-padX);maxX=Math.min(cw-1,maxX+padX);minY=Math.max(0,minY-padY);maxY=Math.min(ch-1,maxY+padY);\n     const crop={x:minX/k,y:minY/k,w:(maxX-minX+1)/k,h:(maxY-minY+1)/k};\n     if((crop.w*crop.h)/(im.naturalWidth*im.naturalHeight)<0.12)return {x:0,y:0,w:im.naturalWidth,h:im.naturalHeight};\n     return crop;\n   }catch(e){console.warn('[FEP viewer] density crop fallback',e);return {x:0,y:0,w:im.naturalWidth,h:im.naturalHeight};}\n }\n function render(){\n   const w=wrap(),im=img(),st=stage();if(!w||!im||!st||!S.crop)return;\n   const base=w.clientWidth/S.crop.w,sc=base*S.zoom;\n   st.style.width=(S.crop.w*sc)+'px';st.style.height=(S.crop.h*sc)+'px';\n   im.style.setProperty('width',(im.naturalWidth*sc)+'px','important');\n   im.style.left=(-S.crop.x*sc)+'px';im.style.top=(-S.crop.y*sc)+'px';\n }\n function prepareCrop(){\n   const im=img();if(!im)return;\n   const go=()=>{S.crop=detectCrop();S.zoom=1;render();const w=wrap();if(w){w.scrollLeft=0;w.scrollTop=0;}};\n   if(im.complete&&im.naturalWidth)go();else im.addEventListener('load',go,{once:true});\n }\n function setZoom(next,fx,fy){\n   const w=wrap();if(!w)return;const old=S.zoom||1,r=w.getBoundingClientRect(),x=Number.isFinite(fx)?fx:r.width/2,y=Number.isFinite(fy)?fy:r.height/2,bx=(w.scrollLeft+x)/old,by=(w.scrollTop+y)/old;\n   S.zoom=clamp(next,1,5);render();requestAnimationFrame(()=>{w.scrollLeft=Math.max(0,bx*S.zoom-x);w.scrollTop=Math.max(0,by*S.zoom-y);});\n }\n function reset(){S.zoom=1;S.startDist=0;S.pinch=false;render();const w=wrap();if(w){w.scrollLeft=0;w.scrollTop=0;}}\n const dist=(a,b)=>Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);\n const mid=(a,b,r)=>({x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top});\n function bind(){\n   const w=wrap();if(!w||w.dataset.fepCropPinch==='1')return;w.dataset.fepCropPinch='1';\n   w.addEventListener('touchstart',e=>{if(e.touches.length===2){e.preventDefault();const r=w.getBoundingClientRect(),m=mid(e.touches[0],e.touches[1],r);S.pinch=true;S.startDist=dist(e.touches[0],e.touches[1]);S.startZoom=S.zoom;S.ax=(w.scrollLeft+m.x)/S.zoom;S.ay=(w.scrollTop+m.y)/S.zoom;}else if(e.touches.length===1){S.pinch=false;S.lastX=e.touches[0].clientX;S.lastY=e.touches[0].clientY;}},{passive:false});\n   w.addEventListener('touchmove',e=>{if(e.touches.length===2&&S.startDist>0){e.preventDefault();const r=w.getBoundingClientRect(),m=mid(e.touches[0],e.touches[1],r);S.zoom=clamp(S.startZoom*dist(e.touches[0],e.touches[1])/S.startDist,1,5);render();w.scrollLeft=Math.max(0,S.ax*S.zoom-m.x);w.scrollTop=Math.max(0,S.ay*S.zoom-m.y);}else if(e.touches.length===1&&!S.pinch){e.preventDefault();const x=e.touches[0].clientX,y=e.touches[0].clientY;w.scrollLeft+=S.lastX-x;w.scrollTop+=S.lastY-y;S.lastX=x;S.lastY=y;}},{passive:false});\n   w.addEventListener('touchend',e=>{if(e.touches.length<2){S.startDist=0;S.pinch=false;}if(e.touches.length===0){const n=Date.now();if(n-S.lastTap<300){const r=w.getBoundingClientRect();S.zoom>1.05?reset():setZoom(2,r.width/2,r.height/2);S.lastTap=0;}else S.lastTap=n;}},{passive:false});\n   w.addEventListener('touchcancel',()=>{S.startDist=0;S.pinch=false;},{passive:false});\n }\n function sync(){const m=modal(),b=btn();if(!m||!b)return;const on=m.classList.contains('fepEvidenceFullscreen');b.textContent=on?'↙':'⛶';b.title=on?'خروج از تمام صفحه':'تمام صفحه';document.body.classList.toggle('fepEvidenceFullscreenOpen',on);}\n function set(on){const m=modal();if(!m)return;m.classList.toggle('fepEvidenceFullscreen',!!on);if(on){bind();setTimeout(prepareCrop,20);}else reset();sync();}\n function ensure(){\n   const m=modal();if(!m)return false;const close=document.getElementById('btnIntelligenceEvidenceClose');\n   if(close&&!btn()){const a=document.createElement('div');a.className='fepEvidenceHeadActions';const b=document.createElement('button');b.type='button';b.id='fepEvidenceFullscreenBtn';b.textContent='⛶';close.parentNode.insertBefore(a,close);a.appendChild(b);a.appendChild(close);b.addEventListener('click',()=>set(!m.classList.contains('fepEvidenceFullscreen')));}\n   if(close&&!close.dataset.fepFsBound){close.dataset.fepFsBound='1';close.addEventListener('click',()=>set(false));}\n   if(!m.dataset.fepFsObserver){m.dataset.fepFsObserver='1';new MutationObserver(()=>{const v=!m.classList.contains('hidden')&&m.getAttribute('aria-hidden')!=='true';if(v&&!m.classList.contains('fepEvidenceFullscreen'))set(true);if(!v&&m.classList.contains('fepEvidenceFullscreen'))set(false);}).observe(m,{attributes:true,attributeFilter:['class','aria-hidden']});}\n   bind();sync();return true;\n }\n if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();window.addEventListener('pageshow',ensure);window.addEventListener('resize',()=>{if(modal()?.classList.contains('fepEvidenceFullscreen'))render();});\n window.FEPReferenceFullscreen={enter:()=>set(true),exit:()=>set(false),reset,setScale:v=>setZoom(Number(v)||1),recrop:prepareCrop,getState:()=>({zoom:S.zoom,crop:S.crop,fullscreen:!!modal()?.classList.contains('fepEvidenceFullscreen')}),ensure};\n})();\n</script>";
if(!androidHtml.includes('id="fepEvidenceFullscreenStyle"')){const p=androidHtml.indexOf('</head>');if(p<0)throw new Error('reference fullscreen: head missing');androidHtml=androidHtml.slice(0,p)+fepEvidenceFullscreenCss+androidHtml.slice(p);}
if(!androidHtml.includes('id="fepEvidenceFullscreenScript"')){const p=androidHtml.lastIndexOf('</body>');if(p<0)throw new Error('reference fullscreen: body missing');androidHtml=androidHtml.slice(0,p)+fepEvidenceFullscreenJs+androidHtml.slice(p);}
for(const token of ['id="intelligenceEvidenceModal"','id="intelligenceEvidenceImage"','id="btnIntelligenceEvidenceClose"','FEP-ANDROID-REFERENCE-FULLSCREEN-v10'])if(!androidHtml.includes(token))throw new Error('reference fullscreen missing '+token);

await writeFile(androidIndex, androidHtml, 'utf8');

console.log(`Prepared ${files.length} Fire Executive Pro web assets in www/`);

/* FEP-ANDROID-PUMP-CURVE-SYNTAX-FIX-v1 */

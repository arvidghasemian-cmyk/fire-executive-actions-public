import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('www/index.html','utf8');
const ok=(v,msg)=>{if(!v)throw new Error(msg);};
const has=s=>ok(html.includes(s),'missing project-integrity marker: '+s);

[
  "FEP-PREINIT-DATA-GUARD-v1",
  "const FEP_PREINIT_PROJECT_DATA=defaultProjectData();",
  "const d=S&&S.data&&S.activeId?S.data[S.activeId]:null;",
  "return d||FEP_PREINIT_PROJECT_DATA;",
  "systemEquipment:[],topologyConnections:[],hydraulicBranchAnalysis:null,pumpDesignPoint:null,pumpCandidate:null",
  "const calcRunSignatures={},calcRunProjects={};",
  "calcRunProjects[n]=(typeof S!=='undefined'?S.activeId:'')",
  "calcRunProjects[n]!==S.activeId",
  "function clearProjectTransientUi()",
  "if(typeof renderNet==='function')renderNet()",
  "if(typeof renderPz==='function')renderPz()",
  "FEP_EQUIPMENT_PROJECT_MIGRATED_V1",
  "FEP_CONNECTIONS_PROJECT_MIGRATED_V1",
  "FEP-ANDROID-DATA-BACKUP-v14",
  "const PROJECT_STATE_KEY='fireExecState_v2'",
  "function validateProjectState(state)",
  "function syncBackupProjectState(local,indexed)",
  "project_snapshot_scope_mismatch",
  "FEP-ANDROID-PROJECT-BULK-DELETE-v2",
  "function projectPhotoIdsForRemoval(id)",
  "function retainedProjectPhotoIds(excluded)",
  "async function purgeProjectPhotosBeforeDelete(ids)",
  "await idbDel('photos',phid)",
  "async function deleteSelectedProjectsFromCenter()",
  "async function deleteProjectFromCenter(id)"
].forEach(has);

ok(!html.includes("localStorage.setItem('FEP_CONNECTIONS_V56',JSON.stringify(a));window.dispatchEvent(new CustomEvent('fep-topology-update'))"),
   'legacy global topology write remains');
ok(!html.includes("const calcRunSignatures={};"),'calculator result is not project-stamped');
ok(!html.includes("FEP-ANDROID-PROJECT-BULK-DELETE-v1"),'old project deletion patch marker remains');
ok(!html.includes("toast(' پروژه حذف شد')"),'project deletion still claims success without dependent-data cleanup wording');

const activeAssignments=[...html.matchAll(/S\.activeId\s*=\s*/g)];
ok(activeAssignments.length>=4,'too few active-project assignment paths were found');
for(const m of activeAssignments){
  const tail=html.slice(m.index,m.index+900);
  ok(tail.includes('refreshAllUI()'),'active project can change without a scoped UI refresh near offset '+m.index);
}

function extractFunction(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0)throw new Error('function not found: '+name);
  const brace=html.indexOf('{',start);
  if(brace<0)throw new Error('function brace not found: '+name);
  let depth=0,quote=null,escape=false;
  for(let i=brace;i<html.length;i++){
    const ch=html[i];
    if(quote){
      if(escape){escape=false;continue;}
      if(ch==='\\'){escape=true;continue;}
      if(ch===quote){quote=null;continue;}
      continue;
    }
    if(ch==="'"||ch==='"'||ch.charCodeAt(0)===96){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0)return html.slice(start,i+1);
    }
  }
  throw new Error('unbalanced function: '+name);
}

const reportFn=extractFunction('buildReportHTML');
const photoFn=extractFunction('collectPhotoMap');
ok(reportFn.includes('const d=D()'),'report does not read the active project data bucket');
ok(reportFn.includes('S.projects.find(p=>p.id===S.activeId)'),'report project metadata is not tied to activeId');
ok(reportFn.includes('const hydraulicNetwork=d.hydraulicNetwork'),'hydraulic report is not sourced from active project data');
ok(reportFn.includes('const hydraulicAnalysis=d.hydraulicBranchAnalysis'),'hydraulic analysis report is not project-scoped');
ok(reportFn.includes('const pumpPoint=d.pumpDesignPoint'),'pump report is not project-scoped');
ok(reportFn.includes('const pumpCandidate=d.pumpCandidate'),'pump candidate report is not project-scoped');
ok(photoFn.includes("D()?.ncrs"),'report photo collection is not scoped to active project NCRs');
ok(!reportFn.includes("FEP_EQUIPMENT_V55")&&!reportFn.includes("FEP_CONNECTIONS_V56"),'report still reads legacy global equipment/topology storage');

const fnNames=['parseProjectStateValue','validateProjectState','findIndexedProjectState','syncBackupProjectState'];
const code="const PROJECT_STATE_KEY='fireExecState_v2';\n"+fnNames.map(extractFunction).join('\n')+
  '\nglobalThis.__validateProjectState=validateProjectState;globalThis.__syncBackupProjectState=syncBackupProjectState;';
const sandbox={};
vm.runInNewContext(code,sandbox,{timeout:1000});
const validate=sandbox.__validateProjectState;
const sync=sandbox.__syncBackupProjectState;

function projectData(projectId,tag){
  return {
    meta:{address:tag},
    hydraulicNetwork:{nodes:[{id:'N1'}],pipes:[]},
    systemEquipment:[{id:'EQ-'+tag}],
    topologyConnections:[{id:'C-'+tag}],
    hydraulicBranchAnalysis:{projectId,stale:false},
    pumpDesignPoint:{projectId,stale:false},
    pumpCandidate:{projectId,checkStale:false}
  };
}
function state(tagA='A',tagB='B'){
  return {
    theme:'light',
    activeId:'pA',
    projects:[{id:'pA',name:'A'},{id:'pB',name:'B'}],
    data:{pA:projectData('pA',tagA),pB:projectData('pB',tagB)}
  };
}
function mustThrow(fn,label){
  let threw=false;
  try{fn();}catch(_){threw=true;}
  ok(threw,label);
}

const good=state();
validate(good);
ok(good.data.pA.meta.address==='A'&&good.data.pB.meta.address==='B','synthetic project data mixed');

const duplicate=state();duplicate.projects[1].id='pA';
mustThrow(()=>validate(duplicate),'duplicate project IDs were accepted');

const missing=state();delete missing.data.pB;
mustThrow(()=>validate(missing),'missing project data was accepted');

const badActive=state();badActive.activeId='missing';
mustThrow(()=>validate(badActive),'invalid active project was accepted');

const badScope=state();badScope.data.pA.pumpCandidate.projectId='pB';
mustThrow(()=>validate(badScope),'cross-project pump snapshot was accepted');

const localState=state('LOCAL-A','LOCAL-B');
const dbState=state('OLD-A','OLD-B');
const local={fireExecState_v2:JSON.stringify(localState)};
const indexed={stores:{kv:{keyPath:null,entries:[{key:'state',value:dbState}]},photos:{keyPath:null,entries:[]}}};
const normalized=sync(local,indexed);
ok(normalized.data.pA.meta.address==='LOCAL-A','localStorage was not authoritative during backup harmonization');
const dbEntry=indexed.stores.kv.entries.find(e=>String(e.key)==='state');
ok(dbEntry&&dbEntry.value.data.pB.meta.address==='LOCAL-B','IndexedDB state was not harmonized to localStorage');

const localMissing={};
const indexedOnly={stores:{kv:{keyPath:null,entries:[{key:'state',value:state('DB-A','DB-B')}]}}};
sync(localMissing,indexedOnly);
ok(JSON.parse(localMissing.fireExecState_v2).data.pA.meta.address==='DB-A','IndexedDB fallback did not repopulate local state');

const localInvalid={fireExecState_v2:'{bad json'};
const indexedFallback={stores:{kv:{keyPath:null,entries:[{key:'state',value:state('FALLBACK-A','FALLBACK-B')}]}}};
sync(localInvalid,indexedFallback);
ok(JSON.parse(localInvalid.fireExecState_v2).data.pB.meta.address==='FALLBACK-B','invalid local state did not fall back to IndexedDB');

const localOnly={fireExecState_v2:JSON.stringify(state('ONLY-A','ONLY-B'))};
const indexedWithoutKv={stores:{photos:{keyPath:null,entries:[]}}};
sync(localOnly,indexedWithoutKv);
ok(indexedWithoutKv.stores.kv&&indexedWithoutKv.stores.kv.entries.some(e=>String(e.key)==='state'),'missing kv store was not created for backward-compatible restore');

const roundTrip=JSON.parse(JSON.stringify(state('RT-A','RT-B')));
roundTrip.data.pB.systemEquipment.push({id:'B-only'});
ok(roundTrip.data.pA.systemEquipment.length===1,'project arrays share data after JSON roundtrip');

const photoHelperCode=[
  extractFunction('projectPhotoIdsForRemoval'),
  extractFunction('retainedProjectPhotoIds'),
  extractFunction('purgeProjectPhotosBeforeDelete').replace(/^function /,'async function ')
].join('\n')+'\nglobalThis.__purgeProjectPhotosBeforeDelete=purgeProjectPhotosBeforeDelete;';
const deletedPhotos=[];
const photoSandbox={
  S:{
    projects:[{id:'pA'},{id:'pB'}],
    data:{
      pA:{photoMeta:{A_META:{}},ncrs:[{beforePhotos:['A_ONLY','SHARED'],afterPhotos:['A_AFTER']}]},
      pB:{photoMeta:{B_META:{}},ncrs:[{beforePhotos:['SHARED'],afterPhotos:['B_ONLY']}]}
    }
  },
  ncrPhotoIds:(n,which)=>which==='before'?(n.beforePhotos||[]):(n.afterPhotos||[]),
  idbDel:async(store,id)=>{ok(store==='photos','project photo purge touched a non-photo store');deletedPhotos.push(id);},
  photoCache:{A_META:'x',A_ONLY:'x',SHARED:'x',A_AFTER:'x',B_META:'x',B_ONLY:'x'}
};
vm.runInNewContext(photoHelperCode,photoSandbox,{timeout:1000});
await photoSandbox.__purgeProjectPhotosBeforeDelete(['pA']);
const deletedSet=new Set(deletedPhotos);
ok(deletedSet.has('A_META')&&deletedSet.has('A_ONLY')&&deletedSet.has('A_AFTER'),'removed-project photos were not purged');
ok(!deletedSet.has('SHARED'),'photo still referenced by a retained project was deleted');
ok(!deletedSet.has('B_META')&&!deletedSet.has('B_ONLY'),'retained-project photos were deleted');
ok(photoSandbox.photoCache.SHARED==='x'&&photoSandbox.photoCache.B_ONLY==='x','retained photo cache entries were removed');
ok(!Object.prototype.hasOwnProperty.call(photoSandbox.photoCache,'A_ONLY'),'removed-project photo cache entry remains');


console.log(JSON.stringify({
  status:'PASS',
  projects:2,
  projectStamp:true,
  networkUiRefresh:true,
  backupStateHarmonization:true,
  backwardCompatibleKvCreation:true,
  activeProjectRefreshPaths:activeAssignments.length,
  reportReadsActiveProject:true,
  reportPhotosReadActiveProject:true,
  deletionPurgesProjectPhotos:true,
  sharedPhotoReferencePreserved:true,
  scopeMismatchRejected:true
},null,2));

import coreWorker from './cost-management-v1.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,max=160)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const SENSITIVE=/(?:phone|mobile|address|postal|secret|token|password|passcode|api[_-]?key|webhook|session|cookie|authorization)/i;
function sameOrigin(request){const o=request.headers.get('origin');return !o||o===new URL(request.url).origin}
async function adminGuard(request,env){
 if(!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);
 const probe=new URL('/api/admin/orders?limit=1',request.url),r=await coreWorker.fetch(new Request(probe,{method:'GET',headers:request.headers}),env);
 if(!r.ok)return json({error:'نیاز به ورود مدیریت'},401);
 return null;
}
function safeValue(value,key='',depth=0){
 if(SENSITIVE.test(key))return '[مخفی]';
 if(depth>5)return '[خلاصه‌شده]';
 if(value==null||typeof value==='number'||typeof value==='boolean')return value;
 if(typeof value==='string')return value.length>400?value.slice(0,400)+'…':value;
 if(Array.isArray(value))return value.slice(0,20).map(v=>safeValue(v,'',depth+1));
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).slice(0,40).map(([k,v])=>[k,safeValue(v,k,depth+1)]));
 return String(value).slice(0,400);
}
function parseDetails(raw){try{return safeValue(JSON.parse(raw||'{}'))}catch{return {note:'جزئیات قدیمی قابل خواندن نیست'}}}
function dayBound(value,end=false){
 const v=clean(value,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;
 const d=new Date(v+(end?'T23:59:59.999Z':'T00:00:00.000Z'));return Number.isFinite(d.getTime())?d.toISOString():null;
}
async function facets(env){
 const [{results:actions=[]},{results:entities=[]}]=await Promise.all([
  env.DB.prepare('SELECT action,COUNT(*) count FROM audit_log GROUP BY action ORDER BY count DESC,action LIMIT 80').all(),
  env.DB.prepare('SELECT entity_type,COUNT(*) count FROM audit_log GROUP BY entity_type ORDER BY count DESC,entity_type LIMIT 40').all()
 ]);
 return {actions:actions.map(x=>({value:x.action,count:Number(x.count)||0})),entities:entities.map(x=>({value:x.entity_type,count:Number(x.count)||0}))};
}
async function trail(request,env,url){
 const denied=await adminGuard(request,env);if(denied)return denied;
 const beforeRaw=Number(url.searchParams.get('before')),before=Number.isSafeInteger(beforeRaw)&&beforeRaw>0?beforeRaw:Number.MAX_SAFE_INTEGER;
 const limitRaw=Number(url.searchParams.get('limit')),limit=Number.isSafeInteger(limitRaw)?Math.min(100,Math.max(10,limitRaw)):50;
 const action=clean(url.searchParams.get('action'),140),entity=clean(url.searchParams.get('entity'),80),q=clean(url.searchParams.get('q'),120),from=dayBound(url.searchParams.get('from')),to=dayBound(url.searchParams.get('to'),true);
 const where=['id<?'],bind=[before];
 if(action){where.push('action=?');bind.push(action)}
 if(entity){where.push('entity_type=?');bind.push(entity)}
 if(from){where.push('created_at>=?');bind.push(from)}
 if(to){where.push('created_at<=?');bind.push(to)}
 if(q){where.push('(action LIKE ? OR entity_type LIKE ? OR entity_id LIKE ?)');const like='%'+q+'%';bind.push(like,like,like)}
 const sql=`SELECT id,action,entity_type,entity_id,details_json,created_at FROM audit_log WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ?`;
 const {results=[]}=await env.DB.prepare(sql).bind(...bind,limit).all();
 const events=results.map(x=>({id:Number(x.id),action:x.action,entity_type:x.entity_type,entity_id:x.entity_id,created_at:x.created_at,details:parseDetails(x.details_json)}));
 return json({events,next_before:events.length===limit?events.at(-1).id:null,has_more:events.length===limit,facets:await facets(env),filters:{action,entity,q,from:from?from.slice(0,10):'',to:to?to.slice(0,10):''}});
}
export default{async fetch(request,env){const url=new URL(request.url);try{
 if(url.pathname==='/api/admin/audit-trail'&&request.method==='GET')return trail(request,env,url);
 if(url.pathname==='/api/health'&&request.method==='GET'){const r=await coreWorker.fetch(request,env),d=await r.json();return json({...d,audit_viewer:'filtered-v1'})}
 return coreWorker.fetch(request,env);
}catch(e){console.error(e);return url.pathname.startsWith('/api/')?json({error:'خطای داخلی سرور'},500):new Response('خطای داخلی سرور',{status:500})}}};

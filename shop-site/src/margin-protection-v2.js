import coreWorker from './margin-protection-v1.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function sameOrigin(request){const o=request.headers.get('origin');return !o||o===new URL(request.url).origin}
const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
export default{async fetch(request,env){const u=new URL(request.url);if(u.pathname.startsWith('/api/admin/margin-protection')&&!sameOrigin(request))return json({error:'درخواست از مبدأ نامعتبر است'},403);const r=await coreWorker.fetch(request,env);if(r.status===409&&/^\/api\/admin\/promotions\/(tiers|bundles)(?:\/\d+)?$/.test(u.pathname)){const d=await r.clone().json().catch(()=>null);if(d&&Number.isInteger(d.max_safe_percent))return json({...d,error:`این تخفیف از سقف امن حاشیه سود بیشتر است؛ حداکثر مجاز ${fa(d.max_safe_percent)}٪ است`},409)}return r}};

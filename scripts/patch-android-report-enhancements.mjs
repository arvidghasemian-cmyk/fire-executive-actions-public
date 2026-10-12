import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');

/* FEP-ANDROID-CALC-DEDUPE-v1
   Exact duplicate calculation snapshots are hidden in the report and
   an identical save is not appended again. Existing project data is not deleted. */
const calcDecl="const ncr=Array.isArray(d.ncrs)?d.ncrs.filter(Boolean):[], calcs=Array.isArray(d.calcs)?d.calcs.filter(Boolean):[];";
if(!s.includes(calcDecl)) throw new Error('Calc dedupe: report calcs declaration not found');
s=s.replace(calcDecl,
"const ncr=Array.isArray(d.ncrs)?d.ncrs.filter(Boolean):[], calcsRaw=Array.isArray(d.calcs)?d.calcs.filter(Boolean):[];\n"+
"const calcSeen=new Set();\n"+
"const calcs=calcsRaw.filter(c=>{const k=JSON.stringify([c?.title||'',c?.lines||[],c?.inputs||{}]);if(calcSeen.has(k))return false;calcSeen.add(k);return true;});");

const saveLine="D().calcs.push({id:uid(),ts:Date.now(),title:lastRes[n].title,lines:lastRes[n].lines,inputs,trace:getCalcTrace(n),audit:{warnings:(D().audit&&D().audit.last)?D().audit.last.warnings:[]}});";
if(!s.includes(saveLine)) throw new Error('Calc dedupe: saveCalc append line not found');
s=s.replace(saveLine,
"/* FEP-ANDROID-CALC-DEDUPE-v1 */\n"+
"const candidate={id:uid(),ts:Date.now(),title:lastRes[n].title,lines:lastRes[n].lines,inputs,trace:getCalcTrace(n),audit:{warnings:(D().audit&&D().audit.last)?D().audit.last.warnings:[]}};\n"+
"const calcSig=x=>JSON.stringify([x?.title||'',x?.lines||[],x?.inputs||{}]);\n"+
"if((D().calcs||[]).some(c=>calcSig(c)===calcSig(candidate))){toast('این محاسبه با همین ورودی‌ها قبلاً در گزارش ثبت شده است');return;}\n"+
"D().calcs.push(candidate);");

/* FEP-ANDROID-DUCT-CALC-DEDUPE-v1
   The duct module has its own save handler, so protect that path too. */
const ductSaveOld="D().calcs.push({id:uid(),ts:Date.now(),title:'افت فشار مسیر کانال پارکینگ',lines:[['افت اصطکاکی و موضعی کل',fmt(r.total,1)+' Pa'],['حاشیه طراحی',fmt(r.pct,0)+'٪'],['فشار طراحی مسیر',fmt(r.design,1)+' Pa'],['بیشترین سرعت',fmt(r.maxV,2)+' m/s'],['سگمنت با بیشترین افت',r.maxDrop?.name||'—']],inputs:{segments:ds()},trace:{formula:'Dh=2ab/(a+b); V=Q/A; ΔP=f(L/Dh)ρV²/2 + KρV²/2 + ΔP_equipment',units:'Q:m³/h | L:m | a,b:m | V:m/s | ΔP:Pa',reference:'محاسبه مهندسی کانال؛ برای تطبیق مقرراتی باید با الزامات مبحث ۱۴ و مدارک پروژه کنترل شود.',assumptions:'هوا با μ=1.81×10⁻⁵ Pa·s؛ افت تجهیزات به‌صورت ورودی؛ K اتصالات باید از دیتاشیت/مرجع پروژه تعیین شود.'}});saveAll();renderDash();toast(' محاسبه افت فشار کانال در گزارش ثبت شد');";
const ductSaveNew="const ductCandidate={id:uid(),ts:Date.now(),title:'افت فشار مسیر کانال پارکینگ',lines:[['افت اصطکاکی و موضعی کل',fmt(r.total,1)+' Pa'],['حاشیه طراحی',fmt(r.pct,0)+'٪'],['فشار طراحی مسیر',fmt(r.design,1)+' Pa'],['بیشترین سرعت',fmt(r.maxV,2)+' m/s'],['سگمنت با بیشترین افت',r.maxDrop?.name||'—']],inputs:{segments:ds()},trace:{formula:'Dh=2ab/(a+b); V=Q/A; ΔP=f(L/Dh)ρV²/2 + KρV²/2 + ΔP_equipment',units:'Q:m³/h | L:m | a,b:m | V:m/s | ΔP:Pa',reference:'محاسبه مهندسی کانال؛ برای تطبیق مقرراتی باید با الزامات مبحث ۱۴ و مدارک پروژه کنترل شود.',assumptions:'هوا با μ=1.81×10⁻⁵ Pa·s؛ افت تجهیزات به‌صورت ورودی؛ K اتصالات باید از دیتاشیت/مرجع پروژه تعیین شود.'}};const ductSig=x=>JSON.stringify([x?.title||'',x?.lines||[],x?.inputs||{}]);if((D().calcs||[]).some(c=>ductSig(c)===ductSig(ductCandidate))){toast('این محاسبه کانال با همین ورودی‌ها قبلاً در گزارش ثبت شده است');return;}D().calcs.push(ductCandidate);saveAll();renderDash();toast(' محاسبه افت فشار کانال در گزارش ثبت شد');";
if(!s.includes(ductSaveOld)) throw new Error('Duct calc save block not found');
s=s.replace(ductSaveOld,ductSaveNew);

const reportAnchor="let hydraulicReport='<section class=\"section pagebreak\"><h2>۵-الف. شبکه هیدرولیکی و پمپ</h2>';";
if(!s.includes(reportAnchor)) throw new Error('Report enhancement: hydraulic report anchor not found');

const reportCode=[
"const parkingSmokeReport=(()=>{",
"const pz=Array.isArray(d.parkingZones)?d.parkingZones:[], pf=Array.isArray(d.parkingFans)?d.parkingFans:[], ssRaw=Array.isArray(m.smokeScenarios)?m.smokeScenarios:[]; /* FEP-ANDROID-SMOKE-SCENARIO-DEDUPE-v1 */ const smokeSeen=new Set(); const ss=ssRaw.filter(a=>{const k=JSON.stringify([a?.name||'',a?.zone||'',+a?.qex||0,+a?.qmk||0,+a?.fan||0,+a?.m||0,+a?.qLeakTotal||+(a?.inputs?.qLeakTotal||0),a?.status||'']);if(smokeSeen.has(k))return false;smokeSeen.add(k);return true;});",
"let x='<section class=\"section pagebreak\"><h2>۵-ب. تهویه پارکینگ، زون‌ها و گروه فن‌ها</h2>';",
"if(pz.length)x+='<h3>زون‌های ثبت‌شده</h3><table class=\"tbl\"><tr><th>زون</th><th>حجم</th><th>ACH ورودی</th><th>دبی لازم</th><th>دبی عادی</th><th>ACH واقعی</th><th>هوای جبرانی</th><th>دبی حریق</th></tr>'+pz.map(z=>{const V=+z.area*+z.height,req=V*+z.ach,normal=+z.normal||0,actual=V?normal*3600/V:0,make=normal?100*(+z.makeup||0)/normal:0;return '<tr><td>'+esc(z.name||'—')+'</td><td>'+faN(V.toFixed(1))+' m³</td><td>'+faN((+z.ach||0).toFixed(2))+'</td><td>'+faN(req.toFixed(0))+' m³/h</td><td>'+faN(normal.toFixed(0))+' m³/h</td><td>'+faN(actual.toFixed(2))+'</td><td>'+faN(make.toFixed(1))+'٪</td><td>'+faN((+z.fire||0).toFixed(0))+' m³/h</td></tr>';}).join('')+'</table>';else x+='<div class=\"note\">زون پارکینگ ثبت نشده است.</div>';",
"if(pf.length)x+='<h3 style=\"margin-top:14px\">گروه فن‌ها</h3><table class=\"tbl\"><tr><th>گروه</th><th>زون</th><th>کل فن</th><th>فن کاری</th><th>دبی هر فن</th><th>ظرفیت کل کاری</th><th>نیاز</th><th>حاشیه</th></tr>'+pf.map(f=>{const total=+f.total||0,duty=+f.duty||0,flow=+f.flow||0,cap=duty*flow,req=+f.req||0,margin=req?(cap/req-1)*100:null;return '<tr><td>'+esc(f.name||'—')+'</td><td>'+esc(f.zone||'—')+'</td><td>'+faN(total)+'</td><td>'+faN(duty)+'</td><td>'+faN(flow.toFixed(0))+' m³/h</td><td>'+faN(cap.toFixed(0))+' m³/h</td><td>'+faN(req.toFixed(0))+' m³/h</td><td>'+(margin==null?'—':faN(margin.toFixed(1))+'٪')+'</td></tr>';}).join('')+'</table><div class=\"note\" style=\"margin-top:8px\">ظرفیت کل گروه بر اساس تعداد فن‌های کاری × دبی هر فن نمایش داده شده است؛ این جدول گزارش داده‌های ثبت‌شده است و جایگزین تطبیق منحنی سازنده و شرایط نصب نیست.</div>';else x+='<div class=\"note\">گروه فن پارکینگ ثبت نشده است.</div>';",
"x+='</section>';",
"let y='<section class=\"section pagebreak\"><h2>۵-ج. سناریوهای کنترل دود</h2>';",
"if(ss.length)y+='<table class=\"tbl\"><tr><th>سناریو</th><th>زون</th><th>تخلیه</th><th>جبرانی</th><th>فن</th><th>حاشیه</th><th>نشت برآوردی</th><th>وضعیت</th></tr>'+ss.map(a=>{const q=+a.qex||0,fan=+a.fan||0,margin=+a.m||0,qdes=q*(1+margin/100),leak=+a.qLeakTotal||+(a.inputs?.qLeakTotal||0);return '<tr><td>'+esc(a.name||'—')+'</td><td>'+esc(a.zone||'—')+'</td><td>'+faN(q.toFixed(0))+' m³/h</td><td>'+faN((+a.qmk||0).toFixed(0))+' m³/h</td><td>'+faN(fan.toFixed(0))+' m³/h</td><td>'+faN((fan-qdes).toFixed(0))+' m³/h</td><td>'+faN(leak.toFixed(0))+' m³/h</td><td>'+esc(a.status||'—')+'</td></tr>';}).join('')+'</table><div class=\"note\" style=\"margin-top:8px\">دبی نشت همان مقدار ثبت‌شده سناریو است و این خروجی به‌تنهایی تأیید نهایی روش طراحی کنترل دود نیست.</div>';else y+='<div class=\"note\">سناریوی کنترل دود ثبت نشده است.</div>';",
"y+='</section>';",
"return x+y;",
"})();",
"h+=parkingSmokeReport;"
].join('\n');

if(!s.includes('۵-ب. تهویه پارکینگ، زون‌ها و گروه فن‌ها')){
  s=s.replace(reportAnchor,reportCode+'\n'+reportAnchor);
}

const fanOld="const z=duty(), curve=interpolate(z.q), eta=(val('fanEta')||65)/100;\nconst count=val('fanDutyCount'), standby=val('fanStandby');\nlet deliveredPerFan=null, deliveredTotal=null, status='warn', statusTxt='قابل تأیید نیست';\nif(curve){\ndeliveredPerFan=curve.p;\ndeliveredTotal=curve.p;\nstatus=curve.p>=z.p?'ok':'bad';\nstatusTxt=curve.p>=z.p?'پاسخ فشار فن در نقطه طراحی کافی است':'فشار فن در نقطه طراحی کافی نیست';\n}\nconst powerKw=curve ? (z.q/3600)*z.p/eta/1000 : null;\nconst reserve=curve ? curve.p-z.p : null;";
const fanNew="const count=val('fanDutyCount'), standby=val('fanStandby');\nconst z=duty(), perFanQ=z.q/count, curve=interpolate(perFanQ), eta=(val('fanEta')||65)/100;\nlet deliveredPerFan=null, deliveredTotal=null, status='warn', statusTxt='قابل تأیید نیست';\nif(curve){\ndeliveredPerFan=curve.p;\ndeliveredTotal=curve.p*count;\nstatus=curve.p>=z.p?'ok':'bad';\nstatusTxt=curve.p>=z.p?'پاسخ فشار هر فن در نقطه طراحی کافی است':'فشار هر فن در نقطه طراحی کافی نیست';\n}\nconst powerKw=curve ? (perFanQ/3600)*z.p/eta/1000*count : null;\nconst reserve=curve ? curve.p-z.p : null;";
if(!s.includes(fanOld)) throw new Error('Fan calculation block not found');
s=s.replace(fanOld,fanNew);

s=s.replace("'<div class=\"auditItem '+(curve?'ok':'warn')+'\"><b>نقطه طراحی</b><span class=\"auditSmall\">Q='+fmtN(z.q,0)+' m³/h · ΔP='+fmtN(z.p,0)+' Pa</span></div>'+","'<div class=\"auditItem '+(curve?'ok':'warn')+'\"><b>نقطه طراحی کل سیستم</b><span class=\"auditSmall\">Q='+fmtN(z.q,0)+' m³/h · ΔP='+fmtN(z.p,0)+' Pa · '+fmtN(count,0)+' فن کاری · Q هر فن='+fmtN(perFanQ,0)+' m³/h</span></div>'+");
s=s.replace("'<div class=\"auditItem '+status+'\"><b>'+statusTxt+'</b><span class=\"auditSmall\">'+(curve?'فشار منحنی ≈ '+fmtN(curve.p,0)+' Pa · حاشیه فشار ≈ '+fmtN(reserve,0)+' Pa':'دبی طراحی خارج از بازه دو نقطه منحنی است')+'</span></div>'+","'<div class=\"auditItem '+status+'\"><b>'+statusTxt+'</b><span class=\"auditSmall\">'+(curve?'فشار منحنی هر فن ≈ '+fmtN(curve.p,0)+' Pa · ظرفیت کل دبی کاری ≈ '+fmtN(perFanQ*count,0)+' m³/h · حاشیه فشار ≈ '+fmtN(reserve,0)+' Pa':'دبی هر فن در این آرایش خارج از بازه دو نقطه منحنی است')+'</span></div>'+");
s=s.replace("lines:[['دبی طراحی',fmtN(r.z.q,0)+' m³/h'],['فشار طراحی',fmtN(r.z.p,0)+' Pa'],['فشار منحنی',r.curve?fmtN(r.curve.p,0)+' Pa':'خارج از بازه'],['نتیجه',r.statusTxt],['توان تقریبی',r.powerKw!==null?fmtN(r.powerKw,2)+' kW':'—']],","lines:[['دبی طراحی کل سیستم',fmtN(r.z.q,0)+' m³/h'],['تعداد فن کاری',fmtN(r.count,0)],['دبی طراحی هر فن',fmtN(r.z.q/r.count,0)+' m³/h'],['فشار طراحی',fmtN(r.z.p,0)+' Pa'],['فشار منحنی هر فن',r.curve?fmtN(r.curve.p,0)+' Pa':'خارج از بازه'],['ظرفیت کل دبی آرایش کاری',r.curve?fmtN((r.z.q/r.count)*r.count,0)+' m³/h':'—'],['نتیجه',r.statusTxt],['توان تقریبی کل',r.powerKw!==null?fmtN(r.powerKw,2)+' kW':'—']],");
s=s.replace("trace:{formula:'Q_design=Q×(1+marginQ); P_design=P×(1+marginP); P_curve=P1+(P2-P1)(Q_design-Q1)/(Q2-Q1); P_air=Q(m³/s)×ΔP/η',units:'Q:m³/h | ΔP:Pa | P_air:kW | η:%',","trace:{formula:'Q_design,total=Q×(1+marginQ); Q_design,perFan=Q_design,total/N_duty; P_design=P×(1+marginP); P_curve=P1+(P2-P1)(Q_design,perFan-Q1)/(Q2-Q1); P_air,total=Q_design,perFan(m³/s)×ΔP/η×N_duty',units:'Q:m³/h | ΔP:Pa | P_air:kW | η:% | N_duty:تعداد فن کاری',");


/* FEP-ANDROID-HYDLOSS-BIND-v2
   Shared web code may already contain FEP-SHARED-HYDLOSS-BIND-v1.
   In that case Android uses the shared binding unchanged. */
if(!s.includes('FEP-SHARED-HYDLOSS-BIND-v1')){
/* FEP-ANDROID-HYDLOSS-BIND-v1 */
const hydButtonOld='<button id="hydCalc" class="btn primary"> محاسبه</button>';
const hydButtonNew='<button id="hydCalc" type="button" class="btn primary"> محاسبه</button>';
if(!s.includes(hydButtonOld)) throw new Error('Hydloss calculate button not found');
s=s.replace(hydButtonOld,hydButtonNew);

const hydBindOld="document.addEventListener('DOMContentLoaded',()=>{fill();$('hydCalc')?.addEventListener('click',calc);$('hlApply')?.addEventListener('click',apply)});\nwindow.addEventListener('fep-eq-update',fill);\nwindow.FEPPressureLoss={calculate:calc};";
const hydBindNew=[
"function runHydLossCalc(){",
"try{return calc();}catch(err){console.error('[FEP hydloss] calculation failed',err);const out=$('hlResult');if(out)out.textContent='خطا در اجرای محاسبه. مقادیر ورودی را بررسی کنید.';return null;}",
"}",
"function bindHydLoss(){",
"const calcBtn=$('hydCalc'),applyBtn=$('hlApply');",
"if(calcBtn&&!calcBtn.dataset.fepHydlossBound){calcBtn.dataset.fepHydlossBound='1';calcBtn.type='button';calcBtn.addEventListener('click',ev=>{ev.preventDefault();runHydLossCalc();});}",
"if(applyBtn&&!applyBtn.dataset.fepHydlossBound){applyBtn.dataset.fepHydlossBound='1';applyBtn.type='button';applyBtn.addEventListener('click',ev=>{ev.preventDefault();apply();});}",
"try{fill();}catch(err){console.warn('[FEP hydloss] equipment refresh skipped',err);}",
"}",
"if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindHydLoss,{once:true});else bindHydLoss();",
"window.addEventListener('pageshow',bindHydLoss);",
"setTimeout(bindHydLoss,300);",
"window.addEventListener('fep-eq-update',()=>{try{fill();}catch(err){console.warn('[FEP hydloss] equipment refresh skipped',err);}});",
"window.FEPPressureLoss={calculate:runHydLossCalc};"
].join('\n');
if(!s.includes(hydBindOld)) throw new Error('Hydloss legacy binding block not found');
s=s.replace(hydBindOld,hydBindNew);
if(!s.includes('FEP-ANDROID-HYDLOSS-BIND-v1')&&!hydBindNew.includes('runHydLossCalc')) throw new Error('Hydloss binding patch missing');
}


if(!s.includes('۵-ب. تهویه پارکینگ، زون‌ها و گروه فن‌ها')) throw new Error('Report enhancement marker missing');
if(!s.includes('Q_design,perFan=Q_design,total/N_duty')) throw new Error('Fan enhancement marker missing');

await writeFile(path,s,'utf8');
console.log('Android report enhancements applied');

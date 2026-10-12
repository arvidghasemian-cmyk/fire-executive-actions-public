import fs from 'node:fs';

const html=fs.readFileSync('www/index.html','utf8');
const near=(a,b,tol,msg)=>{if(Math.abs(a-b)>tol)throw new Error(msg+`: got ${a}, expected ${b}`);};
const ok=(cond,msg)=>{if(!cond)throw new Error(msg);};

function parking({L,W,H,ach,cars,carRate,makeupPct}){
  const V=L*W*H,qACH=V*ach,qCar=cars*carRate,qEx=Math.max(qACH,qCar);
  return {V,qACH,qCar,qEx,makeup:qEx*makeupPct/100};
}
function sprinkler({den,inputArea,hose,minArea}){
  const area=Math.max(inputArea,minArea),qSpr=den*area;
  return {area,qSpr,total:qSpr+hose};
}
function hazenApp({Q,C,d,L}){
  const pPerM=6.05e5*Math.pow(Q,1.85)/(Math.pow(C,1.85)*Math.pow(d,4.87));
  return pPerM*L;
}
function hazenIndependent({Q,C,d,L}){
  const q=Q/60000,dm=d/1000;
  const head=10.67*L*Math.pow(q,1.852)/(Math.pow(C,1.852)*Math.pow(dm,4.87));
  return head*0.0980665;
}
function stair({open,closed,w,h,dp,leakPct,openVel}){
  const rho=1.2,Cd=.65,A=w*h;
  const qOne=A*openVel*3600;
  const qOpen=open*qOne;
  const leakArea=Math.max(.01,closed*A*.01*(1+leakPct/100));
  const qLeak=Cd*leakArea*Math.sqrt(2*dp/rho)*3600;
  return {qOne,qOpen,leakArea,qLeak,total:(qOpen+qLeak)*1.15};
}
function pipeLookupFromGpm(gpm){
  const table=[[100,'1"'],[190,'1¼"'],[290,'1½"'],[590,'2"'],[900,'2½"'],[1590,'3"'],[3000,'4"'],[6500,'6"'],[99999,'8"']];
  const lpm=gpm*3.785411784;
  const row=table.find(([cap])=>lpm<=cap)||table[table.length-1];
  return {gpm,lpm,size:row[1],thresholdLpm:row[0]};
}
function extinguisher({area,perA,rating}){
  const coverage=Math.min(1045,perA*rating);
  return {coverage,count:Math.max(1,Math.ceil(area/coverage))};
}
function dieselMfr({comb,heat,dt,margin}){
  const qcool=heat*3600/(1.2*1.005*dt);
  return {qcool,total:(comb+qcool)*(1+margin/100)};
}

const p=parking({L:60,W:40,H:3,ach:6,cars:40,carRate:920,makeupPct:85});
near(p.V,7200,1e-9,'parking volume');
near(p.qACH,43200,1e-9,'parking ACH flow');
near(p.qCar,36800,1e-9,'parking car flow');
near(p.qEx,43200,1e-9,'parking governing flow');
near(p.makeup,36720,1e-9,'parking makeup flow');

const lh=sprinkler({den:4.1,inputArea:100,hose:380,minArea:139});
near(lh.area,139,1e-9,'LH minimum design area');
near(lh.total,949.9,1e-9,'LH demand');

const eh=sprinkler({den:12.2,inputArea:139,hose:1900,minArea:232});
near(eh.area,232,1e-9,'EH minimum design area');
near(eh.total,4730.4,1e-9,'EH1 demand');

near(80*Math.sqrt(1),80,1e-12,'sprinkler K-factor');
near(900*60*1.10/1000,59.4,1e-12,'tank volume');

const hz={Q:900,C:120,d:77.9,L:45};
const app=hazenApp(hz),ind=hazenIndependent(hz);
ok(Math.abs(app-ind)/ind<0.02,`Hazen-Williams mismatch >2%: app=${app}, independent=${ind}`);

const st=stair({open:1,closed:10,w:.9,h:2.1,dp:50,leakPct:20,openVel:1});
near(st.qOne,6804,1e-9,'stair open-door A×V airflow');
near(st.leakArea,.2268,1e-9,'stair leakage area arithmetic');
near(st.total,13396.0229004914,1e-6,'stair mixed open-door/leakage airflow');

const pipe250=pipeLookupFromGpm(250);
near(pipe250.lpm,946.352946,1e-6,'pipe sizing GPM to L/min conversion');
ok(pipe250.size==='3"','250 GPM should map to 3-inch internal-table row after unit conversion');

const pipe100=pipeLookupFromGpm(100);
ok(pipe100.size==='2"','100 GPM should map to 2-inch internal-table row after unit conversion');

const ext=extinguisher({area:600,perA:139,rating:2});
near(ext.coverage,278,1e-12,'Class A extinguisher coverage');
ok(ext.count===3,'Class A extinguisher count');

const d=dieselMfr({comb:250,heat:40,dt:15,margin:10});
near(d.qcool,7960.199004975125,1e-6,'diesel heat-removal airflow');
near(d.total,9031.218905472638,1e-6,'diesel total airflow');

const required=[
  "LH:{den:4.1,hose:380,minArea:139}",
  "EH1:{den:12.2,hose:1900,minArea:232}",
  "fmt(pTot*10.19716213,2)+' mH₂O'",
  "num('c7DP')>90",
  "id=\"c7OpenVel\"",
  "const qOne=doorA*Math.max(0,openVel)*3600",
  "Qopen = Adoor × Vopen",
  "const PIPE_SIZES_LPM=",
  "qLpm=g*3.785411784",
  "برآورد خاموش‌کننده Class A (NFPA 10)",
  "Area/ext = min(1045, A-rating × Area-per-unit-A)",
  "Qcool = Heat × 3600",
  "راهنمای مبنای مقرراتی",
  "دکمه راهنما هیچ عددی را در فرم تغییر نمی‌دهد",
  "Qopen = Adoor×Vopen×3600",
  "ورودی: GPM | جدول داخلی: L/min",
  "Q_M14=14.4×A_floor",
  "CO<25ppm",
  "افزایش نشتی نسبت به پایه ۱٪ (٪)",
  "speed6!=null&&speed6>6",
  "const calcRunSignatures={},calcRunProjects={};",
  "calcRunProjects[n]=(typeof S!=='undefined'?S.activeId:'')",
  "calcRunProjects[n]!==S.activeId",
  "function clearProjectTransientUi()",
  "if(typeof renderNet==='function')renderNet()",
  "if(typeof renderPz==='function')renderPz()",
  "function calcInputSignature(n)",
  "runCalcStamped(13,runParkingVentAudit)",
  "runCalcStamped(11,runHydraulicChain)",
  "runCalcStamped(12,runCriticalPath)",
  "ورودی‌های این محاسبه بعد از آخرین اجرا تغییر کرده‌اند",
  "function calcScopedCriticalIssues(n)",
  "function calcInputSnapshot(n)",
  "const inputs=calcInputSnapshot(n);",
  "const critical=calcScopedCriticalIssues(n);",
  "ثبت این محاسبه متوقف شد:",
  "runCalcStamped(n,()=>runCalc(n))",
  "runCalcStamped(11,runHydraulicChain)",
  "runCalcStamped(12,runCriticalPath)",
  "runCalcStamped(13,runParkingVentAudit)",
  "if(mode==='mfr')return pos('c10MfrComb')&&pos('c10MfrHeat')",
  "id=\"c1CarRate\"",
  "qCO=v('c1Car')*carRate",
  "Qcar = Ncars × CarRate",
  "pos('c1CarRate')",
  "فاصله آزاد زیر اسپرینکلر با نوع هد، آرایش انبارش و مبنای طراحی پروژه تطبیق داده شده است",
  "نوع و جانمایی خاموش‌کننده در OR و ICU با کلاس خطر، تجهیزات موجود و طرح مصوب پروژه تطبیق داده شده است",
  "عرض کریدور تخلیه با کاربری، بار تخلیه، طرح مصوب و مرجع قابل اعمال پروژه تطبیق داده شده است",
  "if(n===4){const k=$('c4K')?.value==='c'?num('c4Kc')",
  "['c6Elb','c6Tee','c6Chk','c6Gate'].some(id=>bad(id)||num(id)<0)",
  "if(n===11){if(bad('hcQ')",
  "bad('c12R'+i)",
  "Number.isFinite(k)&&k>0",
  "['c6Elb','c6Tee','c6Chk','c6Gate'].every(nonneg)",
  "nonneg('hcMinP')&&nonneg('hcFriction')",
  "if(inputIssues.length){lastRes[11]=null"
];
for(const marker of required)ok(html.includes(marker),'missing generated engineering marker: '+marker);
ok(!html.includes('25–87 Pa پیش‌فرض ابزار'),'obsolete 25-87 Pa audit wording remains');
ok(!html.includes('حداقل ۶ ACH از مبحث ۳'),'obsolete parking 6 ACH claim remains');
ok(!html.includes('پیش‌فرض مبحث ۳ (۶ ACH + جبرانی ۸۵٪) اعمال شد'),'obsolete parking preset toast remains');
ok(!html.includes("Math.round(6*(+$('pvL').value"),'obsolete parking 6 ACH auto-fill remains');
ok(!html.includes("speed6!=null&&speed6>5"),'obsolete Hazen QA 5 m/s threshold remains');
ok(!html.includes("b.onclick=()=>runCalc(parseInt(b.dataset.calc));"),'calculator buttons still bypass stale-result stamping');
ok(!html.includes("const calcRunSignatures={};"),'calculator project stamp map was not upgraded');
ok(!html.includes("   runCalc(n);\n   if(lastRes[n])"),'bulk calculator still reuses stale lastRes');
ok(!html.includes("const critical=r.issues.filter(x=>x&&x.trim()).length;"),'save gate still blocks on unrelated calculator issues');
ok(!html.includes("document.querySelectorAll('#sec-calcs input,#sec-calcs select').forEach(el=>{if(el.id)inputs[el.id]=el.value;});"),'calculation snapshot still captures unrelated calculator inputs');
ok(!html.includes("qCO=v('c1Car')*920"),'parking per-car rate is still hardcoded');
ok(!html.includes('فاصله آزاد زیر هد حداقل ۰٫۴۵ متر'),'old universal warehouse sprinkler-clearance wording remains');
ok(!html.includes('خاموش‌کننده Clean Agent/CO2 در OR و ICU'),'old universal hospital extinguisher wording remains');
ok(!html.includes('عرض کریدور تخلیه ≥ ۲٫۴ متر'),'old universal hospital corridor-width wording remains');
ok(!html.includes("if(n===4)return pos('c4P');"),'bulk nozzle validation still ignores K-factor');
ok(!html.includes("if(n===11)return pos('hcQ')&&pos('hcK')&&Number.isFinite(x('hcBranches'))&&x('hcBranches')>=1;"),'bulk hydraulic-chain validation remains incomplete');
ok(html.includes("office:{no:60,yes:90,label:'اداری/حرفه‌ای'}"),'M3 office maximum travel distance mapping is not 60/90 m');
ok(html.includes("educational:{no:60,yes:75,label:'آموزشی/فرهنگی'}"),'M3 educational maximum travel distance mapping is not 60/75 m');
ok(html.includes("assembly:{no:60,yes:75,label:'تجمعی'}"),'M3 assembly maximum travel distance mapping is not 60/75 m');
ok(html.includes("residential:{no:60,yes:75,label:'مسکونی'}"),'M3 residential maximum travel distance mapping is not 60/75 m');
ok(!html.includes("office:{no:30,yes:23,label:'اداری/حرفه‌ای'}"),'old common-path values still mapped as office travel distance');
ok(html.includes("ref:'3-10-4-4 / صفحه 187'"),'M3 high-rise emergency-power smart reference is not 3-10-4-4 / page 187');
ok(html.includes("ref:'مبحث ۳ (3-10-4-4)',on:has('highrise')"),'M3 high-rise emergency-power rule is not scoped to high-rise with 3-10-4-4');
ok(!html.includes("ref:'مبحث ۳ (3-11-2-9)',on:has('highrise')||has('hospital')"),'deep-building emergency-power clause is still misused as a high-rise/hospital rule');
ok(html.includes('function ncReviewMsg('),'numeric regulatory review-state helper is missing');
ok(html.includes('نیازمند تعیین شرایط استثناء؛ NCR خودکار ایجاد نشد'),'corridor exception review state does not suppress automatic NCR');
ok(html.includes('استثنائات بند 3-6-3-2-5'),'corridor exception-aware wording is missing');
ok(html.includes("r.ok===true?'تأیید شد':r.ok===false?'عدم انطباق':'نیازمند بررسی'"),'final report does not support tri-state numeric results');
ok(!html.includes("if(c!=null)ncMsg($('ncCorridorOut'),c>=1.10"),'corridor width still creates unconditional failure below 1.10 m');
ok(html.includes('if(fh<=15){reqRoad=6;maxDist=12.5;}'),'M3 table 3-12-2 <=15 m access mapping is not 6 m / 12.5 m');
ok(html.includes('else{reqRoad=12;maxDist=14.5;}'),'M3 table 3-12-2 >35 m access mapping is not 12 m / 14.5 m');
ok(html.includes("ncReviewMsg($('ncFireOut')"),'fire-access distance exception/review path is missing');
ok(html.includes('جدول 3-12-2 و بند 3-12-3'),'fire-access review does not cite the internal-access clause');
ok(!html.includes('reqRoad=6;maxDist=8'),'obsolete <=15 m fire-access distance remains');
ok(!html.includes('reqRoad=12;maxDist=null'),'obsolete >35 m unlimited fire-access distance remains');
ok(html.includes("ref:'3-8-7-3 / صفحه 161'"),'M3 clause 3-8-7-3 smart-check page is not 161');
ok(html.includes("ref:'3-8-7-3',page:'161'"),'M3 clause 3-8-7-3 standards-bank page is not 161');
ok(html.includes("source:'مبحث ۳، بند 3-8-7-3، صفحه چاپی 161'"),'M3 clause 3-8-7-3 source citation page is not 161');
ok(!html.includes("ref:'3-8-7-3 / صفحه 162'"),'old M3 3-8-7-3 page 162 citation remains');
ok(html.includes("else add('info',x[1],'وضعیت این کنترل هنوز مشخص نشده است"),'M15 unknown alarm-control state is still treated as failure');
ok(html.includes("else add('info','فاصله حسگر از مرکز بازشوی آسانسور'"),'M15 missing detector distance is still treated as failure');
ok(html.includes("status==='bad'||status==='ok'"),'elevator NCR verification still accepts informational/unknown status');
ok(!html.includes("else add('bad',x[1],'ساختمان مشمول اعلام حریق ثبت شده ولی وضعیت این کنترل مشخص نشده است."),'old M15 unknown-as-failure alarm logic remains');
ok(html.includes("detDist<=1.5?'ok':'bad'"),'M15 1.5 m detector-distance requirement was accidentally changed');
ok(html.includes('id="elStretcherSign"'),'M15 stretcher visible-sign input is missing');
ok(html.includes('id="elStretcherAllFloors"'),'M15 stretcher all-floor service input is missing');
ok(html.includes("'elStretcherSign','elStretcherAllFloors'"),'new M15 stretcher fields are not persisted with elevator review data');
ok(html.includes("['elStretcherSign','علامت مخصوص قابل رؤیت برانکاردبر']"),'M15 stretcher sign requirement is not checked');
ok(html.includes("['elStretcherAllFloors','سرویس برانکاردبر به همه طبقات']"),'M15 stretcher all-floor requirement is not checked');
ok(html.includes("'مبحث ۱۵، 15-2-1-10'"),'M15 stretcher dimensional checks do not use exact clause 15-2-1-10');
ok(!html.includes('مبحث ۱۵، الزامات آسانسور برانکاردبر'),'vague stretcher reference remains');
ok(html.includes('id="elHospitalRamp"'),'M15 hospital suitable-ramp input is missing');
ok(html.includes('id="elBedCount"'),'M15 hospital bed-elevator count input is missing');
ok(html.includes('id="elBedCabW"')&&html.includes('id="elBedCabD"'),'M15 bed-elevator cabin dimension inputs are missing');
ok(html.includes('id="elBedDoorW"')&&html.includes('id="elBedDoorH"'),'M15 bed-elevator door dimension inputs are missing');
ok(html.includes('id="elBedVVVF"')&&html.includes('id="elBedEmergencyPower"'),'M15 bed-elevator operational inputs are incomplete');
ok(html.includes("getBuildingTypes().includes('hospital')||hasOcc(D(),'hospital')"),'M15 hospital applicability does not use project hospital context');
ok(html.includes("floors>1"),'M15 hospital >1 floor applicability is missing');
ok(html.includes("ramp==='yes'"),'M15 hospital suitable-ramp exception is missing');
ok(html.includes("bw>=1400&&bd>=2400"),'M15 bed-elevator 1400x2400 cabin requirement is missing');
ok(html.includes("bdw>=1300&&bdh>=2100"),'M15 bed-elevator 1300x2100 door requirement is missing');
ok(html.includes("'مبحث ۱۵، 15-2-1-11'"),'M15 bed-elevator exact clause 15-2-1-11 is missing');
ok(html.includes("if($('elBedCount'))$('elBedCount').value='0'"),'M15 bed-elevator reset is missing');
ok(html.includes('id="elEmergencyRequired"'),'M15 general emergency-power applicability input is missing');
ok(html.includes('id="elEmergencyPerGroup"'),'M15 one-elevator-per-group emergency-power input is missing');
ok(html.includes('id="elEmergencySelectable"'),'M15 selectable emergency-feed input is missing');
ok(html.includes('id="elEmergencyAuto"'),'M15 automatic emergency-power activation input is missing');
ok(html.includes("['elEmergencyPerGroup','تغذیه حداقل یک آسانسور از هر گروه با برق اضطراری']"),'M15 per-group emergency-power check is missing');
ok(html.includes("['elEmergencySelectable','قابلیت تغذیه انتخابی سایر آسانسورها از خط برق اضطراری']"),'M15 selectable emergency-feed check is missing');
ok(html.includes("['elEmergencyAuto','فعال‌شدن خودکار سیستم برق اضطراری']"),'M15 automatic activation check is missing');
ok(html.includes("emergencyRequired==='yes'"),'M15 emergency-power applicability gate is missing');
ok(html.includes("emergencyRequired==='no'"),'M15 emergency-power explicit non-applicability handling is missing');
ok(html.includes("'مبحث ۱۵، 15-2-8'"),'M15 exact emergency-power clause reference is missing');
ok(html.includes('id="elAlarmRecall"'),'M15 fire-alarm recall input is missing');
ok(html.includes('id="elAlarmDoorRestriction"'),'M15 fire-alarm door-restriction input is missing');
ok(html.includes('id="elAlarmManualKey"'),'M15 general firefighter-key input is missing');
ok(html.includes("['elAlarmRecall','انتقال همه آسانسورها به طبقه تعیین‌شده پس از فعال‌شدن حسگرها']"),'M15 alarm recall check is missing');
ok(html.includes("['elAlarmDoorRestriction','ممانعت از بازشدن درها در طبقات غیر از ورودی/از پیش تعریف‌شده']"),'M15 alarm door-restriction check is missing');
ok(html.includes("['elAlarmManualKey','قابلیت کنترل دستی تمام آسانسورها با کلید آتش‌نشان']"),'M15 general manual firefighter-key check is missing');



console.log(JSON.stringify({
  status:'PASS',
  parking:p,
  sprinklerLH:lh,
  sprinklerEH1:eh,
  hazen:{appBar:app,independentBar:ind,relativeError:Math.abs(app-ind)/ind},
  stair:{leakArea:st.leakArea,totalM3h:st.total},
  pipe250,
  pipe100,
  extinguisher:ext,
  diesel:d
},null,2));

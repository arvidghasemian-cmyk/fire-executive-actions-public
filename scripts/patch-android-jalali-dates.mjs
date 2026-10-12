import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');
const MARK='FEP-ANDROID-JALALI-DATES-v6';

if(s.includes(MARK)){
  console.log('Jalali date patch already applied.');
  process.exit(0);
}

function replaceOnce(anchor,replacement,label){
  if(!s.includes(anchor)) throw new Error(label+' anchor not found');
  s=s.replace(anchor,replacement);
}

replaceOnce(
  '<label>مهلت</label><input type="date" id="ncrDeadline">',
  '<label>مهلت (شمسی)</label><input type="hidden" id="ncrDeadline"><div class="fepJalaliInput"><input type="text" id="ncrDeadlineJalali" class="fepJalaliText" readonly inputmode="none" placeholder="انتخاب تاریخ شمسی"><button class="btn small ghost fepJalaliOpen" type="button" data-jalali-target="ncrDeadline">تقویم</button><button class="btn small ghost fepJalaliToday" type="button" data-jalali-target="ncrDeadline">امروز</button></div><div class="fepJalaliWeekday" id="ncrDeadlineWeekday"></div>',
  'NCR deadline input'
);

replaceOnce(
  '<label>تاریخ بازدید</label><input type="date" id="rDate">',
  '<label>تاریخ بازدید (شمسی)</label><input type="hidden" id="rDate"><div class="fepJalaliInput"><input type="text" id="rDateJalali" class="fepJalaliText" readonly inputmode="none" placeholder="انتخاب تاریخ شمسی"><button class="btn small ghost fepJalaliOpen" type="button" data-jalali-target="rDate">تقویم</button><button class="btn small ghost fepJalaliToday" type="button" data-jalali-target="rDate">امروز</button></div><div class="fepJalaliWeekday" id="rDateWeekday"></div>',
  'report visit date input'
);

replaceOnce(
  "$('rDate').value=m.date||todayStr();",
  "$('rDate').value=m.date||todayStr();\nif(window.FEPJalali)window.FEPJalali.sync('rDate');",
  'report date sync'
);

const css=String.raw`
<style id="fepAndroidJalaliDateStyles">
/* ${MARK} */
.fepJalaliInput{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.fepJalaliText{flex:1;min-width:150px;text-align:center;font-weight:800;letter-spacing:.2px;cursor:pointer}
.fepJalaliWeekday{min-height:18px;margin-top:5px;font-size:11px;color:var(--muted);line-height:1.7}
.fepJalaliOverlay{position:fixed;inset:0;z-index:100000;background:rgba(5,10,20,.58);display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(3px)}
.fepJalaliOverlay.hidden{display:none}
.fepJalaliCard{width:min(390px,100%);max-height:92vh;overflow:auto;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:14px}
.fepJalaliHead{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin-bottom:10px}
.fepJalaliTitle{text-align:center;font-weight:900;font-size:15px}
.fepJalaliNav{min-width:72px}
.fepJalaliWeekHeads,.fepJalaliGrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
.fepJalaliWeekHeads{margin-bottom:5px;color:var(--muted);font-size:10px;text-align:center}
.fepJalaliWeekHeads span{padding:4px 0}
.fepJalaliDay{border:1px solid var(--border);background:var(--chip);color:var(--text);border-radius:10px;min-height:40px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.fepJalaliDay.today{outline:2px solid rgba(230,57,38,.25)}
.fepJalaliDay.selected{background:#8f1d24;color:#fff;border-color:#8f1d24}
.fepJalaliBlank{min-height:40px}
.fepJalaliFoot{display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)}
.fepJalaliHint{font-size:10px;color:var(--muted);line-height:1.7;margin-top:8px}
@media(max-width:480px){
  .fepJalaliInput .btn{flex:0 0 auto}
  .fepJalaliCard{padding:11px;border-radius:16px}
  .fepJalaliNav{min-width:64px;padding-inline:8px}
  .fepJalaliDay{min-height:38px}
}
</style>
`;
replaceOnce('</head>',css+'\n</head>','head styles');

const modal=String.raw`
<div class="fepJalaliOverlay hidden" id="fepJalaliOverlay" aria-hidden="true">
  <div class="fepJalaliCard" role="dialog" aria-modal="true" aria-labelledby="fepJalaliTitle">
    <div class="fepJalaliHead">
      <button class="btn small ghost fepJalaliNav" type="button" id="fepJalaliPrev">ماه قبل</button>
      <div class="fepJalaliTitle" id="fepJalaliTitle">تقویم شمسی</div>
      <button class="btn small ghost fepJalaliNav" type="button" id="fepJalaliNext">ماه بعد</button>
    </div>
    <div class="fepJalaliWeekHeads"><span>ش</span><span>ی</span><span>د</span><span>س</span><span>چ</span><span>پ</span><span>ج</span></div>
    <div class="fepJalaliGrid" id="fepJalaliGrid"></div>
    <div class="fepJalaliHint">تاریخ برای شما شمسی نمایش داده می‌شود؛ مقدار ذخیره‌شده داخلی استاندارد باقی می‌ماند.</div>
    <div class="fepJalaliFoot">
      <button class="btn small ghost" type="button" id="fepJalaliClear">پاک کردن</button>
      <button class="btn small ghost" type="button" id="fepJalaliTodayModal">امروز</button>
      <button class="btn small primary" type="button" id="fepJalaliClose">بستن</button>
    </div>
  </div>
</div>
`;
replaceOnce('<div id="toasts"></div>',modal+'\n<div id="toasts"></div>','Jalali modal');

const helper=String.raw`
<script id="fepAndroidJalaliDates">
(function(){
  'use strict';
  const digitMap='۰۱۲۳۴۵۶۷۸۹';
  const monthNames=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const weekNames=['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
  let targetId=null;
  let monthFirst=null;

  function faDigits(v){return String(v).replace(/\d/g,function(d){return digitMap[Number(d)];});}
  function pad(v){return String(v).padStart(2,'0');}
  function div(a,b){return Math.trunc(a/b);}
  function mod(a,b){return a-Math.trunc(a/b)*b;}
  function g2d(gy,gm,gd){
    let d=div((gy+div(gm-8,6)+100100)*1461,4)+div(153*mod(gm+9,12)+2,5)+gd-34840408;
    d=d-div(div(gy+100100+div(gm-8,6),100)*3,4)+752;
    return d;
  }
  function d2j(jdn){
    const gy=d2g(jdn).gy;
    let jy=gy-621;
    const r=jalCal(jy,false);
    const jdn1f=g2d(gy,3,r.march);
    let k=jdn-jdn1f;
    let jm,jd;
    if(k>=0){
      if(k<=185){jm=1+div(k,31);jd=mod(k,31)+1;return {jy:jy,jm:jm,jd:jd};}
      k-=186;
    }else{
      jy-=1;k+=179;if(r.leap===1)k+=1;
    }
    jm=7+div(k,30);jd=mod(k,30)+1;
    return {jy:jy,jm:jm,jd:jd};
  }
  function d2g(jdn){
    let j=4*jdn+139361631;
    j=j+div(div(4*jdn+183187720,146097)*3,4)*4-3908;
    const i=div(mod(j,1461),4)*5+308;
    const gd=div(mod(i,153),5)+1;
    const gm=mod(div(i,153),12)+1;
    const gy=div(j,1461)-100100+div(8-gm,6);
    return {gy:gy,gm:gm,gd:gd};
  }
  function jalCal(jy,withoutLeap){
    const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
    const bl=breaks.length;let gy=jy+621,leapJ=-14,jp=breaks[0],jm,jump,n,i;
    if(jy<jp||jy>=breaks[bl-1])throw new Error('Invalid Jalaali year '+jy);
    for(i=1;i<bl;i+=1){jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ+=div(jump,33)*8+div(mod(jump,33),4);jp=jm;}
    n=jy-jp;leapJ+=div(n,33)*8+div(mod(n,33)+3,4);
    if(mod(jump,33)===4&&jump-n===4)leapJ+=1;
    const leapG=div(gy,4)-div((div(gy,100)+1)*3,4)-150;
    const march=20+leapJ-leapG;
    if(withoutLeap)return {gy:gy,march:march};
    if(jump-n<6)n=n-jump+div(jump+4,33)*33;
    let leap=mod(mod(n+1,33)-1,4);if(leap===-1)leap=4;
    return {leap:leap,gy:gy,march:march};
  }
  function parts(date){
    const j=d2j(g2d(date.getFullYear(),date.getMonth()+1,date.getDate()));
    return {y:j.jy,m:j.jm,d:j.jd};
  }
  function parseIso(value){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
    if(d.getFullYear()!==Number(m[1])||d.getMonth()!==Number(m[2])-1||d.getDate()!==Number(m[3]))return null;
    return d;
  }
  function iso(date){
    return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
  }
  function jalaliNumeric(date){
    const p=parts(date);
    return faDigits(p.y+'/'+pad(p.m)+'/'+pad(p.d));
  }
  function firstOfMonth(date){
    const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0,0);
    const p=parts(d);
    d.setDate(d.getDate()-(p.d-1));
    return d;
  }
  function sync(id){
    const hidden=document.getElementById(id);
    const visible=document.getElementById(id+'Jalali');
    const weekday=document.getElementById(id+'Weekday');
    if(!hidden||!visible)return;
    const d=parseIso(hidden.value);
    visible.value=d?jalaliNumeric(d):'';
    if(weekday){const p=d?parts(d):null;weekday.textContent=d?(weekNames[d.getDay()]+'، '+faDigits(p.d)+' '+monthNames[p.m-1]+' '+faDigits(p.y)):'';}
  }
  function dispatchValue(id,date){
    const hidden=document.getElementById(id);
    if(!hidden)return;
    hidden.value=date?iso(date):'';
    sync(id);
    hidden.dispatchEvent(new Event('input',{bubbles:true}));
    hidden.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function render(){
    const overlay=document.getElementById('fepJalaliOverlay');
    const grid=document.getElementById('fepJalaliGrid');
    const title=document.getElementById('fepJalaliTitle');
    if(!overlay||!grid||!title||!monthFirst||!targetId)return;
    const titleParts=parts(monthFirst);
    title.textContent=monthNames[titleParts.m-1]+' '+faDigits(titleParts.y);
    const p0=parts(monthFirst);
    const selected=(document.getElementById(targetId)||{}).value||'';
    const todayIso=iso(new Date());
    const offset=(monthFirst.getDay()+1)%7;
    let html='';
    for(let i=0;i<offset;i++)html+='<span class="fepJalaliBlank"></span>';
    const cursor=new Date(monthFirst.getFullYear(),monthFirst.getMonth(),monthFirst.getDate(),12,0,0,0);
    for(let i=0;i<32;i++){
      const p=parts(cursor);
      if(p.y!==p0.y||p.m!==p0.m)break;
      const value=iso(cursor);
      let cls='fepJalaliDay';
      if(value===todayIso)cls+=' today';
      if(value===selected)cls+=' selected';
      html+='<button type="button" class="'+cls+'" data-iso="'+value+'">'+faDigits(p.d)+'</button>';
      cursor.setDate(cursor.getDate()+1);
    }
    grid.innerHTML=html;
  }
  function open(id){
    targetId=id;
    const hidden=document.getElementById(id);
    const selected=hidden?parseIso(hidden.value):null;
    monthFirst=firstOfMonth(selected||new Date());
    render();
    const overlay=document.getElementById('fepJalaliOverlay');
    if(overlay){overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');}
  }
  function close(){
    const overlay=document.getElementById('fepJalaliOverlay');
    if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}
  }
  function moveMonth(direction){
    if(!monthFirst)return;
    const d=new Date(monthFirst);
    d.setDate(d.getDate()+(direction<0?-1:35));
    monthFirst=firstOfMonth(d);
    render();
  }

  function on(id,event,handler){
    const el=document.getElementById(id);
    if(el)el.addEventListener(event,handler);
  }
  document.querySelectorAll('.fepJalaliOpen').forEach(function(btn){
    btn.addEventListener('click',function(){open(btn.getAttribute('data-jalali-target'));});
  });
  document.querySelectorAll('.fepJalaliText').forEach(function(input){
    input.addEventListener('click',function(){
      const id=input.id.replace(/Jalali$/,'');
      open(id);
    });
  });
  document.querySelectorAll('.fepJalaliToday').forEach(function(btn){
    btn.addEventListener('click',function(){dispatchValue(btn.getAttribute('data-jalali-target'),new Date());});
  });
  on('fepJalaliPrev','click',function(){moveMonth(-1);});
  on('fepJalaliNext','click',function(){moveMonth(1);});
  on('fepJalaliClose','click',close);
  on('fepJalaliTodayModal','click',function(){
    if(targetId){dispatchValue(targetId,new Date());close();}
  });
  on('fepJalaliClear','click',function(){
    if(targetId){dispatchValue(targetId,null);close();}
  });
  on('fepJalaliGrid','click',function(e){
    let btn=e.target;
    while(btn&&btn!==e.currentTarget&&!(btn.tagName==='BUTTON'&&btn.getAttribute('data-iso')))btn=btn.parentNode;
    if(!btn||btn===e.currentTarget||!targetId)return;
    const d=parseIso(btn.getAttribute('data-iso'));
    if(d){dispatchValue(targetId,d);close();}
  });
  on('fepJalaliOverlay','click',function(e){
    if(e.target===e.currentTarget)close();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});

  window.FEPJalali={sync:sync,open:open};
  setTimeout(function(){sync('ncrDeadline');sync('rDate');},0);
})();
</script>
`;
const bodyClose=s.lastIndexOf('</body>');
if(bodyClose<0) throw new Error('Jalali helper: closing body tag not found');
s=s.slice(0,bodyClose)+helper+'\n'+s.slice(bodyClose);

for(const id of ['ncrDeadline','ncrDeadlineJalali','ncrDeadlineWeekday','rDate','rDateJalali','rDateWeekday','fepJalaliOverlay','fepJalaliGrid']){
  const count=(s.match(new RegExp('id="'+id+'"','g'))||[]).length;
  if(count!==1)throw new Error('Expected one '+id+' id after patch, got '+count);
}
if(!s.includes(MARK)||!s.includes("window.FEPJalali={sync:sync,open:open}"))throw new Error('Jalali patch verification failed');
if((s.match(/<script id="fepAndroidJalaliDates">/g)||[]).length!==1)throw new Error('Jalali helper script count is not exactly one');
const helperPos=s.lastIndexOf('<script id="fepAndroidJalaliDates">');
const finalBodyClose=s.lastIndexOf('</body>');
if(helperPos<0||finalBodyClose<0||helperPos>finalBodyClose)throw new Error('Jalali helper was not injected before final body close');
await writeFile(path,s,'utf8');
console.log('Applied and verified '+MARK+': NCR deadline + report visit date use Persian calendar UI while ISO storage is preserved.');

import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'www/index.html';
let html = readFileSync(file, 'utf8');
// FEP-DUCT-STARTUP-FIX-v1: project state is loaded asynchronously.
const oldGuard = " if(!add||!run||!clear||!save)return false;";
const newGuard = oldGuard + "\n if(!S || !S.data || !S.data[S.activeId])return false;";
if (!html.includes(newGuard)) {
  if (html.split(oldGuard).length !== 2) throw new Error('Duct binding guard must be unique');
  html = html.replace(oldGuard, newGuard);
}
verifyDuct(html);
writeFileSync(file, html, 'utf8');
const marker = 'مبنای محاسبات کانال و راهنمای تفسیر نتیجه';

if (html.includes(marker)) {
  console.log('Duct calculation basis already present.');
  process.exit(0);
}

const sectionStart = html.search(/<section\b[^>]*\bid=["']sec-duct["'][^>]*>/i);
const sectionEnd = sectionStart < 0 ? -1 : html.indexOf('</section>', sectionStart);
const block = `<div class="card wide" style="margin-top:16px">
<details>
<summary style="cursor:pointer;font-weight:900">مبنای محاسبات کانال و راهنمای تفسیر نتیجه</summary>
<div style="margin-top:12px;line-height:2">
<p><b>هدف ابزار:</b> برآورد افت فشار یک مسیر کانال مستطیلی، سگمنت‌به‌سگمنت، با درنظرگرفتن افت اصطکاکی، افت موضعی اتصالات و افت تجهیزات ثبت‌شده در مسیر. خروجی «فشار طراحی مسیر» برای کنترل اولیه نقطه کار فن استفاده می‌شود.</p>
<p><b>تبدیل دبی و سطح مقطع:</b> دبی ورودی از m³/h به m³/s تبدیل می‌شود و سطح مقطع کانال از حاصل‌ضرب عرض و ارتفاع به‌دست می‌آید.</p>
<div class="formula">Q = Qh / 3600<br>A = a × b<br>V = Q / A</div>
<p><b>قطر هیدرولیکی کانال مستطیلی:</b></p>
<div class="formula">Dh = 2ab / (a + b)</div>
<p><b>عدد رینولدز و ضریب اصطکاک:</b> نرم‌افزار برای هوا ویسکوزیته دینامیکی μ = 1.81×10⁻⁵ Pa·s را در نظر می‌گیرد و ضریب اصطکاک را با تقریب Swamee–Jain محاسبه می‌کند.</p>
<div class="formula">Re = ρVDh / μ<br>εr = ε / Dh<br>f = 0.25 / [log10(εr/3.7 + 5.74/Re^0.9)]²</div>
<p><b>فشار دینامیکی و افت هر سگمنت:</b></p>
<div class="formula">Pv = ρV² / 2<br>ΔPf = f × (L/Dh) × Pv<br>ΔPlocal = K × Pv<br>ΔPsegment = ΔPf + ΔPlocal + ΔPequipment</div>
<p><b>افت کل و فشار طراحی مسیر:</b> افت تمام سگمنت‌ها با هم جمع می‌شود. سپس درصد حاشیه طراحی واردشده توسط کاربر روی مجموع افت اعمال می‌شود.</p>
<div class="formula">ΔPtotal = ΣΔPsegment<br>ΔPdesign = ΔPtotal × (1 + Margin/100)</div>
<p><b>معنی ورودی‌ها:</b> ε زبری مطلق سطح داخلی کانال بر حسب میلی‌متر، ρ چگالی هوا، K مجموع ضرایب افت موضعی همان سگمنت و «افت تجهیزات» افت اعلام‌شده برای تجهیزاتی مثل دمپر، فیلتر، لوور یا جزء دیگری است که به‌صورت عددی وارد می‌شود.</p>
<p><b>تفسیر خروجی:</b> «افت کل مسیر» مجموع افت‌های ثبت‌شده است؛ «فشار طراحی مسیر» همان افت کل به‌اضافه حاشیه انتخابی است؛ «بیشترین سرعت» برای شناسایی سگمنتی با سرعت بالاتر و «بیشترین افت» برای پیدا کردن بخش غالب مسیر نمایش داده می‌شود.</p>
<div class="basisNote">⚠️ این ابزار افت فشار همان مسیر تعریف‌شده را محاسبه می‌کند و به‌تنهایی انتخاب نهایی فن، سرعت مجاز کانال، میزان صدای مجاز یا انطباق کامل سیستم با مقررات را تأیید نمی‌کند. ضرایب K، زبری، افت واقعی تجهیزات و حدود قابل قبول سرعت/صدا باید از دیتاشیت سازنده، نقشه مصوب و مرجع قابل اعمال پروژه کنترل شوند. برای انتخاب فن، فشار طراحی مسیر باید همراه با دبی موردنیاز با منحنی واقعی فن تطبیق داده شود.</div>
</div>
</details>
</div>`;

if (sectionStart < 0 || sectionEnd < 0) {
  throw new Error('Duct section boundary was not found; refusing to change the build.');
}

html = `${html.slice(0, sectionEnd)}${block}\n${html.slice(sectionEnd)}`;
writeFileSync(file, html, 'utf8');
console.log('Duct calculation basis added to Android web assets.');

function verifyDuct(html){


const start=html.indexOf('/* ================= ماژول کانال ================= */');
const end=html.indexOf('/* ================= ماژول فن ================= */',start);
assert(start>=0&&end>start);
const source=html.slice(start,end);
const els={};
for(const [id,value] of Object.entries({dpName:'D-1',dpQ:'12000',dpL:'20',dpW:'800',dpH:'500',dpEps:'.15',dpRho:'1.2',dpK:'1.5',dpEquip:'0',dpMargin:'10',btnDuctAdd:'',btnDuctRun:'',btnDuctClear:'',btnDuctSave:'',ductResult:'',ductSegments:''}))els[id]={value,dataset:{},innerHTML:'',listeners:[],addEventListener(type,fn){this.listeners.push(fn)}};
let stored;
const c={S:null,$:id=>els[id],document:{readyState:'loading',addEventListener(){}},setTimeout(){},uid:()=>Math.random().toString(),esc:String,fmt:(n,d)=>Number(n).toFixed(d),toast(){},confirm:()=>true,renderDash(){}};
c.window=c;c.D=()=>c.S.data[c.S.activeId];c.saveAll=()=>stored=JSON.stringify(c.S);
vm.createContext(c);
let error;
try{vm.runInContext(source,c)}catch(e){error=e.message}
c.S={activeId:'p1',data:{p1:{calcs:[]},p2:{calcs:[]}}};
c.bindDuctModule();
const click=id=>els[id].listeners.forEach(f=>f({preventDefault(){},stopPropagation(){}}));
click('btnDuctAdd');
assert.equal(error,undefined);assert.equal(c.D().ductSegments.length,1);
c.bindDuctModule();c.bindDuctModule();click('btnDuctAdd');assert.equal(c.D().ductSegments.length,2);
click('btnDuctRun');click('btnDuctSave');assert.equal(c.D().calcs.length,1);assert(els.ductResult.innerHTML.includes('8.33'));
c.S=JSON.parse(stored);assert.equal(c.D().ductSegments.length,2);
c.S.activeId='p2';c.bindDuctModule();assert.equal(c.D().ductSegments.length,0);click('btnDuctAdd');assert.equal(c.D().ductSegments.length,1);assert.equal(c.S.data.p1.ductSegments.length,2);
click('btnDuctClear');assert.equal(c.D().ductSegments.length,0);assert.equal(c.S.data.p1.ductSegments.length,2);
c.S.activeId='p1';els.dpQ.value='0';click('btnDuctAdd');assert.equal(c.D().ductSegments.length,2);
c.ductDel(0);assert.equal(c.D().ductSegments.length,1);
console.log('PASS: delayed startup, add, repeated binding, calculate, report save, state roundtrip, project isolation, clear, invalid input, delete');

}

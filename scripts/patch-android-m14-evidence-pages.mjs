import { readFile, writeFile } from 'node:fs/promises';

const file='www/index.html';
const PATCH='FEP-ANDROID-M14-EVIDENCE-v1';
let html=await readFile(file,'utf8');
if(html.includes(PATCH)){console.log(PATCH+' already applied');process.exit(0);}

const asset=async name=>'data:image/jpeg;base64,'+(await readFile('assets/reg-evidence/'+name)).toString('base64');
const shared41=await asset('m14-p41-parking-outdoor.jpg');
const entries={
  'm14-parking-vent':{image:shared41,note:'مبحث ۱۴، صفحه ۴۱: جدول کمینه هوای ورودی از بیرون و هوای تخلیه مورد نیاز فضاهای با کاربری مختلف؛ ردیف پارکینگ.',page:41},
  'm14-outdoor-air':{image:shared41,note:'مبحث ۱۴، صفحه ۴۱: جدول کمینه هوای ورودی از بیرون و هوای تخلیه مورد نیاز فضاهای با کاربری مختلف.',page:41},
  'm14-duct':{image:await asset('m14-p66-plenum-duct.jpg'),note:'مبحث ۱۴، صفحه ۶۶: الزامات کانال‌کشی و پلنوم و کنترل‌های مرتبط با حریق.',page:66},
  'm14-smoke-detector':{image:await asset('m14-p75-smoke-detector.jpg'),note:'مبحث ۱۴، صفحه ۷۵: بخش ۱۴-۶-۶، سیستم‌های آشکارساز دود مرتبط با سیستم توزیع و هوارسانی.',page:75},
  'm14-engine-room':{image:await asset('m14-p36-p109-mech.jpg'),note:'مبحث ۱۴، صفحات ۳۶ و ۱۰۹: تأمین هوا و کنترل دما در محل دستگاه‌ها و فصل تأمین هوای احتراق.',page:'36 و 109'}
};

const marker='const REG_SOURCE_EVIDENCE=';
const start=html.indexOf(marker);
if(start<0)throw new Error('REG_SOURCE_EVIDENCE not found after Android preparation');
const fn=html.indexOf('function openRegSourceEvidence',start);
if(fn<0)throw new Error('openRegSourceEvidence not found');
const close=html.lastIndexOf('};',fn);
if(close<start)throw new Error('REG_SOURCE_EVIDENCE closing token not found');
const oldBlock=html.slice(start,close+2);
for(const id of Object.keys(entries)) if(oldBlock.includes(`"${id}"`)||oldBlock.includes(`'${id}'`)) throw new Error('M14 evidence already exists unexpectedly: '+id);

const injected=Object.entries(entries).map(([id,v])=>JSON.stringify(id)+':'+JSON.stringify(v)).join(',\n');
html=html.slice(0,close)+',\n'+injected+'\n'+html.slice(close);

// Insert the QA marker only at the real final body close. The document contains literal </body>
// strings inside JavaScript report templates, so a first-match replace would corrupt JavaScript.
const bodyClose=html.toLowerCase().lastIndexOf('</body>');
if(bodyClose<0)throw new Error('final </body> not found');
html=html.slice(0,bodyClose)+`<!-- ${PATCH} -->\n`+html.slice(bodyClose);

// Correct the generic source label for the mechanical-room item when the exact old rule is present.
html=html.replace("id:'m14-engine-room',title:'تهویه موتورخانه، هوای احتراق و دفع حرارت کنترل شود',src:'مبحث ۱۴',ref:'فصل مرتبط'","id:'m14-engine-room',title:'تهویه موتورخانه، هوای احتراق و دفع حرارت کنترل شود',src:'مبحث ۱۴',ref:'فصل ۳ و ۹'");

for(const [id,v] of Object.entries(entries)){
  const token=JSON.stringify(id)+':';
  const count=html.split(token).length-1;
  if(count!==1)throw new Error(`Expected one evidence entry for ${id}, got ${count}`);
  if(!v.image.startsWith('data:image/jpeg;base64,')||v.image.length<25000)throw new Error('Invalid evidence image: '+id);
}
if(!html.includes(PATCH))throw new Error('patch marker missing');
await writeFile(file,html,'utf8');
console.log('Applied and verified '+PATCH+' for five M14 checklist controls');

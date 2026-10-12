import { readFile, writeFile } from 'node:fs/promises';

const path='www/index.html';
let s=await readFile(path,'utf8');

/* FEP-ANDROID-REPORT-PAGINATION-v2
   Keep mobile preview rules screen-only, preserve print page breaks,
   keep the cover on one A4 page, and add Chromium page counters. */
const pageRule='@page{size:A4;margin:14mm 12mm}';
if(!s.includes(pageRule)) throw new Error('Android report pagination patch: base @page rule not found');
s=s.replace(pageRule,'@page{size:A4;margin:14mm 12mm 18mm;@bottom-center{content:"صفحه " counter(page) " از " counter(pages);font-family:Tahoma,Vazirmatn,sans-serif;font-size:9pt;color:#687386}}');

const coverRule='.cover{min-height:235mm;display:flex;flex-direction:column;justify-content:center;text-align:center;border:2px solid #172033;padding:30px}';
if(!s.includes(coverRule)) throw new Error('Android report pagination patch: cover rule not found');
s=s.replace(coverRule,'.cover{min-height:0;height:248mm;display:flex;flex-direction:column;justify-content:center;text-align:center;border:2px solid #172033;padding:18px;break-after:page;page-break-after:always}');

s=s.replace('.cover .meta{margin:35px auto 0;width:85%;border-collapse:collapse}','.cover .meta{margin:18px auto 0;width:85%;border-collapse:collapse}');
s=s.replace('.cover .meta td{border:1px solid #aaa;padding:9px;text-align:right}','.cover .meta td{border:1px solid #aaa;padding:6px;text-align:right}');
s=s.replace('.section{page-break-inside:avoid;margin:0 0 22px}','.section{page-break-inside:auto;break-inside:auto;margin:0 0 22px}');
s=s.replace('.tbl{width:100%;border-collapse:collapse}','.tbl{width:100%;border-collapse:collapse;break-inside:auto}.tbl tr{break-inside:avoid;page-break-inside:avoid}');
s=s.replace("let h=css+'<div class=\"report\">';","let h=css+'<!-- FEP-ANDROID-REPORT-PAGINATION-v2 --><div class=\"report\">';");


const start=s.indexOf('async function doPrint(){');
const end=s.indexOf('/* ================= مدیریت پروژه‌ها و گزارش ================= */',start);
if(start<0||end<0) throw new Error('Android report patch aborted: report function boundaries not found');

const replacement=String.raw`
function androidReportDocument(reportHtml){
  /* FEP-ANDROID-PDF-TEXT-v2
     buildReportHTML already carries the report-only CSS. Do not copy the whole
     application stylesheet into the print document; app print rules target
     #printArea and can force raster/hidden layout paths in a standalone WebView. */
  return '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>گزارش کامل Fire Executive Pro</title><style>html,body{margin:0;background:#f4f6fb}body{padding:12px;box-sizing:border-box}.report{width:100%;max-width:900px;min-width:0;margin:0 auto}@media screen and (max-width:800px){body{padding:6px!important}.report{width:100%!important;max-width:none!important;min-width:0!important;margin:0!important}.cover{min-height:auto!important;height:auto!important;padding:20px 12px!important}.cover h1{font-size:21px!important;line-height:1.6!important}.cover .big{font-size:14px!important}.cover .meta{width:100%!important}.summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}.tbl{width:100%!important;max-width:100%!important;table-layout:fixed!important}.tbl th,.tbl td{padding:5px!important;font-size:11px!important;overflow-wrap:anywhere!important;word-break:break-word!important}.section{page-break-inside:auto!important;margin-bottom:16px!important}.pagebreak{page-break-before:auto!important}.sign{flex-direction:column!important;gap:16px!important;margin-top:28px!important}figure{width:100%!important;margin:6px 0 10px!important}img{max-width:100%!important;height:auto!important}}@media print{html,body{background:#fff!important}body{padding:0!important}.cover{break-after:page!important;page-break-after:always!important}}</style></head><body>'+reportHtml+'</body></html>';
}

async function androidNativePrintDocument(doc){
  const nativePrint=window.Capacitor?.Plugins?.FepPrint;
  if(!nativePrint||typeof nativePrint.printHtml!=='function') throw new Error('سرویس چاپ اندروید در دسترس نیست');
  await nativePrint.printHtml({html:doc,title:'گزارش Fire Executive Pro'});
}

async function doPrint(){
  try{
    toast('در حال آماده‌سازی گزارش کامل...');
    let map={};
    try{map=await collectPhotoMap();}catch(e){console.warn('photo load issue',e);}
    const reportHtml=buildReportHTML(map);
    const doc=androidReportDocument(reportHtml);
    await androidNativePrintDocument(doc);
    toast('پنجره چاپ اندروید باز شد.');
    setTimeout(dropPhotoCache,1500);
  }catch(err){
    console.error('android print error',err);
    toast('چاپ گزارش آماده نشد: '+(err?.message||'خطای نامشخص'),'err');
  }
}

function closeAndroidReportPreview(fromHistory=false){
  const overlay=document.getElementById('androidReportPreview');
  if(overlay) overlay.remove();
  document.documentElement.style.overflow='';
  document.body.style.overflow='';
  if(!fromHistory && history.state?.fepReportPreview){
    try{history.back();}catch(e){}
  }
}

window.addEventListener('popstate',()=>{
  if(document.getElementById('androidReportPreview')) closeAndroidReportPreview(true);
});

async function doPreview(){
  try{
    let map={};
    try{map=await collectPhotoMap();}catch(e){console.warn('photo load issue',e);}
    const reportHtml=buildReportHTML(map);
    const doc=androidReportDocument(reportHtml);

    closeAndroidReportPreview(true);
    const overlay=document.createElement('div');
    overlay.id='androidReportPreview';
    overlay.dir='rtl';
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#f4f6fb;display:flex;flex-direction:column;overflow:hidden;';

    const bar=document.createElement('div');
    bar.style.cssText='flex:0 0 auto;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:10px 12px;background:#111923;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);padding-top:max(10px,env(safe-area-inset-top));';

    const back=document.createElement('button');
    back.type='button';
    back.textContent='← بازگشت به گزارش';
    back.style.cssText='border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:800;background:#fff;color:#111923;';
    back.onclick=()=>closeAndroidReportPreview(false);

    const print=document.createElement('button');
    print.type='button';
    print.textContent='چاپ / ذخیره PDF';
    print.style.cssText='border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:800;background:#9f1d27;color:#fff;';
    print.onclick=async()=>{
      try{await androidNativePrintDocument(doc);}catch(err){toast('چاپ گزارش آماده نشد: '+(err?.message||'خطای نامشخص'),'err');}
    };

    const title=document.createElement('div');
    title.textContent='پیش‌نمایش گزارش کامل';
    title.style.cssText='font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

    bar.append(back,title,print);
    const frame=document.createElement('iframe');
    frame.title='پیش‌نمایش گزارش کامل';
    frame.style.cssText='flex:1 1 auto;width:100%;min-height:0;border:0;background:#f4f6fb;';
    frame.srcdoc=doc;
    overlay.append(bar,frame);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
    try{history.pushState({fepReportPreview:true},'',location.href);}catch(e){}
    setTimeout(dropPhotoCache,1500);
  }catch(err){
    console.error('android preview error',err);
    toast('پیش‌نمایش گزارش کامل آماده نشد: '+(err?.message||'خطای نامشخص'),'err');
  }
}
`;

s=s.slice(0,start)+replacement+s.slice(end);
s=s.replace(' چاپ مستقیم گزارش کامل (بدون پاپ‌آپ)',' چاپ / ذخیره PDF گزارش کامل');
s=s.replace(' پیش‌نمایش در تب جدید',' پیش‌نمایش گزارش');

if((s.match(/async function doPrint\(\)/g)||[]).length!==1) throw new Error('Android report patch failed: doPrint count');
if((s.match(/async function doPreview\(\)/g)||[]).length!==1) throw new Error('Android report patch failed: doPreview count');
if(!s.includes('androidNativePrintDocument')||!s.includes('androidReportPreview')) throw new Error('Android report patch markers missing');

await writeFile(path,s,'utf8');
console.log('Android report preview/print patch applied to www/index.html');

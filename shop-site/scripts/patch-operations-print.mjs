import fs from 'node:fs';
const path='shop-site/public/admin/management-admin.js';
let s=fs.readFileSync(path,'utf8');
if(!s.includes('/packing-slip')){
 const needle='<a class="btn gray" href="/api/admin/manage/orders/${id}/invoice" target="_blank" rel="noopener">چاپ صورتحساب / PDF</a>';
 const extra=needle+'<a class="btn gray" href="/api/admin/manage/orders/${id}/packing-slip" target="_blank" rel="noopener">برگه بسته‌بندی</a><a class="btn gray" href="/api/admin/manage/orders/${id}/shipping-label" target="_blank" rel="noopener">لیبل ارسال</a>';
 if(!s.includes(needle))throw new Error('invoice action anchor not found');
 s=s.replace(needle,extra);
 fs.writeFileSync(path,s);
 console.log('operations print admin links patch applied');
}else console.log('operations print admin links already present');

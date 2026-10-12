import fs from 'node:fs';
const path='shop-site/public/index.html';let s=fs.readFileSync(path,'utf8');
if(!s.includes('customer-account-entry-v2')){
 const marker='<a href="/track/">پیگیری سفارش</a>';
 if(!s.includes(marker))throw new Error('customer account footer marker not found');
 const link='<a id="customerAccountLink" href="/account/" hidden aria-hidden="true">حساب کاربری</a>';
 s=s.replace(marker,marker+link);
 const script=`<script id="customer-account-entry-v2">(()=>{const a=document.getElementById('customerAccountLink');if(!a)return;fetch('/api/customer/config',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(d=>{if(d?.login_enabled){a.hidden=false;a.removeAttribute('aria-hidden')}}).catch(()=>{})})();</script>`;
 s=s.replace('</body>',script+'\n</body>');
}
if(!s.includes('customer-account-entry-v2')||!s.includes('id="customerAccountLink"'))throw new Error('customer account link patch failed');
fs.writeFileSync(path,s);console.log('customer account conditional link patch applied');

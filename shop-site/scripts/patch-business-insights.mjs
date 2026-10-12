import fs from 'node:fs';
const admin='shop-site/public/admin/index.html';let s=fs.readFileSync(admin,'utf8');
if(!s.includes('/admin/business-insights-admin.js')){
 s=s.replace('</body>','<script src="/admin/business-insights-admin.js" defer></script>\n</body>');
 fs.writeFileSync(admin,s);
}
console.log('business insights admin patch applied');

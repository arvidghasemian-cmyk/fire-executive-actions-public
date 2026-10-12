import fs from 'node:fs';
const admin='shop-site/public/admin/index.html';let a=fs.readFileSync(admin,'utf8');
if(!a.includes('/admin/cost-management-admin.js')){a=a.replace('</body>','<script src="/admin/cost-management-admin.js" defer></script>\n</body>');fs.writeFileSync(admin,a)}
console.log('cost management admin patch applied');

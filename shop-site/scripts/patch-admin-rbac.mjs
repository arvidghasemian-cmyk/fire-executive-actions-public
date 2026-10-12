import fs from 'node:fs';
const path='shop-site/public/admin/index.html';let s=fs.readFileSync(path,'utf8');
if(!s.includes('/admin/admin-rbac-admin.js'))s=s.replace('</body>','<script src="/admin/admin-rbac-admin.js" defer></script>\n</body>');
fs.writeFileSync(path,s);console.log('admin RBAC panel patch applied');

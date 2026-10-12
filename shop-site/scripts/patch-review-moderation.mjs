import fs from 'node:fs';
const path='shop-site/public/admin/index.html';
let s=fs.readFileSync(path,'utf8');
if(!s.includes('/admin/review-moderation-admin.js')){
  if(!s.includes('</body>'))throw new Error('admin body marker not found');
  s=s.replace('</body>','<script src="/admin/review-moderation-admin.js" defer></script>\n</body>');
}
fs.writeFileSync(path,s);
console.log('review moderation admin patch applied');

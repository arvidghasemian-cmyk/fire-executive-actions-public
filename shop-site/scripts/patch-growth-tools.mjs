import fs from 'node:fs';
const path='shop-site/public/index.html';let s=fs.readFileSync(path,'utf8');
if(!s.includes('growth-tools-v1'))s=s.replace('</body>','<script src="/growth-tools.js" defer></script>\n<!-- growth-tools-v1 -->\n</body>');
if(!s.includes('/growth-tools.js'))throw new Error('growth tools script hook missing');
fs.writeFileSync(path,s);console.log('wishlist and cart recovery patch applied');

import fs from 'node:fs';
const path='shop-site/public/index.html';let s=fs.readFileSync(path,'utf8');
if(!s.includes('advanced-product-filters-v1'))s=s.replace('</body>','<script src="/advanced-filters.js" defer></script>\n<!-- advanced-product-filters-v1 -->\n</body>');
if(!s.includes('/advanced-filters.js'))throw new Error('advanced filters script hook missing');
fs.writeFileSync(path,s);console.log('advanced storefront filters patch applied');

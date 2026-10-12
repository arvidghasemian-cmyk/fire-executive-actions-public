import fs from 'node:fs';
const path='shop-site/public/index.html';let s=fs.readFileSync(path,'utf8');
if(!s.includes('variant-cart-v1')){
 s=s.replace("function add(id){\n  cart[id]=(cart[id]||0)+1;",`function add(id){\n  const selectedProduct=products.find(p=>p.id==id);\n  if(selectedProduct?.has_variants){location.href='/product/'+encodeURIComponent(selectedProduct.slug)+'/';return}\n  cart[id]=(cart[id]||0)+1;`);
 s=s.replace("function removeCart(id){delete cart[id];saveCart();renderCart()}",`function removeCart(id){delete cart[id];if(Number(id)<0){try{const k='soroush_variant_cart_meta_v1',m=JSON.parse(localStorage.getItem(k)||'{}')||{};delete m[id];localStorage.setItem(k,JSON.stringify(m))}catch{}}saveCart();renderCart()}`);
 const old="function cartEntries(){return Object.entries(cart).map(([id,qty])=>({product:products.find(p=>p.id==id),qty:Number(qty)})).filter(x=>x.product&&x.qty>0)}";
 const next=`function cartEntries(){let vm={};try{vm=JSON.parse(localStorage.getItem('soroush_variant_cart_meta_v1')||'{}')||{}}catch{}return Object.entries(cart).map(([id,qty])=>{if(Number(id)<0&&vm[id]){const m=vm[id],base=products.find(p=>p.id==m.product_id||p.slug===m.slug);if(!base)return null;return{product:{...base,id:Number(id),name:base.name+' — '+m.title,price:Number.isInteger(m.price)?m.price:base.price,stock:m.stock},qty:Number(qty),variant:{id:Number(m.variant_id),title:m.title,sku:m.sku||''}}}const p=products.find(p=>p.id==id);return p?{product:p,qty:Number(qty),variant:null}:null}).filter(x=>x&&x.product&&x.qty>0)}`;
 if(!s.includes(old))throw new Error('variant cartEntries marker not found');s=s.replace(old,next);
 s=s.replace("const items=cartEntries().map(x=>({slug:x.product.slug,quantity:x.qty}));","const items=cartEntries().map(x=>({slug:x.product.slug,quantity:x.qty,...(x.variant?{variant_id:x.variant.id}:{})}));");
 s=s.replace('sku:row.sku,featured:row.featured}))','sku:row.sku,featured:row.featured,has_variants:!!row.has_variants}))');
 s=s.replace('</body>','<!-- variant-cart-v1 -->\n</body>');
}
fs.writeFileSync(path,s);
const mg='shop-site/public/storefront-management.js';let m=fs.readFileSync(mg,'utf8');
m=m.replace("entries.map(x=>({slug:x.product.slug,quantity:x.qty}))","entries.map(x=>({slug:x.product.slug,quantity:x.qty,...(x.variant?{variant_id:x.variant.id}:{})}))");
fs.writeFileSync(mg,m);
console.log('variant cart patch applied');

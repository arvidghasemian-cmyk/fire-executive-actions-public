import fs from 'node:fs';
const path='shop-site/public/index.html';let s=fs.readFileSync(path,'utf8');
if(!s.includes('storefront-management-v1')){
 s=s.replace('const grid=document.getElementById',`const safeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));\nconst grid=document.getElementById`);
 s=s.replace('const runtimeIndex=list.map(p=>({id:p.id,slug:p.slug,name:p.name,aliases:p.aliases||[]}));','const runtimeIndex=list.map(p=>({id:p.id,slug:p.slug,name:p.name,aliases:[...(p.aliases||[]),p.sku||\'\',p.brand||\'\',p.model||\'\']}));');
 s=s.replace(' grid.innerHTML=list.map(p=>',` const sort=document.getElementById('sort').value,stockOnly=document.getElementById('availableOnly')?.checked;
 if(stockOnly)list=list.filter(p=>Number.isFinite(p.stock)&&p.stock>0);
 if(sort==='price-asc')list.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
 if(sort==='price-desc')list.sort((a,b)=>(b.price??-1)-(a.price??-1));
 if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'fa'));
 if(sort==='featured')list.sort((a,b)=>Number(b.featured)-Number(a.featured));
 grid.innerHTML=list.map(p=>`);
 for(const key of ['name','badge','img','srcset','alt'])s=s.replaceAll('${p.'+key+'}','${safeHtml(p.'+key+')}');
 s=s.replace('<div class="sku">صفحه محصول در حال تکمیل</div>','<div class="sku">${safeHtml(p.sku||p.brand||\'\')}</div>');
 s=s.replace('${Number.isFinite(p.price)?money(p.price):"استعلام قیمت"}', '${p.compare>p.price&&Number.isFinite(p.price)?\'<del style="font-size:10px;color:#777">\'+money(p.compare)+\'</del><br>\':\'\'}${Number.isFinite(p.price)?money(p.price):"استعلام قیمت"}');
 s=s.replace("    render();renderCart();\n  }catch(e){console.warn('catalog sync skipped')}",`    const prior=new Map(products.map(p=>[p.slug,p]));
    products.splice(0,products.length,...(data.products||[]).map(row=>({...prior.get(row.slug),id:row.id,slug:row.slug,name:row.name,cat:row.category,category:row.category,price:row.status==='priced'?row.price_toman:null,compare:row.compare_at_price_toman,stock:row.stock_qty,status:row.status,img:row.image_url||'',srcset:'',alt:row.name,brand:row.brand,model:row.model,sku:row.sku,featured:row.featured})));
    render();renderCart();document.dispatchEvent(new Event('shop:catalog'));
  }catch(e){grid.textContent='دریافت کالاها انجام نشد؛ صفحه را دوباره باز کنید.';console.warn('catalog sync skipped')}`);
 s=s.replace('loadCart();render();renderCart();syncCatalog();','loadCart();syncCatalog();');
 s=s.replace("if(!res.ok)return;\n    const data=await res.json();", "if(!res.ok)throw new Error('catalog unavailable');\n    const data=await res.json();");
 s=s.replace("const res=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});", "const requestKey=await window.shopOrderKey(payload);\n    const res=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json','idempotency-key':requestKey},body:JSON.stringify(payload)});");
 s=s.replace("success.style='';success.textContent=", "window.shopOrderKeyClear();success.style='';success.textContent=");
 s=s.replace('</body>','<script src="/storefront-management.js" defer></script>\n<!-- storefront-management-v1 -->\n</body>');
}
fs.writeFileSync(path,s);console.log('management storefront patch applied');
await import('./patch-sales-tools.mjs');
await import('./patch-customer-account.mjs');
await import('./patch-variant-cart.mjs');
await import('./patch-advanced-filters.mjs');
await import('./patch-growth-tools.mjs');
await import('./patch-sales-growth.mjs');
await import('./patch-margin-protection.mjs');
await import('./patch-business-insights.mjs');
await import('./patch-cost-management.mjs');
await import('./patch-audit-viewer.mjs');
await import('./patch-admin-rbac.mjs');
await import('./patch-operations-print.mjs');
await import('./patch-review-moderation.mjs');
// Homepage layout controls stay isolated from order/product management.
{
 const adminPath='shop-site/public/admin/index.html';
 let a=fs.readFileSync(adminPath,'utf8');
 if(!a.includes('/admin/home-layout-admin-v1.js'))a=a.replace('</body>','<script src="/admin/home-layout-admin-v1.js?v=1" defer></script>\n</body>');
 if(!a.includes('/admin/home-layout-admin-v1.js'))throw new Error('homepage layout admin asset was not linked');
 fs.writeFileSync(adminPath,a);
}

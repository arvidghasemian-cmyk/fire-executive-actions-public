import fs from 'node:fs';
const home='shop-site/public/index.html';let s=fs.readFileSync(home,'utf8');
if(!s.includes('margin-protection-checkout-v1')){
 const oldBody="body:JSON.stringify({code:input.value.trim(),subtotal_toman:sub})";
 const newBody="body:JSON.stringify({code:input.value.trim(),subtotal_toman:sub,items:cartEntries().map(x=>({slug:x.product.slug,quantity:x.qty,...(x.variant?{variant_id:x.variant.id}:{})}))})";
 if(!s.includes(oldBody))throw new Error('margin protection discount request marker not found');
 s=s.replace(oldBody,newBody);
 const oldMsg="msg.textContent=d.free_shipping?'ارسال رایگان اعمال شد.':'تخفیف '+money(discountAmount)+' اعمال شد.';";
 const newMsg="msg.textContent=d.free_shipping?'ارسال رایگان اعمال شد.':('تخفیف '+money(discountAmount)+' اعمال شد.'+(d.margin_guard?.limited?' مبلغ تخفیف برای حفظ کف سود به سقف امن محدود شد.':''));";
 if(!s.includes(oldMsg))throw new Error('margin protection discount message marker not found');
 s=s.replace(oldMsg,newMsg);
 s=s.replace('</body>','<!-- margin-protection-checkout-v1 -->\n</body>');
 fs.writeFileSync(home,s);
}
const admin='shop-site/public/admin/index.html';let a=fs.readFileSync(admin,'utf8');
if(!a.includes('/admin/margin-protection-admin.js')){a=a.replace('</body>','<script src="/admin/margin-protection-admin.js" defer></script>\n</body>');fs.writeFileSync(admin,a)}
console.log('margin protection storefront and admin patch applied');

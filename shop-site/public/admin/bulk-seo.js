// Bulk SEO editor: only SEO title/description are editable.
(function(){
 const $=id=>document.getElementById(id);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const suggestions=[
 [/دتکتور.*حرارت/,['خرید دتکتور حرارتی | سنسور گرما اعلام حریق','دتکتور حرارتی یا سنسور تشخیص گرما برای سیستم اعلام حریق؛ مشخصات و شرایط خرید آشکارساز حرارت را در سروش ایمنی شهر بررسی کنید.']],
 [/پنل.*اعلام حریق/,['خرید پنل اعلام حریق | مرکز کنترل آتش نشانی','پنل یا دستگاه مرکزی اعلام حریق برای کنترل هشدارهای ساختمان؛ مشخصات مرکز کنترل و شرایط خرید را در سروش ایمنی شهر بررسی کنید.']],
 [/شستی.*اعلام حریق/,['خرید شستی اعلام حریق | دکمه هشدار آتش سوزی','شستی اعلام حریق، دکمه اعلام خطر و کلید هشدار آتش‌سوزی؛ مشخصات و قیمت شستی آتش نشانی در فروشگاه سروش ایمنی شهر.']],
 [/اسپرینکلر/,['خرید اسپرینکلر آتش نشانی | آبپاش اطفای حریق','اسپرینکلر یا آبفشان آتش نشانی برای سامانه اطفای حریق؛ مشخصات سر اسپرینکلر، نوع نصب و شرایط خرید را بررسی کنید.']],
 [/کپسول.*پودر/,['خرید کپسول آتش نشانی پودر و گاز | خاموش کننده','خرید کپسول آتش نشانی پودر و گاز، خاموش کننده دستی و تجهیزات اطفای حریق؛ بررسی ظرفیت، مشخصات و قیمت در سروش ایمنی شهر.']],
 [/روشنایی اضطراری/,['خرید چراغ روشنایی اضطراری | چراغ زمان قطع برق','چراغ روشنایی اضطراری و چراغ زمان قطع برق؛ بررسی مدل، مشخصات و قیمت چراغ اضطراری برای ساختمان در فروشگاه سروش ایمنی شهر.']],
 [/دتکتور.*دود/,['خرید دتکتور دود | سنسور دودی اعلام حریق','دتکتور دود، سنسور دودی و حسگر تشخیص دود برای سیستم اعلام حریق؛ بررسی مشخصات و شرایط خرید در سروش ایمنی شهر.']],
 [/نشت.?یاب.*گاز/,['خرید نشت یاب گاز شهری | سنسور هشدار نشت گاز','نشت یاب گاز شهری، سنسور تشخیص گاز و دستگاه هشداردهنده نشت گاز؛ بررسی مشخصات و قیمت در سروش ایمنی شهر.']],
 [/آژیر.*فلاشر/,['خرید آژیر فلاشر اعلام حریق | آژیر آتش نشانی','آژیر فلاشر اعلام حریق، آژیر هشدار آتش نشانی و آژیر صوتی نوری؛ بررسی مشخصات و قیمت در سروش ایمنی شهر.']]
 ];
 let original=new Map(),rows=[];
 function propose(name){const found=suggestions.find(([re])=>re.test(name));return found?found[1]:null}
 async function open(){
  const [basic,details]=await Promise.all([api('/api/admin/commerce/products'),api('/api/admin/product-details')]);
  original=new Map(details.products.map(p=>[p.slug,p]));
  rows=basic.products.filter(p=>Number(p.is_active)===1&&p.status!=='hidden'&&p.name!=='حدخد').map(p=>({...p,detail:original.get(p.slug)||{}}));
  const tbody=$('bulkSeoRows');tbody.innerHTML=rows.map((p,i)=>{
   const d=p.detail, suggestion=propose(p.name),title=d.seo_title||'',desc=d.seo_description||'';
   return '<tr data-index="'+i+'"><td><label><input type="checkbox" class="bulkPick"> '+escape(p.name)+'</label></td>'+
   '<td><input class="bulkTitle" maxlength="110" value="'+escape(title)+'"><small class="titleLen"></small></td>'+
   '<td><textarea class="bulkDesc" maxlength="320">'+escape(desc)+'</textarea><small class="descLen"></small></td>'+
   '<td><button type="button" class="btn gray bulkSuggest" '+(suggestion?'':'disabled')+'>پیشنهاد</button></td><td class="bulkStatus"></td></tr>';
  }).join('');
  tbody.querySelectorAll('tr').forEach(tr=>{
   const i=Number(tr.dataset.index),s=propose(rows[i].name);
   tr.querySelector('.bulkSuggest').onclick=()=>{if(!s)return;tr.querySelector('.bulkTitle').value=s[0];tr.querySelector('.bulkDesc').value=s[1];tr.querySelector('.bulkPick').checked=true;count(tr)};
   for(const c of ['.bulkTitle','.bulkDesc'])tr.querySelector(c).addEventListener('input',()=>count(tr));
   count(tr);
  });
  $('bulkSeoPanel').classList.remove('hidden');
  $('bulkSeoMessage').textContent='پیشنهادها ابتدا فقط در جدول قرار می‌گیرند؛ تا زمان زدن ذخیره، هیچ داده‌ای تغییر نمی‌کند.';
 }
 function count(tr){
  const t=tr.querySelector('.bulkTitle').value,d=tr.querySelector('.bulkDesc').value;
  tr.querySelector('.titleLen').textContent=t.length+' نویسه';
  tr.querySelector('.descLen').textContent=d.length+' نویسه';
 }
 async function save(){
  const selected=[...$('bulkSeoRows').querySelectorAll('tr')].filter(tr=>tr.querySelector('.bulkPick').checked);
  if(!selected.length){$('bulkSeoMessage').textContent='حداقل یک محصول را انتخاب کنید.';return}
  if(!confirm('عنوان و توضیحات سئوی '+selected.length+' محصول ذخیره شود؟'))return;
  const button=$('bulkSeoSave');button.disabled=true;
  let ok=0,fail=0;
  for(const tr of selected){
   const p=rows[Number(tr.dataset.index)],d=original.get(p.slug)||{},title=tr.querySelector('.bulkTitle').value.trim(),desc=tr.querySelector('.bulkDesc').value.trim(),status=tr.querySelector('.bulkStatus');
   if(!title||!desc){status.textContent='عنوان و توضیح نباید خالی باشند';fail++;continue}
   try{
    // Backend uses nullish fallback for omitted properties: only update SEO metadata.
    await api('/api/admin/product-details/'+encodeURIComponent(p.slug),{method:'PUT',body:JSON.stringify({seo_title:title,seo_description:desc})});
    const verified=await api('/api/admin/product-details');
    const saved=verified.products.find(x=>x.slug===p.slug);
    if(!saved||saved.seo_title!==title||saved.seo_description!==desc)throw new Error('ذخیره تأیید نشد');
    original.set(p.slug,saved);
    status.textContent='ذخیره شد';tr.querySelector('.bulkPick').checked=false;ok++;
   }catch(e){status.textContent='خطا: '+e.message;fail++}
  }
  $('bulkSeoMessage').textContent=ok+' محصول ذخیره شد؛ '+fail+' مورد ناموفق.';
  button.disabled=false;
  if(ok)await loadProducts();
 }
 document.addEventListener('DOMContentLoaded',()=>{
  $('openBulkSeo').onclick=()=>open().catch(e=>{$('bulkSeoMessage').textContent='خطا: '+e.message;$('bulkSeoPanel').classList.remove('hidden')});
  $('bulkSeoSave').onclick=save;
  $('bulkSeoClose').onclick=()=>$('bulkSeoPanel').classList.add('hidden');
  $('bulkSeoSelectAll').onchange=e=>document.querySelectorAll('#bulkSeoRows .bulkPick').forEach(c=>c.checked=e.target.checked);
 });
})();

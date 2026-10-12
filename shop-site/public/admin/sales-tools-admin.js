(()=>{
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function request(url,opt={}){
    const r=await fetch(url,{credentials:'same-origin',...opt,headers:{'content-type':'application/json',...(opt.headers||{})}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'خطا در ذخیره اطلاعات فایل فنی');
    return d;
  }
  function ensureStyle(){
    if(document.getElementById('sales-tools-admin-style'))return;
    const st=document.createElement('style');st.id='sales-tools-admin-style';
    st.textContent='.sales-tools-datasheet-admin{margin:10px 0;border:1px dashed #d0d5dd;border-radius:12px;padding:10px;background:#f9fafb}.sales-tools-datasheet-admin label{display:block;font-size:10px;font-weight:900;margin-bottom:5px}.sales-tools-datasheet-admin input{width:100%;border:1px solid #e5e7eb;border-radius:9px;padding:9px;background:#fff}.sales-tools-datasheet-admin .sales-tools-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:7px}';
    document.head.appendChild(st);
  }
  function fieldHtml(value=''){
    return `<div class="sales-tools-datasheet-admin">
      <label>دیتاشیت / کاتالوگ محصول</label>
      <input class="sales-datasheet-input" type="text" inputmode="url" placeholder="https://.../datasheet.pdf یا /files/..." value="${escapeHtml(value||'')}">
      <div class="mut">لینک PDF یا صفحه رسمی فنی محصول؛ در صفحه اختصاصی محصول به مشتری نمایش داده می‌شود.</div>
      <div class="sales-tools-actions">
        <button type="button" class="btn gray sales-datasheet-save">ذخیره فایل فنی</button>
        <span class="sales-datasheet-result mut" role="status"></span>
      </div>
    </div>`;
  }
  async function install(){
    ensureStyle();
    const cards=[...document.querySelectorAll('#products .prod')];
    if(!cards.length)return;
    let data;try{data=await request('/api/admin/product-sales-tools')}catch{return}
    const map=new Map((data.products||[]).map(x=>[x.slug,x]));
    cards.forEach(card=>{
      if(card.querySelector('.sales-tools-datasheet-admin'))return;
      const details=card.querySelector('details.advanced:not(.manageProductActions)');
      if(!details)return;
      const row=map.get(card.dataset.slug)||{};
      const holder=document.createElement('div');holder.innerHTML=fieldHtml(row.datasheet_url||'');
      const node=holder.firstElementChild;
      details.insertAdjacentElement('afterend',node);
    });
  }
  document.addEventListener('click',async e=>{
    const btn=e.target.closest('.sales-datasheet-save');if(!btn)return;
    const card=btn.closest('.prod'),input=card?.querySelector('.sales-datasheet-input'),out=card?.querySelector('.sales-datasheet-result');
    if(!card||!input||!out)return;
    btn.disabled=true;out.textContent='در حال ذخیره...';
    try{
      await request('/api/admin/product-sales-tools/'+encodeURIComponent(card.dataset.slug),{method:'PUT',body:JSON.stringify({datasheet_url:input.value.trim()})});
      out.style.color='#067647';out.textContent=input.value.trim()?'فایل فنی ذخیره شد.':'لینک فایل فنی حذف شد.';
    }catch(err){out.style.color='#b42318';out.textContent=err.message}
    finally{btn.disabled=false}
  });
  document.addEventListener('shop:products',()=>setTimeout(install,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,100));else setTimeout(install,100);
})();

(()=>{
  const SECTIONS=[
    ['hero','بنر اصلی (Hero)'],
    ['categories','دسته‌بندی تجهیزات'],
    ['products','محصولات فروشگاه'],
    ['trust','مزایا و اعتماد'],
    ['info','راهنمای خرید پایین صفحه']
  ];
  const DEFAULTS={
    home_mobile_show_hero:'0',home_mobile_show_categories:'1',home_mobile_show_products:'1',home_mobile_show_trust:'0',home_mobile_show_info:'1',
    home_mobile_show_technical:'1',home_mobile_show_quote:'1',home_mobile_product_count:'8',home_mobile_order:'categories,products,info,hero,trust',
    home_desktop_show_hero:'1',home_desktop_show_categories:'1',home_desktop_show_products:'1',home_desktop_show_trust:'1',home_desktop_show_info:'1',
    home_desktop_show_technical:'1',home_desktop_show_quote:'1',home_desktop_order:'hero,categories,trust,products,info'
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(url,opt={}){
    const r=await fetch(url,{credentials:'same-origin',...opt,headers:{'content-type':'application/json',...opt.headers}});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'خطا در ارتباط');return d;
  }
  function validOrder(value,fallback){
    const keys=SECTIONS.map(x=>x[0]);
    const arr=String(value||'').split(',').filter(x=>keys.includes(x));
    return new Set(arr).size===keys.length?arr:fallback.split(',');
  }
  function shell(){
    const tabs=document.getElementById('commerceTabs');
    const commerce=document.querySelector('.commerce-shell');
    if(!tabs||!commerce||document.getElementById('pane-homeLayout'))return false;
    tabs.insertAdjacentHTML('beforeend','<button class="commerce-tab" data-pane="homeLayout">صفحه اصلی</button>');
    commerce.insertAdjacentHTML('beforeend',`
      <div id="pane-homeLayout" class="commerce-pane">
        <style>
          .home-layout-admin{display:grid;gap:14px}.home-layout-admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .home-layout-box{border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#fff}
          .home-layout-box h3{margin:0 0 4px;font-size:14px}.home-layout-list{display:grid;gap:7px;margin:10px 0}
          .home-layout-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px;align-items:center;border:1px solid #eaecf0;border-radius:11px;padding:8px;background:#fafafa}
          .home-layout-row label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800}.home-layout-row input{width:auto}
          .home-layout-move{width:34px;height:32px;border:1px solid #d0d5dd;background:#fff;border-radius:8px;cursor:pointer;font-weight:900}
          .home-layout-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.home-layout-options label{font-size:10px;color:#475467}
          .home-layout-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.home-layout-actions .btn{min-width:150px}
          @media(max-width:720px){.home-layout-admin-grid{grid-template-columns:1fr}.home-layout-row{grid-template-columns:minmax(0,1fr) 34px 34px}.home-layout-options{grid-template-columns:1fr}}
        </style>
        <div class="home-layout-admin">
          <div>
            <h3 style="margin:0">چیدمان صفحه اصلی</h3>
            <p class="commerce-help">هدر، جستجو، سبد خرید و لینک‌های حقوقی برای جلوگیری از خراب‌شدن مسیر خرید قفل هستند. بقیه بخش‌ها را برای موبایل و دسکتاپ جداگانه کنترل کن.</p>
          </div>
          <div class="home-layout-admin-grid">
            <section class="home-layout-box" data-home-scope="mobile">
              <h3>موبایل</h3><div class="commerce-help">ترتیب از بالا به پایین</div>
              <div class="home-layout-list"></div>
              <div class="home-layout-options">
                <label>تعداد محصول اولیه<select data-home-product-count><option value="4">4 محصول</option><option value="8">8 محصول</option><option value="12">12 محصول</option></select></label>
                <label><input type="checkbox" data-home-extra="technical"> نمایش «اطلاعات فنی»</label>
                <label><input type="checkbox" data-home-extra="quote"> نمایش «قیمت یا استعلام»</label>
              </div>
            </section>
            <section class="home-layout-box" data-home-scope="desktop">
              <h3>دسکتاپ</h3><div class="commerce-help">ترتیب از بالا به پایین</div>
              <div class="home-layout-list"></div>
              <div class="home-layout-options">
                <label><input type="checkbox" data-home-extra="technical"> نمایش «اطلاعات فنی»</label>
                <label><input type="checkbox" data-home-extra="quote"> نمایش «قیمت یا استعلام»</label>
              </div>
            </section>
          </div>
          <div class="home-layout-actions">
            <button type="button" class="btn red" id="homeLayoutSave">ذخیره تنظیمات صفحه اصلی</button>
            <button type="button" class="btn gray" id="homeLayoutDefaults">بازگردانی چیدمان پیشنهادی</button>
            <a class="btn gray" href="/" target="_blank" rel="noopener">مشاهده صفحه اصلی</a>
          </div>
          <div id="homeLayoutMsg"></div>
        </div>
      </div>`);
    return true;
  }
  function rowHtml(scope,key,label,checked){
    return `<div class="home-layout-row" data-home-section="${key}"><label><input type="checkbox" data-home-visible ${checked?'checked':''}> ${esc(label)}</label><button type="button" class="home-layout-move" data-home-up title="بالا">↑</button><button type="button" class="home-layout-move" data-home-down title="پایین">↓</button></div>`;
  }
  function renderScope(scope,settings){
    const box=document.querySelector(`[data-home-scope="${scope}"]`);if(!box)return;
    const order=validOrder(settings[`home_${scope}_order`],DEFAULTS[`home_${scope}_order`]);
    const labels=Object.fromEntries(SECTIONS);
    box.querySelector('.home-layout-list').innerHTML=order.map(key=>rowHtml(scope,key,labels[key],String(settings[`home_${scope}_show_${key}`]??DEFAULTS[`home_${scope}_show_${key}`])==='1')).join('');
    for(const extra of ['technical','quote'])box.querySelector(`[data-home-extra="${extra}"]`).checked=String(settings[`home_${scope}_show_${extra}`]??DEFAULTS[`home_${scope}_show_${extra}`])==='1';
    if(scope==='mobile')box.querySelector('[data-home-product-count]').value=['4','8','12'].includes(String(settings.home_mobile_product_count))?String(settings.home_mobile_product_count):DEFAULTS.home_mobile_product_count;
  }
  async function load(){
    const msg=document.getElementById('homeLayoutMsg');if(msg)msg.textContent='';
    try{const d=await api('/api/admin/settings');const s={...DEFAULTS,...(d.settings||{})};renderScope('mobile',s);renderScope('desktop',s)}
    catch(e){if(msg)msg.innerHTML='<div class="notice bad">'+esc(e.message)+'</div>'}
  }
  function payload(){
    const out={};
    for(const scope of ['mobile','desktop']){
      const box=document.querySelector(`[data-home-scope="${scope}"]`);
      const rows=[...box.querySelectorAll('[data-home-section]')];
      out[`home_${scope}_order`]=rows.map(r=>r.dataset.homeSection).join(',');
      for(const row of rows)out[`home_${scope}_show_${row.dataset.homeSection}`]=row.querySelector('[data-home-visible]').checked?'1':'0';
      for(const extra of ['technical','quote'])out[`home_${scope}_show_${extra}`]=box.querySelector(`[data-home-extra="${extra}"]`).checked?'1':'0';
    }
    out.home_mobile_product_count=document.querySelector('[data-home-product-count]').value;
    return out;
  }
  function bind(){
    document.addEventListener('click',e=>{
      const tab=e.target.closest?.('[data-pane="homeLayout"]');if(tab)setTimeout(load,0);
      const move=e.target.closest?.('[data-home-up],[data-home-down]');
      if(move){
        const row=move.closest('[data-home-section]'),list=row?.parentElement;if(!row||!list)return;
        if(move.hasAttribute('data-home-up')&&row.previousElementSibling)list.insertBefore(row,row.previousElementSibling);
        if(move.hasAttribute('data-home-down')&&row.nextElementSibling)list.insertBefore(row.nextElementSibling,row);
      }
    });
    document.getElementById('homeLayoutSave').onclick=async e=>{
      const button=e.currentTarget,msg=document.getElementById('homeLayoutMsg');button.disabled=true;
      try{await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(payload())});msg.innerHTML='<div class="notice ok">تنظیمات صفحه اصلی ذخیره شد. برای مشاهده نتیجه صفحه فروشگاه را تازه‌سازی کن.</div>'}
      catch(err){msg.innerHTML='<div class="notice bad">'+esc(err.message)+'</div>'}
      finally{button.disabled=false}
    };
    document.getElementById('homeLayoutDefaults').onclick=()=>{renderScope('mobile',DEFAULTS);renderScope('desktop',DEFAULTS)};
  }
  function init(){
    if(!shell()){setTimeout(init,80);return}
    bind();
    const panel=document.getElementById('panel');
    if(panel&&!panel.classList.contains('hidden'))load();
    const obs=new MutationObserver(()=>{if(panel&&!panel.classList.contains('hidden'))load()});
    if(panel)obs.observe(panel,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
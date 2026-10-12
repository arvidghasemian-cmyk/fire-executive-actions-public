(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0),money=n=>fa(Math.round(Number(n)||0))+' تومان',$=id=>document.getElementById(id);
 async function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',...opt,headers:{'content-type':'application/json',...(opt.headers||{})}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'خطا در ارتباط');return d}
 function statusLabel(x){return x.status==='missing_cost'?'قیمت خرید ثبت نشده':x.status==='below_floor'?'قیمت فروش زیر کف سود':x.status==='ok'?'ایمن':'بدون قیمت فروش'}
 function init(){
  const tabs=$('commerceTabs'),shell=document.querySelector('.commerce-shell');if(!tabs||!shell||$('pane-margin'))return false;
  const style=document.createElement('style');style.textContent='.margin-top-grid{display:grid;grid-template-columns:1.1fr 2fr;gap:12px}.margin-card{border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#fff}.margin-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}.margin-form label{display:grid;gap:5px;font-size:10px;font-weight:800}.margin-form input{border:1px solid #d0d5dd;border-radius:9px;padding:9px;font:inherit}.margin-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.margin-summary>div{border:1px solid #e5e7eb;border-radius:11px;padding:9px}.margin-summary b{display:block;font-size:15px}.margin-summary span{font-size:9px;color:#667085}.margin-list{display:grid;gap:7px;margin-top:10px}.margin-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;align-items:center;border:1px solid #e5e7eb;border-radius:11px;padding:9px;font-size:10px}.margin-row.bad{border-color:#fda29b;background:#fff7f7}.margin-row.warn{border-color:#fedf89;background:#fffaeb}.margin-row input{width:100%;border:1px solid #d0d5dd;border-radius:8px;padding:7px;font:inherit}.margin-row button{border:0;border-radius:8px;padding:7px 9px;background:#111827;color:#fff;font:inherit;font-weight:800;cursor:pointer}.margin-muted{font-size:9px;color:#667085;line-height:1.7}.margin-policy-note{font-size:9px;color:#475467;line-height:1.8;margin-top:8px}@media(max-width:760px){.margin-top-grid{grid-template-columns:1fr}.margin-form{grid-template-columns:1fr 1fr}.margin-summary{grid-template-columns:1fr 1fr}.margin-row{grid-template-columns:1fr 1fr}.margin-row .margin-name{grid-column:1/-1}.margin-row button{width:100%}}';document.head.appendChild(style);
  tabs.insertAdjacentHTML('beforeend','<button class="commerce-tab" data-pane="margin">حاشیه سود</button>');
  shell.insertAdjacentHTML('beforeend',`<div id="pane-margin" class="commerce-pane"><div class="margin-top-grid"><section class="margin-card"><h3 style="margin:0 0 9px">محافظ حاشیه سود</h3><div class="margin-form"><label>حداقل حاشیه سود ناخالص (%)<input id="marginMin" inputmode="numeric" min="0" max="80"></label><label style="display:flex;align-items:center;gap:8px;grid-auto-flow:column;justify-content:start;margin-top:18px"><input id="marginEnabled" type="checkbox" style="width:auto"> فعال باشد</label><button type="button" id="marginSavePolicy" class="btn red" style="grid-column:1/-1">ذخیره سیاست</button></div><div id="marginPolicyMsg"></div><div class="margin-policy-note">مبنای محاسبه: حاشیه سود ناخالص = (قیمت فروش − قیمت خرید) ÷ قیمت فروش. هزینه ارسال، مالیات و هزینه‌های عملیاتی در این شاخص لحاظ نمی‌شوند. اگر قیمت خرید ثبت نشده باشد، تخفیف خودکار برای آن کالا ظرفیت امن صفر دارد.</div></section><section class="margin-card"><h3 style="margin:0 0 9px">وضعیت قیمت‌گذاری</h3><div id="marginSummary" class="margin-summary"></div></section></div><section class="margin-card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><h3 style="margin:0">قیمت خرید و سقف تخفیف امن</h3><div class="margin-muted">برای تنوع کالا، اگر قیمت خرید اختصاصی خالی باشد از قیمت خرید محصول اصلی استفاده می‌شود.</div></div><button type="button" id="marginReload" class="btn gray">به‌روزرسانی</button></div><div id="marginRows" class="margin-list"></div></section></div>`);
  $('marginSavePolicy').onclick=savePolicy;$('marginReload').onclick=load;return true;
 }
 function rowHtml(x){
  const cls=x.status==='below_floor'?'bad':x.status==='missing_cost'?'warn':'',cost=x.type==='variant'?(x.variant_cost_price_toman??''):(x.cost_price_toman??'');
  const margin=x.current_margin_percent==null?'—':Number(x.current_margin_percent).toLocaleString('fa-IR',{maximumFractionDigits:1})+'٪';
  const safe=x.status==='missing_cost'?'—':fa(x.max_safe_discount_percent)+'٪';
  return `<div class="margin-row ${cls}" data-type="${esc(x.type)}" data-id="${esc(x.id)}"><div class="margin-name"><b>${esc(x.label)}</b><div class="margin-muted">${esc(statusLabel(x))}${x.type==='variant'&&x.variant_cost_price_toman==null&&x.cost_price_toman!=null?' · قیمت خرید ارث‌برده از محصول':''}</div></div><div><span class="margin-muted">فروش</span><br><b>${money(x.price_toman)}</b></div><div><span class="margin-muted">حاشیه فعلی</span><br><b>${margin}</b></div><div><span class="margin-muted">حداکثر تخفیف امن</span><br><b>${safe}</b></div><div><input class="marginCost" inputmode="numeric" placeholder="قیمت خرید" value="${esc(cost)}"><button type="button" class="marginCostSave" style="margin-top:5px">ذخیره</button></div></div>`;
 }
 async function load(){
  if(!init()&&!$('pane-margin'))return;
  try{
   const d=await api('/api/admin/margin-protection'),p=d.policy||{},s=d.summary||{};
   $('marginEnabled').checked=!!p.enabled;$('marginMin').value=p.min_margin_percent??0;
   $('marginSummary').innerHTML=[['ردیف قیمت‌دار',s.rows],['ایمن',s.safe],['بدون قیمت خرید',s.missing_cost],['زیر کف سود',s.below_floor],['حداقل حاشیه',fa(p.min_margin_percent||0)+'٪'],['وضعیت',p.enabled?'فعال':'غیرفعال']].map(([k,v])=>`<div><span>${k}</span><b>${v??0}</b></div>`).join('');
   $('marginRows').innerHTML=(d.rows||[]).map(rowHtml).join('')||'<div class="commerce-help">کالای قیمت‌دار پیدا نشد.</div>';
   $('marginRows').querySelectorAll('.marginCostSave').forEach(b=>b.onclick=saveCost);
  }catch(e){console.error(e);if($('marginPolicyMsg'))$('marginPolicyMsg').innerHTML='<div class="notice bad">'+esc(e.message)+'</div>'}
 }
 async function savePolicy(){
  const msg=$('marginPolicyMsg'),n=Number($('marginMin').value);try{await api('/api/admin/margin-protection/settings',{method:'PUT',body:JSON.stringify({enabled:$('marginEnabled').checked,min_margin_percent:n})});msg.innerHTML='<div class="notice ok">سیاست حاشیه سود ذخیره شد.</div>';await load()}catch(e){msg.innerHTML='<div class="notice bad">'+esc(e.message)+'</div>'}
 }
 async function saveCost(e){
  const row=e.target.closest('.margin-row'),input=row.querySelector('.marginCost'),raw=input.value.trim(),cost=raw===''?null:Number(raw);
  try{await api('/api/admin/margin-protection/cost',{method:'PUT',body:JSON.stringify({type:row.dataset.type,id:row.dataset.id,cost_price_toman:cost})});await load()}catch(err){alert(err.message)}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
 document.getElementById('commerceRefresh')?.addEventListener('click',()=>{if($('pane-margin'))load()});
})();

(()=>{
 const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0),money=n=>fa(n)+' تومان',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function api(){const r=await fetch('/api/admin/business-insights?days=30&slow_days=60',{credentials:'same-origin',cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'دریافت بینش مدیریتی انجام نشد');return d}
 function row(text,tail=''){return `<div class="bi-row"><span>${text}</span>${tail?`<b>${tail}</b>`:''}</div>`}
 function mount(){
  const anchor=document.getElementById('commerceRecent');if(!anchor){setTimeout(mount,60);return}
  if(document.getElementById('businessInsights'))return load();
  const style=document.createElement('style');style.textContent=`.bi-wrap{margin-top:14px;border-top:1px solid #eee;padding-top:13px}.bi-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.bi-head h3{font-size:14px;margin:0}.bi-actions{display:flex;gap:6px;flex-wrap:wrap}.bi-actions a{text-decoration:none}.bi-note{font-size:9px;color:#667085;line-height:1.8}.bi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.bi-card{border:1px solid #e5e7eb;border-radius:13px;padding:10px;background:#fff}.bi-card span{display:block;font-size:9px;color:#667085}.bi-card b{display:block;font-size:16px;margin-top:4px}.bi-lists{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:11px}.bi-list{border:1px solid #e5e7eb;border-radius:13px;padding:10px;min-width:0}.bi-list h4{font-size:11px;margin:0 0 7px}.bi-row{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px dashed #eee;font-size:9px;line-height:1.6}.bi-row:last-child{border-bottom:0}.bi-row span{min-width:0;overflow-wrap:anywhere}.bi-row b{white-space:nowrap}.bi-warn{color:#b54708}.bi-ok{color:#067647}@media(max-width:720px){.bi-grid{grid-template-columns:1fr 1fr}.bi-lists{grid-template-columns:1fr}.bi-actions{width:100%}.bi-actions .btn{flex:1;min-width:105px;text-align:center}}`;document.head.appendChild(style);
  const box=document.createElement('section');box.id='businessInsights';box.className='bi-wrap';box.innerHTML='<div class="bi-head"><div><h3>بینش مدیریتی فروش و موجودی</h3><div class="bi-note">فروش: ۳۰ روز اخیر · کم‌گردش: بدون فروش پرداخت‌شده در ۶۰ روز اخیر · سفارش‌های تست پرداخت در آمار محاسبه نمی‌شوند</div></div><div class="bi-actions"><a class="btn gray" href="/api/admin/business-insights/export/sales.csv?days=30" download>CSV فروش ۳۰ روز</a><a class="btn gray" href="/api/admin/business-insights/export/inventory.csv" download>CSV موجودی</a><button type="button" class="btn gray" id="businessInsightsRefresh">به‌روزرسانی</button></div></div><div id="businessInsightsBody"><div class="mut">در حال محاسبه…</div></div>';
  anchor.insertAdjacentElement('afterend',box);document.getElementById('businessInsightsRefresh').onclick=load;document.getElementById('commerceRefresh')?.addEventListener('click',()=>setTimeout(load,80));load();
 }
 async function load(){const body=document.getElementById('businessInsightsBody');if(!body)return;body.innerHTML='<div class="mut">در حال محاسبه…</div>';try{
  const d=await api(),s=d.sales||{},i=d.inventory||{},profit=Number.isInteger(s.gross_profit_toman)?money(s.gross_profit_toman):'نیاز به تکمیل قیمت خرید',profitClass=Number.isInteger(s.gross_profit_toman)?'bi-ok':'bi-warn';
  const low=(d.low_stock||[]),slow=(d.slow_movers||[]),repeat=(d.repeat_customers_90d||[]),gaps=(d.cost_gaps||[]);
  body.innerHTML=`<div class="bi-grid">
   <div class="bi-card"><span>فروش پرداخت‌شده ۳۰ روز</span><b>${money(s.revenue_toman)}</b></div>
   <div class="bi-card"><span>میانگین سفارش پرداخت‌شده</span><b>${money(s.average_order_toman)}</b></div>
   <div class="bi-card"><span>سود ناخالص تقریبی</span><b class="${profitClass}">${profit}</b><span>پوشش قیمت خرید فروش‌ها: ${fa(s.cost_coverage_percent)}٪</span></div>
   <div class="bi-card"><span>ارزش خرید موجودی ثبت‌شده</span><b>${money(i.known_cost_value_toman)}</b><span>پوشش قیمت خرید موجودی: ${fa(i.cost_coverage_percent)}٪</span></div>
  </div><div class="bi-lists">
   <div class="bi-list"><h4>کسری قیمت خرید (${fa(gaps.length)})</h4>${gaps.length?gaps.slice(0,20).map(x=>row(esc(x.label)+(x.sku?' · '+esc(x.sku):''),x.stock_qty==null?'موجودی نامشخص':fa(x.stock_qty)+' عدد')).join(''):'<div class="mut bi-ok">قیمت خرید کالاهای قیمت‌دار کامل است.</div>'}</div>
   <div class="bi-list"><h4>کم‌موجودها (${fa(low.length)})</h4>${low.length?low.map(x=>row(esc(x.label),fa(x.stock_qty)+' / حد '+fa(x.threshold))).join(''):'<div class="mut">موردی نیست.</div>'}</div>
   <div class="bi-list"><h4>کالاهای کم‌گردش</h4>${slow.length?slow.map(x=>row(esc(x.label),x.inventory_cost_toman==null?fa(x.stock_qty)+' عدد':money(x.inventory_cost_toman))).join(''):'<div class="mut">موردی نیست.</div>'}</div>
   <div class="bi-list"><h4>مشتریان تکراری ۹۰ روز</h4>${repeat.length?repeat.map(x=>row(esc(x.customer_name)+' · '+esc(x.phone_masked),fa(x.order_count)+' سفارش')).join(''):'<div class="mut">هنوز مشتری تکراری ثبت نشده است.</div>'}</div>
  </div>`;
 }catch(e){body.innerHTML='<div class="notice bad">'+esc(e.message)+'</div>'}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

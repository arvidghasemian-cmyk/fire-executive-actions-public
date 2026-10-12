/* Shared by the admin forms and their browser tests. */
(function(root){
  const digits=v=>String(v??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
  const normalize=v=>digits(v).replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c]+/g,' ').trim().toLowerCase();
  function number(v){const s=digits(v).trim().replace(/[,٬]/g,'');if(!s)return null;if(!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s)))throw new Error('عدد صحیح نامنفی وارد کنید؛ اعداد فارسی نیز پذیرفته می‌شوند.');return Number(s)}
  function matches(p,f){
    if(f.q&&!normalize(p.search).includes(normalize(f.q)))return false;
    if(f.category&&p.category!==f.category)return false;
    if(f.status&&p.status!==f.status)return false;
    if(f.active==='active'&&Number(p.active)!==1||f.active==='archived'&&Number(p.active)!==0)return false;
    const known=p.stock!==''&&p.stock!=null,n=Number(p.stock);
    if(f.stock==='unknown'&&known||f.stock==='out'&&(!known||n!==0)||f.stock==='available'&&(!known||n<=0)||f.stock==='low'&&(!known||Number(p.track)!==1||n>Number(p.low)))return false;
    return true;
  }
  root.ProductTools={number,matches,normalize};
})(globalThis);

import fs from 'node:fs';

const path='shop-site/public/index.html';
let s=fs.readFileSync(path,'utf8');

const block=`<style id="product-card-navigation-v1">
.product{cursor:pointer}
.product .pimg,.product .pbody h3{cursor:pointer}
.product .pimg{touch-action:manipulation}
.product:focus-visible{outline:3px solid rgba(244,181,27,.55);outline-offset:3px}
</style>
<script id="product-card-navigation-v1-js">
(function(){
  function norm(v){return String(v||'').replace(/\\s+/g,' ').trim()}
  function getProduct(card){
    if(!card||(!Array.isArray(window.products)&&typeof products==='undefined'))return null;
    var list=(typeof products!=='undefined'&&Array.isArray(products))?products:window.products;
    var title=norm(card.querySelector('.pbody h3')&&card.querySelector('.pbody h3').textContent);
    return list.find(function(p){return norm(p&&p.name)===title})||null;
  }
  function openCard(card){
    var p=getProduct(card);
    if(!p||!p.slug)return;
    location.href='/product/'+encodeURIComponent(p.slug)+'/';
  }
  function enhance(){
    document.querySelectorAll('.product').forEach(function(card){
      if(card.dataset.productNavReady==='1')return;
      card.dataset.productNavReady='1';
      card.setAttribute('role','link');
      card.setAttribute('tabindex','0');
      var p=getProduct(card);
      if(p&&p.name)card.setAttribute('aria-label','مشاهده '+p.name);
    });
  }
  document.addEventListener('click',function(e){
    var card=e.target.closest&&e.target.closest('.product');
    if(!card)return;
    var isImage=!!(e.target.closest&&e.target.closest('.pimg'));
    var isTitle=!!(e.target.closest&&e.target.closest('.pbody h3'));
    var isCartAction=!!(e.target.closest&&e.target.closest('.add,button,input,select,textarea,label'));
    if(isCartAction)return;
    if(isImage||isTitle){
      e.preventDefault();
      e.stopPropagation();
      openCard(card);
      return;
    }
    if(e.target.closest&&e.target.closest('a'))return;
    openCard(card);
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ')return;
    var card=e.target.closest&&e.target.closest('.product');
    if(!card)return;
    if(e.target.closest&&e.target.closest('.add,button,input,select,textarea,label,a'))return;
    e.preventDefault();openCard(card);
  });
  var root=document.getElementById('products')||document.body;
  new MutationObserver(enhance).observe(root,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
</script>`;

if(!s.includes('id="product-card-navigation-v1"')) s=s.replace('</body>',block+'\\n</body>');
if(!s.includes('product-card-navigation-v1-js')) throw new Error('product card navigation patch was not installed');
if(!s.includes("location.href='/product/'+encodeURIComponent(p.slug)+'/'")) throw new Error('product route navigation missing');
if(!s.includes("var isImage=!!(e.target.closest&&e.target.closest('.pimg'))")) throw new Error('direct image tap navigation missing');

fs.writeFileSync(path,s);
console.log('product card navigation patch applied');

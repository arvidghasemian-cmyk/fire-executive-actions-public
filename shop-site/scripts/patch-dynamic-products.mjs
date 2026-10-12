import fs from 'node:fs';
const path='shop-site/public/index.html';
let s=fs.readFileSync(path,'utf8');
const marker="const bySlug=new Map((data.products||[]).map(x=>[x.slug,x]));\n    products.forEach(p=>{";
const replacement=`const bySlug=new Map((data.products||[]).map(x=>[x.slug,x]));
    (data.products||[]).forEach(row=>{
      if(products.some(p=>p.slug===row.slug))return;
      products.push({
        id:row.id,slug:row.slug,name:row.name,
        category:row.category,cat:row.category,type:row.category,
        price:Number.isFinite(row.price_toman)?row.price_toman:null,
        stock:Number.isFinite(row.stock_qty)?row.stock_qty:null,
        status:row.status||'quote',img:row.image_url||'',srcset:'',badge:'',
        sku:row.sku||row.model||'',brand:row.brand||'',model:row.model||'',
        tags:row.tags||'',featured:Number(row.featured)===1
      });
    });
    products.forEach(p=>{`;
if(!s.includes('dynamic-catalog-created-products-v1')){
  if(!s.includes(marker))throw new Error('dynamic product insertion marker not found');
  s=s.replace(marker,replacement);
  s=s.replace('</head>','<meta name="dynamic-catalog-created-products-v1" content="enabled">\n</head>');
}
if(!s.includes('products.push({'))throw new Error('dynamic products patch failed');
if(!s.includes('storefront-font-preload-regular')){
  s=s.replace('</head>','<link id="storefront-font-preload-regular" rel="preload" as="font" type="font/woff2" href="/assets/fonts/Vazirmatn-Regular.woff2" crossorigin media="(min-width:761px)">\n<link id="storefront-font-preload-heavy" rel="preload" as="font" type="font/woff2" href="/assets/fonts/Vazirmatn-ExtraBold.woff2" crossorigin media="(min-width:761px)">\n</head>');
}


// Reserve final home merchandising geometry in the initial HTML so late
// progressive enhancement does not push visible content around (CLS).
if(!s.includes('home-v2-static-shell-v1')){
  const legacyCategoryMarker='<section class="section" id="categories">';
  if(!s.includes(legacyCategoryMarker))throw new Error('home V2 shell insertion marker missing');
  const skeletonCards=Array.from({length:8},(_,i)=>`<article class="mobile-product-card mobile-product-skeleton" aria-hidden="true"><span class="mobile-product-card-media"></span><div class="mobile-product-card-body"><span class="mobile-product-skeleton-line"></span><span class="mobile-product-skeleton-line short"></span><div class="mobile-product-card-meta"><span class="mobile-product-skeleton-price"></span><span class="mobile-product-skeleton-add"></span></div></div></article>`).join('');
  const shell=`<section id="homeV2Categories" class="home-v2-section home-v2-reserved-shell" data-home-v2-shell="1" aria-busy="true"><div class="container"><div class="home-v2-category-shell-space" aria-hidden="true"></div></div></section>
<section id="homeV2Trust" class="container home-v2-trust home-v2-reserved-trust" data-home-v2-shell="1" aria-busy="true"></section>
<section id="mobileProductShelf" class="mobile-product-shelf mobile-product-shelf-shell" aria-labelledby="mobileProductShelfTitle" aria-busy="true"><div class="container"><div class="mobile-product-shelf-head"><div><h2 id="mobileProductShelfTitle">محصولات فروشگاه</h2><p>چند کالای واقعی برای دسترسی سریع؛ برای جزئیات روی محصول بزنید.</p></div><span class="mobile-product-shelf-count" data-mobile-product-count>در حال بارگذاری</span></div><div class="mobile-product-shelf-grid" data-mobile-product-grid>${skeletonCards}</div><button class="mobile-product-more" type="button" data-mobile-product-more hidden>نمایش محصولات بیشتر</button></div></section>`;
  s=s.replace(legacyCategoryMarker,shell+'\n'+legacyCategoryMarker);
  s=s.replace('</head>','<meta name="home-v2-static-shell-v1" content="enabled">\n</head>');
}


// Emit the approved Hero V3 directly in the initial HTML to eliminate the
// last large above-the-fold DOM replacement on desktop.
if(!s.includes('static-hero-v3-v1')){
  const heroStart=s.indexOf('<div class="hero-card">');
  const trustStart=s.indexOf('<div class="mini-trust">',heroStart);
  if(heroStart<0||trustStart<0)throw new Error('static Hero V3 insertion marker missing');
  const staticHero=`<div class="hero-card home-v3-banner" data-hero-v3="ready">
  <div class="home-v3-copy">
    <span class="home-v3-kicker">سروش ایمنی شهر · فروش تخصصی تجهیزات ایمنی</span>
    <h1>فروشگاه تخصصی تجهیزات ایمنی و <span>آتش‌نشانی</span></h1>
    <p>دسترسی سریع به تجهیزات اعلام و اطفا، کپسول، دتکتور، پنل، شستی، اسپرینکلر و ملزومات تخصصی برای پروژه‌ها و ساختمان‌ها.</p>
    <nav class="home-v3-shortcuts" aria-label="دسته‌های پرکاربرد فروشگاه">
      <a href="/category/fire-alarm/">اعلام حریق</a>
      <a href="/category/fire-extinguishers/">کپسول آتش‌نشانی</a>
      <a href="/category/sprinklers/">اسپرینکلر</a>
    </nav>
    <div class="home-v3-actions">
      <a class="home-v3-btn home-v3-btn-primary" href="#products">مشاهده محصولات</a>
      <a class="home-v3-btn home-v3-btn-secondary" href="#homeV2Categories">دسته‌بندی کالاها</a>
    </div>
    <a class="home-v3-consult" href="https://wa.me/90396915945" target="_blank" rel="noopener noreferrer" aria-label="مشاوره پیش از خرید در واتساپ">
      <span class="home-v3-consult-icon" aria-hidden="true">✦</span><span>مشاوره پیش از خرید</span>
    </a>
  </div>
  <div class="home-v3-visual"><img class="home-v3-equipment-photo" src="/assets/hero-fire-equipment-v3.webp?v=2" alt="تجهیزات اعلام و اطفای حریق" width="640" height="496" loading="lazy" decoding="async" fetchpriority="high"></div>
</div>
`;
  s=s.slice(0,heroStart)+staticHero+s.slice(trustStart);
  s=s.replace('<section class="hero">','<section class="hero hero-v3-ready">');
  s=s.replace('</head>','<meta name="static-hero-v3-v1" content="enabled">\n</head>');
}

// Preload the verified professional brand logo used above the fold.
if(!s.includes('brand-logo-v2-preload')){
  s=s.replace('</head>','<link id="brand-logo-v2-preload" rel="preload" as="image" type="image/webp" href="/assets/brand/soroush-logo-header-v2.webp?v=2" fetchpriority="high">\n</head>');
}
if(!s.includes('id="brand-logo-v2-preload"'))throw new Error('brand logo v2 preload missing');

// Storefront Design V2 is deliberately isolated behind external assets so the
// commerce runtime can fall back to the existing UI if either asset fails.
if(!s.includes('storefront-v2.css')){
  s=s.replace('</head>','<link id="storefront-v2-css" rel="stylesheet" href="/storefront-v2.css?v=4">\n</head>');
}
if(!s.includes('storefront-v2-static-shell-v1')){
  s=s.replace(/<body([^>]*)>/,function(match,attrs){
    if(/\bclass\s*=/.test(attrs)){
      return match.replace(/class=(["'])(.*?)\1/,function(_,q,classes){
        return 'class='+q+(classes+' storefront-v2').trim()+q;
      });
    }
    return '<body'+attrs+' class="storefront-v2">';
  });
  s=s.replace('</head>','<meta name="storefront-v2-static-shell-v1" content="enabled">\n</head>');
}
if(!s.includes('storefront-v2.js')){
  s=s.replace('</body>','<script id="storefront-v2-js" src="/storefront-v2.js?v=3" defer></script>\n</body>');
}
if(!s.includes('id="storefront-v2-css"')||!s.includes('id="storefront-v2-js"'))throw new Error('storefront v2 assets were not linked');
if(!s.includes('storefront-v2-static-shell-v1'))throw new Error('storefront v2 static shell marker missing');
if(!s.includes('home-v2-static-shell-v1'))throw new Error('home V2 reserved shell marker missing');

// Hero V3 replaces only the visual hero content on the home page. It is a
// progressive layer: if these assets fail, Storefront V2 remains fully usable.
if(!s.includes('hero-v3-preload')){
  s=s.replace('</head>','<link id="hero-v3-preload" rel="preload" as="image" type="image/webp" href="/assets/hero-fire-equipment-v3.webp?v=2" fetchpriority="high" media="(min-width:761px)">\n</head>');
}
if(!s.includes('storefront-hero-v3.css')){
  s=s.replace('</head>','<link id="storefront-hero-v3-css" rel="stylesheet" href="/storefront-hero-v3.css?v=3">\n</head>');
}
if(!s.includes('storefront-hero-v3.js')){
  s=s.replace('</body>','<script id="storefront-hero-v3-js" src="/storefront-hero-v3.js?v=3" defer></script>\n</body>');
}
if(!s.includes('id="storefront-hero-v3-css"')||!s.includes('id="storefront-hero-v3-js"'))throw new Error('storefront hero v3 assets were not linked');
if(!s.includes('id="hero-v3-preload"'))throw new Error('hero preload missing');

// Homepage layout settings are loaded before the mobile shelf so product
// count and visibility can be driven from the admin panel without duplicating
// commerce logic.
if(!s.includes('home-layout-settings-v1.js')){
  s=s.replace('</body>','<script id="home-layout-settings-v1-js" src="/home-layout-settings-v1.js?v=1" defer></script>\n</body>');
}
if(!s.includes('id="home-layout-settings-v1-js"'))throw new Error('homepage layout settings asset was not linked');

// Mobile refinement stays isolated from storefront/commerce code. It only
// compacts the home hierarchy, renders a small real-product shelf and keeps
// advanced filters progressive instead of forcing them into the first view.
if(!s.includes('storefront-mobile-refine-v1.css')){
  s=s.replace('</head>','<link id="storefront-mobile-refine-v1-css" rel="stylesheet" href="/storefront-mobile-refine-v1.css?v=5">\n</head>');
}
if(!s.includes('storefront-mobile-refine-v1.js')){
  s=s.replace('</body>','<script id="storefront-mobile-refine-v1-js" src="/storefront-mobile-refine-v1.js?v=4" defer></script>\n</body>');
}
if(!s.includes('id="storefront-mobile-refine-v1-css"')||!s.includes('id="storefront-mobile-refine-v1-js"'))throw new Error('storefront mobile refinement assets were not linked');

// Unified mobile header V1 composes brand art, cart and search into one
// progressive mobile block. The legacy header remains the fallback unless the
// replacement mounts successfully.
if(!s.includes('mobile-header-v1.css')){
  s=s.replace('</head>','<link id="mobile-header-v1-css" rel="stylesheet" href="/mobile-header-v1.css?v=2">\n</head>');
}
if(!s.includes('mobile-header-v1.js')){
  s=s.replace('</body>','<script id="mobile-header-v1-js" src="/mobile-header-v1.js?v=2" defer></script>\n</body>');
}
if(!s.includes('id="mobile-header-v1-css"')||!s.includes('id="mobile-header-v1-js"'))throw new Error('unified mobile header assets were not linked');


// Production's older base HTML still contains a retired duplicate tagline whose
// visible text is split across nested elements. Remove the raw form when it is
// contiguous, then also clean the rendered DOM by normalized text only.
const duplicateBrandTagline='سروش ایمنی شهر · فروش تخصصی تجهیزات ایمنی';
if(s.includes(duplicateBrandTagline))s=s.split(duplicateBrandTagline).join('');
if(!s.includes('legacy-brand-tagline-cleanup-v1')){
  const cleanup=`<script id="legacy-brand-tagline-cleanup-v1">(()=>{const target='سروش ایمنی شهر · فروش تخصصی تجهیزات ایمنی';const clean=()=>{[...document.querySelectorAll('body *')].forEach(el=>{const text=String(el.textContent||'').replace(/\\s+/g,' ').trim();if(text===target)el.remove()})};clean();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});setTimeout(clean,0)})();</script>`;
  s=s.replace('</body>',cleanup+'\n</body>');
}

fs.writeFileSync(path,s);
console.log('dynamic created products + storefront v2 + hero v3 + mobile refinement + unified mobile header patch applied');

(()=>{
  const icon=(name)=>{
    const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    const map={
      alarm:`<svg ${common}><path d="M8 18h8"/><path d="M10 21h4"/><path d="M6.5 15.5h11l-1.2-1.8a6.4 6.4 0 0 1-1.1-3.6V9a3.2 3.2 0 1 0-6.4 0v1.1a6.4 6.4 0 0 1-1.1 3.6z"/><path d="M4 8.5 2.8 7.3M20 8.5l1.2-1.2"/></svg>`,
      extinguisher:`<svg ${common}><path d="M9 7h6v13H9z"/><path d="M10 7V4.5A1.5 1.5 0 0 1 11.5 3H15"/><path d="M15 4h3l2 2"/><path d="M13 10h3"/><path d="M11 20v1M13 20v1"/></svg>`,
      sprinkler:`<svg ${common}><path d="M12 3v5"/><path d="M8 8h8"/><path d="M9 11h6"/><path d="M12 11v2"/><path d="M6.5 17.5 5 20M10 16l-.5 3M14 16l.5 3M17.5 17.5 19 20"/></svg>`,
      hose:`<svg ${common}><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 9V5M15 12h4"/><path d="M19 12h2v4"/></svg>`,
      pump:`<svg ${common}><path d="M6 9h9v9H6z"/><path d="M15 12h3l2 2v4h-5"/><path d="M8 9V6h5v3"/><circle cx="10.5" cy="13.5" r="2"/><path d="m10.5 13.5 1.2-1.2"/></svg>`,
      gas:`<svg ${common}><rect x="7" y="5" width="10" height="14" rx="2"/><path d="M10 9h4M10 12h4"/><path d="M4 8c-1.4 1.1-1.4 2.9 0 4M20 8c1.4 1.1 1.4 2.9 0 4"/></svg>`,
      check:`<svg ${common}><path d="m5 12 4 4L19 6"/></svg>`,
      track:`<svg ${common}><path d="M3 6h12v10H3z"/><path d="M15 9h3l3 3v4h-6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
      receipt:`<svg ${common}><path d="M6 3h12v18l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
      consult:`<svg ${common}><path d="M5 5h14v10H9l-4 4z"/><path d="M9 9h6M9 12h4"/></svg>`,
      home:`<svg ${common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
      grid:`<svg ${common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>`,
      search:`<svg ${common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`,
      cart:`<svg ${common}><path d="M3 4h2l2 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>`,
      user:`<svg ${common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`
    };
    return map[name]||map.check;
  };

  function brandLogo(){
    const brand=document.querySelector('.header .brand');
    if(!brand||brand.dataset.logoV3==='ready')return;
    const img=new Image();
    img.className='brand-logo-v3-img';
    img.alt='سروش ایمنی شهر — فروش تجهیزات ایمنی و آتش‌نشانی';
    img.width=300;img.height=99;
    img.decoding='async';img.fetchPriority='high';
    img.addEventListener('load',()=>{
      brand.dataset.logoV3='ready';
      brand.classList.add('brand-logo-v3');
      brand.replaceChildren(img);
    },{once:true});
    img.src='/assets/brand/soroush-logo-header-v2.webp?v=2';
  }

  function heroPoints(){
    const copy=document.querySelector('.hero-copy');
    if(!copy||copy.querySelector('.home-v2-hero-points'))return;
    const points=document.createElement('div');
    points.className='home-v2-hero-points';
    points.innerHTML=[
      ['check','انتخاب تخصصی تجهیزات'],
      ['track','پیگیری سفارش'],
      ['consult','مشاوره پیش از خرید']
    ].map(([i,t])=>`<span class="home-v2-hero-point">${icon(i)}<span>${t}</span></span>`).join('');
    const actions=copy.querySelector('.hero-actions');
    if(actions)copy.insertBefore(points,actions);else copy.appendChild(points);
  }

  function categorySection(){
    let section=document.getElementById('homeV2Categories');
    if(section?.dataset.v2Ready==='1')return section;
    const categories=[
      ['alarm','تجهیزات اعلام حریق','دتکتور، شستی و آژیر','/category/fire-alarm/'],
      ['extinguisher','کپسول آتش‌نشانی','خاموش‌کننده‌های دستی','/category/fire-extinguishers/'],
      ['sprinkler','اسپرینکلر','تجهیزات اطفای اتوماتیک','/category/sprinklers/'],
      ['hose','فایرباکس و هوزریل','تجهیزات آبرسانی حریق','/category/firebox-hosereel/'],
      ['pump','پمپ آتش‌نشانی','تجهیزات پمپاژ و بوستر','/category/fire-pumps/'],
      ['gas','نشت‌یاب گاز','آشکارسازهای گاز شهری','/category/gas-detectors/']
    ];
    const existed=!!section;
    if(!section){section=document.createElement('section');section.id='homeV2Categories';section.className='home-v2-section'}
    section.setAttribute('aria-labelledby','homeV2CategoriesTitle');
    section.innerHTML=`<div class="container"><div class="home-v2-section-head"><div><h2 id="homeV2CategoriesTitle">دسته‌بندی تجهیزات</h2><p>مسیر سریع برای رسیدن به کالای موردنیاز پروژه یا ساختمان</p></div><a href="#products">مشاهده همه محصولات ←</a></div><div class="home-v2-categories">${categories.map(([i,title,sub,href])=>`<a class="home-v2-category" href="${href}"><span class="home-v2-category-icon">${icon(i)}</span><strong>${title}</strong><small>${sub}</small></a>`).join('')}</div></div>`;
    section.dataset.v2Ready='1';section.removeAttribute('aria-busy');
    section.dataset.wasShell=existed?'1':'0';
    return section;
  }

  function trustSection(){
    let section=document.getElementById('homeV2Trust');
    if(section?.dataset.v2Ready==='1')return section;
    const items=[
      ['check','فروش تخصصی','تمرکز روی تجهیزات ایمنی و آتش‌نشانی'],
      ['consult','مشاوره خرید','راهنمایی برای انتخاب مدل و مشخصات مناسب'],
      ['track','پیگیری سفارش','مشاهده وضعیت سفارش با کد پیگیری'],
      ['receipt','رسید و فاکتور','دسترسی به رسید خرید و سوابق سفارش']
    ];
    const existed=!!section;
    if(!section){section=document.createElement('section');section.id='homeV2Trust';section.className='container home-v2-trust'}
    section.setAttribute('aria-label','مزایای خرید از سروش ایمنی شهر');
    section.innerHTML=items.map(([i,title,sub])=>`<div class="home-v2-trust-item"><span class="home-v2-trust-icon">${icon(i)}</span><span><strong>${title}</strong><small>${sub}</small></span></div>`).join('');
    section.dataset.v2Ready='1';section.removeAttribute('aria-busy');section.removeAttribute('aria-hidden');
    section.dataset.wasShell=existed?'1':'0';
    return section;
  }

  function mobileNav(){
    if(document.querySelector('.storefront-mobile-nav'))return;
    const nav=document.createElement('nav');
    nav.className='storefront-mobile-nav';
    nav.setAttribute('aria-label','دسترسی سریع موبایل');
    nav.innerHTML=`<a href="/" aria-current="page">${icon('home')}<span>خانه</span></a><a href="#homeV2Categories">${icon('grid')}<span>دسته‌ها</span></a><button type="button" data-v2-search>${icon('search')}<span>جستجو</span></button><button type="button" data-v2-cart>${icon('cart')}<span>سبد</span></button><a href="/account/">${icon('user')}<span>حساب</span></a>`;
    document.body.appendChild(nav);
    nav.querySelector('[data-v2-search]')?.addEventListener('click',()=>{
      const input=document.querySelector('.search input,input[type="search"]');
      if(input){input.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>input.focus(),220)}
    });
    nav.querySelector('[data-v2-cart]')?.addEventListener('click',()=>{
      const drawer=document.getElementById('drawer');
      if(drawer){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false')}
      else location.href='/?openCart=1';
    });
  }

  function accessibility(){
    const search=document.querySelector('.search input,input[type="search"]');
    if(search&&!search.getAttribute('aria-label'))search.setAttribute('aria-label','جستجوی محصول');
    document.querySelectorAll('.add').forEach(btn=>{if(!btn.getAttribute('title'))btn.setAttribute('title','افزودن به سبد')});
    document.querySelectorAll('img:not([decoding])').forEach(img=>img.setAttribute('decoding','async'));
  }

  function init(){
    if(location.pathname!=='/'&&location.pathname!=='')return;
    document.body.classList.add('storefront-v2');
    brandLogo();
    heroPoints();
    const hero=document.querySelector('.hero');
    const cats=categorySection();
    if(hero&&cats&&!cats.isConnected)hero.insertAdjacentElement('afterend',cats);
    const trust=trustSection();
    if(cats&&trust&&!trust.isConnected)cats.insertAdjacentElement('afterend',trust);else if(hero&&trust&&!trust.isConnected)hero.insertAdjacentElement('afterend',trust);
    mobileNav();
    accessibility();
    document.documentElement.dataset.storefrontV2='ready';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

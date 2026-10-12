(()=>{
  function equipmentArt(){
    return `<img class="home-v3-equipment-photo" src="/assets/hero-fire-equipment-v3.webp?v=2" alt="تجهیزات اعلام و اطفای حریق" width="640" height="496" loading="lazy" decoding="async" fetchpriority="high">`;
  }

  function renderHero(){
    if(location.pathname!=='/'&&location.pathname!=='')return;
    const hero=document.querySelector('.hero');
    const card=hero?.querySelector('.hero-card');
    if(!hero||!card||card.dataset.heroV3==='ready')return;

    card.dataset.heroV3='ready';
    card.classList.add('home-v3-banner');
    card.innerHTML=`
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
      <div class="home-v3-visual">${equipmentArt()}</div>`;
    hero.classList.add('hero-v3-ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderHero,{once:true});else renderHero();
})();
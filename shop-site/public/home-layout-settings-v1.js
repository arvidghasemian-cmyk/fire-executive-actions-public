(()=>{
  const HOME=location.pathname==='/'||location.pathname==='';
  const SECTION_KEYS=['hero','categories','products','trust','info'];
  const DEFAULTS={
    home_mobile_show_hero:'0',
    home_mobile_show_categories:'1',
    home_mobile_show_products:'1',
    home_mobile_show_trust:'0',
    home_mobile_show_info:'1',
    home_mobile_show_technical:'1',
    home_mobile_show_quote:'1',
    home_mobile_product_count:'8',
    home_mobile_order:'categories,products,info,hero,trust',
    home_desktop_show_hero:'1',
    home_desktop_show_categories:'1',
    home_desktop_show_products:'1',
    home_desktop_show_trust:'1',
    home_desktop_show_info:'1',
    home_desktop_show_technical:'1',
    home_desktop_show_quote:'1',
    home_desktop_order:'hero,categories,trust,products,info'
  };
  const bool=(value,fallback)=>value==null?fallback:String(value)==='1';
  const order=(value,fallback)=>{
    const items=String(value||'').split(',').map(x=>x.trim()).filter(Boolean);
    const unique=[...new Set(items.filter(x=>SECTION_KEYS.includes(x)))];
    return unique.length===SECTION_KEYS.length?unique:fallback.split(',');
  };
  const ready=fetch('/api/store-settings',{credentials:'same-origin',cache:'no-store'})
    .then(async r=>r.ok?(await r.json()).settings||{}:{})
    .then(s=>({...DEFAULTS,...s}))
    .catch(()=>({...DEFAULTS}));
  globalThis.HomeLayoutV1={ready,defaults:{...DEFAULTS},sections:[...SECTION_KEYS]};

  if(!HOME)return;

  let anchor=null,lastMobile=null;
  function annotateInfo(){
    const grid=document.querySelector('.info-grid');
    if(!grid)return null;
    const section=grid.closest('section');
    if(section&&!section.id)section.id='homeInfoSection';
    const cards=[...grid.querySelectorAll(':scope > .info-card')];
    if(cards[0]&&!cards[0].id)cards[0].id='homeTechnicalInfo';
    if(cards[1]&&!cards[1].id)cards[1].id='homeQuoteInfo';
    return section;
  }
  function nodeMap(mobile){
    return {
      hero:document.querySelector('.hero'),
      categories:document.getElementById('homeV2Categories'),
      products:mobile?document.getElementById('mobileProductShelf'):document.getElementById('products'),
      trust:document.getElementById('homeV2Trust'),
      info:annotateInfo()
    };
  }
  function ensureAnchor(main,nodes){
    if(anchor&&anchor.isConnected)return anchor;
    const first=['hero','categories','products','trust','info'].map(k=>nodes[k]).find(Boolean);
    if(!first||first.parentElement!==main)return null;
    anchor=document.createComment('home-layout-v1-anchor');
    main.insertBefore(anchor,first);
    return anchor;
  }
  function showNode(node,show,key,mobile){
    if(!node)return;
    if(!show){node.style.setProperty('display','none','important');return}
    if(mobile&&key==='hero')node.style.setProperty('display','block','important');
    else if(mobile&&key==='trust')node.style.setProperty('display','grid','important');
    else node.style.removeProperty('display');
  }
  function apply(settings){
    const main=document.querySelector('main');if(!main)return;
    const mobile=matchMedia('(max-width:760px)').matches;
    const scope=mobile?'mobile':'desktop';
    const nodes=nodeMap(mobile);
    for(const key of SECTION_KEYS){
      const fallback=DEFAULTS[`home_${scope}_show_${key}`];
      showNode(nodes[key],bool(settings[`home_${scope}_show_${key}`],fallback==='1'),key,mobile);
    }
    const tech=document.getElementById('homeTechnicalInfo');
    const quote=document.getElementById('homeQuoteInfo');
    showNode(tech,bool(settings[`home_${scope}_show_technical`],true),'technical',mobile);
    showNode(quote,bool(settings[`home_${scope}_show_quote`],true),'quote',mobile);

    const navCategories=document.querySelector('.storefront-mobile-nav a[href="#homeV2Categories"]');
    if(navCategories){
      if(mobile&&!bool(settings.home_mobile_show_categories,true))navCategories.style.setProperty('display','none','important');
      else navCategories.style.removeProperty('display');
    }

    const a=ensureAnchor(main,nodes);
    if(a){
      const wanted=order(settings[`home_${scope}_order`],DEFAULTS[`home_${scope}_order`]);
      let cursor=a;
      for(const key of wanted){
        const node=nodes[key];
        if(node&&node.parentElement===main){cursor.after(node);cursor=node}
      }
    }
    document.documentElement.dataset.homeLayoutV1='ready';
    document.documentElement.dataset.homeLayoutScope=scope;
    lastMobile=mobile;
  }
  function boot(){
    ready.then(settings=>{
      const run=()=>apply(settings);
      run();
      [80,240,700,1600].forEach(ms=>setTimeout(run,ms));
      document.addEventListener('home:mobile-shelf-ready',run);
      const mq=matchMedia('(max-width:760px)');
      const changed=()=>{if(mq.matches!==lastMobile)run()};
      mq.addEventListener?.('change',changed);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
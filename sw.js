const CACHE_NAME='fireexec-cloudflare-v61-offline-hotfix-2';
const CORE_ASSETS=[
  './',
  './index.html'
];
const OPTIONAL_ASSETS=[
  './manifest.json',
  './fire-executive-fe-final-v3.svg',
  './fire-executive-header-v1.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './license-manager-v61.js'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await Promise.allSettled(OPTIONAL_ASSETS.map(url=>cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('fireexec-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  const isNavigation=req.mode==='navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('/index.html')
    || (req.headers.get('accept')||'').includes('text/html');

  if(isNavigation){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const resp=await fetch(req,{cache:'no-store'});
        if(resp&&resp.ok){
          const copy=resp.clone();
          event.waitUntil(cache.put(req,copy).catch(()=>{}));
        }
        return resp;
      }catch(e){
        return (await cache.match(req,{ignoreSearch:true}))
          || (await cache.match('./index.html',{ignoreSearch:true}))
          || (await cache.match('./',{ignoreSearch:true}))
          || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(req,{ignoreSearch:true});
    if(cached) return cached;
    try{
      const resp=await fetch(req);
      if(resp&&resp.ok){
        const copy=resp.clone();
        event.waitUntil(cache.put(req,copy).catch(()=>{}));
      }
      return resp;
    }catch(e){
      return cached||Response.error();
    }
  })());
});

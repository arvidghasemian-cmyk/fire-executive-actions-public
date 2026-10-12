import fs from 'node:fs';
const path='shop-site/public/index.html';
let s=fs.readFileSync(path,'utf8');

const css=`<style id="cart-compact-layout-v1">
/* Keep checkout action directly after cart items instead of at viewport bottom. */
#drawer.drawer{
  bottom:auto!important;
  height:auto!important;
  min-height:0!important;
  max-height:100dvh!important;
  display:flex!important;
  flex-direction:column!important;
  overflow:hidden!important;
}
#drawer .drawer-list{
  flex:0 1 auto!important;
  min-height:0!important;
  max-height:calc(100dvh - 235px)!important;
  overflow-y:auto!important;
  overscroll-behavior:contain;
}
#drawer .drawer-foot{
  flex:0 0 auto!important;
  margin-top:0!important;
  position:static!important;
  inset:auto!important;
  background:#fff!important;
}
#drawer .drawer-list + .drawer-foot{margin-top:0!important}
@media(max-width:560px){
  #drawer.drawer{max-height:100dvh!important}
  #drawer .drawer-list{max-height:calc(100dvh - 220px)!important}
}
</style>`;

if(!s.includes('id="cart-compact-layout-v1"')) s=s.replace('</head>',css+'\n</head>');
if(!s.includes('id="cart-compact-layout-v1"')) throw new Error('cart compact layout patch was not installed');

fs.writeFileSync(path,s);
console.log('cart compact layout patch applied');

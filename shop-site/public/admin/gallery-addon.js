(()=>{
const MAX=5,MAX_FINAL=1500000;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
async function req(url,opt={}){const r=await fetch(url,{credentials:'same-origin',...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'خطا در ارتباط');return d}
async function decode(file){if('createImageBitmap'in window)return createImageBitmap(file);return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('خواندن تصویر ممکن نشد'))};im.src=u})}
function toBlob(canvas,q){return new Promise(r=>canvas.toBlob(r,'image/webp',q))}
async function compress(file){
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('فقط JPG، PNG یا WebP مجاز است');
  if(file.size>12*1024*1024)throw new Error('حجم فایل اولیه باید کمتر از ۱۲ مگابایت باشد');
  const img=await decode(file),w=img.width,h=img.height;let blob=null;
  for(const target of [1600,1300,1100,900]){
    const scale=Math.min(1,target/Math.max(w,h)),cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
    const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,cw,ch);x.drawImage(img,0,0,cw,ch);
    for(const q of [.84,.76,.68,.60,.52]){blob=await toBlob(c,q);if(blob&&blob.size<=MAX_FINAL)break}
    if(blob&&blob.size<=MAX_FINAL)break;
  }
  if(img.close)img.close();
  if(!blob||blob.size>MAX_FINAL)throw new Error('تصویر بعد از فشرده‌سازی هنوز بیش از ۱٫۵ مگابایت است');
  return blob;
}
function style(){if(document.getElementById('gallery-addon-style'))return;const st=document.createElement('style');st.id='gallery-addon-style';st.textContent=`.gallery-addon{grid-column:1/-1;border:1px dashed #efc24f;border-radius:12px;padding:10px;background:#fffdf5;margin-top:2px}.gallery-addon h4{font-size:11px;margin:0 0 4px}.gallery-addon .hint{font-size:9px;color:#667085;margin-bottom:8px}.gallery-list{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:8px 0}.gallery-item{border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:5px}.gallery-item img{width:100%;height:72px;object-fit:contain;display:block;border-radius:7px}.gallery-item-actions{display:flex;gap:4px;margin-top:5px}.gallery-item button{border:0;border-radius:7px;padding:5px;cursor:pointer;font-size:9px;flex:1}.gallery-del{background:#fff1f3;color:#b42318}.gallery-move{background:#f2f4f7}.gallery-upload-row{display:flex;gap:7px;flex-wrap:wrap}.gallery-upload-row input{flex:1;min-width:180px}.gallery-upload-row button{min-width:150px}.gallery-msg{font-size:9px;margin-top:6px}.gallery-msg.ok{color:#067647}.gallery-msg.bad{color:#b42318}@media(max-width:720px){.gallery-addon{grid-column:auto}.gallery-list{grid-template-columns:repeat(3,1fr)}}`;
document.head.appendChild(st)}
async function load(card){
  const slug=card.dataset.slug,box=card.querySelector('.gallery-addon');if(!slug||!box)return;
  const list=box.querySelector('.gallery-list'),msg=box.querySelector('.gallery-msg');
  try{const d=await req('/api/admin/product-gallery/'+encodeURIComponent(slug));box.dataset.ids=(d.images||[]).map(x=>x.id).join(',');box.querySelector('.gallery-count').textContent=`${fa((d.images||[]).length)} از ${fa(d.max_images||MAX)}`;list.innerHTML=(d.images||[]).length?(d.images||[]).map((x,i)=>`<div class="gallery-item" data-id="${x.id}"><img src="${esc(x.url)}" alt="تصویر جانبی ${i+1}"><div class="gallery-item-actions"><button class="gallery-move" data-dir="-1" ${i===0?'disabled':''}>↑</button><button class="gallery-move" data-dir="1" ${i===(d.images.length-1)?'disabled':''}>↓</button><button class="gallery-del">حذف</button></div></div>`).join(''):'<div class="hint">هنوز تصویر جانبی ثبت نشده است.</div>';msg.textContent='';msg.className='gallery-msg'}catch(e){msg.textContent=e.message;msg.className='gallery-msg bad'}
}
function attach(card){
  if(card.querySelector('.gallery-addon'))return;
  const grid=card.querySelector('.advanced .grid');if(!grid)return;
  const box=document.createElement('div');box.className='gallery-addon';box.innerHTML=`<h4>گالری تصاویر محصول <span class="gallery-count"></span></h4><div class="hint">تصویر اصلی همان بخش بالاست؛ اینجا تا ۵ تصویر جانبی از زوایای دیگر اضافه کن.</div><div class="gallery-list"></div><div class="gallery-upload-row"><input class="gallery-files" type="file" accept="image/jpeg,image/png,image/webp" multiple><button type="button" class="btn red gallery-upload">آپلود تصاویر جانبی</button></div><div class="gallery-msg"></div>`;grid.appendChild(box);load(card)}
async function upload(card){
  const box=card.querySelector('.gallery-addon'),input=box.querySelector('.gallery-files'),msg=box.querySelector('.gallery-msg'),files=[...(input.files||[])];if(!files.length){msg.textContent='ابتدا یک یا چند تصویر انتخاب کن.';msg.className='gallery-msg bad';return}
  let current=(box.dataset.ids||'').split(',').filter(Boolean).length;if(current>=MAX){msg.textContent='ظرفیت گالری کامل است.';msg.className='gallery-msg bad';return}
  const take=files.slice(0,MAX-current);msg.textContent='در حال آماده‌سازی و آپلود...';msg.className='gallery-msg';
  try{for(const file of take){const blob=await compress(file),fd=new FormData();fd.append('image',blob,(file.name.replace(/\.[^.]+$/,'')||'gallery')+'.webp');await req('/api/admin/product-gallery/'+encodeURIComponent(card.dataset.slug),{method:'POST',body:fd})}input.value='';await load(card);msg.textContent='تصاویر با موفقیت اضافه شدند.';msg.className='gallery-msg ok'}catch(e){msg.textContent=e.message;msg.className='gallery-msg bad'}
}
async function del(card,id){if(!confirm('این تصویر جانبی حذف شود؟'))return;const box=card.querySelector('.gallery-addon'),msg=box.querySelector('.gallery-msg');try{await req('/api/admin/product-gallery/'+encodeURIComponent(card.dataset.slug)+'/'+id,{method:'DELETE'});await load(card);msg.textContent='تصویر حذف شد.';msg.className='gallery-msg ok'}catch(e){msg.textContent=e.message;msg.className='gallery-msg bad'}}
async function move(card,id,dir){const box=card.querySelector('.gallery-addon'),ids=(box.dataset.ids||'').split(',').filter(Boolean).map(Number),i=ids.indexOf(Number(id)),j=i+Number(dir);if(i<0||j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];const msg=box.querySelector('.gallery-msg');try{await req('/api/admin/product-gallery/'+encodeURIComponent(card.dataset.slug),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({ids})});await load(card)}catch(e){msg.textContent=e.message;msg.className='gallery-msg bad'}}
function scan(){document.querySelectorAll('.prod[data-slug]').forEach(attach)}
style();scan();new MutationObserver(()=>scan()).observe(document.getElementById('products')||document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{const card=e.target.closest('.prod[data-slug]');if(!card)return;if(e.target.closest('.gallery-upload'))upload(card);const item=e.target.closest('.gallery-item');if(item&&e.target.closest('.gallery-del'))del(card,item.dataset.id);if(item&&e.target.closest('.gallery-move'))move(card,item.dataset.id,e.target.closest('.gallery-move').dataset.dir)});
})();

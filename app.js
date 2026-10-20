const menu=document.querySelector('.menu-toggle');
menu.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open));menu.querySelector('span').textContent=open?'Close −':'Menu +'});
const box=document.querySelector('#lightbox');
document.querySelectorAll('main img').forEach(img=>{if(img.closest('a'))return;img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge project image');const show=()=>{box.querySelector('img').src=img.src;box.showModal()};img.addEventListener('click',show);img.addEventListener('keydown',e=>{if(e.key==='Enter'){show()}})});
box.querySelector('button').addEventListener('click',()=>box.close());box.addEventListener('click',e=>{if(e.target===box)box.close()});

const menu=document.querySelector('.menu-toggle');
menu.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open));menu.querySelector('span').textContent=open?'Close −':'Menu +'});
const box=document.querySelector('#lightbox');
document.querySelectorAll('main img').forEach(img=>{if(img.closest('a'))return;img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge project image');const show=()=>{box.querySelector('img').src=img.src;box.showModal()};img.addEventListener('click',show);img.addEventListener('keydown',e=>{if(e.key==='Enter'){show()}})});
box.querySelector('button').addEventListener('click',()=>box.close());box.addEventListener('click',e=>{if(e.target===box)box.close()});

const emailLink=document.querySelector('aside a[href^="mailto:"]');
if(emailLink){
  const address=decodeURIComponent(emailLink.getAttribute('href').slice(7).split('?')[0]);
  const panel=document.createElement('div');
  panel.id='email-contact';
  panel.className='email-contact';
  panel.hidden=true;
  const input=document.createElement('input');
  input.type='text';
  input.readOnly=true;
  input.value=address;
  input.setAttribute('aria-label','Email address');
  const copy=document.createElement('button');
  copy.type='button';
  copy.textContent='Copy email';
  const status=document.createElement('p');
  status.setAttribute('role','status');
  panel.append(input,copy,status);
  emailLink.after(panel);
  emailLink.setAttribute('aria-controls',panel.id);
  emailLink.setAttribute('aria-expanded','false');
  const close=()=>{panel.hidden=true;emailLink.setAttribute('aria-expanded','false')};
  emailLink.addEventListener('click',event=>{
    event.preventDefault();
    const opening=panel.hidden;
    panel.hidden=!opening;
    emailLink.setAttribute('aria-expanded',String(opening));
    status.textContent='';
    copy.textContent='Copy email';
    if(opening){input.focus();input.select()}
  });
  copy.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(address);
      copy.textContent='Copied';
      status.textContent='Email address copied.';
    }catch{
      input.focus();input.select();
      status.textContent='Select and copy the address above.';
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!panel.hidden){close();emailLink.focus()}
  });
  document.addEventListener('click',event=>{
    if(!panel.hidden&&!panel.contains(event.target)&&!emailLink.contains(event.target))close();
  });
}

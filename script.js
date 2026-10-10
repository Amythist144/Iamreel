const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('#nav');
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}));
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){nav.querySelectorAll('a').forEach(a=>{const active=a.getAttribute('href')==='#'+entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})}}},{rootMargin:'-15% 0px -60% 0px'});document.querySelectorAll('main section[id]').forEach(section=>observer.observe(section));}

const visionVideoLinks=document.querySelectorAll('[data-vision-video]');
const requestPath=document.querySelector('#request-path');
if(requestPath){const path=new URLSearchParams(location.search).get('path');if(path==='personal'||path==='spiritual')requestPath.value=path[0].toUpperCase()+path.slice(1);}
let visionVideoOpener=null;
const visionVideoModal=document.querySelector('#vision-video-modal');
if(visionVideoLinks.length&&visionVideoModal){
 const frame=visionVideoModal.querySelector('iframe');
 visionVideoLinks.forEach(link=>link.addEventListener('click',event=>{
  if(typeof visionVideoModal.showModal!=='function')return;
  event.preventDefault();
  visionVideoOpener=link;
  visionVideoModal.showModal();
  document.body.classList.add('video-modal-open');
  frame.src='https://www.youtube-nocookie.com/embed/i6ZtQEbf62w?autoplay=1&playsinline=1&rel=0';
 }));
 visionVideoModal.querySelector('.video-modal-close').addEventListener('click',()=>visionVideoModal.close());
 visionVideoModal.addEventListener('click',event=>{if(event.target===visionVideoModal){const box=visionVideoModal.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)visionVideoModal.close();}});
 visionVideoModal.addEventListener('close',()=>{frame.removeAttribute('src');document.body.classList.remove('video-modal-open');visionVideoOpener?.focus();});
}

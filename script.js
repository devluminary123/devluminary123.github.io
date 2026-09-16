
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

function initTheme(){
  const saved=localStorage.getItem('dl-theme')||'dark';
  document.documentElement.dataset.theme=saved;
  const b=$('#theme-toggle');
  if(b)b.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;localStorage.setItem('dl-theme',next);
    b.textContent=next==='dark'?'☼':'☾';
    b.classList.add('spin');setTimeout(()=>b.classList.remove('spin'),400);
  });
}
function initNav(){
  const n=$('#site-nav'),b=$('.mobile-menu-button'),m=$('.mobile-menu');
  addEventListener('scroll',()=>n?.classList.toggle('is-scrolled',scrollY>15),{passive:true});
  if(!b||!m)return;
  const openMenu=()=>{m.hidden=false;requestAnimationFrame(()=>m.classList.add('show'));b.textContent='×';b.classList.add('open');b.setAttribute('aria-expanded','true')};
  const closeMenu=()=>{m.classList.remove('show');b.textContent='☰';b.classList.remove('open');b.setAttribute('aria-expanded','false');setTimeout(()=>{if(!m.classList.contains('show'))m.hidden=true},300)};
  b.addEventListener('click',()=>{m.classList.contains('show')?closeMenu():openMenu()});
  $$('.mobile-menu a').forEach(a=>a.addEventListener('click',closeMenu));
}
function initReveal(){
  const els=$$('.reveal');
  if(!els.length)return;
  if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
  const io=new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        const parent=en.target.closest('.stagger');
        if(parent)en.target.style.setProperty('--i',[...parent.children].indexOf(en.target));
        en.target.classList.add('in');io.unobserve(en.target);
      }
    });
  },{threshold:.14,rootMargin:'0px 0px -8% 0px'});
  els.forEach(e=>io.observe(e));
}
function initRipple(){
  $$('.primary,.secondary,.icon-btn,.login-btn').forEach(el=>{
    el.addEventListener('click',function(e){
      const r=this.getBoundingClientRect();
      const d=Math.max(r.width,r.height);
      const span=document.createElement('span');
      span.className='dl-ripple';
      span.style.width=span.style.height=d+'px';
      span.style.left=(e.clientX-r.left-d/2)+'px';
      span.style.top=(e.clientY-r.top-d/2)+'px';
      this.appendChild(span);
      setTimeout(()=>span.remove(),650);
    });
  });
}
function initScrollProgress(){
  let bar=$('.scroll-progress');
  if(!bar){bar=document.createElement('div');bar.className='scroll-progress';document.body.appendChild(bar)}
  const update=()=>{
    const h=document.documentElement;
    const pct=(h.scrollTop)/((h.scrollHeight-h.clientHeight)||1)*100;
    bar.style.width=pct+'%';
  };
  addEventListener('scroll',update,{passive:true});
  update();
}
function initGlow(){
  $$('.card').forEach(c=>c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',`${e.clientX-r.left}px`);c.style.setProperty('--my',`${e.clientY-r.top}px`)}));
}
function toast(msg){
  let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2800);
}

/* Real authentication (Supabase) lives in js/auth.js + js/supabase-client.js.
   This just wires the shared header (Sign In button / user pill / mobile
   menu) to the real Supabase session on every page that loads those
   scripts before script.js. Pages with their own sign-in/sign-up/profile
   forms (auth.html, profile.html, reset-password.html) handle their own
   form logic inline, using the same window.DLAuth module. */
function initAuthHeader(){
  if(window.DLAuth) DLAuth.initHeaderUI();
}
function initContact(){
  const f=$('#contact-form');if(!f)return;
  f.addEventListener('submit',e=>{
    e.preventDefault();const name=$('#name').value.trim(),email=$('#contact-email').value.trim(),msg=$('#message').value.trim();
    if(!name||!email||!msg){toast('Please complete all fields.');return}
    const body=`Hi Dev Luminary!%0A%0AName: ${encodeURIComponent(name)}%0AEmail: ${encodeURIComponent(email)}%0A%0A${encodeURIComponent(msg)}`;
    window.location.href=`mailto:dev.luminary123@gmail.com?subject=Website%20Project%20Inquiry&body=${body}`;
  });
}
initTheme();initNav();initGlow();initAuthHeader();initContact();initReveal();initRipple();initScrollProgress();

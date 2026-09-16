/* Dev Luminary — shared "Preview Lab" demo engine.
   Provides theme toggle, reveal-on-scroll, counters, tilt,
   tabs, accordion, modal, toast + back-to-top for every demo page.
   Each demo's own inline script adds page-specific behaviour and
   should call DL.init() once its own listeners are wired up. */
(function(window){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function initTheme(){
    const key='dl-theme';
    const saved=localStorage.getItem(key)||'dark';
    document.documentElement.dataset.theme=saved;
    const btns=$$('[data-theme-toggle]');
    const paint=t=>btns.forEach(b=>b.textContent=t==='dark'?'☾':'☼');
    paint(saved);
    btns.forEach(b=>b.addEventListener('click',()=>{
      const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
      document.documentElement.dataset.theme=next;
      localStorage.setItem(key,next);
      paint(next);
      document.dispatchEvent(new CustomEvent('dl-theme-change',{detail:next}));
    }));
  }

  function initMobileNav(){
    $$('[data-nav-toggle]').forEach(btn=>{
      const targetSel=btn.getAttribute('data-nav-toggle');
      const menu=document.querySelector(targetSel);
      if(!menu)return;
      btn.addEventListener('click',()=>{
        const open=menu.classList.toggle('open');
        btn.setAttribute('aria-expanded',open);
        btn.classList.toggle('open',open);
      });
      $$('a',menu).forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');btn.classList.remove('open');btn.setAttribute('aria-expanded','false')}));
    });
  }

  function initReveal(){
    const els=$$('.reveal,.reveal-scale');
    if(!els.length)return;
    if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
    const io=new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(en.isIntersecting){
          const parent=en.target.closest('.stagger');
          if(parent){
            const idx=[...parent.children].indexOf(en.target);
            en.target.style.setProperty('--i',idx);
          }
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    },{threshold:.15,rootMargin:'0px 0px -8% 0px'});
    els.forEach(e=>io.observe(e));
  }

  function animateCount(el){
    const target=parseFloat(el.dataset.count);
    const decimals=(el.dataset.count.split('.')[1]||'').length;
    const suffix=el.dataset.suffix||'';
    const dur=parseInt(el.dataset.duration||'1400',10);
    const start=performance.now();
    function tick(now){
      const p=Math.min(1,(now-start)/dur);
      const eased=1-Math.pow(1-p,3);
      el.textContent=(target*eased).toFixed(decimals)+suffix;
      if(p<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function initCounters(){
    const els=$$('[data-count]');
    if(!els.length)return;
    if(!('IntersectionObserver' in window)){els.forEach(animateCount);return}
    const io=new IntersectionObserver(entries=>{
      entries.forEach(en=>{if(en.isIntersecting){animateCount(en.target);io.unobserve(en.target)}});
    },{threshold:.6});
    els.forEach(e=>io.observe(e));
  }

  function initTilt(){
    $$('.tilt').forEach(card=>{
      const strength=parseFloat(card.dataset.tilt)||8;
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect();
        const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
        card.style.transform=`perspective(700px) rotateY(${px*strength}deg) rotateX(${-py*strength}deg) translateZ(0)`;
        card.style.setProperty('--mx',`${(e.clientX-r.left)}px`);
        card.style.setProperty('--my',`${(e.clientY-r.top)}px`);
      });
      card.addEventListener('pointerleave',()=>{card.style.transform=''});
    });
  }

  function initTabs(){
    $$('[data-tabs]').forEach(group=>{
      const btns=$$('[data-tab-btn]',group), panels=$$('[data-tab-panel]',group.dataset.tabsPanels?document.querySelector(group.dataset.tabsPanels):group);
      const activate=name=>{
        btns.forEach(b=>b.classList.toggle('active',b.dataset.tabBtn===name));
        panels.forEach(p=>p.classList.toggle('active',p.dataset.tabPanel===name));
      };
      btns.forEach(b=>b.addEventListener('click',()=>activate(b.dataset.tabBtn)));
      if(btns[0])activate(btns[0].dataset.tabBtn);
    });
  }

  function initAccordion(){
    $$('.accordion-item').forEach(item=>{
      const head=$('.accordion-head',item), body=$('.accordion-body',item);
      if(!head||!body)return;
      head.addEventListener('click',()=>{
        const isOpen=item.classList.contains('open');
        item.closest('[data-accordion-single]') && $$('.accordion-item.open',item.closest('[data-accordion-single]')).forEach(o=>{if(o!==item){o.classList.remove('open');$('.accordion-body',o).style.maxHeight=null}});
        item.classList.toggle('open',!isOpen);
        body.style.maxHeight=!isOpen?body.scrollHeight+'px':null;
      });
    });
  }

  function initModal(){
    $$('[data-modal-open]').forEach(btn=>{
      const modal=document.querySelector(btn.getAttribute('data-modal-open'));
      if(!modal)return;
      btn.addEventListener('click',()=>modal.classList.add('open'));
    });
    $$('.dl-modal').forEach(modal=>{
      modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
      $$('[data-modal-close]',modal).forEach(b=>b.addEventListener('click',()=>modal.classList.remove('open')));
    });
  }

  function toast(msg,ms=2800){
    let t=$('.dl-toast');
    if(!t){t=document.createElement('div');t.className='dl-toast';document.body.appendChild(t)}
    t.textContent=msg;t.classList.add('show');
    clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),ms);
  }

  function initBackToTop(){
    let btn=$('.dl-top');
    if(!btn){btn=document.createElement('button');btn.className='dl-top';btn.innerHTML='↑';btn.setAttribute('aria-label','Back to top');document.body.appendChild(btn)}
    addEventListener('scroll',()=>btn.classList.toggle('show',scrollY>500),{passive:true});
    btn.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  }

  function initTopbarShrink(){
    const bar=$('.demo-topbar');
    if(!bar)return;
    addEventListener('scroll',()=>bar.classList.toggle('scrolled',scrollY>10),{passive:true});
  }

  function init(){
    initTheme();initMobileNav();initReveal();initCounters();initTilt();
    initTabs();initAccordion();initModal();initBackToTop();initTopbarShrink();
  }

  window.DL={$,$$,toast,init,initReveal,initCounters,initTilt,initTabs,initAccordion};
  document.addEventListener('DOMContentLoaded',init);
})(window);

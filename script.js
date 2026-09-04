/* ==========================================================================
   Dev Luminary — behavior layer only.
   Structure lives in the .html files, look-and-feel lives in style.css.
   Everything below reacts to elements that already exist in the page;
   nothing here builds markup or generates content.
   ========================================================================== */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* ---------------------------------------------------------------------- */
/* Site navigation: scroll shadow + mobile menu toggle                    */
/* ---------------------------------------------------------------------- */
function initNav() {
  const nav = $('#site-nav');
  const btn = $('.mobile-menu-button');
  const menu = $('.mobile-menu');
  if (!nav) return;

  addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 18), { passive: true });

  btn?.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? '×' : '☰';
  });

  // Close the mobile menu automatically when a destination is chosen.
  $$('.mobile-menu a:not(.mobile-cta)').forEach(a => a.addEventListener('click', () => {
    menu.hidden = true;
    btn?.setAttribute('aria-expanded', 'false');
    if (btn) btn.textContent = '☰';
  }));
}

/* ---------------------------------------------------------------------- */
/* Canvas-driven previews: particle field + matrix rain                   */
/* ---------------------------------------------------------------------- */
function initCanvas(canvas, type) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let raf = 0, particles = [];

  const resize = () => {
    const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, r.width * d);
    canvas.height = Math.max(1, r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    if (type === 'particles') {
      particles = Array.from({ length: 32 }, () => ({
        x: Math.random() * r.width, y: Math.random() * r.height,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.5 + .4
      }));
    }
  };

  const draw = () => {
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    if (type === 'particles') {
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > r.width) p.vx *= -1;
        if (p.y < 0 || p.y > r.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(242,245,139,.7)'; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(242,245,139,${(1 - d / 90) * .18})`;
            ctx.stroke();
          }
        }
      }
    } else {
      ctx.fillStyle = 'rgba(18,12,23,.18)'; ctx.fillRect(0, 0, r.width, r.height);
      ctx.font = '11px "DM Mono"';
      for (let x = 10; x < r.width; x += 15) {
        const y = ((Date.now() / 16 + x * 19) % (r.height + 60)) - 30;
        ctx.fillStyle = x % 45 === 0 ? 'rgba(242,245,139,.9)' : 'rgba(239,126,112,.4)';
        ctx.fillText(String.fromCharCode(0x30a0 + ((x + Math.floor(y)) % 80)), x, y);
      }
    }
    raf = requestAnimationFrame(draw);
  };

  resize();
  addEventListener('resize', resize);
  draw();
  canvas._cleanup = () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
}

function initPreviews(root = document) {
  $$('.demo-particles[data-canvas]', root).forEach(c => initCanvas(c, 'particles'));
  $$('.matrix-demo canvas[data-canvas]', root).forEach(c => initCanvas(c, 'matrix'));
  $$('.text-reveal-demo', root).forEach(el => {
    const target = $('.typed', el);
    if (!target) return;
    let i = 0;
    const t = setInterval(() => { target.textContent = 'LUMINARY'.slice(0, ++i); if (i >= 8) clearInterval(t); }, 120);
  });
}

/* ---------------------------------------------------------------------- */
/* Pointer-reactive demo cards (magnetic, tilt, cursor glow, etc.)        */
/* ---------------------------------------------------------------------- */
function addPointerEffects(root = document) {
  $$('[data-effect="magnetic"]', root).forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .18}px)`;
    });
    btn.addEventListener('mouseleave', () => btn.style.transform = '');
  });

  $$('.tilt', root).forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `perspective(700px) rotateX(${-(e.clientY - r.top - r.height / 2) / 18}deg) rotateY(${(e.clientX - r.left - r.width / 2) / 18}deg)`;
    });
    el.addEventListener('mouseleave', () => el.style.transform = '');
  });

  $$('.cursor-demo,.spotlight,.heatmap-demo', root).forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const isHeat = el.classList.contains('heatmap-demo');
      el.style.setProperty(isHeat ? '--hx' : '--x', `${e.clientX - r.left}px`);
      el.style.setProperty(isHeat ? '--hy' : '--y', `${e.clientY - r.top}px`);
      if (el.classList.contains('cursor-demo')) {
        el.style.setProperty('--cx', `${e.clientX - r.left}px`);
        el.style.setProperty('--cy', `${e.clientY - r.top}px`);
      }
    });
  });

  $$('.parallax-demo', root).forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect(), v = (e.clientX - r.left - r.width / 2) / 8;
      el.querySelector('[data-effect]').style.transform = `translateX(${v}px)`;
    });
    el.addEventListener('mouseleave', () => el.querySelector('[data-effect]').style.transform = '');
  });

  $$('.transform-stack-demo', root).forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--rx', `${(e.clientY - r.top - r.height / 2) / 15}deg`);
      el.style.setProperty('--ry', `${(e.clientX - r.left - r.width / 2) / 15}deg`);
    });
    el.addEventListener('mouseleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });

  $$('.elastic-demo', root).forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  $$('.ripple-button', root).forEach(btn => btn.addEventListener('click', () => {
    btn.classList.remove('rippling');
    void btn.offsetWidth;
    btn.classList.add('rippling');
  }));

  $$('.accordion-demo', root).forEach(box => $$('[data-accordion]', box).forEach(btn => btn.addEventListener('click', () => {
    const open = box.querySelector('.open');
    if (open && open !== btn) {
      open.classList.remove('open');
      open.querySelector('b').textContent = '+';
      open.querySelector('em')?.remove();
    }
    if (btn.classList.contains('open')) {
      btn.classList.remove('open');
      btn.querySelector('b').textContent = '+';
      btn.querySelector('em')?.remove();
    } else {
      btn.classList.add('open');
      btn.querySelector('b').textContent = '−';
      const i = +btn.dataset.accordion;
      const copy = ['Tactile transitions with a clear point of view.', 'Layouts that guide attention without noise.', 'A polished handoff from first click to final screen.'][i];
      btn.insertAdjacentHTML('beforeend', `<em>${copy}</em>`);
    }
  })));

  $$('.tabs-demo', root).forEach(box => $$('[data-tab]', box).forEach(btn => btn.addEventListener('click', () => {
    $$('.tab-list button', box).forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    const i = +btn.dataset.tab;
    const title = ['Overview', 'Details', 'Archive'][i];
    const desc = ['A calm entry point for the story.', 'The details arrive without a page change.', 'Past directions stay close at hand.'][i];
    $('.tab-panel b', box).textContent = title;
    $('.tab-panel span', box).textContent = desc;
  })));
}

/* ---------------------------------------------------------------------- */
/* Work page: search / filter / pagination / multi-select                */
/* All cards already exist in the HTML — this only shows, hides and       */
/* re-labels them. Nothing here creates markup.                          */
/* ---------------------------------------------------------------------- */
function initWork() {
  const grid = $('#animation-grid');
  if (!grid) return;

  const cards = $$('.animation-card', grid);
  const countEl = $('#result-count');
  const emptyEl = $('#empty-results');
  const moreBtn = $('#load-more');
  const selectionBar = $('#selection');
  const searchInput = $('#animation-search');
  const clearBtn = $('#clear-search');

  let category = 'All', family = 'All', query = '', visible = 36;
  let selected = [];

  const apply = () => {
    const q = query.trim().toLowerCase();
    const matches = c =>
      (category === 'All' || c.dataset.category === category) &&
      (family === 'All' || c.dataset.family === family) &&
      (!q || c.dataset.search.includes(q));

    const matched = cards.filter(matches);
    matched.forEach((c, i) => { c.hidden = i >= visible; });
    cards.filter(c => !matches(c)).forEach(c => c.hidden = true);

    const shown = Math.min(matched.length, visible);
    countEl.textContent = `Showing ${shown} of ${matched.length.toLocaleString()} matching experiments`;
    emptyEl.hidden = matched.length !== 0;
    moreBtn.hidden = matched.length <= visible;
  };

  searchInput?.addEventListener('input', e => {
    query = e.target.value; visible = 36;
    clearBtn.hidden = !query; apply();
  });
  clearBtn?.addEventListener('click', () => {
    searchInput.value = ''; query = ''; clearBtn.hidden = true; visible = 36; apply();
  });
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    category = b.dataset.category; visible = 36; apply();
  }));
  $$('.family-menu button').forEach(b => b.addEventListener('click', () => {
    $$('.family-menu button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    family = b.dataset.family; visible = 36; apply();
  }));
  moreBtn?.addEventListener('click', () => { visible += 36; apply(); });

  const updateSelection = () => {
    selectionBar.hidden = selected.length === 0;
    $('#selection-count').textContent = `YOUR SELECTION · ${selected.length}`;
    $('#selected-list').innerHTML = selected.map(id => {
      const card = cards.find(c => c.querySelector('[data-select]').dataset.select === id);
      const name = card ? card.querySelector('h3').textContent : id;
      return `<span>✓ ${name}</span>`;
    }).join('');
    const names = selected.map(id => {
      const card = cards.find(c => c.querySelector('[data-select]').dataset.select === id);
      return card ? card.querySelector('h3').textContent : null;
    }).filter(Boolean);
    const effects = `Hi Dev Luminary! I want a website with these effects: ${names.join(', ')}`;
    const requestLink = $('#request-effects');
    if (requestLink) requestLink.href = 'contact.html?effects=' + encodeURIComponent(effects);
  };

  cards.forEach(card => {
    const btn = card.querySelector('[data-select]');
    btn.addEventListener('click', () => {
      const id = btn.dataset.select;
      selected = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
      btn.classList.toggle('selected');
      btn.textContent = selected.includes(id) ? '✓ SELECTED' : '+ SELECT';
      updateSelection();
    });
  });

  apply();
}

/* ---------------------------------------------------------------------- */
/* Contact page: copy the project brief to the clipboard                  */
/* ---------------------------------------------------------------------- */
function initContact() {
  const form = $('#project-form');
  if (!form) return;

  // Pre-fill the message from ?effects= if the visitor arrived from the work page.
  const params = new URLSearchParams(location.search);
  const effects = params.get('effects');
  if (effects) $('#project-message').value = effects;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#project-name').value.trim();
    const message = $('#project-message').value.trim();
    const err = $('#form-error'), ok = $('#success-note'), btn = $('#copy-project');
    err.hidden = true; ok.hidden = true;
    if (!name || !message) {
      err.textContent = 'Please add your name and a short project message.';
      err.hidden = false;
      return;
    }
    const brief = `${message}\n\nName: ${name}\n\nSelected through Dev Luminary`;
    try {
      await navigator.clipboard.writeText(brief);
      ok.hidden = false;
      btn.innerHTML = '✓ Copied to Clipboard';
    } catch {
      err.textContent = 'Clipboard access is unavailable. Select the brief and copy it manually.';
      err.hidden = false;
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Boot: wire up whatever is present on the current page                  */
/* ---------------------------------------------------------------------- */
initNav();
initPreviews();
addPointerEffects();
initWork();
initContact();

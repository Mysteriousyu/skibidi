/* Window manager: create, focus, drag, resize, minimize, zoom and close windows. */
(function () {
  const layer = () => document.getElementById('windows');
  const MENUBAR = 30;
  let z = 100, seq = 0;
  const wins = new Map();
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());

  const trafficSVG = {
    close: '<svg viewBox="0 0 10 10"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5"/></svg>',
    min: '<svg viewBox="0 0 10 10"><path d="M2 5h6"/></svg>',
    max: '<svg viewBox="0 0 10 10"><path d="M3 2.5h4.5V7M7 3 3 7" /></svg>',
  };

  function createWindow(opts) {
    const id = 'w' + (++seq);
    const el = document.createElement('div');
    el.className = 'win opening' + (opts.sidebar ? ' has-sidebar' : '') + (opts.className ? ' ' + opts.className : '');
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(opts.width || 720, vw - 20);
    const h = Math.min(opts.height || 460, vh - MENUBAR - 100);
    const count = [...wins.values()].filter((x) => !x.minimized).length;
    const x = opts.x ?? Math.max(10, (vw - w) / 2 + (count % 6) * 26 - 60);
    const y = opts.y ?? Math.max(MENUBAR + 10, (vh - h) / 2 - 40 + (count % 6) * 26);
    Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    if (opts.sidebarWidth) el.style.setProperty('--sb-w', opts.sidebarWidth + 'px');
    if (opts.minWidth) el.style.minWidth = opts.minWidth + 'px';
    if (opts.minHeight) el.style.minHeight = opts.minHeight + 'px';

    el.innerHTML = `
      <div class="win-titlebar" data-drag>
        <div class="traffic">
          <button class="close" aria-label="Close">${trafficSVG.close}</button>
          <button class="min" aria-label="Minimize">${trafficSVG.min}</button>
          <button class="max" aria-label="Zoom">${trafficSVG.max}</button>
        </div>
        <div class="title"></div>
      </div>
      <div class="win-body"></div>
      ${opts.resizable === false ? '' : '<div class="win-resize r"></div><div class="win-resize b"></div><div class="win-resize l"></div><div class="win-resize br"></div><div class="win-resize bl"></div>'}`;
    layer().appendChild(el);
    el.addEventListener('animationend', () => el.classList.remove('opening'), { once: true });

    const win = {
      id, el, app: opts.app, body: el.querySelector('.win-body'), titlebar: el.querySelector('.win-titlebar'), minimized: false, maximized: false,
      onClose: opts.onClose, data: {},
      setTitle(t) { this.title = t; const n = el.querySelector('.title'); if (n) n.textContent = t; emit(); },
      focus: () => focus(win),
      close: () => close(win),
      minimize: () => minimize(win),
      toggleMax: () => toggleMax(win),
    };
    win.setTitle(opts.title || '');
    wins.set(id, win);

    const [bClose, bMin, bMax] = el.querySelectorAll('.traffic button');
    bClose.addEventListener('click', (e) => { e.stopPropagation(); close(win); });
    bMin.addEventListener('click', (e) => { e.stopPropagation(); minimize(win); });
    bMax.addEventListener('click', (e) => { e.stopPropagation(); toggleMax(win); });
    el.querySelector('.traffic').addEventListener('pointerdown', (e) => e.stopPropagation());

    el.addEventListener('pointerdown', () => focus(win), true);
    setupDrag(win);
    setupResize(win);
    if (opts.render) opts.render(win.body, win);
    focus(win);
    return win;
  }

  function focus(win) {
    if (!win || !wins.has(win.id)) return;
    win.el.style.zIndex = ++z;
    wins.forEach((w) => w.el.classList.toggle('active', w === win));
    active = win;
    emit();
  }
  let active = null;

  function close(win) {
    if (!wins.has(win.id)) return;
    if (win.onClose && win.onClose() === false) return;
    wins.delete(win.id);
    win.el.classList.add('closing');
    setTimeout(() => win.el.remove(), 180);
    if (active === win) {
      active = null;
      const next = topWindow();
      if (next) focus(next); else emit();
    } else emit();
  }

  function topWindow(app) {
    let best = null;
    wins.forEach((w) => {
      if (w.minimized || (app && w.app !== app)) return;
      if (!best || +w.el.style.zIndex > +best.el.style.zIndex) best = w;
    });
    return best;
  }

  function minimize(win) {
    const target = WM.dockRect?.(win.app);
    const r = win.el.getBoundingClientRect();
    let tx = 0, ty = window.innerHeight, sc = .1;
    if (target) {
      tx = target.left + target.width / 2 - (r.left + r.width / 2);
      ty = target.top + target.height / 2 - (r.top + r.height / 2);
      sc = Math.max(.05, target.width / r.width);
    }
    win.el.classList.add('minimizing');
    win.el.style.transform = `translate(${tx}px, ${ty}px) scale(${sc}, ${sc * .6})`;
    win.minimized = true;
    setTimeout(() => { if (win.minimized) win.el.style.visibility = 'hidden'; }, 450);
    if (active === win) { active = null; const n = topWindow(); if (n) focus(n); else emit(); } else emit();
  }

  function restore(win) {
    win.minimized = false;
    win.el.style.visibility = '';
    requestAnimationFrame(() => {
      win.el.style.transform = '';
      win.el.style.opacity = '';
      setTimeout(() => win.el.classList.remove('minimizing'), 450);
    });
    win.el.classList.add('minimizing');
    win.el.style.opacity = '1';
    focus(win);
  }

  function toggleMax(win) {
    const el = win.el;
    el.classList.add('anim');
    if (!win.maximized) {
      win.prev = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      Object.assign(el.style, { left: '0px', top: MENUBAR + 'px', width: window.innerWidth + 'px', height: (window.innerHeight - MENUBAR) + 'px' });
      el.classList.add('maximized');
    } else {
      Object.assign(el.style, win.prev);
      el.classList.remove('maximized');
    }
    win.maximized = !win.maximized;
    setTimeout(() => el.classList.remove('anim'), 320);
  }

  function setupDrag(win) {
    const el = win.el;
    el.addEventListener('pointerdown', (e) => {
      const handle = e.target.closest('[data-drag]');
      if (!handle || e.button !== 0) return;
      if (e.target.closest('button, input, select, textarea, a, [data-nodrag]')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      let moved = false;
      const move = (ev) => {
        if (win.maximized) {
          // Pull the window out of zoom while dragging, keeping the grab point
          const ratio = (sx - el.offsetLeft) / el.offsetWidth;
          toggleMax(win); el.classList.remove('anim');
          const w = parseFloat(win.prev.width);
          el.style.left = (ev.clientX - w * ratio) + 'px';
          return;
        }
        moved = true;
        const nx = ox + ev.clientX - sx;
        const ny = Math.max(MENUBAR, oy + ev.clientY - sy);
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('[data-drag]') && !e.target.closest('button, input, [data-nodrag]')) toggleMax(win);
    });
  }

  function setupResize(win) {
    win.el.querySelectorAll('.win-resize').forEach((h) => {
      h.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        focus(win);
        const el = win.el, sx = e.clientX, sy = e.clientY;
        const ow = el.offsetWidth, oh = el.offsetHeight, ol = el.offsetLeft;
        const minW = parseFloat(getComputedStyle(el).minWidth) || 260;
        const minH = parseFloat(getComputedStyle(el).minHeight) || 160;
        const dir = h.classList[1];
        const move = (ev) => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (dir.includes('r')) el.style.width = Math.max(minW, ow + dx) + 'px';
          if (dir.includes('b')) el.style.height = Math.max(minH, oh + dy) + 'px';
          if (dir === 'l' || dir === 'bl') {
            const nw = Math.max(minW, ow - dx);
            el.style.width = nw + 'px';
            el.style.left = (ol + ow - nw) + 'px';
          }
        };
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    });
  }

  window.WM = {
    createWindow, focus, close, minimize, restore, toggleMax, topWindow,
    get active() { return active; },
    windows: () => [...wins.values()],
    byApp: (app) => [...wins.values()].filter((w) => w.app === app),
    on: (fn) => listeners.add(fn),
    dockRect: null,
  };
})();

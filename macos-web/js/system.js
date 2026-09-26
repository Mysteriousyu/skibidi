/* System shell: settings, boot & lock, menu bar, dock, Control Center,
   Notification Center, Spotlight, Apps launcher, desktop and shortcuts. */
(function () {
  const { APP: AI, UI } = window.ICONS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const APPLE = $('#boot .apple-logo').outerHTML;
  const osEl = $('#os');

  /* ---------------- Settings ---------------- */
  const DEFAULTS = {
    appearance: 'auto', accent: '#0a84ff', glass: 0.3, wallpaper: 'goldengate',
    dockSize: 56, magnify: true, magScale: 1.6, autohide: false, desktopIcons: true,
    menubarBg: false, clockSeconds: false, showBattery: true,
    wifi: true, bluetooth: true, airdrop: false, focus: false, notifs: true, lowPower: false, reduceMotion: false,
    brightness: 100, volume: 60, batteryLevel: 87,
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('webmac.settings')) || {}; } catch { /* ignore */ }
  const settings = { ...DEFAULTS, ...saved };
  const settingsListeners = new Set();

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  function isDark() {
    if (settings.appearance === 'dark') return true;
    if (settings.appearance === 'light') return false;
    const host = document.documentElement.dataset.theme;
    if (host === 'dark') return true;
    if (host === 'light') return false;
    return media.matches;
  }

  const dim = document.createElement('div');
  dim.style.cssText = 'position:fixed;inset:0;background:#000;pointer-events:none;z-index:99990;opacity:0;transition:opacity .2s';
  osEl.appendChild(dim);

  function apply() {
    const dark = isDark();
    osEl.classList.toggle('dark', dark);
    osEl.style.setProperty('--accent', settings.accent);
    const a = 0.1 + settings.glass * 0.72;
    osEl.style.setProperty('--glass-alpha', a.toFixed(3));
    osEl.style.setProperty('--user-glass', a.toFixed(3));
    osEl.style.setProperty('--glass-blur', (18 + settings.glass * 22).toFixed(0) + 'px');
    const wp = WALLPAPERS.get(settings.wallpaper, dark);
    $('#wallpaper').style.backgroundImage = wp.css;
    $('#lock').style.background = `${wp.css} center/cover`;
    const mb = $('#menubar');
    mb.classList.toggle('on-dark', wp.darkUI);
    mb.classList.toggle('solid', !!settings.menubarBg);
    osEl.style.setProperty('--dock-size', settings.dockSize + 'px');
    $('#dock-wrap').classList.toggle('autohide', !!settings.autohide);
    $('#desktop-icons').hidden = !settings.desktopIcons;
    dim.style.opacity = ((100 - settings.brightness) / 100 * 0.75).toFixed(2);
    osEl.classList.toggle('reduce-motion', !!settings.reduceMotion);
    window.MUSIC?.setVolume(settings.volume);
  }
  function set(key, val, live = false) {
    settings[key] = val;
    try { localStorage.setItem('webmac.settings', JSON.stringify(settings)); } catch { /* ignore */ }
    apply();
    if (['showBattery', 'clockSeconds', 'wifi', 'focus'].includes(key)) renderMenubarRight();
    if (['wifi', 'bluetooth', 'airdrop', 'focus', 'appearance'].includes(key) && !$('#control-center').hidden) renderCC();
    settingsListeners.forEach((fn) => fn(live));
  }
  media.addEventListener('change', apply);
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------------- Menus (dropdown + context) ---------------- */
  function fillMenu(menu, items) {
    menu.innerHTML = items.map((it, i) => it.sep ? '<div class="sep"></div>'
      : `<div class="mi${it.disabled ? ' disabled' : ''}" data-i="${i}" role="menuitem"><span>${it.check !== undefined ? `<span class="check">${it.check ? '✓' : ''}</span>` : ''}${esc(it.label)}</span>${it.sc ? `<span class="sc">${it.sc}</span>` : ''}</div>`).join('');
    $$('.mi', menu).forEach((m) => m.addEventListener('click', (e) => {
      e.stopPropagation();
      const it = items[+m.dataset.i];
      if (it.disabled) return;
      closeMenus();
      it.action?.();
    }));
  }
  function contextMenu(x, y, items) {
    closeAll();
    const m = $('#context-menu');
    fillMenu(m, items);
    m.hidden = false;
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 6) + 'px';
    m.style.top = Math.min(y, innerHeight - r.height - 6) + 'px';
  }
  let openMenuBtn = null;
  function openDropdown(btn, items) {
    const m = $('#dropdown');
    $$('.mb-item.open').forEach((b) => b.classList.remove('open'));
    btn.classList.add('open'); openMenuBtn = btn;
    fillMenu(m, items);
    m.hidden = false;
    const r = btn.getBoundingClientRect();
    m.style.top = (r.bottom + 4) + 'px';
    m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 6) + 'px';
  }
  function closeMenus() {
    $('#dropdown').hidden = true; $('#context-menu').hidden = true;
    $$('.mb-item.open').forEach((b) => b.classList.remove('open')); openMenuBtn = null;
  }
  function closeAll(except) {
    closeMenus();
    if (except !== 'cc') { $('#control-center').hidden = true; }
    if (except !== 'nc') { $('#notif-center').hidden = true; }
    if (except !== 'sp') { $('#spotlight').hidden = true; }
    if (except !== 'lp') { $('#launchpad').hidden = true; }
  }

  /* ---------------- Menu bar ---------------- */
  const activeApp = () => WM.active?.app || 'finder';
  function appMenus() {
    const id = activeApp(), app = APPS[id], win = WM.active && WM.active.app === id ? WM.active : null;
    const name = app.name;
    const own = app.menus ? app.menus(win) : {};
    const menus = {};
    menus[name] = [
      { label: `About ${name}`, action: () => APPS.about.open() },
      { sep: true },
      { label: 'Settings…', sc: '⌘,', action: () => APPS.settings.open() },
      { sep: true },
      { label: `Hide ${name}`, sc: '⌘H', action: () => WM.byApp(id).forEach((w) => !w.minimized && WM.minimize(w)) },
      { label: `Quit ${name}`, sc: '⌘Q', disabled: id === 'finder', action: () => quit(id) },
    ];
    menus.File = own.File || own.Shell || [{ label: 'Close Window', sc: '⌘W', disabled: !win, action: () => WM.close(win) }];
    if (own.Shell) menus.Shell = own.Shell, delete menus.File;
    menus.Edit = [
      { label: 'Undo', sc: '⌘Z', action: () => document.execCommand('undo') },
      { label: 'Redo', sc: '⇧⌘Z', action: () => document.execCommand('redo') },
      { sep: true },
      { label: 'Cut', sc: '⌘X', action: () => document.execCommand('cut') },
      { label: 'Copy', sc: '⌘C', action: () => document.execCommand('copy') },
      { label: 'Paste', sc: '⌘V', disabled: true },
      { label: 'Select All', sc: '⌘A', action: () => document.execCommand('selectAll') },
    ];
    menus.View = [
      { label: 'Enter Full Screen', sc: '⌃⌘F', action: () => { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {}); } },
      { label: 'Zoom Window', disabled: !win, action: () => WM.toggleMax(win) },
    ];
    Object.entries(own).forEach(([k, v]) => { if (!['File', 'Shell'].includes(k)) menus[k] = v; });
    const wins = WM.byApp(id);
    menus.Window = [
      { label: 'Minimize', sc: '⌘M', disabled: !win, action: () => WM.minimize(win) },
      { label: 'Zoom', disabled: !win, action: () => WM.toggleMax(win) },
      { sep: true },
      { label: 'Bring All to Front', action: () => wins.forEach((w) => w.minimized ? WM.restore(w) : WM.focus(w)) },
      ...(wins.length ? [{ sep: true }] : []),
      ...wins.map((w) => ({ label: w.title || app.name, check: w === WM.active, action: () => w.minimized ? WM.restore(w) : WM.focus(w) })),
    ];
    menus.Help = [
      { label: `${name} Help`, action: () => notify({ app: 'finder', title: 'Tips', body: 'Ctrl+Space opens Spotlight. Right-click the desktop to change wallpaper. Drag window edges to resize.' }) },
      { label: 'Keyboard Shortcuts', action: () => notify({ app: 'settings', title: 'Shortcuts', body: 'Ctrl/Alt+Space: Spotlight · Alt+W: Close · Alt+M: Minimize · Alt+Q: Quit · Esc: dismiss' }) },
    ];
    return menus;
  }

  const appleMenu = () => [
    { label: 'About This Mac', action: () => APPS.about.open() },
    { sep: true },
    { label: 'System Settings…', action: () => APPS.settings.open() },
    { label: 'App Store…', disabled: true },
    { sep: true },
    { label: 'Force Quit…', sc: '⌥⌘⎋', action: () => { const a = activeApp(); if (a !== 'finder') quit(a); } },
    { sep: true },
    { label: 'Sleep', action: () => power('sleep') },
    { label: 'Restart…', action: () => power('restart') },
    { label: 'Shut Down…', action: () => power('shutdown') },
    { sep: true },
    { label: 'Lock Screen', sc: '⌃⌘Q', action: () => power('lock') },
    { label: 'Log Out Guest User…', sc: '⇧⌘Q', action: () => power('logout') },
  ];

  function renderMenubar() {
    const mb = $('#menubar');
    if (!mb.querySelector('.mb-left')) mb.innerHTML = '<div class="mb-left"></div><div class="mb-right"></div>';
    const left = $('.mb-left', mb);
    const menus = appMenus();
    const names = Object.keys(menus);
    left.innerHTML = `<button class="mb-item" data-m="apple" aria-label="Apple menu">${APPLE}</button>` +
      names.map((n, i) => `<button class="mb-item${i === 0 ? ' app-name' : ' hide-narrow'}" data-m="${esc(n)}">${esc(n)}</button>`).join('');
    $$('.mb-item', left).forEach((b) => {
      const items = () => b.dataset.m === 'apple' ? appleMenu() : appMenus()[b.dataset.m] || [];
      b.addEventListener('click', (e) => { e.stopPropagation(); if (openMenuBtn === b) closeMenus(); else { closeAll(); openDropdown(b, items()); } });
      b.addEventListener('mouseenter', () => { if (openMenuBtn && openMenuBtn !== b && openMenuBtn.closest('.mb-left')) openDropdown(b, items()); });
    });
    renderMenubarRight();
  }

  function renderMenubarRight() {
    const right = $('#menubar .mb-right');
    if (!right) return;
    right.innerHTML = `
      ${settings.showBattery ? `<button class="mb-item hide-narrow" data-r="battery" aria-label="Battery">${settings.batteryLevel}% ${UI.battery.replace('<svg', '<svg style="width:26px;height:13px"')}</button>` : ''}
      <button class="mb-item" data-r="wifi" aria-label="Wi-Fi" style="opacity:${settings.wifi ? 1 : .45}">${UI.wifi}</button>
      <button class="mb-item hide-narrow" data-r="search" aria-label="Spotlight">${UI.search}</button>
      <button class="mb-item" data-r="cc" aria-label="Control Center">${UI.cc}</button>
      <button class="mb-item hide-narrow" data-r="siri" aria-label="Siri">${UI.siri}</button>
      <button class="mb-item mb-clock" data-r="clock"></button>`;
    $('[data-r=cc]', right).addEventListener('click', (e) => { e.stopPropagation(); toggleCC(); });
    $('[data-r=wifi]', right).addEventListener('click', (e) => {
      e.stopPropagation(); closeAll();
      openDropdown(e.currentTarget, [
        { label: 'Wi-Fi', check: settings.wifi, action: () => set('wifi', !settings.wifi) },
        { sep: true },
        { label: settings.wifi ? 'Golden Gate 5G' : 'Wi-Fi is off', check: settings.wifi ? true : undefined, disabled: !settings.wifi },
        { label: 'Presidio Guest', disabled: !settings.wifi },
        { sep: true },
        { label: 'Wi-Fi Settings…', action: () => APPS.settings.open('wifi') },
      ]);
    });
    $('[data-r=battery]', right)?.addEventListener('click', (e) => {
      e.stopPropagation(); closeAll();
      openDropdown(e.currentTarget, [
        { label: `Battery ${settings.batteryLevel}%`, disabled: true },
        { label: 'Power Source: Battery', disabled: true },
        { sep: true },
        { label: 'Low Power Mode', check: settings.lowPower, action: () => set('lowPower', !settings.lowPower) },
        { label: 'Battery Settings…', action: () => APPS.settings.open('battery') },
      ]);
    });
    $('[data-r=search]', right).addEventListener('click', (e) => { e.stopPropagation(); toggleSpotlight(); });
    $('[data-r=siri]', right).addEventListener('click', (e) => { e.stopPropagation(); notify({ app: 'settings', title: 'Siri', body: 'Siri isn\'t available in the web edition. Try Spotlight with Ctrl+Space.' }); });
    $('[data-r=clock]', right).addEventListener('click', (e) => { e.stopPropagation(); toggleNC(); });
    tickClock();
  }

  function tickClock() {
    const d = new Date();
    const c = $('#menubar [data-r=clock]');
    if (c) c.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + '  ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...(settings.clockSeconds ? { second: '2-digit' } : {}) });
    $('.lock-time').textContent = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '');
    $('.lock-date').textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  setInterval(tickClock, 1000);

  /* ---------------- Dock ---------------- */
  const PINNED = ['finder', 'launchpad', 'safari', 'messages', 'photos', 'music', 'notes', 'calendar', 'weather', 'calculator', 'terminal', 'settings'];
  const isRunning = (id) => id === 'finder' || WM.byApp(id).length > 0;

  function renderDock() {
    const dock = $('#dock');
    dock.className = 'glass';
    const running = [...new Set(WM.windows().map((w) => w.app))].filter((id) => !PINNED.includes(id) && APPS[id] && !APPS[id].hidden);
    const item = (id, icon, label) => `<div class="dock-item${id !== 'launchpad' && id !== 'trash' && isRunning(id) ? ' running' : ''}" data-app="${id}" role="button" tabindex="0" aria-label="${esc(label)}">
      <div class="tip glass">${esc(label)}</div><div class="ic">${icon}</div><div class="dot"></div></div>`;
    dock.innerHTML =
      PINNED.map((id) => id === 'launchpad' ? item('launchpad', AI.launchpad, 'Apps') : item(id, APPS[id].icon, APPS[id].name)).join('') +
      (running.length ? '<div class="dock-sep"></div>' + running.map((id) => item(id, APPS[id].icon, APPS[id].name)).join('') : '') +
      '<div class="dock-sep"></div>' + item('downloads', AI.folder, 'Downloads') + item('trash', AI.trash, 'Trash');
    $$('.dock-item', dock).forEach((d) => {
      d.addEventListener('click', () => dockClick(d.dataset.app, d));
      d.addEventListener('keydown', (e) => { if (e.key === 'Enter') dockClick(d.dataset.app, d); });
      d.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const id = d.dataset.app; if (!APPS[id]) return;
        const wins = WM.byApp(id);
        contextMenu(e.clientX, e.clientY - 10, [
          ...wins.map((w) => ({ label: w.title || APPS[id].name, action: () => w.minimized ? WM.restore(w) : WM.focus(w) })),
          ...(wins.length ? [{ sep: true }] : []),
          { label: 'New Window', action: () => launch(id, true) },
          { label: 'Show in Finder', action: () => APPS.finder.open('/Applications') },
          ...(isRunning(id) && id !== 'finder' ? [{ sep: true }, { label: 'Quit', action: () => quit(id) }] : []),
        ]);
      });
    });
  }

  function dockClick(id, node) {
    if (id === 'launchpad') return toggleLaunchpad();
    if (id === 'downloads') return APPS.finder.open('~/Downloads');
    if (id === 'trash') return notify({ app: 'finder', title: 'Trash', body: 'The Trash is empty.' });
    const wins = WM.byApp(id);
    if (!wins.length) { node?.classList.add('bounce'); setTimeout(() => node?.classList.remove('bounce'), 1100); return launch(id); }
    const visible = wins.filter((w) => !w.minimized);
    if (!visible.length) return WM.restore(wins[wins.length - 1]);
    const top = WM.topWindow(id);
    if (WM.active === top && visible.length === wins.length) return; // already frontmost
    visible.forEach((w) => WM.focus(w));
    WM.focus(top);
  }
  function launch(id, fresh) {
    closeAll();
    const app = APPS[id]; if (!app) return;
    if (fresh && id === 'finder') return app.open();
    return app.open();
  }
  function quit(id) { WM.byApp(id).forEach((w) => WM.close(w)); }

  // Magnification: icons swell with a cosine falloff around the pointer
  const dockEl = $('#dock');
  dockEl.addEventListener('mousemove', (e) => {
    if (!settings.magnify) return;
    const base = settings.dockSize, range = base * 3;
    $$('.dock-item', dockEl).forEach((d) => {
      const r = d.getBoundingClientRect();
      const dist = Math.abs(e.clientX - (r.left + r.width / 2));
      const k = dist < range ? (Math.cos((dist / range) * Math.PI) + 1) / 2 : 0;
      const size = base * (1 + (settings.magScale - 1) * k);
      d.style.width = d.style.height = size + 'px';
    });
  });
  dockEl.addEventListener('mouseleave', () => $$('.dock-item', dockEl).forEach((d) => { d.style.width = d.style.height = ''; }));
  WM.dockRect = (app) => ($(`.dock-item[data-app="${app}"]`) || $('.dock-item[data-app="finder"]'))?.getBoundingClientRect();

  // Auto-hide: reveal when the pointer reaches the bottom edge
  document.addEventListener('mousemove', (e) => {
    if (!settings.autohide) return;
    const wrap = $('#dock-wrap');
    if (e.clientY > innerHeight - 8) wrap.classList.add('reveal');
    else if (e.clientY < innerHeight - settings.dockSize * settings.magScale - 30) wrap.classList.remove('reveal');
  });

  /* ---------------- Control Center ---------------- */
  function renderCC() {
    const cc = $('#control-center');
    const tr = window.MUSIC.TRACKS[window.MUSIC.player.idx];
    const tog = (key, icon, label, sub) => `<button class="cc-toggle${settings[key] ? ' on' : ''}" data-t="${key}"><span class="circle">${UI[icon]}</span><span><b>${label}</b><small>${sub}</small></span></button>`;
    cc.innerHTML = `
      <div class="cc-tile cc-2x2">
        ${tog('wifi', 'wifi', 'Wi-Fi', settings.wifi ? 'Golden Gate 5G' : 'Off')}
        ${tog('bluetooth', 'bluetooth', 'Bluetooth', settings.bluetooth ? 'On' : 'Off')}
        ${tog('airdrop', 'airdrop', 'AirDrop', settings.airdrop ? 'Everyone' : 'Contacts Only')}
      </div>
      <div class="cc-tile cc-2x1" style="display:flex;align-items:center">${tog('focus', 'focus', 'Focus', settings.focus ? 'Do Not Disturb' : 'Off')}</div>
      <button class="cc-tile cc-1${isDark() ? ' on' : ''}" data-a="dark" aria-label="Dark Mode" title="Dark Mode">${UI.appearance}</button>
      <button class="cc-tile cc-1" data-a="mirror" aria-label="Screen Mirroring" title="Screen Mirroring">${UI.mirror}</button>
      <div class="cc-tile cc-4"><div class="cc-label">Display</div><input type="range" class="slider" id="cc-brightness" min="20" max="100" value="${settings.brightness}" aria-label="Brightness"></div>
      <div class="cc-tile cc-4"><div class="cc-label">Sound</div><input type="range" class="slider" id="cc-volume" min="0" max="100" value="${settings.volume}" aria-label="Volume"></div>
      <div class="cc-tile cc-4"><div class="cc-label" style="display:flex;justify-content:space-between"><span>Liquid Glass</span><span style="font-weight:400;color:var(--text-3)">Clear ↔ Tinted</span></div><input type="range" class="slider" id="cc-glass" min="0" max="1" step="0.01" value="${settings.glass}" aria-label="Liquid Glass transparency"></div>
      <div class="cc-tile cc-4" style="display:flex;align-items:center;gap:10px">
        <div style="width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,#f6c177,#d9506f 45%,#3b2c78);flex:none"></div>
        <div style="flex:1;min-width:0"><b style="font-size:12px;display:block">${esc(tr.name)}</b><small style="color:var(--text-3)">The Presidio Ensemble</small></div>
        <button class="tb-btn" data-a="play" aria-label="Play or pause">${window.MUSIC.player.playing ? UI.pause : UI.play}</button>
        <button class="tb-btn" data-a="next" aria-label="Next track">${UI.next}</button>
      </div>`;
    $$('[data-t]', cc).forEach((b) => b.addEventListener('click', () => set(b.dataset.t, !settings[b.dataset.t])));
    $('[data-a=dark]', cc).addEventListener('click', () => set('appearance', isDark() ? 'light' : 'dark'));
    $('[data-a=mirror]', cc).addEventListener('click', () => notify({ app: 'settings', title: 'Screen Mirroring', body: 'Looking for nearby Apple TV and AirPlay-compatible displays…' }));
    $('[data-a=play]', cc).addEventListener('click', () => { window.MUSIC.player.playing ? window.MUSIC.pauseTrack() : window.MUSIC.playTrack(); renderCC(); });
    $('[data-a=next]', cc).addEventListener('click', () => { window.MUSIC.playTrack((window.MUSIC.player.idx + 1) % window.MUSIC.TRACKS.length); renderCC(); });
    [['cc-brightness', 'brightness'], ['cc-volume', 'volume'], ['cc-glass', 'glass']].forEach(([id, key]) => {
      const r = $('#' + id, cc);
      const paint = () => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
      paint();
      r.addEventListener('input', () => { paint(); set(key, parseFloat(r.value), true); });
      r.addEventListener('change', () => set(key, parseFloat(r.value)));
    });
  }
  function toggleCC() {
    const cc = $('#control-center');
    if (!cc.hidden) return closeAll();
    closeAll('cc'); renderCC(); cc.hidden = false;
  }

  /* ---------------- Notifications ---------------- */
  const history = [];
  function notify({ app = 'finder', title, body }) {
    const n = { app, title, body, t: new Date() };
    history.unshift(n);
    if (!$('#notif-center').hidden) renderNC();
    if (settings.focus || !settings.notifs) return;
    const card = document.createElement('div');
    card.className = 'notif glass';
    card.innerHTML = notifHTML(n);
    card.addEventListener('click', () => { dismiss(); if (APPS[app] && app !== 'finder') APPS[app].open(); });
    $('#toasts').prepend(card);
    const dismiss = () => { card.classList.add('out'); setTimeout(() => card.remove(), 350); };
    setTimeout(dismiss, 5000);
  }
  const notifHTML = (n) => `<div class="ic">${(APPS[n.app] || APPS.finder).icon}</div><div style="flex:1;min-width:0"><div class="head"><b>${esc(n.title)}</b><time>${n.t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><p>${esc(n.body)}</p></div>`;

  function renderNC() {
    const nc = $('#notif-center');
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    let cal = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span class="h">${x}</span>`).join('');
    for (let i = 0; i < first; i++) cal += '<span></span>';
    for (let i = 1; i <= days; i++) cal += `<span class="${i === d.getDate() ? 'today' : ''}">${i}</span>`;
    nc.innerHTML = `
      ${history.length ? history.slice(0, 8).map((n) => `<div class="notif glass">${notifHTML(n)}</div>`).join('') : ''}
      <div class="widget-row">
        <div class="widget glass w-cal"><div class="month">${d.toLocaleDateString('en-US', { month: 'long' })}</div><div class="grid">${cal}</div></div>
        <div class="widget w-weather" data-open="weather"><b>San Francisco</b><div class="t">--°</div><small class="c">Loading…</small><small class="hl"></small></div>
      </div>
      <div class="widget glass" style="display:flex;justify-content:space-around;text-align:center">
        ${[['Cupertino', 'America/Los_Angeles'], ['New York', 'America/New_York'], ['London', 'Europe/London'], ['Tokyo', 'Asia/Tokyo']].map(([c, tz]) => `<div><div style="font-size:20px;font-weight:600;font-variant-numeric:tabular-nums">${new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '')}</div><small style="color:var(--text-3)">${c}</small></div>`).join('')}
      </div>
      <div class="widget glass"><b style="font-size:12px">Up Next</b><p style="margin:6px 0 0;color:var(--text-2)">Try macOS Golden Gate · Today<br>Standup · Today</p></div>`;
    window.getWeather().then((w) => {
      const x = $('.w-weather', nc); if (!x) return;
      $('.t', x).textContent = w.temp + '°';
      $('.c', x).textContent = ['Clear', 'Mostly Clear', 'Partly Cloudy', 'Cloudy'][Math.min(3, w.code)] || 'Foggy';
      $('.hl', x).textContent = `H:${w.hi}° L:${w.lo}°`;
    });
    $('[data-open=weather]', nc).addEventListener('click', () => { closeAll(); APPS.weather.open(); });
  }
  function toggleNC() {
    const nc = $('#notif-center');
    if (!nc.hidden) return closeAll();
    closeAll('nc'); renderNC(); nc.hidden = false;
  }

  /* ---------------- Spotlight ---------------- */
  function searchFiles(q, dir = VFS.HOME, out = []) {
    (VFS.list(dir) || []).forEach((i) => {
      const p = dir + '/' + i.name;
      if (i.name.toLowerCase().includes(q)) out.push({ name: i.name, path: p, type: i.type });
      if (i.type === 'dir' && out.length < 20) searchFiles(q, p, out);
    });
    return out;
  }
  function toggleSpotlight() {
    const sp = $('#spotlight');
    if (!sp.hidden) return closeAll();
    closeAll('sp');
    sp.innerHTML = `<div class="sp-box glass"><div class="sp-input">${UI.search}<input id="spotlight-input" placeholder="Spotlight Search" aria-label="Spotlight Search" autocomplete="off" spellcheck="false"></div>
      <div class="sp-chips"><span class="sp-chip">Applications</span><span class="sp-chip">Files</span><span class="sp-chip">Actions</span><span class="sp-chip">Clipboard</span></div><div class="sp-results"></div></div>`;
    sp.hidden = false;
    const input = $('input', sp), res = $('.sp-results', sp);
    let rows = [], sel = 0;
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      rows = [];
      if (q) {
        let groups = [];
        const apps = Object.values(APPS).filter((a) => !a.hidden && a.name.toLowerCase().includes(q));
        if (apps.length) groups.push(['Applications', apps.map((a) => ({ icon: a.icon, label: a.name, hint: 'Application', go: () => a.open() }))]);
        if (/^[\d\s+\-*/().%^]+$/.test(q) && /\d/.test(q) && /[+\-*/%^]/.test(q)) {
          try {
            const v = Function(`"use strict";return (${q.replace(/\^/g, '**')})`)();
            if (isFinite(v)) groups.unshift(['Calculator', [{ icon: AI.calculator, label: `= ${+v.toPrecision(12)}`, hint: 'Copy', go: () => navigator.clipboard?.writeText(String(v)).catch(() => {}) }]]);
          } catch { /* not an expression */ }
        }
        const actions = [
          ['dark mode', 'Turn Dark Mode ' + (isDark() ? 'Off' : 'On'), () => set('appearance', isDark() ? 'light' : 'dark')],
          ['lock screen', 'Lock Screen', () => power('lock')],
          ['wallpaper', 'Change Wallpaper', () => APPS.settings.open('wallpaper')],
          ['new note', 'New Note', () => { APPS.notes.open(); setTimeout(() => WM.byApp('notes')[0]?.data.add(), 50); }],
          ['liquid glass', 'Liquid Glass Settings', () => APPS.settings.open('appearance')],
        ].filter(([k, l]) => k.includes(q) || l.toLowerCase().includes(q));
        if (actions.length) groups.push(['Actions', actions.map(([, l, fn]) => ({ icon: AI.settings, label: l, hint: 'Action', go: fn }))]);
        const files = searchFiles(q).slice(0, 6);
        if (files.length) groups.push(['Documents', files.map((f) => ({ icon: f.type === 'dir' ? AI.folder : AI.file, label: f.name, hint: f.path.replace(VFS.HOME, '~').split('/').slice(0, -1).join('/'), go: () => window.openPath(f.path) }))]);
        groups.push(['Web', [{ icon: AI.safari, label: `Search the web for “${input.value.trim()}”`, hint: 'Safari', go: () => APPS.safari.open('https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(input.value.trim())) }]]);
        let html = '';
        groups.forEach(([g, items]) => {
          html += `<div class="sp-group">${g}</div>`;
          items.forEach((it) => { html += `<div class="sp-row" data-i="${rows.length}"><div class="ic">${it.icon}</div><span>${esc(it.label)}</span><small>${esc(it.hint)}</small></div>`; rows.push(it); });
        });
        res.innerHTML = html;
        sel = Math.min(sel, rows.length - 1);
      } else res.innerHTML = '';
      $$('.sp-row', res).forEach((r) => {
        r.classList.toggle('sel', +r.dataset.i === sel);
        r.addEventListener('mousemove', () => { if (sel !== +r.dataset.i) { sel = +r.dataset.i; $$('.sp-row', res).forEach((x) => x.classList.toggle('sel', x === r)); } });
        r.addEventListener('click', () => { closeAll(); rows[+r.dataset.i].go(); });
      });
    };
    input.addEventListener('input', () => { sel = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(rows.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && rows[sel]) { const r = rows[sel]; closeAll(); r.go(); }
      else if (e.key === 'Escape') closeAll();
    });
    sp.addEventListener('pointerdown', (e) => { if (e.target === sp) closeAll(); });
    input.focus();
  }

  /* ---------------- Apps launcher (replaces Launchpad in Tahoe+) ---------------- */
  function toggleLaunchpad() {
    const lp = $('#launchpad');
    if (!lp.hidden) return closeAll();
    closeAll('lp');
    const all = Object.values(APPS).filter((a) => !a.hidden);
    const cats = ['All', ...new Set(all.map((a) => a.category))];
    let cat = 'All', q = '';
    lp.innerHTML = `<label class="lp-search">${UI.search}<input id="apps-search" placeholder="Search" aria-label="Search apps" autocomplete="off"></label>
      <div class="lp-cats">${cats.map((c) => `<button class="lp-cat${c === cat ? ' on' : ''}" data-c="${c}">${c}</button>`).join('')}</div><div class="lp-grid"></div>`;
    const draw = () => {
      const list = all.filter((a) => (cat === 'All' || a.category === cat) && a.name.toLowerCase().includes(q));
      $('.lp-grid', lp).innerHTML = list.map((a) => `<button class="lp-app" data-app="${a.id}"><div class="ic">${a.icon}</div>${esc(a.name)}</button>`).join('');
      $$('.lp-app', lp).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); closeAll(); APPS[b.dataset.app].open(); }));
      $$('.lp-cat', lp).forEach((b) => b.classList.toggle('on', b.dataset.c === cat));
    };
    $$('.lp-cat', lp).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); cat = b.dataset.c; draw(); }));
    const input = $('input', lp);
    input.addEventListener('input', () => { q = input.value.toLowerCase(); draw(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('.lp-app', lp)?.click(); });
    lp.onclick = (e) => { if (e.target === lp || e.target.classList.contains('lp-grid')) closeAll(); };
    draw();
    lp.hidden = false;
    input.focus();
  }

  /* ---------------- Desktop ---------------- */
  function renderDesktopIcons() {
    const box = $('#desktop-icons');
    const items = [{ name: 'Macintosh HD', icon: AI.hd, open: () => APPS.finder.open('/') }];
    (VFS.list('~/Desktop') || []).forEach((i) => {
      const p = VFS.norm('~/Desktop/' + i.name);
      items.push({ name: i.name, icon: i.type === 'dir' ? AI.folder : AI.file, open: () => window.openPath(p), path: p });
    });
    box.innerHTML = items.map((it, i) => `<div class="d-icon" data-i="${i}" tabindex="0"><div class="ic">${it.icon}</div><span>${esc(it.name)}</span></div>`).join('');
    $$('.d-icon', box).forEach((d) => {
      const it = items[+d.dataset.i];
      d.addEventListener('click', (e) => { e.stopPropagation(); $$('.d-icon', box).forEach((x) => x.classList.toggle('selected', x === d)); });
      d.addEventListener('dblclick', it.open);
      d.addEventListener('keydown', (e) => { if (e.key === 'Enter') it.open(); });
      d.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        contextMenu(e.clientX, e.clientY, [{ label: 'Open', action: it.open }, ...(it.path ? [{ sep: true }, { label: 'Move to Trash', action: () => VFS.remove(it.path) }] : [{ label: 'Get Info', action: () => APPS.about.open() }])]);
      });
    });
  }
  VFS.onChange(renderDesktopIcons);

  $('#wallpaper').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', action: () => VFS.create(VFS.norm('~/Desktop/' + VFS.uniqueName(VFS.norm('~/Desktop'), 'untitled folder')), 'dir') },
      { sep: true },
      { label: 'Get Info', action: () => APPS.about.open() },
      { label: 'Change Wallpaper…', action: () => APPS.settings.open('wallpaper') },
      { label: 'Next Wallpaper', action: () => { const L = WALLPAPERS.LIST, i = L.findIndex((w) => w.id === settings.wallpaper); set('wallpaper', L[(i + 1) % L.length].id); } },
      { sep: true },
      { label: 'Use Stacks', disabled: true },
      { label: 'Show View Options', disabled: true },
    ]);
  });
  $('#wallpaper').addEventListener('click', () => $$('.d-icon').forEach((x) => x.classList.remove('selected')));

  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.menu, #control-center, #notif-center, .sp-box, #launchpad, .mb-item')) return;
    closeAll();
  });

  /* ---------------- Keyboard ---------------- */
  document.addEventListener('keydown', (e) => {
    if ($('#desktop').hidden) return;
    if ((e.ctrlKey || e.altKey || e.metaKey) && e.code === 'Space') { e.preventDefault(); toggleSpotlight(); return; }
    if (e.key === 'Escape') { closeAll(); return; }
    if (e.altKey && !e.ctrlKey) {
      const w = WM.active, k = e.code;
      if (k === 'KeyW' && w) { e.preventDefault(); WM.close(w); }
      else if (k === 'KeyM' && w) { e.preventDefault(); WM.minimize(w); }
      else if (k === 'KeyQ') { e.preventDefault(); const a = activeApp(); if (a !== 'finder') quit(a); }
      else if (k === 'KeyN') { e.preventDefault(); APPS[activeApp()].open(); }
      else if (k === 'Comma') { e.preventDefault(); APPS.settings.open(); }
    }
  });

  /* ---------------- Boot, lock & power ---------------- */
  function boot() {
    const b = $('#boot'), fill = $('.boot-fill');
    b.hidden = false; b.style.opacity = 1;
    $('#lock').hidden = true; $('#desktop').hidden = true;
    let p = 0;
    const iv = setInterval(() => {
      p += 6 + Math.random() * 14;
      fill.style.width = Math.min(100, p) + '%';
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(() => { b.style.opacity = 0; setTimeout(() => { b.hidden = true; showLock(); }, 500); }, 300);
      }
    }, 140);
  }
  function showLock() {
    const lock = $('#lock');
    lock.hidden = false; lock.style.opacity = 1; lock.style.transform = '';
    tickClock();
    const pw = $('#lock-password'); pw.value = '';
    setTimeout(() => pw.focus(), 50);
  }
  $('.lock-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = $('#lock-password');
    if (!pw.value) { const f = $('.lock-field'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); return; }
    const lock = $('#lock');
    $('#desktop').hidden = false;
    lock.style.opacity = 0; lock.style.transform = 'scale(1.04)';
    setTimeout(() => { lock.hidden = true; }, 500);
    if (!loggedIn) {
      loggedIn = true;
      setTimeout(() => notify({ app: 'finder', title: 'Welcome to macOS Golden Gate', body: 'Open Control Center to try the new Liquid Glass transparency slider.' }), 900);
    }
  });
  let loggedIn = false;

  function power(kind) {
    closeAll();
    const bo = $('#blackout');
    if (kind === 'lock') return showLock();
    if (kind === 'logout') { WM.windows().forEach((w) => WM.close(w)); loggedIn = false; return setTimeout(showLock, 250); }
    bo.innerHTML = '';
    bo.hidden = false; bo.style.opacity = 0;
    requestAnimationFrame(() => { bo.style.opacity = 1; });
    if (kind === 'sleep') {
      bo.onclick = () => { bo.style.opacity = 0; setTimeout(() => { bo.hidden = true; }, 600); showLock(); };
      return;
    }
    WM.windows().forEach((w) => WM.close(w));
    window.MUSIC.pauseTrack();
    loggedIn = false;
    if (kind === 'restart') { setTimeout(() => { bo.hidden = true; boot(); }, 1400); return; }
    bo.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#555;font-size:13px">Click anywhere to power on</div>';
    bo.onclick = () => { bo.hidden = true; bo.onclick = null; boot(); };
  }

  /* ---------------- Public API & start ---------------- */
  window.OS = {
    settings, set, isDark, notify, contextMenu, power,
    onSettings: (fn) => { settingsListeners.add(fn); return () => settingsListeners.delete(fn); },
  };

  WM.on(() => { renderMenubar(); renderDock(); });
  apply();
  renderMenubar();
  renderDock();
  renderDesktopIcons();

  const params = new URLSearchParams(location.search);
  if (params.has('skipboot') || location.hash === '#desktop') {
    $('#boot').hidden = true; $('#desktop').hidden = false; loggedIn = true;
  } else boot();
})();

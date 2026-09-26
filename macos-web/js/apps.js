/* Built-in applications. Each app registers { id, name, icon, open(arg), menus() }. */
(function () {
  const { APP: AI, UI } = window.ICONS;
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('webmac.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('webmac.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };
  const OS = () => window.OS;

  const APPS = {};
  function register(app) { APPS[app.id] = app; }

  // Reuse the app's existing window when it is single-instance
  function single(id, create) {
    const existing = WM.byApp(id)[0];
    if (existing) { existing.minimized ? WM.restore(existing) : WM.focus(existing); return existing; }
    return create();
  }

  /* =================================================================
     Finder
     ================================================================= */
  const FINDER_PLACES = [
    { section: 'Favorites' },
    { label: 'Recents', icon: 'recents', path: ':recents' },
    { label: 'Applications', icon: 'apps', path: '/Applications' },
    { label: 'Desktop', icon: 'desktopI', path: '~/Desktop' },
    { label: 'Documents', icon: 'doc', path: '~/Documents' },
    { label: 'Downloads', icon: 'download', path: '~/Downloads' },
    { label: 'guest', icon: 'home', path: '~' },
    { section: 'Locations' },
    { label: 'iCloud Drive', icon: 'cloud', path: '~/Documents' },
    { label: 'Macintosh HD', icon: 'drive', path: '/' },
    { label: 'Network', icon: 'net', path: ':network' },
    { section: 'Tags' },
    { label: 'Red', tag: '#ff453a' }, { label: 'Orange', tag: '#ff9f0a' }, { label: 'Green', tag: '#30d158' }, { label: 'Blue', tag: '#0a84ff' }, { label: 'Purple', tag: '#bf5af2' },
  ];

  function iconFor(item) {
    if (item.type === 'app') return APPS[item.app].icon;
    if (item.type === 'dir') return AI.folder;
    if (/\.(png|jpe?g|gif|heic)$/i.test(item.name)) return AI.image;
    return AI.file;
  }

  function openPath(path) {
    const node = VFS.get(path);
    if (!node) return;
    if (node.type === 'dir') return APPS.finder.open(path);
    if (/\.(png|jpe?g|gif|heic)$/i.test(path)) return APPS.photos.open();
    APPS.textedit.open(path);
  }

  register({
    id: 'finder', name: 'Finder', icon: AI.finder, category: 'Utilities', keepAlive: true,
    open(path = '~') {
      const win = WM.createWindow({
        app: 'finder', title: 'Finder', width: 820, height: 500, sidebar: true, sidebarWidth: 200, minWidth: 460,
        render(body, win) {
          const st = win.data = { path: VFS.norm(path), back: [], fwd: [], sel: null, q: '' };
          body.innerHTML = `
            <aside class="app-sidebar">${FINDER_PLACES.map((p) => p.section
              ? `<div class="sb-section">${p.section}</div>`
              : `<div class="sb-item" data-path="${p.path || ''}">${p.tag ? `<span class="tag" style="background:${p.tag}"></span>` : UI[p.icon]}${p.label}</div>`).join('')}
            </aside>
            <section class="app-main">
              <div class="toolbar" data-drag>
                <div class="tb-group"><button class="tb-btn" data-a="back" aria-label="Back">${UI.back}</button><button class="tb-btn" data-a="fwd" aria-label="Forward">${UI.fwd}</button></div>
                <h2></h2>
                <div class="tb-group"><button class="tb-btn" data-a="grid" aria-label="Icon view">${UI.grid}</button><button class="tb-btn" data-a="newdir" aria-label="New folder">${UI.plus}</button><button class="tb-btn" data-a="share" aria-label="Share">${UI.share}</button></div>
                <label class="search-field">${UI.search}<input id="finder-search-${win.id}" placeholder="Search" aria-label="Search"></label>
              </div>
              <div class="scroll"><div class="finder-grid"></div></div>
              <div class="path-bar"></div>
              <div class="statusbar"></div>
            </section>`;
          const grid = body.querySelector('.finder-grid');
          const title = body.querySelector('h2');

          const items = () => {
            if (st.path === ':recents') {
              const out = [];
              ['~/Desktop', '~/Documents', '~/Downloads'].forEach((d) => (VFS.list(d) || []).filter((i) => i.type === 'file').forEach((i) => out.push({ ...i, full: VFS.norm(d) + '/' + i.name })));
              return out;
            }
            if (st.path === ':network') return [];
            if (st.path === '/Applications') return Object.values(APPS).filter((a) => !a.hidden).map((a) => ({ name: a.name, type: 'app', app: a.id }));
            return (VFS.list(st.path) || []).map((i) => ({ ...i, full: (st.path === '/' ? '' : st.path) + '/' + i.name }));
          };

          const render = () => {
            const name = st.path === ':recents' ? 'Recents' : st.path === ':network' ? 'Network' : st.path === '/' ? 'Macintosh HD' : st.path.split('/').pop();
            title.textContent = name; win.setTitle(name);
            const list = items().filter((i) => !st.q || i.name.toLowerCase().includes(st.q));
            grid.innerHTML = list.length ? list.map((i, n) => `
              <div class="f-item${st.sel === i.name ? ' selected' : ''}" data-n="${n}" tabindex="0">
                <div class="ic">${iconFor(i)}</div><span>${esc(i.name)}</span></div>`).join('')
              : `<div class="empty">${st.q ? 'No results' : 'This folder is empty'}</div>`;
            grid.querySelectorAll('.f-item').forEach((node) => {
              const it = list[+node.dataset.n];
              node.addEventListener('click', (e) => { e.stopPropagation(); st.sel = it.name; grid.querySelectorAll('.f-item').forEach((x) => x.classList.toggle('selected', x === node)); });
              node.addEventListener('dblclick', () => activate(it));
              node.addEventListener('keydown', (e) => { if (e.key === 'Enter') activate(it); });
              node.addEventListener('contextmenu', (e) => {
                e.preventDefault(); e.stopPropagation();
                const menu = [{ label: 'Open', action: () => activate(it) }];
                if (it.full) menu.push({ sep: true },
                  { label: 'Rename', action: () => renameInline(node, it) },
                  { label: 'Move to Trash', action: () => VFS.remove(it.full) });
                OS().contextMenu(e.clientX, e.clientY, menu);
              });
            });
            body.querySelectorAll('.sb-item').forEach((s) => s.classList.toggle('active', s.dataset.path && VFS.norm(s.dataset.path) === st.path || s.dataset.path === st.path));
            body.querySelector('[data-a=back]').disabled = !st.back.length;
            body.querySelector('[data-a=fwd]').disabled = !st.fwd.length;
            body.querySelector('.statusbar').textContent = `${list.length} item${list.length === 1 ? '' : 's'}, 412.6 GB available`;
            body.querySelector('.path-bar').textContent = st.path.startsWith(':') ? '' : ['Macintosh HD', ...st.path.split('/').filter(Boolean)].join('  ›  ');
          };

          const go = (p, push = true) => {
            const np = p.startsWith(':') ? p : VFS.norm(p);
            if (np === st.path) return;
            if (push) { st.back.push(st.path); st.fwd = []; }
            st.path = np; st.sel = null; render();
          };
          const activate = (it) => {
            if (it.type === 'app') return APPS[it.app].open();
            if (it.type === 'dir') return go(it.full);
            openPath(it.full);
          };
          const renameInline = (node, it) => {
            const span = node.querySelector('span');
            const input = el(`<input value="${esc(it.name)}" style="width:90px;font-size:12px;text-align:center" data-nodrag>`);
            span.replaceWith(input); input.focus(); input.select();
            const done = () => { const v = input.value.trim(); if (v && v !== it.name) VFS.rename(it.full, v); render(); };
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); if (e.key === 'Escape') render(); });
            input.addEventListener('blur', done);
          };
          win.data.newFolder = () => {
            if (st.path.startsWith(':') || st.path === '/Applications') return;
            VFS.create(st.path + '/' + VFS.uniqueName(st.path, 'untitled folder'), 'dir');
          };

          body.querySelectorAll('.sb-item[data-path]').forEach((s) => s.addEventListener('click', () => s.dataset.path && go(s.dataset.path)));
          body.querySelector('[data-a=back]').addEventListener('click', () => { if (st.back.length) { st.fwd.push(st.path); st.path = st.back.pop(); render(); } });
          body.querySelector('[data-a=fwd]').addEventListener('click', () => { if (st.fwd.length) { st.back.push(st.path); st.path = st.fwd.pop(); render(); } });
          body.querySelector('[data-a=newdir]').addEventListener('click', win.data.newFolder);
          body.querySelector('[data-a=share]').addEventListener('click', () => OS().notify({ app: 'finder', title: 'AirDrop', body: 'No nearby devices found.' }));
          body.querySelector('input').addEventListener('input', (e) => { st.q = e.target.value.toLowerCase(); render(); });
          body.querySelector('.scroll').addEventListener('click', () => { st.sel = null; grid.querySelectorAll('.f-item').forEach((x) => x.classList.remove('selected')); });
          body.querySelector('.scroll').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            OS().contextMenu(e.clientX, e.clientY, [
              { label: 'New Folder', action: win.data.newFolder },
              { label: 'New Text File', action: () => { if (!st.path.startsWith(':')) VFS.create(st.path + '/' + VFS.uniqueName(st.path, 'untitled', '.txt'), 'file'); } },
              { sep: true },
              { label: 'Get Info', action: () => OS().notify({ app: 'finder', title: title.textContent, body: `${items().length} items` }) },
            ]);
          });
          const off = VFS.onChange(render);
          win.onClose = () => { off(); };
          render();
        },
      });
      return win;
    },
    menus: (win) => ({
      File: [
        { label: 'New Finder Window', sc: '⌘N', action: () => APPS.finder.open() },
        { label: 'New Folder', sc: '⇧⌘N', action: () => win?.data.newFolder?.() },
        { sep: true },
        { label: 'Close Window', sc: '⌘W', action: () => win && WM.close(win), disabled: !win },
      ],
      Go: [
        { label: 'Recents', action: () => APPS.finder.open(':recents') },
        { label: 'Documents', action: () => APPS.finder.open('~/Documents') },
        { label: 'Desktop', action: () => APPS.finder.open('~/Desktop') },
        { label: 'Downloads', action: () => APPS.finder.open('~/Downloads') },
        { label: 'Home', action: () => APPS.finder.open('~') },
        { label: 'Applications', action: () => APPS.finder.open('/Applications') },
      ],
    }),
  });

  /* =================================================================
     Safari
     ================================================================= */
  const APPLE_GLYPH = '<svg viewBox="0 0 170 170" width="30" height="30"><path fill="#fff" d="M150.4 130.3c-2.3 5.3-5 10.2-8.2 14.7-4.3 6.1-7.8 10.4-10.5 12.7-4.2 3.9-8.8 5.9-13.6 6-3.5 0-7.7-1-12.6-3-4.9-2-9.4-3-13.5-3-4.3 0-8.9 1-13.8 3-4.9 2-8.9 3.1-11.9 3.2-4.6.2-9.3-1.8-13.9-6.1-3-2.6-6.7-7-11.2-13.3-4.8-6.7-8.7-14.5-11.8-23.4-3.3-9.6-4.9-18.9-4.9-27.9 0-10.3 2.2-19.2 6.7-26.7 3.5-6 8.2-10.7 14-14.2 5.9-3.5 12.2-5.3 19-5.4 3.7 0 8.6 1.2 14.7 3.4 6.1 2.3 10 3.4 11.7 3.4 1.3 0 5.6-1.3 12.9-4 6.9-2.5 12.7-3.5 17.5-3.1 12.9 1 22.6 6.1 29 15.3-11.6 7-17.3 16.8-17.2 29.4.1 9.8 3.7 18 10.6 24.5 3.1 3 6.6 5.2 10.5 6.8-.8 2.4-1.7 4.7-2.6 6.9zM119.1 7.2c0 7.7-2.8 14.9-8.4 21.5-6.7 7.9-14.9 12.5-23.7 11.8-.1-.9-.2-1.9-.2-2.9 0-7.4 3.2-15.3 8.9-21.8 2.8-3.3 6.4-6 10.8-8.1 4.4-2.1 8.5-3.3 12.4-3.5.1 1 .2 2 .2 3z"/></svg>';
  const FAVS = [
    { name: 'Google', url: 'https://www.google.com', c: '#4285f4', l: 'G' },
    { name: 'Apple', url: 'https://www.apple.com', c: '#1d1d1f', l: '' },
    { name: 'YouTube', url: 'https://www.youtube.com', c: '#ff0033', l: '▶' },
    { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', c: '#6b6b70', l: 'W' },
    { name: 'Maps', url: 'https://www.openstreetmap.org/#map=14/37.8199/-122.4783', frameUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=-122.52,37.79,-122.45,37.84&layer=mapnik', c: '#7ebc6f', l: 'M' },
    { name: 'GitHub', url: 'https://github.com', c: '#24292f', l: 'G' },
    { name: 'MDN', url: 'https://developer.mozilla.org', c: '#1b1b1b', l: 'M' },
    { name: 'News', url: 'https://news.ycombinator.com', c: '#ff6600', l: 'Y' },
  ];

  /* Cloud browser: a real Chromium streamed from Hyperbeam through /api/browser.
     Falls back to an iframe when the API isn't deployed or isn't configured. */
  const HB_SDK = 'https://cdn.jsdelivr.net/npm/@hyperbeam/web@0.0.38/dist/index.js';
  const CLOUD = {
    status: null,
    // mode: 'cloud' (API ready), 'basic' (no API on this host), or 'error' (API exists but failed; retried next time)
    check() {
      if (this.status) return this.status;
      if (!location.protocol.startsWith('http')) return (this.status = Promise.resolve({ mode: 'basic' }));
      const p = fetch('api/browser', { cache: 'no-store' })
        .then(async (r) => {
          if (r.status === 404) return { mode: 'basic' };
          if (!r.ok) throw new Error(`The browser service returned ${r.status}.`);
          const d = await r.json();
          return { mode: d.available ? 'cloud' : 'basic', needsCode: d.needsCode };
        })
        .catch((e) => ({ mode: 'error', error: e instanceof TypeError ? 'The browser service could not be reached. Check your internet connection and try again.' : e.message }));
      this.status = p;
      // Only a definite answer is remembered; errors are retried on the next navigation.
      p.then((st) => { if (st.mode === 'error') this.status = null; });
      return p;
    },
    code: () => store.get('browserCode', ''),
    headers() { const c = this.code(); return { 'Content-Type': 'application/json', ...(c ? { 'X-Access-Code': c } : {}) }; },
    end(id) {
      if (!id) return;
      fetch('api/browser?id=' + encodeURIComponent(id), { method: 'DELETE', headers: this.headers(), keepalive: true }).catch(() => {});
    },
  };

  register({
    id: 'safari', name: 'Safari', icon: AI.safari, category: 'Productivity',
    open(url) {
      return WM.createWindow({
        app: 'safari', title: 'Start Page', width: 1000, height: 640, minWidth: 480,
        render(body, win) {
          win.titlebar.querySelector('.title').remove();
          win.titlebar.insertAdjacentHTML('beforeend', `
            <button class="tb-btn" data-a="sb" aria-label="Sidebar">${UI.sidebar}</button>
            <div class="tb-group"><button class="tb-btn" data-a="back" aria-label="Back">${UI.back}</button><button class="tb-btn" data-a="fwd" aria-label="Forward">${UI.fwd}</button></div>
            <label class="url-field"><span class="url-icon">${UI.search}</span><input id="safari-url-${win.id}" placeholder="Search or enter website name" aria-label="Address" spellcheck="false"></label>
            <button class="tb-btn" data-a="reload" aria-label="Reload">${UI.reload}</button>
            <button class="tb-btn" data-a="share" aria-label="Share">${UI.share}</button>
            <button class="tb-btn" data-a="home" aria-label="Start page">${UI.tabs}</button>`);
          body.innerHTML = `<div class="safari-view">
            <div class="start-page">
              <h3>Favorites</h3>
              <div class="favs">${FAVS.map((f, i) => `<a class="fav" href="${f.url}" data-i="${i}"><div class="tile" style="background:${f.c}">${f.l || APPLE_GLYPH}</div>${f.name}</a>`).join('')}</div>
              <h3>Privacy Report</h3>
              <div class="privacy">In the last seven days, Safari has prevented <b>47 trackers</b> from profiling you and hidden your IP address from known trackers.</div>
              <p class="cloud-hint"></p>
            </div>
            <iframe hidden title="Web page" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
            <div class="blocked-note" hidden>Page not showing? Many sites refuse to load inside another page. <a target="_blank" rel="noopener">Open in a new tab ↗</a></div>
            <div class="cloud-view" hidden><div class="cloud-screen"></div></div>
            <div class="cloud-overlay" hidden></div>
          </div>`;
          const input = win.titlebar.querySelector('input');
          const urlIcon = win.titlebar.querySelector('.url-icon');
          const frame = body.querySelector('iframe'), start = body.querySelector('.start-page'), note = body.querySelector('.blocked-note');
          const cloudView = body.querySelector('.cloud-view'), screen = body.querySelector('.cloud-screen'), overlay = body.querySelector('.cloud-overlay');
          const hist = [], fwd = [];
          let current = null, cloudOn = false, hb = null, session = null, starting = null, pending = null, closed = false;

          const setAddress = (u) => {
            input.value = u ? u.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
            try { win.setTitle(u ? new URL(u).hostname.replace(/^www\./, '') : 'Start Page'); } catch { win.setTitle(u || 'Start Page'); }
          };
          const showOverlay = (html) => { overlay.innerHTML = html; overlay.hidden = !html; };
          const showStart = () => {
            start.hidden = false; frame.hidden = true; frame.src = 'about:blank'; note.hidden = true; cloudView.hidden = true; showOverlay('');
            current = null; setAddress('');
          };

          /* ---- iframe mode ---- */
          const showFrame = (u, push = true) => {
            if (push && current !== undefined) { hist.push(current); fwd.length = 0; }
            current = u;
            if (!u) return showStart();
            start.hidden = true; frame.hidden = false; frame.src = u; note.hidden = false;
            note.querySelector('a').href = u;
            setAddress(u);
          };

          /* ---- cloud mode ---- */
          const askCode = (msg) => new Promise((resolve) => {
            showOverlay(`<form class="cloud-card"><b>Cloud browser locked</b><p>${esc(msg)}</p>
              <input id="safari-code-${win.id}" type="password" placeholder="Access code" aria-label="Access code" autocomplete="off">
              <div class="cloud-actions"><button type="button" data-x="cancel">Use basic mode</button><button type="submit" class="primary">Unlock</button></div></form>`);
            const form = overlay.querySelector('form');
            form.querySelector('input').focus();
            form.addEventListener('submit', (e) => { e.preventDefault(); store.set('browserCode', form.querySelector('input').value.trim()); resolve(true); });
            form.querySelector('[data-x=cancel]').addEventListener('click', () => resolve(false));
          });

          const fail = (msg, u) => {
            showOverlay(`<div class="cloud-card"><b>Couldn’t start the cloud browser</b><p>${esc(msg)}</p>
              <div class="cloud-actions"><button type="button" data-x="basic">Use basic mode</button><button type="button" class="primary" data-x="retry">Try again</button></div></div>`);
            overlay.querySelector('[data-x=retry]').addEventListener('click', () => { starting = null; showOverlay(''); go(u); });
            overlay.querySelector('[data-x=basic]').addEventListener('click', () => { cloudOn = false; urlIcon.innerHTML = UI.search; cloudView.hidden = true; showOverlay(''); showFrame(u); });
          };

          const startCloud = (u) => starting || (starting = (async () => {
            start.hidden = true; cloudView.hidden = false; setAddress(u);
            showOverlay('<div class="cloud-card"><div class="spinner"></div><p>Starting a secure cloud browser…</p></div>');
            try {
              let r, data;
              for (;;) {
                r = await fetch('api/browser', {
                  method: 'POST', headers: CLOUD.headers(),
                  body: JSON.stringify({ url: u, dark: OS().isDark(), width: screen.clientWidth, height: screen.clientHeight }),
                });
                data = await r.json().catch(() => ({}));
                if (r.status === 401 && data.needsCode) {
                  if (!(await askCode(CLOUD.code() ? 'That code didn’t work. Try again.' : 'Enter the access code to use the cloud browser.'))) { fail('No access code entered.', u); starting = null; return; }
                  showOverlay('<div class="cloud-card"><div class="spinner"></div><p>Starting a secure cloud browser…</p></div>');
                  continue;
                }
                break;
              }
              if (!r.ok) throw new Error(data.error || `The server returned ${r.status}.`);
              if (closed) { CLOUD.end(data.session_id); return; }
              session = data;
              const { default: Hyperbeam } = await import(HB_SDK);
              hb = await Hyperbeam(screen, data.embed_url, {
                adminToken: data.admin_token,
                volume: (OS().settings.volume ?? 60) / 100,
                onConnectionStateChange: (e) => {
                  if (e.state === 'reconnecting') showOverlay('<div class="cloud-card"><div class="spinner"></div><p>Reconnecting…</p></div>');
                  else if (e.state === 'playing') showOverlay('');
                  else if (e.state === 'failed') {
                    try { hb?.destroy(); } catch { /* already gone */ }
                    CLOUD.end(session?.session_id);
                    hb = null; session = null; starting = null;
                    fail('The connection to the cloud browser failed. Check your internet connection or any ad blocker, then try again.', current || u);
                  }
                },
                onCloseWarning: (e) => OS().notify({ app: 'safari', title: 'Browser session ending soon', body: e.type === 'inactive' ? 'Your cloud browser will close in a minute because it has been idle.' : 'Your cloud browser has reached its time limit and will close in a minute.' }),
                onDisconnect: (e) => {
                  if (closed || e.type === 'request') return;
                  hb = null; session = null; starting = null;
                  showOverlay(`<div class="cloud-card"><b>Session ended</b><p>${e.type === 'inactive' ? 'The cloud browser closed after being idle.' : e.type === 'absolute' ? 'The cloud browser reached its time limit.' : 'The connection to the cloud browser was lost.'}</p>
                    <div class="cloud-actions"><button type="button" class="primary" data-x="new">Start a new session</button></div></div>`);
                  overlay.querySelector('[data-x=new]').addEventListener('click', () => startCloud(current || 'https://www.google.com'));
                },
              });
              hb.tabs.onUpdated.addListener((tabId, info, tab) => {
                if (tab && tab.active === false) return;
                const u2 = info.url || tab?.url;
                if (u2 && !u2.startsWith('chrome')) { current = u2; setAddress(u2); }
                if (tab?.title) win.setTitle(tab.title);
              });
              showOverlay('');
              if (pending && pending !== u) { hb.tabs.update({ url: pending }); }
              pending = null;
            } catch (err) {
              starting = null;
              fail(err.message || 'Something went wrong.', u);
            }
          })());

          let resizeTimer;
          new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
              if (!hb || cloudView.hidden) return;
              let w = screen.clientWidth, h = screen.clientHeight;
              const k = hb.maxArea && w * h > hb.maxArea ? Math.sqrt(hb.maxArea / (w * h)) : 1;
              w = Math.floor((w * k) / 2) * 2; h = Math.floor((h * k) / 2) * 2;
              if (w > 200 && h > 150) hb.resize(w, h).catch(() => {});
            }, 500);
          }).observe(screen);

          const go = async (u) => {
            if (!u) return showStart();
            const st = await CLOUD.check();
            if (st.mode === 'error') { start.hidden = true; cloudView.hidden = false; setAddress(u); current = u; return fail(st.error, u); }
            if (st.mode !== 'cloud') return showFrame(u);
            cloudOn = true; urlIcon.innerHTML = UI.cloud;
            start.hidden = true; frame.hidden = true; note.hidden = true; cloudView.hidden = false;
            current = u; setAddress(u);
            if (hb) { hb.tabs.update({ url: u }); return; }
            if (starting) { pending = u; return; }
            startCloud(u);
          };
          const navigate = async (text) => {
            text = text.trim(); if (!text) return;
            const st = await CLOUD.check();
            let u;
            if (/^https?:\/\//i.test(text)) u = text;
            else if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(text)) u = 'https://' + text;
            else u = st.mode !== 'basic' ? 'https://www.google.com/search?q=' + encodeURIComponent(text) : 'https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(text);
            go(u);
          };

          body.querySelectorAll('.fav').forEach((a) => a.addEventListener('click', async (e) => {
            e.preventDefault();
            const f = FAVS[+a.dataset.i];
            const st = await CLOUD.check();
            go(st.mode !== 'basic' ? f.url : (f.frameUrl || f.url));
          }));
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { navigate(input.value); input.blur(); } });
          input.addEventListener('focus', () => input.select());
          const tb = (a, fn) => win.titlebar.querySelector(`[data-a=${a}]`).addEventListener('click', fn);
          tb('back', () => { if (cloudOn && hb) return hb.tabs.goBack(); if (hist.length) { fwd.push(current); showFrame(hist.pop(), false); } });
          tb('fwd', () => { if (cloudOn && hb) return hb.tabs.goForward(); if (fwd.length) { hist.push(current); showFrame(fwd.pop(), false); } });
          tb('reload', () => { if (cloudOn && hb) return hb.tabs.reload(); if (current) frame.src = current; });
          tb('home', () => { if (cloudOn && !cloudView.hidden) { cloudView.hidden = true; showOverlay(''); start.hidden = false; setAddress(''); return; } showStart(); });
          tb('sb', () => OS().notify({ app: 'safari', title: 'Reading List', body: 'Your Reading List is empty.' }));
          tb('share', () => {
            if (!current) return;
            navigator.clipboard?.writeText(current).then(() => OS().notify({ app: 'safari', title: 'Link Copied', body: current }), () => {});
          });

          const endSession = () => { closed = true; try { hb?.destroy(); } catch { /* already gone */ } CLOUD.end(session?.session_id); hb = null; session = null; };
          window.addEventListener('pagehide', endSession);
          win.onClose = () => { window.removeEventListener('pagehide', endSession); endSession(); };
          win.data.focusUrl = () => input.focus();

          CLOUD.check().then((st) => {
            body.querySelector('.cloud-hint').textContent = st.mode !== 'basic'
              ? 'Safari runs a real Chrome browser in the cloud, so every website works. Sessions close automatically when idle.'
              : 'Basic mode: some websites refuse to load inside this page. Deploy with a Hyperbeam API key to enable the full cloud browser.';
          });
          current = undefined;
          if (!url) showStart(); else if (/^https?:\/\//i.test(url)) go(url); else navigate(url);
        },
      });
    },
    menus: (win) => ({
      File: [
        { label: 'New Window', sc: '⌘N', action: () => APPS.safari.open() },
        { label: 'Open Location…', sc: '⌘L', action: () => win?.data.focusUrl?.(), disabled: !win },
        { sep: true },
        { label: 'Close Window', sc: '⌘W', action: () => win && WM.close(win), disabled: !win },
      ],
      Bookmarks: FAVS.map((f) => ({ label: f.name, action: () => APPS.safari.open(f.url) })),
    }),
  });

  /* =================================================================
     Notes
     ================================================================= */
  const seedNotes = () => [
    { id: 1, text: 'Golden Gate trip 🌉\nWalk the bridge at sunrise\nCrissy Field picnic\nFort Point photos', t: Date.now() - 3600e3 },
    { id: 2, text: 'Groceries\n- Sourdough\n- Coffee beans\n- Avocados\n- Oat milk', t: Date.now() - 86400e3 },
    { id: 3, text: 'Liquid Glass notes\nTransparency slider lives in Control Center and in System Settings → Appearance.', t: Date.now() - 3 * 86400e3 },
  ];
  register({
    id: 'notes', name: 'Notes', icon: AI.notes, category: 'Productivity',
    open() {
      return single('notes', () => WM.createWindow({
        app: 'notes', title: 'Notes', width: 780, height: 480, sidebar: true, sidebarWidth: 250, minWidth: 520,
        render(body, win) {
          let notes = store.get('notes', null) || seedNotes();
          let cur = notes[0]?.id, q = '';
          body.innerHTML = `
            <aside class="app-sidebar" style="padding-top:56px">
              <label class="search-field" style="width:100%;margin-bottom:8px">${UI.search}<input id="notes-search" placeholder="Search" aria-label="Search notes"></label>
              <div class="sb-section">iCloud</div><div class="note-list"></div>
            </aside>
            <section class="app-main">
              <div class="toolbar" data-drag><h2></h2>
                <button class="tb-btn" data-a="del" aria-label="Delete note">${UI.trash}</button>
                <button class="tb-btn" data-a="new" aria-label="New note">${UI.compose}</button></div>
              <textarea class="note-editor" id="notes-editor" aria-label="Note text"></textarea>
            </section>`;
          const list = body.querySelector('.note-list'), ed = body.querySelector('textarea'), h2 = body.querySelector('h2');
          const save = () => store.set('notes', notes);
          const fmt = (t) => { const d = new Date(t); return (Date.now() - t < 86400e3) ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(); };
          const renderList = () => {
            const shown = notes.filter((n) => n.text.toLowerCase().includes(q)).sort((a, b) => b.t - a.t);
            list.innerHTML = shown.map((n) => {
              const [first, ...rest] = n.text.split('\n');
              return `<div class="note-row${n.id === cur ? ' active' : ''}" data-id="${n.id}"><b>${esc(first || 'New Note')}</b><small>${fmt(n.t)}  ${esc(rest.join(' ').slice(0, 60) || 'No additional text')}</small></div>`;
            }).join('') || '<div class="empty">No notes</div>';
            list.querySelectorAll('.note-row').forEach((r) => r.addEventListener('click', () => { cur = +r.dataset.id; renderList(); load(); }));
            h2.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
          };
          const load = () => { const n = notes.find((x) => x.id === cur); ed.value = n ? n.text : ''; ed.disabled = !n; };
          ed.addEventListener('input', () => { const n = notes.find((x) => x.id === cur); if (!n) return; n.text = ed.value; n.t = Date.now(); save(); renderList(); });
          const add = () => { const n = { id: Date.now(), text: '', t: Date.now() }; notes.unshift(n); cur = n.id; save(); renderList(); load(); ed.focus(); };
          body.querySelector('[data-a=new]').addEventListener('click', add);
          body.querySelector('[data-a=del]').addEventListener('click', () => { notes = notes.filter((n) => n.id !== cur); cur = notes[0]?.id; save(); renderList(); load(); });
          body.querySelector('#notes-search').addEventListener('input', (e) => { q = e.target.value.toLowerCase(); renderList(); });
          win.data.add = add;
          renderList(); load();
        },
      }));
    },
    menus: (win) => ({ File: [{ label: 'New Note', sc: '⌘N', action: () => { APPS.notes.open(); WM.byApp('notes')[0]?.data.add(); } }, { sep: true }, { label: 'Close', sc: '⌘W', action: () => win && WM.close(win), disabled: !win }] }),
  });

  /* =================================================================
     Terminal
     ================================================================= */
  const NEOFETCH_LOGO = [
    '                    c.\'', '                 ,xNMM.', '               .OMMMMo', '               lMMM"', '     .;loddo:.  .olloddol;.', '   cKMMMMMMMMMMNWMMMMMMMMMM0:', ' .KMMMMMMMMMMMMMMMMMMMMMMMWd.', ' XMMMMMMMMMMMMMMMMMMMMMMMX.', ';MMMMMMMMMMMMMMMMMMMMMMMM:', ':MMMMMMMMMMMMMMMMMMMMMMMM:', '.MMMMMMMMMMMMMMMMMMMMMMMMX.', ' kMMMMMMMMMMMMMMMMMMMMMMMMWd.', ' .XMMMMMMMMMMMMMMMMMMMMMMMMMMk', '  .XMMMMMMMMMMMMMMMMMMMMMMMMK.', '    kMMMMMMMMMMMMMMMMMMMMMMd', '     ;KMMMMMMMWXXWMMMMMMMk.', '       .cooc,.    .,coo:.',
  ];
  register({
    id: 'terminal', name: 'Terminal', icon: AI.terminal, category: 'Developer Tools',
    open() {
      return WM.createWindow({
        app: 'terminal', title: 'guest — -zsh — 80×24', width: 660, height: 400, className: 'term-win',
        render(body, win) {
          body.innerHTML = `<div class="term" tabindex="0"></div>`;
          const term = body.querySelector('.term');
          let cwd = VFS.HOME;
          const hist = []; let hi = 0;
          const short = () => cwd === VFS.HOME ? '~' : cwd.startsWith(VFS.HOME + '/') ? '~' + cwd.slice(VFS.HOME.length) : cwd;
          const print = (html) => { const d = document.createElement('div'); d.innerHTML = html; term.insertBefore(d, line); };
          const line = el(`<div class="term-line"><span class="prompt"></span><input spellcheck="false" autocomplete="off" aria-label="Command"></div>`);
          const input = line.querySelector('input');
          const setPrompt = () => { line.querySelector('.prompt').innerHTML = `<span class="p">guest@MacBook-Pro</span> <span class="d">${esc(short())}</span> %`; };
          term.appendChild(line);
          print(`Last login: ${new Date(Date.now() - 7200e3).toString().slice(0, 24)} on ttys000`);
          setPrompt();

          const cmds = {
            help: () => 'Commands: ls, cd, pwd, cat, echo, mkdir, touch, rm, open, clear, date, whoami, uname, sw_vers, neofetch, history, say, exit',
            pwd: () => cwd,
            whoami: () => 'guest',
            date: () => new Date().toString(),
            uname: (a) => a[0] === '-a' ? 'Darwin MacBook-Pro.local 27.0.0 Darwin Kernel Version 27.0.0 arm64' : 'Darwin',
            sw_vers: () => 'ProductName:\t\tmacOS\nProductVersion:\t\t27.0\nBuildVersion:\t\t27A5328a',
            ls: (a) => {
              const all = a.includes('-a'); const target = a.find((x) => !x.startsWith('-')) || cwd;
              const l = VFS.list(VFS.norm(target, cwd));
              if (!l) return `<span class="e">ls: ${esc(target)}: No such file or directory</span>`;
              return (all ? ['.', '..'] : []).concat(l.map((i) => i.type === 'dir' ? `<span class="d">${esc(i.name)}</span>` : esc(i.name))).join('    ');
            },
            cd: (a) => {
              const p = VFS.norm(a[0] || '~', cwd); const n = VFS.get(p);
              if (!n) return `<span class="e">cd: no such file or directory: ${esc(a[0])}</span>`;
              if (n.type !== 'dir') return `<span class="e">cd: not a directory: ${esc(a[0])}</span>`;
              cwd = p; setPrompt(); return '';
            },
            cat: (a) => {
              if (!a[0]) return '';
              const n = VFS.get(VFS.norm(a[0], cwd));
              if (!n) return `<span class="e">cat: ${esc(a[0])}: No such file or directory</span>`;
              if (n.type === 'dir') return `<span class="e">cat: ${esc(a[0])}: Is a directory</span>`;
              return esc(n.content);
            },
            mkdir: (a) => { a.forEach((d) => VFS.create(VFS.norm(d, cwd), 'dir')); return ''; },
            touch: (a) => { a.forEach((f) => VFS.get(VFS.norm(f, cwd)) || VFS.create(VFS.norm(f, cwd), 'file')); return ''; },
            rm: (a) => { const t = a.filter((x) => !x.startsWith('-')); return t.map((f) => VFS.remove(VFS.norm(f, cwd)) ? '' : `<span class="e">rm: ${esc(f)}: No such file or directory</span>`).filter(Boolean).join('\n'); },
            echo: (a) => esc(a.join(' ')),
            clear: () => { term.querySelectorAll(':scope > div:not(.term-line)').forEach((d) => d.remove()); return null; },
            history: () => hist.map((h, i) => `  ${i + 1}  ${esc(h)}`).join('\n'),
            open: (a) => {
              const t = a[0]; if (!t) return 'usage: open <app | file>';
              const byName = Object.values(APPS).find((x) => x.name.toLowerCase() === t.replace(/^-a$/, a[1] || '').toLowerCase() || x.id === t.toLowerCase());
              if (a[0] === '-a' && a[1]) { const app = Object.values(APPS).find((x) => x.name.toLowerCase() === a.slice(1).join(' ').toLowerCase()); if (app) { app.open(); return ''; } return `<span class="e">Unable to find application named '${esc(a.slice(1).join(' '))}'</span>`; }
              if (t === '.') { APPS.finder.open(cwd); return ''; }
              const p = VFS.norm(t, cwd);
              if (VFS.get(p)) { openPath(p); return ''; }
              if (byName) { byName.open(); return ''; }
              return `<span class="e">The file ${esc(p)} does not exist.</span>`;
            },
            say: (a) => { try { speechSynthesis.speak(new SpeechSynthesisUtterance(a.join(' '))); } catch { /* unsupported */ } return ''; },
            sudo: () => '<span class="e">guest is not in the sudoers file. This incident will be reported.</span>',
            exit: () => { setTimeout(() => WM.close(win), 50); return '[Process completed]'; },
            neofetch: () => {
              const info = ['<span class="p">guest</span>@<span class="p">MacBook-Pro</span>', '-------------------', '<b>OS</b>: macOS Golden Gate 27.0 arm64', '<b>Host</b>: MacBook Pro (14-inch, M5)', '<b>Kernel</b>: Darwin 27.0.0', `<b>Uptime</b>: ${Math.round(performance.now() / 60000)} mins`, '<b>Shell</b>: zsh 5.9', `<b>Resolution</b>: ${screen.width}x${screen.height}`, '<b>DE</b>: Aqua', '<b>WM</b>: Quartz Compositor', '<b>Theme</b>: Liquid Glass', '<b>Terminal</b>: Terminal.app', '<b>CPU</b>: Apple M5 (10)', '<b>Memory</b>: 6144MiB / 24576MiB'];
              const colors = ['#34c759', '#ffd60a', '#ff9f0a', '#ff453a', '#bf5af2', '#0a84ff'];
              return NEOFETCH_LOGO.map((l, i) => `<span style="color:${colors[Math.floor(i / 3) % 6]}">${esc(l.padEnd(32))}</span>${info[i] || ''}`).join('\n');
            },
          };
          const run = (raw) => {
            print(`${line.querySelector('.prompt').innerHTML} ${esc(raw)}`);
            if (!raw.trim()) return;
            hist.push(raw); hi = hist.length;
            let redirect = null, cmdline = raw;
            const m = raw.match(/^(.*?)\s*>\s*(\S+)\s*$/);
            if (m) { cmdline = m[1]; redirect = m[2]; }
            const [cmd, ...args] = cmdline.trim().split(/\s+/);
            const fn = cmds[cmd];
            if (!fn) return print(`<span class="e">zsh: command not found: ${esc(cmd)}</span>`);
            const out = fn(args.map((a) => a.replace(/^["']|["']$/g, '')));
            if (redirect && out != null) { VFS.write(VFS.norm(redirect, cwd), el(`<div>${out}</div>`).textContent + '\n'); return; }
            if (out) print(out);
          };
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { const v = input.value; input.value = ''; run(v); term.scrollTop = term.scrollHeight; }
            else if (e.key === 'ArrowUp') { if (hi > 0) input.value = hist[--hi]; e.preventDefault(); }
            else if (e.key === 'ArrowDown') { if (hi < hist.length) input.value = hist[++hi] || ''; e.preventDefault(); }
            else if (e.key === 'Tab') {
              e.preventDefault();
              const parts = input.value.split(' '); const last = parts.pop();
              const base = last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : '';
              const l = VFS.list(VFS.norm(base || '.', cwd)) || [];
              const hit = l.filter((i) => i.name.startsWith(last.slice(base.length)));
              if (hit.length === 1) { parts.push(base + hit[0].name + (hit[0].type === 'dir' ? '/' : '')); input.value = parts.join(' '); }
            } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); cmds.clear(); }
          });
          term.addEventListener('click', () => { if (!getSelection().toString()) input.focus(); });
          setTimeout(() => input.focus(), 50);
        },
      });
    },
    menus: (win) => ({ Shell: [{ label: 'New Window', sc: '⌘N', action: () => APPS.terminal.open() }, { sep: true }, { label: 'Close Window', sc: '⌘W', action: () => win && WM.close(win), disabled: !win }] }),
  });

  /* =================================================================
     Calculator
     ================================================================= */
  register({
    id: 'calculator', name: 'Calculator', icon: AI.calculator, category: 'Utilities',
    open() {
      return single('calculator', () => WM.createWindow({
        app: 'calculator', title: '', width: 250, height: 410, resizable: false, className: 'calc-win',
        render(body, win) {
          const keys = [['AC', 'fn', 'clear'], ['+/−', 'fn', 'neg'], ['%', 'fn', 'pct'], ['÷', 'op', '/'], ['7'], ['8'], ['9'], ['×', 'op', '*'], ['4'], ['5'], ['6'], ['−', 'op', '-'], ['1'], ['2'], ['3'], ['+', 'op', '+'], ['0', 'zero'], ['.'], ['=', 'op', '=']];
          body.innerHTML = `<div class="calc"><div class="calc-display" data-drag><div class="expr"></div><div class="val">0</div></div>
            <div class="calc-keys">${keys.map(([l, c = '', v = l]) => `<button class="${c}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
          const val = body.querySelector('.val'), expr = body.querySelector('.expr');
          let cur = '0', prev = null, op = null, fresh = false;
          const sym = { '/': '÷', '*': '×', '-': '−', '+': '+' };
          const fmt = (n) => {
            if (!isFinite(n)) return 'Error';
            const s = Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-8 && n !== 0) ? n.toExponential(6) : String(+n.toPrecision(12));
            return s.replace(/\B(?=(\d{3})+(?!\d))/g, (m, i, str) => (str.indexOf('.') === -1 || i < str.indexOf('.')) ? ',' : '');
          };
          const compute = () => {
            const a = parseFloat(prev), b = parseFloat(cur);
            return op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : b;
          };
          const show = () => {
            val.textContent = cur.endsWith('.') ? fmt(parseFloat(cur)) + '.' : cur.includes('.') && !fresh ? cur : fmt(parseFloat(cur));
            val.style.fontSize = val.textContent.length > 9 ? '32px' : '';
            expr.textContent = op && prev != null ? `${fmt(parseFloat(prev))} ${sym[op]}` : '';
            body.querySelector('[data-v=clear]').textContent = cur !== '0' && !fresh ? 'C' : 'AC';
            body.querySelectorAll('.op').forEach((b) => b.classList.toggle('on', fresh && b.dataset.v === op));
          };
          const press = (v) => {
            if (/^\d$/.test(v)) { cur = fresh || cur === '0' ? v : (cur.replace('-', '').replace('.', '').length < 9 ? cur + v : cur); fresh = false; }
            else if (v === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (!cur.includes('.')) cur += '.'; }
            else if (v === 'clear') { if (cur !== '0' && !fresh) cur = '0'; else { cur = '0'; prev = null; op = null; } fresh = false; }
            else if (v === 'neg') cur = cur.startsWith('-') ? cur.slice(1) : cur === '0' ? cur : '-' + cur;
            else if (v === 'pct') cur = String(parseFloat(cur) / 100);
            else if (v === '=') { if (op) { cur = String(compute()); prev = null; op = null; fresh = true; } }
            else { if (op && !fresh) cur = String(compute()); prev = cur; op = v; fresh = true; }
            show();
          };
          body.querySelectorAll('.calc-keys button').forEach((b) => b.addEventListener('click', () => press(b.dataset.v)));
          const onKey = (e) => {
            if (WM.active !== win) return;
            const map = { Enter: '=', '=': '=', Escape: 'clear', Backspace: 'back', '%': 'pct', x: '*', X: '*' };
            let k = map[e.key] || e.key;
            if (k === 'back') { cur = cur.length > 1 && !fresh ? cur.slice(0, -1) : '0'; show(); return; }
            if (/^[\d.+\-*/=]$/.test(k) || k === 'clear' || k === 'pct') { e.preventDefault(); press(k); }
          };
          document.addEventListener('keydown', onKey);
          win.onClose = () => document.removeEventListener('keydown', onKey);
          show();
        },
      }));
    },
  });

  /* =================================================================
     TextEdit
     ================================================================= */
  register({
    id: 'textedit', name: 'TextEdit', icon: AI.textedit, category: 'Productivity',
    open(path) {
      if (!path) {
        const dir = VFS.norm('~/Documents');
        path = dir + '/' + VFS.uniqueName(dir, 'Untitled', '.txt');
        VFS.create(path, 'file');
      }
      const existing = WM.byApp('textedit').find((w) => w.data.path === path);
      if (existing) { existing.minimized ? WM.restore(existing) : WM.focus(existing); return existing; }
      return WM.createWindow({
        app: 'textedit', title: path.split('/').pop(), width: 620, height: 460,
        render(body, win) {
          win.data.path = path;
          body.innerHTML = `<textarea class="textedit" spellcheck="true" aria-label="Document"></textarea>`;
          const ta = body.querySelector('textarea');
          ta.value = VFS.get(path)?.content || '';
          let t;
          ta.addEventListener('input', () => {
            win.setTitle(path.split('/').pop() + ' — Edited');
            clearTimeout(t);
            t = setTimeout(() => { VFS.write(path, ta.value); win.setTitle(path.split('/').pop()); }, 600);
          });
          win.onClose = () => { clearTimeout(t); VFS.write(path, ta.value); };
          setTimeout(() => ta.focus(), 50);
        },
      });
    },
    menus: (win) => ({ File: [{ label: 'New', sc: '⌘N', action: () => APPS.textedit.open() }, { label: 'Open…', sc: '⌘O', action: () => APPS.finder.open('~/Documents') }, { sep: true }, { label: 'Close', sc: '⌘W', action: () => win && WM.close(win), disabled: !win }] }),
  });

  /* =================================================================
     System Settings
     ================================================================= */
  const ACCENTS = [['Blue', '#0a84ff'], ['Purple', '#bf5af2'], ['Pink', '#ff375f'], ['Red', '#ff453a'], ['Orange', '#ff9f0a'], ['Yellow', '#ffcc00'], ['Green', '#30d158'], ['Graphite', '#8e8e93']];
  const PANES = [
    { id: 'account', label: 'Guest User', sub: 'Apple Account', icon: 'person', c: '#8e8e93' },
    { sep: true },
    { id: 'wifi', label: 'Wi-Fi', icon: 'wifi', c: '#0a84ff' },
    { id: 'bluetooth', label: 'Bluetooth', icon: 'bluetooth', c: '#0a84ff' },
    { id: 'battery', label: 'Battery', icon: 'battery2', c: '#30d158' },
    { sep: true },
    { id: 'general', label: 'General', icon: 'gear', c: '#8e8e93' },
    { id: 'appearance', label: 'Appearance', icon: 'appearance', c: '#1d1d1f' },
    { id: 'cc', label: 'Control Center', icon: 'cc', c: '#8e8e93' },
    { id: 'dock', label: 'Desktop & Dock', icon: 'dock', c: '#1d1d1f' },
    { id: 'wallpaper', label: 'Wallpaper', icon: 'wallpaper', c: '#32ade6' },
    { id: 'notifications', label: 'Notifications', icon: 'bell', c: '#ff453a' },
    { id: 'privacy', label: 'Privacy & Security', icon: 'shield', c: '#0a84ff' },
  ];

  function renderPane(id, root) {
    const S = OS().settings;
    const sw = (key, label, sub = '') => `<div class="set-row"><label>${label}${sub ? `<small>${sub}</small>` : ''}</label><button class="switch${S[key] ? ' on' : ''}" data-toggle="${key}" role="switch" aria-checked="${!!S[key]}" aria-label="${label}"></button></div>`;
    const slider = (key, label, min, max, step, sub = '') => `<div class="set-row"><label>${label}${sub ? `<small>${sub}</small>` : ''}</label><div class="ctl" style="width:220px"><input type="range" class="slider thin" id="set-${key}" data-range="${key}" min="${min}" max="${max}" step="${step}" value="${S[key]}"></div></div>`;
    let h = '';
    switch (id) {
      case 'account': h = `<h3>Guest User</h3><div class="set-group"><div class="set-row"><label>Apple Account<small>guest@icloud.com</small></label></div><div class="set-row"><label>iCloud<small>5 GB · 1.2 GB used</small></label></div><div class="set-row"><label>Family<small>Set up Family Sharing</small></label></div></div>`; break;
      case 'wifi': h = `<h3>Wi-Fi</h3><div class="set-group">${sw('wifi', 'Wi-Fi')}${S.wifi ? '<div class="set-row"><label>Golden Gate 5G<small>Connected · Secure network</small></label><span>✓</span></div>' : ''}</div>
        ${S.wifi ? '<div class="sb-section">Other Networks</div><div class="set-group"><div class="set-row"><label>Presidio Guest</label></div><div class="set-row"><label>Crissy Field Café</label></div><div class="set-row"><label>SFO Free Wi-Fi</label></div></div>' : ''}`; break;
      case 'bluetooth': h = `<h3>Bluetooth</h3><div class="set-group">${sw('bluetooth', 'Bluetooth', 'This Mac is discoverable as "MacBook Pro" while Bluetooth settings are open.')}</div>
        ${S.bluetooth ? '<div class="sb-section">My Devices</div><div class="set-group"><div class="set-row"><label>AirPods Pro<small>Not Connected</small></label></div><div class="set-row"><label>Magic Keyboard<small>Connected · 84%</small></label></div><div class="set-row"><label>Magic Trackpad<small>Connected · 62%</small></label></div></div>' : ''}`; break;
      case 'battery': h = `<h3>Battery</h3><div class="set-group"><div class="set-row"><label>Battery Level<small>Last charged to 100% today</small></label><b>${S.batteryLevel}%</b></div><div class="set-row"><label>Battery Health<small>Normal</small></label></div>${sw('lowPower', 'Low Power Mode')}</div>`; break;
      case 'general': h = `<h3>About</h3><div class="set-group">
        <div class="set-row"><label>Name</label><span>MacBook Pro</span></div>
        <div class="set-row"><label>Chip</label><span>Apple M5</span></div>
        <div class="set-row"><label>Memory</label><span>24 GB</span></div>
        <div class="set-row"><label>macOS</label><span>Golden Gate 27.0</span></div>
        <div class="set-row"><label>Serial number</label><span>GG27W3B0S</span></div></div>
        <div class="set-group"><div class="set-row"><label>Reset File System<small>Restores the default Desktop, Documents and Downloads contents.</small></label><button class="tb-btn" style="background:var(--field-bg)" data-act="resetfs">Reset</button></div></div>`; break;
      case 'appearance':
        h = `<h3>Appearance</h3><div class="set-group"><div class="set-row"><label>Appearance</label><div class="seg">
          ${[['auto', 'Auto', 'linear-gradient(90deg,#f5f5f7 50%,#1e1e21 50%)'], ['light', 'Light', 'linear-gradient(#f5f5f7,#e1e1e6)'], ['dark', 'Dark', 'linear-gradient(#2c2c30,#161618)']].map(([v, l, bg]) => `<button class="seg-opt${S.appearance === v ? ' on' : ''}" data-set="appearance" data-val="${v}"><div class="thumb" style="background:${bg}"></div>${l}</button>`).join('')}
          </div></div>
          <div class="set-row"><label>Accent color</label><div class="accents">${ACCENTS.map(([n, c]) => `<button style="background:${c}" class="${S.accent === c ? 'on' : ''}" data-set="accent" data-val="${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div></div></div>
          <div class="sb-section">Liquid Glass</div>
          <div class="set-group"><div class="set-row"><label>Transparency<small>Clear lets the wallpaper shine through. Tinted is more opaque for legibility.</small></label>
            <div class="ctl" style="width:240px"><span style="font-size:11px;color:var(--text-3)">Clear</span><input type="range" class="slider thin" id="set-glass" data-range="glass" min="0" max="1" step="0.01" value="${S.glass}"><span style="font-size:11px;color:var(--text-3)">Tinted</span></div></div>
            ${sw('reduceMotion', 'Reduce motion')}</div>`; break;
      case 'cc': h = `<h3>Control Center</h3><div class="set-group">${sw('menubarBg', 'Show menu bar background', 'Tahoe and Golden Gate use a transparent menu bar by default.')}${sw('clockSeconds', 'Show seconds in the clock')}${sw('showBattery', 'Show battery in menu bar')}</div>`; break;
      case 'dock': h = `<h3>Desktop & Dock</h3><div class="set-group">${slider('dockSize', 'Size', 36, 84, 1)}${sw('magnify', 'Magnification')}${slider('magScale', 'Magnification amount', 1.1, 2.2, 0.05)}${sw('autohide', 'Automatically hide and show the Dock')}${sw('desktopIcons', 'Show items on Desktop')}</div>`; break;
      case 'wallpaper': {
        const cur = WALLPAPERS.get(S.wallpaper, OS().isDark());
        h = `<h3>Wallpaper</h3><div class="wp-hero" style="background-image:${cur.css}"></div><div><b>${cur.name}</b></div>
          <div class="sb-section">Golden Gate & Tahoe</div>
          <div class="wp-grid">${WALLPAPERS.LIST.map((w) => `<button class="wp-opt${S.wallpaper === w.id ? ' on' : ''}" data-set="wallpaper" data-val="${w.id}"><div class="thumb" style="background-image:${WALLPAPERS.get(w.id, OS().isDark()).css}"></div>${w.name}</button>`).join('')}</div>`; break;
      }
      case 'notifications': h = `<h3>Notifications</h3><div class="set-group">${sw('notifs', 'Allow notifications')}${sw('focus', 'Do Not Disturb', 'Silences notifications while enabled.')}</div>`; break;
      case 'privacy': h = `<h3>Privacy & Security</h3><div class="set-group"><div class="set-row"><label>Location Services</label><span>On</span></div><div class="set-row"><label>FileVault<small>Encryption is turned on for Macintosh HD.</small></label></div><div class="set-row"><label>Lockdown Mode</label><span>Off</span></div></div>`; break;
    }
    root.innerHTML = `<div class="set-pane">${h}</div>`;
    root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => OS().set(b.dataset.toggle, !OS().settings[b.dataset.toggle])));
    root.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => OS().set(b.dataset.set, b.dataset.val)));
    root.querySelectorAll('[data-range]').forEach((r) => {
      const paint = () => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
      paint();
      r.addEventListener('input', () => { paint(); OS().set(r.dataset.range, parseFloat(r.value), true); });
    });
    root.querySelector('[data-act=resetfs]')?.addEventListener('click', () => { VFS.reset(); OS().notify({ app: 'settings', title: 'File System Reset', body: 'Default files have been restored.' }); });
  }

  register({
    id: 'settings', name: 'System Settings', icon: AI.settings, category: 'Utilities',
    open(pane = 'appearance') {
      const existing = WM.byApp('settings')[0];
      if (existing) { existing.data.show(pane); existing.minimized ? WM.restore(existing) : WM.focus(existing); return existing; }
      return WM.createWindow({
        app: 'settings', title: 'System Settings', width: 780, height: 560, sidebar: true, sidebarWidth: 220, minWidth: 560,
        render(body, win) {
          body.innerHTML = `<aside class="app-sidebar"><label class="search-field" style="width:100%;margin-bottom:6px">${UI.search}<input id="settings-search" placeholder="Search" aria-label="Search settings"></label>
            ${PANES.map((p) => p.sep ? '<div style="height:8px"></div>' : `<div class="sb-item" data-pane="${p.id}"><span style="width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:${p.c};color:#fff;flex:none">${UI[p.icon].replace('<svg', '<svg style="width:14px;height:14px;color:#fff"')}</span><span>${p.label}${p.sub ? `<small style="display:block;color:var(--text-3);font-size:11px">${p.sub}</small>` : ''}</span></div>`).join('')}</aside>
            <section class="app-main"><div class="toolbar" data-drag><h2></h2></div><div class="scroll pane"></div></section>`;
          let cur = pane;
          const show = (p) => {
            cur = p;
            body.querySelectorAll('.sb-item').forEach((s) => s.classList.toggle('active', s.dataset.pane === p));
            body.querySelector('h2').textContent = PANES.find((x) => x.id === p)?.label || '';
            renderPane(p, body.querySelector('.pane'));
          };
          win.data.show = show;
          body.querySelectorAll('.sb-item').forEach((s) => s.addEventListener('click', () => show(s.dataset.pane)));
          body.querySelector('#settings-search').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            body.querySelectorAll('.sb-item').forEach((s) => { s.hidden = q && !s.textContent.toLowerCase().includes(q); });
          });
          const off = OS().onSettings((live) => { if (!live) show(cur); });
          win.onClose = () => off();
          show(pane);
        },
      });
    },
  });

  /* =================================================================
     About This Mac
     ================================================================= */
  register({
    id: 'about', name: 'About This Mac', icon: AI.about, hidden: true,
    open() {
      return single('about', () => WM.createWindow({
        app: 'about', title: '', width: 300, height: 470, resizable: false,
        render(body) {
          body.innerHTML = `<div class="about" data-drag>
            <svg class="mac-art" viewBox="0 0 150 100"><defs><linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dcb2"/><stop offset=".5" stop-color="#9a8cbc"/><stop offset="1" stop-color="#2d2f6a"/></linearGradient></defs>
              <rect x="22" y="6" width="106" height="72" rx="6" fill="#1d1d1f"/><rect x="26" y="10" width="98" height="64" rx="3" fill="url(#scr)"/><path d="M8 80h134l-6 8H14z" fill="#c7c7cc"/><rect x="62" y="80" width="26" height="3" rx="1.5" fill="#9a9aa0"/></svg>
            <h1>MacBook Pro</h1><div class="ver">14-inch, 2026</div>
            <dl><dt>Chip</dt><dd>Apple M5</dd><dt>Memory</dt><dd>24 GB</dd><dt>Startup disk</dt><dd>Macintosh HD</dd><dt>Serial number</dt><dd>GG27W3B0S</dd><dt>macOS</dt><dd>Golden Gate 27.0</dd></dl>
            <button class="more">More Info…</button>
            <small>™ and © 1983–2026 Apple Inc. Web recreation for learning purposes.</small></div>`;
          body.querySelector('.more').addEventListener('click', () => APPS.settings.open('general'));
        },
      }));
    },
  });

  /* =================================================================
     Photos
     ================================================================= */
  function photoSet() {
    const list = WALLPAPERS.LIST.flatMap((w) => [WALLPAPERS.get(w.id, false).css, ...(w.dark ? [WALLPAPERS.get(w.id, true).css] : [])]);
    const hues = [12, 38, 200, 280, 160, 330, 220, 55, 180, 300, 90, 250];
    hues.forEach((h, i) => list.push(`radial-gradient(circle at ${20 + i * 6}% ${30 + (i % 4) * 15}%, hsl(${h} 90% 75%), transparent 55%), linear-gradient(${i * 30}deg, hsl(${h} 70% 45%), hsl(${(h + 60) % 360} 70% 30%))`));
    return list;
  }
  register({
    id: 'photos', name: 'Photos', icon: AI.photos, category: 'Photo & Video',
    open() {
      return single('photos', () => WM.createWindow({
        app: 'photos', title: 'Photos', width: 860, height: 560, sidebar: true, sidebarWidth: 190,
        render(body) {
          const pics = photoSet();
          body.innerHTML = `<aside class="app-sidebar"><div class="sb-section">Photos</div>
              <div class="sb-item active">${UI.wallpaper}Library</div><div class="sb-item">${UI.heart}Favorites</div><div class="sb-item">${UI.recents}Recently Saved</div>
              <div class="sb-section">Collections</div><div class="sb-item">${UI.person}People & Pets</div><div class="sb-item">${UI.net}Trips</div><div class="sb-item">${UI.grid}Memories</div></aside>
            <section class="app-main" style="position:relative"><div class="toolbar" data-drag><h2>Library</h2><div class="tb-group"><button class="tb-btn">Years</button><button class="tb-btn">Months</button><button class="tb-btn" style="background:var(--hover)">All Photos</button></div></div>
              <div class="scroll"><div class="photos-head"><h2>Golden Gate</h2><small>San Francisco · ${pics.length} items</small></div><div class="photos-grid">${pics.map((p, i) => `<div class="photo" data-i="${i}" style="background-image:${p}"></div>`).join('')}</div></div>
              <div class="photo-view" hidden><div class="big"></div></div></section>`;
          const view = body.querySelector('.photo-view');
          body.querySelectorAll('.photo').forEach((p) => p.addEventListener('click', () => { view.querySelector('.big').style.backgroundImage = pics[+p.dataset.i]; view.hidden = false; }));
          view.addEventListener('click', () => { view.hidden = true; });
        },
      }));
    },
  });

  /* =================================================================
     Music — tiny WebAudio synth plays generated tracks
     ================================================================= */
  const TRACKS = [
    { name: 'Fog Over the Bay', len: 48, bpm: 84, wave: 'sine', prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] },
    { name: 'International Orange', len: 44, bpm: 108, wave: 'triangle', prog: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]] },
    { name: 'Crissy Field', len: 40, bpm: 96, wave: 'sine', prog: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]] },
    { name: 'Liquid Glass', len: 52, bpm: 72, wave: 'triangle', prog: [[64, 67, 71], [60, 64, 67], [62, 65, 69], [59, 62, 67]] },
    { name: 'Night Crossing', len: 46, bpm: 90, wave: 'sawtooth', prog: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]] },
    { name: 'Tahoe Blue', len: 42, bpm: 116, wave: 'square', prog: [[60, 63, 67], [58, 62, 65], [56, 60, 63], [55, 59, 62]] },
  ];
  const player = { ctx: null, idx: 0, playing: false, pos: 0, timer: null, nextNote: 0, step: 0, listeners: new Set() };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function note(freq, t, dur, type, vol) {
    const o = player.ctx.createOscillator(), g = player.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(player.master); o.start(t); o.stop(t + dur + .05);
  }
  function tick() {
    const tr = TRACKS[player.idx], spb = 60 / tr.bpm / 2;
    while (player.nextNote < player.ctx.currentTime + .2) {
      const bar = Math.floor(player.step / 8) % tr.prog.length, chord = tr.prog[bar], s = player.step % 8;
      const vol = tr.wave === 'sine' ? .16 : tr.wave === 'triangle' ? .13 : .045;
      if (s === 0) { chord.forEach((m) => note(mtof(m - 12), player.nextNote, spb * 8, 'sine', .06)); note(mtof(chord[0] - 24), player.nextNote, spb * 4, 'triangle', .12); }
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
      note(mtof(chord[pattern[s]] + (s % 4 === 3 ? 12 : 0)), player.nextNote, spb * 1.8, tr.wave, vol);
      player.nextNote += spb; player.step++;
    }
    player.pos = Math.min(tr.len, player.pos + .05);
    if (player.pos >= tr.len) return playTrack((player.idx + 1) % TRACKS.length);
    player.listeners.forEach((fn) => fn());
  }
  function playTrack(i) {
    if (!player.ctx) {
      player.ctx = new (window.AudioContext || window.webkitAudioContext)();
      player.master = player.ctx.createGain();
      player.master.gain.value = (OS().settings.volume ?? 60) / 100;
      player.master.connect(player.ctx.destination);
    }
    player.ctx.resume();
    if (i !== undefined && i !== player.idx) { player.idx = i; player.pos = 0; player.step = 0; }
    player.playing = true; player.nextNote = player.ctx.currentTime + .05;
    clearInterval(player.timer); player.timer = setInterval(tick, 50);
    player.listeners.forEach((fn) => fn());
  }
  function pauseTrack() { player.playing = false; clearInterval(player.timer); player.listeners.forEach((fn) => fn()); }
  window.MUSIC = { setVolume: (v) => { if (player.master) player.master.gain.value = v / 100; }, player, playTrack, pauseTrack, TRACKS };

  register({
    id: 'music', name: 'Music', icon: AI.music, category: 'Entertainment',
    open() {
      return single('music', () => WM.createWindow({
        app: 'music', title: 'Music', width: 820, height: 560, sidebar: true, sidebarWidth: 200, minWidth: 560,
        render(body, win) {
          const art = 'linear-gradient(135deg,#f6c177,#d9506f 45%,#3b2c78)';
          const t = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
          body.innerHTML = `<aside class="app-sidebar"><label class="search-field" style="width:100%">${UI.search}<input id="music-search" placeholder="Search" aria-label="Search music"></label>
              <div class="sb-section">Apple Music</div><div class="sb-item">${UI.home}Home</div><div class="sb-item">${UI.grid}New</div><div class="sb-item">${UI.net}Radio</div>
              <div class="sb-section">Library</div><div class="sb-item">${UI.recents}Recently Added</div><div class="sb-item">${UI.person}Artists</div><div class="sb-item active">${UI.library}Albums</div><div class="sb-item">${UI.list}Songs</div></aside>
            <section class="app-main"><div class="music-main"><div class="toolbar" data-drag><h2>Albums</h2></div>
              <div class="scroll"><div class="album-hero"><div class="art" style="background:${art}"></div><div><h2>Golden Hour</h2><div class="by">The Presidio Ensemble</div><div style="color:var(--text-3);font-size:12px;margin-bottom:12px">Electronic · 2026 · Lossless</div><button class="play-btn">▶ Play</button></div></div>
              <div class="tracks">${TRACKS.map((tr, i) => `<div class="track" data-i="${i}"><span class="n">${i + 1}</span><span>${tr.name}</span><span style="color:var(--text-3)">${t(tr.len)}</span></div>`).join('')}</div></div></div>
              <div class="player"><div class="mini" style="background:${art}"></div><div class="info"><b></b><small>The Presidio Ensemble — Golden Hour</small></div>
                <div class="ctrls"><button data-a="prev" aria-label="Previous">${UI.prev}</button><button data-a="pp" aria-label="Play or pause"></button><button data-a="next" aria-label="Next">${UI.next}</button></div>
                <div class="progress"><div></div></div></div></section>`;
          const update = () => {
            const tr = TRACKS[player.idx];
            body.querySelector('.player b').textContent = tr.name;
            body.querySelector('[data-a=pp]').innerHTML = player.playing ? UI.pause : UI.play;
            body.querySelector('.progress div').style.width = (player.pos / tr.len) * 100 + '%';
            body.querySelectorAll('.track').forEach((r) => r.classList.toggle('playing', +r.dataset.i === player.idx && player.playing));
          };
          body.querySelectorAll('.track').forEach((r) => r.addEventListener('dblclick', () => playTrack(+r.dataset.i)));
          body.querySelector('.play-btn').addEventListener('click', () => playTrack(0));
          body.querySelector('[data-a=pp]').addEventListener('click', () => player.playing ? pauseTrack() : playTrack());
          body.querySelector('[data-a=next]').addEventListener('click', () => playTrack((player.idx + 1) % TRACKS.length));
          body.querySelector('[data-a=prev]').addEventListener('click', () => playTrack((player.idx + TRACKS.length - 1) % TRACKS.length));
          player.listeners.add(update);
          win.onClose = () => { player.listeners.delete(update); pauseTrack(); };
          update();
        },
      }));
    },
    menus: () => ({ Controls: [{ label: player.playing ? 'Pause' : 'Play', sc: 'Space', action: () => player.playing ? pauseTrack() : playTrack() }, { label: 'Next', sc: '⌘→', action: () => playTrack((player.idx + 1) % TRACKS.length) }, { label: 'Previous', sc: '⌘←', action: () => playTrack((player.idx + TRACKS.length - 1) % TRACKS.length) }] }),
  });

  /* =================================================================
     Calendar
     ================================================================= */
  function seedEvents() {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const k = (day) => `${y}-${m}-${day}`;
    return {
      [k(3)]: [['Design review', '#0a84ff']], [k(8)]: [['Gym', '#30d158']], [k(12)]: [['Dentist', '#ff9f0a']],
      [k(d.getDate())]: [['Try macOS Golden Gate', '#ff375f'], ['Standup', '#0a84ff']],
      [k(Math.min(28, d.getDate() + 2))]: [['Bridge walk 🌉', '#bf5af2']], [k(20)]: [['Team lunch', '#30d158']], [k(25)]: [['Release day', '#ff453a']],
    };
  }
  register({
    id: 'calendar', name: 'Calendar', icon: AI.calendar, category: 'Productivity',
    open() {
      return single('calendar', () => WM.createWindow({
        app: 'calendar', title: 'Calendar', width: 860, height: 580, minWidth: 520,
        render(body, win) {
          win.titlebar.querySelector('.title').remove();
          win.titlebar.insertAdjacentHTML('beforeend', `<h2 style="flex:1;margin:0 0 0 12px;font-size:20px"></h2><div class="tb-group"><button class="tb-btn" data-a="prev" aria-label="Previous month">${UI.back}</button><button class="tb-btn" data-a="today">Today</button><button class="tb-btn" data-a="next" aria-label="Next month">${UI.fwd}</button></div>`);
          body.style.flexDirection = 'column';
          body.innerHTML = `<div class="cal-head">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div>${d}</div>`).join('')}</div><div class="cal-grid"></div>`;
          const events = seedEvents();
          let view = new Date(); view.setDate(1);
          const render = () => {
            const y = view.getFullYear(), m = view.getMonth(), today = new Date();
            win.titlebar.querySelector('h2').innerHTML = `${view.toLocaleDateString('en-US', { month: 'long' })} <span style="font-weight:400;color:var(--text-3)">${y}</span>`;
            win.setTitle('Calendar');
            const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
            let html = '';
            for (let i = 0; i < 42; i++) {
              const d = new Date(start); d.setDate(start.getDate() + i);
              const isToday = d.toDateString() === today.toDateString();
              const ev = events[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] || [];
              html += `<div class="cal-cell${d.getMonth() !== m ? ' other' : ''}${isToday ? ' today' : ''}"><span class="num">${d.getDate()}</span>${ev.map(([t, c]) => `<div class="cal-ev" style="border-color:${c};background:color-mix(in srgb, ${c} 18%, transparent)">${esc(t)}</div>`).join('')}</div>`;
            }
            body.querySelector('.cal-grid').innerHTML = html;
          };
          win.titlebar.querySelector('[data-a=prev]').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
          win.titlebar.querySelector('[data-a=next]').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });
          win.titlebar.querySelector('[data-a=today]').addEventListener('click', () => { view = new Date(); view.setDate(1); render(); });
          render();
        },
      }));
    },
  });

  /* =================================================================
     Weather — live from Open-Meteo when reachable, sample data otherwise
     ================================================================= */
  const WCODE = (c) => c === 0 ? ['Clear', '☀️'] : c <= 2 ? ['Partly Cloudy', '⛅️'] : c === 3 ? ['Cloudy', '☁️'] : c <= 48 ? ['Foggy', '🌫️'] : c <= 67 ? ['Rain', '🌧️'] : c <= 77 ? ['Snow', '🌨️'] : c <= 82 ? ['Showers', '🌦️'] : ['Thunderstorms', '⛈️'];
  const sampleWeather = () => {
    const h = new Date().getHours();
    return {
      live: false, temp: 64, code: 2, hi: 68, lo: 55,
      hourly: Array.from({ length: 12 }, (_, i) => ({ h: (h + i) % 24, t: 64 - Math.abs(6 - i) + 3, c: i > 7 ? 3 : 1 })),
      daily: ['Today', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((d, i) => ({ d, c: [2, 0, 1, 3, 45, 61, 0][i], lo: 54 + (i % 3), hi: 66 + (i % 4) })),
    };
  };
  async function fetchWeather() {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.8199&longitude=-122.4783&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles&forecast_days=7');
      if (!r.ok) throw new Error();
      const j = await r.json();
      const nowIdx = j.hourly.time.findIndex((t) => new Date(t) >= new Date()) || 0;
      return {
        live: true, temp: Math.round(j.current.temperature_2m), code: j.current.weather_code,
        hi: Math.round(j.daily.temperature_2m_max[0]), lo: Math.round(j.daily.temperature_2m_min[0]),
        hourly: Array.from({ length: 12 }, (_, i) => ({ h: new Date(j.hourly.time[nowIdx + i]).getHours(), t: Math.round(j.hourly.temperature_2m[nowIdx + i]), c: j.hourly.weather_code[nowIdx + i] })),
        daily: j.daily.time.map((t, i) => ({ d: i === 0 ? 'Today' : new Date(t + 'T12:00').toLocaleDateString('en-US', { weekday: 'short' }), c: j.daily.weather_code[i], lo: Math.round(j.daily.temperature_2m_min[i]), hi: Math.round(j.daily.temperature_2m_max[i]) })),
      };
    } catch { return sampleWeather(); }
  }
  let weatherCache = null;
  window.getWeather = async () => (weatherCache ||= await fetchWeather());

  register({
    id: 'weather', name: 'Weather', icon: AI.weather, category: 'Utilities',
    open() {
      return single('weather', () => WM.createWindow({
        app: 'weather', title: '', width: 560, height: 620, minWidth: 380,
        render(body, win) {
          win.titlebar.style.cssText = 'position:absolute;left:0;right:0;top:0;z-index:3;background:transparent';
          const hour = new Date().getHours();
          body.innerHTML = `<div class="weather${hour < 6 || hour > 19 ? ' night' : ''}" data-drag><div class="city">San Francisco</div><div class="big">--°</div><div class="cond">Loading…</div><div class="hl"></div>
            <div class="w-card"><h4>Hourly forecast</h4><div class="hourly"></div></div>
            <div class="w-card"><h4>7-day forecast</h4><div class="daily"></div></div><div class="src" style="font-size:11px;opacity:.7;margin-top:12px"></div></div>`;
          window.getWeather().then((w) => {
            body.querySelector('.big').textContent = w.temp + '°';
            body.querySelector('.cond').textContent = WCODE(w.code)[0];
            body.querySelector('.hl').textContent = `H:${w.hi}°  L:${w.lo}°`;
            body.querySelector('.hourly').innerHTML = w.hourly.map((x, i) => `<div><span>${i === 0 ? 'Now' : (x.h % 12 || 12) + (x.h < 12 ? 'AM' : 'PM')}</span><span style="font-size:20px">${WCODE(x.c)[1]}</span><b>${x.t}°</b></div>`).join('');
            body.querySelector('.daily').innerHTML = w.daily.map((x) => `<div class="d"><b>${x.d}</b><span>${WCODE(x.c)[1]}</span><span style="opacity:.7">${x.lo}°</span><div class="bar"></div><b>${x.hi}°</b></div>`).join('');
            body.querySelector('.src').textContent = w.live ? 'Live data: Open-Meteo' : 'Sample forecast (live data unavailable)';
          });
        },
      }));
    },
  });

  /* =================================================================
     Messages
     ================================================================= */
  const CONTACTS = [
    { n: 'Tim', c: '#8e8e93', msgs: [['them', 'Have you tried the new Liquid Glass slider?'], ['me', 'Yes! Tinted is great for reading.']], replies: ['Glad you like it 🙂', 'Golden Gate is our best release yet.', 'Did you see the new wallpapers?'] },
    { n: 'Craig', c: '#ff9f0a', msgs: [['them', 'Hair status: flawless ✨'], ['me', 'As always.']], replies: ['Let\'s go!', 'Software engineering is a team sport.', '🚀'] },
    { n: 'Mom', c: '#ff375f', msgs: [['them', 'Did you eat?'], ['me', 'Yes mom']], replies: ['Good. Call me later ❤️', 'Wear a jacket, it\'s foggy in SF!', 'Proud of you'] },
    { n: 'Bay Area Hikers', c: '#30d158', msgs: [['them', 'Lands End trail on Saturday?']], replies: ['8am at the parking lot!', 'Bring water 💧', 'Weather looks clear!'] },
  ];
  register({
    id: 'messages', name: 'Messages', icon: AI.messages, category: 'Social',
    open() {
      return single('messages', () => WM.createWindow({
        app: 'messages', title: 'Messages', width: 780, height: 520, sidebar: true, sidebarWidth: 250, minWidth: 520,
        render(body, win) {
          let cur = 0;
          body.innerHTML = `<aside class="app-sidebar"><label class="search-field" style="width:100%;margin-bottom:8px">${UI.search}<input id="msg-search" placeholder="Search" aria-label="Search messages"></label><div class="clist"></div></aside>
            <section class="app-main"><div class="toolbar" data-drag><h2></h2></div><div class="chat"></div>
            <form class="chat-input"><input id="msg-input" placeholder="iMessage" aria-label="Message" autocomplete="off"></form></section>`;
          const renderList = () => {
            body.querySelector('.clist').innerHTML = CONTACTS.map((c, i) => `<div class="contact${i === cur ? ' active' : ''}" data-i="${i}"><div class="av" style="background:${c.c}">${c.n[0]}</div><div><b>${esc(c.n)}</b><small>${esc(c.msgs[c.msgs.length - 1][1])}</small></div></div>`).join('');
            body.querySelectorAll('.contact').forEach((x) => x.addEventListener('click', () => { cur = +x.dataset.i; renderList(); renderChat(); }));
          };
          const renderChat = () => {
            const c = CONTACTS[cur];
            body.querySelector('h2').textContent = c.n;
            const chat = body.querySelector('.chat');
            chat.innerHTML = c.msgs.map(([w, t]) => `<div class="bubble ${w}">${esc(t)}</div>`).join('');
            chat.scrollTop = chat.scrollHeight;
          };
          body.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const inp = body.querySelector('#msg-input'), text = inp.value.trim();
            if (!text) return;
            const c = CONTACTS[cur], who = cur;
            c.msgs.push(['me', text]); inp.value = ''; renderChat(); renderList();
            setTimeout(() => {
              c.msgs.push(['them', c.replies[Math.floor(Math.random() * c.replies.length)]]);
              if (cur === who) renderChat();
              renderList();
              if (WM.active !== win) OS().notify({ app: 'messages', title: c.n, body: c.msgs[c.msgs.length - 1][1] });
            }, 1200 + Math.random() * 1500);
          });
          renderList(); renderChat();
        },
      }));
    },
  });

  window.APPS = APPS;
  window.openPath = openPath;
})();

/* Tiny persistent virtual file system shared by Finder, Terminal and TextEdit. */
(function () {
  const KEY = 'webmac.fs.v1';
  const HOME = '/Users/guest';

  const seed = () => ({
    type: 'dir', children: {
      Applications: { type: 'dir', children: {} },
      Users: { type: 'dir', children: {
        guest: { type: 'dir', children: {
          Desktop: { type: 'dir', children: {
            'Welcome.txt': { type: 'file', content: 'Welcome to macOS Golden Gate — on the web.\n\nTry these:\n• Press Ctrl+Space (or Alt+Space) for Spotlight\n• Open Control Center from the menu bar and drag the Liquid Glass slider\n• Right-click the desktop to change the wallpaper\n• Open Terminal and type "help"\n' },
            Projects: { type: 'dir', children: {} },
          } },
          Documents: { type: 'dir', children: {
            'Ideas.txt': { type: 'file', content: '- A glass calculator\n- Learn the Golden Gate Bridge history\n- Plan a weekend at Lake Tahoe\n' },
            'Resume.txt': { type: 'file', content: 'Guest User\nWeb Developer\n\nSkills: HTML, CSS, JavaScript\n' },
            Work: { type: 'dir', children: { 'Q3 Report.txt': { type: 'file', content: 'Revenue up, bugs down.\n' } } },
          } },
          Downloads: { type: 'dir', children: {
            'golden-gate.jpg': { type: 'file', content: '[image]' },
            'installer.dmg': { type: 'file', content: '[binary]' },
          } },
          Music: { type: 'dir', children: {} },
          Pictures: { type: 'dir', children: { 'Tahoe.png': { type: 'file', content: '[image]' } } },
        } },
      } },
      System: { type: 'dir', children: { Library: { type: 'dir', children: {} } } },
    },
  });

  let root;
  try { root = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { root = seed(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(root)); } catch { /* storage unavailable */ } };

  function norm(path, cwd = HOME) {
    if (!path || path === '~') return HOME;
    if (path.startsWith('~/')) path = HOME + path.slice(1);
    if (!path.startsWith('/')) path = cwd.replace(/\/$/, '') + '/' + path;
    const out = [];
    for (const part of path.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') out.pop(); else out.push(part);
    }
    return '/' + out.join('/');
  }

  function get(path) {
    let node = root;
    for (const part of norm(path).split('/').filter(Boolean)) {
      if (node.type !== 'dir' || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  function parentOf(path) {
    const p = norm(path);
    const i = p.lastIndexOf('/');
    return { dir: p.slice(0, i) || '/', name: p.slice(i + 1) };
  }

  function list(path) {
    const n = get(path);
    if (!n || n.type !== 'dir') return null;
    return Object.entries(n.children)
      .map(([name, c]) => ({ name, type: c.type }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  }

  function create(path, type, content = '') {
    const { dir, name } = parentOf(path);
    const d = get(dir);
    if (!d || d.type !== 'dir' || !name) return false;
    if (d.children[name]) return d.children[name].type === type;
    d.children[name] = type === 'dir' ? { type, children: {} } : { type, content };
    save(); fire();
    return true;
  }

  function uniqueName(dir, base, ext = '') {
    const d = get(dir);
    let name = base + ext, i = 2;
    while (d && d.children[name]) name = `${base} ${i++}${ext}`;
    return name;
  }

  function write(path, content) {
    const n = get(path);
    if (n && n.type === 'file') { n.content = content; save(); fire(); return true; }
    return create(path, 'file', content);
  }

  function remove(path) {
    const { dir, name } = parentOf(path);
    const d = get(dir);
    if (!d || !d.children[name]) return false;
    delete d.children[name];
    save(); fire();
    return true;
  }

  function rename(path, newName) {
    const { dir, name } = parentOf(path);
    const d = get(dir);
    if (!d || !d.children[name] || d.children[newName]) return false;
    d.children[newName] = d.children[name];
    delete d.children[name];
    save(); fire();
    return true;
  }

  const listeners = new Set();
  const fire = () => listeners.forEach((fn) => fn());
  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  const reset = () => { root = seed(); save(); fire(); };

  window.VFS = { HOME, norm, get, list, create, write, remove, rename, uniqueName, onChange, reset, parentOf };
})();

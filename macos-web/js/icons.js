/* App icons (Liquid Glass style squircles) and UI glyphs, drawn as inline SVG. */
(function () {
  const sheen = `
    <linearGradient id="gl-sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".45"/>
      <stop offset=".45" stop-color="#fff" stop-opacity=".06"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>`;

  // Rounded-square app tile with a glass highlight and a specular rim.
  function tile(id, stops, inner, dir = 'v') {
    const [x2, y2] = dir === 'd' ? [1, 1] : [0, 1];
    const g = stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('');
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>${sheen}
      <linearGradient id="bg-${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${g}</linearGradient></defs>
      <rect x="5" y="5" width="90" height="90" rx="22" fill="url(#bg-${id})"/>
      ${inner}
      <rect x="5" y="5" width="90" height="90" rx="22" fill="url(#gl-sheen)"/>
      <rect x="5.5" y="5.5" width="89" height="89" rx="21.5" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1"/>
    </svg>`;
  }

  const today = new Date();
  const dow = today.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  const APP = {
    finder: tile('finder', ['#8fd3ff', '#2f8cf6'], `
      <path d="M50 5 H73 A22 22 0 0 1 95 27 V73 A22 22 0 0 1 73 95 H50 Z" fill="#e9f3ff" opacity=".96"/>
      <path d="M52 5 C44 30 43 55 50 72 L44 72 C46 80 48 88 50 95" fill="none" stroke="#1c3f73" stroke-width="3" stroke-linecap="round"/>
      <rect x="30" y="32" width="5" height="14" rx="2.5" fill="#1c3f73"/>
      <rect x="66" y="32" width="5" height="14" rx="2.5" fill="#1c3f73"/>
      <path d="M26 64 Q50 80 76 64" fill="none" stroke="#1c3f73" stroke-width="3.2" stroke-linecap="round"/>`),

    safari: tile('safari', ['#ffffff', '#e3e7ee'], `
      <circle cx="50" cy="50" r="36" fill="#1a8dfc"/>
      <circle cx="50" cy="50" r="36" fill="url(#bg-safari)" opacity=".0"/>
      <circle cx="50" cy="50" r="33" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="1.2 4.2" opacity=".85"/>
      <path d="M50 50 L70 30 L55 55 Z" fill="#ff3b30"/>
      <path d="M50 50 L30 70 L45 45 Z" fill="#fff"/>
      <circle cx="50" cy="50" r="3" fill="#fff"/>`),

    messages: tile('messages', ['#6ef08a', '#16c23d'], `
      <path d="M50 24 C30 24 18 36 18 49 C18 57 23 64 30 68 C29 73 26 77 22 80 C30 80 36 77 40 74 C43 75 46 75 50 75 C70 75 82 63 82 49 C82 36 70 24 50 24 Z" fill="#fff"/>`),

    mail: tile('mail', ['#6fc3ff', '#1a73e8'], `
      <rect x="20" y="31" width="60" height="40" rx="6" fill="#fff"/>
      <path d="M21 34 L50 56 L79 34" fill="none" stroke="#1a73e8" stroke-width="3.5" stroke-linejoin="round"/>`),

    photos: tile('photos', ['#ffffff', '#f1f1f4'], (() => {
      const cols = ['#ff9f0a', '#ffd60a', '#a3d93b', '#30d158', '#32ade6', '#5e5ce6', '#bf5af2', '#ff375f'];
      return cols.map((c, i) => `<ellipse cx="50" cy="32" rx="10" ry="17" fill="${c}" opacity=".85" style="mix-blend-mode:multiply" transform="rotate(${i * 45} 50 50)"/>`).join('');
    })()),

    music: tile('music', ['#ff6b81', '#fa2d48'], `
      <path d="M62 24 L62 60 A9 8 0 1 1 55 52 L55 36 L40 40 L40 67 A9 8 0 1 1 33 59 L33 30 Z" fill="#fff"/>`),

    notes: tile('notes', ['#ffffff', '#f4f4f4'], `
      <path d="M5 27 V26 A21 21 0 0 1 26 5 H74 A21 21 0 0 1 95 26 V30 H5 Z" fill="#ffd52e"/>
      <g stroke="#d6d6d6" stroke-width="1.6"><line x1="16" y1="46" x2="84" y2="46"/><line x1="16" y1="60" x2="84" y2="60"/><line x1="16" y1="74" x2="84" y2="74"/></g>
      <g fill="#b7b7b7"><circle cx="20" cy="18" r="1.6"/><circle cx="30" cy="18" r="1.6"/><circle cx="40" cy="18" r="1.6"/><circle cx="50" cy="18" r="1.6"/><circle cx="60" cy="18" r="1.6"/><circle cx="70" cy="18" r="1.6"/><circle cx="80" cy="18" r="1.6"/></g>`),

    calendar: tile('calendar', ['#ffffff', '#f3f3f5'], `
      <text x="50" y="32" text-anchor="middle" font-family="-apple-system,Inter,sans-serif" font-size="14" font-weight="600" fill="#ff3b30">${dow}</text>
      <text x="50" y="76" text-anchor="middle" font-family="-apple-system,Inter,sans-serif" font-size="44" font-weight="300" fill="#1d1d1f">${today.getDate()}</text>`),

    calculator: tile('calculator', ['#4a4a4e', '#1f1f22'], `
      <g fill="#6d6d72"><circle cx="30" cy="34" r="8"/><circle cx="50" cy="34" r="8"/><circle cx="30" cy="54" r="8"/><circle cx="50" cy="54" r="8"/><circle cx="30" cy="74" r="8"/><circle cx="50" cy="74" r="8"/></g>
      <g fill="#ff9f0a"><circle cx="70" cy="34" r="8"/><circle cx="70" cy="54" r="8"/><circle cx="70" cy="74" r="8"/></g>
      <g stroke="#fff" stroke-width="2.4" stroke-linecap="round"><line x1="66" y1="54" x2="74" y2="54"/><line x1="66" y1="74" x2="74" y2="74"/><line x1="66" y1="71" x2="74" y2="71" stroke-opacity="0"/><line x1="70" y1="30" x2="70" y2="38"/><line x1="66" y1="34" x2="74" y2="34"/></g>`),

    terminal: tile('terminal', ['#3c3c40', '#111113'], `
      <rect x="15" y="20" width="70" height="60" rx="6" fill="#000" opacity=".35"/>
      <path d="M26 36 L38 45 L26 54" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="43" y1="56" x2="58" y2="56" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),

    settings: tile('settings', ['#b8b8bf', '#6c6c73'], `
      <g transform="translate(50 50)">
        ${Array.from({ length: 12 }, (_, i) => `<rect x="-4" y="-35" width="8" height="12" rx="2" fill="#3a3a3f" transform="rotate(${i * 30})"/>`).join('')}
        <circle r="26" fill="#3a3a3f"/><circle r="21" fill="#d4d4da"/>
        <circle r="10" fill="#6c6c73"/><circle r="5" fill="#d4d4da"/>
        ${Array.from({ length: 3 }, (_, i) => `<rect x="-1.8" y="-20" width="3.6" height="11" rx="1.5" fill="#6c6c73" transform="rotate(${i * 120})"/>`).join('')}
      </g>`),

    weather: tile('weather', ['#58a8f4', '#2a6fd0'], `
      <circle cx="40" cy="40" r="14" fill="#ffd60a"/>
      <path d="M36 72 A12 12 0 0 1 38 48 A16 16 0 0 1 68 52 A10 10 0 0 1 68 72 Z" fill="#fff"/>`),

    appstore: tile('appstore', ['#4cc2ff', '#0a6cff'], `
      <g stroke="#fff" stroke-width="6" stroke-linecap="round"><line x1="50" y1="26" x2="30" y2="68"/><line x1="50" y1="26" x2="70" y2="68" stroke-opacity="0"/><line x1="44" y1="38" x2="64" y2="74"/><line x1="24" y1="60" x2="76" y2="60"/></g>`),

    launchpad: tile('launchpad', ['#e9e9ee', '#bdbdc6'], (() => {
      const c = ['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f'];
      return c.map((col, i) => `<rect x="${22 + (i % 3) * 20}" y="${22 + Math.floor(i / 3) * 20}" width="15" height="15" rx="4.5" fill="${col}"/>`).join('');
    })()),

    textedit: tile('textedit', ['#ffffff', '#ececef'], `
      <rect x="22" y="16" width="56" height="70" rx="3" fill="#fff" stroke="#d0d0d4"/>
      <g stroke="#9a9aa0" stroke-width="2"><line x1="30" y1="30" x2="70" y2="30"/><line x1="30" y1="38" x2="70" y2="38"/><line x1="30" y1="46" x2="64" y2="46"/><line x1="30" y1="54" x2="70" y2="54"/><line x1="30" y1="62" x2="56" y2="62"/></g>
      <path d="M62 78 L80 36 L86 39 L68 81 L61 84 Z" fill="#f5a623" stroke="#8a5a10" stroke-width="1"/>`),

    about: tile('about', ['#d5d5db', '#8e8e96'], `<circle cx="50" cy="50" r="22" fill="#fff"/><text x="50" y="60" text-anchor="middle" font-size="30" font-weight="700" fill="#6e6e76" font-family="Georgia,serif">i</text>`),

    trash: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#d9dde4" stop-opacity=".7"/></linearGradient></defs>
      <path d="M22 22 H78 L72 90 A5 5 0 0 1 67 94 H33 A5 5 0 0 1 28 90 Z" fill="url(#tr)" stroke="#9aa0aa" stroke-width="1.2"/>
      <ellipse cx="50" cy="22" rx="28" ry="5" fill="#eef0f4" stroke="#9aa0aa" stroke-width="1.2"/>
      <g stroke="#b5bac3" stroke-width="1"><line x1="36" y1="30" x2="38" y2="88"/><line x1="50" y1="30" x2="50" y2="88"/><line x1="64" y1="30" x2="62" y2="88"/><path d="M26 50 Q50 56 74 50" fill="none"/><path d="M27 70 Q50 76 73 70" fill="none"/></g></svg>`,

    folder: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="fd1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#52aef7"/></linearGradient>
      <linearGradient id="fd2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9dcff"/><stop offset="1" stop-color="#6bbcfa"/></linearGradient></defs>
      <path d="M8 24 A5 5 0 0 1 13 19 H38 L45 26 H87 A5 5 0 0 1 92 31 V80 A5 5 0 0 1 87 85 H13 A5 5 0 0 1 8 80 Z" fill="url(#fd1)"/>
      <path d="M8 36 A5 5 0 0 1 13 31 H87 A5 5 0 0 1 92 36 V80 A5 5 0 0 1 87 85 H13 A5 5 0 0 1 8 80 Z" fill="url(#fd2)"/>
      <path d="M8.5 36 A5 5 0 0 1 13 31.5 H87" fill="none" stroke="#fff" stroke-opacity=".6"/></svg>`,

    file: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 8 H62 L80 26 V88 A4 4 0 0 1 76 92 H22 A4 4 0 0 1 18 88 V12 A4 4 0 0 1 22 8 Z" fill="#fff" stroke="#c8c8cd" stroke-width="1.5"/>
      <path d="M62 8 V22 A4 4 0 0 0 66 26 H80" fill="#eef0f3" stroke="#c8c8cd" stroke-width="1.5"/>
      <g stroke="#b6b6bc" stroke-width="2"><line x1="28" y1="42" x2="70" y2="42"/><line x1="28" y1="50" x2="70" y2="50"/><line x1="28" y1="58" x2="62" y2="58"/><line x1="28" y1="66" x2="70" y2="66"/></g></svg>`,

    hd: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="hdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f4f6"/><stop offset="1" stop-color="#b9bcc3"/></linearGradient></defs>
      <rect x="10" y="30" width="80" height="44" rx="7" fill="url(#hdg)" stroke="#8b8f98" stroke-width="1.2"/>
      <rect x="10" y="58" width="80" height="16" rx="0" fill="#9da1a9" opacity=".35"/>
      <circle cx="80" cy="66" r="2.5" fill="#30d158"/></svg>`,

    image: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="18" width="76" height="64" rx="4" fill="#fff" stroke="#c8c8cd" stroke-width="1.5"/>
      <rect x="17" y="23" width="66" height="54" fill="#8ec5ff"/><circle cx="68" cy="36" r="6" fill="#ffd60a"/>
      <path d="M17 77 L40 50 L55 64 L65 56 L83 77 Z" fill="#34a853"/></svg>`,
  };

  // Monochrome UI glyphs (currentColor), loosely modelled on SF Symbols.
  const s = (d, vb = '0 0 24 24', extra = '') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
  const f = (d, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="currentColor">${d}</svg>`;
  const UI = {
    wifi: s('<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.7 16a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.3" r="1" fill="currentColor"/>'),
    battery: `<svg viewBox="0 0 30 14" fill="none"><rect x=".75" y=".75" width="25" height="12.5" rx="3.6" stroke="currentColor" stroke-opacity=".5" stroke-width="1.2"/><rect x="2.5" y="2.5" width="18" height="9" rx="2" fill="currentColor"/><path d="M27.5 5v4a2 2 0 0 0 0-4z" fill="currentColor" fill-opacity=".5"/></svg>`,
    cc: s('<rect x="3" y="4.5" width="18" height="6" rx="3"/><circle cx="17.5" cy="7.5" r="1.6" fill="currentColor"/><rect x="3" y="13.5" width="18" height="6" rx="3"/><circle cx="6.5" cy="16.5" r="1.6" fill="currentColor"/>'),
    search: s('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>'),
    siri: `<svg viewBox="0 0 24 24"><defs><linearGradient id="sir" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ff5ea8"/><stop offset=".5" stop-color="#8a5cff"/><stop offset="1" stop-color="#2ec5ff"/></linearGradient></defs><circle cx="12" cy="12" r="8.5" fill="url(#sir)"/><path d="M6 12c2-3 4 3 6 0s4 3 6 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
    bluetooth: s('<path d="m7 7 10 10-5 4V3l5 4L7 17"/>'),
    airdrop: s('<path d="M5.6 17.4a9 9 0 1 1 12.8 0"/><path d="M8.5 14.5a5 5 0 1 1 7 0"/><path d="M12 13v8"/>'),
    moon: f('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>'),
    sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    speaker: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
    mirror: s('<rect x="2.5" y="5" width="12" height="9" rx="1.5"/><rect x="9.5" y="10" width="12" height="9" rx="1.5"/>'),
    focus: f('<path d="M18 14.5A7 7 0 0 1 9.5 6 7 7 0 1 0 18 14.5z"/>'),
    lock: s('<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    back: s('<path d="m15 5-7 7 7 7"/>'),
    fwd: s('<path d="m9 5 7 7-7 7"/>'),
    sidebar: s('<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M9 4.5v15"/>'),
    grid: s('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'),
    list: s('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>'),
    share: s('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    compose: s('<path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8l-3.8.9.9-3.8z"/>'),
    trash: s('<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>'),
    reload: s('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    tabs: s('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>'),
    play: f('<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/>'),
    pause: f('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'),
    next: f('<path d="M3 6v12l8.5-6zM12 6v12l8.5-6z"/>'),
    prev: f('<path d="M21 6v12l-8.5-6zM12 6v12L3.5 12z"/>'),
    recents: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>'),
    apps: s('<path d="M12 3 3 8v8l9 5 9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
    desktopI: s('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
    doc: s('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'),
    download: s('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v8M8.5 12.5 12 16l3.5-3.5"/>'),
    home: s('<path d="M4 11 12 4l8 7v9h-5.5v-6h-5v6H4z"/>'),
    cloud: s('<path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.6 4.2 4.2 0 0 1 17.5 18z"/>'),
    drive: s('<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="17" cy="12" r="1" fill="currentColor"/>'),
    net: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    appearance: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5z" fill="currentColor"/>'),
    wallpaper: s('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/>'),
    dock: s('<rect x="3" y="4" width="18" height="16" rx="2.5"/><rect x="6" y="15" width="12" height="2.5" rx="1.2" fill="currentColor"/>'),
    info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'),
    gear: s('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
    bell: s('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    glass: s('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M7.5 8.5a3 3 0 0 1 3-3" /><path d="M3.5 14.5 14.5 3.5" stroke-opacity=".5"/>'),
    heart: s('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    library: s('<rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><path d="m16 5 3.8 14.5"/>'),
    person: s('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    shield: s('<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/>'),
    battery2: s('<rect x="2.5" y="7" width="17" height="10" rx="2.5"/><path d="M21.5 10.5v3"/><rect x="5" y="9.5" width="10" height="5" rx="1" fill="currentColor"/>'),
    kb: s('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
    close: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  };

  window.ICONS = { APP, UI };
})();

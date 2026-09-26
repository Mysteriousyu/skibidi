/* Procedurally drawn wallpapers inspired by macOS Golden Gate (27) and Tahoe (26). */
(function () {
  const W = 1920, H = 1080;
  const wrap = (body, defs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
  const url = (svg) => `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;
  const grad = (id, stops, x2 = 0, y2 = 1, x1 = 0, y1 = 0) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;

  // Deterministic PRNG so stars/lights stay put between renders
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

  /* ---- "Golden Gate" abstract: folded petals, sand-gold into indigo ---- */
  function abstract(dark) {
    const bg = dark
      ? [[0, '#3a2c1c'], [.45, '#2a2440'], [1, '#0d0f24']]
      : [[0, '#f3dcb2'], [.5, '#c9b9c4'], [1, '#3c3f7a']];
    const petals = dark
      ? [['#c98b3c', '#5a3b2a'], ['#8a6a52', '#2e2a4a'], ['#5d4e7c', '#1b1c3c'], ['#3b3f7a', '#0e1030'], ['#2a2d5e', '#06071a']]
      : [['#fbe3b8', '#e0b57a'], ['#f0cfa4', '#b9a3b3'], ['#d8c3c6', '#7d7aa8'], ['#8f8cc0', '#3f3f82'], ['#5a5c9e', '#23255a']];
    let defs = grad('bg', bg, 1, 1) + `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter>`;
    let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
    petals.forEach(([a, b], i) => {
      defs += grad('p' + i, [[0, a], [1, b]], 1, 1);
      const x = -200 + i * 380, y = 1250 - i * 40;
      const d = `M${x} ${y} C ${x + 250} ${520 - i * 60}, ${x + 700} ${260 - i * 30}, ${x + 1300} ${-80 + i * 40} L ${x + 1600} ${-80 + i * 40} C ${x + 1100} ${340 - i * 20}, ${x + 780} ${700 - i * 30}, ${x + 620} ${y} Z`;
      body += `<path d="${d}" fill="#000" opacity="${dark ? .5 : .22}" filter="url(#sh)" transform="translate(-24 18)"/>`;
      body += `<path d="${d}" fill="url(#p${i})"/>`;
      body += `<path d="M${x} ${y} C ${x + 250} ${520 - i * 60}, ${x + 700} ${260 - i * 30}, ${x + 1300} ${-80 + i * 40}" fill="none" stroke="#fff" stroke-opacity="${dark ? .12 : .35}" stroke-width="3"/>`;
    });
    return wrap(body, defs);
  }

  /* ---- Bridge silhouette shared by the scenic wallpapers ---- */
  function bridge(color, deckY = 720, lights = null) {
    const t1 = 560, t2 = 1360, top = 330;
    let g = '';
    const tower = (x) => `
      <rect x="${x - 26}" y="${top}" width="16" height="${H - top}" fill="${color}"/>
      <rect x="${x + 10}" y="${top}" width="16" height="${H - top}" fill="${color}"/>
      ${[0, 1, 2, 3].map((k) => `<rect x="${x - 26}" y="${top + 20 + k * 95}" width="52" height="${14 - k * 2}" fill="${color}"/>`).join('')}
      <rect x="${x - 30}" y="${top - 8}" width="60" height="12" fill="${color}"/>`;
    const cable = `M -40 ${deckY - 80} Q ${t1 / 2} ${top + 80} ${t1} ${top}
                   Q ${(t1 + t2) / 2} ${deckY + 60} ${t2} ${top}
                   Q ${(t2 + W) / 2 + 100} ${top + 80} ${W + 40} ${deckY - 80}`;
    g += `<path d="${cable}" fill="none" stroke="${color}" stroke-width="5"/>`;
    // Vertical suspenders following the main span's quadratic curve
    const qy = (x0, y0, cx, cy, x1, y1, x) => {
      // x is linear-ish in t for these symmetrical curves; solve approximately
      const t = (x - x0) / (x1 - x0);
      return (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    };
    for (let x = t1 + 22; x < t2 - 10; x += 22) {
      const y = qy(t1, top, (t1 + t2) / 2, deckY + 60, t2, top, x);
      g += `<line x1="${x}" y1="${y}" x2="${x}" y2="${deckY}" stroke="${color}" stroke-width="1.6"/>`;
    }
    for (let x = 0; x < t1; x += 24) {
      const y = qy(-40, deckY - 80, t1 / 2, top + 80, t1, top, x);
      g += `<line x1="${x}" y1="${y}" x2="${x}" y2="${deckY}" stroke="${color}" stroke-width="1.6"/>`;
    }
    for (let x = t2 + 24; x < W; x += 24) {
      const y = qy(t2, top, (t2 + W) / 2 + 100, top + 80, W + 40, deckY - 80, x);
      g += `<line x1="${x}" y1="${y}" x2="${x}" y2="${deckY}" stroke="${color}" stroke-width="1.6"/>`;
    }
    g += tower(t1) + tower(t2);
    g += `<rect x="-10" y="${deckY}" width="${W + 20}" height="18" fill="${color}"/>`;
    g += `<rect x="-10" y="${deckY + 18}" width="${W + 20}" height="8" fill="${color}" opacity=".7"/>`;
    if (lights) {
      const r = rng(7);
      for (let x = 10; x < W; x += 34) g += `<circle cx="${x}" cy="${deckY - 4}" r="3" fill="${lights}"/>`;
      for (let i = 0; i < 26; i++) g += `<rect x="${r() * W}" y="${deckY + 4}" width="14" height="4" rx="2" fill="${r() > .5 ? '#fff6d8' : '#ff4b3a'}"/>`;
      g += `<circle cx="${t1}" cy="${top - 12}" r="5" fill="#ff3b30"/><circle cx="${t2}" cy="${top - 12}" r="5" fill="#ff3b30"/>`;
    }
    return g;
  }

  function sunset() {
    const defs = grad('sky', [[0, '#2b3b7a'], [.35, '#b3587a'], [.62, '#f59a5b'], [.78, '#ffd28a']]) +
      grad('sea', [[0, '#e0876a'], [.4, '#6d4a6e'], [1, '#1b1e3d']]) +
      `<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff4d6"/><stop offset=".35" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient>`;
    const body = `
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <circle cx="1080" cy="700" r="260" fill="url(#sun)"/>
      <path d="M0 690 C 200 640, 330 600, 470 640 S 760 700, 900 700 L 900 760 L 0 760 Z" fill="#5a3350" opacity=".85"/>
      <path d="M1250 700 C 1400 610, 1580 580, 1760 620 S 1920 640, 1920 640 L 1920 760 L 1250 760 Z" fill="#4a2a47" opacity=".9"/>
      <rect y="740" width="${W}" height="${H - 740}" fill="url(#sea)"/>
      ${Array.from({ length: 18 }, (_, i) => `<rect x="${980 - i * 6}" y="${760 + i * 16}" width="${200 + i * 12}" height="3" fill="#ffd6a0" opacity="${.5 - i * .025}"/>`).join('')}
      ${bridge('#1f1325', 720)}
      <path d="M-20 1080 L -20 880 C 120 860, 240 900, 330 960 S 480 1060, 540 1080 Z" fill="#150b18"/>`;
    return wrap(body, defs);
  }

  function night() {
    const r = rng(42);
    let stars = '';
    for (let i = 0; i < 180; i++) stars += `<circle cx="${r() * W}" cy="${r() * 520}" r="${r() * 1.6 + .3}" fill="#fff" opacity="${r() * .7 + .2}"/>`;
    let city = '';
    for (let x = 1500; x < W; x += 18) {
      const h = 30 + r() * 110;
      city += `<rect x="${x}" y="${740 - h}" width="16" height="${h}" fill="#0b1026"/>`;
      for (let k = 0; k < h / 14; k++) if (r() > .55) city += `<rect x="${x + 4 + (r() > .5 ? 6 : 0)}" y="${740 - h + 6 + k * 14}" width="3" height="4" fill="#ffd98a" opacity=".8"/>`;
    }
    const defs = grad('sky', [[0, '#050814'], [.6, '#16224a'], [1, '#34305e']]) + grad('sea', [[0, '#1b2248'], [1, '#04060f']]);
    const body = `
      <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
      <circle cx="320" cy="180" r="42" fill="#f4f0e2"/><circle cx="336" cy="170" r="40" fill="#0a0f24" opacity=".25"/>
      ${city}
      <path d="M0 700 C 180 650, 360 640, 520 690 L 520 760 L 0 760 Z" fill="#070a1a"/>
      <rect y="740" width="${W}" height="${H - 740}" fill="url(#sea)"/>
      ${Array.from({ length: 40 }, (_, i) => `<rect x="${(i * 97) % W}" y="${780 + (i * 37) % 280}" width="${40 + (i * 13) % 90}" height="2" fill="#ffb36b" opacity=".35"/>`).join('')}
      ${bridge('#7a2a20', 720, '#ffcc6a')}`;
    return wrap(body, defs);
  }

  function celosia(dark) {
    const base = dark ? ['#1a0710', '#3a0d24'] : ['#ffe6ea', '#ffb3c4'];
    const defs = grad('bg', [[0, base[0]], [1, base[1]]], 1, 1) +
      `<filter id="bl"><feGaussianBlur stdDeviation="30"/></filter>`;
    const cols = dark ? ['#b0164a', '#7b0f3a', '#e0386b', '#5c0b2c', '#ff6b8e'] : ['#ff5c8a', '#e0245e', '#ff8fab', '#c2185b', '#ffc2d1'];
    let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, cx = 960 + Math.cos(a) * 220, cy = 560 + Math.sin(a) * 160;
      body += `<ellipse cx="${cx}" cy="${cy}" rx="${380 - i * 8}" ry="${140 + i * 4}" transform="rotate(${i * 26} ${cx} ${cy})" fill="${cols[i % cols.length]}" opacity=".55" ${i % 3 ? '' : 'filter="url(#bl)"'}/>`;
    }
    body += `<text x="960" y="640" text-anchor="middle" font-family="-apple-system,Inter,sans-serif" font-size="300" font-weight="800" fill="#fff" opacity="${dark ? .06 : .18}">27</text>`;
    return wrap(body, defs);
  }

  function tahoe(dark) {
    const defs = grad('bg', dark ? [[0, '#020b1f'], [1, '#0a2f5c']] : [[0, '#7cc4ff'], [1, '#0a5fb8']]);
    let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
    const cols = dark ? ['#0b2d57', '#0f3f78', '#155aa3', '#1d74c4', '#2d8fe0'] : ['#bfe3ff', '#8fcaff', '#58aefc', '#2a8ef0', '#1470d4'];
    cols.forEach((c, i) => {
      const y = 300 + i * 150;
      body += `<path d="M0 ${y} C 400 ${y - 140}, 800 ${y + 120}, 1200 ${y - 40} S 1800 ${y - 120}, 1920 ${y - 60} L 1920 1080 L 0 1080 Z" fill="${c}" opacity=".92"/>`;
      body += `<path d="M0 ${y} C 400 ${y - 140}, 800 ${y + 120}, 1200 ${y - 40} S 1800 ${y - 120}, 1920 ${y - 60}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`;
    });
    return wrap(body, defs);
  }

  function gradientWp(a, b) { return wrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [[0, a], [1, b]], 1, 1)); }

  const cache = {};
  const LIST = [
    { id: 'goldengate', name: 'Golden Gate', light: () => abstract(false), dark: () => abstract(true), darkUI: [false, true] },
    { id: 'sunset', name: 'Golden Gate Sunset', light: sunset, darkUI: [true, true] },
    { id: 'night', name: 'Golden Gate Night', light: night, darkUI: [true, true] },
    { id: 'celosia', name: 'Celosia', light: () => celosia(false), dark: () => celosia(true), darkUI: [false, true] },
    { id: 'tahoe', name: 'Tahoe', light: () => tahoe(false), dark: () => tahoe(true), darkUI: [true, true] },
    { id: 'graphite', name: 'Graphite', light: () => gradientWp('#8e8e96', '#2c2c30'), darkUI: [true, true] },
    { id: 'aurora', name: 'Aurora', light: () => gradientWp('#43e0b0', '#4b3cc9'), darkUI: [true, true] },
    { id: 'peach', name: 'Peach', light: () => gradientWp('#ffe0c2', '#ff9a8b'), darkUI: [false, false] },
  ];

  function get(id, dark) {
    const wp = LIST.find((w) => w.id === id) || LIST[0];
    const variant = dark && wp.dark ? 'dark' : 'light';
    const key = wp.id + variant;
    if (!cache[key]) cache[key] = url(wp[variant]());
    return { css: cache[key], darkUI: wp.darkUI[dark ? 1 : 0], name: wp.name };
  }

  window.WALLPAPERS = { LIST, get };
})();

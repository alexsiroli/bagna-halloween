// Il quartiere di notte, la stessa scena della locandina v2: case di paese, villa stregata, campanile,
// luna con le nuvole, pipistrelli, alberi spogli, luminarie e zucche intagliate.
// Markup SVG statico generato una volta da questi numeri (seme fisso: sempre uguale), nessun dato esterno.
// Si anima solo con opacity e transform (classi sk-* in halloween.css): finestre e lampadine si accendono.

const C = {
  n950: '#070b17', n900: '#0b1224', n800: '#111a33', n700: '#1a2547', n600: '#27345f',
  n500: '#3a4a80', n400: '#6878b4', luna: '#f4efe4', nebbia: '#a3acc9', lampione: '#ffb238',
  finestra: '#ffe19a', zucca: '#ff6b1a', zuccaScura: '#c94a0c', stelo: '#7c8a3e', ombra: '#03050c',
};
const W = 240;
const H = 160;
const SUOLO = 150;
const f = (n) => Math.round(n * 100) / 100;

function semi(seed) {
  return function next() {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const radiale = (id, stops, extra = '') =>
  `<radialGradient id="${id}" ${extra}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;

const DEFS =
  '<defs>' +
  `<linearGradient id="sk-strada" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.n800}"/><stop offset="1" stop-color="${C.n950}"/></linearGradient>` +
  radiale('sk-orizzonte', [[0, C.lampione, 0.26], [0.5, C.zucca, 0.07], [1, C.zucca, 0]]) +
  radiale('sk-luna-alone', [[0, C.luna, 0.4], [0.3, C.finestra, 0.13], [0.62, C.nebbia, 0.05], [1, C.nebbia, 0]]) +
  radiale('sk-luna', [[0, '#fffbf2', 1], [0.62, C.luna, 1], [1, '#d6ccb6', 1]], 'cx=".42" cy=".38" r=".62"') +
  radiale('sk-finestra-alone', [[0, C.finestra, 0.6], [0.45, C.lampione, 0.18], [1, C.lampione, 0]]) +
  radiale('sk-lampadina', [[0, C.finestra, 0.8], [0.35, C.lampione, 0.28], [1, C.lampione, 0]]) +
  radiale('sk-zucca-alone', [[0, C.lampione, 0.62], [0.4, C.zucca, 0.22], [1, C.zucca, 0]]) +
  radiale('sk-zucca-corpo', [[0, '#ff9a4d', 1], [0.55, C.zucca, 1], [1, C.zuccaScura, 1]], 'cx=".42" cy=".36" r=".7"') +
  radiale('sk-faccia', [[0, '#fff6d0', 1], [0.45, C.finestra, 1], [1, C.lampione, 1]]) +
  radiale('sk-nebbia', [[0, C.nebbia, 0.28], [0.6, C.nebbia, 0.09], [1, C.nebbia, 0]]) +
  '</defs>';

// Stelle: una manciata di path (punti = tratti di lunghezza zero con estremi tondi), non centinaia di nodi.
function stelle(r, n) {
  const gruppi = [[], [], []];
  let croci = '';
  for (let i = 0; i < n; i += 1) {
    const x = r() * W;
    const y = r() * r() * (SUOLO - 50);
    gruppi[Math.floor(r() * 3)].push(`M${f(x)} ${f(y)}h0`);
    if (r() < 0.08) {
      const l = 1.4 + r() * 1.2;
      croci += `M${f(x - l)} ${f(y)}H${f(x + l)}M${f(x)} ${f(y - l)}V${f(y + l)}`;
    }
  }
  return (
    gruppi.map((d, i) => `<path d="${d.join('')}" stroke="${C.luna}" stroke-opacity="${[0.45, 0.7, 0.95][i]}" stroke-width="${[0.5, 0.65, 0.85][i]}" stroke-linecap="round"/>`).join('') +
    `<path d="${croci}" stroke="${C.luna}" stroke-opacity=".5" stroke-width=".18"/>`
  );
}

function luna(cx, cy, R) {
  const crateri = [[-0.32, -0.18, 0.2], [0.28, 0.22, 0.14], [0.05, -0.42, 0.09], [-0.12, 0.38, 0.11], [0.42, -0.2, 0.07], [-0.5, 0.14, 0.06]];
  let s = `<circle cx="${cx}" cy="${cy}" r="${f(R * 3.2)}" fill="url(#sk-luna-alone)"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#sk-luna)"/>`;
  for (const [dx, dy, k] of crateri) {
    s += `<circle cx="${f(cx + dx * R)}" cy="${f(cy + dy * R)}" r="${f(k * R)}" fill="#cfc4ac" fill-opacity=".5"/>`;
    s += `<circle cx="${f(cx + dx * R + k * R * 0.18)}" cy="${f(cy + dy * R + k * R * 0.18)}" r="${f(k * R * 0.78)}" fill="#e6dcc7" fill-opacity=".55"/>`;
  }
  return s;
}

function nuvola(x, y, w, colore = C.n800, a = 0.92) {
  return (
    `<g fill="${colore}" fill-opacity="${a}"><rect x="${x}" y="${y}" width="${w}" height="2.6" rx="1.3"/>` +
    `<rect x="${f(x + w * 0.18)}" y="${f(y - 1.7)}" width="${f(w * 0.46)}" height="2.6" rx="1.3"/>` +
    `<rect x="${f(x + w * 0.42)}" y="${f(y + 1.6)}" width="${f(w * 0.7)}" height="2.2" rx="1.1"/></g>` +
    `<path d="M${f(x + w * 0.2)} ${f(y - 1.6)}H${f(x + w * 0.6)}" stroke="${C.n400}" stroke-opacity=".5" stroke-width=".3" stroke-linecap="round"/>`
  );
}

const PIPISTRELLO =
  'M0 -4.2L1.5 -7L2.2 -3.5Q8 -6 13 -9Q17 -11 23 -8Q20 -6 20 -2Q17 -3.5 15 -1Q12 -3 9.5 .5Q7 -1.5 4 2Q2.5 3.5 0 5Q-2.5 3.5 -4 2Q-7 -1.5 -9.5 .5Q-12 -3 -15 -1Q-17 -3.5 -20 -2Q-20 -6 -23 -8Q-17 -11 -13 -9Q-8 -6 -2.2 -3.5L-1.5 -7Z';
const pipistrello = (x, y, s, rot = 0, colore = C.ombra) =>
  `<path d="${PIPISTRELLO}" fill="${colore}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`;

// Albero spoglio: rami ricorsivi raccolti in un path per livello (pochi nodi da comporre).
function albero(x, y, lungo, angolo, spessore, profondita, seed) {
  const r = semi(seed);
  const livelli = [];
  function ramo(x0, y0, l, a, w, d, liv) {
    const x1 = x0 + Math.cos(a) * l;
    const y1 = y0 + Math.sin(a) * l;
    const qx = (x0 + x1) / 2 + (r() - 0.5) * l * 0.3;
    const qy = (y0 + y1) / 2 + (r() - 0.5) * l * 0.3;
    livelli[liv] ??= { w, d: '' };
    livelli[liv].d += `M${f(x0)} ${f(y0)}Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)}`;
    if (d === 0) return;
    const n = d > 4 ? 2 : r() < 0.55 ? 2 : 3;
    for (let i = 0; i < n; i += 1) {
      const apertura = (i - (n - 1) / 2) * (0.48 + r() * 0.38) + (r() - 0.5) * 0.35;
      const verso = (a + apertura) * 0.9 + (-Math.PI / 2) * 0.1;
      ramo(x1, y1, l * (0.64 + r() * 0.18), verso, Math.max(w * 0.64, 0.14), d - 1, liv + 1);
    }
  }
  ramo(x, y, lungo, angolo, spessore, profondita, 0);
  const radici = `<path d="M${f(x - spessore * 1.6)} ${f(y + 0.6)}Q${f(x - spessore * 0.4)} ${f(y - 1)} ${f(x)} ${f(y - lungo * 0.25)}Q${f(x + spessore * 0.4)} ${f(y - 1)} ${f(x + spessore * 1.6)} ${f(y + 0.6)}Z" fill="${C.ombra}"/>`;
  return `<g fill="none" stroke="${C.ombra}" stroke-linecap="round">${livelli.map((l) => `<path d="${l.d}" stroke-width="${f(l.w)}"/>`).join('')}</g>${radici}`;
}

// Ogni luce che si accende ha un suo ordine (--i): il CSS la fa prendere con due guizzi.
let ordine = 0;
// Centri delle finestre accese delle case (non della villa): la Home ci mette sopra gli aloni che pulsano.
let raccogli = false;
const finestreAccese = [];
// Centri delle lampadine delle luminarie: la scena ci mette sopra aloni che respirano.
const lampadine = [];
const accesa = (contenuto, classe = 'sk-win') => `<g class="${classe}" style="--i:${(ordine++ * 7) % 23}">${contenuto}</g>`;

function finestra(x, y, w, h, lit, opz = {}) {
  const forma = (fill) =>
    opz.arco
      ? `<path d="M${f(x)} ${f(y + h)}V${f(y + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w)} ${f(y + w / 2)}V${f(y + h)}Z" fill="${fill}"/>`
      : `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx=".5" fill="${fill}"/>`;
  let s = forma(C.n900);
  if (lit) {
    const zucca = lit === 'zucca';
    if (raccogli && !zucca) finestreAccese.push([Number(f(x + w / 2)), Number(f(y + h / 2))]);
    s += accesa(
      `<rect x="${f(x - w * 0.9)}" y="${f(y - h * 0.7)}" width="${f(w * 2.8)}" height="${f(h * 2.4)}" fill="url(#${zucca ? 'sk-zucca-alone' : 'sk-finestra-alone'})"/>` +
        forma(zucca ? 'url(#sk-faccia)' : C.finestra),
    );
  }
  s += `<path d="M${f(x + w / 2)} ${f(y + (opz.arco ? 0.6 : 0.3))}V${f(y + h)}M${f(x)} ${f(y + h * 0.45)}H${f(x + w)}" stroke="${C.n800}" stroke-width=".32"/>`;
  s += `<rect x="${f(x - 0.6)}" y="${f(y + h)}" width="${f(w + 1.2)}" height=".8" fill="${C.n500}"/>`;
  if (opz.persiane) {
    s += `<rect x="${f(x - 2.1)}" y="${f(y)}" width="1.8" height="${h}" fill="${C.n600}"/><rect x="${f(x + w + 0.3)}" y="${f(y)}" width="1.8" height="${h}" fill="${C.n600}"/>`;
    if (opz.rotta) s += `<rect x="${f(x + w + 0.3)}" y="${f(y)}" width="1.8" height="${h}" fill="${C.n500}" transform="rotate(24 ${f(x + w + 0.3)} ${f(y)})"/>`;
  }
  if (opz.gatto) {
    const gx = x + w * 0.32;
    const gy = y + h;
    s += `<path d="M${f(gx)} ${f(gy)}q-.3 -2.6 .9 -3.6l-.3 -1.4l1 .9h.9l1 -.9l-.3 1.4q1.2 1 .9 3.6zM${f(gx + 3.1)} ${f(gy)}q1.6 -.2 1.7 -2" fill="${C.ombra}" stroke="${C.ombra}" stroke-width=".3"/>`;
  }
  return s;
}

function casa({ x, w, h, tetto, camino }, seed) {
  const r = semi(seed);
  const top = SUOLO - h;
  let s = '';
  if (camino) {
    s += `<rect x="${x + camino}" y="${f(top - tetto * 0.78)}" width="3.4" height="${f(tetto * 0.78 + 1)}" fill="${C.n700}"/>`;
    s += `<rect x="${x + camino - 0.6}" y="${f(top - tetto * 0.78 - 1.1)}" width="4.6" height="1.3" fill="${C.n600}"/>`;
  }
  s += `<path d="M${x - 2} ${top + 0.5}L${f(x + w / 2)} ${top - tetto}L${x + w + 2} ${top + 0.5}Z" fill="${C.n600}"/>`;
  for (let k = 1; k <= 3; k += 1) {
    const t = k / 4;
    s += `<path d="M${f(x - 2 + (w / 2 + 2) * t)} ${f(top + 0.5 - (tetto + 0.5) * t)}H${f(x + w + 2 - (w / 2 + 2) * t)}" stroke="${C.n700}" stroke-width=".35"/>`;
  }
  s += `<path d="M${x - 2} ${top + 0.5}L${f(x + w / 2)} ${top - tetto}" stroke="${C.n400}" stroke-opacity=".7" stroke-width=".5" stroke-linecap="round"/>`;
  s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${C.n700}"/>`;
  s += `<rect x="${f(x + w * 0.74)}" y="${top}" width="${f(w * 0.26)}" height="${h}" fill="${C.ombra}" fill-opacity=".22"/>`;
  s += `<rect x="${x}" y="${top}" width="${w}" height="1.1" fill="${C.n600}"/>`;
  const cols = w > 34 ? 3 : 2;
  const rows = h > 56 ? 3 : h > 36 ? 2 : 1;
  const gx = w / (cols + 1);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      s += finestra(x + gx * (col + 1) - 2.2, top + 6 + row * 13, 4.4, 6.2, r() > 0.28, { persiane: r() < 0.45 });
    }
  }
  const dx = x + w / 2 - 3;
  s += `<path d="M${f(dx)} ${SUOLO}V${SUOLO - 7}A3 3 0 0 1 ${f(dx + 6)} ${SUOLO - 7}V${SUOLO}Z" fill="${C.n900}" stroke="${C.n600}" stroke-width=".4"/>`;
  s += `<circle cx="${f(dx + 3)}" cy="${SUOLO - 12}" r="3.6" fill="url(#sk-lampadina)"/><circle cx="${f(dx + 3)}" cy="${SUOLO - 12}" r=".75" fill="${C.finestra}"/>`;
  return s;
}

const lapide = (x, y, w, h, rot = 4) =>
  `<g transform="rotate(${rot} ${x + w / 2} ${y})"><path d="M${x} ${y}V${f(y - h + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${x + w} ${f(y - h + w / 2)}V${y}Z" fill="${C.n600}"/>` +
  `<path d="M${f(x + w * 0.25)} ${f(y - h * 0.55)}h${f(w * 0.5)}M${f(x + w * 0.3)} ${f(y - h * 0.38)}h${f(w * 0.4)}" stroke="${C.n800}" stroke-width=".35"/></g>`;

// La villa stregata (in coordinate della locandina, poi scalata): torre storta, frontone, oblò, veranda, gatto.
function villa(x, suolo) {
  let s = '';
  const tw = 13;
  const th = 80;
  const T = suolo - th;
  const bx = x + tw - 1;
  const bw = 40;
  const B = suolo - 58;
  s += `<path d="M${bx - 3} ${B}Q${bx + 9} ${B - 11} ${bx + bw / 2} ${B - 28}Q${bx + bw - 9} ${B - 13} ${bx + bw + 3} ${B}Z" fill="${C.n600}"/>`;
  s += `<path d="M${bx - 3} ${B}Q${bx + 9} ${B - 11} ${bx + bw / 2} ${B - 28}" fill="none" stroke="${C.n400}" stroke-opacity=".75" stroke-width=".55"/>`;
  s += `<rect x="${bx}" y="${B}" width="${bw}" height="58" fill="${C.n800}"/>`;
  s += `<rect x="${bx + bw * 0.72}" y="${B}" width="${bw * 0.28}" height="58" fill="${C.ombra}" fill-opacity=".25"/>`;
  let assi = '';
  for (let yy = B + 3; yy < suolo; yy += 3.2) assi += `M${bx} ${f(yy)}H${bx + bw}`;
  s += `<path d="${assi}" stroke="${C.n700}" stroke-width=".28"/>`;
  s += accesa(
    `<circle cx="${bx + bw / 2}" cy="${B - 10}" r="12" fill="url(#sk-zucca-alone)"/><circle cx="${bx + bw / 2}" cy="${B - 10}" r="4.2" fill="url(#sk-faccia)"/>`,
  );
  s += `<circle cx="${bx + bw / 2}" cy="${B - 10}" r="4.2" fill="none" stroke="${C.n900}" stroke-width=".8"/><path d="M${bx + bw / 2 - 4.2} ${B - 10}h8.4M${bx + bw / 2} ${B - 14.2}v8.4" stroke="${C.n900}" stroke-width=".6"/>`;
  const fin = [
    [bx + 5, B + 8, 'zucca', { gatto: true }],
    [bx + bw / 2 - 2.6, B + 8, false, { persiane: true, rotta: true }],
    [bx + bw - 10.2, B + 8, true, {}],
    [bx + 5, B + 26, true, { persiane: true }],
    [bx + bw - 10.2, B + 26, 'zucca', {}],
  ];
  for (const [fx, fy, lit, o] of fin) s += finestra(fx, fy, 5.2, 9, lit, { arco: true, ...o });
  s += `<rect x="${bx - 2}" y="${suolo - 17}" width="${bw + 4}" height="2.2" fill="${C.n600}"/>`;
  for (const cx of [bx + 1, bx + bw / 2 - 9, bx + bw / 2 + 8, bx + bw - 2]) s += `<rect x="${f(cx)}" y="${suolo - 15}" width="1.2" height="15" fill="${C.n600}"/>`;
  s += `<path d="M${bx + bw / 2 - 4} ${suolo}V${suolo - 9}A4 4 0 0 1 ${bx + bw / 2 + 4} ${suolo - 9}V${suolo}Z" fill="url(#sk-faccia)" stroke="${C.n900}" stroke-width=".5"/>`;
  s += `<path d="M${bx + bw / 2} ${suolo - 13}V${suolo}" stroke="${C.n900}" stroke-width=".7"/>`;
  s += `<rect x="${bx + bw / 2 - 7}" y="${suolo - 0.2}" width="14" height="1.6" fill="${C.n600}"/>`;
  s += `<rect x="${x}" y="${T}" width="${tw}" height="${th}" fill="${C.n700}"/>`;
  s += `<rect x="${x + tw * 0.68}" y="${T}" width="${tw * 0.32}" height="${th}" fill="${C.ombra}" fill-opacity=".25"/>`;
  const px = x + tw * 0.62 + 3.5;
  const py = T - 27;
  s += `<path d="M${x - 2.6} ${T}Q${x + tw * 0.42} ${T - 13} ${f(px)} ${py}Q${x + tw * 0.72} ${T - 12} ${x + tw + 2.6} ${T}Z" fill="${C.n600}"/>`;
  s += `<path d="M${x - 2.6} ${T}Q${x + tw * 0.42} ${T - 13} ${f(px)} ${py}" fill="none" stroke="${C.n400}" stroke-opacity=".75" stroke-width=".55"/>`;
  s += `<path d="M${f(px)} ${py}v-5" stroke="${C.n500}" stroke-width=".4"/>` + pipistrello(f(px), py - 5.6, 0.16, -8, C.n500);
  s += finestra(x + 3.9, T + 9, 5.2, 10, 'zucca', { arco: true });
  s += finestra(x + 3.9, T + 30, 5.2, 9, false, { arco: true });
  s += finestra(x + 3.9, T + 50, 5.2, 9, true, { arco: true });
  s += `<path d="M${x + 1} ${suolo}C${x - 1} ${suolo - 14} ${x + 4} ${suolo - 22} ${x + 1.5} ${suolo - 34}S${x + 3} ${suolo - 52} ${x + 0.5} ${suolo - 60}" fill="none" stroke="${C.ombra}" stroke-width=".6"/>`;
  s += lapide(bx + bw + 4, suolo + 0.4, 4.6, 6.4) + lapide(bx + bw + 10, suolo + 0.4, 3.6, 5, -6);
  return s;
}

function campanile(x, suolo) {
  const w = 9;
  const T = suolo - 64;
  let s = `<rect x="${x}" y="${T}" width="${w}" height="64" fill="${C.n800}"/>`;
  s += `<path d="M${x - 1} ${T}L${x + w / 2} ${T - 11}L${x + w + 1} ${T}Z" fill="${C.n700}"/>`;
  s += `<rect x="${x - 0.8}" y="${T + 0.2}" width="${w + 1.6}" height="1.2" fill="${C.n700}"/><rect x="${x - 0.8}" y="${T + 13}" width="${w + 1.6}" height="1.2" fill="${C.n700}"/>`;
  for (const ax of [x + 1.4, x + 5]) s += `<path d="M${ax} ${T + 12}V${T + 6}A1.3 1.3 0 0 1 ${ax + 2.6} ${T + 6}V${T + 12}Z" fill="${C.finestra}" fill-opacity=".55"/>`;
  s += `<circle cx="${x + w / 2}" cy="${T + 22}" r="2" fill="${C.n700}" stroke="${C.n600}" stroke-width=".3"/>`;
  return s;
}

function filaLontana(suolo, seed) {
  const r = semi(seed);
  let sagome = '';
  let luci = '';
  for (let x = -6; x < W + 6; ) {
    const w = 9 + r() * 10;
    const h = 9 + r() * 15;
    const t = 4 + r() * 4;
    sagome += `M${f(x - 0.8)} ${f(suolo - h)}L${f(x + w / 2)} ${f(suolo - h - t)}L${f(x + w + 0.8)} ${f(suolo - h)}V${suolo + 1}H${f(x - 0.8)}Z`;
    for (let i = 0; i < 3; i += 1) {
      if (r() < 0.55) luci += `M${f(x + 1.5 + r() * (w - 4))} ${f(suolo - h + 2 + r() * (h - 6))}h1.5v2h-1.5z`;
    }
    x += w + 0.5 + r() * 2;
  }
  return `<path d="${sagome}" fill="${C.n800}"/><path d="${luci}" fill="${C.finestra}" fill-opacity=".5"/>`;
}

// Zucca intagliata (sagoma di PumpkinRating.jsx); (x, y) = centro della base.
function zucca(x, y, s, variante = 0, guizzo = false) {
  const tr = `translate(${f(x - 24 * s)} ${f(y - 41.5 * s)}) scale(${s})`;
  const facce = [
    'M14.5 26.5l3.8-5.2 3.8 5.2zM25.9 26.5l3.8-5.2 3.8 5.2zM13 32c3.4 5.6 18.6 5.6 22 0l-3.2 1.2-1.9 2.6-2.8-1.9-3.1 2.6-3.1-2.6-2.8 1.9-1.9-2.6z',
    'M15 22.5q3.2-2.4 6.2 1.6q-3.2 3-6.2-1.6zM26.8 24.1q3-4 6.2-1.6q-3 4.6-6.2 1.6zM22.6 27.6l1.4-2.4 1.4 2.4zM12.6 31q11.4 7.6 22.8 0q-1.6 6.6-11.4 6.6q-9.8 0-11.4-6.6zM17 32.4l1.6 2.2 1.6-1.8zM27.8 32.8l1.6 1.8 1.6-2.2z',
    'M14 25.6l4.6-3.4 2.6 4.4zM26.8 26.6l2.6-4.4 4.6 3.4zM15.4 31.4h17.2l-2.2 4.2h-12.8z',
  ];
  const alone =
    `<ellipse cx="${x}" cy="${f(y - 14 * s)}" rx="${f(46 * s)}" ry="${f(34 * s)}" fill="url(#sk-zucca-alone)"/>` +
    `<ellipse cx="${x}" cy="${f(y)}" rx="${f(30 * s)}" ry="${f(5 * s)}" fill="${C.lampione}" fill-opacity=".18"/>`;
  return (
    (guizzo ? `<g class="sk-candela">${alone}</g>` : alone) +
    `<g transform="${tr}">` +
    `<path d="M22.5 13.5c-.2-4 .8-7.6 4.6-9.5l1.9 2.6c-2.7 1.4-3.4 3.6-3.2 6.9z" fill="${C.stelo}"/>` +
    `<g fill="url(#sk-zucca-corpo)" stroke="${C.zuccaScura}" stroke-width="1"><ellipse cx="14.5" cy="29" rx="10" ry="12.5"/><ellipse cx="33.5" cy="29" rx="10" ry="12.5"/><ellipse cx="24" cy="28.5" rx="10.5" ry="14"/></g>` +
    `<path d="M19 16.5q-3.4 12 0 25.4M29 16.5q3.4 12 0 25.4" fill="none" stroke="${C.zuccaScura}" stroke-width=".8" stroke-opacity=".7"/>` +
    `<path d="M8.4 22q-1.6 4 -.6 9" fill="none" stroke="#ffc08a" stroke-width="1.2" stroke-linecap="round" stroke-opacity=".7"/>` +
    `<path d="${facce[variante % facce.length]}" fill="url(#sk-faccia)" stroke="#7a2a05" stroke-width=".5"/></g>`
  );
}

const nebbia = (cx, cy, rx, ry, a = 1) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sk-nebbia)" opacity="${a}"/>`;

// Filo di luminarie: le lampadine si accendono in fila da sinistra (--i in ordine).
function luminarie(x0, y0, cx, cy, x1, y1, n, k = 1) {
  let s = `<path d="M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}" fill="none" stroke="${C.n500}" stroke-width=".45"/>`;
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
    const by = y + 2.4 * k;
    s += `<rect x="${f(x - 0.55 * k)}" y="${f(y)}" width="${f(1.1 * k)}" height="${f(1.3 * k)}" fill="${C.n500}"/>`;
    s += `<circle cx="${f(x)}" cy="${f(by)}" r="${f(1.05 * k)}" fill="${C.n600}"/>`;
    lampadine.push([Number(f(x)), Number(f(by))]);
    s +=
      `<g class="sk-bulb" style="--i:${i}"><circle cx="${f(x)}" cy="${f(by)}" r="${f(4.4 * k)}" fill="url(#sk-lampadina)"/>` +
      `<circle cx="${f(x)}" cy="${f(by)}" r="${f(1.05 * k)}" fill="${i % 4 === 2 ? C.lampione : C.finestra}"/>` +
      `<circle cx="${f(x - 0.3 * k)}" cy="${f(by - 0.3 * k)}" r="${f(0.32 * k)}" fill="#fffbf2"/></g>`;
  }
  return s;
}

function scena() {
  ordine = 0;
  const r = semi(31);
  let s = DEFS;
  s += `<g class="sk-cielo">${stelle(r, 60)}</g>`;
  s += `<ellipse cx="120" cy="${SUOLO - 4}" rx="170" ry="56" fill="url(#sk-orizzonte)"/>`;
  s += `<g class="sk-luna">${luna(198, 56, 13)}${nuvola(178, 60, 22)}${nuvola(202, 49, 18, C.n700, 0.9)}</g>`;
  s +=
    '<g class="sk-pipistrelli">' +
    [[187, 50, 0.3, -12], [210, 66, 0.22, 10], [218, 46, 0.16, -4], [172, 46, 0.13, 14], [160, 58, 0.1, -8]].map(([x, y, k, a]) => pipistrello(x, y, k, a)).join('') +
    '</g>';
  s += filaLontana(SUOLO - 16, 7);
  s += campanile(126, SUOLO - 16);
  s += `<g class="sk-nebbia">${nebbia(120, SUOLO - 18, 150, 9, 0.9)}</g>`;
  const case_ = [
    { x: -6, w: 28, h: 42, tetto: 12, camino: 5 },
    { x: 26, w: 32, h: 58, tetto: 14, camino: 22 },
    { x: 120, w: 24, h: 36, tetto: 11 },
    { x: 148, w: 34, h: 60, tetto: 14, camino: 6 },
    { x: 186, w: 26, h: 44, tetto: 12 },
    { x: 216, w: 30, h: 52, tetto: 13, camino: 18 },
  ];
  raccogli = true;
  case_.forEach((c, i) => (s += casa(c, 100 + i)));
  raccogli = false;
  // villa scalata attorno alla sua base
  s += `<g transform="translate(64 ${SUOLO}) scale(.8) translate(-64 ${-SUOLO})">${villa(64, SUOLO)}</g>`;
  let cancello = `M64 ${SUOLO - 4.9}h52v.6h-52zM64 ${SUOLO - 1.5}h52v.6h-52z`;
  for (let x = 65; x < 116; x += 2.6) cancello += `M${f(x - 0.3)} ${SUOLO}v-6h.6v6zM${f(x - 0.9)} ${SUOLO - 5.6}l.9 -1.8.9 1.8z`;
  s += `<path d="${cancello}" fill="${C.ombra}"/>`;
  s += `<rect x="-8" y="${SUOLO}" width="${W + 16}" height="${H - SUOLO + 8}" fill="url(#sk-strada)"/>`;
  s += `<rect x="-8" y="${SUOLO}" width="${W + 16}" height=".8" fill="${C.n600}"/>`;
  s += luminarie(-6, 44, 110, 86, 246, 76, 17, 0.95);
  s += albero(4, SUOLO + 1, 26, -Math.PI / 2 + 0.16, 4, 6, 4);
  s += albero(236, SUOLO + 1, 24, -Math.PI / 2 - 0.2, 3.8, 6, 12);
  s += zucca(14, SUOLO + 0.5, 0.15, 0) + zucca(46, SUOLO + 0.6, 0.24, 1, true) + zucca(58, SUOLO + 0.5, 0.13, 2);
  s += zucca(136, SUOLO + 0.5, 0.14, 2) + zucca(170, SUOLO + 0.6, 0.2, 0, true) + zucca(226, SUOLO + 0.5, 0.13, 1);
  s += `<g class="sk-nebbia sk-nebbia--bassa">${nebbia(50, SUOLO + 3, 80, 7)}${nebbia(180, SUOLO + 2, 90, 7)}</g>`;
  return s;
}

const MARKUP = scena();
// Una finestra accesa su due: abbastanza per far vivere il quartiere, poche per il telefono.
export const LUCI = finestreAccese.filter((_, i) => i % 2 === 0);
export const LAMPADINE = lampadine;

function Skyline({ className = '' }) {
  return (
    <svg
      className={`skyline ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: MARKUP }}
    />
  );
}

export default Skyline;

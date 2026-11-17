// Animazione dello splash «Orbita» (approvato dal CEO il 15/11): geometria e tempi da
// marketing/brand/proposte/splash-app-orbita/variante-a.html (playSplash), scheda Halloween di Bagnarola (copiata da tessera-acciaio). 1,5 s in tutto.
// Web Animations API: parte solo quando la pagina e' sullo schermo, vedi Splash.jsx.

// ellisse dell'orbita (master 5/11): centro, semiassi, inclinazione; TH0 = angolo dell'oggetto a riposo
const CX = 22.05, CY = -33, RA = 40, RB = 10, PHI = (-14 * Math.PI) / 180, CF = Math.cos(PHI), SF = Math.sin(PHI);
const P = (t) => [CX + RA * Math.cos(t) * CF - RB * Math.sin(t) * SF, CY + RA * Math.cos(t) * SF + RB * Math.sin(t) * CF];
const TH0 = (() => {
  const dx = 60.03 - CX, dy = -39.63 - CY;
  return Math.atan2((-dx * SF + dy * CF) / RB, (dx * CF + dy * SF) / RA);
})();
// lunghezza d'arco cumulata da TH0: la traccia dell'orbita segue l'oggetto
const SN = 2400, SCUM = new Float64Array(SN + 1);
for (let i = 1; i <= SN; i++) {
  const t = TH0 + (2 * Math.PI * (i - 0.5)) / SN;
  SCUM[i] = SCUM[i - 1] + (Math.hypot(RA * Math.sin(t), RB * Math.cos(t)) * 2 * Math.PI) / SN;
}
const sAt = (th) => {
  const x = ((th - TH0) / (2 * Math.PI)) * SN, i = Math.max(0, Math.min(SN - 1, Math.floor(x)));
  return SCUM[i] + (SCUM[i + 1] - SCUM[i]) * (x - i);
};
const S_TOT = SCUM[SN], S_FRONT = sAt(Math.PI);

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 30; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
const EASE = bezier(0.58, 0.02, 0.18, 1); // partenza morbida, planata lunga
const inv = (v) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (EASE(m) < v) lo = m; else hi = m; }
  return (lo + hi) / 2;
};
const P_BACK = inv((Math.PI - TH0) / (2 * Math.PI)), P_FRONT = inv((2 * Math.PI - TH0) / (2 * Math.PI)); // dietro la A e di nuovo davanti

const T ={ lap0: 40, lap: 720, a0: 220, name: 500, out: 1200, fade: 300 };
const GHOSTS = [22, 44, 70, 100]; // ritardo della scia, ms
const N = 120, MOVE = [], RINGF = [], FRONTF = [];
const depth = (th) => (1 + 0.14 * Math.sin(th)) / (1 + 0.14 * Math.sin(TH0));
for (let i = 0; i <= N; i++) {
  const th = TH0 + 2 * Math.PI * EASE(i / N), [x, y] = P(th), s = sAt(th);
  MOVE.push({ transform: `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px) scale(${depth(th).toFixed(4)})` });
  RINGF.push(1 - s / S_TOT);
  FRONTF.push(1 - Math.min(s, S_FRONT) / S_FRONT);
}
const FRONT_OP = [{ opacity: 1, offset: 0 }, { opacity: 1, offset: P_BACK }, { opacity: 0, offset: P_BACK }, { opacity: 0, offset: P_FRONT }, { opacity: 1, offset: P_FRONT }, { opacity: 1, offset: 1 }];
const BACK_OP = FRONT_OP.map((k) => ({ opacity: 1 - k.opacity, offset: k.offset }));

// Avvia l'animazione dentro `sp`; a 1,2 s, se `pronta` (la pagina sotto) e' risolta, la dissolvenza, altrimenti resta ferma
// sull'ultimo fotogramma fino a quando lo e'. Restituisce la promessa della dissolvenza: quando finisce, lo splash si toglie.
export function gioca(sp, ridotto, pronta) {
  const q = (s) => sp.querySelector(s);
  const go = (el, kf, o) => el.animate(kf, { fill: 'both', ...o });
  const OUT = 'cubic-bezier(.23,1,.32,1)';
  const USCITA = { duration: T.fade, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' };
  const esce = () => Promise.all([new Promise((r) => setTimeout(r, T.out)), pronta]).then(() => {
    if (!ridotto) go(q('.mk'), [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], USCITA);
    return go(sp, [{ opacity: 1 }, { opacity: 0 }], USCITA).finished;
  });
  if (ridotto) {
    go(q('.sp-in'), [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    return esce();
  }
  const ring = q('.ring'), front = q('.front'), L = ring.getTotalLength(), LF = front.getTotalLength();
  ring.style.strokeDasharray = `${L} ${L}`;
  front.style.strokeDasharray = `${LF} ${LF}`;
  const lap = { duration: T.lap, delay: T.lap0, easing: 'linear' };
  go(ring, RINGF.map((f) => ({ strokeDashoffset: f * L })), lap);
  go(front, FRONTF.map((f) => ({ strokeDashoffset: f * LF })), lap);
  const pop = (el) => go(el, [{ transform: 'scale(.35)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 240, delay: T.lap0 - 40, easing: OUT });
  for (const lato of ['F', 'B']) {
    const op = lato === 'F' ? FRONT_OP : BACK_OP, ogg = q('.dot' + lato);
    go(ogg, MOVE, lap);
    go(ogg, op, lap);
    pop(ogg.firstElementChild);
    sp.querySelectorAll('.gh' + lato).forEach((el, i) => {
      const o = { ...lap, delay: T.lap0 + GHOSTS[i] };
      go(el, MOVE, o);
      go(el, op, o);
      pop(el.firstElementChild);
      // la scia si spegne all'atterraggio, cosi' dietro la zucca non resta un disco
      el.firstElementChild.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, delay: o.delay + T.lap - 120, easing: 'ease-out', fill: 'forwards' });
    });
  }
  // la A: le gambe cadono chiuse e si aprono come un compasso, poi la traversa
  go(q('.legs'), [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: T.a0, easing: 'ease-out' });
  go(q('.legL'), [{ transform: 'translateY(-9px) rotate(-17deg)' }, { transform: 'none' }], { duration: 500, delay: T.a0, easing: 'cubic-bezier(.16,1,.3,1)' });
  go(q('.legR'), [{ transform: 'translateY(-9px) rotate(17deg)' }, { transform: 'none' }], { duration: 500, delay: T.a0 + 25, easing: 'cubic-bezier(.16,1,.3,1)' });
  go(q('.bar'), [{ transform: 'scaleX(.25)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, delay: T.a0 + 190, easing: OUT });
  go(q('.halo'), [{ transform: 'scale(1)', opacity: 0.75 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: 420, delay: T.lap0 + T.lap - 60, easing: OUT, fill: 'none' });
  const mk = q('.mk');
  go(mk, [{ transform: 'scale(.93)' }, { transform: 'scale(1)' }], { duration: T.lap0 + T.lap + 80, easing: 'cubic-bezier(.25,.8,.3,1)' });
  go(q('.sp-glow'), [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 800, delay: 40, easing: OUT });
  go(q('.sp-word'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: T.name, easing: OUT });
  return esce();
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { barraSopra } from '../barraSopra.js';
import { gioca } from './orbitaSplash.js';

// Splash Alx Studio «Orbita» (approvata dal CEO il 15/11, standard O1), scheda Halloween di Bagnarola: la A dei master con la
// zucca in orbita e «Alx Studio» sotto, nessun altro testo. 1,5 s; se la pagina non ha finito di caricare resta ferma
// sull'ultimo fotogramma. Una volta per sessione, tocco o tasto per saltare, aria-hidden, l'app carica sotto. Fino a quando
// la pagina non e' sullo schermo si vede solo il fondo, come nell'immagine d'avvio iOS (due fotogrammi prima di partire:
// nell'app iOS WebKit disegna solo a pagina arrivata e l'animazione girerebbe al buio).
const KEY = 'splash-visto';
const SICUREZZA_MS = 8000; // se la pagina non si dichiara mai pronta, lo splash si toglie comunque
const A_RIPOSO = { transform: 'translate(60.026px, -39.629px)' }; // oggetto in orbita a riposo
const NASCOSTO = { ...A_RIPOSO, opacity: 0 };
// ritardi e dimensioni della scia dietro la zucca (raggio, opacita'), dalla variante approvata
const SCIA = [[5.07, 0.34], [4.03, 0.2], [3.12, 0.11], [2.34, 0.05]];
const scia = (lato) => SCIA.map(([r, o]) => (
  <g key={r} className={'gh' + lato} style={NASCOSTO}><circle r={r} fill="#ff6b1a" fillOpacity={o} /></g>
));
// la zucca e' quella del marchio e della splash di ottobre: nessuno stacco e nessuna ombra (variante-a.html, OBJ.zucca)
const zucca = () => (
  <g className="pop">
    <ellipse rx="6.5" ry="5.6" fill="#ff6b1a" />
    <path d="M-2.4 -5.3Q-4.6 0 -2.4 5.3M2.4 -5.3Q4.6 0 2.4 5.3" fill="none" stroke="#b8430f" strokeWidth=".9" />
    <path d="M0 -5.2L1 -8.6" stroke="#6b8f3a" strokeWidth="1.8" strokeLinecap="round" />
  </g>
);

// sessionStorage puo' mancare o lanciare (browser in-app, modalita' privata): in quel caso lo splash si mostra e basta.
const seen = () => {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

// `skip`: route d'arrivo che vanno dritte al contenuto (QR di voto, admin). Si valuta solo al primo montaggio.
export default function Splash({ skip }) {
  const [open, setOpen] = useState(() => !skip && !seen());
  const radice = useRef(null);

  // Prima del primo disegno: dalla Home di iPhone la pagina sta sotto la barra di stato, la splash si alza di mezza barra
  // per restare centrata sullo schermo intero (barraSopra.js). Si rimisura anche al resize del visualViewport: alla
  // chiusura della tastiera iOS non manda il resize della finestra.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const sp = radice.current;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const installata = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    let barra = 0;
    const misura = () => {
      barra = barraSopra(screen.height, innerHeight, innerWidth, ios, installata, barra);
      sp.style.setProperty('--barra', `${barra}px`);
    };
    const vv = window.visualViewport;
    misura();
    window.addEventListener('resize', misura);
    vv?.addEventListener('resize', misura);
    return () => {
      window.removeEventListener('resize', misura);
      vv?.removeEventListener('resize', misura);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* niente storage: pazienza */
    }
    const close = () => setOpen(false);
    const onKey = (e) => {
      if (!['Escape', 'Enter', ' '].includes(e.key)) return;
      e.preventDefault(); // solo se chiude: Invio non deve attivare anche un link sotto
      close();
    };
    let annullato = false;
    let raf = 0;
    const sp = radice.current;
    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pronta = document.readyState === 'complete' ? null : new Promise((ok) => window.addEventListener('load', ok, { once: true }));
    document.fonts?.load('800 16px "AlxDisplay"').catch(() => {}); // serve da 0,5 s, quando compare «Alx Studio»: non si aspetta
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        if (annullato) return;
        if (!sp.animate) return close();
        sp.classList.add('sp-gioca');
        gioca(sp, ridotto, pronta).then(close, () => {});
      });
    });
    const timer = setTimeout(close, SICUREZZA_MS);
    window.addEventListener('keydown', onKey);
    return () => {
      annullato = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="splash" ref={radice} aria-hidden="true" data-testid="splash" onClick={() => setOpen(false)}>
      <div className="sp-in">
        <div className="sp-glow" />
        <svg className="sp-mark" viewBox="-24 -74 96 82" focusable="false">
          <defs>
            <linearGradient id="sp-arancio" gradientUnits="userSpaceOnUse" x1="-17" y1="0" x2="67" y2="0">
              <stop offset="0" stopColor="#ff6b1a" />
              <stop offset="1" stopColor="#ffb238" />
            </linearGradient>
            <mask id="sp-taglio" maskUnits="userSpaceOnUse" x="-60" y="-120" width="200" height="200">
              <rect x="-60" y="-120" width="200" height="200" fill="#fff" />
              <path d="M60.862 -42.677A40 10 -14 0 1 -16.762 -23.323" fill="none" stroke="#000" strokeWidth="7.2" />
            </mask>
          </defs>
          <g className="mk">
            <path className="ring" d="M60.026 -39.629A40 10 -14 0 1 -16.762 -23.323A40 10 -14 0 1 60.862 -42.677A40 10 -14 0 1 60.026 -39.629" fill="none" stroke="url(#sp-arancio)" strokeWidth="2.8" />
            {scia('B')}
            <g className="dotB" style={NASCOSTO}>{zucca()}</g>
            <g mask="url(#sp-taglio)">
              <g className="legs" fill="#f4efe4">
                <path className="leg legL" d="M0.2 0 11.2 -66H22V-54.3H21.4L16.3 0Z" />
                <path className="leg legR" d="M21.6 -66H33L43.9 0H27.9L22.2 -54.3H21.6Z" />
                <path className="bar" d="M10.2 -11V-21H33.3V-11Z" />
              </g>
            </g>
            <path className="front" d="M60.026 -39.629A40 10 -14 0 1 -16.762 -23.323" fill="none" stroke="url(#sp-arancio)" strokeWidth="2.8" />
            {scia('F')}
            <g className="dotF" style={A_RIPOSO}>{zucca()}</g>
            <g transform="translate(60.026 -39.629)"><circle className="halo" r="6.5" fill="none" stroke="#ff6b1a" strokeWidth="1.1" opacity="0" /></g>
          </g>
        </svg>
        <p className="sp-word">Alx Studio</p>
      </div>
    </div>
  );
}

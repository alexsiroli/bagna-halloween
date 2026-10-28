import { useEffect, useState } from 'react';

const KEY = 'splash-visto';
const TOTAL_MS = 2500; // l'uscita (dissolvenza) e' nel CSS: parte a 2100 ms
const REDUCED_MS = 700;

// sessionStorage puo' mancare o lanciare (browser in-app, modalita' privata): in quel caso lo splash si mostra e basta.
const seen = () => {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

const BAT = 'M0 0C-3-4-8-5-12-2C-10-1-9 1-8 3C-6 1-4 1-3 3L0 1L3 3C4 1 6 1 8 3C9 1 10-1 12-2C8-5 3-4 0 0Z';
const BATS = ['splash__bat--1', 'splash__bat--2', 'splash__bat--3'];

// `skip`: route d'arrivo che vanno dritte al contenuto (QR di voto, admin). Si valuta solo al primo montaggio.
export default function Splash({ skip }) {
  const [open, setOpen] = useState(() => !skip && !seen());

  useEffect(() => {
    if (!open) return undefined;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* niente storage: pazienza */
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const close = () => setOpen(false);
    const onKey = (e) => ['Escape', 'Enter', ' '].includes(e.key) && close();
    const timer = setTimeout(close, reduced ? REDUCED_MS : TOTAL_MS);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="splash" aria-hidden="true" onClick={() => setOpen(false)}>
      {BATS.map((cls) => (
        <svg key={cls} className={`splash__bat ${cls}`} viewBox="-13 -6 26 10">
          <path className="splash__wings" d={BAT} />
        </svg>
      ))}
      <svg className="splash__mark" viewBox="-30 -72 114 80">
        <defs>
          <mask id="splash-orbita" maskUnits="userSpaceOnUse" x="-60" y="-90" width="200" height="200">
            <rect x="-60" y="-90" width="200" height="200" fill="#fff" />
            <path d="M62.81 -40.68A40 10 -14 0 1 -14.81 -21.32" fill="none" stroke="#000" strokeWidth="7.2" />
          </mask>
        </defs>
        <path className="splash__orbit" pathLength="1" d="M-14.81 -21.32A40 10 -14 0 1 62.81 -40.68" />
        <path
          className="splash__a"
          d="M0.2 0 11.2 -66H33L43.9 0H27.9L22.2 -54.3H21.4L16.3 0ZM10.2 -11V-21H33.3V-11Z"
          mask="url(#splash-orbita)"
        />
        <path className="splash__orbit" pathLength="1" d="M62.81 -40.68A40 10 -14 0 1 -14.81 -21.32" />
        <g transform="translate(24 -31) rotate(-14)">
          <g className="splash__px">
            <g className="splash__py">
              <ellipse className="splash__pumpkin" rx="6.5" ry="5.6" />
              <path className="splash__ribs" d="M-2.4 -5.3Q-4.6 0 -2.4 5.3M2.4 -5.3Q4.6 0 2.4 5.3" />
              <path className="splash__stem" d="M0 -5.2L1 -8.6" />
            </g>
          </g>
        </g>
      </svg>
      <p className="splash__title">Halloween di Bagnarola</p>
      <p className="splash__sign">app di Alex Siroli</p>
    </div>
  );
}

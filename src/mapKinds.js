// Tipi di casa e di punto: etichette e glifi della mappa, della legenda e delle righe.
// I glifi sono SVG statici scritti qui: nessun dato dei partecipanti finisce in una stringa HTML.
export const KIND_LABELS = { spettacolo: 'Spettacolo', addobbi: 'Casa addobbata' };
export const POINT_LABELS = {
  bar: 'Bar',
  food: 'Food truck',
  wc: 'Servizi igienici',
  parcheggio: 'Parcheggio',
  intrattenimento: 'Intrattenimento',
};
export const isKind = (kind) => Object.hasOwn(KIND_LABELS, kind);
export const ROAD_LABEL = 'Strada chiusa';
// Mattone: strade chiuse, come sulla mappa degli organizzatori.
export const BRICK = '#d9533a';

const text = (char, size) =>
  `<text x="12" y="17.5" text-anchor="middle" font-size="${size}" font-weight="800" fill="currentColor" font-family="Arial, sans-serif">${char}</text>`;

const GLYPHS = {
  spettacolo:
    '<path fill-rule="evenodd" d="M12 2.5A7.5 7.5 0 0 1 19.5 10v11.5l-2.5-2.2-2.5 2.2-2.5-2.2-2.5 2.2L7 19.3l-2.5 2.2V10A7.5 7.5 0 0 1 12 2.5zM8 10.5a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0zM13.4 10.5a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0z" fill="currentColor"/>',
  addobbi:
    '<g fill="currentColor"><path d="M12 6.2 13.3 4l.9 3.1c2.4-.7 4.8-.6 7.3.5-.9 1.2-1.1 2.4-.8 3.8-1-.6-2-.7-3-.3-.5.8-.6 1.7-.4 2.6-1-.7-2-.9-3.1-.6L12 19z"/><path d="M12 6.2 10.7 4l-.9 3.1c-2.4-.7-4.8-.6-7.3.5.9 1.2 1.1 2.4.8 3.8 1-.6 2-.7 3-.3.5.8.6 1.7.4 2.6 1-.7 2-.9 3.1-.6L12 19z"/></g>',
  bar: '<path fill="currentColor" d="M4 4h16l-8 9.5zM11 13h2v6h4v2H7v-2h4z"/>',
  food:
    '<path fill="currentColor" d="M5.5 3h1.5v5.5h1V3h1.5v5.5h1V3h1.5v6.2a2.7 2.7 0 0 1-2.2 2.6V21H7.7v-9.2a2.7 2.7 0 0 1-2.2-2.6zM15.2 3c2 1.4 3 3.8 3 7v2h-1.8v9h-1.7z"/>',
  wc: text('WC', 11),
  parcheggio: text('P', 16),
  intrattenimento:
    '<path fill="currentColor" d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>',
  strada: '<path d="M3 12h18" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" fill="none"/>',
};

export const glyphSvg = (name) =>
  `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${GLYPHS[name] ?? ''}</svg>`;

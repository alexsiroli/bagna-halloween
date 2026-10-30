// Tipi di casa e di punto: etichette e glifi della mappa, della legenda e delle righe.
// I glifi sono SVG statici scritti qui: nessun dato dei partecipanti finisce in una stringa HTML.
export const KIND_LABELS = { spettacolo: 'Spettacolo', addobbi: 'Casa addobbata' };
export const POINT_LABELS = {
  radio: 'Drink e intrattenimento',
  bar: 'Bar',
  food: 'Food truck',
  wc: 'Servizi igienici',
  parcheggio: 'Parcheggio',
  intrattenimento: 'Intrattenimento',
  caramelle: 'Distribuzione caramelle',
};
export const isKind = (kind) => Object.hasOwn(KIND_LABELS, kind);
export const ROAD_LABEL = 'Strada chiusa';

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
  radio:
    '<path fill="currentColor" d="M9 3.5 19 2v13.2a3 3 0 1 1-2-2.8V6.6l-6 .9v10.7a3 3 0 1 1-2-2.8z"/>',
  caramelle:
    '<path fill="currentColor" d="M12 8c-1.2-2.6-3.3-4.3-6.6-4.5C5.2 6 3.6 8.4 2 9.6c1.4.4 2.6 1.5 3 3 .9-.6 1.9-.5 2.6.3.6.7 1.6 1 2.6.3L12 20l1.8-6.8c1 .7 2 .4 2.6-.3.7-.8 1.7-.9 2.6-.3.4-1.5 1.6-2.6 3-3C20.4 8.4 18.8 6 18.6 3.5 15.3 3.7 13.2 5.4 12 8z"/>',
  strada: '<path d="M3 12h18" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" fill="none"/>',
};

export const glyphSvg = (name) =>
  `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${Object.hasOwn(GLYPHS, name) ? GLYPHS[name] : ''}</svg>`;

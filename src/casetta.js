import { glyphSvg, isKind } from './mapKinds.js';

// La casetta col numero: prende il posto della targa quadrata (lista voti, schede, mappa).
// Accesa (data-lit) quando l'hai votata. Solo numeri e glifi fissi nell'HTML: niente testo dei partecipanti.
const FORMA = 'M2 17.5 20 3l7 5.6V4.5h4.5v7.7L38 17.5V38H2z';

export const casettaHtml = (number, { lit = false, kind } = {}) =>
  `<span class="casetta" data-lit="${Boolean(lit)}">` +
  `<svg class="casetta__forma" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="${FORMA}"/></svg>` +
  `<span class="casetta__n">${Number(number)}</span>` +
  (isKind(kind) ? `<span class="chip casetta__tipo" data-t="${kind}">${glyphSvg(kind)}</span>` : '') +
  '</span>';

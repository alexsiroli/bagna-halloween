// Legge e valida l'elenco delle case (CSV o JSON). Lo usano import-houses e geocode-houses.
// CSV: intestazione numero;titolo;via;civico;descrizione;lat;lng (separatore ; o , dall'intestazione).
// JSON: array con gli stessi campi in inglese (number, title, street, civic, description, lat, lng).
import { readFileSync, writeFileSync } from 'node:fs';

// Riquadro plausibile attorno a Cesenatico: fuori da qui un punto e' quasi certamente un errore.
export const BOUNDS = { latMin: 44.0, latMax: 44.4, lngMin: 12.1, lngMax: 12.6 };
export const inBounds = (lat, lng) =>
  lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax;

const CSV_COLUMNS = { numero: 'number', titolo: 'title', via: 'street', civico: 'civic', descrizione: 'description', lat: 'lat', lng: 'lng' };

// Righe di celle; gestisce virgolette, "" e a capo dentro le virgolette.
function parseCsv(text, sep) {
  const rows = [[]];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      rows.at(-1).push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      rows.at(-1).push(cell);
      cell = '';
      rows.push([]);
    } else cell += ch;
  }
  rows.at(-1).push(cell);
  return rows.filter((row) => row.some((c) => c.trim() !== ''));
}

function csvToObjects(text) {
  const head = text.split(/\r?\n/, 1)[0];
  const rows = parseCsv(text, head.split(';').length > head.split(',').length ? ';' : ',');
  const columns = rows[0].map((name) => CSV_COLUMNS[name.trim().toLowerCase()]);
  const unknown = rows[0].filter((_, index) => !columns[index]);
  if (unknown.length) throw new Error(`Intestazione: colonne sconosciute (${unknown.join(', ')}).`);
  return rows.slice(1).map((cells) => Object.fromEntries(columns.map((name, index) => [name, (cells[index] ?? '').trim()])));
}

const coord = (value, name, where) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error(`${where}: ${name} non e' un numero (${value}).`);
  return n;
};

export function readHousesFile(path) {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const json = path.toLowerCase().endsWith('.json');
  let raw;
  if (json) {
    raw = JSON.parse(text);
    if (!Array.isArray(raw)) throw new Error('Il file JSON deve contenere un array di case.');
  } else {
    raw = csvToObjects(text);
    if (raw.length && !('title' in raw[0])) throw new Error('Intestazione: manca la colonna titolo.');
  }
  // Riga 1 = intestazione nel CSV; nel JSON la prima casa e' la riga 1.
  const first = json ? 1 : 2;
  const seen = new Set();
  return raw.map((item, index) => {
    const where = `riga ${index + first}`;
    const number = Number(item.number);
    if (!Number.isInteger(number) || number <= 0) throw new Error(`${where}: numero non valido (${item.number}).`);
    if (seen.has(number)) throw new Error(`${where}: numero ${number} duplicato.`);
    seen.add(number);
    const title = String(item.title ?? '').trim();
    if (!title) throw new Error(`${where}: titolo mancante.`);
    const lat = coord(item.lat, 'lat', where);
    const lng = coord(item.lng, 'lng', where);
    if ((lat === null) !== (lng === null)) throw new Error(`${where}: lat e lng vanno indicati insieme.`);
    if (lat !== null && !inBounds(lat, lng)) throw new Error(`${where}: posizione fuori dal riquadro di Cesenatico (${lat}, ${lng}).`);
    const str = (key) => String(item[key] ?? '').trim();
    return { number, title, street: str('street'), civic: str('civic'), description: str('description'), lat, lng };
  });
}

// Scrive nello stesso formato del nome file (CSV con ; e BOM per Excel, oppure JSON).
export function writeHousesFile(path, houses) {
  if (path.toLowerCase().endsWith('.json')) return writeFileSync(path, `${JSON.stringify(houses, null, 2)}\n`);
  const cell = (v) => (/[;"\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  const lines = houses.map((h) => Object.values(CSV_COLUMNS).map((key) => cell(String(h[key] ?? ''))).join(';'));
  return writeFileSync(path, `\uFEFF${[Object.keys(CSV_COLUMNS).join(';'), ...lines].join('\n')}\n`);
}

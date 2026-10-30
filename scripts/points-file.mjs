// Converte l'elenco dei punti di servizio (CSV) nel file dati letto dalla mappa: public/punti/<edizione>.json.
//   node scripts/points-file.mjs --file <punti.csv> [--note "Strade chiuse dalle 18:30 alle 23:00."] [--out public/punti/2026.json]
// Di default e' una PROVA (stampa il riepilogo); il file si scrive solo con --out.
// CSV: tipo;nome;lat;lng;precisione[;indirizzo] (separatore ; o , dall'intestazione). `precisione` e' solo per chi controlla.
// Le righe strada-chiusa con lo stesso nome (senza «inizio»/«fine» finale) formano una linea nell'ordine del file.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { csvToObjects, inBounds } from './houses-file.mjs';

const COLUMNS = { tipo: 'type', nome: 'name', lat: 'lat', lng: 'lng', precisione: 'precision', indirizzo: 'address' };
const TYPES = {
  bar: 'bar',
  'food-truck': 'food',
  food: 'food',
  'servizi-igienici': 'wc',
  wc: 'wc',
  parcheggio: 'parcheggio',
  intrattenimento: 'intrattenimento',
  radio: 'radio',
  caramelle: 'caramelle',
  spettacolo: 'intrattenimento',
};
const ROAD = 'strada-chiusa';
// «Via Po inizio», «Via Po - fine», «Via Po (inizio)»: serve un separatore, «Via Finestra» non si tocca.
const ENDS = /(?:\s*[-–—]\s*|\s*\(\s*|\s+)(?:inizio|fine)\s*\)?\s*$/i;

const number = (value, name, where) => {
  if (value === '') return null;
  const n = Number(value.replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error(`${where}: ${name} non e' un numero (${value}).`);
  return n;
};

export function convertPoints(text, { note = '' } = {}) {
  const rows = csvToObjects(text.replace(/^\uFEFF/, ''), COLUMNS);
  if (rows.length && !('type' in rows[0] && 'name' in rows[0])) throw new Error('Intestazione: servono le colonne tipo e nome.');
  const warnings = [];
  const points = [];
  const roads = new Map(); // nome senza inizio/fine (minuscolo) -> { name, path }
  rows.forEach((row, index) => {
    const where = `riga ${index + 2}`;
    const type = row.type.toLowerCase();
    if (type !== ROAD && !Object.hasOwn(TYPES, type)) {
      throw new Error(`${where}: tipo sconosciuto (${row.type}). Ammessi: ${[...Object.keys(TYPES), ROAD].join(', ')}.`);
    }
    if (!row.name) throw new Error(`${where}: nome mancante.`);
    const lat = number(row.lat ?? '', 'lat', where);
    const lng = number(row.lng ?? '', 'lng', where);
    if (lat === null || lng === null) {
      warnings.push(`${where}: ${row.name} senza lat/lng, scartata.`);
      return;
    }
    if (!inBounds(lat, lng)) throw new Error(`${where}: posizione fuori dal riquadro di Cesenatico (${lat}, ${lng}).`);
    if (type === ROAD) {
      const name = row.name.replace(ENDS, '');
      const road = roads.get(name.toLowerCase()) ?? { name, path: [] };
      road.path.push([lat, lng]);
      roads.set(name.toLowerCase(), road);
    } else {
      points.push({ type: TYPES[type], name: row.name, ...(row.address ? { address: row.address } : {}), lat, lng });
    }
  });
  const closedRoads = [...roads.values()];
  closedRoads.forEach((road) => {
    if (road.path.length < 2) throw new Error(`Strada chiusa «${road.name}»: servono almeno 2 punti (inizio e fine), ce n'e' ${road.path.length}.`);
  });
  return { json: { ...(note ? { note } : {}), points, closedRoads }, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name) => {
    const index = process.argv.indexOf(`--${name}`);
    return index > -1 ? process.argv[index + 1] : undefined;
  };
  if (!arg('file')) {
    console.error('Uso: node scripts/points-file.mjs --file <punti.csv> [--note "<testo>"] [--out public/punti/2026.json]');
    process.exit(1);
  }
  try {
    const { json, warnings } = convertPoints(readFileSync(arg('file'), 'utf8'), { note: arg('note') });
    warnings.forEach((warning) => console.warn(`[avviso] ${warning}`));
    console.log(`[piano] ${json.points.length} punti, ${json.closedRoads.length} strade chiuse`);
    if (arg('out')) {
      writeFileSync(arg('out'), `${JSON.stringify(json, null, 2)}\n`);
      console.log(`[fatto] scritto ${arg('out')}`);
    } else {
      console.log('Prova completata, nessuna scrittura. Rilancia con --out <file.json> per scrivere.');
    }
  } catch (err) {
    console.error(`File non valido: ${err.message}`);
    process.exit(1);
  }
}

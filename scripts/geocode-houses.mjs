// Ricava lat/lng delle case senza posizione da Nominatim (OpenStreetMap). Si lancia UNA volta sola:
//   node scripts/geocode-houses.mjs --file elenco.csv --out elenco-con-posizioni.csv
// Una richiesta ogni 1,1 s (policy di Nominatim). Scrive il file e elenca le righe non trovate:
// quelle si posizionano a mano dall'admin. Controlla le posizioni prima di importarle.
import { pathToFileURL } from 'node:url';
import { inBounds, readHousesFile, writeHousesFile } from './houses-file.mjs';

const USER_AGENT = 'bagna-halloween (privacy@alxstudio.it)';
const DELAY_MS = 1100;
const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function lookup(house, fetchFn) {
  const q = `${house.street} ${house.civic}, Bagnarola, Cesenatico, Italia`.replace(/\s+,/, ',');
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const response = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return null;
    const [hit] = await response.json();
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lon);
    // Un risultato fuori da Cesenatico e' quasi sempre una via omonima altrove.
    return Number.isFinite(lat) && Number.isFinite(lng) && inBounds(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

// fetch e sleep sono iniettabili per i test (la rete esterna non si prova mai).
export async function geocodeHouses(houses, { fetch: fetchFn = fetch, sleep = sleepMs } = {}) {
  const notFound = [];
  let asked = 0;
  const out = [];
  for (const house of houses) {
    if (house.lat !== null) {
      out.push(house);
      continue;
    }
    let position = null;
    if (house.street) {
      if (asked > 0) await sleep(DELAY_MS);
      asked += 1;
      position = await lookup(house, fetchFn);
    }
    if (!position) notFound.push(house);
    out.push(position ? { ...house, ...position } : house);
  }
  return { houses: out, notFound };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name) => process.argv[process.argv.indexOf(`--${name}`) + 1];
  if (!process.argv.includes('--file') || !process.argv.includes('--out')) {
    console.error('Uso: node scripts/geocode-houses.mjs --file <elenco.csv|json> --out <uscita.csv|json>');
    process.exit(1);
  }
  const { houses, notFound } = await geocodeHouses(readHousesFile(arg('file')));
  writeHousesFile(arg('out'), houses);
  console.log(`[fatto] ${houses.length - notFound.length} case con posizione su ${houses.length}, scritte in ${arg('out')}`);
  notFound.forEach((h) => console.log(`[non trovata] casa ${h.number}: ${h.street} ${h.civic}`.trimEnd()));
}

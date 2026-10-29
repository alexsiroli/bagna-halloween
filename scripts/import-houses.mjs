// Importa l'elenco delle case di un'edizione da CSV/JSON. Di default e' una PROVA: aggiungi --apply.
//   node scripts/import-houses.mjs --edition 2026 --file <elenco.csv|json> [--key <service-account.json>] [--apply]
// Formato del file e geocodifica: scripts/houses-file.mjs, scripts/geocode-houses.mjs, docs/EDIZIONE-2026.md.
// Scrive con merge houses/<edition>_<numero> (visible: true solo alle case nuove: una casa nascosta dall'admin resta nascosta). Non cancella: elenca le case
// dell'edizione che non sono nel file. Con FIRESTORE_EMULATOR_HOST lavora sull'emulatore;
// altrimenti la chiave sta nella cartella privata, fuori dal repo (come prepare-edition.mjs).
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readHousesFile } from './houses-file.mjs';
import { requireOutsideRepo } from './outside-repo.mjs';
import { KEY_FILE, privateDir } from './private-dir.mjs';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const edition = Number(arg('edition'));
const file = arg('file');
const apply = process.argv.includes('--apply');

if (!Number.isInteger(edition) || !file) {
  console.error('Uso: node scripts/import-houses.mjs --edition 2026 --file <elenco.csv|json> [--key <service-account.json>] [--apply]');
  process.exit(1);
}

let houses;
try {
  houses = readHousesFile(file);
} catch (err) {
  console.error(`File non valido: ${err.message}`);
  process.exit(1);
}

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const key = arg('key', join(privateDir(), KEY_FILE));
if (!emulator) requireOutsideRepo(key, '--key');
if (!emulator && !existsSync(key)) {
  console.error('Chiave non trovata: importala con scripts/private.mjs import-key <file> (o passa --key).');
  process.exit(1);
}

// Senza credenziali l'SDK sonda il server dei metadati Google per ~15 s: sull'emulatore non serve.
if (emulator) process.env.GCE_METADATA_HOST ??= '127.0.0.1:9';
initializeApp(
  emulator
    ? { projectId: process.env.GCLOUD_PROJECT || 'demo-bagna-halloween' }
    : { credential: cert(key) },
);
const db = getFirestore();

const inFile = new Set(houses.map((house) => house.number));
const existing = await db.collection('houses').where('edition', '==', edition).get();
const existingNumbers = new Set(existing.docs.map((docSnap) => docSnap.get('number')));
const missing = existing.docs.filter((docSnap) => !inFile.has(docSnap.get('number')));

console.log(`[piano] ${emulator ? 'EMULATORE' : 'PRODUZIONE'}, edizione ${edition}: ${houses.length} case nel file`);
houses.forEach((house) => {
  const where = house.lat === null ? 'senza posizione' : `${house.lat}, ${house.lng}`;
  console.log(`         casa ${house.number}: ${house.title} (${house.street} ${house.civic}`.trimEnd() + `) ${where}${house.kind ? `, tipo ${house.kind}` : ''}`);
});
missing.forEach((docSnap) => console.log(`[non nel file] houses/${docSnap.id} (casa ${docSnap.get('number')}): resta com'e'`));

if (!apply) {
  console.log('Prova completata, nessuna scrittura. Rilancia con --apply per applicare.');
  process.exit(0);
}

const now = FieldValue.serverTimestamp();
for (let start = 0; start < houses.length; start += 400) {
  const batch = db.batch();
  houses.slice(start, start + 400).forEach(({ lat, lng, kind, ...house }) => {
    // Come la posizione: senza tipo nel file non si scrive `kind`, un tipo messo dall'admin non va perso.
    if (kind) house.kind = kind;
    // Senza posizione nel file non si scrive lat/lng: un ritocco fatto dall'admin non va perso.
    const position = lat === null ? {} : { lat, lng };
    // visible solo se la casa e' nuova: per le esistenti lo decide l'admin.
    const visible = existingNumbers.has(house.number) ? {} : { visible: true };
    batch.set(
      db.doc(`houses/${edition}_${house.number}`),
      { ...house, ...position, ...visible, edition, updatedAt: now },
      { merge: true },
    );
  });
  await batch.commit();
}
console.log(`[fatto] ${houses.length} case scritte per l'edizione ${edition}.`);

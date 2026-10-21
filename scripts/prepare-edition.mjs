// Prepara una nuova edizione. Di default e' una PROVA che non scrive nulla: aggiungi --apply.
// Lo lancia il release-manager contro la produzione, DOPO l'export (vedi docs/EDIZIONE-2026.md):
//   node /Volumes/Dev/repos/bagna-halloween/scripts/prepare-edition.mjs --from 2025 --to 2026 \
//     --export-dir /Volumes/Dev/privati/bagna-halloween \
//     --key /Volumes/Dev/privati/bagna-halloween/service-account.json --apply
// --key ed --export-dir devono stare FUORI dal repo.
// 1. Marca `edition: <from>` sulle case che non hanno ancora il campo.
// 2. config/app: edition = <to>, votingOpen = false (si aprono dall'admin la sera dell'evento).
// 3. config/results: classifica ritirata per la nuova edizione.
// Non cancella niente: case e voti degli anni passati restano, filtrati per edizione.
// Con FIRESTORE_EMULATOR_HOST impostato lavora sull'emulatore (--key non serve).
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { requireOutsideRepo } from './outside-repo.mjs';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const from = Number(arg('from', 2025));
const to = Number(arg('to', 2026));
const apply = process.argv.includes('--apply');

if (!Number.isInteger(from) || !Number.isInteger(to) || to <= from) {
  console.error('Uso: node scripts/prepare-edition.mjs --from 2025 --to 2026 --key <service-account.json> [--export-dir <cartella>] [--apply]');
  process.exit(1);
}

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const key = arg('key', '');
if (!emulator && !key) {
  console.error('Passa --key <percorso del JSON del service account, fuori dal repo>.');
  process.exit(1);
}

if (!emulator) requireOutsideRepo(key, '--key');

// L'export sta fuori dal repo: --export-dir e' la cartella data a export-edition.mjs --out.
const exportDir = arg('export-dir', '');
if (exportDir) requireOutsideRepo(exportDir, '--export-dir');
const exportFile = join(exportDir, `edizione-${from}.json`);
const exported = exportDir ? await access(exportFile).then(() => true, () => false) : false;
if (!exported) {
  console.warn(`[attenzione] export ${from} non trovato (--export-dir <cartella>): esegui prima scripts/export-edition.mjs ${from} --out <cartella>.`);
  if (apply && !process.argv.includes('--senza-export')) {
    console.error('Mi fermo. Aggiungi --senza-export solo se l\'export l\'hai gia\' salvato altrove.');
    process.exit(1);
  }
}

initializeApp(
  emulator
    ? { projectId: process.env.GCLOUD_PROJECT || 'demo-bagna-halloween' }
    : { credential: cert(key) },
);
const db = getFirestore();

const housesSnap = await db.collection('houses').get();
const untagged = housesSnap.docs.filter((docSnap) => docSnap.get('edition') === undefined);
const appSnap = await db.doc('config/app').get();

console.log(`[piano] ${emulator ? 'EMULATORE' : 'PRODUZIONE'}`);
console.log(`[piano] case senza edizione da marcare ${from}: ${untagged.length}`);
untagged.forEach((docSnap) => console.log(`         houses/${docSnap.id} (casa ${docSnap.get('number')})`));
console.log(`[piano] config/app: ${JSON.stringify(appSnap.data() ?? {})} -> edition ${to}, votingOpen false`);
console.log(`[piano] config/results: classifica ritirata, edizione ${to}`);

if (!apply) {
  console.log('Prova completata, nessuna scrittura. Rilancia con --apply per applicare.');
  process.exit(0);
}

for (let start = 0; start < untagged.length; start += 400) {
  const batch = db.batch();
  untagged.slice(start, start + 400).forEach((docSnap) => batch.update(docSnap.ref, { edition: from }));
  await batch.commit();
}
const now = FieldValue.serverTimestamp();
await db.doc('config/app').set({ edition: to, votingOpen: false, updatedAt: now }, { merge: true });
await db.doc('config/results').set({ edition: to, published: false, ranking: [], updatedAt: now });
console.log(`[fatto] ${untagged.length} case marcate ${from}; config/app ora e' l'edizione ${to}.`);

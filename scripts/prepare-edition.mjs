// Prepara una nuova edizione. Di default e' una PROVA che non scrive nulla: aggiungi --apply.
// Lo lancia l'utente contro la produzione, DOPO l'export (vedi docs/EDIZIONE-2026.md):
//   GOOGLE_APPLICATION_CREDENTIALS=/percorso/service-account.json node scripts/prepare-edition.mjs --from 2025 --to 2026 --apply
// 1. Marca `edition: <from>` sulle case che non hanno ancora il campo.
// 2. config/app: edition = <to>, votingOpen = false (si aprono dall'admin la sera dell'evento).
// 3. config/results: classifica ritirata per la nuova edizione.
// Non cancella niente: case e voti degli anni passati restano, filtrati per edizione.
// Con FIRESTORE_EMULATOR_HOST impostato lavora sull'emulatore.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { access } from 'node:fs/promises';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const from = Number(arg('from', 2025));
const to = Number(arg('to', 2026));
const apply = process.argv.includes('--apply');

if (!Number.isInteger(from) || !Number.isInteger(to) || to <= from) {
  console.error('Uso: node scripts/prepare-edition.mjs --from 2025 --to 2026 [--apply]');
  process.exit(1);
}

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Imposta GOOGLE_APPLICATION_CREDENTIALS con il percorso del JSON del service account.');
  process.exit(1);
}

const exportFile = `exports/edizione-${from}.json`;
const exported = await access(exportFile).then(() => true, () => false);
if (!exported) {
  console.warn(`[attenzione] ${exportFile} non esiste: esegui prima scripts/export-edition.mjs ${from}.`);
  if (apply && !process.argv.includes('--senza-export')) {
    console.error('Mi fermo. Aggiungi --senza-export solo se l\'export l\'hai gia\' salvato altrove.');
    process.exit(1);
  }
}

initializeApp(
  emulator
    ? { projectId: process.env.GCLOUD_PROJECT || 'demo-bagna-halloween' }
    : { credential: applicationDefault() },
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

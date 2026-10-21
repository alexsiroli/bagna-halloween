// Export in SOLA LETTURA di un'edizione: case, voti, config/app e config/results in JSON.
// Lo lancia il release-manager contro la produzione (vedi docs/EDIZIONE-2026.md):
//   GOOGLE_APPLICATION_CREDENTIALS=/Volumes/Dev/privati/bagna-halloween/sa.json \
//     node scripts/export-edition.mjs 2025 --out /Volumes/Dev/privati/bagna-halloween
// Scrive <out>/edizione-<anno>.json. --out e' obbligatorio e deve stare FUORI dal repo: il file
// contiene uid e nomi dei votanti. Lo stesso vale per la chiave del service account.
// Con FIRESTORE_EMULATOR_HOST impostato legge l'emulatore invece della produzione.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOutsideRepo } from './outside-repo.mjs';

// I documenti creati prima del campo `edition` appartengono al 2025.
const LEGACY_EDITION = 2025;

const edition = Number(process.argv[2]);
const outIndex = process.argv.indexOf('--out');
const out = outIndex > -1 ? process.argv[outIndex + 1] : undefined;
if (!Number.isInteger(edition) || !out) {
  console.error('Uso: node scripts/export-edition.mjs <anno> --out <cartella fuori dal repo>');
  console.error('es.  node scripts/export-edition.mjs 2025 --out /Volumes/Dev/privati/bagna-halloween');
  process.exit(1);
}
requireOutsideRepo(out, '--out');

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Imposta GOOGLE_APPLICATION_CREDENTIALS con il percorso del JSON del service account.');
  process.exit(1);
}
if (!emulator) requireOutsideRepo(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'GOOGLE_APPLICATION_CREDENTIALS');
initializeApp(
  emulator
    ? { projectId: process.env.GCLOUD_PROJECT || 'demo-bagna-halloween' }
    : { credential: applicationDefault() },
);
const db = getFirestore();

const plain = (value) => {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, plain(inner)]));
  }
  return value;
};

const ofEdition = (snapshot) =>
  snapshot.docs
    .filter((docSnap) => (docSnap.get('edition') ?? LEGACY_EDITION) === edition)
    .map((docSnap) => ({ id: docSnap.id, ...plain(docSnap.data()) }));

// Solo letture: get(), mai set/update/delete.
const [housesSnap, votesSnap, appSnap, resultsSnap] = await Promise.all([
  db.collection('houses').get(),
  db.collection('votes').get(),
  db.doc('config/app').get(),
  db.doc('config/results').get(),
]);

const houses = ofEdition(housesSnap).sort((a, b) => a.number - b.number);
const votes = ofEdition(votesSnap);

const summary = houses
  .map((house) => {
    const scores = votes
      .filter((vote) => vote.houseNumber === house.number && vote.score >= 6)
      .map((vote) => vote.score);
    const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    return { number: house.number, title: house.title ?? '', average, count: scores.length };
  })
  .sort((a, b) => (b.average ?? 0) - (a.average ?? 0) || b.count - a.count || a.number - b.number);

const output = {
  edition,
  exportedAt: new Date().toISOString(),
  source: emulator ? 'emulator' : 'production',
  config: { app: plain(appSnap.data() ?? null), results: plain(resultsSnap.data() ?? null) },
  summary,
  houses,
  votes,
};

await mkdir(resolve(out), { recursive: true, mode: 0o700 });
const file = join(resolve(out), `edizione-${edition}.json`);
await writeFile(file, `${JSON.stringify(output, null, 2)}\n`);
console.log(`[export] ${file}: ${houses.length} case, ${votes.length} voti (edizione ${edition}).`);

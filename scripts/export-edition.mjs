// Export in SOLA LETTURA di un'edizione: case, voti, config/app e config/results in JSON.
// Lo lancia l'utente contro la produzione (vedi docs/EDIZIONE-2026.md):
//   GOOGLE_APPLICATION_CREDENTIALS=/percorso/service-account.json node scripts/export-edition.mjs 2025
// Scrive exports/edizione-<anno>.json. La cartella e' ignorata da git: contiene uid e nomi dei votanti.
// Con FIRESTORE_EMULATOR_HOST impostato legge l'emulatore invece della produzione.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { mkdir, writeFile } from 'node:fs/promises';

// I documenti creati prima del campo `edition` appartengono al 2025.
const LEGACY_EDITION = 2025;

const edition = Number(process.argv[2]);
if (!Number.isInteger(edition)) {
  console.error('Uso: node scripts/export-edition.mjs <anno>   es. 2025');
  process.exit(1);
}

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Imposta GOOGLE_APPLICATION_CREDENTIALS con il percorso del JSON del service account.');
  process.exit(1);
}
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

await mkdir('exports', { recursive: true });
const file = `exports/edizione-${edition}.json`;
await writeFile(file, `${JSON.stringify(output, null, 2)}\n`);
console.log(`[export] ${file}: ${houses.length} case, ${votes.length} voti (edizione ${edition}).`);

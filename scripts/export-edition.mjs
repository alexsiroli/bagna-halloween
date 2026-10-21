// Export in SOLA LETTURA di un'edizione: case, voti, config/app e config/results in JSON.
// Lo lancia il release-manager contro la produzione (vedi docs/EDIZIONE-2026.md):
//   node /Volumes/Dev/repos/bagna-halloween/scripts/export-edition.mjs 2025
// Scrive <out>/edizione-<anno>.json. Di default --out e --key stanno nella cartella privata in home
// (vedi private-dir.mjs; la chiave ci arriva con private.mjs import-key). Se passati, devono stare
// FUORI dal repo: il file contiene uid e nomi dei votanti, la chiave da' accesso al database.
// Con FIRESTORE_EMULATOR_HOST impostato legge l'emulatore invece della produzione (--key non serve).
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOutsideRepo } from './outside-repo.mjs';
import { ensurePrivateDir, exportFile, KEY_FILE, privateDir } from './private-dir.mjs';

// I documenti creati prima del campo `edition` appartengono al 2025.
const LEGACY_EDITION = 2025;

const edition = Number(process.argv[2]);
const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
};
const out = arg('out') ?? privateDir();
if (!Number.isInteger(edition)) {
  console.error('Uso: node scripts/export-edition.mjs <anno> [--out <cartella fuori dal repo>] [--key <service-account.json fuori dal repo>]');
  process.exit(1);
}
requireOutsideRepo(out, '--out');

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const key = arg('key') ?? join(privateDir(), KEY_FILE);
if (!emulator) requireOutsideRepo(key, '--key');
if (!emulator && !existsSync(key)) {
  console.error('Chiave non trovata: importala con scripts/private.mjs import-key <file> (o passa --key).');
  process.exit(1);
}
initializeApp(
  emulator
    ? { projectId: process.env.GCLOUD_PROJECT || 'demo-bagna-halloween' }
    : { credential: cert(key) },
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

await (arg('out') ? mkdir(resolve(out), { recursive: true, mode: 0o700 }) : ensurePrivateDir());
const file = join(resolve(out), exportFile(edition));
await writeFile(file, `${JSON.stringify(output, null, 2)}\n`, { mode: 0o600 });
console.log(`[export] ${exportFile(edition)}: ${houses.length} case, ${votes.length} voti (edizione ${edition}).`);

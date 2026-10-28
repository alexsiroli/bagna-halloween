// import-houses sull'emulatore (serve FIRESTORE_EMULATOR_HOST: gira dentro `npm test`, non nella CI senza emulatori).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const EDITION = 2999; // fuori dal seed
const emulator = process.env.FIRESTORE_EMULATOR_HOST;
// Progetto proprio: rules.test.mjs gira in parallelo e svuota demo-bagna-halloween.
const PROJECT = 'demo-import-houses';
// Senza credenziali l'SDK sonda il server dei metadati Google per ~15 s: sull'emulatore non serve.
process.env.GCE_METADATA_HOST ??= '127.0.0.1:9';

test('import: visible solo per le case nuove, una casa nascosta dall\'admin resta nascosta', { skip: !emulator }, async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'import-houses-')), 'case.csv');
  writeFileSync(file, 'numero;titolo;via;civico\n1;Nascosta;Via Po;1\n2;Nuova;Via Po;2\n');
  initializeApp({ projectId: PROJECT });
  const db = getFirestore();
  await db.doc(`houses/${EDITION}_1`).set({ number: 1, edition: EDITION, title: 'Vecchio', visible: false });

  execFileSync(process.execPath, ['scripts/import-houses.mjs', '--edition', String(EDITION), '--file', file, '--apply'], {
    env: { ...process.env, GCLOUD_PROJECT: PROJECT },
    stdio: 'pipe',
  });

  const hidden = (await db.doc(`houses/${EDITION}_1`).get()).data();
  const fresh = (await db.doc(`houses/${EDITION}_2`).get()).data();
  assert.equal(hidden.visible, false);
  assert.equal(hidden.title, 'Nascosta');
  assert.equal(fresh.visible, true);

  await Promise.all([db.doc(`houses/${EDITION}_1`).delete(), db.doc(`houses/${EDITION}_2`).delete()]);
});

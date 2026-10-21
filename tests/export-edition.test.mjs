// Rifiuti di export-edition.mjs: avvengono prima di qualsiasi connessione a Firestore,
// quindi il test non ha bisogno dell'emulatore (e non lo avvia).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const script = join(repo, 'scripts/export-edition.mjs');

// Ambiente senza emulatore né credenziali: se il controllo fallisse, lo script non si connetterebbe comunque.
const env = { ...process.env, FIRESTORE_EMULATOR_HOST: '', GOOGLE_APPLICATION_CREDENTIALS: '' };
const run = (args, extraEnv = {}) =>
  spawnSync('node', [script, ...args], { cwd: repo, env: { ...env, ...extraEnv }, encoding: 'utf8' });

test('senza --out esce con errore', () => {
  const result = run(['2025']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--out/);
});

test('--out dentro il repo esce con errore', () => {
  const result = run(['2025', '--out', join(repo, 'exports')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dentro il repo/);
});

test('--out dentro il repo via ../ esce con errore', () => {
  const result = run(['2025', '--out', join(repo, '..', basename(repo), 'exports')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dentro il repo/);
});

test('--out fuori dal repo viene accettato (si ferma poi sulle credenziali)', () => {
  const result = run(['2025', '--out', join(tmpdir(), 'bagna-halloween-test')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GOOGLE_APPLICATION_CREDENTIALS/);
});

test('chiave del service account dentro il repo esce con errore', () => {
  const result = run(['2025', '--out', join(tmpdir(), 'bagna-halloween-test')], {
    GOOGLE_APPLICATION_CREDENTIALS: join(repo, 'sa.json'),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GOOGLE_APPLICATION_CREDENTIALS sta dentro il repo/);
});

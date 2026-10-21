// Rifiuti di export-edition.mjs e prepare-edition.mjs: avvengono prima di qualsiasi connessione a
// Firestore, quindi i test non hanno bisogno dell'emulatore (e non lo avviano).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const exportScript = join(repo, 'scripts/export-edition.mjs');
const prepareScript = join(repo, 'scripts/prepare-edition.mjs');

// Ambiente senza emulatore: se il controllo fallisse, lo script non si connetterebbe comunque.
const env = { ...process.env, FIRESTORE_EMULATOR_HOST: '' };
const run = (script, args) => spawnSync('node', [script, ...args], { cwd: repo, env, encoding: 'utf8' });
const exportRun = (args) => run(exportScript, args);
const prepareRun = (args) => run(prepareScript, args);

const tmp = mkdtempSync(join(tmpdir(), 'bagna-halloween-test-'));
// Un link a una cartella del repo: stesso caso del symlink HQ progetti/bagna-halloween.
const link = join(tmp, 'repo-link');
symlinkSync(repo, link);
after(() => rmSync(tmp, { recursive: true, force: true }));

test('senza --out esce con errore', () => {
  const result = exportRun(['2025']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--out/);
});

test('--out dentro il repo esce con errore', () => {
  const result = exportRun(['2025', '--out', join(repo, 'exports')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dentro il repo/);
});

test('--out dentro il repo via ../ esce con errore', () => {
  const result = exportRun(['2025', '--out', join(repo, '..', basename(repo), 'exports')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dentro il repo/);
});

test('--out dentro il repo via symlink (cartella non ancora esistente) esce con errore', () => {
  const result = exportRun(['2025', '--out', join(link, 'exports-nuovi')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dentro il repo/);
});

test('--out fuori dal repo viene accettato (si ferma poi sulla chiave)', () => {
  const result = exportRun(['2025', '--out', join(tmp, 'out')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--key/);
});

test('--key dentro il repo esce con errore', () => {
  const result = exportRun(['2025', '--out', join(tmp, 'out'), '--key', join(repo, 'service-account.json')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--key sta dentro il repo/);
});

test('--key dentro il repo via symlink esce con errore', () => {
  const result = exportRun(['2025', '--out', join(tmp, 'out'), '--key', join(link, 'service-account.json')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--key sta dentro il repo/);
});

test('prepare: senza --key esce con errore', () => {
  const result = prepareRun(['--from', '2025', '--to', '2026']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--key/);
});

test('prepare: --key dentro il repo esce con errore', () => {
  const result = prepareRun(['--key', join(repo, 'service-account.json')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--key sta dentro il repo/);
});

test('prepare: --export-dir dentro il repo esce con errore', () => {
  const result = prepareRun(['--key', join(tmp, 'service-account.json'), '--export-dir', join(repo, 'exports')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--export-dir sta dentro il repo/);
});

test('prepare: --export-dir dentro il repo via symlink esce con errore', () => {
  const result = prepareRun(['--key', join(tmp, 'service-account.json'), '--export-dir', join(link, 'dist')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--export-dir sta dentro il repo/);
});

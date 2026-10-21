// Rifiuti di export-edition.mjs e prepare-edition.mjs: avvengono prima di qualsiasi connessione a
// Firestore, quindi i test non hanno bisogno dell'emulatore (e non lo avviano).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const exportScript = join(repo, 'scripts/export-edition.mjs');
const prepareScript = join(repo, 'scripts/prepare-edition.mjs');

const tmp = mkdtempSync(join(tmpdir(), 'bagna-halloween-test-'));
// Senza emulatore: se il controllo fallisse, lo script non si connetterebbe comunque.
// HOME finto: la cartella privata di default finisce in tmp, mai in quella vera.
const env = { ...process.env, FIRESTORE_EMULATOR_HOST: '', HOME: join(tmp, 'home') };
const privateScript = join(repo, 'scripts/private.mjs');
const run = (script, args) => spawnSync('node', [script, ...args], { cwd: repo, env, encoding: 'utf8' });
const exportRun = (args) => run(exportScript, args);
const prepareRun = (args) => run(prepareScript, args);
const privateRun = (args) => run(privateScript, args);
// Un link a una cartella del repo: stesso caso del symlink HQ progetti/bagna-halloween.
const link = join(tmp, 'repo-link');
symlinkSync(repo, link);
after(() => rmSync(tmp, { recursive: true, force: true }));

test('senza anno esce con errore', () => {
  const result = exportRun([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Uso/);
});

test('senza --out e senza chiave importata esce con errore sulla chiave', () => {
  const result = exportRun(['2025']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Chiave non trovata/);
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

test('prepare: senza chiave importata esce con errore sulla chiave', () => {
  const result = prepareRun(['--from', '2025', '--to', '2026']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Chiave non trovata/);
});

test('private: senza sottocomando o senza file esce con errore', () => {
  assert.equal(privateRun([]).status, 1);
  const result = privateRun(['import-key']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Uso/);
});

test('private: import-key con file inesistente o dentro il repo esce con errore', () => {
  assert.match(privateRun(['import-key', join(tmp, 'manca.json')]).stderr, /non esiste/);
  const inside = privateRun(['import-key', join(repo, 'package.json')]);
  assert.equal(inside.status, 1);
  assert.match(inside.stderr, /dentro il repo/);
});

test('private: import-key sposta il file con permessi 600, clean cancella tutto', () => {
  const source = join(tmp, 'chiave-consegnata.json');
  writeFileSync(source, 'SEGRETO');
  const imported = privateRun(['import-key', source]);
  assert.equal(imported.status, 0);
  assert.ok(!existsSync(source), "l'originale deve sparire");
  assert.ok(!imported.stdout.includes('SEGRETO'), 'il contenuto non si stampa');
  const dir = join(tmp, 'home', 'Privati', 'bagna-halloween');
  const file = join(dir, 'service-account.json');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(statSync(dir).mode & 0o777, 0o700);

  const cleaned = privateRun(['clean']);
  assert.equal(cleaned.status, 0);
  assert.match(cleaned.stdout, /cancellati 1 file/);
  assert.ok(!existsSync(dir), 'la cartella viene rimossa');
  assert.match(privateRun(['clean']).stdout, /niente da cancellare/);
});

// Cartelli QR: parsing di --numbers, URL codificati e file scritti da scripts/qr.mjs.
// L'SVG non si decodifica: si verifica l'URL che lo script passa al generatore.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BASE_URL, houseUrl, parseNumbers, qrSvg, siteUrl } from '../scripts/qr.mjs';

const script = fileURLToPath(new URL('../scripts/qr.mjs', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'bagna-halloween-qr-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const run = (args) => spawnSync('node', [script, ...args], { encoding: 'utf8' });

test('--numbers: intervalli, liste, duplicati ignorati, ordine crescente', () => {
  assert.deepEqual(parseNumbers('1-3'), [1, 2, 3]);
  assert.deepEqual(parseNumbers('1-3,15,20-22'), [1, 2, 3, 15, 20, 21, 22]);
  assert.deepEqual(parseNumbers('5,2,2,3-5'), [2, 3, 4, 5]);
  assert.deepEqual(parseNumbers(' 7 , 8 '), [7, 8]);
});

test('--numbers: input sbagliato lancia un errore chiaro', () => {
  for (const bad of ['', 'a', '0', '-3', '1.5', '1-', '1,,2', '5-3', '1-2-3', '10000', undefined]) {
    assert.throws(() => parseNumbers(bad), /--numbers/, `dovrebbe rifiutare ${JSON.stringify(bad)}`);
  }
});

test('URL: base di default, slash finali tolti, rotta /vota/<n>', () => {
  assert.equal(DEFAULT_BASE_URL, 'https://bagna-halloween.netlify.app');
  assert.equal(siteUrl('https://esempio.it'), 'https://esempio.it/');
  assert.equal(siteUrl('https://esempio.it//'), 'https://esempio.it/');
  assert.equal(houseUrl('https://esempio.it/', 12), 'https://esempio.it/vota/12');
});

test('SVG: viewBox senza dimensioni fisse, nero su bianco', () => {
  const svg = qrSvg('https://esempio.it/vota/1');
  assert.match(svg, /^<svg [^>]*viewBox="0 0 \d+ \d+"/);
  assert.doesNotMatch(svg, /<svg [^>]*\b(width|height)=/);
  assert.match(svg, /fill="#fff"/);
  assert.match(svg, /fill="#000"/);
});

test('CLI: scrive qr-sito.svg e un qr-casa-<n>.svg per numero, creando la cartella', () => {
  const out = join(tmp, 'nuova', 'cartella');
  const result = run(['--numbers', '1-2,5', '--out', out, '--base-url', 'https://esempio.it/']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(out).sort(), ['qr-casa-1.svg', 'qr-casa-2.svg', 'qr-casa-5.svg', 'qr-sito.svg']);
  assert.match(readFileSync(join(out, 'qr-casa-5.svg'), 'utf8'), /^<svg /);
  assert.notEqual(readFileSync(join(out, 'qr-casa-1.svg'), 'utf8'), readFileSync(join(out, 'qr-casa-2.svg'), 'utf8'));
});

test('CLI: errori chiari con exit 1 e nessun file scritto', () => {
  const out = join(tmp, 'mai');
  for (const args of [[], ['--numbers', '1-3'], ['--out', out], ['--numbers', 'x', '--out', out], ['--numbers', '1', '--out', out, '--base-url', 'non-un-url']]) {
    const result = run(args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /Uso|--numbers|--base-url/);
  }
  assert.equal(existsSync(out), false);
});

test('CLI: --out senza valore o seguito da un altro flag e\' un errore, non una cartella "--numbers"', () => {
  for (const args of [['--numbers', '1', '--out'], ['--out', '--numbers', '1']]) {
    const result = spawnSync('node', [script, ...args], { encoding: 'utf8', cwd: tmp });
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /--out/);
    assert.equal(existsSync(join(tmp, '--numbers')), false);
  }
});

test('--base-url: normalizzato con URL, mai "//vota"; solo http(s)', () => {
  assert.equal(houseUrl('HTTPS://Esempio.it//', 3), 'https://esempio.it/vota/3');
  assert.equal(siteUrl('http://localhost:5173'), 'http://localhost:5173/');
  for (const bad of ['esempio.it', 'ftp://esempio.it', 'javascript:alert(1)']) {
    assert.throws(() => siteUrl(bad), /--base-url/, bad);
  }
});

test('CLI: se la libreria lancia una stringa (testo troppo lungo) il messaggio e\' leggibile', () => {
  const out = join(tmp, 'lungo');
  const result = run(['--numbers', '1', '--out', out, '--base-url', `https://esempio.it/${'a'.repeat(3000)}`]);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /undefined/);
  assert.match(result.stderr, /overflow|troppo/i);
});

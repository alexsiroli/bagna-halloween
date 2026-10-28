import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { convertPoints } from '../scripts/points-file.mjs';

const HEAD = 'tipo;nome;lat;lng;precisione\n';
const fails = (text, pattern) => assert.throws(() => convertPoints(text), pattern);

test('tipi, nomi dei tipi alternativi, indirizzo e nota', () => {
  const text =
    'tipo;nome;lat;lng;precisione;indirizzo\n' +
    'bar;"Bar; DJ set";44,2;12.34;alta;Via Tobagi 9\n' +
    'food-truck;Panini;44.201;12.341;media;\n' +
    'food;Piadina;44.202;12.342;media;\n' +
    'servizi-igienici;WC;44.203;12.343;bassa;\n' +
    'wc;WC 2;44.204;12.344;bassa;\n' +
    'parcheggio;Via Balitrona;44.205;12.345;alta;\n' +
    'intrattenimento;Trampolieri;44.206;12.346;alta;Via Balitrona 22/C\n' +
    'spettacolo;Fuoco;44.207;12.347;alta;\n';
  const { json, warnings } = convertPoints(text, { note: 'Strade chiuse dalle 18:30.' });
  assert.deepEqual(warnings, []);
  assert.equal(json.note, 'Strade chiuse dalle 18:30.');
  assert.deepEqual(json.closedRoads, []);
  assert.deepEqual(json.points[0], { type: 'bar', name: 'Bar; DJ set', address: 'Via Tobagi 9', lat: 44.2, lng: 12.34 });
  assert.deepEqual(json.points.map((p) => p.type), ['bar', 'food', 'food', 'wc', 'wc', 'parcheggio', 'intrattenimento', 'intrattenimento']);
  assert.equal('address' in json.points[1], false);
});

test('senza --note la chiave note non c\'e\'', () => {
  assert.equal('note' in convertPoints(`${HEAD}bar;B;44.2;12.34;alta\n`).json, false);
});

test('strade chiuse: inizio/fine raggruppati per nome nell\'ordine del file', () => {
  const text =
    HEAD +
    'strada-chiusa;Via Aldo Moro (inizio);44.20;12.33;alta\n' +
    'strada-chiusa;Via Marco Biagi - Inizio;44.21;12.34;alta\n' +
    'strada-chiusa;Via Aldo Moro (fine);44.201;12.331;alta\n' +
    'strada-chiusa;via marco biagi fine;44.211;12.341;alta\n';
  const { json } = convertPoints(text);
  assert.deepEqual(json.points, []);
  assert.deepEqual(json.closedRoads, [
    { name: 'Via Aldo Moro', path: [[44.2, 12.33], [44.201, 12.331]] },
    { name: 'Via Marco Biagi', path: [[44.21, 12.34], [44.211, 12.341]] },
  ]);
});

test('una strada con un solo punto e\' un errore', () => {
  fails(`${HEAD}strada-chiusa;Via Po inizio;44.2;12.3\n`, /Via Po.*almeno 2 punti/i);
});

test('righe senza lat/lng: avviso e scartate', () => {
  const { json, warnings } = convertPoints(`${HEAD}bar;Bar;;;\nwc;WC;44.2;;\nparcheggio;P;44.2;12.34;alta\n`);
  assert.deepEqual(json.points.map((p) => p.name), ['P']);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /riga 2.*senza lat\/lng/i);
  assert.match(warnings[1], /riga 3/);
});

test('errori: tipo sconosciuto con elenco, riquadro, numero, nome, intestazione', () => {
  fails(`${HEAD}giostra;G;44.2;12.34;alta\n`, /riga 2.*tipo.*giostra.*bar.*food-truck.*strada-chiusa/i);
  fails(`${HEAD}bar;B;48.85;2.35;alta\n`, /riga 2.*riquadro/i);
  fails(`${HEAD}bar;B;abc;12.34;alta\n`, /riga 2.*lat/i);
  fails(`${HEAD}bar;;44.2;12.34;alta\n`, /riga 2.*nome/i);
  fails('tipo;nome;colore\nbar;B;rosso\n', /colonne sconosciute.*colore/i);
});

test('CLI: prova di default, --out scrive', () => {
  const dir = mkdtempSync(join(tmpdir(), 'points-file-'));
  const csv = join(dir, 'p.csv');
  const out = join(dir, 'punti.json');
  writeFileSync(csv, `${HEAD}bar;Bar;44.2;12.34;alta\n`);
  const script = fileURLToPath(new URL('../scripts/points-file.mjs', import.meta.url));
  const run = (...args) => execFileSync(process.execPath, [script, '--file', csv, ...args], { encoding: 'utf8' });

  assert.match(run('--out', out, '--note', 'N'), /scritto/i);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), { note: 'N', points: [{ type: 'bar', name: 'Bar', lat: 44.2, lng: 12.34 }], closedRoads: [] });

  rmSync(out);
  assert.match(run(), /prova/i);
  assert.equal(existsSync(out), false);
});

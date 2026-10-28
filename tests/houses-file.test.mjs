import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readHousesFile } from '../scripts/houses-file.mjs';

const dir = mkdtempSync(join(tmpdir(), 'houses-file-'));
const write = (name, text) => {
  const path = join(dir, name);
  writeFileSync(path, text);
  return path;
};
const rejects = (path, pattern) => assert.throws(() => readHousesFile(path), pattern);

test('CSV con punto e virgola, BOM, virgolette e virgola decimale', () => {
  const path = write(
    'a.csv',
    '﻿numero;titolo;via;civico;descrizione;lat;lng\n' +
      '1;"La Casa; delle ""Zucche""";Via Roma;12/A;"Due\nrighe";44,1951;12.3391\n' +
      '2;Il Maniero;Via Po;;;;\n',
  );
  assert.deepEqual(readHousesFile(path), [
    { number: 1, title: 'La Casa; delle "Zucche"', street: 'Via Roma', civic: '12/A', description: 'Due\nrighe', lat: 44.1951, lng: 12.3391 },
    { number: 2, title: 'Il Maniero', street: 'Via Po', civic: '', description: '', lat: null, lng: null },
  ]);
});

test('CSV con virgola riconosciuta dall\'intestazione', () => {
  const path = write('b.csv', 'numero,titolo,via,civico,descrizione,lat,lng\n3,Cripta,Via Po,5,,44.19,12.33\n');
  assert.equal(readHousesFile(path)[0].lat, 44.19);
});

test('JSON con campi in inglese', () => {
  const path = write('c.json', JSON.stringify([{ number: 4, title: 'Ragnatele', street: 'Via Po', lat: 44.19, lng: 12.33 }]));
  assert.deepEqual(readHousesFile(path), [
    { number: 4, title: 'Ragnatele', street: 'Via Po', civic: '', description: '', lat: 44.19, lng: 12.33 },
  ]);
});

test('errori con numero di riga', () => {
  const head = 'numero;titolo;via;civico;descrizione;lat;lng\n';
  rejects(write('d1.csv', `${head}1;A;;;;;\n1;B;;;;;\n`), /riga 3.*duplicato/i);
  rejects(write('d2.csv', `${head}x;A;;;;;\n`), /riga 2.*numero/i);
  rejects(write('d3.csv', `${head}0;A;;;;;\n`), /riga 2.*numero/i);
  rejects(write('d4.csv', `${head}1;;;;;;\n`), /riga 2.*titolo/i);
  rejects(write('d5.csv', `${head}1;A;;;;44.19;\n`), /riga 2.*lat.*lng/i);
  rejects(write('d6.csv', `${head}1;A;;;;48.85;2.35\n`), /riga 2.*riquadro/i);
  rejects(write('d7.csv', `${head}1;A;;;;abc;12.3\n`), /riga 2.*lat/i);
  rejects(write('d8.csv', 'numero;nome\n1;A\n'), /intestazione.*nome/i);
  rejects(write('d9.json', JSON.stringify([{ number: 1, title: 'A' }, { number: -2, title: 'B' }])), /riga 2.*numero/i);
  rejects(write('d10.json', '{}'), /array/i);
});

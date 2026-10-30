import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPoints, parsePoints } from '../src/points.js';

const EMPTY = { note: '', points: [], closedRoads: [] };
const bar = { type: 'bar', name: 'Bar', address: 'Via Tobagi 9', lat: 44.2, lng: 12.34 };
const road = { name: 'Via Aldo Moro', path: [[44.2, 12.33], [44.201, 12.331]] };

test('file valido: nota, punti e strade passano', () => {
  assert.deepEqual(parsePoints({ note: ' Chiuse dalle 18:30. ', points: [bar], closedRoads: [road] }), {
    note: 'Chiuse dalle 18:30.',
    points: [bar],
    closedRoads: [road],
  });
});

test('tipi radio e caramelle accettati', () => {
  const radio = { type: 'radio', name: 'DJ set Radio Studio Più', address: 'Via Walter Tobagi 9', lat: 44.163445, lng: 12.341995 };
  const candy = { type: 'caramelle', name: 'Casa di Corrado Tassinari', address: 'Via Aldo Moro 14', lat: 44.164985, lng: 12.345827 };
  assert.deepEqual(parsePoints({ points: [radio, candy] }).points, [radio, candy]);
});

test('voci malformate scartate, le altre restano', () => {
  const parsed = parsePoints({
    points: [
      bar,
      { ...bar, type: 'giostra' },
      { ...bar, name: '' },
      { ...bar, lat: '44.2' },
      { ...bar, lng: null },
      { ...bar, lat: 91 },
      null,
      { type: 'wc', name: 'WC', lat: 44.21, lng: 12.35, address: 7 },
    ],
    closedRoads: [
      road,
      { name: 'Corta', path: [[44.2, 12.33]] },
      { name: 'Rotta', path: [[44.2, 12.33], [44.2]] },
      { path: road.path },
      { name: 'Senza path' },
    ],
  });
  assert.deepEqual(parsed.points, [bar, { type: 'wc', name: 'WC', lat: 44.21, lng: 12.35 }]);
  assert.deepEqual(parsed.closedRoads, [road]);
});

test('forma sbagliata: nessun punto, mai un errore', () => {
  for (const bad of [null, undefined, 'x', 42, [], { points: 'x', closedRoads: {} }, { note: 5 }]) {
    assert.deepEqual(parsePoints(bad), EMPTY);
  }
});

test('loadPoints: file assente, HTML del redirect SPA o JSON rotto = nessun punto', async () => {
  const warn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    const urls = [];
    const ok = { ok: true, json: async () => ({ points: [bar] }) };
    const loaded = await loadPoints(2026, async (url) => {
      urls.push(url);
      return ok;
    });
    assert.deepEqual(loaded.points, [bar]);
    assert.deepEqual(urls, ['/punti/2026.json']);

    assert.deepEqual(await loadPoints(2026, async () => ({ ok: false, status: 404 })), EMPTY);
    assert.deepEqual(warnings, []); // il 404 e' il caso normale: silenzio

    const html = { ok: true, json: async () => JSON.parse('<!doctype html>') };
    assert.deepEqual(await loadPoints(2026, async () => html), EMPTY);
    assert.deepEqual(
      await loadPoints(2026, async () => {
        throw new TypeError('offline');
      }),
      EMPTY,
    );
    assert.equal(warnings.length, 2);
  } finally {
    console.warn = warn;
  }
});

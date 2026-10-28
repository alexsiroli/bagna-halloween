import assert from 'node:assert/strict';
import test from 'node:test';
import { geocodeHouses } from '../scripts/geocode-houses.mjs';

const house = (number, street, civic, lat = null, lng = null) => ({ number, title: `Casa ${number}`, street, civic, description: '', lat, lng });

// fetch finto: risponde in base all'indirizzo cercato e ricorda le chiamate.
function fakeFetch(answers) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url: new URL(url), headers: options.headers });
    const answer = answers.find(([text]) => new URL(url).searchParams.get('q').startsWith(text));
    if (!answer) return { ok: true, json: async () => [] };
    if (answer[1] === 'http-error') return { ok: false, status: 429, json: async () => [] };
    return { ok: true, json: async () => answer[1] };
  };
  fn.calls = calls;
  return fn;
}

test('interroga solo le righe senza coordinate, con indirizzo e User-Agent', async () => {
  const fetchFn = fakeFetch([['Via Roma 12/A', [{ lat: '44.1951', lon: '12.3391' }]]]);
  const sleeps = [];
  const rows = [house(1, 'Via Roma', '12/A'), house(2, 'Via Po', '5', 44.19, 12.33), house(3, 'Via Po', '7')];
  const { houses, notFound } = await geocodeHouses(rows, { fetch: fetchFn, sleep: async (ms) => sleeps.push(ms) });

  assert.equal(fetchFn.calls.length, 2);
  assert.equal(fetchFn.calls[0].url.searchParams.get('q'), 'Via Roma 12/A, Bagnarola, Cesenatico, Italia');
  assert.equal(fetchFn.calls[0].headers['User-Agent'], 'bagna-halloween (privacy@alxstudio.it)');
  assert.deepEqual([houses[0].lat, houses[0].lng], [44.1951, 12.3391]);
  assert.deepEqual([houses[1].lat, houses[1].lng], [44.19, 12.33]);
  assert.deepEqual(notFound.map((h) => h.number), [3]);
  assert.deepEqual(sleeps, [1100]); // una pausa tra le due richieste, non prima della prima
});

test('civico vuoto: la query non ha spazi in piu', async () => {
  const fetchFn = fakeFetch([['Via X angolo Via Y,', [{ lat: '44.19', lon: '12.33' }]]]);
  const { houses } = await geocodeHouses([house(1, 'Via X angolo Via Y', '')], { fetch: fetchFn, sleep: async () => {} });

  assert.equal(fetchFn.calls[0].url.searchParams.get('q'), 'Via X angolo Via Y, Bagnarola, Cesenatico, Italia');
  assert.equal(houses[0].lat, 44.19);
});

test('risposta fuori dal riquadro, errore HTTP o indirizzo mancante: riga non trovata', async () => {
  const fetchFn = fakeFetch([
    ['Via Lontana', [{ lat: '48.85', lon: '2.35' }]],
    ['Via Rotta', 'http-error'],
  ]);
  const rows = [house(1, 'Via Lontana', '1'), house(2, 'Via Rotta', '2'), house(3, '', '')];
  const { houses, notFound } = await geocodeHouses(rows, { fetch: fetchFn, sleep: async () => {} });

  assert.deepEqual(notFound.map((h) => h.number), [1, 2, 3]);
  assert.equal(houses[0].lat, null);
  assert.equal(fetchFn.calls.length, 2); // senza via non si chiede nulla
});

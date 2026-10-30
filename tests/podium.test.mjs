import assert from 'node:assert/strict';
import { test } from 'node:test';
import { editionOf, positions, sortStats, topThree } from '../src/podium.js';

const row = (houseNumber, scoreAverage, count) => ({ houseNumber, scoreAverage, count });
const rows = [row(1, 0, 0), row(2, 8, 2), row(3, 8, 5), row(4, 9, 1), row(5, 0, 0)];
const order = (list) => list.map((r) => r.houseNumber);

test('sortStats: media desc, a parita piu voti, senza voti in fondo', () => {
  assert.deepEqual(order(sortStats(rows, { field: 'scoreAverage', direction: 'desc' })), [4, 3, 2, 1, 5]);
});

test('sortStats: media asc tiene le case senza voti in fondo; altri campi con spareggio per numero', () => {
  assert.deepEqual(order(sortStats(rows, { field: 'scoreAverage', direction: 'asc' })), [3, 2, 4, 1, 5]);
  assert.deepEqual(order(sortStats(rows, { field: 'count', direction: 'desc' })), [3, 2, 4, 1, 5]);
  assert.deepEqual(order(sortStats(rows, { field: 'houseNumber', direction: 'asc' })), [1, 2, 3, 4, 5]);
});

test('positions: classifica per media, senza voti nessuna posizione', () => {
  const pos = positions(rows);
  assert.deepEqual([...pos.entries()], [[4, 1], [3, 2], [2, 3]]);
  assert.equal(pos.has(1), false);
});

const house = (number, title) => ({ number, title });
const vote = (houseNumber, score) => ({ houseNumber, score });

test('editionOf: senza campo edition il documento e del 2025', () => {
  assert.equal(editionOf({ number: 1 }), 2025);
  assert.equal(editionOf({ edition: 2026 }), 2026);
  assert.equal(editionOf({ edition: 2025 }), 2025);
});

test('topThree: massimo tre case, media piu alta prima, media e voti calcolati a mano', () => {
  const houses = [house(1, 'A'), house(2, 'B'), house(3, 'C'), house(4, 'D')];
  const votes = [vote(1, 10), vote(1, 9), vote(2, 8), vote(3, 7), vote(3, 7), vote(4, 6)];
  assert.deepEqual(topThree(houses, votes), [
    { number: 1, title: 'A', avg: 9.5, votes: 2 },
    { number: 2, title: 'B', avg: 8, votes: 1 },
    { number: 3, title: 'C', avg: 7, votes: 2 },
  ]);
});

test('topThree: a parita di media vince chi ha piu voti, poi il numero piu basso', () => {
  const houses = [house(5, 'E'), house(2, 'B'), house(9, 'I'), house(3, 'C')];
  const votes = [vote(5, 8), vote(2, 8), vote(9, 8), vote(9, 8), vote(3, 8)];
  assert.deepEqual(
    topThree(houses, votes).map((r) => r.number),
    [9, 2, 3],
  );
});

test('topThree: ignora voti sotto 6 e voti di case inesistenti; titolo mancante diventa stringa vuota', () => {
  const houses = [{ number: 1 }, house(2, 'B')];
  const votes = [vote(1, 8), vote(2, 5), vote(2, 0), vote(99, 10)];
  assert.deepEqual(topThree(houses, votes), [{ number: 1, title: '', avg: 8, votes: 1 }]);
});

test('topThree: nessun voto valido, lista vuota', () => {
  assert.deepEqual(topThree([house(1, 'A')], []), []);
  assert.deepEqual(topThree([house(1, 'A')], [vote(1, 4)]), []);
});

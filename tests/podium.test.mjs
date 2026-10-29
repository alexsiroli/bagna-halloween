import assert from 'node:assert/strict';
import { test } from 'node:test';
import { editionOf, topThree } from '../src/podium.js';

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

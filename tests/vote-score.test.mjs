import assert from 'node:assert/strict';
import test from 'node:test';
import { clampScore, countVoted, isVoted } from '../src/voteScore.js';

test('isVoted: conta solo da 6 in su, il criterio di /vote', () => {
  assert.equal(isVoted({ score: 6 }), true);
  assert.equal(isVoted({ score: 10 }), true);
  assert.equal(isVoted({ score: 5 }), false);
  assert.equal(isVoted({ score: 0 }), false);
  assert.equal(isVoted(undefined), false);
});

test('countVoted: solo le case visibili con un voto valido', () => {
  const houses = [{ number: 1 }, { number: 2 }, { number: 3 }];
  // La casa 9 e' nascosta: il suo voto non conta. La 2 ha 0 (voto tolto).
  const votes = new Map([[1, { score: 8 }], [2, { score: 0 }], [9, { score: 7 }]]);
  assert.equal(countVoted(houses, votes), 1);
  assert.equal(countVoted(houses, new Map()), 0);
});

test('clampScore: 0 toglie il voto, il resto sta tra 6 e 10, il non numerico vale 0', () => {
  assert.equal(clampScore(0), 0);
  assert.equal(clampScore(-3), 0);
  assert.equal(clampScore(3), 6);
  assert.equal(clampScore(8), 8);
  assert.equal(clampScore(15), 10);
  assert.equal(clampScore('9'), 9);
  assert.equal(clampScore('x'), 0);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { dateToRome, formatEnd, romeToDate } from '../src/votingTime.js';

test('estate (CEST, UTC+2): 12:00 a Roma sono le 10:00 UTC', () => {
  assert.equal(romeToDate('2026-07-15T12:00').toISOString(), '2026-07-15T10:00:00.000Z');
  assert.equal(dateToRome(new Date('2026-07-15T10:00:00Z')), '2026-07-15T12:00');
});

test('inverno (CET, UTC+1): 20:30 a Roma sono le 19:30 UTC', () => {
  assert.equal(romeToDate('2026-12-01T20:30').toISOString(), '2026-12-01T19:30:00.000Z');
});

test('cambio d ora del 25/10/2026: prima e dopo le 03:00 CEST', () => {
  // 01:30 e ancora ora legale (UTC+2), 03:30 e ora solare (UTC+1).
  assert.equal(romeToDate('2026-10-25T01:30').toISOString(), '2026-10-24T23:30:00.000Z');
  assert.equal(romeToDate('2026-10-25T03:30').toISOString(), '2026-10-25T02:30:00.000Z');
  assert.equal(romeToDate('2026-10-24T23:59').toISOString(), '2026-10-24T21:59:00.000Z');
  assert.equal(dateToRome(new Date('2026-10-25T02:30:00Z')), '2026-10-25T03:30');
  assert.equal(dateToRome(new Date('2026-10-24T23:30:00Z')), '2026-10-25T01:30');
});

test('andata e ritorno non dipendono dal fuso del browser', () => {
  for (const s of ['2026-10-29T22:00', '2026-03-29T04:00', '2026-10-25T04:15', '2026-01-01T00:00']) {
    assert.equal(dateToRome(romeToDate(s)), s);
  }
});

test('valore non valido: null', () => {
  assert.equal(romeToDate(''), null);
  assert.equal(romeToDate('ieri'), null);
});

test('formatEnd: solo ora se e oggi a Roma, con data altrimenti', () => {
  const now = new Date('2026-10-29T10:00:00Z');
  assert.equal(formatEnd(new Date('2026-10-29T19:30:00Z'), now), '20:30');
  assert.equal(formatEnd(new Date('2026-10-30T19:30:00Z'), now), '30/10 20:30');
  // 23:30 UTC del 29 e gia il 30 a Roma.
  assert.equal(formatEnd(new Date('2026-10-29T23:30:00Z'), now), '30/10 00:30');
});

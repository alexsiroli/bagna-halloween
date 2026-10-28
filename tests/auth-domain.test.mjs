// Scelta dell'authDomain di Firebase in base all'host che serve il sito.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveAuthDomain } from '../src/authDomain.js';

const ENV = 'bagna-halloween.netlify.app';

test('halloween.alxstudio.it usa se stesso (login same-origin via proxy)', () => {
  assert.equal(resolveAuthDomain('halloween.alxstudio.it', ENV), 'halloween.alxstudio.it');
  assert.equal(resolveAuthDomain('halloween.alxstudio.it', undefined), 'halloween.alxstudio.it');
});

test('gli altri host usano il valore della variabile', () => {
  for (const host of [
    'bagna-halloween.netlify.app',
    'deploy-preview-11--bagna-halloween.netlify.app',
    'localhost',
    '127.0.0.1',
    'evil-halloween.alxstudio.it.example.com',
    undefined,
  ]) {
    assert.equal(resolveAuthDomain(host, ENV), ENV, String(host));
  }
});

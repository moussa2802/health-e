// Lancer : node --test netlify/functions/_tests/korisFreeFirst.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _splitFirstFree, FREE_FIRST_TESTS } = require('../koris-spend');

test('3 premiers tests offerts pour un compte neuf', () => {
  assert.equal(FREE_FIRST_TESTS, 3);
  const r = _splitFirstFree(['gad7'], {}, 0);
  assert.deepEqual(r.firstFree, ['gad7']);
  assert.deepEqual(r.stillBillable, []);
});

test('le 4e test est payant', () => {
  const r = _splitFirstFree(['rses'], { gad7: 1, phq9: 1, hsp: 1 }, 3);
  assert.deepEqual(r.firstFree, []);
  assert.deepEqual(r.stillBillable, ['rses']);
});

test('un test déjà passé n\'est jamais « premier test offert »', () => {
  const r = _splitFirstFree(['gad7'], { gad7: 1 }, 1);
  assert.deepEqual(r.firstFree, []);
  assert.deepEqual(r.stillBillable, ['gad7']);
});

test('le quota restant est respecté quand plusieurs tests arrivent ensemble', () => {
  const r = _splitFirstFree(['a', 'b', 'c'], {}, 2);
  assert.deepEqual(r.firstFree, ['a']);
  assert.deepEqual(r.stillBillable, ['b', 'c']);
});

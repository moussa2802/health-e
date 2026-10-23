import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryFromTimeZone, getCrisisResources } from '../../src/data/crisisResources.ts';

test('fuseau : Dakar et inconnu → Sénégal, Paris → France, Toronto → Canada', () => {
  assert.equal(countryFromTimeZone('Africa/Dakar'), 'SN');
  assert.equal(countryFromTimeZone(''), 'SN');
  assert.equal(countryFromTimeZone('Africa/Abidjan'), 'SN');
  assert.equal(countryFromTimeZone('Europe/Paris'), 'FR');
  assert.equal(countryFromTimeZone('America/Toronto'), 'CA');
});

test('Sénégal : 1515 en premier, jamais le 3114', () => {
  const r = getCrisisResources('SN');
  assert.equal(r[0].phone, '1515');
  assert.ok(!r.some(x => x.phone === '3114'));
});

test('hors Sénégal : numéro local puis numéros du Sénégal', () => {
  const r = getCrisisResources('CA');
  assert.equal(r[0].phone, '988');
  assert.ok(r.some(x => x.phone === '1515'));
});

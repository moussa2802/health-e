import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanCompanionName } from '../../src/utils/companion.ts';

test('un prénom ou un surnom passe, nettoyé', () => {
  assert.equal(cleanCompanionName('Kora'), 'Kora');
  assert.equal(cleanCompanionName('  Ami   fidèle '), 'Ami fidèle');
  assert.equal(cleanCompanionName("N'Diaye"), "N'Diaye");
});

test('docteur, Dr, médecin, Lô : refusés', () => {
  for (const n of ['Dr Lô', 'docteur', 'Mon Docteur', 'Médecin', 'DOC', 'dr.lo', 'Lô', 'Pr Sow']) assert.equal(cleanCompanionName(n), '', n);
});

test('vide, trop long, signes étranges : refusés', () => {
  for (const n of ['', '   ', 'x'.repeat(25), '<b>', 'a;b', null, undefined]) assert.equal(cleanCompanionName(n), '', String(n));
});

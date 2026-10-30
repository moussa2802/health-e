import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learnRatio, norm, practiceMatches, themesInUse } from '../../src/utils/practiceFilter.ts';

const label = (id: string) => ({ stress: 'Stress', sommeil: 'Sommeil', sexualite: 'Sexualité' }[id] ?? id);
const resp = { title: 'Respiration lente 4-6', summary: 'Calmer le corps quand le stress monte.', theme: 'stress' };
const carnet = { title: 'Le carnet du désir', summary: 'Comprendre ce qui fait varier ton désir.', theme: 'sexualite' };

test('recherche sans accents ni majuscules, tous les mots', () => {
  assert.equal(norm('Désir'), 'desir');
  assert.equal(practiceMatches(carnet, 'DESIR', '', label), true);
  assert.equal(practiceMatches(carnet, 'carnet desir', '', label), true);
  assert.equal(practiceMatches(carnet, 'carnet sommeil', '', label), false);
  assert.equal(practiceMatches(resp, 'sexualite', '', label), false);
  assert.equal(practiceMatches(carnet, 'sexualité', '', label), true); // trouve par le nom du thème
  assert.equal(practiceMatches(resp, '', '', label), true);
});

test('le thème choisi restreint la liste', () => {
  assert.equal(practiceMatches(resp, '', 'stress', label), true);
  assert.equal(practiceMatches(resp, '', 'sexualite', label), false);
});

test('seuls les thèmes qui ont un outil sont proposés, dans l\'ordre voulu', () => {
  assert.deepEqual(themesInUse([resp, carnet], ['sommeil', 'sexualite', 'stress']), ['sexualite', 'stress']);
  assert.deepEqual(themesInUse([], ['stress']), []);
});

test('barre d\'avancement bornée', () => {
  assert.equal(learnRatio(2, 5), 0.4);
  assert.equal(learnRatio(7, 5), 1);
  assert.equal(learnRatio(0, 0), 0);
});

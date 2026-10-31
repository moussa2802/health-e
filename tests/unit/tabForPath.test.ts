import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tabForPath } from '../../src/utils/tabForPath.ts';

test('les quatre onglets ont leurs pages', () => {
  assert.equal(tabForPath('/'), 'accueil');
  assert.equal(tabForPath('/chaines/abc'), 'accueil');
  assert.equal(tabForPath('/messages-dr-lo/x'), 'accueil');
  assert.equal(tabForPath('/espace/mental'), 'tests');
  assert.equal(tabForPath('/espace/bonus'), 'tests');
  assert.equal(tabForPath('/espace/intime'), 'tests');
  assert.equal(tabForPath('/espace/resultat/gad7'), 'tests');
  assert.equal(tabForPath('/compagnon'), 'compagnon');
  assert.equal(tabForPath('/journal'), 'compagnon');
  assert.equal(tabForPath('/espace'), 'moi');
  assert.equal(tabForPath('/routine'), 'moi');
  assert.equal(tabForPath('/boite-a-outils'), 'moi');
  assert.equal(tabForPath('/boite-a-questions'), 'accueil');
});

test('la barre se cache pendant un test, un exercice, un défi joué et sur les pages légales', () => {
  for (const p of ['/assessment/quiz/abc', '/pratique/x', '/d/slug', '/c/abc', '/compat/XYZ', '/confidentialite', '/drlo', '/equipe', '/admin/dashboard', '/assessment/totem']) {
    assert.equal(tabForPath(p), null, p);
  }
});

test('une barre oblique finale ne change rien', () => {
  assert.equal(tabForPath('/espace/mental/'), 'tests');
  assert.equal(tabForPath('/compagnon/'), 'compagnon');
});

test('les pages partagées gardent l\'onglet d\'où l\'on vient', () => {
  assert.equal(tabForPath('/outils', 'accueil'), 'accueil');
  assert.equal(tabForPath('/routine', 'accueil'), 'accueil');
  assert.equal(tabForPath('/chaines', 'moi'), 'moi');
  assert.equal(tabForPath('/outils', null), 'moi');
  assert.equal(tabForPath('/espace', 'accueil'), 'moi');
});

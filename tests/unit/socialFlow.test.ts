import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startDefi, defiNext, flowChips, cleanDisplayName, parseCompatCode, flowWantsText, startCompat, titreFor } from '../../src/utils/socialFlow.ts';

const cats = [{ id: 'amitie', emoji: '🫂', label: 'Amitié', subTypes: [{ id: 'meilleur_ami', emoji: '⭐', label: 'Meilleur(e) ami(e)' }] }];

test('Défi : audience → nom → genre → durée → dévoilement → préparation', () => {
  let f = startDefi();
  assert.equal(flowChips(f, { categories: cats }).length, 5);
  f = { ...f, data: { audience: 'amis' } };
  let n = defiNext(f); assert.equal(n.flow.step, 'defi_name');
  assert.deepEqual(flowChips(n.flow, { prenom: 'Papa', categories: cats }), [{ label: 'Papa', value: 'flow:name:Papa' }]);
  assert.ok(flowWantsText(n.flow));
  f = { ...n.flow, data: { ...n.flow.data, displayName: 'Papa' } };
  n = defiNext(f); assert.equal(n.flow.step, 'defi_genre');
  f = { ...n.flow, data: { ...n.flow.data, genre: 'masculin', duration: 72 } };
  n = defiNext(f); assert.equal(n.flow.step, 'defi_reveal');
  f = { ...n.flow, data: { ...n.flow.data, devoilement: 'auto' } };
  n = defiNext(f); assert.equal(n.flow.step, 'defi_creating');
  assert.equal(titreFor('amis'), 'Défi entre amis');
});

test('nom et code validés', () => {
  assert.equal(cleanDisplayName('  Papa   Moussa '), 'Papa Moussa');
  assert.equal(cleanDisplayName('x'), null);
  assert.equal(cleanDisplayName('http://x.com'), null);
  assert.deepEqual(parseCompatCode('he-mnt-2026-ab12'), { code: 'HE-MNT-2026-AB12', type: 'mental' });
  assert.deepEqual(parseCompatCode('HE-SEX-2026-ZZ99'), { code: 'HE-SEX-2026-ZZ99', type: 'sexual' });
  assert.equal(parseCompatCode('bonjour'), null);
});

test('Compatibilité : catégories puis sous-types', () => {
  const f = startCompat();
  assert.equal(flowChips(f, { categories: cats })[0].value, 'flow:cat:amitie');
  const g = { ...f, step: 'compat_sub' as const, data: { relCategory: 'amitie' } };
  assert.equal(flowChips(g, { categories: cats })[0].value, 'flow:sub:meilleur_ami');
});

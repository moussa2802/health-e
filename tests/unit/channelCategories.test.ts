// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHANNEL_CATEGORIES, MAX_CHANNEL_CATEGORIES, categoryLabel, channelMatches } from '../../src/utils/channelCategories.ts';

const ch = { name: 'Érection et désir : parlons vrai, entre hommes', description: '8 vocaux sans détour sur la performance.', categories: ['sante-sexuelle', 'homme'] };

test('catégories : ids uniques et libellés', () => {
  assert.equal(new Set(CHANNEL_CATEGORIES.map(c => c.id)).size, CHANNEL_CATEGORIES.length);
  assert.equal(categoryLabel('sante-mentale'), 'Santé mentale');
  assert.equal(categoryLabel('inconnue'), 'inconnue');
  assert.equal(MAX_CHANNEL_CATEGORIES, 4);
});

test('recherche : sans accents, sans majuscules, tous les mots', () => {
  assert.ok(channelMatches(ch, ''));
  assert.ok(channelMatches(ch, 'erection'));
  assert.ok(channelMatches(ch, 'DÉSIR hommes'));
  assert.ok(channelMatches(ch, 'performance'));
  assert.ok(!channelMatches(ch, 'deuil'));
  assert.ok(!channelMatches(ch, 'erection deuil'));
});

test('recherche : trouve aussi par le nom de la catégorie', () => {
  assert.ok(channelMatches(ch, 'sante sexuelle'));
  assert.ok(channelMatches(ch, 'pour les hommes'));
  assert.ok(!channelMatches(ch, 'sante mentale'));
  assert.ok(channelMatches({ name: 'Autre', description: 'Texte long ici', categories: undefined }, 'autre'));
});

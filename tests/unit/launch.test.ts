// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featureOn, openForAll, DEFAULT_LAUNCH } from '../../src/utils/launch.ts';

test('vague 1 : tout ce qui vient après est caché, même avec beaucoup de tests', () => {
  const p = { tests: 10, animal: true };
  for (const k of ['confier', 'programme', 'compat', 'chaines', 'penc_page', 'question'] as const) assert.equal(featureOn(k, DEFAULT_LAUNCH, p), false, k);
});

test('vague 2 : chacun débloque selon sa progression', () => {
  const cfg = { wave: 2, open: [], closed: [] };
  assert.equal(featureOn('confier', cfg, { tests: 0, animal: false }), false);
  assert.equal(featureOn('confier', cfg, { tests: 1, animal: false }), true);
  assert.equal(featureOn('programme', cfg, { tests: 2, animal: false }), false);
  assert.equal(featureOn('programme', cfg, { tests: 3, animal: false }), true);
  assert.equal(featureOn('defis', cfg, { tests: 7, animal: false }), false);
  assert.equal(featureOn('defis', cfg, { tests: 7, animal: true }), true);
  assert.equal(featureOn('compat', cfg, { tests: 7, animal: true }), false);
});

test('exceptions : « toujours ouverte » passe avant la vague et la progression, « toujours cachée » ferme tout', () => {
  assert.equal(featureOn('penc_page', { wave: 1, open: ['penc_page'], closed: [] }, null), true);
  assert.equal(featureOn('confier', { wave: 1, open: ['confier'], closed: [] }, { tests: 0, animal: false }), true);
  assert.equal(openForAll('compat', { wave: 4, open: [], closed: ['compat'] }), false);
});

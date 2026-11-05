const { test } = require('node:test');
const assert = require('node:assert/strict');
const LA = require('../_launch.js');

test('vague 1 : rien de ce qui est en suspens n\'est proposé', () => {
  const open = LA.openFeatures({ wave: 1, open: ['penc_page'], closed: [] }, { scaleResults: { a: 1, b: 1, c: 1 }, totem: { animal: 'cerf', revealedAt: 1 } });
  assert.equal(open.programme, false);
  assert.equal(open.chaines, false);
  assert.equal(open.routine, false);
  assert.equal(open.penc_page, true);
  assert.equal(LA.allowedAction({ kind: 'programme' }, open), false);
  assert.equal(LA.allowedAction({ kind: 'chaine', id: 'x' }, open), false);
  assert.equal(LA.allowedAction({ kind: 'test', scaleId: 'gad7' }, open), true);
  assert.equal(LA.allowedAction({ kind: 'respiration' }, open), true);
  assert.match(LA.launchBlock(open), /PAS ENCORE OUVERT[\s\S]*programme/);
});

test('vague 2 : le programme s\'ouvre après 3 tests, les défis après l\'animal', () => {
  const few = LA.openFeatures({ wave: 2 }, { scaleResults: { a: 1 } });
  assert.equal(few.confier, true);
  assert.equal(few.programme, false);
  const more = LA.openFeatures({ wave: 2 }, { scaleResults: { a: 1, b: 1, c: 1 }, totem: { animal: 'lion', revealedAt: 2 } });
  assert.equal(more.programme, true);
  assert.equal(more.defis, true);
  assert.equal(more.chaines, false);
});

test('règles taillées : pas de messagerie médecin ni de journal quand c\'est fermé', () => {
  const { rulesV2 } = require('../_drloChatRules.js');
  const closed = LA.openFeatures({ wave: 1 }, {});
  const r = LA.pruneRules(rulesV2(false), closed);
  assert.doesNotMatch(r, /\[\[vrai_drlo\]\]|\[\[journal\]\]|\[\[programme\]\]|\[\[DRLO_HUMAIN\]\]|\[\[GRATUIT_JOURNAL\]\]/);
  assert.match(r, /PAS encore de messagerie avec un médecin/);
  const all = LA.pruneRules(rulesV2(false), Object.fromEntries(Object.keys(LA.FEATURES).map((k) => [k, true])));
  assert.match(all, /\[\[vrai_drlo\]\]/);
  assert.match(all, /journal est gratuit/);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _splitAction } = require('../dr-lo-chat.js');

test('Dr Lô propose au plus une action, reconnue en dernière ligne', () => {
  assert.deepEqual(_splitAction('Regardons ton sommeil.\n[[test:bonus_sommeil]]'), { text: 'Regardons ton sommeil.', action: { kind: 'test', scaleId: 'bonus_sommeil' } });
  assert.deepEqual(_splitAction('Respire avec moi.\n[[respiration]]'), { text: 'Respire avec moi.', action: { kind: 'respiration' } });
  assert.deepEqual(_splitAction('Juste une écoute.'), { text: 'Juste une écoute.', action: null });
  assert.deepEqual(_splitAction('Texte [[inconnu]] ici.'), { text: 'Texte  ici.', action: null });
});

test('balise [[chaine:ID]] : casse gardée, chaîne inconnue ignorée, [[chaines]] accepté', () => {
  const { _splitActions } = require('../dr-lo-chat.js');
  const ids = { AbC123xyz: 'Gérer ses émotions' };
  let r = _splitActions('Il y a une chaîne pour ça.\n[[chaine:AbC123xyz]]', ids);
  assert.deepStrictEqual(r.actions, [{ kind: 'chaine', id: 'AbC123xyz', name: 'Gérer ses émotions' }]);
  assert.ok(!r.text.includes('[['));
  r = _splitActions('Rien.\n[[chaine:inconnue99]]', ids);
  assert.deepStrictEqual(r.actions, []);
  r = _splitActions('Les chaînes.\n[[chaines]]', ids);
  assert.deepStrictEqual(r.actions, [{ kind: 'chaines' }]);
  r = _splitActions('Fais ce test.\n[[test:gad7]]\n[[chaine:AbC123xyz]]', ids);
  assert.deepStrictEqual(r.actions, [{ kind: 'test', scaleId: 'gad7' }]);
});

test('résumé des chaînes pour Dr Lô IA : membre, ce qui manque, jamais archivée', () => {
  const CH = require('../_drloChannels.js');
  const r = CH.chatSummary([
    { id: 'c1', name: 'Émotions', description: 'Vocaux', price: 2, rules: { tests: [{ scaleId: 'gad7' }] } },
    { id: 'c2', name: 'Vieille', status: 'archived' },
    { id: 'c3', name: 'Couple', price: 0, rules: {} },
  ], new Set(['c3']), { scaleResults: {} }, 0, { gad7: 'Anxiété' });
  assert.ok(r.text.includes('[c1]') && r.text.includes('faire le test « Anxiété »') && r.text.includes('2 étincelles de plus'));
  assert.ok(r.text.includes('[c3]') && r.text.includes('DÉJÀ MEMBRE'));
  assert.ok(!r.text.includes('Vieille'));
  assert.deepStrictEqual(Object.keys(r.ids), ['c1', 'c3']);
});

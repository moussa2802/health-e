const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _splitAction } = require('../dr-lo-chat.js');

test('Dr Lô propose au plus une action, reconnue en dernière ligne', () => {
  assert.deepEqual(_splitAction('Regardons ton sommeil.\n[[test:bonus_sommeil]]'), { text: 'Regardons ton sommeil.', action: { kind: 'test', scaleId: 'bonus_sommeil' } });
  assert.deepEqual(_splitAction('Respire avec moi.\n[[respiration]]'), { text: 'Respire avec moi.', action: { kind: 'respiration' } });
  assert.deepEqual(_splitAction('Juste une écoute.'), { text: 'Juste une écoute.', action: null });
  // Balise inconnue : retirée, sans laisser de double espace
  assert.deepEqual(_splitAction('Texte [[inconnu]] ici.'), { text: 'Texte ici.', action: null });
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

test('balise [[pratique:ID]] : outil connu seulement, casse gardée ; [[crise]] n\'existe plus', () => {
  const { _splitActions } = require('../dr-lo-chat.js');
  const tools = { Resp1abc: 'Respiration lente 4-6' };
  let r = _splitActions('Fais ta respiration 4-6 maintenant.\n[[pratique:Resp1abc]]', {}, tools);
  assert.deepStrictEqual(r.actions, [{ kind: 'pratique', id: 'Resp1abc', name: 'Respiration lente 4-6' }]);
  assert.ok(!r.text.includes('[['));
  r = _splitActions('Fais-le.\n[[pratique:Inconnu99]]', {}, tools);
  assert.deepStrictEqual(r.actions, []);
  // Compagnon d'abord (10/11/2026) : une balise [[crise]] égarée est retirée du texte et n'ouvre rien
  r = _splitActions('Appelle le 1515.\n[[crise]]', {}, tools);
  assert.deepStrictEqual(r.actions, []);
  assert.equal(r.text, 'Appelle le 1515.');
});

test('balise au milieu d\'une phrase : remplacée par le nom du bouton, plus de trou ni de double espace', () => {
  const { _splitActions } = require('../dr-lo-chat.js');
  // Banc dialogues, C1
  let r = _splitActions('Et si la nuit est agitée d\'ici là, [[exercice:sommeil]] peut t\'aider à te détendre avant de dormir.');
  assert.equal(r.text, 'Et si la nuit est agitée d\'ici là, l\'exercice « Pour s\'endormir » peut t\'aider à te détendre avant de dormir.');
  assert.deepStrictEqual(r.actions, [{ kind: 'exercice', id: 'sommeil' }]);
  // Banc du 10/11, N12
  r = _splitActions('Ce soir, tu peux commencer par [[exercice:relacher]] : trois minutes pour détendre les épaules.');
  assert.equal(r.text, 'Ce soir, tu peux commencer par l\'exercice « Relâcher les tensions » : trois minutes pour détendre les épaules.');
  assert.deepStrictEqual(r.actions, [{ kind: 'exercice', id: 'relacher' }]);
  // Outil, vocal, respiration au milieu d'une phrase
  r = _splitActions('Refais [[pratique:Resp1abc]] maintenant, deux fois.', {}, { Resp1abc: 'Respiration lente 4-6' });
  assert.equal(r.text, 'Refais l\'outil « Respiration lente 4-6 » maintenant, deux fois.');
  assert.equal(_splitActions('Écoute [[vocal:pensees]] quand ça tourne.').text, 'Écoute le vocal « Quand les pensées tournent » quand ça tourne.');
  assert.equal(_splitActions('On fait [[respiration]] ensemble ?').text, 'On fait la respiration guidée ensemble ?');
  // Balise en fin de phrase ou de message : retirée, sans espace avant le point
  assert.equal(_splitActions('Respire avec moi [[respiration]].').text, 'Respire avec moi.');
  assert.equal(_splitActions('Je te propose 2 minutes d\'ancrage.\n[[exercice:ancrage]]').text, 'Je te propose 2 minutes d\'ancrage.');
  // Balise inconnue au milieu : retirée proprement ; les espaces français avant « : ? ! » restent
  assert.equal(_splitActions('Tu peux [[inconnue]] commencer : doucement ?').text, 'Tu peux commencer : doucement ?');
  assert.ok(!/ {2}/.test(_splitActions('a  b [[humeur]]').text));
});

test('les libellés des exercices et des vocaux sont ceux des boutons de l\'appli', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', '..', '..', 'src', 'data', 'guidedExercises.ts'), 'utf8');
  const { _splitActions } = require('../dr-lo-chat.js');
  for (const [id, label] of [['coherence', 'Cohérence cardiaque'], ['ancrage', 'Ancrage 5-4-3-2-1'], ['sommeil', 'Pour s\\\'endormir'], ['relacher', 'Relâcher les tensions']]) {
    assert.ok(src.includes(`id: '${id}', label: '${label}'`), id);
  }
  for (const [id, label] of [['journee', 'Après une journée lourde'], ['pensees', 'Quand les pensées tournent'], ['avant', 'Avant un moment stressant']]) {
    assert.ok(src.includes(`id: '${id}', label: '${label}'`), id);
    assert.ok(_splitActions(`Écoute [[vocal:${id}]] maintenant.`).text.includes(`« ${label} »`), id);
  }
});

test('consigne : la balise va seule à la fin, jamais dans une phrase', () => {
  const { rulesV2 } = require('../_drloChatRules');
  assert.match(rulesV2(false), /Jamais de balise dans une phrase : dans le texte, nomme la chose en mots/);
});

// Lancer : node --test netlify/functions/_tests/_drloRoute.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../_drloRoute');

const ctx = (over = {}) => R.sanitizeContext({
  text: 'je veux voir si mon ami me connait vraiment', step: 'need',
  scales: [{ id: 'gad7', label: 'Anxiété' }, { id: 'pss10', label: 'Stress' }], ...over,
});

test('décision valide', () => {
  const d = R.parseDecision('{"action":"defi","scaleId":null,"then":null,"reply":"Bonne idée !"}', ctx());
  assert.deepEqual(d, { action: 'defi', scaleId: null, then: null, reply: 'Bonne idée !' });
});

test('test inconnu → catalogue ; texte autour du JSON toléré', () => {
  const d = R.parseDecision('Voici : {"action":"test","scaleId":"inventé","reply":"ok"}', ctx());
  assert.equal(d.action, 'catalogue');
  assert.equal(d.scaleId, null);
});

test('action inconnue ou JSON cassé → null', () => {
  assert.equal(R.parseDecision('{"action":"hack","reply":"x"}', ctx()), null);
  assert.equal(R.parseDecision('pas de json', ctx()), null);
  assert.equal(R.parseDecision('{"action":"reply","reply":""}', ctx()), null);
});

test('hors test, explain/pause deviennent reply', () => {
  assert.equal(R.parseDecision('{"action":"explain","reply":"x"}', ctx()).action, 'reply');
});

test('pendant un test, une destination passe par la pause', () => {
  const d = R.parseDecision('{"action":"defi","reply":"On met le test de côté."}', ctx({ step: 'testing' }));
  assert.equal(d.action, 'pause');
  assert.equal(d.then, 'defi');
  const c = R.parseDecision('{"action":"crisis","reply":"Je suis là."}', ctx({ step: 'testing' }));
  assert.equal(c.action, 'crisis');
});

test('nettoyage : (e) retiré, texte coupé, contexte borné', () => {
  const d = R.parseDecision(`{"action":"reply","reply":"Tu es prêt(e) ? ${'a'.repeat(500)}"}`, ctx());
  assert.ok(!d.reply.includes('(e)'));
  assert.ok(d.reply.length <= 420);
  const c = R.sanitizeContext({ text: 'x'.repeat(900), done: ['ok', 'pas ok!'], genre: 'autre' });
  assert.equal(c.text.length, 500);
  assert.deepEqual(c.done, ['ok']);
  assert.equal(c.genre, null);
});

test('le prompt contient le message et les tests', () => {
  const p = R.buildUserPrompt(ctx({ activeTest: { label: 'Stress', question: 'Q1', options: ['Jamais'] }, step: 'testing' }));
  assert.match(p, /mon ami me connait/);
  assert.match(p, /gad7 = Anxiété/);
  assert.match(p, /Question en cours : Q1/);
});

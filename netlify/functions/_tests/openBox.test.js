const test = require('node:test');
const assert = require('node:assert');
const B = require('../_openBox');

test('question trop courte, trop longue, numéro, lien, insulte', () => {
  assert.ok(B.cleanQuestion('ok').error);
  assert.ok(B.cleanQuestion('a'.repeat(501)).error);
  assert.ok(B.cleanQuestion('Appelle-moi au 77 123 45 67 stp merci').error);
  assert.ok(B.cleanQuestion('regarde https://exemple.com pour voir').error);
  assert.ok(B.cleanQuestion('tu es un idiot, réponds-moi').error);
});
test('question normale : nettoyée, pas de crise', () => {
  const r = B.cleanQuestion('  Pourquoi je   n\'arrive pas à dormir ?  ');
  assert.strictEqual(r.text, 'Pourquoi je n\'arrive pas à dormir ?');
  assert.strictEqual(r.crisis, false);
});
test('détresse : gardée, signalée', () => {
  const r = B.cleanQuestion('J\'ai envie de mourir, je ne sais plus quoi faire');
  assert.strictEqual(r.crisis, true);
  assert.ok(r.text);
});
test('limites par appareil et globale', () => {
  assert.ok(B.allow(2, 10).ok);
  assert.strictEqual(B.allow(3, 10).reason, 'device');
  assert.strictEqual(B.allow(0, B.GLOBAL_PER_DAY).reason, 'global');
});
test('empreinte : change chaque jour, ne contient pas l\'adresse', () => {
  const a = B.fingerprint('1.2.3.4', 'ua', '2026-10-31'); const b = B.fingerprint('1.2.3.4', 'ua', '2026-11-01');
  assert.notStrictEqual(a, b);
  assert.ok(!a.includes('1.2.3.4'));
});
test('décision : réponse sur le site exige question et réponse propres', () => {
  assert.ok(B.cleanDecision({ status: 'nope' }).error);
  assert.ok(B.cleanDecision({ status: 'site', publicText: 'Pourquoi je dors mal ?', answer: '' }).error);
  assert.ok(B.cleanDecision({ status: 'site', publicText: 'Pourquoi je dors mal ?', answer: 'Écris-moi au 77 123 45 67' }).error);
  const ok = B.cleanDecision({ status: 'site', publicText: 'Pourquoi je dors mal ?', answer: 'Souvent le stress.' });
  assert.strictEqual(ok.status, 'site');
  assert.strictEqual(B.cleanDecision({ status: 'video', note: 'tiktok' }).status, 'video');
});
test('réponses publiques : seulement « site », récentes d\'abord', () => {
  const rows = [
    { id: 'a', status: 'site', publicText: 'Q1 ?', answer: 'R1', answeredAt: 1 },
    { id: 'b', status: 'site', publicText: 'Q2 ?', answer: 'R2', answeredAt: 5 },
    { id: 'c', status: 'video', publicText: 'Q3', answer: 'R3', answeredAt: 9 },
    { id: 'd', status: 'site', publicText: '', answer: 'x', answeredAt: 7 },
  ];
  assert.deepStrictEqual(B.publicAnswers(rows).map((r) => r.id), ['b', 'a']);
});

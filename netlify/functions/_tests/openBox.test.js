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
test('compagnon d\'abord : une question de détresse est gardée comme les autres, sans écran d\'aide', () => {
  const r = B.cleanQuestion('J\'ai envie de mourir, je ne sais plus quoi faire');
  assert.strictEqual(r.crisis, false);
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

test('thèmes : les vraies questions de la boîte tombent dans le bon thème', () => {
  const t = (q, a = '') => B.classifyTopic({ publicText: q, answer: a });
  assert.strictEqual(t('Est-ce qu\'une femme peut déclarer ses sentiments à un homme ?'), 'amour');
  assert.strictEqual(t('Je suis amoureuse d\'un homme et je ne sais pas si je dois lui déclarer mes sentiments.'), 'amour');
  assert.strictEqual(t('Je veux des conseils sur mon mariage'), 'amour');
  assert.strictEqual(t('Ma mère me rabaisse très souvent, qu\'est-ce qui peut causer cela ?'), 'famille');
  assert.strictEqual(t('Je veux sortir de la maison familiale'), 'famille');
  assert.strictEqual(t('J\'ai de l\'anxiété liée à la santé et je stresse beaucoup'), 'anxiete');
  assert.strictEqual(t('Mon cœur bat très fort, sans arrêt, depuis hier.'), 'anxiete');
  assert.strictEqual(t('Depuis le décès de mon père, il y a une douleur en moi'), 'souffrance');
  assert.strictEqual(t('La suicide est elle une solution ?'), 'souffrance');
  assert.strictEqual(t('Comment gérer l\'envie de sexe en tant que femme musulmane célibataire ?'), 'corps');
  assert.strictEqual(t('Douleurs 3 mois après une fausse couche précoce'), 'corps');
  assert.strictEqual(t('Comment me débarrasser de ma dépendance affective'), 'soi');
  assert.strictEqual(t('Actuellement je me sens seule, je n\'ai confiance en personne'), 'soi');
  assert.strictEqual(t('Zeus, qu\'est-ce que tu sais sur moi ?'), 'autre');
  assert.strictEqual(t('Dites ce que vous pensez de moi'), 'autre');
});
test('thème choisi par Dr Lô : il l\'emporte sur le calcul', () => {
  assert.strictEqual(B.classifyTopic({ publicText: 'Je veux sortir de la maison familiale', answer: 'x', topic: 'soi' }), 'soi');
  assert.strictEqual(B.classifyTopic({ publicText: 'Je veux sortir de la maison familiale', answer: 'x', topic: 'inconnu' }), 'famille');
});
test('réponses publiques : chaque réponse porte son thème', () => {
  const r = B.publicAnswers([{ id: 'a', status: 'site', publicText: 'Pourquoi je dors mal ?', answer: 'Souvent le stress.', answeredAt: 5 }]);
  assert.strictEqual(r[0].topic, 'anxiete');
});
test('mes questions : identifiants nettoyés, état sans fuite', () => {
  assert.deepStrictEqual(B.cleanIds(['abcdefghij1234567890', 'abcdefghij1234567890', 'x', '../../etc', 5, null]), ['abcdefghij1234567890']);
  assert.strictEqual(B.cleanIds(Array.from({ length: 40 }, (_, i) => 'abcdefghij' + String(1000 + i))).length, 10);
  assert.deepStrictEqual(B.mineView('i', null), { id: 'i', state: 'gone' });
  assert.deepStrictEqual(B.mineView('i', { status: 'new', text: 'secret' }), { id: 'i', state: 'waiting' });
  assert.deepStrictEqual(B.mineView('i', { status: 'skipped', text: 'secret' }), { id: 'i', state: 'closed' });
  assert.deepStrictEqual(B.mineView('i', { status: 'video' }), { id: 'i', state: 'video' });
  const a = B.mineView('i', { status: 'site', publicText: 'Pourquoi je dors mal ?', answer: 'Le stress.', answeredAt: 7, text: 'secret' });
  assert.strictEqual(a.state, 'answered'); assert.ok(!JSON.stringify(a).includes('secret'));
});

const test = require('node:test');
const assert = require('node:assert');
const C = require('../_drloComments');

test('un commentaire normal passe', () => {
  assert.deepStrictEqual(C.moderate('Merci Dr Lô, ça fait du bien de lire ça.'), { ok: true });
  assert.deepStrictEqual(C.moderate('Moi aussi je me sens stressé ces jours-ci'), { ok: true });
});
test('téléphone, lien, insulte refusés', () => {
  assert.strictEqual(C.moderate('appelle moi au 77 123 45 67').reason, 'phone');
  assert.strictEqual(C.moderate('mon numéro +221771234567').reason, 'phone');
  assert.strictEqual(C.moderate('va sur monsite.com').reason, 'link');
  assert.strictEqual(C.moderate('https://x.co/abc').reason, 'link');
  assert.strictEqual(C.moderate('écris à moi@gmail.com').reason, 'link');
  assert.strictEqual(C.moderate('quel connard').reason, 'insult');
});
test('la détresse passe avant tout, accents et wolof compris', () => {
  assert.strictEqual(C.moderate('je veux me tuer').reason, 'crisis');
  assert.strictEqual(C.moderate('J\'ai envie de mourir, appelle le 77 123 45 67').reason, 'crisis');
  assert.strictEqual(C.moderate('dama bëgg dee').reason, 'crisis');
  assert.strictEqual(C.moderate('ils seraient mieux sans moi').reason, 'crisis');
});
test('validateComment : taille', () => {
  assert.ok(C.validateComment('a').error);
  assert.ok(C.validateComment('x'.repeat(401)).error);
  assert.strictEqual(C.validateComment('  Merci  ').text, 'Merci');
});
test('identité : anonyme par défaut, prénom, pseudo contrôlé', () => {
  assert.deepStrictEqual(C.resolveIdentity('anon'), { name: 'Anonyme', mode: 'anon' });
  assert.strictEqual(C.resolveIdentity('prenom', { prenom: 'Awa' }).name, 'Awa');
  assert.strictEqual(C.resolveIdentity('prenom', {}).name, 'Anonyme');
  assert.strictEqual(C.resolveIdentity('pseudo', { pseudo: 'Étoile_26' }).name, 'Étoile_26');
  assert.ok(C.resolveIdentity('pseudo', { pseudo: 'a' }).error);
  assert.ok(C.resolveIdentity('pseudo', { pseudo: 'connard' }).error);
  assert.ok(C.resolveIdentity('pseudo', { pseudo: 'mon@site.com' }).error);
});
test('visibilité : masqué, signalé 3 fois, privé (détresse) jamais publiés ; épinglés d\'abord', () => {
  assert.ok(C.visible({ status: 'public', reports: 0 }));
  assert.ok(!C.visible({ status: 'public', hidden: true }));
  assert.ok(!C.visible({ status: 'public', reports: 3 }));
  assert.ok(!C.visible({ status: 'private' }));
  const s = C.sortComments([{ id: 1, createdAt: 5 }, { id: 2, createdAt: 9 }, { id: 3, createdAt: 1, pinned: true }]);
  assert.deepStrictEqual(s.map((x) => x.id), [3, 2, 1]);
});
test('le message de soutien cite 1515 et le CHU Fann, sans écriture inclusive', () => {
  assert.match(C.CRISIS_NOTIF.inboxBody, /1515/);
  assert.match(C.CRISIS_NOTIF.inboxBody, /33 869 18 20/);
  assert.doesNotMatch(C.CRISIS_NOTIF.inboxBody, /\(e\)/);
});

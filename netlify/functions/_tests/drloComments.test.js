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

test('discussion : un ancien commentaire avec `reply` est lu comme un message de Dr Lô', () => {
  const t = C.threadOf({ text: 'Merci', reply: { text: 'Avec plaisir', at: 5 } });
  assert.deepStrictEqual(t, [{ from: 'drlo', text: 'Avec plaisir', at: 5 }]);
  assert.deepStrictEqual(C.threadOf({ text: 'Merci' }), []);
  assert.strictEqual(C.threadOf({ thread: [{ from: 'drlo', text: 'x', at: 1 }], reply: { text: 'vieux', at: 0 } }).length, 1);
});
test('discussion : la personne répond à tour de rôle, tant que Dr Lô ne clôture pas', () => {
  const drlo = { from: 'drlo', text: 'a', at: 1 };
  const user = { from: 'user', text: 'b', at: 2 };
  assert.strictEqual(C.userCanFollowUp({ thread: [] }).ok, false);
  assert.strictEqual(C.userCanFollowUp({ thread: [drlo] }).ok, true);
  assert.strictEqual(C.userCanFollowUp({ thread: [drlo, user] }).ok, false);
  assert.strictEqual(C.userCanFollowUp({ thread: [drlo, user, drlo] }).ok, true);
  assert.strictEqual(C.userCanFollowUp({ thread: [drlo], closed: true }).ok, false);
  assert.match(C.userCanFollowUp({ thread: [drlo], closed: true }).error, /clôturé/);
  assert.strictEqual(C.userCanFollowUp({ reply: { text: 'x', at: 1 } }).ok, true);
  const long = Array.from({ length: C.MAX_THREAD }, (_, i) => ({ from: i % 2 ? 'user' : 'drlo', text: 'x', at: i }));
  assert.strictEqual(C.userCanFollowUp({ thread: long.slice(0, C.MAX_THREAD - 1).concat([{ from: 'drlo', text: 'x', at: 99 }]) }).ok, false);
});
test('discussion : une modification de Dr Lô compte comme du neuf pour la personne', () => {
  const c = { thread: [{ from: 'drlo', text: 'a', at: 100 }] };
  assert.strictEqual(C.lastDrloAt(c), 100);
  c.thread[0].editedAt = 300;
  assert.strictEqual(C.lastDrloAt(c), 300);
  assert.strictEqual(C.lastDrloAt({ thread: [{ from: 'user', text: 'b', at: 900 }] }), 0);
});
test('discussion : « nouveau » et « mis à jour » selon la dernière visite', () => {
  const seen = 200;
  assert.deepStrictEqual([C.presentEntry({ from: 'drlo', text: 'a', at: 100 }, seen).fresh, C.presentEntry({ from: 'drlo', text: 'a', at: 100 }, seen).updated], [false, false]);
  const edited = C.presentEntry({ from: 'drlo', text: 'a', at: 100, editedAt: 300 }, seen);
  assert.deepStrictEqual([edited.fresh, edited.updated, edited.editedAt], [false, true, 300]);
  const neuf = C.presentEntry({ from: 'drlo', text: 'a', at: 250, editedAt: 300 }, seen);
  assert.deepStrictEqual([neuf.fresh, neuf.updated], [true, false]);
  assert.strictEqual(C.presentEntry({ from: 'user', text: 'b', at: 999 }, seen).fresh, false);
  assert.strictEqual(C.presentEntry({ from: 'drlo', text: '', at: 1, audio: { durationSec: 12 } }, 0).audioSec, 12);
});
test('réponse de Dr Lô : le texte est facultatif avec un vocal', () => {
  assert.strictEqual(C.validateEntry('', true).text, '');
  assert.ok(C.validateEntry('', false).error);
  assert.strictEqual(C.validateEntry('  Merci  ', true).text, 'Merci');
  assert.ok(C.validateEntry('x'.repeat(601), true).error);
});

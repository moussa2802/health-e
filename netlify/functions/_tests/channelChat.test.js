const test = require('node:test');
const assert = require('node:assert');
const K = require('../_channelChat');

test('message normal, anonyme par défaut, prénom si choisi', () => {
  assert.strictEqual(K.prepare('Salut tout le monde', 'anon').name, 'Anonyme');
  assert.strictEqual(K.prepare('Salut', 'prenom', { prenom: 'Awa' }).name, 'Awa');
  assert.strictEqual(K.prepare('Salut', 'pseudo', { pseudo: 'Sunu' }).name, 'Sunu');
});
test('numéro, lien, insulte, pseudo invalide, trop long refusés', () => {
  assert.ok(K.prepare('appelle le 77 123 45 67', 'anon').error);
  assert.ok(K.prepare('va sur https://x.com', 'anon').error);
  assert.ok(K.prepare('quel idiot', 'anon').error);
  assert.ok(K.prepare('salut', 'pseudo', { pseudo: 'x' }).error);
  assert.ok(K.prepare('a'.repeat(K.MAX_CHAT + 1), 'anon').error);
});
test('compagnon d\'abord : un message de détresse est publié normalement', () => {
  const p = K.prepare('j\'ai envie de mourir', 'anon');
  assert.strictEqual(p.crisis, false);
  assert.strictEqual(p.text, 'j\'ai envie de mourir');
});
test('cadence : 3 s entre messages, 30 par heure', () => {
  assert.ok(!K.rate({ lastChatAt: 1000 }, 2000).ok);
  const t = 10 * 3600000;
  assert.ok(K.rate({ lastChatAt: 0 }, t).ok);
  assert.ok(!K.rate({ lastChatAt: 0, chatHour: 10, chatCount: K.PER_HOUR }, t + 5000).ok);
  assert.ok(K.rate({ lastChatAt: 0, chatHour: 9, chatCount: K.PER_HOUR }, t + 5000).ok);
});
test('plafond : nettoyage par paquets au-delà de KEEP + SLACK', () => {
  assert.strictEqual(K.PER_HOUR, 120);
  assert.strictEqual(K.toTrim(K.KEEP), 0);
  assert.strictEqual(K.toTrim(K.KEEP + K.SLACK - 1), 0);
  assert.strictEqual(K.toTrim(K.KEEP + K.SLACK), K.SLACK);
});

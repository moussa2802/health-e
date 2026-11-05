const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../_pencLive.js');

test('l\'animateur garde son nom ; sans nom, c\'est l\'équipe', () => {
  assert.deepEqual(L.hostLabel({ hostName: 'Dr Lô', hostTitle: 'Médecin' }), { name: 'Dr Lô', title: 'Médecin' });
  assert.deepEqual(L.hostLabel({}), { name: 'Équipe Health-e', title: '' });
  assert.deepEqual(L.hostLabel({ hostName: 'Awa Ndiaye', hostTitle: 'Psychologue' }), { name: 'Awa Ndiaye', title: 'Psychologue' });
});

test('questions et commentaires : modérés, détresse jamais publiée', () => {
  assert.equal(L.checkText('Comment gérer le stress des examens ?', 300).text, 'Comment gérer le stress des examens ?');
  assert.ok(L.checkText('appelle moi au 77 123 45 67', 300).error);
  assert.equal(L.checkText('j\'ai envie de mourir', 300).crisis, true);
  assert.ok(L.checkText('a', 300).error);
});

test('les questions : épinglée, puis les plus demandées, répondues à la fin, jamais l\'uid', () => {
  const rows = [
    { id: 'a', d: { text: 'A', votes: 2, at: 1, status: 'open', uid: 'u1', voters: ['u2'] } },
    { id: 'b', d: { text: 'B', votes: 9, at: 2, status: 'answered', uid: 'u2' } },
    { id: 'c', d: { text: 'C', votes: 5, at: 3, status: 'open', uid: 'u3' } },
    { id: 'd', d: { text: 'D', votes: 0, at: 4, status: 'hidden', uid: 'u4' } },
    { id: 'e', d: { text: 'E', votes: 0, at: 5, status: 'open', uid: 'u2' } },
  ];
  const out = L.presentQuestions(rows, 'u2', 'e');
  assert.deepEqual(out.map((q) => q.id), ['e', 'c', 'a', 'b']);
  assert.equal(out[0].mine, true);
  assert.equal(out[2].voted, true);
  assert.ok(out.every((q) => !('uid' in q)));
});

test('images : seulement JPEG, PNG, WebP', () => {
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(200)]).toString('base64');
  assert.equal(L.decodeSlide(`data:image/png;base64,${png}`).ext, 'png');
  assert.ok(L.decodeSlide(Buffer.from('<svg>' + 'x'.repeat(200)).toString('base64')).error);
  assert.equal(L.cleanIndex(null, 3), null);
  assert.equal(L.cleanIndex(2, 3), 2);
  assert.equal(L.cleanIndex(5, 3), undefined);
});

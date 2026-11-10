// Lancer : node --test netlify/functions/_tests/adminStats.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../_stats');
const A = require('../_adminStats');

test('suivi : événements autorisés, rubriques de pages, fonctions', () => {
  assert.equal(S.sectionOf('/'), 'accueil');
  assert.equal(S.sectionOf('/compagnon?x=1'), 'compagnon');
  assert.equal(S.sectionOf('/assessment/totem'), 'animal');
  assert.equal(S.sectionOf('/assessment/mental'), 'tests');
  assert.equal(S.sectionOf('/admin/stats'), '');
  assert.deepEqual(S.counterOf({ e: 'page', p: { s: 'penc' } }), { key: 'page_penc', feature: 'penc' });
  assert.deepEqual(S.counterOf({ e: 'exercise_done', p: { id: 'coherence' } }), { key: 'ev_exercise_done_coherence', feature: 'exercices' });
  assert.equal(S.counterOf({ e: 'nimporte_quoi' }), null);
  const { counts, features } = S.aggregate([{ e: 'view' }, { e: 'view' }, { e: 'mood' }, { e: 'hack<script>' }], 9);
  assert.deepEqual(counts, { ev_view: 2, ev_mood: 1, h_09: 1 });
  assert.deepEqual([...features], ['humeur']);
});

test('statistiques : jours, actifs (suivi ∪ compagnon ∪ tests ∪ humeurs), nouveaux, fidélité', () => {
  const now = Date.parse('2026-11-07T12:00:00Z');
  const list = A.dayList(7, now);
  assert.equal(list[0], '2026-11-01');
  assert.equal(list[6], '2026-11-07');
  const out = A.compute({
    list,
    tracked: {
      '2026-11-06': { c: { ev_view: 5, page_accueil: 4, h_09: 2, ev_exercise_done_coherence: 1 }, actifs: [{ uid: 'a', f: { exercices: true } }], visiteurs: 7 },
      '2026-11-07': { c: { ev_view: 3 }, actifs: [{ uid: 'a', f: {} }], visiteurs: 4 },
    },
    profiles: [
      { uid: 'a', createdAt: '2026-11-01T10:00:00Z', scaleResults: { gad7: { completedAt: { _seconds: Date.parse('2026-11-01T11:00:00Z') / 1000 } } }, totem: { revealedAt: 'x' } },
      { uid: 'b', createdAt: '2026-11-06T10:00:00Z', scaleResults: {} , acquisition: 'defi:abc' },
      { uid: 'c', createdAt: '2026-10-01T10:00:00Z', scaleResults: {} },
    ],
    history: [
      { uid: 'b', type: 'spend', feature: 'chat', amount: 1, timestamp: '2026-11-06T12:00:00Z' },
      { uid: 'b', type: 'spend', feature: 'chat', amount: 1, timestamp: '2026-11-06T12:05:00Z' },
      { uid: 'a', type: 'purchase', amount: 50, timestamp: '2026-11-02T12:00:00Z' },
    ],
    moods: [{ uid: 'c', day: '2026-11-02' }],
  });
  const d6 = out.daily.find((x) => x.d === '2026-11-06');
  assert.equal(d6.actifs, 2); // a (suivi) + b (compagnon)
  assert.equal(d6.nouveaux, 1); // b s'est inscrit ce jour-là
  assert.equal(d6.chatMsgs, 2);
  assert.equal(d6.chatUsers, 1);
  assert.equal(d6.visiteurs, 7);
  assert.equal(d6.exercices, 1);
  assert.equal(out.daily.find((x) => x.d === '2026-11-01').tests, 1);
  assert.equal(out.daily[0].comptes, 2); // c (avant) + a
  assert.equal(out.daily[6].comptes, 3);
  assert.equal(out.totals.comptes, 3);
  assert.equal(out.totals.animal, 1);
  assert.equal(out.totals.chatMsgs, 2);
  assert.equal(out.koris.purchases, 1);
  assert.equal(out.hours[9], 2);
  assert.equal(out.acquisition.find((x) => x.key === 'defi').n, 1);
  assert.equal(out.retention.lendemain, 0.25); // 4 présences suivies d'un lendemain (1er : a, 2 : c, 6 : a et b) ; seul a revient le 7
  assert.equal(out.trackingSince, '2026-11-06');
});

test('comptes : fiche users + profil, sans les administrateurs, date la plus ancienne', () => {
  const m = A.mergeAccounts(
    [{ uid: 'a', createdAt: '2026-10-01T00:00:00Z', type: 'patient' }, { uid: 'z', type: 'admin' }, { uid: 'u', createdAt: '2026-11-01T00:00:00Z' }],
    [{ uid: 'a', createdAt: '2026-10-03T00:00:00Z', scaleResults: { x: {} } }, { uid: 'z', scaleResults: {} }, { uid: 'p', createdAt: '2026-11-02T00:00:00Z' }],
  );
  assert.deepEqual(m.map((x) => x.uid).sort(), ['a', 'p', 'u']);
  assert.equal(m.find((x) => x.uid === 'a').createdAt, '2026-10-01T00:00:00Z');
  assert.ok(m.find((x) => x.uid === 'a').scaleResults.x);
});

test('étincelles des contenus payants (Pénc mi, pratiques, chaînes) comptées à part, même à zéro', () => {
  const list = A.dayList(7, Date.parse('2026-11-07T12:00:00Z'));
  const ts = (d) => ({ toMillis: () => Date.parse(`${d}T10:00:00Z`) });
  const empty = A.compute({ list, history: [] });
  assert.deepEqual(empty.koris.contenus, [
    { key: 'penc', spent: 0, refunded: 0, buyers: 0 }, { key: 'practice', spent: 0, refunded: 0, buyers: 0 }, { key: 'channel', spent: 0, refunded: 0, buyers: 0 },
  ]);
  const out = A.compute({ list, history: [
    { uid: 'a', type: 'spend', feature: 'penc', amount: 10, timestamp: ts('2026-11-05') },
    { uid: 'b', type: 'spend', feature: 'penc', amount: 10, timestamp: ts('2026-11-06') },
    { uid: 'b', type: 'refund', feature: 'penc', amount: 10, details: 'Pénc annulé : étincelles rendues', timestamp: ts('2026-11-06') },
    { uid: 'c', type: 'refund', feature: 'practice', amount: 5, details: 'Étincelles restituées — opération annulée', timestamp: ts('2026-11-06') },
    { uid: 'a', type: 'spend', feature: 'practice', amount: 15, timestamp: ts('2026-11-06') },
    { uid: 'a', type: 'spend', feature: 'chat', amount: 1, timestamp: ts('2026-11-06') },
  ] });
  const by = Object.fromEntries(out.koris.contenus.map((c) => [c.key, c]));
  assert.deepEqual(by.penc, { key: 'penc', spent: 20, refunded: 10, buyers: 2 });
  assert.deepEqual(by.practice, { key: 'practice', spent: 15, refunded: 0, buyers: 1 });
  assert.equal(by.channel.spent, 0);
  // L'existant ne change pas
  assert.deepEqual(out.koris.spentByFeature.map((k) => k.key), ['penc', 'practice', 'chat']);
});

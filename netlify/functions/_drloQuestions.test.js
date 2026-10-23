// Lancer : node --test netlify/functions/_drloQuestions.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('./_drloQuestions');

const T = Date.UTC(2026, 9, 22, 10); // jeudi 22 oct. 2026

test('semaine : lundi, prochaine vague', () => {
  assert.equal(new Date(Q.weekStart(T)).toISOString(), '2026-10-19T00:00:00.000Z');
  assert.equal(new Date(Q.nextMonday(T)).toISOString(), '2026-10-26T00:00:00.000Z');
});

test('paliers', () => {
  const p = Q.computePaliers({ totemRevealed: true, notedDays: 3, circle: false });
  assert.equal(p.remaining, 2); assert.equal(p.unlocked, false);
  assert.equal(p.steps[1].progress, 3);
  assert.equal(Q.computePaliers({ totemRevealed: true, notedDays: 9, circle: true }).unlocked, true);
});

test('file : prioritaires d\'abord, places de la semaine', () => {
  const queue = [{ uid: 'a', joinedAt: 1 }, { uid: 'b', joinedAt: 2 }, { uid: 'c', joinedAt: 3, priority: true }];
  assert.deepEqual(Q.sortQueue(queue).map((e) => e.uid), ['c', 'a', 'b']);
  let r = Q.admission({ uid: 'b', usedThisWeek: 38, cap: 40, queue, now: T });
  assert.equal(r.position, 3); assert.equal(r.canSubmit, false);
  r = Q.admission({ uid: 'a', usedThisWeek: 38, cap: 40, queue, now: T });
  assert.equal(r.position, 2); assert.equal(r.canSubmit, true);
  r = Q.admission({ uid: 'z', usedThisWeek: 10, cap: 40, queue, now: T });
  assert.equal(r.canSubmit, true); assert.equal(r.inQueue, false);
  r = Q.admission({ uid: 'z', usedThisWeek: 38, cap: 40, queue, now: T });
  assert.equal(r.canSubmit, false);
});

test('une question à la fois, une gratuite par mois', () => {
  assert.equal(Q.askState([{ status: 'pending', createdAt: T - 1000 }], T).reason, 'pending');
  const w = Q.askState([{ status: 'answered', createdAt: T - 5 * 86400000 }], T);
  assert.equal(w.reason, 'wait');
  assert.equal(Q.askState([{ status: 'answered', createdAt: T - 31 * 86400000 }], T).ok, true);
  assert.equal(Q.askState([], T).ok, true);
});

test('ce que Dr Lô voit : rien par défaut, intime et journal seulement sur accord', () => {
  const profile = {
    onboardingProfile: { prenom: 'Awa', genre: 'femme', age: '18-25' },
    totem: { animal: 'cerf', revealedAt: 1 },
    scaleResults: { gad7: { interpretation: { label: 'Légère', severity: 'mild', description: 'x' } }, fsfi: { interpretation: { label: 'y', severity: 'moderate' } } },
  };
  const none = Q.buildSnapshot({ profile, share: 'none', anonymous: true });
  assert.deepEqual(Object.keys(none).sort(), ['includeIntime', 'includeJournal', 'share']);
  const named = Q.buildSnapshot({ profile, share: 'none', anonymous: false });
  assert.equal(named.prenom, 'Awa');
  const tot = Q.buildSnapshot({ profile, share: 'totem', anonymous: true });
  assert.equal(tot.totem, 'cerf'); assert.equal(tot.results, undefined);
  const res = Q.buildSnapshot({ profile, share: 'results', anonymous: true });
  assert.deepEqual(Object.keys(res.results), ['gad7']);
  assert.doesNotMatch(JSON.stringify(res), /description/);
  const all = Q.buildSnapshot({ profile, share: 'results', includeIntime: true, includeJournal: true, anonymous: true, journal: [{ contenu: 'secret' }] });
  assert.ok(all.results.fsfi); assert.equal(all.journal[0].text, 'secret');
  assert.equal(Q.buildSnapshot({ profile, share: 'none', includeJournal: false, journal: [{ contenu: 's' }] }).journal, undefined);
});

test('question et code de parrainage', () => {
  assert.equal(Q.validQuestion('court').ok, false);
  assert.equal(Q.validQuestion('x'.repeat(2000)).ok, false);
  assert.equal(Q.validQuestion('  Comment mieux dormir avant un examen ?  ').text, 'Comment mieux dormir avant un examen ?');
  assert.match(Q.makeReferralCode(), /^[A-Z2-9]{6}$/);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../_pushDaily');

// 24 oct. 2026, 19 h à Dakar (UTC+0)
const at19 = new Date(Date.UTC(2026, 9, 24, 19, 5));
const base = (o = {}) => ({ notifPrefs: { on: true, hour: 19, tz: 'Africa/Dakar' }, ...o });
const prog = (o = {}) => ({ v: 1, startDay: '2026-10-22', status: 'active', checks: {}, bilans: [], ...o });

test('rappel du programme : à l\'heure choisie, seulement s\'il reste quelque chose', () => {
  const m = P.decideDaily(base({ programme: prog() }), { now: at19, moodToday: false });
  assert.equal(m.kind, 'programme');
  assert.match(m.body, /3 petits engagements/);
  assert.doesNotMatch(m.body, /anxi|humeur|stress|dépress/i); // rien de sensible sur l'écran verrouillé
  const done = prog({ checks: { '2026-10-24': ['action', 'learn'] } });
  assert.equal(P.decideDaily(base({ programme: done }), { now: at19, moodToday: true }), null);
  assert.equal(P.decideDaily(base({ programme: prog() }), { now: new Date(Date.UTC(2026, 9, 24, 8)), moodToday: false }), null);
});

test('un seul message par jour, rien pendant une pause', () => {
  assert.equal(P.decideDaily(base({ programme: prog(), lastPushDay: '2026-10-24' }), { now: at19 }), null);
  assert.equal(P.decideDaily(base({ programme: prog({ status: 'paused', pausedDay: '2026-10-23' }) }), { now: at19 }), null);
});

test('réglages : type coupé, silence la nuit, fuseau de la personne', () => {
  assert.equal(P.decideDaily(base({ notifPrefs: { on: true, hour: 19, programme: false }, programme: prog() }), { now: at19 }), null);
  const prefs = { on: true, hour: 23, quiet: true, tz: 'Africa/Dakar' };
  assert.equal(P.allowed(prefs, 'programme', new Date(Date.UTC(2026, 9, 24, 23))), false);
  assert.equal(P.allowed({ ...prefs, quiet: false }, 'programme', new Date(Date.UTC(2026, 9, 24, 23))), true);
  // Québec (UTC-4 en octobre) : 19 h locale = 23 h UTC
  const qc = base({ notifPrefs: { on: true, hour: 19, tz: 'America/Toronto' }, programme: prog() });
  assert.equal(P.decideDaily(qc, { now: new Date(Date.UTC(2026, 9, 24, 23, 2)) }).kind, 'programme');
});

test('bilan prêt quand la journée est faite, au jour 7', () => {
  const p = prog({ startDay: '2026-10-18', checks: { '2026-10-24': ['action', 'learn'] } });
  const m = P.decideDaily(base({ programme: p }), { now: at19, moodToday: true });
  assert.equal(m.kind, 'bilan');
});

test('défi du totem au 3e jour, nouvelles seulement si activé', () => {
  assert.equal(P.decideDaily(base({ totemDefi: { since: '2026-10-21T10:00:00Z' } }), { now: at19 }).kind, 'totem');
  const away = { lastSeenAt: '2026-10-18T10:00:00Z' };
  assert.equal(P.decideDaily(base(away), { now: at19 }), null);
  assert.equal(P.decideDaily(base({ ...away, notifPrefs: { on: true, hour: 19, nudge: true } }), { now: at19 }).kind, 'nudge');
  assert.equal(P.decideDaily(base({ ...away, lastNudgeAt: '2026-10-20T10:00:00Z', notifPrefs: { on: true, hour: 19, nudge: true } }), { now: at19 }), null);
});

test('routines comptées, jetons morts repérés', () => {
  assert.equal(P.remaining(prog({ routines: ['CE1', 'CE2'], rchecks: { d: ['CE1'] } }), 'd', true), 3);
  assert.deepEqual(P.deadTokens(['a', 'b'], [{ success: true }, { success: false, error: { code: 'messaging/registration-token-not-registered' } }]), ['b']);
});

test('rappel de la routine : un outil à apprendre pas fait aujourd\'hui, sans nommer l\'outil', () => {
  const m = P.decideDaily(base(), { now: at19, routineDue: 1 });
  assert.equal(m.kind, 'routine'); assert.equal(m.link, '/routine');
  assert.ok(!/respiration|carnet|désir|anxi|stress/i.test(m.body));
  assert.match(P.decideDaily(base(), { now: at19, routineDue: 2 }).body, /Tes exercices/);
  assert.equal(P.decideDaily(base(), { now: at19, routineDue: 0 }), null);
  assert.equal(P.decideDaily(base(), { now: at19 }), null);
});

test('routine : un seul message par jour, le programme passe d\'abord, silence en pause et si les rappels du programme sont coupés', () => {
  assert.equal(P.decideDaily(base({ programme: prog() }), { now: at19, moodToday: false, routineDue: 1 }).kind, 'programme');
  const fait = prog({ checks: { '2026-10-24': ['action', 'learn'] } });
  assert.equal(P.decideDaily(base({ programme: fait }), { now: at19, moodToday: true, routineDue: 1 }).kind, 'routine');
  assert.equal(P.decideDaily(base({ programme: prog({ status: 'paused', pausedDay: '2026-10-23' }) }), { now: at19, routineDue: 1 }), null);
  assert.equal(P.decideDaily(base({ lastPushDay: '2026-10-24' }), { now: at19, routineDue: 1 }), null);
  assert.equal(P.decideDaily({ notifPrefs: { on: true, hour: 19, tz: 'Africa/Dakar', programme: false } }, { now: at19, routineDue: 1 }), null);
  assert.equal(P.decideDaily({ notifPrefs: { on: false, hour: 19 } }, { now: at19, routineDue: 1 }), null);
});

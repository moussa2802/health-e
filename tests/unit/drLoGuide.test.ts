// Lancer : node --test tests/unit/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePortrait, computeStreak, pickGuideMessage, localDayKey, toDate, followUpKeyFor,
  type GuideInput,
} from '../../src/utils/drLoGuide.ts';

const NOW = new Date(2026, 9, 21, 10, 0, 0); // 21 oct. 2026, 10 h
const daysAgo = (n: number) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; };

const base: GuideInput = {
  isAuthenticated: true, prenom: 'Awa', doneCore: 3, totalCore: 24,
  guestCount: 0, guestMax: 3, totemMissing: 4, totemReady: false, totemRevealed: false,
  journalToday: true, lastTest: null, dismissedFollowUps: [], now: NOW,
};

test('portrait : 0 partout = 0 %, tout rempli = 100 %', () => {
  assert.equal(computePortrait({ doneCore: 0, totalCore: 24, journalCount: 0, chatCount: 0 }), 0);
  assert.equal(computePortrait({ doneCore: 24, totalCore: 24, journalCount: 9, chatCount: 9 }), 100);
});
test('portrait : 12/24 tests + 1 journal + 0 chat = 38 %', () => {
  assert.equal(computePortrait({ doneCore: 12, totalCore: 24, journalCount: 1, chatCount: 0 }), 38);
});

test('série : aujourd\'hui + 3 jours précédents = 4', () => {
  const days = [0, 1, 2, 3].map(n => localDayKey(daysAgo(n)));
  assert.equal(computeStreak(days, NOW), 4);
});
test('série : encore vivante si actif hier mais pas encore aujourd\'hui', () => {
  const days = [1, 2].map(n => localDayKey(daysAgo(n)));
  assert.equal(computeStreak(days, NOW), 2);
});
test('série : cassée si rien hier ni aujourd\'hui', () => {
  assert.equal(computeStreak([localDayKey(daysAgo(2))], NOW), 0);
});

test('invité sans test : premier test + mention des tests gratuits', () => {
  const m = pickGuideMessage({ ...base, isAuthenticated: false, doneCore: 0, guestCount: 0 });
  assert.equal(m.id, 'first_test');
  assert.match(m.text, /3 tests gratuits/);
});
test('invité au bout de ses essais : inscription', () => {
  const m = pickGuideMessage({ ...base, isAuthenticated: false, guestCount: 3 });
  assert.equal(m.id, 'guest_limit');
  assert.equal(m.action.kind, 'signup');
});
test('suivi post-test à J+3, prioritaire sur l\'humeur', () => {
  const lastTest = { scaleId: 'gad7', label: 'Anxiété', completedAt: daysAgo(3) };
  const m = pickGuideMessage({ ...base, journalToday: false, lastTest });
  assert.equal(m.id, 'follow_up');
  assert.equal(m.action.kind, 'chat');
  assert.equal(m.followUpKey, followUpKeyFor(lastTest));
});
test('pas de suivi à J+2 ni après J+14, ni s\'il a déjà été proposé', () => {
  const t = (n: number) => ({ scaleId: 'gad7', label: 'Anxiété', completedAt: daysAgo(n) });
  assert.notEqual(pickGuideMessage({ ...base, lastTest: t(2) }).id, 'follow_up');
  assert.notEqual(pickGuideMessage({ ...base, lastTest: t(15) }).id, 'follow_up');
  const lt = t(5);
  assert.notEqual(pickGuideMessage({ ...base, lastTest: lt, dismissedFollowUps: [followUpKeyFor(lt)] }).id, 'follow_up');
});
test('humeur non notée → noter mon humeur', () => {
  assert.equal(pickGuideMessage({ ...base, journalToday: false }).id, 'mood');
});
test('humeur pas encore chargée (null) → pas de message humeur', () => {
  assert.notEqual(pickGuideMessage({ ...base, journalToday: null }).id, 'mood');
});
test('totem : il manque 2 tests (pluriel)', () => {
  const m = pickGuideMessage({ ...base, totemMissing: 2 });
  assert.equal(m.id, 'totem_missing');
  assert.match(m.text, /2 tests/);
});
test('totem prêt non révélé', () => {
  assert.equal(pickGuideMessage({ ...base, totemMissing: 0, totemReady: true }).id, 'totem_ready');
});
test('par défaut : chat avec un message d\'ouverture', () => {
  const m = pickGuideMessage({ ...base, totemMissing: 0, totemReady: true, totemRevealed: true });
  assert.equal(m.id, 'portrait');
  assert.equal(m.action.kind, 'chat');
});
test('toDate accepte Date, Timestamp-like, chaîne ; refuse le reste', () => {
  assert.ok(toDate(new Date()) instanceof Date);
  assert.ok(toDate({ toDate: () => new Date() }) instanceof Date);
  assert.ok(toDate('2026-10-01T10:00:00Z') instanceof Date);
  assert.equal(toDate('pas une date'), null);
  assert.equal(toDate(undefined), null);
});

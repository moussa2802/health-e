const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../_korisGift.js');

test('cadeau du jour : une fois par jour, heure de Dakar', () => {
  assert.equal(G.dakarDay(Date.UTC(2026, 10, 3, 23, 59)), '2026-11-03');
  const regular = { balance: 4, visitDay: '2026-11-02', visitStreak: 2 }; // venu le 1er et le 2 : le 3, c'est le 3e jour
  assert.equal(G.canClaimDaily(regular, '2026-11-03'), true);
  assert.equal(G.canClaimDaily({ ...regular, lastDailyGift: '2026-11-03' }, '2026-11-03'), false);
  assert.equal(G.canClaimDaily({ ...regular, lastDailyGift: '2026-11-02' }, '2026-11-03'), true);
  assert.equal(G.canClaimDaily(null, '2026-11-03'), false); // pas encore de portefeuille
  assert.ok(G.DAILY_GIFT > 0 && G.DAILY_GIFT <= 10);
});

test('parrainage : récompense seulement après un premier test, une seule fois', () => {
  const now = Date.UTC(2026, 10, 3);
  const base = { referredBy: 'ABC234', createdAt: now - 86400000 };
  assert.equal(G.referralState({}, now), 'no_ref');
  assert.equal(G.referralState(base, now), 'no_test');
  assert.equal(G.referralState({ ...base, scaleResults: { gad7: {} } }, now), 'ok');
  assert.equal(G.referralState({ ...base, scaleResults: { gad7: {} }, referralRewardedAt: 1 }, now), 'done');
  assert.equal(G.referralState({ ...base, createdAt: now - 30 * 86400000, scaleResults: { gad7: {} } }, now), 'too_old');
});

test('parrain plafonné', () => {
  assert.equal(G.referrerCanEarn({}), true);
  assert.equal(G.referrerCanEarn({ referralRewardCount: G.REFERRER_CAP }), false);
});

test('cadeau du jour : seulement après 3 jours d\'affilée ; un jour sauté remet la série à 1', () => {
  assert.equal(G.STREAK_NEEDED, 3);
  assert.equal(G.previousDay('2026-11-01'), '2026-10-31');
  // Nouveau : jour 1, pas de cadeau
  assert.equal(G.canClaimDaily({ balance: 4 }, '2026-11-03'), false);
  assert.deepEqual(G.visit({ balance: 4 }, '2026-11-03'), { visitDay: '2026-11-03', visitStreak: 1, streakLostOn: null });
  // Jour 2 : toujours pas
  let w = { balance: 4, visitDay: '2026-11-03', visitStreak: 1 };
  assert.equal(G.canClaimDaily(w, '2026-11-04'), false);
  assert.equal(G.streakInfo(w, '2026-11-04').streak, 2);
  // Jour 3 : débloqué
  w = { balance: 4, visitDay: '2026-11-04', visitStreak: 2 };
  assert.equal(G.canClaimDaily(w, '2026-11-05'), true);
  // Déjà compté aujourd'hui : rien ne change
  assert.equal(G.visit({ visitDay: '2026-11-05', visitStreak: 3 }, '2026-11-05'), null);
  // Un jour sauté après une série : on repart à 1, et on le dit
  const broken = { balance: 4, visitDay: '2026-11-05', visitStreak: 5, lastDailyGift: '2026-11-05' };
  assert.equal(G.canClaimDaily(broken, '2026-11-07'), false);
  assert.deepEqual(G.streakInfo(broken, '2026-11-07'), { streak: 1, needed: 3, lost: true, claimedToday: false });
  // Le lendemain, plus de message « série perdue », on est au jour 2
  assert.deepEqual(G.streakInfo({ ...broken, visitDay: '2026-11-07', visitStreak: 1, streakLostOn: '2026-11-07' }, '2026-11-08'), { streak: 2, needed: 3, lost: false, claimedToday: false });
});

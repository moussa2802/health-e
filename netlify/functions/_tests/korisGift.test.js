const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../_korisGift.js');

test('cadeau du jour : une fois par jour, heure de Dakar', () => {
  assert.equal(G.dakarDay(Date.UTC(2026, 10, 3, 23, 59)), '2026-11-03');
  assert.equal(G.canClaimDaily({ balance: 4 }, '2026-11-03'), true);
  assert.equal(G.canClaimDaily({ balance: 4, lastDailyGift: '2026-11-03' }, '2026-11-03'), false);
  assert.equal(G.canClaimDaily({ balance: 4, lastDailyGift: '2026-11-02' }, '2026-11-03'), true);
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

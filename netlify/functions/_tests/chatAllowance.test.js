const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nextAllowance, MAX_PER_DAY } = require('../_chatAllowance.js');
const { KORIS_COSTS } = require('../_koris.js');

test('aucun message n\'est offert : seul le garde-fou du jour compte', () => {
  const a = nextAllowance(null, '2026-10-26');
  assert.equal(a.limit, false); assert.equal(a.next.count, 1); assert.equal(a.free, undefined);
  assert.equal(nextAllowance({ day: '2026-10-26', count: MAX_PER_DAY }, '2026-10-26').limit, true);
  assert.equal(nextAllowance({ day: '2026-10-25', count: 99 }, '2026-10-26').limit, false); // nouveau jour
});

test('une réponse de Dr Lô coûte toujours au moins 1 étincelle', () => {
  assert.ok(KORIS_COSTS.chat >= 1);
});

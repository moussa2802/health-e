const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nextAllowance, FREE_PER_DAY, MAX_PER_DAY } = require('../_chatAllowance.js');

test('messages offerts, puis étincelles, puis on reprend demain', () => {
  const a = nextAllowance(null, '2026-10-26');
  assert.equal(a.free, true); assert.equal(a.next.count, 1); assert.equal(a.freeLeft, FREE_PER_DAY - 1);
  const b = nextAllowance({ day: '2026-10-26', count: FREE_PER_DAY }, '2026-10-26');
  assert.equal(b.free, false); assert.equal(b.limit, false);
  assert.equal(nextAllowance({ day: '2026-10-26', count: MAX_PER_DAY }, '2026-10-26').limit, true);
  assert.equal(nextAllowance({ day: '2026-10-25', count: 99 }, '2026-10-26').free, true); // nouveau jour
});

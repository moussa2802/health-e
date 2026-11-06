import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cueFor } from '../../src/hooks/useBreathVoice.ts';

test('respiration : intro, consignes alternées, milieu sur la 5e inspiration', () => {
  const seq = Array.from({ length: 15 }, (_, i) => cueFor(i, i % 2 === 0));
  assert.equal(seq[0], 'intro');
  assert.equal(seq[1], 'expire_1');
  assert.equal(seq[8], 'milieu');
  for (let i = 1; i < 15; i++) assert.match(seq[i], i % 2 === 0 ? /^(inspire|milieu)/ : /^expire/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, nextStageHint, STAGE_SCALE } from '../../src/utils/companionStage.ts';

test('4 stades, du plus petit au plus grand', () => {
  assert.equal(STAGES.length, 4);
  assert.deepEqual([...STAGE_SCALE].sort((a, b) => a - b), [...STAGE_SCALE]);
});

test('ce qui le fera grandir ensuite', () => {
  assert.equal(nextStageHint(0), 'une braise après ton premier test');
  assert.equal(nextStageHint(1), 'une flamme quand ton animal intérieur se révèle');
  assert.equal(nextStageHint(3), null);
});

// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECR_R } from '../../src/data/scales/mentalHealth/ecrR.ts';
import { computeSubscaleScores, computeTotalScore, needsRescore, rescore } from '../../src/utils/scaleScoring.ts';
import type { ScaleResult } from '../../src/types/assessment.ts';

test('ECR-R corrigé : 22 en anxiété (inversé), 19 en évitement, 18 items par sous-échelle', () => {
  const [anx, avo] = ECR_R.subscales!;
  assert.equal(anx.itemIds.length, 18); assert.equal(avo.itemIds.length, 18);
  assert.ok(anx.itemIds.includes(22) && anx.reverseIds!.includes(22));
  assert.ok(avo.itemIds.includes(19) && !avo.reverseIds!.includes(19));
  assert.ok(!avo.itemIds.includes(22) && !anx.itemIds.includes(19));
  const all = [...anx.itemIds, ...avo.itemIds].sort((a, b) => a - b);
  assert.deepEqual(all, Array.from({ length: 36 }, (_, i) => i + 1));
  // chaque chapitre (18 premières questions / 18 suivantes) correspond à une sous-échelle
  assert.deepEqual(new Set(ECR_R.items.slice(0, 18).map(i => i.id)), new Set(anx.itemIds));
  assert.equal(ECR_R.items.length, 36);
});

test('quelqu\'un qui a très peur d\'être quitté(e) : l\'anxiété monte, l\'évitement ne baisse plus', () => {
  const answers: Record<number, number> = {};
  for (let i = 1; i <= 36; i++) answers[i] = 4;
  answers[22] = 1; // « Pas du tout » serein(e) à l'idée d'être quitté(e) = forte inquiétude
  answers[19] = 7; // beaucoup de mal à compter sur ses partenaires
  const sub = computeSubscaleScores(ECR_R, answers)!;
  // anxiété : 17×4 + (8-1)=7 → 75/18 = 4.17 ; évitement : 17×4 + 7 = 75/18 = 4.17
  assert.equal(sub.anxiety, 4.17);
  assert.equal(sub.avoidance, 4.17);
  // score total inchangé par la correction (mêmes items inversés au global)
  assert.equal(computeTotalScore(ECR_R, answers), 34 * 4 + 7 + 7);
});

test('recalcul : seulement les anciens résultats, une seule fois', () => {
  const old = { scaleId: 'ecr_r', totalScore: 1, interpretation: ECR_R.interpretation[0], completedAt: new Date() } as ScaleResult;
  assert.equal(needsRescore(ECR_R, old), true);
  const answers: Record<number, number> = {};
  for (let i = 1; i <= 36; i++) answers[i] = 2;
  const r = rescore(ECR_R, old, answers);
  assert.equal(r.scoringVersion, 2);
  assert.equal(needsRescore(ECR_R, r), false);
  assert.equal(needsRescore(ECR_R, { ...old, rescoreSkipped: true }), false);
  assert.equal(needsRescore(undefined, old), false);
});

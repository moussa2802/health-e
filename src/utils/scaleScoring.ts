/**
 * scaleScoring.ts — Recalcul pur des sous-scores d'une échelle (sans Firestore).
 * Même algorithme que computeScaleScore (evaluationService) et computeGuestResult (guestSession) :
 *  - les sous-échelles n'utilisent QUE sub.reverseIds (pas les reverseIds globaux) ;
 *  - inversion : (max + min) - valeur ; réponse manquante = valeur minimale ;
 *  - mode 'mean' : moyenne arrondie à 2 décimales.
 * Sert à mettre à jour les anciens résultats quand le calcul d'une échelle est corrigé
 * (scoringVersion), pour les invités, les comptes et le script d'administration.
 */
import type { AssessmentScale, ScaleResult } from '../types/assessment';

function bounds(scale: AssessmentScale): { min: number; max: number } {
  const opts = scale.items[0]?.options ?? [];
  return {
    max: Math.max(...opts.map(o => o.value), 3),
    min: opts.length > 0 ? Math.min(...opts.map(o => o.value)) : 0,
  };
}

export function computeSubscaleScores(scale: AssessmentScale, answers: Record<number, number>): Record<string, number> | undefined {
  if (!scale.subscales) return undefined;
  const { min, max } = bounds(scale);
  const out: Record<string, number> = {};
  for (const sub of scale.subscales) {
    const rev = new Set(sub.reverseIds ?? []);
    let total = 0;
    for (const id of sub.itemIds) {
      let v = answers[id] ?? min;
      if (rev.has(id)) v = (max + min) - v;
      total += v;
    }
    if (sub.scoringMode === 'mean' && sub.itemIds.length > 0) total = Math.round((total / sub.itemIds.length) * 100) / 100;
    out[sub.key] = total;
  }
  return out;
}

/** Score total (même règle : items noScore exclus, reverseIds globaux ou item.reversed). */
export function computeTotalScore(scale: AssessmentScale, answers: Record<number, number>): number {
  const { min, max } = bounds(scale);
  const rev = new Set(scale.reverseIds ?? []);
  const scored = scale.items.filter(i => !i.noScore);
  let total = 0;
  for (const item of scored) {
    let v = answers[item.id] ?? min;
    if (item.reversed === true || rev.has(item.id)) v = (max + min) - v;
    total += v;
  }
  if (scale.scoringMode === 'mean' && scored.length > 0) total = Math.round((total / scored.length) * 100) / 100;
  return total;
}

/** Un résultat enregistré date-t-il d'un ancien calcul de cette échelle ? */
export function needsRescore(scale: AssessmentScale | undefined, result: Pick<ScaleResult, 'scoringVersion' | 'rescoreSkipped'> | undefined): boolean {
  if (!scale?.scoringVersion || !result || result.rescoreSkipped) return false;
  return (result.scoringVersion ?? 1) < scale.scoringVersion;
}

/** Nouveau résultat recalculé (l'interprétation suit le score total, comme à la création). */
export function rescore<T extends ScaleResult>(scale: AssessmentScale, result: T, answers: Record<number, number>): T {
  const totalScore = computeTotalScore(scale, answers);
  const interpretation =
    scale.interpretation.find(r => totalScore >= r.min && totalScore <= r.max) ??
    scale.interpretation[scale.interpretation.length - 1];
  return {
    ...result,
    totalScore,
    subscaleScores: computeSubscaleScores(scale, answers),
    interpretation,
    scoringVersion: scale.scoringVersion,
  };
}

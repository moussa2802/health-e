/**
 * homeNext — « ta suite » quand les 7 tests de l'animal sont faits :
 * on ne laisse jamais l'accueil sans carte vedette.
 *  1. un test « du moment » pas encore fait (les plus partagés d'abord) ;
 *  2. sinon, refaire un test d'état ancien (anxiété, moral, stress…) : ça bouge, ça vaut le coup de revoir.
 * Logique pure : testée sans navigateur.
 */

/** Les tests bonus, du plus partagé au moins partagé. */
export const VIRAL_ORDER = [
  'bonus_jalousie', 'bonus_hsp', 'bonus_tdah', 'bonus_dependance', 'bonus_burnout', 'bonus_confiance',
  'bonus_eq', 'bonus_sommeil', 'bonus_hpi', 'bonus_narcissisme', 'bonus_personnalite', 'bonus_manipulation',
];

/** Les tests qui décrivent un état (qui change) : ceux qu'on propose de refaire. */
export const RETAKE_ORDER = ['gad7', 'phq9', 'pss10', 'rses', 'brs', 'bonus_sommeil', 'bonus_burnout'];
export const RETAKE_AFTER_DAYS = 45;

export type HomeNext = { kind: 'new'; id: string } | { kind: 'retake'; id: string; days: number } | null;

export function pickHomeNext(done: Record<string, Date | null>, now: number, hidden: string[] = []): HomeNext {
  const fresh = VIRAL_ORDER.find(id => !(id in done) && !hidden.includes(id));
  if (fresh) return { kind: 'new', id: fresh };
  let best: { id: string; days: number } | null = null;
  for (const id of RETAKE_ORDER) {
    const at = done[id];
    if (!at) continue;
    const days = Math.floor((now - at.getTime()) / 86400000);
    if (days >= RETAKE_AFTER_DAYS && (!best || days > best.days)) best = { id, days };
  }
  return best ? { kind: 'retake', ...best } : null;
}

/** « 7 mois », « 3 semaines »… pour « ton test date de … » */
export function sinceLabel(days: number): string {
  if (days >= 60) return `${Math.floor(days / 30)} mois`;
  if (days >= 14) return `${Math.floor(days / 7)} semaines`;
  return `${days} jours`;
}

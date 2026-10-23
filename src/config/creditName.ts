/**
 * Nom des crédits affiché aux utilisateurs — un seul endroit pour le changer.
 * Décision du 23 oct. 2026 : les Koris deviennent des « étincelles » (même concept, mêmes tarifs).
 *  - comptable (« 1 étincelle », « 25 étincelles »), contrairement à « lumière » ;
 *  - pas « énergie » : le mot est déjà utilisé pour l'humeur (check-in, burnout) et suggère
 *    que Dr Lô ou la personne s'épuise, ce que la règle anti-manipulation interdit ;
 *  - va avec l'aura lumineuse autour de Dr Lô.
 * Le code interne garde le nom « koris » (base de données, fonctions, URL) : seul l'affichage change.
 */
export interface CreditName {
  one: string;
  many: string;
  /** « d'étincelles » / « de Koris » (élision) */
  ofMany: string;
  /** « Mes étincelles » (titre) */
  mine: string;
  /** Icône image (petite pièce / étincelle) */
  img: string;
  low: string;
}

export const ETINCELLES: CreditName = {
  one: 'étincelle',
  many: 'étincelles',
  ofMany: 'd\'étincelles',
  mine: 'Mes étincelles',
  img: '/etincelle.png',
  low: 'Il me reste peu d\'étincelles pour les analyses. Je reste là pour t\'écouter, noter ton humeur ou recevoir tes confidences : c\'est gratuit.',
};

export const KORIS: CreditName = {
  one: 'Kori',
  many: 'Koris',
  ofMany: 'de Koris',
  mine: 'Mes Koris',
  img: '/etincelle.png',
  low: 'Il me reste peu de Koris pour les analyses. Je reste là pour t\'écouter, noter ton humeur ou recevoir tes confidences : c\'est gratuit.',
};

export const CREDIT: CreditName = ETINCELLES;

/** « 1 étincelle », « 3 étincelles » */
export const credits = (n: number): string => `${n} ${n > 1 ? CREDIT.many : CREDIT.one}`;
/** Première lettre en majuscule (début de phrase) */
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Seuil « peu de crédits » (≈ une analyse et quelques messages). */
export const LOW_CREDIT = 8;
/** Plein d'aura autour de Dr Lô (au-delà, l'anneau est complet). */
export const AURA_FULL = 50;

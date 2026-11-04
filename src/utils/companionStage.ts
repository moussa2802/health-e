/**
 * companionStage — les 4 stades du compagnon (même liste que netlify/functions/_companionStage.js).
 * Le stade vient du serveur (calculé sur le compte, jamais en arrière) ; on en garde une copie sur l'appareil
 * pour que l'aura s'affiche tout de suite à la bonne taille.
 */
export type CompanionStage = 0 | 1 | 2 | 3;

export const STAGES: { name: string; a: string; when: string; grew: string }[] = [
  { name: 'Étincelle', a: 'une étincelle', when: 'à ton arrivée', grew: '' },
  { name: 'Braise', a: 'une braise', when: 'après ton premier test', grew: 'Ton premier test l\'a allumé : il est devenu une braise.' },
  { name: 'Flamme', a: 'une flamme', when: 'quand ton animal intérieur se révèle', grew: 'Ton animal intérieur s\'est révélé : ton compagnon est devenu une flamme.' },
  { name: 'Feu de veillée', a: 'un feu de veillée', when: '30 jours après ton arrivée, ton animal révélé', grew: 'Trente jours ensemble : ton compagnon est devenu un feu de veillée.' },
];

const KEY = 'he_companion_stage';
export const COMPANION_EVENT = 'he-companion-change';

export function getCompanionStage(): CompanionStage {
  try { const n = Number(localStorage.getItem(KEY)); return (n >= 0 && n <= 3 ? Math.floor(n) : 0) as CompanionStage; } catch { return 0; }
}
export function setCompanionStage(n: number): void {
  const s = Math.max(0, Math.min(3, Math.floor(Number(n) || 0)));
  try { if (Number(localStorage.getItem(KEY)) !== s) { localStorage.setItem(KEY, String(s)); notifyCompanionChange(); } } catch { /* ignore */ }
}
/** Prévient les auras affichées qu'il faut se redessiner (couleur, signe ou stade changés). */
export function notifyCompanionChange(): void {
  try { window.dispatchEvent(new Event(COMPANION_EVENT)); } catch { /* ignore */ }
}

/** Ce qui fera grandir le compagnon ensuite, ou null au dernier stade. */
export function nextStageHint(stage: number): string | null {
  return stage >= 3 ? null : `${STAGES[stage + 1].a} ${STAGES[stage + 1].when}`;
}

/** Taille de l'aura selon le stade (dans son cadre). */
export const STAGE_SCALE = [0.62, 0.8, 0.92, 1] as const;

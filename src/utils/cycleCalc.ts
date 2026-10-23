/**
 * cycleCalc.ts — Estimation du cycle pour l'affichage à côté de l'humeur (bien-être uniquement).
 * Pas un outil de contraception ni de fertilité. Données de départ : le profil companion
 * existant (patients/{uid}.companion : cycleStartDate, cycleLength), partagé avec /app.
 * Logique pure (testable avec node --test). Dates en clés locales AAAA-MM-JJ.
 */

export interface CycleInfo { startDate: string; length: number }

/** Durée des règles affichée (estimation simple, à valider médicalement). */
export const PERIOD_DAYS = 5;
/** Jours « plus sensibles » prévus avant les règles. */
export const SENSITIVE_DAYS = 3;

const DAY = 86400000;
const parse = (k: string) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const keyOf = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (k: string, n: number) => keyOf(parse(k) + n * DAY);
export const diffDays = (a: string, b: string) => Math.round((parse(a) - parse(b)) / DAY);

export function validLength(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v >= 21 && v <= 40 ? Math.round(v) : 28;
}

/** Jour du cycle (1 = premier jour des règles) pour une date ; null avant le premier début connu. */
export function cycleDay(c: CycleInfo, day: string): number | null {
  const d = diffDays(day, c.startDate);
  if (d < 0) return null;
  return (d % validLength(c.length)) + 1;
}

export type CycleMark = 'period' | 'period_predicted' | 'sensitive_predicted' | null;

/**
 * Marque d'un jour : règles (passées / en cours) ou prévisions (règles, jours sensibles).
 * Les jours passés ne portent que les règles du cycle connu ; les prévisions ne concernent que l'avenir.
 */
export function markFor(c: CycleInfo, day: string, today: string): CycleMark {
  const cd = cycleDay(c, day);
  if (cd === null) return null;
  const len = validLength(c.length);
  const future = diffDays(day, today) > 0;
  const sinceStart = diffDays(day, c.startDate);
  if (cd <= PERIOD_DAYS) {
    if (!future) return sinceStart < len ? 'period' : null; // seules les règles réellement déclarées sont « passées »
    return 'period_predicted';
  }
  if (future && cd > len - SENSITIVE_DAYS) return 'sensitive_predicted';
  return null;
}

/** Prochain début de règles prévu, à partir d'aujourd'hui (inclus si on y est). */
export function nextPeriod(c: CycleInfo, today: string): string {
  const len = validLength(c.length);
  const cd = cycleDay(c, today);
  if (cd === null) return c.startDate;
  return addDays(today, cd === 1 ? 0 : len - cd + 1);
}

/**
 * « Mes règles ont commencé aujourd'hui » : nouveau départ, et longueur recalculée
 * si l'écart avec le départ précédent est plausible (21–40 jours).
 */
export function newPeriodStart(c: CycleInfo | null, day: string): CycleInfo {
  if (!c) return { startDate: day, length: 28 };
  const gap = diffDays(day, c.startDate);
  const length = gap >= 21 && gap <= 40 ? Math.round((validLength(c.length) + gap) / 2) : validLength(c.length);
  return { startDate: day, length };
}

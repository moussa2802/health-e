/**
 * moodInsights.ts — Ce que l'humeur notée raconte (page « Ta météo intérieure »).
 * Logique pure (testable avec node --test). Des tendances, jamais des notes ni des diagnostics.
 */
import type { MoodId, MoodMap } from './moodLog.ts';
import { addDays, diffDays, markFor, cycleDay, nextPeriod, validLength, SENSITIVE_DAYS, type CycleInfo, type CycleMark } from './cycleCalc.ts';

export const MOOD_SCORE: Record<MoodId, number> = { tres_bien: 5, plutot_bien: 4, bof: 3, pas_bien: 2, tres_dur: 1 };
export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** 0 = lundi … 6 = dimanche */
export function weekdayIndex(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export interface MonthCell { day: string | null; n: number | null; mood?: MoodId; isToday: boolean; isFuture: boolean; cycle: CycleMark }

/** Grille du mois (semaines commençant le lundi), cases vides avant le 1er. */
export function monthCells(year: number, month: number, moods: MoodMap, today: string, cycle: CycleInfo | null): MonthCell[] {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: MonthCell[] = [];
  for (let i = 0; i < weekdayIndex(first); i++) cells.push({ day: null, n: null, isToday: false, isFuture: false, cycle: null });
  for (let n = 1; n <= daysInMonth; n++) {
    const day = addDays(first, n - 1);
    cells.push({
      day, n, mood: moods[day]?.mood, isToday: day === today, isFuture: diffDays(day, today) > 0,
      cycle: cycle ? markFor(cycle, day, today) : null,
    });
  }
  return cells;
}

const scoreOf = (moods: MoodMap, day: string): number | null => (moods[day] ? MOOD_SCORE[moods[day].mood] : null);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

/** Série des `n` derniers jours (null = pas noté). */
export function series(moods: MoodMap, today: string, n = 30): { day: string; score: number | null }[] {
  return lastDays(today, n).map(day => ({ day, score: scoreOf(moods, day) }));
}

export type Trend = 'up' | 'down' | 'stable' | null;

/** Compare les 7 derniers jours aux 7 précédents (au moins 3 jours notés de chaque côté). */
export function trend(moods: MoodMap, today: string): Trend {
  const recent = lastDays(today, 7).map(d => scoreOf(moods, d)).filter((x): x is number => x !== null);
  const before = lastDays(addDays(today, -7), 7).map(d => scoreOf(moods, d)).filter((x): x is number => x !== null);
  if (recent.length < 3 || before.length < 3) return null;
  const delta = avg(recent)! - avg(before)!;
  return delta >= 0.5 ? 'up' : delta <= -0.5 ? 'down' : 'stable';
}

/** Moyenne par jour de la semaine sur la période (lundi → dimanche). */
export function weekdayAverages(moods: MoodMap, today: string, n = 90): { avg: number | null; count: number }[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const d of lastDays(today, n)) {
    const s = scoreOf(moods, d);
    if (s !== null) buckets[weekdayIndex(d)].push(s);
  }
  return buckets.map(b => ({ avg: avg(b), count: b.length }));
}

export function countNoted(moods: MoodMap, days: string[]): number {
  return days.filter(d => moods[d]).length;
}

export interface Remark { text: string; tone: 'calm' | 'care'; suggestTest?: 'pss10' | 'phq9' }

/** Ce que Dr Lô remarque. Priorité : une période difficile → orientation humaine. */
export function remark(moods: MoodMap, today: string, prenom?: string, genre?: 'homme' | 'femme'): Remark {
  const seul = genre === 'femme' ? 'seule' : genre === 'homme' ? 'seul' : 'sans soutien';
  const last14 = lastDays(today, 14);
  const low = last14.filter(d => { const s = scoreOf(moods, d); return s !== null && s <= 2; }).length;
  if (low >= 5) {
    return {
      tone: 'care',
      suggestTest: 'phq9',
      text: `${prenom ? `${prenom}, ces` : 'Ces'} deux dernières semaines ont souvent été difficiles (${low} jours lourds). Tu n'as pas à porter ça ${seul} : en parler à un professionnel peut vraiment aider. Et si ça devient trop dur, le 1515 répond à toute heure.`,
    };
  }
  const noted30 = countNoted(moods, lastDays(today, 30));
  if (noted30 < 5) {
    return { tone: 'calm', text: `Note ton humeur quelques jours de plus : à partir d'une semaine, je pourrai te montrer comment elle bouge.` };
  }
  const t = trend(moods, today);
  const parts: string[] = [];
  if (t === 'up') parts.push('Ton humeur remonte ces derniers jours.');
  else if (t === 'down') parts.push('Ton humeur est un peu plus basse cette semaine que la précédente.');
  else if (t === 'stable') parts.push('Ton humeur est plutôt stable ces deux dernières semaines.');
  else parts.push(`Tu as noté ton humeur ${noted30} jours sur les 30 derniers : merci, c'est comme ça qu'on y voit clair.`);
  const wd = weekdayAverages(moods, today);
  const known = wd.map((w, i) => ({ ...w, i })).filter(w => w.count >= 2 && w.avg !== null);
  if (known.length >= 4) {
    const overall = avg(known.map(w => w.avg!))!;
    const worst = known.reduce((a, b) => (b.avg! < a.avg! ? b : a));
    const best = known.reduce((a, b) => (b.avg! > a.avg! ? b : a));
    if (overall - worst.avg! >= 0.7) parts.push(`Les ${WEEKDAY_NAMES[worst.i]}s sont souvent plus lourds.`);
    else if (best.avg! - overall >= 0.7) parts.push(`Les ${WEEKDAY_NAMES[best.i]}s te réussissent bien.`);
  }
  return { tone: 'calm', text: parts.join(' '), suggestTest: t === 'down' ? 'pss10' : undefined };
}

export interface CycleRemark { next: string; sensitiveFrom: string; link: string | null; enoughData: boolean }

/** Humeur et cycle : prochaine date prévue + lien humeur / fin de cycle s'il y a assez de données. */
export function cycleRemark(moods: MoodMap, cycle: CycleInfo, today: string): CycleRemark {
  const next = nextPeriod(cycle, today);
  const sensitiveFrom = addDays(next, -SENSITIVE_DAYS);
  const len = validLength(cycle.length);
  const before: number[] = []; const other: number[] = [];
  for (const d of lastDays(today, 120)) {
    const s = scoreOf(moods, d);
    const cd = cycleDay(cycle, d) ?? estimatedBackDay(cycle, d);
    if (s === null || cd === null) continue;
    (cd > len - SENSITIVE_DAYS ? before : other).push(s);
  }
  const enoughData = before.length >= 4 && other.length >= 15;
  let link: string | null = null;
  if (enoughData) {
    const delta = avg(other)! - avg(before)!;
    link = delta >= 0.7
      ? 'Ton humeur baisse un peu dans les jours qui précèdent tes règles.'
      : 'Ton humeur ne semble pas suivre ton cycle : ce qui la fait bouger est ailleurs.';
  }
  return { next, sensitiveFrom, link, enoughData };
}

/** Avant le début connu, on remonte le cycle en arrière (même longueur) pour l'analyse. */
function estimatedBackDay(c: CycleInfo, day: string): number | null {
  const len = validLength(c.length);
  const d = diffDays(day, c.startDate);
  if (d >= 0) return null;
  return (((d % len) + len) % len) + 1;
}

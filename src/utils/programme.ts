/**
 * programme.ts — « Mon programme » : logique pure (testée dans tests/unit/programme.test.ts).
 *
 * Un programme dure 28 jours, porte sur un axe (stress, humeur, sommeil) et donne chaque jour
 * 3 engagements : mon humeur, mon action (un exercice de la bibliothèque), mon apprentissage.
 * Cocher est gratuit ; la proposition et les bilans (IA) coûtent des étincelles côté serveur.
 */
import {
  AXES, BREATH_EXERCISE, CHAPTERS, EXERCISES, learningsFor, PROG_AXES,
  type ProgAxis, type ProgExercise, type ProgLearning,
} from '../data/programmeLibrary.ts';

export const PROGRAMME_DAYS = 28;
/** Pas de nouveau test avant 14 jours (GAD-7 et PHQ-9 portent sur les 2 dernières semaines). */
export const MIN_DAYS_BEFORE_RETEST = 14;

export type SleepNote = 'mal' | 'moyen' | 'bien';
export type EngKey = 'mood' | 'action' | 'learn';
export type ProgStatus = 'active' | 'paused' | 'done' | 'stopped';

export interface Programme {
  v: 1;
  id: string;
  axis: ProgAxis;
  /** Premier jour (AAAA-MM-JJ, fuseau de la personne) */
  startDay: string;
  /** Version légère : un jour sur deux, l'action devient une respiration d'une minute */
  light: boolean;
  status: ProgStatus;
  /** Test qui a déclenché le programme : on le refait à la fin pour comparer */
  baseline: { scaleId: string; score: number; label: string; at: string } | null;
  /** Ordre des exercices de la semaine 1, choisi par Dr Lô parmi la bibliothèque */
  order1: string[];
  /** Pour toi aujourd'hui à la proposition */
  intro: string;
  /** Résultat sensible au départ : orientation vers un professionnel d'abord, version légère */
  fragile?: boolean;
  /** Engagements cochés, par jour */
  checks: Record<string, EngKey[]>;
  /** Habitude du jour : la personne s'y est engagée le matin (on lui redemande le soir) */
  commits?: Record<string, boolean>;
  /** Routines ajoutées (celles de l'animal intérieur, par exemple) : retirables à tout moment */
  routines?: string[];
  /** Routines cochées, par jour */
  rchecks?: Record<string, string[]>;
  /** Programme sommeil : la nuit notée d'un tap, par jour */
  sleep: Record<string, SleepNote>;
  bilans: { week: number; text: string; at: string; advice?: 'garder' | 'alleger' | 'changer' }[];
  /** Pause : le jour où elle a commencé, et le total des jours passés en pause */
  pausedDay?: string;
  pausedDays?: number;
  endedAt?: string;
  result?: { scaleId: string; before: number; after: number; beforeLabel: string; afterLabel: string; at: string };
}

export interface Engagement {
  key: EngKey;
  kind: 'mood' | 'breath' | 'exercise' | 'learn';
  refId: string;
  title: string;
  text: string;
  duration?: string;
  /** Apprentissage déjà lu une fois : « à relire » */
  reread?: boolean;
}

// ── Dates (jours locaux AAAA-MM-JJ) ──────────────────────────────────────────

const toUtc = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, day || 1);
};
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}
export function addDays(d: string, n: number): string {
  const t = new Date(toUtc(d) + n * 86400000);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

// ── Jour du programme ────────────────────────────────────────────────────────

/** Jour du programme (1 = premier jour). Une pause gèle le compteur. Peut dépasser 28. */
export function dayNumber(p: Programme, today: string): number {
  const ref = p.status === 'paused' && p.pausedDay ? p.pausedDay : today;
  return Math.max(1, daysBetween(p.startDay, ref) + 1 - (p.pausedDays ?? 0));
}
export const weekOf = (day: number): 1 | 2 | 3 | 4 => Math.min(4, Math.max(1, Math.ceil(day / 7))) as 1 | 2 | 3 | 4;

/** Les exercices d'une semaine, dans l'ordre (semaine 1 : l'ordre choisi par Dr Lô). */
export function weekPool(p: Pick<Programme, 'axis' | 'order1'>, week: number): ProgExercise[] {
  const all = EXERCISES[p.axis].filter(e => e.week === week);
  if (week !== 1 || !p.order1?.length) return all;
  const chosen = p.order1.map(id => all.find(e => e.id === id)).filter((e): e is ProgExercise => !!e);
  return [...chosen, ...all.filter(e => !chosen.includes(e))];
}

/** Les 3 engagements d'un jour du programme. */
export function planFor(p: Pick<Programme, 'axis' | 'order1' | 'light'>, day: number): Engagement[] {
  const d = Math.min(PROGRAMME_DAYS, Math.max(1, day));
  const pool = weekPool(p, weekOf(d));
  const ex = p.light && d % 2 === 0 ? BREATH_EXERCISE : pool[(d - 1) % 7 % pool.length];
  const learns = learningsFor(p.axis);
  const ln: ProgLearning = learns[(d - 1) % learns.length];
  return [
    {
      key: 'mood', kind: 'mood', refId: 'mood',
      title: p.axis === 'sommeil' ? 'Mon humeur et ma nuit' : 'Mon humeur du jour',
      text: p.axis === 'sommeil'
        ? 'Comment tu te sens, et comment tu as dormi cette nuit ? Un tap pour chacun.'
        : 'Comment tu te sens aujourd\'hui ? Un tap, 30 secondes.',
      duration: '30 s',
    },
    { key: 'action', kind: ex.id === BREATH_EXERCISE.id ? 'breath' : 'exercise', refId: ex.id, title: ex.title, text: ex.text, duration: ex.duration },
    { key: 'learn', kind: 'learn', refId: ln.id, title: ln.title, text: ln.text, duration: '30 s', reread: d > learns.length },
  ];
}

export type MoodLike = Record<string, { mood: string } | undefined>;

export function isDone(p: Programme, date: string, key: EngKey, moods: MoodLike): boolean {
  if (key === 'mood') return !!moods[date];
  return (p.checks[date] ?? []).includes(key);
}

export function remainingToday(p: Programme, today: string, moods: MoodLike): number {
  const core = (['mood', 'action', 'learn'] as EngKey[]).filter(k => !isDone(p, today, k, moods)).length;
  const done = p.rchecks?.[today] ?? [];
  return core + (p.routines ?? []).filter(id => !done.includes(id)).length;
}

export const routineDone = (p: Programme, date: string, id: string) => (p.rchecks?.[date] ?? []).includes(id);

export function toggleRoutine(p: Programme, date: string, id: string, on?: boolean): Programme {
  const cur = p.rchecks?.[date] ?? [];
  const has = cur.includes(id);
  const want = on ?? !has;
  if (want === has) return p;
  return { ...p, rchecks: { ...(p.rchecks ?? {}), [date]: want ? [...cur, id] : cur.filter(x => x !== id) } };
}

/** Ajouter ou retirer une routine du programme. */
export function setRoutine(p: Programme, id: string, on: boolean): Programme {
  const cur = p.routines ?? [];
  if (on === cur.includes(id)) return p;
  return { ...p, routines: on ? [...cur, id] : cur.filter(x => x !== id) };
}

export function toggleCheck(p: Programme, date: string, key: EngKey, on?: boolean): Programme {
  const cur = p.checks[date] ?? [];
  const has = cur.includes(key);
  const want = on ?? !has;
  if (want === has) return p;
  const next = want ? [...cur, key] : cur.filter(k => k !== key);
  return { ...p, checks: { ...p.checks, [date]: next } };
}

export function setSleep(p: Programme, date: string, note: SleepNote): Programme {
  return { ...p, sleep: { ...p.sleep, [date]: note } };
}

/** Un jour « actif » : au moins un engagement tenu (l'humeur notée compte). */
export function isActiveDay(p: Programme, date: string, moods: MoodLike): boolean {
  return !!moods[date] || (p.checks[date] ?? []).length > 0 || (p.rchecks?.[date] ?? []).length > 0;
}

export type DotState = 'done' | 'missed' | 'today' | 'future';
/** Les 7 jours de la semaine du programme en cours. */
export function weekDots(p: Programme, today: string, moods: MoodLike): { dots: DotState[]; active: number } {
  const day = Math.min(PROGRAMME_DAYS, dayNumber(p, today));
  const start = (weekOf(day) - 1) * 7 + 1;
  const dots: DotState[] = [];
  let active = 0;
  for (let n = start; n < start + 7; n += 1) {
    const date = addDays(today, n - day);
    if (n > day) { dots.push('future'); continue; }
    const on = isActiveDay(p, date, moods);
    if (on) active += 1;
    dots.push(on ? 'done' : n === day ? 'today' : 'missed');
  }
  return { dots, active };
}

// ── Humeur ───────────────────────────────────────────────────────────────────

const MOOD_SCORE: Record<string, number> = { tres_bien: 5, plutot_bien: 4, bof: 3, pas_bien: 2, tres_dur: 1 };

/** Moyenne de l'humeur sur 7 jours finissant à `end` (null si moins de 3 jours notés). */
export function moodAvg(moods: MoodLike, end: string): number | null {
  const vals: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    const m = moods[addDays(end, -i)];
    if (m && MOOD_SCORE[m.mood]) vals.push(MOOD_SCORE[m.mood]);
  }
  return vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/** Jours « très dur » d'affilée jusqu'à aujourd'hui (ou hier si aujourd'hui n'est pas noté). */
export function hardStreak(moods: MoodLike, today: string): number {
  let d = moods[today] ? today : addDays(today, -1);
  let n = 0;
  while (moods[d]?.mood === 'tres_dur') { n += 1; d = addDays(d, -1); }
  return n;
}

/** L'humeur remonte nettement deux semaines de suite (3 semaines comparées). */
export function moodImproving(moods: MoodLike, today: string): boolean {
  const w3 = moodAvg(moods, today);
  const w2 = moodAvg(moods, addDays(today, -7));
  const w1 = moodAvg(moods, addDays(today, -14));
  return w1 !== null && w2 !== null && w3 !== null && w2 - w1 >= 0.4 && w3 - w2 >= 0.4;
}

// ── Bilan et nouveau test ────────────────────────────────────────────────────

/** Semaine dont le bilan est proposé (jours 7, 14, 21, 28), ou null. */
export function bilanDue(p: Programme, today: string): number | null {
  const w = Math.min(4, Math.floor(dayNumber(p, today) / 7));
  if (w < 1 || p.bilans.some(b => b.week === w)) return null;
  return w;
}

export interface RetestInfo { scaleId: string; available: boolean; fromDay: number }
export function retestInfo(p: Programme, today: string, moods: MoodLike): RetestInfo | null {
  if (!p.baseline) return null;
  const day = dayNumber(p, today);
  const fromDay = moodImproving(moods, today) ? 21 : PROGRAMME_DAYS;
  const sinceTest = daysBetween(p.baseline.at.slice(0, 10), today);
  return { scaleId: p.baseline.scaleId, fromDay, available: day >= fromDay && sinceTest >= MIN_DAYS_BEFORE_RETEST };
}

/** Le nouveau test est arrivé : on garde l'avant / après et le programme se termine. */
export function withResult(p: Programme, r: { totalScore: number; label: string; at: string }): Programme {
  if (!p.baseline) return p;
  return {
    ...p,
    status: 'done',
    endedAt: r.at,
    result: { scaleId: p.baseline.scaleId, before: p.baseline.score, after: r.totalScore, beforeLabel: p.baseline.label, afterLabel: r.label, at: r.at },
  };
}

/** Pour le SCI (sommeil), un score plus haut est meilleur ; pour les autres, plus bas. */
export const higherIsBetter = (scaleId: string) => scaleId === 'bonus_sommeil' || scaleId === 'brs';
export function improved(r: NonNullable<Programme['result']>): 'mieux' | 'pareil' | 'moins_bien' {
  const delta = higherIsBetter(r.scaleId) ? r.after - r.before : r.before - r.after;
  if (delta >= 2) return 'mieux';
  if (delta <= -2) return 'moins_bien';
  return 'pareil';
}

// ── Pause ────────────────────────────────────────────────────────────────────

export function pause(p: Programme, today: string): Programme {
  if (p.status !== 'active') return p;
  return { ...p, status: 'paused', pausedDay: today };
}
export function resume(p: Programme, today: string): Programme {
  if (p.status !== 'paused' || !p.pausedDay) return { ...p, status: 'active' };
  return { ...p, status: 'active', pausedDays: (p.pausedDays ?? 0) + Math.max(0, daysBetween(p.pausedDay, today)), pausedDay: undefined };
}

// ── Qui peut se voir proposer quel programme ─────────────────────────────────

export interface ResultLike {
  totalScore: number;
  completedAt?: Date | string | { toDate?: () => Date };
  alertLevel?: number;
  interpretation?: { severity?: string; label?: string; referralRequired?: boolean } | null;
}

export interface AxisSignal {
  axis: ProgAxis;
  scaleId: string;
  score: number;
  label: string;
  /** 1 léger, 2 modéré, 3 fort */
  rank: 1 | 2 | 3;
  /** Résultat sévère, orientation conseillée, ou idées noires (PHQ-9 item 9) */
  fragile: boolean;
  at: string;
}

const SEV_RANK: Record<string, 1 | 2 | 3> = { mild: 1, moderate: 2, severe: 3, alert: 3 };

function isoOf(c: ResultLike['completedAt']): string {
  if (!c) return new Date().toISOString();
  if (typeof c === 'string') return c;
  if (c instanceof Date) return c.toISOString();
  if (typeof (c as { toDate?: () => Date }).toDate === 'function') return (c as { toDate: () => Date }).toDate().toISOString();
  return new Date().toISOString();
}

/** Les axes où un programme aiderait, du signal le plus fort au plus léger. */
export function programmeSignals(results: Record<string, ResultLike | undefined>): AxisSignal[] {
  const out: AxisSignal[] = [];
  const add = (axis: ProgAxis, scaleId: string, rank: 1 | 2 | 3 | undefined, fragileExtra = false) => {
    const r = results[scaleId];
    if (!r || !rank) return;
    const fragile = fragileExtra || !!r.interpretation?.referralRequired || r.interpretation?.severity === 'severe' || (r.alertLevel ?? 0) >= 3;
    out.push({ axis, scaleId, score: r.totalScore, label: r.interpretation?.label ?? '', rank, fragile, at: isoOf(r.completedAt) });
  };
  const sev = (id: string) => SEV_RANK[results[id]?.interpretation?.severity ?? ''];
  add('stress', 'gad7', sev('gad7'));
  const pss = results.pss10?.interpretation?.severity;
  add('stress', 'pss10', pss === 'moderate' ? 2 : pss === 'severe' ? 3 : undefined);
  const bo = results.bonus_burnout?.totalScore ?? -1;
  add('stress', 'bonus_burnout', bo >= 43 ? 3 : bo >= 31 ? 2 : undefined);
  add('humeur', 'phq9', sev('phq9'));
  const sci = results.bonus_sommeil?.totalScore;
  add('sommeil', 'bonus_sommeil', sci === undefined ? undefined : sci <= 8 ? 3 : sci <= 16 ? 2 : undefined);
  // Un seul signal par axe : le plus fort
  const best = new Map<ProgAxis, AxisSignal>();
  for (const s of out) {
    const cur = best.get(s.axis);
    if (!cur || s.rank > cur.rank) best.set(s.axis, { ...s, fragile: s.fragile || !!cur?.fragile });
    else if (s.fragile) best.set(s.axis, { ...cur, fragile: true });
  }
  const prio: Record<ProgAxis, number> = { humeur: 0, stress: 1, sommeil: 2 };
  return [...best.values()].sort((a, b) => b.rank - a.rank || prio[a.axis] - prio[b.axis]);
}

export function newProgramme(o: {
  axis: ProgAxis; today: string; light: boolean; intro: string; order1: string[];
  signal?: AxisSignal | null; now?: Date; routines?: string[];
}): Programme {
  const now = o.now ?? new Date();
  const valid = new Set(EXERCISES[o.axis].filter(e => e.week === 1).map(e => e.id));
  return {
    v: 1,
    id: `p${now.getTime().toString(36)}`,
    axis: o.axis,
    startDay: o.today,
    light: o.light || !!o.signal?.fragile,
    status: 'active',
    baseline: o.signal ? { scaleId: o.signal.scaleId, score: o.signal.score, label: o.signal.label, at: o.signal.at } : null,
    order1: o.order1.filter(id => valid.has(id)),
    intro: o.intro,
    fragile: !!o.signal?.fragile,
    checks: {},
    sleep: {},
    bilans: [],
    ...(o.routines?.length ? { routines: o.routines } : {}),
  };
}

/** Ce qui est envoyé à l'IA pour le bilan : des comptes, jamais le contenu du journal. */
export function bilanSummary(p: Programme, today: string, moods: MoodLike) {
  const day = Math.min(PROGRAMME_DAYS, dayNumber(p, today));
  const week = weekOf(day);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const count = (k: EngKey) => last7.filter(d => isDone(p, d, k, moods)).length;
  const done = new Set<string>();
  last7.forEach((d, i) => {
    const n = day - i;
    if (n >= 1 && (p.checks[d] ?? []).includes('action')) done.add(planFor(p, n)[1].title);
  });
  const sleep = last7.map(d => p.sleep[d]).filter(Boolean) as SleepNote[];
  const r1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);
  return {
    axis: p.axis,
    day,
    week,
    light: p.light,
    activeDays: last7.filter(d => isActiveDay(p, d, moods)).length,
    counts: { mood: count('mood'), action: count('action'), learn: count('learn') },
    moodNow: r1(moodAvg(moods, today)),
    moodBefore: r1(moodAvg(moods, addDays(today, -7))),
    sleep: { mal: sleep.filter(s => s === 'mal').length, moyen: sleep.filter(s => s === 'moyen').length, bien: sleep.filter(s => s === 'bien').length },
    actionsDone: [...done].slice(0, 7),
  };
}

// ── Ce qui rend le programme vivant ──────────────────────────────────────────

/** Jours actifs d'affilée jusqu'à aujourd'hui (aujourd'hui compte s'il est déjà actif). */
export function streak(p: Programme, today: string, moods: MoodLike): number {
  let d = isActiveDay(p, today, moods) ? today : addDays(today, -1);
  let n = 0;
  while (daysBetween(p.startDay, d) >= 0 && isActiveDay(p, d, moods)) { n += 1; d = addDays(d, -1); }
  return n;
}

export const dayComplete = (p: Programme, date: string, moods: MoodLike) =>
  (['mood', 'action', 'learn'] as EngKey[]).every(k => isDone(p, date, k, moods));

/** Pour toi aujourd'hui en haut de l'écran, chaque jour (textes écrits à l'avance, gratuits). */
export function dailyLine(p: Programme, today: string, moods: MoodLike, prenom?: string): string {
  const day = Math.min(PROGRAMME_DAYS, dayNumber(p, today));
  const w = weekOf(day);
  const ch = CHAPTERS[p.axis][w - 1];
  const act = planFor(p, day)[1];
  const what = `${act.title.charAt(0).toLowerCase()}${act.title.slice(1)}${act.duration ? ` (${act.duration})` : ''}`;
  const hi = prenom ? `${prenom}, ` : '';
  if (day === 1) return p.intro || `${hi}bienvenue dans ton programme. Aujourd'hui : ${what}. Je te guide.`;
  if (!isActiveDay(p, addDays(today, -1), moods) && !isActiveDay(p, today, moods)) {
    return `Content de te revoir${prenom ? `, ${prenom}` : ''}. Un jour manqué n'efface rien : on reprend simplement aujourd'hui avec ${what}.`;
  }
  if ((day - 1) % 7 === 0) return `Nouvelle étape : « ${ch.name} ». ${ch.why} Aujourd'hui : ${what}.`;
  return `${hi ? hi.charAt(0).toUpperCase() + hi.slice(1) : ''}${hi ? 's' : 'S'}emaine ${w}, « ${ch.name} ». Aujourd'hui : ${what}. Je te guide.`;
}

/** Humeur jour après jour depuis le début (1 = très dur … 5 = très bien), null si non notée. */
export function moodSeries(p: Programme, today: string, moods: MoodLike): (number | null)[] {
  const n = Math.min(PROGRAMME_DAYS, Math.max(1, daysBetween(p.startDay, today) + 1));
  return Array.from({ length: n }, (_, i) => {
    const m = moods[addDays(p.startDay, i)];
    return m && MOOD_SCORE[m.mood] ? MOOD_SCORE[m.mood] : null;
  });
}

export { AXES, PROG_AXES };
export type { ProgAxis };

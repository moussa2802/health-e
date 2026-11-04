/**
 * weeklyPoint — « Ton point de la semaine » : le compagnon fait le bilan des 7 derniers jours.
 * Construit par règles (pas d'IA : instantané, gratuit, toujours le même ton), à partir de ce que le site sait déjà :
 * la météo intérieure, les résultats des tests, la proposition du moment, le prochain Pénc.
 * Des mots, jamais des notes ; jamais un diagnostic ; un signal sérieux oriente vers une vraie personne.
 * Logique pure : testée sans navigateur.
 */
export interface PointResult { severity?: string; label?: string; completedAt?: Date | null; alertLevel?: number }
export interface PointInput {
  today: string;                                  // 'YYYY-MM-DD'
  moods: Record<string, { mood: string }>;
  results: Record<string, PointResult>;
  suggestion?: { id: string; short: string } | null;
  penc?: { id: string; title: string; when: string } | null;
  labelOf: (scaleId: string) => string;
}
export type Tone = 'sage' | 'or' | 'ambre' | 'lavande' | 'neutre';
export interface PointState { label: string; word: string; tone: Tone }
export type PointTodo = { text: string; kind: 'test' | 'mood' | 'breath' | 'penc' | 'totem' | 'help'; ref?: string };
export interface WeeklyPoint { week: string; range: string; days: (string | null)[]; states: PointState[]; changes: string[]; todos: PointTodo[]; question: string; care: boolean }

/** Un résultat compte pour l'alerte pendant 60 jours. */
const CARE_DAYS = 60;
const MOOD_SCORE: Record<string, number> = { tres_bien: 5, plutot_bien: 4, bof: 3, pas_bien: 2, tres_dur: 1 };
const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const QUESTIONS = [
  'Qu\'est-ce qui t\'a fait du bien cette semaine ?',
  'Quel moment de la semaine aimerais-tu revivre ?',
  'Qu\'est-ce qui t\'a pesé le plus, et pourquoi à ton avis ?',
  'À qui as-tu pensé cette semaine ?',
  'Qu\'est-ce que tu aimerais changer la semaine prochaine ?',
  'De quoi es-tu fier ou fière cette semaine, même un petit truc ?',
];
/** Les tests d'état qu'on suit chaque semaine, dans cet ordre. */
const TRACKED: [string, string][] = [['pss10', 'Stress'], ['phq9', 'Moral'], ['gad7', 'Inquiétude'], ['rses', 'Estime de soi']];

const toDay = (s: string) => new Date(`${s}T12:00:00Z`);
const addDays = (s: string, n: number) => { const d = toDay(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmt = (s: string) => { const d = toDay(s); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

/** Le lundi de la semaine (clé du point : un par semaine). */
export function weekKey(today: string): string {
  const d = toDay(today).getUTCDay(); // 0 = dimanche
  return addDays(today, -((d + 6) % 7));
}

export function severityWord(sev?: string): { word: string; tone: Tone } {
  switch (sev) {
    case 'none': case 'minimal': case 'positive': return { word: 'Ça tient', tone: 'sage' };
    case 'mild': return { word: 'Léger', tone: 'or' };
    case 'moderate': return { word: 'À surveiller', tone: 'ambre' };
    case 'severe': case 'alert': return { word: 'À prendre soin', tone: 'lavande' };
    default: return { word: 'À découvrir', tone: 'neutre' };
  }
}

export function buildWeeklyPoint(inp: PointInput): WeeklyPoint {
  const { today, moods, results, labelOf } = inp;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const marks = days.map(d => (moods[d] ? moods[d].mood : null));
  const scored = days.filter(d => moods[d] && MOOD_SCORE[moods[d].mood]).map(d => ({ d, s: MOOD_SCORE[moods[d].mood] }));
  const notes = scored.length;
  const avg = notes ? scored.reduce((a, b) => a + b.s, 0) / notes : null;

  // Où tu en es
  const states: PointState[] = [];
  states.push(notes < 2 ? { label: 'Humeur', word: 'Pas assez notée', tone: 'neutre' }
    : avg! >= 4 ? { label: 'Humeur', word: 'Plutôt claire', tone: 'sage' }
    : avg! >= 3 ? { label: 'Humeur', word: 'Variable', tone: 'or' }
    : { label: 'Humeur', word: 'Chargée', tone: 'lavande' });
  for (const [id, label] of TRACKED) {
    const r = results[id];
    if (r && states.length < 4) states.push({ label, ...severityWord(r.severity) });
  }

  // Ce qui a bougé
  const changes: string[] = [];
  if (notes === 0) changes.push('Tu n\'as pas noté ton humeur cette semaine. 30 secondes par jour suffisent pour que je voie ce qui bouge.');
  else changes.push(`Tu as noté ton humeur ${notes} jour${notes > 1 ? 's' : ''} sur 7.`);
  if (notes >= 4) {
    const best = scored.reduce((a, b) => (b.s > a.s ? b : a)), worst = scored.reduce((a, b) => (b.s < a.s ? b : a));
    if (best.s - worst.s >= 2) changes.push(`Ta meilleure journée : ${DAY_NAMES[toDay(best.d).getUTCDay()]}. La plus lourde : ${DAY_NAMES[toDay(worst.d).getUTCDay()]}.`);
  }
  const from = toDay(days[0]).getTime() - 12 * 3600000;
  const recent = Object.entries(results).filter(([, r]) => r.completedAt && r.completedAt.getTime() >= from).map(([id]) => labelOf(id));
  if (recent.length) changes.push(`Tu as fait ${recent.length > 1 ? `${recent.length} tests` : 'un test'} cette semaine : ${recent.slice(0, 3).map(l => `« ${l} »`).join(', ')}.`);

  // Un signal sérieux : on le dit avec douceur et on oriente
  // (seulement sur des résultats récents : un ancien résultat difficile ne doit pas alarmer chaque semaine)
  const fresh = (r?: PointResult) => !!r?.completedAt && toDay(today).getTime() - r.completedAt.getTime() <= CARE_DAYS * 86400000;
  const care = Object.values(results).some(r => fresh(r) && (r.alertLevel ?? 0) >= 2)
    || ['phq9', 'gad7'].some(id => fresh(results[id]) && (results[id]?.severity === 'severe' || results[id]?.severity === 'alert'))
    || (notes >= 3 && avg! < 2);

  // Ce que je te propose (3 au plus)
  const todos: PointTodo[] = [];
  if (care) todos.push({ text: 'En parler à quelqu\'un de confiance, ou à un professionnel. Je peux t\'aider à trouver vers qui aller.', kind: 'help' });
  if (inp.suggestion) todos.push({ text: inp.suggestion.short, kind: inp.suggestion.id ? 'test' : 'totem', ref: inp.suggestion.id });
  if (notes < 4) todos.push({ text: 'Noter ton humeur chaque soir, 30 secondes', kind: 'mood' });
  const tense = ['pss10', 'gad7'].some(id => ['moderate', 'severe', 'alert'].includes(results[id]?.severity ?? ''));
  if (tense && todos.length < 3) todos.push({ text: 'Respirer une minute avec moi quand ça monte', kind: 'breath' });
  if (inp.penc && todos.length < 3) todos.push({ text: `${inp.penc.when} : ${inp.penc.title}`, kind: 'penc', ref: inp.penc.id });

  const wk = weekKey(today);
  const n = Math.floor(toDay(wk).getTime() / (7 * 86400000));
  return { week: wk, range: `du ${fmt(days[0])} au ${fmt(days[6])}`, days: marks, states, changes, todos: todos.slice(0, 3), question: QUESTIONS[n % QUESTIONS.length], care };
}

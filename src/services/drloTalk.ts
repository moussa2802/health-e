/**
 * drloTalk — la discussion approfondie avec Dr Lô (IA, 1 étincelle par message), désormais
 * DANS la conversation de l'accueil : un seul Dr Lô, un seul fil. Même fonction serveur
 * (dr-lo-chat), même contexte (profil, tests, journal récent, compatibilités), même limite du jour.
 */
import { collection, query, orderBy, getDocs, doc, setDoc, getDoc, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getOnboardingProfile } from '../utils/onboardingProfile';
import { getProfileProgress } from './evaluationService';
import { getCompatibilityHistory } from './compatibilityService';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../data/scales';
import type { ScaleResult } from '../types/assessment';
import { getTotemSignature, computeDimensionGauges, type TotemAnimal } from '../utils/totemAlgorithm';
import { TOTEM_GUIDE } from '../data/totemGuide';
import { authedFetch } from '../utils/authedFetch';
import { spendKorisForUnlock } from './korisService';

export const DAILY_MESSAGE_LIMIT = 10;
export const UNLOCK_MESSAGES = 5;
export const MAX_DAILY_UNLOCKS = 3;

// ── Build full context ────────────────────────────────────────────────────────

const ALL_SCALES = [...MENTAL_HEALTH_SCALES, ...SEXUAL_HEALTH_SCALES, ...BONUS_SCALES];
const SCALE_MAP = new Map(ALL_SCALES.map(s => [s.id, s]));

function formatResult(id: string, r: ScaleResult) {
  const scale = SCALE_MAP.get(id);
  return {
    scaleName: scale?.name ?? id,
    label: r.interpretation?.label ?? '',
    score: r.totalScore,
    scoreMax: scale?.scoreRange?.max ?? 0,
    description: r.interpretation?.description ?? '',
    severity: r.interpretation?.severity ?? '',
    subscaleScores: r.subscaleScores ?? {},
    category: scale?.category ?? 'bonus',
    completedAt: r.completedAt,
  };
}

function buildTotemResume(
  animal: string | null,
  scaleResults: Record<string, ScaleResult>,
): string | null {
  if (!animal) return null;
  const sig = getTotemSignature(animal as TotemAnimal);
  const gauges = computeDimensionGauges(scaleResults);
  if (!gauges.length) return `Totem : ${sig.label} — ${sig.meaning}`;

  const tierLabel = (pct: number) =>
    pct >= 67 ? 'force' : pct >= 34 ? 'moyen' : 'à améliorer';

  const lines = gauges.map(g => `${g.label}: ${g.fillPercent}% (${tierLabel(g.fillPercent)})`);
  const gd = TOTEM_GUIDE[animal as TotemAnimal];
  const daily = gd ? `\nAu quotidien : force = ${gd.force} Piège quand ça chauffe = ${gd.piege} Ce qui le recharge = ${gd.recharge} Défi de la semaine proposé = ${gd.defi}`.replace(/\{\{([^|]+)\|[^}]+\}\}/g, '$1') : '';
  return `Totem : ${sig.label} — ${sig.meaning}\nProfil 7 aspects : ${lines.join(' · ')}${daily}`;
}

export async function buildFullContext(userId: string | null) {
  const onboarding = getOnboardingProfile();

  let scaleResults: Record<string, ScaleResult> = {};
  let drLoMentalAnalysis: string | null = null;
  let drLoSexualAnalysis: string | null = null;
  let drLoAnalysis: string | null = null;
  let totemAnimal: string | null = null;

  if (userId) {
    try {
      const progress = await getProfileProgress(userId);
      scaleResults = progress.scaleResults ?? {};
      drLoMentalAnalysis = progress.drLoMentalAnalysis;
      drLoSexualAnalysis = progress.drLoSexualAnalysis;
      drLoAnalysis = progress.drLoAnalysis;
      totemAnimal = (progress.totem?.animal as string) ?? null;
    } catch { /* ignore */ }
  }

  const scores_mentaux: Record<string, unknown> = {};
  const scores_intimes: Record<string, unknown> = {};
  const tests_bonus: Record<string, unknown> = {};

  for (const [id, r] of Object.entries(scaleResults)) {
    const formatted = formatResult(id, r);
    const cat = SCALE_MAP.get(id)?.category;
    if (cat === 'mental_health') scores_mentaux[id] = formatted;
    else if (cat === 'sexual_health') scores_intimes[id] = formatted;
    else tests_bonus[id] = formatted;
  }

  // Historique compatibilité (3 derniers)
  let tests_compatibilite: unknown[] = [];
  if (userId) {
    try {
      const hist = await getCompatibilityHistory(userId);
      tests_compatibilite = hist.slice(0, 3).map(h => ({
        date: h.createdAt instanceof Date ? h.createdAt.toLocaleDateString('fr-FR') : String(h.createdAt),
        type_relation: h.relationshipType ?? '',
        type_profil: h.codeType ?? '',
        code_partenaire: h.partnerCode ?? '',
        score_global: h.result?.globalScore ?? 0,
        points_forts: [] as string[],
        zones_tension: [] as string[],
        recommandations: [] as string[],
        narrative: '',
      }));
    } catch { /* ignore */ }
  }

  // Journal récent (5 dernières entrées)
  let journal_recent: unknown[] = [];
  if (userId) {
    try {
      const snap = await getDocs(
        query(
          collection(db!, 'users', userId, 'journal'),
          orderBy('created_at', 'desc'),
          limit(5)
        )
      );
      journal_recent = snap.docs.map(d => {
        const data = d.data();
        return {
          date: data.date,
          humeur: data.humeur,
          themes: data.themes,
          contenu: (data.contenu as string ?? '').substring(0, 200),
        };
      });
    } catch { /* ignore */ }
  }

  return {
    prenom: onboarding?.prenom ?? '',
    age: onboarding?.age ?? '',
    genre: onboarding?.genre ?? '',
    situation: onboarding?.situation_relationnelle ?? '',
    scores_mentaux,
    scores_intimes,
    tests_bonus,
    analyse_mentale: drLoMentalAnalysis,
    analyse_intime: drLoSexualAnalysis,
    analyse_generale: drLoAnalysis,
    tests_compatibilite,
    journal_recent,
    totem_resume: buildTotemResume(totemAnimal, scaleResults),
  };
}


// ── Limite du jour ───────────────────────────────────────────────────────────

const todayIso = () => new Date().toISOString().split('T')[0];

export interface TalkQuota { count: number; unlocks: number; limit: number }

export async function loadQuota(userId: string): Promise<TalkQuota> {
  try {
    const snap = await getDoc(doc(db!, 'users', userId));
    const d = snap.exists() ? snap.data() : {};
    if (d.chatLastDate !== todayIso()) return { count: 0, unlocks: 0, limit: DAILY_MESSAGE_LIMIT };
    const unlocks = d.chatDailyUnlocks ?? 0;
    return { count: d.chatDailyCount ?? 0, unlocks, limit: DAILY_MESSAGE_LIMIT + unlocks * UNLOCK_MESSAGES };
  } catch {
    return { count: 0, unlocks: 0, limit: DAILY_MESSAGE_LIMIT };
  }
}

export async function unlockMore(userId: string, q: TalkQuota): Promise<TalkQuota | null> {
  if (q.unlocks >= MAX_DAILY_UNLOCKS) return null;
  const r = await spendKorisForUnlock();
  if (!r.ok) return null;
  const unlocks = q.unlocks + 1;
  setDoc(doc(db!, 'users', userId), { chatDailyUnlocks: unlocks, chatLastDate: todayIso() }, { merge: true }).catch(() => {});
  return { ...q, unlocks, limit: DAILY_MESSAGE_LIMIT + unlocks * UNLOCK_MESSAGES };
}

// ── Un échange ───────────────────────────────────────────────────────────────

export interface TalkTurn { role: 'user' | 'assistant'; content: string }

export type TalkOutcome = { ok: true; text: string } | { ok: false; reason: 'no_koris' | 'error' };

/**
 * Envoie un message à Dr Lô (1 étincelle, débitée côté serveur) et garde la conversation
 * dans users/{uid}/chat_dr_lo/{convId} (même endroit qu'avant).
 */
export async function talk(userId: string, convId: string, text: string, history: TalkTurn[], opening: string | null, q: TalkQuota): Promise<TalkOutcome> {
  try {
    const context = await buildFullContext(userId);
    const historique = history.slice(-8);
    const res = await authedFetch('/.netlify/functions/dr-lo-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, historique, context: opening && historique.length === 0 ? { ...context, ouverture: opening } : context }),
    });
    if (res.status === 402) return { ok: false, reason: 'no_koris' };
    if (!res.ok) return { ok: false, reason: 'error' };
    const data = await res.json();
    const answer: string = data.response ?? 'Je n\'ai pas pu répondre. Réessaie dans un instant.';
    const now = new Date().toISOString();
    setDoc(doc(db!, 'users', userId), { chatDailyCount: q.count + 1, chatLastDate: todayIso() }, { merge: true }).catch(() => {});
    const msgs = [...history, { role: 'user' as const, content: text }, { role: 'assistant' as const, content: answer }]
      .map(m => ({ role: m.role, content: m.content, timestamp: now, koris_consumed: m.role === 'assistant' ? 1 : 0 }));
    setDoc(doc(db!, 'users', userId, 'chat_dr_lo', convId), { messages: msgs, updated_at: now, created_at: convId.replace('conv_', '') }, { merge: true }).catch(() => {});
    return { ok: true, text: answer };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Utilisé par l'ancien historique des conversations. */
export async function listConversations(userId: string) {
  try {
    const snap = await getDocs(query(collection(db!, 'users', userId, 'chat_dr_lo'), orderBy('updated_at', 'desc'), limit(20)));
    return snap.docs.map(d => ({ id: d.id, messages: (d.data().messages ?? []) as TalkTurn[], updated_at: d.data().updated_at ?? '' }));
  } catch {
    return [];
  }
}

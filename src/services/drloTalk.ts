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
import { getScaleMeta } from '../utils/scaleMeta';

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

/** Bouton que Dr Lô propose sous sa réponse (l'appli l'affiche). `crise` = protocole d'urgence. */
export type TalkAction =
  | { kind: 'test'; scaleId: string }
  | { kind: 'chaine'; id: string; name?: string }
  | { kind: 'respiration' | 'humeur' | 'programme' | 'journal' | 'defi' | 'compat' | 'vrai_drlo' | 'totem' | 'catalogue' | 'chaines' | 'crise' };

export type TalkOutcome =
  | { ok: true; text: string; actions: TalkAction[]; freeLeft: number | null; remember: boolean }
  | { ok: false; reason: 'no_koris' | 'limit' | 'error' };

const TALK_ACTIONS = new Set(['respiration', 'humeur', 'programme', 'journal', 'defi', 'compat', 'vrai_drlo', 'totem', 'catalogue', 'chaines', 'crise']);
/** Seules des actions qui existent vraiment sur le site passent. */
function cleanAction(a: unknown): TalkAction | null {
  if (!a || typeof a !== 'object') return null;
  const x = a as { kind?: string; scaleId?: string; id?: string; name?: string };
  if (x.kind === 'chaine') return typeof x.id === 'string' && /^[A-Za-z0-9]{4,40}$/.test(x.id) ? { kind: 'chaine', id: x.id, ...(typeof x.name === 'string' ? { name: x.name.slice(0, 60) } : {}) } : null;
  if (x.kind === 'test') return typeof x.scaleId === 'string' && SCALE_MAP.has(x.scaleId) ? { kind: 'test', scaleId: x.scaleId } : null;
  return x.kind && TALK_ACTIONS.has(x.kind) ? ({ kind: x.kind } as TalkAction) : null;
}
/** Les tests que Dr Lô peut proposer (identifiants et noms). */
const TESTS_DISPO = ALL_SCALES.map(s => ({ id: s.id, label: getScaleMeta(s.id).label }));

// Le profil complet change rarement : on le garde 3 minutes (réponses plus rapides)
let ctxCache: { uid: string; at: number; ctx: Awaited<ReturnType<typeof buildFullContext>> } | null = null;
async function contextFor(userId: string) {
  if (ctxCache && ctxCache.uid === userId && Date.now() - ctxCache.at < 3 * 60 * 1000) return ctxCache.ctx;
  const ctx = await buildFullContext(userId);
  ctxCache = { uid: userId, at: Date.now(), ctx };
  return ctx;
}
/** Un test vient d'être fait, une analyse générée… : le prochain message relit tout. */
export const invalidateTalkContext = () => { ctxCache = null; };

/**
 * Un message à Dr Lô : les premiers de la journée sont offerts, ensuite 1 étincelle (décidé
 * côté serveur). La conversation est aussi gardée dans users/{uid}/chat_dr_lo/{convId}.
 */
export async function talk(userId: string, convId: string, text: string, history: TalkTurn[], opening: string | null): Promise<TalkOutcome> {
  try {
    const context = await contextFor(userId);
    const historique = history.filter(m => m.content.trim()).slice(-12);
    const res = await authedFetch('/.netlify/functions/dr-lo-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, historique, context: { ...context, tests_dispo: TESTS_DISPO, ...(opening && historique.length === 0 ? { ouverture: opening } : {}) } }),
    });
    if (res.status === 402) return { ok: false, reason: 'no_koris' };
    if (res.status === 429) return { ok: false, reason: 'limit' };
    if (!res.ok) return { ok: false, reason: 'error' };
    const data = await res.json();
    const answer: string = data.response ?? 'Je n\'ai pas pu répondre. Réessaie dans un instant.';
    const now = new Date().toISOString();
    const msgs = [...historique, { role: 'user' as const, content: text }, { role: 'assistant' as const, content: answer }]
      .map(m => ({ role: m.role, content: m.content, timestamp: now }));
    setDoc(doc(db!, 'users', userId, 'chat_dr_lo', convId), { messages: msgs, updated_at: now, created_at: convId.replace('conv_', '') }, { merge: true }).catch(() => {});
    const actions = (Array.isArray(data.actions) ? data.actions : data.action ? [data.action] : []).map(cleanAction).filter(Boolean) as TalkAction[];
    return { ok: true, text: answer, actions, freeLeft: typeof data.free_left === 'number' ? data.free_left : null, remember: !!data.remember };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Dr Lô met à jour ce qu'il retient de la personne (gratuit, en arrière-plan). */
export function rememberNow(history: TalkTurn[]): void {
  authedFetch('/.netlify/functions/drlo-memory', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ historique: history.slice(-14) }),
  }).catch(() => {});
}

/** Banc d'essai (console du vrai Dr Lô) : une réponse sur son propre profil, sans rien compter ni retenir. */
export async function benchTalk(userId: string, text: string, withMemory: boolean): Promise<{ ok: boolean; text: string; actions: TalkAction[]; ms: number }> {
  const t0 = Date.now();
  try {
    const context = await contextFor(userId);
    const res = await authedFetch('/.netlify/functions/dr-lo-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, withMemory, message: text, historique: [], context: { ...context, tests_dispo: TESTS_DISPO } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, text: data.error ?? `Erreur ${res.status}`, actions: [], ms: Date.now() - t0 };
    const actions = (Array.isArray(data.actions) ? data.actions : []).map(cleanAction).filter(Boolean) as TalkAction[];
    return { ok: true, text: data.response ?? '', actions, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, text: e instanceof Error ? e.message : 'Erreur', actions: [], ms: Date.now() - t0 };
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

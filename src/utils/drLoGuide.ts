/**
 * drLoGuide.ts — Règles de l'accueil proactif de Dr Lô (Modif B).
 *
 * Logique pure, sans IA, sans Firebase : testable avec `node --test tests/unit/`.
 * Règle d'or : chaque message propose une action suivante (jamais d'impasse).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type GuideAction =
  | { kind: 'start_test' }            // aller choisir/faire un test (onglet Psychologique)
  | { kind: 'reveal_totem' }          // faire défiler jusqu'à la révélation du totem
  | { kind: 'journal' }               // noter son humeur (/mon-espace)
  | { kind: 'signup' }                // créer un compte (invité au bout de ses essais)
  | { kind: 'chat'; greeting: string }; // ouvrir le chat Dr Lô avec ce premier message

export interface GuideMessage {
  /** Identifiant stable de la règle (utile pour les métriques). */
  id: 'first_test' | 'guest_limit' | 'follow_up' | 'mood' | 'totem_ready' | 'totem_missing' | 'portrait';
  text: string;
  cta: string;
  action: GuideAction;
  /** Clé à mémoriser quand l'utilisateur clique, pour ne pas reproposer le même suivi. */
  followUpKey?: string;
}

export interface LastTest {
  scaleId: string;
  label: string;
  completedAt: Date;
}

export interface GuideInput {
  isAuthenticated: boolean;
  prenom?: string;
  doneCore: number;
  totalCore: number;
  guestCount: number;
  guestMax: number;
  totemMissing: number;
  totemReady: boolean;
  totemRevealed: boolean;
  /** null = pas encore chargé → la règle humeur est ignorée. */
  journalToday: boolean | null;
  lastTest: LastTest | null;
  dismissedFollowUps: string[];
  now: Date;
}

// ── Réglages ──────────────────────────────────────────────────────────────────

export const FOLLOW_UP_MIN_DAYS = 3;
export const FOLLOW_UP_MAX_DAYS = 14;

/** Poids du portrait : tests 70 %, journal 15 %, conversations 15 %. */
export const PORTRAIT_WEIGHTS = { tests: 70, journal: 15, chats: 15 } as const;
/** Nombre d'entrées de journal / de conversations pour remplir leur part. */
export const PORTRAIT_CAP = { journal: 5, chats: 5 } as const;

// ── Utilitaires ───────────────────────────────────────────────────────────────

/** Convertit Date | Timestamp Firestore | string | number en Date (ou null). */
export function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: unknown }).toDate === 'function') {
    try { return (v as { toDate: () => Date }).toDate(); } catch { return null; }
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Jour local au format AAAA-MM-JJ. */
export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Nombre de jours calendaires (locaux) entre deux dates, b - a. */
export function daysBetween(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / 86_400_000);
}

// ── Portrait progressif ───────────────────────────────────────────────────────

export function computePortrait(p: {
  doneCore: number;
  totalCore: number;
  journalCount: number;
  chatCount: number;
}): number {
  const tests = p.totalCore > 0 ? Math.min(1, p.doneCore / p.totalCore) : 0;
  const journal = Math.min(1, Math.max(0, p.journalCount) / PORTRAIT_CAP.journal);
  const chats = Math.min(1, Math.max(0, p.chatCount) / PORTRAIT_CAP.chats);
  const raw =
    tests * PORTRAIT_WEIGHTS.tests +
    journal * PORTRAIT_WEIGHTS.journal +
    chats * PORTRAIT_WEIGHTS.chats;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ── Série (streak) ────────────────────────────────────────────────────────────

/**
 * Jours d'affilée avec au moins une activité (test, journal, conversation).
 * La série reste vivante tant que la veille est active : on ne la « casse » pas
 * le matin avant que l'utilisateur ait eu le temps de revenir.
 */
export function computeStreak(activityDays: Iterable<string>, now: Date): number {
  const days = new Set(activityDays);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDayKey(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (days.has(localDayKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// ── Message de Dr Lô ──────────────────────────────────────────────────────────

export function followUpKeyFor(t: LastTest): string {
  return `${t.scaleId}:${localDayKey(t.completedAt)}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}

/**
 * Choisit LE message du jour. Ordre de priorité :
 *  1. Invité : premier test / limite atteinte
 *  2. Aucun test fait : prescrire le premier test
 *  3. Suivi post-test (3 à 14 jours après, une seule fois par test)
 *  4. Humeur du jour pas encore notée
 *  5. Totem prêt à révéler / tests manquants pour le totem
 *  6. Par défaut : parler du portrait avec Dr Lô
 */
export function pickGuideMessage(i: GuideInput): GuideMessage {
  const toi = i.prenom ? i.prenom : 'toi';

  if (!i.isAuthenticated) {
    if (i.guestCount >= i.guestMax) {
      return {
        id: 'guest_limit',
        text: `Tu as utilisé tes ${i.guestMax} tests gratuits. Crée ton compte pour garder tes résultats et que je continue ton portrait.`,
        cta: 'Créer mon compte',
        action: { kind: 'signup' },
      };
    }
    if (i.doneCore === 0) {
      return {
        id: 'first_test',
        text: `Bienvenue ${toi} ! Je suis Dr Lô. Tu as ${i.guestMax - i.guestCount} test${i.guestMax - i.guestCount > 1 ? 's gratuits' : ' gratuit'} sans inscription : on commence ?`,
        cta: 'Faire mon premier test',
        action: { kind: 'start_test' },
      };
    }
  }

  if (i.doneCore === 0) {
    return {
      id: 'first_test',
      text: `Bonjour ${toi}, je suis Dr Lô. Commençons ton portrait par un premier test, 3 minutes suffisent.`,
      cta: 'Faire mon premier test',
      action: { kind: 'start_test' },
    };
  }

  if (i.isAuthenticated && i.lastTest) {
    const days = daysBetween(i.lastTest.completedAt, i.now);
    const key = followUpKeyFor(i.lastTest);
    if (days >= FOLLOW_UP_MIN_DAYS && days <= FOLLOW_UP_MAX_DAYS && !i.dismissedFollowUps.includes(key)) {
      return {
        id: 'follow_up',
        text: `Ça fait ${plural(days, 'jour')} que tu as fait le test « ${i.lastTest.label} ». On refait le point ensemble ?`,
        cta: 'On en parle',
        action: {
          kind: 'chat',
          greeting: `Ça fait ${plural(days, 'jour')} que tu as fait le test « ${i.lastTest.label} ». Comment tu te sens depuis ? Qu'est-ce qui a bougé, ou pas ?`,
        },
        followUpKey: key,
      };
    }
  }

  if (i.isAuthenticated && i.journalToday === false) {
    return {
      id: 'mood',
      text: `Tu n'as pas encore noté ton humeur aujourd'hui. 30 secondes ?`,
      cta: 'Noter mon humeur',
      action: { kind: 'journal' },
    };
  }

  if (i.totemReady && !i.totemRevealed) {
    return {
      id: 'totem_ready',
      text: `Ton totem est prêt. On le découvre ensemble ?`,
      cta: 'Découvrir mon totem',
      action: { kind: 'reveal_totem' },
    };
  }

  if (i.totemMissing > 0) {
    return {
      id: 'totem_missing',
      text: `Il te manque ${plural(i.totemMissing, 'test')} pour découvrir ton totem.`,
      cta: 'Continuer',
      action: { kind: 'start_test' },
    };
  }

  return {
    id: 'portrait',
    text: `Ton portrait se précise. Tu veux qu'on regarde ensemble ce qu'il dit de toi ?`,
    cta: 'En parler avec Dr Lô',
    action: {
      kind: 'chat',
      greeting: `Content de te revoir ${toi} ! Ton portrait se précise. Qu'est-ce qui t'occupe l'esprit en ce moment ?`,
    },
  };
}

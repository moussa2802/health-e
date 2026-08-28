/**
 * Koris Service — Gestion de l'économie de crédits virtuels Health-e
 *
 * Deux phases:
 *   Phase "Bienvenue" (welcomeBonusActive: true):
 *     - 25 Koris offerts, pas de recharge quotidienne
 *     - Quand balance atteint 0 → bascule en Phase Quotidienne avec 10 Koris
 *
 *   Phase "Quotidienne" (welcomeBonusActive: false):
 *     - Solde REMIS à 10 chaque jour (pas additionné)
 *     - Max 10 Koris/jour, non utilisés perdus au reset
 *
 * Firestore data model:
 *   patients/{userId}.korisWallet: { balance, welcomeBonusActive, lastDailyReset, todaySpent, totalSpent }
 *   patients/{userId}/korisHistory/{docId}: { type, amount, feature, balanceBefore, balanceAfter, timestamp, details? }
 *   stats/koris: { totalSpent, totalRefilled, activeUsers, spendingByType, ... }
 */

import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { authedFetch } from '../utils/authedFetch';

// ── Configuration ────────────────────────────────────────────────────────────

export const KORIS_COSTS = {
  test: 1,
  chat: 1,
  journal: 1,
  conseils: 2,
  analysis: 3,
  refresh_synthesis: 3,
  synthesis: 5,
  compatibility: 6,
  unlock_chat: 3,
} as const;

export type KorisFeatureType = keyof typeof KORIS_COSTS;

export const KORIS_WELCOME_BONUS = 25;
export const KORIS_TRANSITION_BONUS = 50;

// ── Types ────────────────────────────────────────────────────────────────────

export interface KorisWallet {
  balance: number;
  welcomeBonusActive: boolean;
  lastDailyReset: string;   // YYYY-MM-DD
  todaySpent: number;
  totalSpent: number;
  createdAt?: string;
  transitionBonusGrantedAt?: string;
  // Legacy fields (kept for backward compat reads)
  totalEarned?: number;
  lastRefillDate?: string;
}

export interface KorisTransaction {
  id?: string;
  type: 'spend' | 'refill' | 'bonus' | 'refund' | 'daily_reset' | 'phase_switch' | 'transition_bonus' | 'purchase';
  amount: number;
  feature: KorisFeatureType | 'daily_reset' | 'welcome_bonus' | 'refund' | 'phase_switch' | 'transition_bonus' | 'purchase';
  balanceBefore: number;
  balanceAfter: number;
  timestamp: string;
  details?: string;
}

export interface KorisSpendResult {
  allowed: boolean;
  cost: number;
  balanceBefore: number;
  balanceAfter: number;
  newBalance: number;
}

/** Result returned by checkDailyReset to the context */
export interface DailyResetResult {
  newBalance: number;
  wasReset: boolean;
  phaseSwitched: boolean;
  welcomeBonusActive: boolean;
  walletJustCreated: boolean;
  transitionBonusGranted: boolean;
}

// ── Wallet operations ────────────────────────────────────────────────────────

/**
 * Récupère le wallet Koris d'un utilisateur. Retourne null si non initialisé.
 */
export async function getKorisWallet(userId: string): Promise<KorisWallet | null> {
  try {
    const patientRef = doc(db, 'patients', userId);
    const snap = await getDoc(patientRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data.korisWallet) return null;
    const w = data.korisWallet;

    return {
      balance: w.balance ?? 0,
      welcomeBonusActive: w.welcomeBonusActive ?? false,
      lastDailyReset: w.lastDailyReset ?? w.lastRefillDate ?? '',
      todaySpent: w.todaySpent ?? 0,
      totalSpent: w.totalSpent ?? 0,
      createdAt: w.createdAt,
      transitionBonusGrantedAt: w.transitionBonusGrantedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Récupère le solde Koris. Retourne 0 si le wallet n'existe pas.
 */
export async function getKorisBalance(userId: string): Promise<number> {
  const wallet = await getKorisWallet(userId);
  return wallet?.balance ?? 0;
}


/**
 * Vérifie l'état du wallet et l'initialise si nécessaire (via le serveur).
 * Le serveur gère l'init, le bonus de transition et le phase switch
 * pour respecter les règles Firestore qui bloquent les écritures client sur korisWallet.
 */
export async function checkDailyReset(_userId: string): Promise<DailyResetResult> {
  const NO_OP: DailyResetResult = {
    newBalance: 0,
    wasReset: false,
    phaseSwitched: false,
    welcomeBonusActive: false,
    walletJustCreated: false,
    transitionBonusGranted: false,
  };

  try {
    const res = await authedFetch('/.netlify/functions/koris-init', {
      method: 'POST',
    });

    if (!res.ok) return NO_OP;

    const data = await res.json();
    return {
      newBalance: data.newBalance ?? 0,
      wasReset: data.wasReset ?? false,
      phaseSwitched: data.phaseSwitched ?? false,
      welcomeBonusActive: data.welcomeBonusActive ?? false,
      walletJustCreated: data.walletJustCreated ?? false,
      transitionBonusGranted: data.transitionBonusGranted ?? false,
    };
  } catch (e) {
    console.error('Error in checkDailyReset:', e);
    return NO_OP;
  }
}


// ── Test spend ──────────────────────────────────────────────────────────────

export interface TestSpendResult {
  ok: boolean;
  cost: number;
  free_retake?: boolean;
  error?: string;
  required?: number;
}

const FREE_RETAKE_DAYS = 30;

export function isTestFreeRetake(lastTakenAt: string | Date | undefined): boolean {
  if (!lastTakenAt) return false;
  const ts = lastTakenAt instanceof Date ? lastTakenAt.getTime() : new Date(lastTakenAt).getTime();
  const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return daysSince >= FREE_RETAKE_DAYS;
}

export async function spendKorisForTest(
  scaleLastTakenMap: Record<string, string | Date | null>,
): Promise<TestSpendResult> {
  const serialized: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(scaleLastTakenMap)) {
    serialized[k] = v instanceof Date ? v.toISOString() : v;
  }
  try {
    const res = await authedFetch('/.netlify/functions/koris-spend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'test', scaleLastTakenMap: serialized }),
    });

    const data = await res.json();
    if (res.status === 402) {
      return { ok: false, cost: 0, error: data.error, required: data.required };
    }
    return { ok: true, cost: data.cost ?? 0, free_retake: data.free_retake ?? false };
  } catch {
    return { ok: false, cost: 0, error: 'Erreur réseau' };
  }
}

export async function spendKorisForUnlock(): Promise<{ ok: boolean; cost: number; error?: string }> {
  try {
    const res = await authedFetch('/.netlify/functions/koris-spend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'unlock_chat' }),
    });
    const data = await res.json();
    if (res.status === 402) {
      return { ok: false, cost: 0, error: data.error };
    }
    return { ok: true, cost: data.cost ?? KORIS_COSTS.unlock_chat };
  } catch {
    return { ok: false, cost: 0, error: 'Erreur réseau' };
  }
}

// ── Transaction history ──────────────────────────────────────────────────────

/**
 * Récupère les N dernières transactions Koris d'un utilisateur.
 */
export async function getKorisHistory(
  userId: string,
  count: number = 20
): Promise<KorisTransaction[]> {
  try {
    const historyRef = collection(db, 'patients', userId, 'korisHistory');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as KorisTransaction));
  } catch {
    return [];
  }
}

// ── Global stats ─────────────────────────────────────────────────────────────

/**
 * Récupère les statistiques globales Koris pour l'admin dashboard.
 */
export async function getGlobalKorisStats(): Promise<{
  totalSpent: number;
  totalRefilled: number;
  totalRefunded: number;
  totalTransactions: number;
  spendingByType: Record<string, number>;
}> {
  try {
    const statsRef = doc(db, 'stats', 'koris');
    const snap = await getDoc(statsRef);
    if (!snap.exists()) {
      return { totalSpent: 0, totalRefilled: 0, totalRefunded: 0, totalTransactions: 0, spendingByType: {} };
    }
    const data = snap.data();
    return {
      totalSpent: data.totalSpent ?? 0,
      totalRefilled: data.totalRefilled ?? 0,
      totalRefunded: data.totalRefunded ?? 0,
      totalTransactions: data.totalTransactions ?? 0,
      spendingByType: data.spendingByType ?? {},
    };
  } catch {
    return { totalSpent: 0, totalRefilled: 0, totalRefunded: 0, totalTransactions: 0, spendingByType: {} };
  }
}

/**
 * Récupère les stats de phases (bienvenue vs quotidienne) pour le dashboard admin.
 * Scan tous les patients pour compter.
 */
export async function getKorisPhaseStats(): Promise<{
  welcomePhaseCount: number;
  dailyPhaseCount: number;
  totalWithWallet: number;
  bonusExhaustedRate: number; // % qui ont fini leurs 25 Koris (sont en phase quotidienne)
}> {
  try {
    const patientsRef = collection(db, 'patients');
    const snap = await getDocs(patientsRef);

    let welcomePhaseCount = 0;
    let dailyPhaseCount = 0;
    let totalWithWallet = 0;

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const w = data.korisWallet;
      if (!w) return;
      totalWithWallet++;
      if (w.welcomeBonusActive) {
        welcomePhaseCount++;
      } else {
        dailyPhaseCount++;
      }
    });

    return {
      welcomePhaseCount,
      dailyPhaseCount,
      totalWithWallet,
      bonusExhaustedRate: totalWithWallet > 0
        ? Math.round((dailyPhaseCount / totalWithWallet) * 100)
        : 0,
    };
  } catch {
    return { welcomePhaseCount: 0, dailyPhaseCount: 0, totalWithWallet: 0, bonusExhaustedRate: 0 };
  }
}

// ── Feature label mapping ────────────────────────────────────────────────────

export function getFeatureLabel(feature: string): string {
  const labels: Record<string, string> = {
    chat: 'Message Dr Lô',
    journal: 'Avis Dr Lô (journal)',
    analysis: 'Analyse Dr Lô',
    synthesis: 'Synthèse Dr Lô',
    refresh_synthesis: 'Rafraîchir synthèse',
    conseils: 'Conseils personnalisés',
    compatibility: 'Test de compatibilité',
    test: 'Test',
    daily_reset: 'Reset quotidien',
    daily_refill: 'Recharge quotidienne',
    welcome_bonus: 'Bonus de bienvenue',
    phase_switch: 'Passage phase quotidienne',
    transition_bonus: 'Bonus de transition',
    purchase: 'Achat de Koris',
    refund: 'Remboursement',
  };
  return labels[feature] ?? feature;
}

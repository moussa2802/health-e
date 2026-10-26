/**
 * Koris Service — Gestion de l'économie de crédits virtuels Health-e
 *
 * Modèle : 25 Koris offerts à l'inscription, puis achat de packs via PayTech.
 *
 * Firestore data model:
 *   patients/{userId}.korisWallet: { balance, totalSpent, lastPaidAt, ... }
 *   patients/{userId}/korisHistory/{docId}: { type, amount, feature, balanceBefore, balanceAfter, timestamp, details?, metadata? }
 *   stats/koris: { totalSpent, totalRefilled, activeUsers, spendingByType, ... }
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  collectionGroup,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { authedFetch } from '../utils/authedFetch';
import { CREDIT } from '../config/creditName';

// ── Configuration ────────────────────────────────────────────────────────────

export const KORIS_COSTS = {
  test: 1,
  chat: 1,
  journal: 1,
  conseils: 2,
  analysis: 3,
  analysis_refresh: 2,
  refresh_synthesis: 3,
  synthesis: 0,
  compatibility: 4,
  unlock_chat: 3,
  programme: 3,
  programme_bilan: 3,
} as const;

export type KorisFeatureType = keyof typeof KORIS_COSTS;

export const KORIS_WELCOME_BONUS = 25;

// ── Types ────────────────────────────────────────────────────────────────────

export interface KorisWallet {
  balance: number;
  totalSpent: number;
  createdAt?: string;
}

export interface KorisTransaction {
  id?: string;
  type: 'spend' | 'refill' | 'bonus' | 'refund' | 'purchase';
  amount: number;
  feature: KorisFeatureType | 'welcome_bonus' | 'refund' | 'purchase';
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

export interface KorisInitResult {
  newBalance: number;
  walletJustCreated: boolean;
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
      totalSpent: w.totalSpent ?? 0,
      createdAt: w.createdAt,
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


export async function initKoris(_userId: string): Promise<KorisInitResult> {
  const NO_OP: KorisInitResult = {
    newBalance: 0,
    walletJustCreated: false,
  };

  try {
    const res = await authedFetch('/.netlify/functions/koris-init', {
      method: 'POST',
    });

    if (!res.ok) return NO_OP;

    const data = await res.json();
    return {
      newBalance: data.newBalance ?? 0,
      walletJustCreated: data.walletJustCreated ?? false,
    };
  } catch (e) {
    console.error('Koris init error:', e);
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

/** Les 3 premiers tests d'un compte sont offerts (même règle côté serveur : koris-spend.js). */
export const FREE_FIRST_TESTS = 3;

export function isFirstTestFree(doneCount: number, alreadyTaken: boolean): boolean {
  return !alreadyTaken && doneCount < FREE_FIRST_TESTS;
}

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
 * Si le document agrégé stats/koris est vide ou a totalSpent=0,
 * recalcule à partir des données brutes (korisHistory de tous les patients).
 */
export async function getGlobalKorisStats(): Promise<{
  totalSpent: number;
  totalRefilled: number;
  totalRefunded: number;
  totalTransactions: number;
  spendingByType: Record<string, number>;
}> {
  const empty = { totalSpent: 0, totalRefilled: 0, totalRefunded: 0, totalTransactions: 0, spendingByType: {} };
  try {
    const statsRef = doc(db, 'stats', 'koris');
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      const data = snap.data();
      if ((data.totalSpent ?? 0) > 0 || (data.totalTransactions ?? 0) > 0) {
        return {
          totalSpent: data.totalSpent ?? 0,
          totalRefilled: data.totalRefilled ?? 0,
          totalRefunded: data.totalRefunded ?? 0,
          totalTransactions: data.totalTransactions ?? 0,
          spendingByType: data.spendingByType ?? {},
        };
      }
    }

    // Stats doc empty or missing — compute from raw korisHistory
    const computed = await computeGlobalKorisStatsFromRaw();
    // Persist so future loads are fast
    await setDoc(statsRef, { ...computed, lastUpdated: new Date().toISOString() }, { merge: true }).catch(() => {});
    return computed;
  } catch {
    return empty;
  }
}

/**
 * Scanne tous les patients pour recalculer les stats Koris globales
 * à partir de korisHistory et des wallets individuels.
 */
async function computeGlobalKorisStatsFromRaw(): Promise<{
  totalSpent: number;
  totalRefilled: number;
  totalRefunded: number;
  totalTransactions: number;
  spendingByType: Record<string, number>;
}> {
  let totalSpent = 0;
  let totalRefilled = 0;
  let totalRefunded = 0;
  let totalTransactions = 0;
  const spendingByType: Record<string, number> = {};

  // Use collectionGroup to read all korisHistory subcollections at once
  const historySnap = await getDocs(collectionGroup(db, 'korisHistory'));

  historySnap.forEach(d => {
    const tx = d.data();
    const amount = tx.amount ?? 0;

    if (tx.type === 'spend') {
      totalSpent += amount;
      totalTransactions++;
      const feature = tx.feature || 'unknown';
      spendingByType[feature] = (spendingByType[feature] || 0) + amount;
    } else if (tx.type === 'refill' || tx.type === 'bonus' || tx.type === 'purchase') {
      totalRefilled += amount;
    } else if (tx.type === 'refund') {
      totalRefunded += amount;
    }
  });

  return { totalSpent, totalRefilled, totalRefunded, totalTransactions, spendingByType };
}

// ── Feature label mapping ────────────────────────────────────────────────────

export function getFeatureLabel(feature: string): string {
  const labels: Record<string, string> = {
    chat: 'Message Dr Lô',
    journal: 'Avis Dr Lô (journal)',
    analysis: 'Analyse Dr Lô',
    analysis_refresh: 'Actualisation analyse Dr Lô',
    synthesis: 'Synthèse Dr Lô',
    refresh_synthesis: 'Rafraîchir synthèse',
    conseils: 'Conseils personnalisés',
    compatibility: 'Test de compatibilité',
    test: 'Test',
    welcome_bonus: 'Bonus de bienvenue',
    purchase: `Achat ${CREDIT.ofMany}`,
    refund: 'Remboursement',
    unlock_chat: 'Débloquer chat',
    programme: 'Mon programme Dr Lô',
    programme_bilan: 'Bilan du programme',
  };
  return labels[feature] ?? feature;
}

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
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../utils/firebase';

// ── Configuration ────────────────────────────────────────────────────────────

export const KORIS_COSTS = {
  chat: 1,             // Message Dr Lô (chat)
  journal: 1,          // Avis Dr Lô sur entrée journal
  analysis: 1,         // Génération analyse Dr Lô (mental ou sexuelle)
  synthesis: 3,        // Synthèse Dr Lô
  refresh_synthesis: 2,// Rafraîchir la synthèse
  conseils: 1,         // Génération conseils personnalisés
  compatibility: 2,    // Analyse compatibilité IA
  test: 0,             // Tests gratuits
} as const;

export type KorisFeatureType = keyof typeof KORIS_COSTS;

export const KORIS_WELCOME_BONUS = 25;
export const KORIS_DAILY_AMOUNT = 10;

// ── Types ────────────────────────────────────────────────────────────────────

export interface KorisWallet {
  balance: number;
  welcomeBonusActive: boolean;
  lastDailyReset: string;   // YYYY-MM-DD
  todaySpent: number;
  totalSpent: number;
  createdAt?: string;
  // Legacy fields (kept for backward compat reads)
  totalEarned?: number;
  lastRefillDate?: string;
}

export interface KorisTransaction {
  id?: string;
  type: 'spend' | 'refill' | 'bonus' | 'refund' | 'daily_reset' | 'phase_switch';
  amount: number;
  feature: KorisFeatureType | 'daily_reset' | 'welcome_bonus' | 'refund' | 'phase_switch';
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
  wasReset: boolean;           // true if a daily reset occurred
  phaseSwitched: boolean;      // true if switched from welcome → daily
  welcomeBonusActive: boolean; // current phase after check
  walletJustCreated: boolean;  // true if wallet was initialized for the first time
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

    // Normalize legacy wallet format
    return {
      balance: w.balance ?? 0,
      welcomeBonusActive: w.welcomeBonusActive ?? false,
      lastDailyReset: w.lastDailyReset ?? w.lastRefillDate ?? '',
      todaySpent: w.todaySpent ?? 0,
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

/**
 * Initialise le wallet Koris pour un nouvel utilisateur avec le bonus de bienvenue.
 * Retourne true si le wallet a été créé, false s'il existait déjà.
 */
export async function initializeKorisWallet(userId: string): Promise<boolean> {
  try {
    const patientRef = doc(db, 'patients', userId);
    const snap = await getDoc(patientRef);

    if (snap.exists() && snap.data().korisWallet) {
      return false; // Wallet already exists
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const wallet: KorisWallet = {
      balance: KORIS_WELCOME_BONUS,
      welcomeBonusActive: true,
      lastDailyReset: today,
      todaySpent: 0,
      totalSpent: 0,
      createdAt: now,
    };

    await setDoc(patientRef, { korisWallet: wallet }, { merge: true });

    // Log the welcome bonus transaction
    await logKorisTransaction(userId, {
      type: 'bonus',
      amount: KORIS_WELCOME_BONUS,
      feature: 'welcome_bonus',
      balanceBefore: 0,
      balanceAfter: KORIS_WELCOME_BONUS,
      timestamp: now,
      details: 'Bonus de bienvenue',
    });

    // Update global stats
    await updateGlobalKorisStats('refill', KORIS_WELCOME_BONUS, 'welcome_bonus');

    return true;
  } catch (e) {
    console.error('Error initializing Koris wallet:', e);
    return false;
  }
}

/**
 * Vérifie et applique le reset quotidien / bascule de phase.
 *
 * Phase Bienvenue:
 *   - Si balance > 0 → rien à faire
 *   - Si balance <= 0 → bascule en Phase Quotidienne, donne 10 Koris
 *
 * Phase Quotidienne:
 *   - Si nouveau jour → remet le solde à 10, todaySpent = 0
 */
export async function checkDailyReset(userId: string): Promise<DailyResetResult> {
  const NO_OP: DailyResetResult = {
    newBalance: 0,
    wasReset: false,
    phaseSwitched: false,
    welcomeBonusActive: false,
    walletJustCreated: false,
  };

  try {
    let wallet = await getKorisWallet(userId);

    if (!wallet) {
      const created = await initializeKorisWallet(userId);
      if (!created) return NO_OP;
      return {
        newBalance: KORIS_WELCOME_BONUS,
        wasReset: false,
        phaseSwitched: false,
        welcomeBonusActive: true,
        walletJustCreated: true,
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const patientRef = doc(db, 'patients', userId);

    // ── Phase Bienvenue ──
    if (wallet.welcomeBonusActive) {
      if (wallet.balance <= 0) {
        // Les 25 sont épuisés → passer en Phase Quotidienne
        const newBalance = KORIS_DAILY_AMOUNT;
        await updateDoc(patientRef, {
          'korisWallet.welcomeBonusActive': false,
          'korisWallet.balance': newBalance,
          'korisWallet.lastDailyReset': today,
          'korisWallet.todaySpent': 0,
        });

        await logKorisTransaction(userId, {
          type: 'phase_switch',
          amount: newBalance,
          feature: 'phase_switch',
          balanceBefore: 0,
          balanceAfter: newBalance,
          timestamp: new Date().toISOString(),
          details: 'Passage en phase quotidienne (+10 Koris)',
        });

        return {
          newBalance,
          wasReset: true,
          phaseSwitched: true,
          welcomeBonusActive: false,
          walletJustCreated: false,
        };
      }

      // Encore des Koris de bienvenue → rien à faire
      return {
        newBalance: wallet.balance,
        wasReset: false,
        phaseSwitched: false,
        welcomeBonusActive: true,
        walletJustCreated: false,
      };
    }

    // ── Phase Quotidienne ──
    // Safeguard: fix missing lastDailyReset without losing current balance
    if (!wallet.lastDailyReset) {
      await updateDoc(patientRef, { 'korisWallet.lastDailyReset': today });
      return {
        newBalance: wallet.balance,
        wasReset: false,
        phaseSwitched: false,
        welcomeBonusActive: false,
        walletJustCreated: false,
      };
    }

    if (wallet.lastDailyReset !== today) {
      // Nouveau jour → REMETTRE à 10 (pas additionner)
      const newBalance = KORIS_DAILY_AMOUNT;
      await updateDoc(patientRef, {
        'korisWallet.balance': newBalance,
        'korisWallet.lastDailyReset': today,
        'korisWallet.todaySpent': 0,
      });

      await logKorisTransaction(userId, {
        type: 'daily_reset',
        amount: newBalance,
        feature: 'daily_reset',
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        timestamp: new Date().toISOString(),
        details: 'Reset quotidien (10 Koris)',
      });

      await updateGlobalKorisStats('refill', newBalance, 'daily_reset');

      return {
        newBalance,
        wasReset: true,
        phaseSwitched: false,
        welcomeBonusActive: false,
        walletJustCreated: false,
      };
    }

    // Déjà reset aujourd'hui
    return {
      newBalance: wallet.balance,
      wasReset: false,
      phaseSwitched: false,
      welcomeBonusActive: false,
      walletJustCreated: false,
    };
  } catch (e) {
    console.error('Error in checkDailyReset:', e);
    return NO_OP;
  }
}

/**
 * Dépense des Koris pour une feature IA. Retourne le résultat avec le nouveau solde.
 * Si le solde est insuffisant, retourne allowed: false.
 *
 * Si Phase Bienvenue et balance atteint 0 → bascule immédiatement en Phase Quotidienne
 * et donne 10 Koris pour ne pas bloquer l'utilisateur.
 */
export async function spendKoris(
  userId: string,
  feature: KorisFeatureType,
  details?: string
): Promise<KorisSpendResult> {
  const cost = KORIS_COSTS[feature];

  // Tests gratuits — toujours autorisés
  if (cost === 0) {
    return { allowed: true, cost: 0, balanceBefore: 0, balanceAfter: 0, newBalance: 0 };
  }

  try {
    let wallet = await getKorisWallet(userId);
    if (!wallet) {
      // Initialiser le wallet si absent
      await initializeKorisWallet(userId);
      wallet = await getKorisWallet(userId);
      if (!wallet || wallet.balance < cost) {
        return {
          allowed: false,
          cost,
          balanceBefore: wallet?.balance ?? 0,
          balanceAfter: wallet?.balance ?? 0,
          newBalance: wallet?.balance ?? 0,
        };
      }
    }

    if (wallet.balance < cost) {
      return {
        allowed: false,
        cost,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        newBalance: wallet.balance,
      };
    }

    return await executeSpend(userId, wallet, feature, cost, details);
  } catch (e) {
    console.error('Error spending Koris:', e);
    return { allowed: false, cost, balanceBefore: 0, balanceAfter: 0, newBalance: 0 };
  }
}

/**
 * Exécute la déduction effective.
 * Si Phase Bienvenue et le solde tombe à 0 → bascule en Phase Quotidienne avec 10 Koris.
 */
async function executeSpend(
  userId: string,
  wallet: KorisWallet,
  feature: KorisFeatureType,
  cost: number,
  details?: string
): Promise<KorisSpendResult> {
  let newBalance = wallet.balance - cost;
  const patientRef = doc(db, 'patients', userId);

  const updates: Record<string, unknown> = {
    'korisWallet.balance': newBalance,
    'korisWallet.totalSpent': wallet.totalSpent + cost,
    'korisWallet.todaySpent': wallet.todaySpent + cost,
    lastActivityAt: serverTimestamp(),
  };

  await updateDoc(patientRef, updates);

  await logKorisTransaction(userId, {
    type: 'spend',
    amount: cost,
    feature,
    balanceBefore: wallet.balance,
    balanceAfter: newBalance,
    timestamp: new Date().toISOString(),
    details: details ?? `Utilisation: ${feature}`,
  });

  await updateGlobalKorisStats('spend', cost, feature);

  // Phase Bienvenue: si le solde tombe à 0, basculer immédiatement
  if (wallet.welcomeBonusActive && newBalance <= 0) {
    const today = new Date().toISOString().split('T')[0];
    const resetBalance = KORIS_DAILY_AMOUNT;
    await updateDoc(patientRef, {
      'korisWallet.welcomeBonusActive': false,
      'korisWallet.balance': resetBalance,
      'korisWallet.lastDailyReset': today,
      'korisWallet.todaySpent': 0,
    });

    await logKorisTransaction(userId, {
      type: 'phase_switch',
      amount: resetBalance,
      feature: 'phase_switch',
      balanceBefore: 0,
      balanceAfter: resetBalance,
      timestamp: new Date().toISOString(),
      details: 'Bonus de bienvenue épuisé → passage en phase quotidienne',
    });

    newBalance = resetBalance;
  }

  return {
    allowed: true,
    cost,
    balanceBefore: wallet.balance,
    balanceAfter: newBalance,
    newBalance,
  };
}

/**
 * Rembourse des Koris en cas d'échec API.
 */
export async function refundKoris(
  userId: string,
  feature: KorisFeatureType,
  amount?: number
): Promise<void> {
  const refundAmount = amount ?? KORIS_COSTS[feature];
  if (refundAmount === 0) return;

  try {
    const wallet = await getKorisWallet(userId);
    if (!wallet) return;

    // En phase quotidienne, ne pas dépasser 10
    const maxBalance = wallet.welcomeBonusActive ? KORIS_WELCOME_BONUS : KORIS_DAILY_AMOUNT;
    const newBalance = Math.min(wallet.balance + refundAmount, maxBalance);
    const actualRefund = newBalance - wallet.balance;
    if (actualRefund <= 0) return;

    const patientRef = doc(db, 'patients', userId);

    await updateDoc(patientRef, {
      'korisWallet.balance': newBalance,
      'korisWallet.totalSpent': Math.max(0, wallet.totalSpent - actualRefund),
      'korisWallet.todaySpent': Math.max(0, wallet.todaySpent - actualRefund),
    });

    await logKorisTransaction(userId, {
      type: 'refund',
      amount: actualRefund,
      feature: 'refund',
      balanceBefore: wallet.balance,
      balanceAfter: newBalance,
      timestamp: new Date().toISOString(),
      details: `Remboursement: échec ${feature}`,
    });

    await updateGlobalKorisStats('refund', actualRefund, feature);
  } catch (e) {
    console.error('Error refunding Koris:', e);
  }
}

// ── Transaction history ──────────────────────────────────────────────────────

/**
 * Enregistre une transaction dans l'historique Koris de l'utilisateur.
 */
async function logKorisTransaction(
  userId: string,
  transaction: KorisTransaction
): Promise<void> {
  try {
    const historyRef = collection(db, 'patients', userId, 'korisHistory');
    await addDoc(historyRef, {
      ...transaction,
      serverTimestamp: serverTimestamp(),
    });
  } catch {
    // Non-blocking — log failure shouldn't break the flow
  }
}

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
 * Met à jour les statistiques globales Koris (stats/koris).
 */
async function updateGlobalKorisStats(
  type: 'spend' | 'refill' | 'refund',
  amount: number,
  feature: string
): Promise<void> {
  try {
    const statsRef = doc(db, 'stats', 'koris');

    const updates: Record<string, unknown> = {
      lastUpdated: serverTimestamp(),
    };

    if (type === 'spend') {
      updates['totalSpent'] = increment(amount);
      updates[`spendingByType.${feature}`] = increment(amount);
      updates['totalTransactions'] = increment(1);
    } else if (type === 'refill') {
      updates['totalRefilled'] = increment(amount);
    } else if (type === 'refund') {
      updates['totalRefunded'] = increment(amount);
    }

    await setDoc(statsRef, updates, { merge: true });
  } catch {
    // Non-blocking
  }
}

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
    compatibility: 'Compatibilité IA',
    test: 'Test (gratuit)',
    daily_reset: 'Reset quotidien',
    daily_refill: 'Recharge quotidienne',
    welcome_bonus: 'Bonus de bienvenue',
    phase_switch: 'Passage phase quotidienne',
    refund: 'Remboursement',
  };
  return labels[feature] ?? feature;
}

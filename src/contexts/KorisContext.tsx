/**
 * KorisContext — Contexte React pour le système de crédits Koris
 *
 * Expose la phase actuelle (bienvenue vs quotidienne) pour l'affichage conditionnel.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getKorisBalance,
  getKorisWallet,
  checkDailyReset,
  spendKoris,
  refundKoris,
  KORIS_COSTS,
  KORIS_DAILY_AMOUNT,
  type KorisFeatureType,
  type KorisSpendResult,
} from '../services/korisService';

interface KorisContextType {
  balance: number;
  loading: boolean;
  refreshBalance: () => Promise<void>;
  spend: (feature: KorisFeatureType, details?: string) => Promise<KorisSpendResult>;
  refund: (feature: KorisFeatureType) => Promise<void>;
  canAfford: (feature: KorisFeatureType) => boolean;
  getCost: (feature: KorisFeatureType) => number;
  showNoKorisModal: boolean;
  setShowNoKorisModal: (show: boolean) => void;
  /** true = Phase Bienvenue (25 Koris), false = Phase Quotidienne (10/jour) */
  welcomeBonusActive: boolean;
  /** Amount of today's daily reset (10) — 0 if no reset happened this load */
  dailyResetAmount: number;
  /** true if wallet was just created this session (first ever login) */
  walletJustCreated: boolean;
  /** true if phase switched from welcome→daily this session */
  phaseSwitched: boolean;
  /** Koris spent today (in daily phase) */
  todaySpent: number;
  /** Incremented each time a spend succeeds — used to trigger animation */
  spendTick: number;
  lastSpentCost: number;

  // Legacy compat
  dailyRefillAmount: number;
  walletInitialized: boolean;
}

const KorisContext = createContext<KorisContextType>({
  balance: 0,
  loading: true,
  refreshBalance: async () => {},
  spend: async () => ({ allowed: false, cost: 0, balanceBefore: 0, balanceAfter: 0, newBalance: 0 }),
  refund: async () => {},
  canAfford: () => true,
  getCost: () => 0,
  showNoKorisModal: false,
  setShowNoKorisModal: () => {},
  welcomeBonusActive: true,
  dailyResetAmount: 0,
  walletJustCreated: false,
  phaseSwitched: false,
  todaySpent: 0,
  spendTick: 0,
  lastSpentCost: 0,
  dailyRefillAmount: 0,
  walletInitialized: false,
});

export const useKoris = () => useContext(KorisContext);

export const KorisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNoKorisModal, setShowNoKorisModal] = useState(false);
  const [welcomeBonusActive, setWelcomeBonusActive] = useState(true);
  const [dailyResetAmount, setDailyResetAmount] = useState(0);
  const [walletJustCreated, setWalletJustCreated] = useState(false);
  const [phaseSwitched, setPhaseSwitched] = useState(false);
  const [todaySpent, setTodaySpent] = useState(0);
  const [spendTick, setSpendTick] = useState(0);
  const [lastSpentCost, setLastSpentCost] = useState(0);
  const initDoneRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) {
      setBalance(0);
      setLoading(false);
      initDoneRef.current = false;
      return;
    }

    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const init = async () => {
      try {
        const result = await checkDailyReset(currentUser.id);

        setBalance(result.newBalance);
        setWelcomeBonusActive(result.welcomeBonusActive);
        setWalletJustCreated(result.walletJustCreated);
        setPhaseSwitched(result.phaseSwitched);

        if (result.wasReset && !result.walletJustCreated) {
          setDailyResetAmount(KORIS_DAILY_AMOUNT);
        }

        // Load todaySpent from wallet
        const wallet = await getKorisWallet(currentUser.id);
        if (wallet) {
          setTodaySpent(wallet.todaySpent);
        }
      } catch (e) {
        console.error('Koris init error:', e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isAuthenticated, currentUser?.id]);

  const refreshBalance = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const wallet = await getKorisWallet(currentUser.id);
      if (wallet) {
        setBalance(wallet.balance);
        setWelcomeBonusActive(wallet.welcomeBonusActive);
        setTodaySpent(wallet.todaySpent);
      }
    } catch {
      // Silently fail
    }
  }, [currentUser?.id]);

  const spend = useCallback(async (feature: KorisFeatureType, details?: string): Promise<KorisSpendResult> => {
    if (!currentUser?.id) {
      return { allowed: false, cost: KORIS_COSTS[feature], balanceBefore: 0, balanceAfter: 0, newBalance: 0 };
    }

    const result = await spendKoris(currentUser.id, feature, details);

    if (result.allowed) {
      setBalance(result.newBalance);
      setLastSpentCost(result.cost);
      setSpendTick(t => t + 1);
      setTodaySpent(s => s + result.cost);

      // Refresh wallet state from Firestore after spend to detect phase switch
      const walletAfterSpend = await getKorisWallet(currentUser.id);
      if (walletAfterSpend && !walletAfterSpend.welcomeBonusActive && welcomeBonusActive) {
        setWelcomeBonusActive(false);
        setPhaseSwitched(true);
      }
    } else {
      setShowNoKorisModal(true);
    }

    return result;
  }, [currentUser?.id, welcomeBonusActive]);

  const refund = useCallback(async (feature: KorisFeatureType) => {
    if (!currentUser?.id) return;
    await refundKoris(currentUser.id, feature);
    await refreshBalance();
  }, [currentUser?.id, refreshBalance]);

  const canAfford = useCallback((feature: KorisFeatureType) => {
    return balance >= KORIS_COSTS[feature];
  }, [balance]);

  const getCost = useCallback((feature: KorisFeatureType) => {
    return KORIS_COSTS[feature];
  }, []);

  return (
    <KorisContext.Provider
      value={{
        balance,
        loading,
        refreshBalance,
        spend,
        refund,
        canAfford,
        getCost,
        showNoKorisModal,
        setShowNoKorisModal,
        welcomeBonusActive,
        dailyResetAmount,
        walletJustCreated,
        phaseSwitched,
        todaySpent,
        spendTick,
        lastSpentCost,
        // Legacy compat for FloatingKori
        dailyRefillAmount: dailyResetAmount,
        walletInitialized: walletJustCreated,
      }}
    >
      {children}
    </KorisContext.Provider>
  );
};

export default KorisContext;

/**
 * KorisContext — Contexte React pour le système de crédits Koris
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getKorisWallet,
  checkDailyReset,
  KORIS_COSTS,
  type KorisFeatureType,
} from '../services/korisService';

interface KorisContextType {
  balance: number;
  loading: boolean;
  refreshBalance: () => Promise<void>;
  canAfford: (feature: KorisFeatureType) => boolean;
  getCost: (feature: KorisFeatureType) => number;
  showNoKorisModal: boolean;
  setShowNoKorisModal: (show: boolean) => void;
  welcomeBonusActive: boolean;
  walletJustCreated: boolean;
  phaseSwitched: boolean;
  todaySpent: number;
  spendTick: number;
  lastSpentCost: number;
  transitionBonusGranted: boolean;
  walletInitialized: boolean;
}

const KorisContext = createContext<KorisContextType>({
  balance: 0,
  loading: true,
  refreshBalance: async () => {},
  canAfford: () => true,
  getCost: () => 0,
  showNoKorisModal: false,
  setShowNoKorisModal: () => {},
  welcomeBonusActive: true,
  walletJustCreated: false,
  phaseSwitched: false,
  todaySpent: 0,
  spendTick: 0,
  lastSpentCost: 0,
  transitionBonusGranted: false,
  walletInitialized: false,
});

export const useKoris = () => useContext(KorisContext);

export const KorisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNoKorisModal, setShowNoKorisModal] = useState(false);
  const [welcomeBonusActive, setWelcomeBonusActive] = useState(true);
  const [walletJustCreated, setWalletJustCreated] = useState(false);
  const [phaseSwitched, setPhaseSwitched] = useState(false);
  const [todaySpent, setTodaySpent] = useState(0);
  const [spendTick, setSpendTick] = useState(0);
  const [lastSpentCost, setLastSpentCost] = useState(0);
  const [transitionBonusGranted, setTransitionBonusGranted] = useState(false);
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
        setTransitionBonusGranted(result.transitionBonusGranted);

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
        canAfford,
        getCost,
        showNoKorisModal,
        setShowNoKorisModal,
        welcomeBonusActive,
        walletJustCreated,
        phaseSwitched,
        todaySpent,
        spendTick,
        lastSpentCost,
        transitionBonusGranted,
        walletInitialized: walletJustCreated,
      }}
    >
      {children}
    </KorisContext.Provider>
  );
};

export default KorisContext;

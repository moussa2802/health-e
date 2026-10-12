/**
 * KorisContext — Contexte React pour le système de crédits Koris
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getKorisWallet,
  initKoris,
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
  openNoKorisModal: (action: string, cost: number) => void;
  closeNoKorisModal: () => void;
  noKorisAction: string;
  noKorisCost: number;
  walletJustCreated: boolean;
  spendTick: number;
  lastSpentCost: number;
  lowBalance: boolean;
}

const KorisContext = createContext<KorisContextType>({
  balance: 0,
  loading: true,
  refreshBalance: async () => {},
  canAfford: () => true,
  getCost: () => 0,
  showNoKorisModal: false,
  openNoKorisModal: () => {},
  closeNoKorisModal: () => {},
  noKorisAction: '',
  noKorisCost: 0,
  walletJustCreated: false,
  spendTick: 0,
  lastSpentCost: 0,
  lowBalance: false,
});

export const useKoris = () => useContext(KorisContext);

export const KorisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNoKorisModal, setShowNoKorisModal] = useState(false);
  const [noKorisAction, setNoKorisAction] = useState('');
  const [noKorisCost, setNoKorisCost] = useState(0);
  const [walletJustCreated, setWalletJustCreated] = useState(false);
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
        const result = await initKoris(currentUser.id);

        setBalance(result.newBalance);
        setWalletJustCreated(result.walletJustCreated);
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

  const openNoKorisModal = useCallback((action: string, cost: number) => {
    setNoKorisAction(action);
    setNoKorisCost(cost);
    setShowNoKorisModal(true);
  }, []);

  const closeNoKorisModal = useCallback(() => {
    setShowNoKorisModal(false);
  }, []);

  const lowBalance = balance > 0 && balance < 5;

  return (
    <KorisContext.Provider
      value={{
        balance,
        loading,
        refreshBalance,
        canAfford,
        getCost,
        showNoKorisModal,
        openNoKorisModal,
        closeNoKorisModal,
        noKorisAction,
        noKorisCost,
        walletJustCreated,
        spendTick,
        lastSpentCost,
        lowBalance,
      }}
    >
      {children}
    </KorisContext.Provider>
  );
};

export default KorisContext;

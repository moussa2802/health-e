/**
 * KoriBalance — Badge compact dans le header affichant l'image kori + solde.
 * Clic → ouvre le KorisDetailPanel en dropdown.
 */

import React, { useState } from 'react';
import { useKoris } from '../../contexts/KorisContext';
import KorisDetailPanel from './KorisDetailPanel';

const KORI_IMG = '/kori.png';

const KoriBalance: React.FC = () => {
  const { balance, loading } = useKoris();
  const [showPanel, setShowPanel] = useState(false);

  if (loading) return null;

  const toneClass =
    balance > 5
      ? 'bg-gold-soft border-gold/25 text-gold'
      : balance > 0
        ? 'bg-warn/10 border-warn/25 text-warn'
        : 'bg-danger/10 border-danger/25 text-danger';

  return (
    <>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`inline-flex items-center gap-1 pl-1 pr-2.5 py-1 rounded-pill border text-[13px] font-bold whitespace-nowrap transition-transform hover:scale-[1.03] ${toneClass}`}
        title="Mes Koris"
      >
        <img
          src={KORI_IMG}
          alt="Kori"
          className="w-6 h-6 rounded-full object-cover"
        />
        <span>{balance}</span>
      </button>

      {showPanel && <KorisDetailPanel onClose={() => setShowPanel(false)} />}
    </>
  );
};

export default KoriBalance;

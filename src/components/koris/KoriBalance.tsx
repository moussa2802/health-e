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

  return (
    <>
      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 9px 3px 4px',
          borderRadius: 20,
          border: '1px solid rgba(13,148,136,0.25)',
          background: balance > 5
            ? 'rgba(13,148,136,0.06)'
            : balance > 0
              ? 'rgba(217,119,6,0.08)'
              : 'rgba(239,68,68,0.08)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: 13,
          fontWeight: 700,
          color: balance > 5 ? '#0D9488' : balance > 0 ? '#D97706' : '#DC2626',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.03)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,148,136,0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title="Mes Koris"
      >
        <img
          src={KORI_IMG}
          alt="Kori"
          style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
        />
        <span>{balance}</span>
      </button>

      {showPanel && <KorisDetailPanel onClose={() => setShowPanel(false)} />}
    </>
  );
};

export default KoriBalance;

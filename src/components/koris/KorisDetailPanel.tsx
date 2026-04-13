/**
 * KorisDetailPanel — Dropdown sous le badge KoriBalance dans le header.
 */

import React, { useEffect, useState } from 'react';
import { useKoris } from '../../contexts/KorisContext';
import { getKorisHistory, getFeatureLabel, KORIS_COSTS, type KorisTransaction } from '../../services/korisService';
import { useAuth } from '../../contexts/AuthContext';

const KORI_IMG = '/kori.png';

interface Props {
  onClose: () => void;
}

const KorisDetailPanel: React.FC<Props> = ({ onClose }) => {
  const { balance } = useKoris();
  const { currentUser } = useAuth();
  const [history, setHistory] = useState<KorisTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    getKorisHistory(currentUser.id, 15)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-koris-panel]')) onClose();
    };
    setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'spend': return '−';
      case 'refill': return '+';
      case 'bonus': return '🎁';
      case 'refund': return '↩';
      default: return '•';
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'spend': return '#DC2626';
      case 'refill': return '#059669';
      case 'bonus': return '#D97706';
      case 'refund': return '#3B82F6';
      default: return '#64748B';
    }
  };

  return (
    <div
      data-koris-panel
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 320,
        maxHeight: '70vh',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: '1px solid rgba(59,130,246,0.1)',
        zIndex: 100,
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D9488, #059669)',
        padding: '18px 16px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <img
          src={KORI_IMG}
          alt="Kori"
          style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }}
        />
        <div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Mon solde</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>
            {balance}
            <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 5, opacity: 0.85 }}>Koris</span>
          </div>
          <div style={{ fontSize: 10, opacity: 0.75 }}>+10 chaque jour à minuit</div>
        </div>
      </div>

      {/* Tarifs */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>
          Tarifs
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 12px', fontSize: 11 }}>
          {Object.entries(KORIS_COSTS)
            .filter(([, cost]) => cost > 0)
            .map(([feature, cost]) => (
              <React.Fragment key={feature}>
                <span style={{ color: '#475569' }}>{getFeatureLabel(feature)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, color: '#0D9488', justifyContent: 'flex-end' }}>
                  <img src={KORI_IMG} alt="" style={{ width: 12, height: 12, borderRadius: '50%', objectFit: 'cover' }} />
                  {cost}
                </span>
              </React.Fragment>
            ))}
          <span style={{ color: '#059669' }}>Tests d'évaluation</span>
          <span style={{ fontWeight: 600, color: '#059669', textAlign: 'right' }}>Gratuit</span>
        </div>
      </div>

      {/* Historique */}
      <div style={{ padding: '10px 16px', maxHeight: 180, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>
          Historique récent
        </div>
        {loading ? (
          <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: 10 }}>Chargement...</div>
        ) : history.length === 0 ? (
          <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: 10 }}>Aucune transaction</div>
        ) : (
          history.map((tx, i) => (
            <div
              key={tx.id ?? i}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 0',
                borderBottom: i < history.length - 1 ? '1px solid #F8FAFC' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: typeColor(tx.type), background: `${typeColor(tx.type)}15`,
                }}>
                  {typeIcon(tx.type)}
                </span>
                <div>
                  <div style={{ fontSize: 11, color: '#334155', fontWeight: 500 }}>{getFeatureLabel(tx.feature)}</div>
                  <div style={{ fontSize: 9, color: '#94A3B8' }}>
                    {new Date(tx.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: typeColor(tx.type) }}>
                {tx.type === 'spend' ? '−' : '+'}{tx.amount}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KorisDetailPanel;

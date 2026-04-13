/**
 * KorisFloatingPanel — Panneau ouvert depuis le FloatingKori.
 * Bottom-sheet sur mobile, dropdown sur desktop.
 *
 * Phase Bienvenue: affiche "Koris de bienvenue", pas de countdown.
 * Phase Quotidienne: affiche countdown "Recharge dans Xh Xmin" et barre "Utilisés: X / 10".
 */

import React, { useEffect, useState } from 'react';
import { useKoris } from '../../contexts/KorisContext';
import { getKorisHistory, getFeatureLabel, KORIS_COSTS, KORIS_DAILY_AMOUNT, type KorisTransaction } from '../../services/korisService';
import { useAuth } from '../../contexts/AuthContext';

const KORI_IMG = '/kori.png';

interface Props {
  onClose: () => void;
}

const KorisFloatingPanel: React.FC<Props> = ({ onClose }) => {
  const { balance, welcomeBonusActive, todaySpent } = useKoris();
  const { currentUser } = useAuth();
  const [history, setHistory] = useState<KorisTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    getKorisHistory(currentUser.id, 5)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  // Countdown to midnight (only relevant in daily phase)
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const msLeft = midnight.getTime() - now.getTime();
  const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
  const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

  const typeColor = (type: string) => {
    switch (type) {
      case 'spend': return '#DC2626';
      case 'refill': case 'daily_reset': return '#059669';
      case 'bonus': case 'phase_switch': return '#D97706';
      case 'refund': return '#3B82F6';
      default: return '#64748B';
    }
  };

  const typeSign = (type: string) => {
    return type === 'spend' ? '−' : '+';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 51,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div
        data-koris-panel
        style={{
          position: 'fixed',
          zIndex: 52,
          bottom: 90,
          left: 24,
          width: 320,
          maxHeight: 'calc(100vh - 120px)',
          background: 'white',
          borderRadius: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          border: '1px solid rgba(0,0,0,0.06)',
          overflow: 'hidden',
          fontFamily: "'Inter', -apple-system, sans-serif",
          animation: 'koriPanelIn 0.25s ease-out',
        }}
      >
        {/* Header with Kori image + balance */}
        <div style={{
          background: 'linear-gradient(135deg, #0D9488, #059669)',
          padding: '20px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          color: 'white',
        }}>
          <img
            src={KORI_IMG}
            alt="Kori"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Mon solde</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1 }}>
              {balance}
              <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 5, opacity: 0.85 }}>Koris</span>
            </div>
          </div>
        </div>

        {/* Phase-dependent section */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
          {welcomeBonusActive ? (
            /* ── Phase Bienvenue ── */
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎁</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>
                  Koris de bienvenue
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                  Profite de tes Koris offerts — pas de limite journalière
                </div>
              </div>
            </div>
          ) : (
            /* ── Phase Quotidienne ── */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                  Utilisés : {todaySpent} / {KORIS_DAILY_AMOUNT}
                </span>
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                  Recharge dans {hoursLeft}h{minsLeft > 0 ? ` ${minsLeft}min` : ''}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (todaySpent / KORIS_DAILY_AMOUNT) * 100)}%`,
                  background: todaySpent >= 8 ? '#DC2626' : todaySpent >= 5 ? '#D97706' : '#0D9488',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
            </>
          )}
        </div>

        {/* Recent transactions */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', maxHeight: 160, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>
            Dernieres transactions
          </div>
          {loading ? (
            <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: 8 }}>...</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: 8 }}>Aucune transaction</div>
          ) : (
            history.map((tx, i) => (
              <div key={tx.id ?? i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 0',
                borderBottom: i < history.length - 1 ? '1px solid #FAFBFC' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img
                    src={KORI_IMG}
                    alt=""
                    style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', opacity: tx.type === 'spend' ? 0.5 : 1 }}
                  />
                  <span style={{ fontSize: 11, color: '#475569' }}>{getFeatureLabel(tx.feature)}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: typeColor(tx.type) }}>
                  {typeSign(tx.type)}{tx.amount}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Cost grid */}
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>
            Couts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px', fontSize: 11 }}>
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
            <span style={{ color: '#059669' }}>Tests d'evaluation</span>
            <span style={{ fontWeight: 600, color: '#059669', textAlign: 'right' }}>Gratuit ✅</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes koriPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 500px) {
          [data-koris-panel] {
            left: 8px !important;
            right: 8px !important;
            bottom: 90px !important;
            width: auto !important;
          }
        }
      `}</style>
    </>
  );
};

export default KorisFloatingPanel;

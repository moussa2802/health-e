/**
 * NoKorisModal — Modal quand l'utilisateur n'a plus assez de Koris.
 *
 * Phase Quotidienne: "Tes 10 Koris quotidiens seront rechargés demain" + countdown
 * Phase Bienvenue: Ne devrait pas se produire (bascule auto), mais cas de secours inclus.
 */

import React from 'react';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_DAILY_AMOUNT } from '../../services/korisService';

const KORI_IMG = '/kori.png';

const NoKorisModal: React.FC = () => {
  const { showNoKorisModal, setShowNoKorisModal, balance, welcomeBonusActive } = useKoris();

  if (!showNoKorisModal) return null;

  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const hoursLeft = Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16,
      }}
      onClick={() => setShowNoKorisModal(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 20, padding: '32px 24px',
          maxWidth: 380, width: '100%', textAlign: 'center',
          fontFamily: "'Inter', -apple-system, sans-serif",
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        }}
      >
        {/* Kori image */}
        <img
          src={KORI_IMG}
          alt="Kori"
          style={{
            width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
            margin: '0 auto 16px', display: 'block',
            border: '3px solid rgba(13,148,136,0.2)',
            opacity: 0.6,
            filter: 'grayscale(30%)',
          }}
        />

        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0A2342', margin: '0 0 8px' }}>
          Plus assez de Koris
        </h3>

        <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
          Il te reste{' '}
          <strong style={{ color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <img src={KORI_IMG} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} />
            {balance}
          </strong>{' '}
          Kori{balance !== 1 ? 's' : ''}.
          {welcomeBonusActive
            ? ' Tes Koris de bienvenue sont presque épuisés.'
            : ` Tes ${KORIS_DAILY_AMOUNT} Koris quotidiens seront rechargés demain.`
          }
        </p>

        {/* Timer — only in daily phase */}
        {!welcomeBonusActive && (
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Prochaine recharge dans</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>~{hoursLeft}h</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{KORIS_DAILY_AMOUNT} Koris à minuit</div>
          </div>
        )}

        {/* Astuce */}
        <div style={{
          background: 'rgba(59,130,246,0.06)', borderRadius: 12, padding: '12px 16px',
          marginBottom: 20, textAlign: 'left',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', marginBottom: 4 }}>Astuce</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
            Les tests d'évaluation sont toujours gratuits. Tu peux continuer tes évaluations sans Koris.
          </div>
        </div>

        <button
          onClick={() => setShowNoKorisModal(false)}
          style={{
            width: '100%', padding: '12px 24px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #0D9488, #059669)',
            color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Compris
        </button>
      </div>
    </div>
  );
};

export default NoKorisModal;

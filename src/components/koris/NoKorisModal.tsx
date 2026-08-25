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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={() => setShowNoKorisModal(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-block px-6 py-8 max-w-[380px] w-full text-center shadow-lift"
      >
        {/* Kori image */}
        <img
          src={KORI_IMG}
          alt="Kori"
          className="w-[72px] h-[72px] rounded-full object-cover mx-auto mb-4 block border-[3px] border-gold/20"
          style={{ opacity: 0.6, filter: 'grayscale(30%)' }}
        />

        <h3 className="font-display text-lg font-semibold text-ink m-0 mb-2">
          Plus assez de Koris
        </h3>

        <p className="text-sm text-ink-soft m-0 mb-5 leading-relaxed">
          Il te reste{' '}
          <strong className="text-gold inline-flex items-center gap-1">
            <img src={KORI_IMG} alt="" className="w-4 h-4 rounded-full object-cover align-middle" />
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
          <div className="bg-paper rounded-xl px-4 py-3 mb-5">
            <div className="text-xs text-muted mb-1">Prochaine recharge dans</div>
            <div className="text-xl font-bold text-ok">~{hoursLeft}h</div>
            <div className="text-[11px] text-muted">{KORIS_DAILY_AMOUNT} Koris à minuit</div>
          </div>
        )}

        {/* Astuce */}
        <div className="bg-accent-soft rounded-xl px-4 py-3 mb-5 text-left">
          <div className="text-xs font-semibold text-accent mb-1">Astuce</div>
          <div className="text-xs text-ink-soft leading-relaxed">
            Les tests d'évaluation sont toujours gratuits. Tu peux continuer tes évaluations sans Koris.
          </div>
        </div>

        <button
          onClick={() => setShowNoKorisModal(false)}
          className="w-full py-3 rounded-xl border-0 bg-gold text-white text-sm font-semibold cursor-pointer hover:bg-gold/90 transition-colors"
        >
          Compris
        </button>
      </div>
    </div>
  );
};

export default NoKorisModal;

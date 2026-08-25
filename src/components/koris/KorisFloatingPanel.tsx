/**
 * KorisFloatingPanel — Panneau ouvert depuis le FloatingKori.
 * Bottom-sheet sur mobile, dropdown sur desktop.
 *
 * Phase Bienvenue: affiche "Koris de bienvenue", pas de countdown.
 * Phase Quotidienne: affiche countdown "Recharge dans Xh Xmin" et barre "Utilisés: X / 10".
 */

import React, { useEffect, useState } from 'react';
import { Gift, Check } from 'lucide-react';
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

  const typeTextClass = (type: string) => {
    switch (type) {
      case 'spend': return 'text-danger';
      case 'refill': case 'daily_reset': return 'text-ok';
      case 'bonus': case 'phase_switch': return 'text-gold';
      case 'refund': return 'text-accent';
      default: return 'text-muted';
    }
  };

  const typeSign = (type: string) => {
    return type === 'spend' ? '−' : '+';
  };

  const usageBarClass = todaySpent >= 8 ? 'bg-danger' : todaySpent >= 5 ? 'bg-warn' : 'bg-gold';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[51] bg-black/25"
        style={{ backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div
        data-koris-panel
        className="fixed z-[52] bottom-[90px] left-6 w-80 bg-card rounded-block shadow-lift border border-line overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 120px)', animation: 'koriPanelIn 0.25s ease-out' }}
      >
        {/* Header with Kori image + balance */}
        <div className="bg-gold px-4 py-5 flex items-center gap-3.5 text-white">
          <img
            src={KORI_IMG}
            alt="Kori"
            className="w-12 h-12 rounded-full object-cover border-[3px] border-white/30 flex-shrink-0"
          />
          <div>
            <div className="text-[11px] opacity-85">Mon solde</div>
            <div className="text-[30px] font-extrabold tracking-tight leading-tight">
              {balance}
              <span className="text-[13px] font-medium ml-1 opacity-85">Koris</span>
            </div>
          </div>
        </div>

        {/* Phase-dependent section */}
        <div className="px-4 py-3 border-b border-line">
          {welcomeBonusActive ? (
            /* ── Phase Bienvenue ── */
            <div className="flex items-center gap-2">
              <Gift size={18} className="text-gold flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-gold">
                  Koris de bienvenue
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  Profite de tes Koris offerts — pas de limite journalière
                </div>
              </div>
            </div>
          ) : (
            /* ── Phase Quotidienne ── */
            <>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-ink-soft font-semibold">
                  Utilisés : {todaySpent} / {KORIS_DAILY_AMOUNT}
                </span>
                <span className="text-[11px] text-ok font-semibold">
                  Recharge dans {hoursLeft}h{minsLeft > 0 ? ` ${minsLeft}min` : ''}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-line overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${usageBarClass}`}
                  style={{ width: `${Math.min(100, (todaySpent / KORIS_DAILY_AMOUNT) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Recent transactions */}
        <div className="px-4 py-2.5 border-b border-line max-h-40 overflow-y-auto">
          <div className="text-[10px] font-semibold text-muted uppercase mb-1.5">
            Dernieres transactions
          </div>
          {loading ? (
            <div className="text-[11px] text-muted text-center py-2">...</div>
          ) : history.length === 0 ? (
            <div className="text-[11px] text-muted text-center py-2">Aucune transaction</div>
          ) : (
            history.map((tx, i) => (
              <div
                key={tx.id ?? i}
                className={`flex items-center justify-between py-1.5 ${
                  i < history.length - 1 ? 'border-b border-line/50' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <img
                    src={KORI_IMG}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                    style={{ opacity: tx.type === 'spend' ? 0.5 : 1 }}
                  />
                  <span className="text-[11px] text-ink-soft">{getFeatureLabel(tx.feature)}</span>
                </div>
                <span className={`text-xs font-bold ${typeTextClass(tx.type)}`}>
                  {typeSign(tx.type)}{tx.amount}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Cost grid */}
        <div className="px-4 pt-2.5 pb-3.5">
          <div className="text-[10px] font-semibold text-muted uppercase mb-1.5">
            Couts
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-1 text-[11px]">
            {Object.entries(KORIS_COSTS)
              .filter(([, cost]) => cost > 0)
              .map(([feature, cost]) => (
                <React.Fragment key={feature}>
                  <span className="text-ink-soft">{getFeatureLabel(feature)}</span>
                  <span className="flex items-center gap-1 font-semibold text-gold justify-end">
                    <img src={KORI_IMG} alt="" className="w-3 h-3 rounded-full object-cover" />
                    {cost}
                  </span>
                </React.Fragment>
              ))}
            <span className="text-ok">Tests d'evaluation</span>
            <span className="font-semibold text-ok text-right flex items-center justify-end gap-1">
              Gratuit <Check size={12} />
            </span>
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

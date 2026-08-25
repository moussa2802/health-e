/**
 * KorisDetailPanel — Dropdown sous le badge KoriBalance dans le header.
 */

import React, { useEffect, useState } from 'react';
import { Minus, Plus, Gift, Undo2, Circle } from 'lucide-react';
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
      case 'spend': return <Minus size={12} />;
      case 'refill': return <Plus size={12} />;
      case 'bonus': return <Gift size={12} />;
      case 'refund': return <Undo2 size={12} />;
      default: return <Circle size={8} />;
    }
  };

  const typeToneClass = (type: string) => {
    switch (type) {
      case 'spend': return 'text-danger bg-danger/10';
      case 'refill': return 'text-ok bg-ok/10';
      case 'bonus': return 'text-gold bg-gold-soft';
      case 'refund': return 'text-accent bg-accent-soft';
      default: return 'text-muted bg-line/50';
    }
  };

  const typeTextClass = (type: string) => {
    switch (type) {
      case 'spend': return 'text-danger';
      case 'refill': return 'text-ok';
      case 'bonus': return 'text-gold';
      case 'refund': return 'text-accent';
      default: return 'text-muted';
    }
  };

  return (
    <div
      data-koris-panel
      className="absolute top-full right-0 mt-2 w-80 max-h-[70vh] bg-card rounded-block shadow-lift border border-line z-[100] overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gold px-4 py-4.5 text-white flex items-center gap-3">
        <img
          src={KORI_IMG}
          alt="Kori"
          className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
        />
        <div>
          <div className="text-[11px] opacity-85">Mon solde</div>
          <div className="text-[28px] font-extrabold tracking-tight">
            {balance}
            <span className="text-[13px] font-medium ml-1 opacity-85">Koris</span>
          </div>
          <div className="text-[10px] opacity-75">+10 chaque jour à minuit</div>
        </div>
      </div>

      {/* Tarifs */}
      <div className="px-4 py-2.5 border-b border-line">
        <div className="text-[10px] font-semibold text-muted uppercase mb-1.5">
          Tarifs
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11px]">
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
          <span className="text-ok">Tests d'évaluation</span>
          <span className="font-semibold text-ok text-right">Gratuit</span>
        </div>
      </div>

      {/* Historique */}
      <div className="px-4 py-2.5 max-h-[180px] overflow-y-auto">
        <div className="text-[10px] font-semibold text-muted uppercase mb-1.5">
          Historique récent
        </div>
        {loading ? (
          <div className="text-[11px] text-muted text-center py-2.5">Chargement...</div>
        ) : history.length === 0 ? (
          <div className="text-[11px] text-muted text-center py-2.5">Aucune transaction</div>
        ) : (
          history.map((tx, i) => (
            <div
              key={tx.id ?? i}
              className={`flex items-center justify-between py-1.5 ${
                i < history.length - 1 ? 'border-b border-line/60' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${typeToneClass(tx.type)}`}>
                  {typeIcon(tx.type)}
                </span>
                <div>
                  <div className="text-[11px] text-ink-soft font-medium">{getFeatureLabel(tx.feature)}</div>
                  <div className="text-[9px] text-muted">
                    {new Date(tx.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold ${typeTextClass(tx.type)}`}>
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

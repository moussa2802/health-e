import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_TRANSITION_BONUS } from '../../services/korisService';

const KORI_IMG = '/kori.png';

const KorisTransitionToast: React.FC = () => {
  const { transitionBonusGranted } = useKoris();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!transitionBonusGranted) return;
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [transitionBonusGranted]);

  if (!visible) return null;

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => setVisible(false), 400);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      style={{ backdropFilter: 'blur(3px)', opacity: exiting ? 0 : 1, transition: 'opacity 0.4s' }}
      onClick={dismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-block px-6 py-7 max-w-[380px] w-full shadow-lift"
        style={{
          transform: exiting ? 'translateY(20px)' : 'translateY(0)',
          transition: 'transform 0.4s',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <img
            src={KORI_IMG}
            alt="Kori"
            className="w-12 h-12 rounded-full object-cover border-2 border-gold/20"
          />
          <div>
            <div className="text-base font-bold text-ink">Health-e évolue</div>
            <div className="text-xs text-muted mt-0.5">Ton économie Koris change</div>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="bg-paper rounded-xl px-4 py-3 border border-line">
            <div className="text-xs font-semibold text-ink-soft mb-1">Ce qui change</div>
            <div className="text-[13px] text-ink leading-relaxed">
              Le rechargement quotidien automatique prend fin.
              Tes Koris restent dans ton solde et ne périment pas.
            </div>
          </div>

          <div className="bg-gold/5 rounded-xl px-4 py-3 border border-gold/15">
            <div className="text-xs font-semibold text-gold mb-1">Pour toi</div>
            <div className="text-[13px] text-ink leading-relaxed">
              <strong className="text-gold">{KORIS_TRANSITION_BONUS} Koris</strong> ont été ajoutés à ton solde pour cette transition.
            </div>
          </div>

          <div className="bg-paper rounded-xl px-4 py-3 border border-line">
            <div className="text-xs font-semibold text-ink-soft mb-1">Besoin de plus ?</div>
            <div className="text-[13px] text-ink leading-relaxed">
              Tu peux acheter des packs de Koris à tout moment via Orange Money, Wave ou carte.
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 rounded-xl border border-line bg-transparent text-sm text-ink-soft font-medium cursor-pointer hover:bg-paper transition-colors"
          >
            Compris
          </button>
          <button
            onClick={() => { dismiss(); navigate('/acheter-koris'); }}
            className="flex-1 py-2.5 rounded-xl border-0 bg-gold text-white text-sm font-semibold cursor-pointer hover:bg-gold/90 transition-colors flex items-center justify-center gap-1.5"
          >
            Voir les packs <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default KorisTransitionToast;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ChevronRight, Users } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';

interface GameTeaserProps {
  defiEnabled: boolean;
  totemProgress: { completed: number; total: number; missing: string[] };
  totemRevealed: boolean;
  onLockedClick: () => void;
  activeDefi?: { slug: string; expiresAt: Date } | null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const GameTeaser: React.FC<GameTeaserProps> = ({
  defiEnabled,
  totemProgress,
  totemRevealed,
  onLockedClick,
  activeDefi,
}) => {
  const navigate = useNavigate();
  const missing = totemProgress.total - totemProgress.completed;

  const [liveStats, setLiveStats] = useState<{ nbReponses: number; scoreMoyen: number } | null>(null);

  const now = Date.now();
  const expired = activeDefi ? activeDefi.expiresAt.getTime() <= now : true;
  const expiredOver3Days = activeDefi ? (now - activeDefi.expiresAt.getTime()) > THREE_DAYS_MS : true;
  const showActiveTile = !!activeDefi && !expiredOver3Days;

  useEffect(() => {
    if (!showActiveTile || !activeDefi) return;
    const unsub = onSnapshot(doc(db, 'defis', activeDefi.slug), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setLiveStats({ nbReponses: d.nbReponses || 0, scoreMoyen: d.scoreMoyen || 0 });
    });
    return unsub;
  }, [showActiveTile, activeDefi?.slug]);

  if (!defiEnabled) {
    return (
      <div
        className="bg-card border border-line rounded-[14px] p-3.5 shadow-soft flex flex-col justify-between cursor-default"
        style={{ minHeight: 96 }}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg leading-none">👀</span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,96,63,.12)', color: '#C9603F' }}
            >
              Bientôt
            </span>
          </div>
          <p className="text-[13px] font-bold text-ink m-0 mt-1.5 leading-tight">
            Kan moo ma gën a xam ?
          </p>
        </div>
        <p className="text-[11px] text-muted m-0 mt-1.5 leading-snug">
          Bientôt…
        </p>
      </div>
    );
  }

  if (missing > 0) {
    return (
      <div
        className="bg-card border border-line rounded-[14px] p-3.5 shadow-soft flex flex-col justify-between cursor-pointer"
        style={{ minHeight: 96 }}
        onClick={onLockedClick}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <Lock size={16} className="text-muted" />
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(127,169,143,.12)', color: '#7FA98F' }}
            >
              Verrouillé
            </span>
          </div>
          <p className="text-[13px] font-bold text-ink m-0 mt-1.5 leading-tight">
            Kan moo ma gën a xam ?
          </p>
        </div>
        <p className="text-[11px] text-muted m-0 mt-1.5 leading-snug">
          Encore {missing} test{missing > 1 ? 's' : ''} pour jouer
        </p>
      </div>
    );
  }

  if (!totemRevealed) {
    return (
      <div
        className="bg-card border border-line rounded-[14px] p-3.5 shadow-soft flex flex-col justify-between cursor-pointer"
        style={{ minHeight: 96 }}
        onClick={onLockedClick}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <Sparkles size={16} className="text-gold" />
          </div>
          <p className="text-[13px] font-bold text-ink m-0 mt-1.5 leading-tight">
            Kan moo ma gën a xam ?
          </p>
        </div>
        <p className="text-[11px] text-gold m-0 mt-1.5 leading-snug">
          Révèle ton totem d'abord
        </p>
      </div>
    );
  }

  if (showActiveTile) {
    const nb = liveStats?.nbReponses ?? 0;
    return (
      <div
        className="rounded-[14px] p-3.5 shadow-soft flex flex-col justify-between cursor-pointer"
        style={{
          minHeight: 96,
          background: 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)',
        }}
        onClick={() => navigate(`/defi/${activeDefi!.slug}/suivi`)}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <Users size={14} className="text-gold" />
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,168,100,.2)', color: '#C9A864' }}
            >
              {expired ? 'Terminé' : 'En cours'}
            </span>
          </div>
          <p className="text-[13px] font-bold text-[#F4F1E9] m-0 mt-1.5 leading-tight">
            {nb === 0 ? 'Aucune réponse' : `${nb} réponse${nb > 1 ? 's' : ''}`}
          </p>
        </div>
        <p className="text-[11px] text-gold m-0 mt-1.5 leading-snug">
          {expired ? 'Voir les résultats' : 'Voir le suivi →'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] p-3.5 shadow-soft flex flex-col justify-between cursor-pointer"
      style={{
        minHeight: 96,
        background: 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)',
      }}
      onClick={() => navigate('/defi')}
    >
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg leading-none">👀</span>
          <ChevronRight size={14} className="text-white/40" />
        </div>
        <p className="text-[13px] font-bold text-[#F4F1E9] m-0 mt-1.5 leading-tight">
          Qui te connaît le mieux ?
        </p>
      </div>
      <p className="text-[11px] text-gold m-0 mt-1.5 leading-snug">
        Lance ton défi 👀
      </p>
    </div>
  );
};

export default GameTeaser;

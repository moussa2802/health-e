import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Users, ArrowRight } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';

interface GameTeaserProps {
  defiEnabled: boolean;
  totemProgress: { completed: number; total: number; missing: string[] };
  totemRevealed: boolean;
  onLockedClick: () => void;
  activeDefis?: Array<{ slug: string; titre: string; audience: string; expiresAt: Date }>;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const TILE_BG = 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)';
const TILE_AMBER = '#D4965A';

const GameTeaser: React.FC<GameTeaserProps> = ({
  defiEnabled,
  totemProgress,
  totemRevealed,
  onLockedClick,
  activeDefis = [],
}) => {
  const navigate = useNavigate();
  const missing = totemProgress.total - totemProgress.completed;

  const [reponsesBySlug, setReponsesBySlug] = useState<Record<string, number>>({});

  const now = Date.now();
  const hasActive = activeDefis.length > 0;
  const allExpiredOver3Days = !hasActive || activeDefis.every(d => (now - d.expiresAt.getTime()) > THREE_DAYS_MS);
  const showActiveTile = hasActive && !allExpiredOver3Days;

  useEffect(() => {
    if (!showActiveTile || activeDefis.length === 0) return;
    const unsubs = activeDefis.map(ad =>
      onSnapshot(doc(db, 'defis', ad.slug), snap => {
        if (!snap.exists()) return;
        setReponsesBySlug(prev => ({ ...prev, [ad.slug]: snap.data().nbReponses || 0 }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, [showActiveTile, activeDefis.map(d => d.slug).join(',')]);

  const totalReponses = Object.values(reponsesBySlug).reduce((s, n) => s + n, 0);

  if (!defiEnabled) {
    return (
      <div
        className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-default"
        style={{ background: TILE_BG }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,150,90,0.15)' }}>
              <span className="text-[13px] leading-none">👀</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_AMBER }}>Le jeu</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,150,90,0.2)', color: TILE_AMBER }}>
            Bientôt
          </span>
        </div>
        <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">
          Kan moo ma gën a xam ?
        </p>
        <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
          Bientôt disponible…
        </p>
      </div>
    );
  }

  if (missing > 0) {
    return (
      <div
        className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all"
        style={{ background: TILE_BG }}
        onClick={onLockedClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,241,233,0.08)' }}>
              <Lock size={14} style={{ color: 'rgba(244,241,233,0.4)' }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(244,241,233,0.4)' }}>Le jeu</span>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,241,233,0.08)', color: 'rgba(244,241,233,0.4)' }}>
            <Lock size={9} /> Verrouillé
          </span>
        </div>
        <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">
          Kan moo ma gën a xam ?
        </p>
        <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
          Encore {missing} test{missing > 1 ? 's' : ''} pour jouer
        </p>
      </div>
    );
  }

  if (!totemRevealed) {
    return (
      <div
        className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all"
        style={{ background: TILE_BG }}
        onClick={onLockedClick}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,173,90,0.15)' }}>
            <Sparkles size={14} style={{ color: '#D4AD5A' }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(244,241,233,0.4)' }}>Le jeu</span>
        </div>
        <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">
          Kan moo ma gën a xam ?
        </p>
        <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
          Révèle ton totem d'abord
        </p>
      </div>
    );
  }

  if (showActiveTile) {
    return (
      <div
        className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all"
        style={{ background: TILE_BG }}
        onClick={() => navigate('/defi')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,150,90,0.15)' }}>
              <Users size={14} style={{ color: TILE_AMBER }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_AMBER }}>Le jeu</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,150,90,0.2)', color: TILE_AMBER }}>
            {activeDefis.length === 1 ? 'En cours' : `${activeDefis.length} défis`}
          </span>
        </div>
        <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">
          {totalReponses === 0 ? 'Aucune réponse' : `Tes défis · ${totalReponses} réponse${totalReponses > 1 ? 's' : ''}`}
        </p>
        <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
          Qui te connaît le mieux ?
        </p>
        <p className="text-[12px] font-semibold m-0 mt-auto pt-2 flex items-center gap-1" style={{ color: TILE_AMBER }}>
          Voir le suivi <ArrowRight size={12} />
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all"
      style={{ background: TILE_BG }}
      onClick={() => navigate('/defi')}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,150,90,0.15)' }}>
          <span className="text-[13px] leading-none">👀</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_AMBER }}>Le jeu</span>
      </div>
      <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">
        Qui te connaît le mieux ?
      </p>
      <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
        Lance un défi à tes proches
      </p>
      <p className="text-[12px] font-semibold m-0 mt-auto pt-2 flex items-center gap-1" style={{ color: TILE_AMBER }}>
        Lancer <ArrowRight size={12} />
      </p>
    </div>
  );
};

export default GameTeaser;

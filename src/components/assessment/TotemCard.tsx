import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import InfoTip from '../Onboarding/InfoTip';
import {
  getTotemProgress,
  getTotemSignature,
  computeTotem,
  type TotemAnimal,
} from '../../utils/totemAlgorithm';
import { saveTotem, revealTotem, acceptPendingTotem } from '../../services/evaluationService';
import type { ScaleResult } from '../../types/assessment';

import lionImg from '../../assets/totems/lion.jpg';
import loupImg from '../../assets/totems/loup.jpg';
import cerfImg from '../../assets/totems/cerf.jpg';
import dauphinImg from '../../assets/totems/dauphin.jpg';
import tortueImg from '../../assets/totems/tortue.jpg';
import hibouImg from '../../assets/totems/hibou.jpg';
import aigleImg from '../../assets/totems/aigle.jpg';
import elephantImg from '../../assets/totems/elephant.jpg';
import panthereImg from '../../assets/totems/panthere.jpg';
import renardImg from '../../assets/totems/renard.jpg';
import chevalImg from '../../assets/totems/cheval.jpg';
import oursImg from '../../assets/totems/ours.jpg';

const TOTEM_IMAGES: Record<TotemAnimal, string> = {
  lion: lionImg, loup: loupImg, cerf: cerfImg, dauphin: dauphinImg,
  tortue: tortueImg, hibou: hibouImg, aigle: aigleImg, elephant: elephantImg,
  panthere: panthereImg, renard: renardImg, cheval: chevalImg, ours: oursImg,
};

interface TotemCardProps {
  profileResults: Record<string, ScaleResult>;
  totem: { animal: string; computedAt: Date; revealedAt: Date | null; pendingAnimal: string | null } | null;
  userId: string | null;
  onTotemUpdate: () => void;
}

const TotemCard: React.FC<TotemCardProps> = ({
  profileResults, totem, userId, onTotemUpdate,
}) => {
  const navigate = useNavigate();
  const [revealing, setRevealing] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [justEvolved, setJustEvolved] = useState(false);

  const progress = getTotemProgress(profileResults);
  const isReady = progress.missing.length === 0;
  const isComputed = !!totem?.animal;
  const isRevealed = !!totem?.revealedAt;
  const hasPending = !!totem?.pendingAnimal && totem.pendingAnimal !== totem.animal;

  // State 1: Not all tests done — show progress
  if (!isReady) {
    const remaining = progress.total - progress.completed;
    return (
      <div className="bg-card border border-line rounded-[14px] px-4 py-3.5 mb-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-soft flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[14px] font-bold text-ink m-0">Ton Totem</p>
              <InfoTip text="Ton totem est un animal qui reflète ta personnalité psychologique profonde. Complète les évaluations pour le découvrir — deux personnes avec le même totem se ressemblent vraiment !" />
            </div>
            <p className="text-[11px] text-muted m-0 mt-0.5">
              Encore {remaining} test{remaining > 1 ? 's' : ''} pour le révéler
            </p>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: progress.total }).map((_, i) => (
              <div
                key={i}
                className={`w-[6px] h-[6px] rounded-full ${
                  i < progress.completed ? 'bg-gold' : 'bg-line'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // State 2: Tests done but totem not computed yet — compute in background
  if (!isComputed && userId) {
    const animal = computeTotem(profileResults);
    if (animal) {
      saveTotem(userId, animal).then(onTotemUpdate).catch(() => {});
    }
    return (
      <div className="bg-card border border-line rounded-[14px] px-4 py-3.5 mb-5 shadow-soft animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-soft flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-ink m-0">Ton Totem</p>
            <p className="text-[11px] text-muted m-0 mt-0.5">Calcul en cours…</p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Computed but not revealed — show reveal button
  if (isComputed && !isRevealed && !justRevealed) {
    const handleReveal = async () => {
      setRevealing(true);
      if (userId) {
        try { await revealTotem(userId); } catch { /* non-critical */ }
      }
      setTimeout(() => {
        setRevealing(false);
        setJustRevealed(true);
        onTotemUpdate();
      }, 1200);
    };

    return (
      <div className="relative rounded-block overflow-hidden mb-5 shadow-soft"
        style={{ background: 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)' }}>
        {revealing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <div className="w-16 h-16 rounded-full border-[3px] border-gold/30 border-t-gold animate-spin" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-gold" />
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gold/70 m-0">
              Totem prêt
            </p>
          </div>
          <h3 className="font-display text-lg font-semibold text-[#F4F1E9] m-0 mb-1">
            Ton totem est prêt à être révélé
          </h3>
          <p className="text-[13px] text-white/50 m-0 mb-4">
            Basé sur tes 7 évaluations psychologiques, un animal te représente.
          </p>
          <button
            onClick={handleReveal}
            disabled={revealing}
            className="w-full py-3 rounded-[14px] border-none text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all bg-gold text-white hover:bg-gold/90 shadow-soft disabled:opacity-60"
          >
            <Sparkles size={16} />
            Révéler mon totem
          </button>
        </div>
      </div>
    );
  }

  // From here, totem is revealed (or justRevealed)
  if (!totem) return null;
  const animal = totem.animal as TotemAnimal;
  const sig = getTotemSignature(animal);
  const img = TOTEM_IMAGES[animal];

  // State 5: Pending evolution — show notification
  if (hasPending && !justEvolved) {
    const pending = totem.pendingAnimal as TotemAnimal;
    const pendingSig = getTotemSignature(pending);
    const pendingImg = TOTEM_IMAGES[pending];

    const handleAccept = async () => {
      setRevealing(true);
      if (userId) {
        try { await acceptPendingTotem(userId, pending); } catch { /* non-critical */ }
      }
      setTimeout(() => {
        setRevealing(false);
        setJustEvolved(true);
        onTotemUpdate();
      }, 1200);
    };

    return (
      <div className="relative rounded-block overflow-hidden mb-5 shadow-soft"
        style={{ background: 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)' }}>
        {revealing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <div className="w-16 h-16 rounded-full border-[3px] border-gold/30 border-t-gold animate-spin" />
          </div>
        )}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D4AD5A 0%, transparent 70%)' }} />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={14} className="text-gold" />
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gold/70 m-0">
              Évolution
            </p>
          </div>
          <h3 className="font-display text-base font-semibold text-[#F4F1E9] m-0 mb-2">
            Ton profil a évolué
          </h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 opacity-50">
                <img src={img} alt={sig.label} className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] text-white/40 font-semibold truncate">{sig.label}</span>
            </div>
            <span className="text-white/30 text-lg flex-shrink-0">→</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 border-gold/30 shadow-soft">
                <img src={pendingImg} alt={pendingSig.label} className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] text-gold font-bold truncate">{pendingSig.label}</span>
            </div>
          </div>
          <button
            onClick={handleAccept}
            disabled={revealing}
            className="w-full py-3 rounded-[14px] border-none text-[14px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all bg-gold text-white hover:bg-gold/90 shadow-soft disabled:opacity-60"
          >
            <Sparkles size={15} />
            Découvrir mon nouveau totem
          </button>
        </div>
      </div>
    );
  }

  // State 4 / 6: Revealed (normal or just evolved) — show the totem
  const displayAnimal = justEvolved && totem.pendingAnimal ? (totem.pendingAnimal as TotemAnimal) : animal;
  const displaySig = justEvolved && totem.pendingAnimal ? getTotemSignature(displayAnimal) : sig;
  const displayImg = TOTEM_IMAGES[displayAnimal];

  return (
    <div
      className={`relative rounded-block overflow-hidden mb-5 shadow-soft cursor-pointer ${
        justRevealed || justEvolved ? 'animate-fadeInScale' : ''
      }`}
      style={{ background: 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)' }}
      onClick={() => navigate('/assessment/totem')}
    >
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4AD5A 0%, transparent 70%)' }} />
      <div className="p-5 flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-gold/20 shadow-lift">
          <img src={displayImg} alt={displaySig.label} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gold/60 m-0">
            Ton Totem
          </p>
          <h3 className="font-display text-xl font-semibold text-[#F4F1E9] m-0 mt-0.5">
            {displaySig.label}
          </h3>
          <p className="text-[12px] text-white/55 m-0 mt-1 leading-relaxed">
            {displaySig.meaning}
          </p>
        </div>
        <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
      </div>
    </div>
  );
};

export default TotemCard;

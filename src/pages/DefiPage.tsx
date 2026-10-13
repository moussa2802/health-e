import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Users, Crown, Eye, Plus, Clock } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDefiFlag } from '../hooks/useDefiFlag';
import { getProfileProgress } from '../services/evaluationService';
import { getTotemProgress, getTotemSignature, type TotemAnimal } from '../utils/totemAlgorithm';
import type { ScaleResult } from '../types/assessment';

import lionImg from '../assets/totems/lion.jpg';
import loupImg from '../assets/totems/loup.jpg';
import cerfImg from '../assets/totems/cerf.jpg';
import dauphinImg from '../assets/totems/dauphin.jpg';
import tortueImg from '../assets/totems/tortue.jpg';
import hibouImg from '../assets/totems/hibou.jpg';
import aigleImg from '../assets/totems/aigle.jpg';
import elephantImg from '../assets/totems/elephant.jpg';
import panthereImg from '../assets/totems/panthere.jpg';
import renardImg from '../assets/totems/renard.jpg';
import chevalImg from '../assets/totems/cheval.jpg';
import oursImg from '../assets/totems/ours.jpg';

const TOTEM_IMAGES: Record<TotemAnimal, string> = {
  lion: lionImg, loup: loupImg, cerf: cerfImg, dauphin: dauphinImg,
  tortue: tortueImg, hibou: hibouImg, aigle: aigleImg, elephant: elephantImg,
  panthere: panthereImg, renard: renardImg, cheval: chevalImg, ours: oursImg,
};

const STEPS = [
  { icon: <Sparkles size={20} className="text-gold" />, text: 'Tu lances ton défi' },
  { icon: <Users size={20} className="text-gold" />, text: 'Tes proches devinent qui tu es vraiment — même ton totem 🐾' },
  { icon: <Crown size={20} className="text-gold" />, text: 'Tu découvres qui te connaît le mieux 👑' },
];

const DefiPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { defiEnabled, loading: flagLoading } = useDefiFlag();

  const [profileResults, setProfileResults] = useState<Record<string, ScaleResult>>({});
  const [totemData, setTotemData] = useState<{
    animal: string; revealedAt: Date | null;
  } | null>(null);
  const [activeDefis, setActiveDefis] = useState<Array<{ slug: string; titre: string; audience: string; expiresAt: Date }>>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setProfileLoading(false);
      return;
    }
    getProfileProgress(currentUser.id)
      .then(p => {
        setProfileResults(p.scaleResults);
        setTotemData(p.totem ? { animal: p.totem.animal, revealedAt: p.totem.revealedAt } : null);
        setActiveDefis(p.activeDefis);
        setProfileLoading(false);
      })
      .catch(() => setProfileLoading(false));
  }, [isAuthenticated, currentUser?.id]);

  if (!isAuthenticated) {
    return <Navigate to="/patient/access" replace />;
  }

  if (flagLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-gold animate-spin" />
      </div>
    );
  }

  if (!defiEnabled) {
    return <Navigate to="/assessment" replace />;
  }

  const totemProgress = getTotemProgress(profileResults);
  const totemRevealed = !!totemData?.revealedAt;
  const missing = totemProgress.total - totemProgress.completed;

  if (!totemRevealed) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
          <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-0 border-none bg-transparent cursor-pointer text-ink">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-[18px] font-semibold text-ink m-0">Le Défi</h1>
          </div>
        </div>
        <div className="max-w-[600px] mx-auto px-5 py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-soft flex items-center justify-center mx-auto mb-5">
            <Sparkles size={28} className="text-gold" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink m-0 mb-2">
            {missing > 0
              ? `Encore ${missing} test${missing > 1 ? 's' : ''} pour révéler ton totem`
              : "Révèle ton totem d'abord"}
          </h2>
          <p className="text-[14px] text-muted m-0 mb-6">
            Ton totem est la clé pour lancer ton défi. Complète tes évaluations pour le découvrir.
          </p>
          <button
            onClick={() => navigate('/assessment')}
            className="px-6 py-3 rounded-[14px] border-none bg-gold text-white text-[15px] font-bold cursor-pointer shadow-soft"
          >
            Compléter mes tests →
          </button>
        </div>
      </div>
    );
  }

  const animal = totemData!.animal as TotemAnimal;
  const sig = getTotemSignature(animal);
  const img = TOTEM_IMAGES[animal];

  const hasActiveDefis = activeDefis.length > 0;
  const canCreate = activeDefis.length < 3;

  const [reponsesBySlug, setReponsesBySlug] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!hasActiveDefis) return;
    const unsubs = activeDefis.map(ad =>
      onSnapshot(doc(db, 'defis', ad.slug), snap => {
        if (!snap.exists()) return;
        setReponsesBySlug(prev => ({ ...prev, [ad.slug]: snap.data().nbReponses || 0 }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, [hasActiveDefis, activeDefis.map(d => d.slug).join(',')]);

  function formatTimeLeft(expiresAt: Date): string {
    const diff = expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Terminé';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h restantes`;
    const days = Math.floor(hours / 24);
    return `${days}j restant${days > 1 ? 's' : ''}`;
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-0 border-none bg-transparent cursor-pointer text-ink">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-[18px] font-semibold text-ink m-0">Le Défi</h1>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-5 py-6">
        <div className="text-center mb-6">
          <h2 className="font-display text-xl font-semibold text-ink m-0 mb-1">
            Kan moo ma gën a xam ?
          </h2>
          <p className="text-[13px] text-muted m-0">Qui te connaît le mieux ?</p>
        </div>

        <div
          className="rounded-[18px] overflow-hidden mb-6 shadow-soft"
          style={{ background: 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)' }}
        >
          <div className="p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-gold/20">
              <img src={img} alt={sig.label} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gold/60 m-0">
                Ton Totem
              </p>
              <h3 className="font-display text-lg font-semibold text-[#F4F1E9] m-0 mt-0.5">
                {sig.label}
              </h3>
            </div>
          </div>
        </div>

        {hasActiveDefis && (
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted m-0 mb-3">
              Tes défis en cours
            </p>
            <div className="flex flex-col gap-3">
              {activeDefis.map(ad => (
                <div
                  key={ad.slug}
                  className="rounded-[14px] border border-line bg-card p-4 cursor-pointer shadow-soft"
                  onClick={() => navigate(`/defi/${ad.slug}/suivi`)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-display text-[15px] font-semibold text-ink m-0 truncate">
                      {ad.titre || 'Mon défi'}
                    </h4>
                    <span className="text-[11px] text-muted flex items-center gap-1 flex-shrink-0 ml-2">
                      <Clock size={12} />
                      {formatTimeLeft(ad.expiresAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-muted">
                      {(reponsesBySlug[ad.slug] || 0) === 0
                        ? 'Aucune réponse'
                        : `${reponsesBySlug[ad.slug]} réponse${reponsesBySlug[ad.slug] > 1 ? 's' : ''}`}
                    </span>
                    <Eye size={14} className="text-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasActiveDefis && (
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted m-0 mb-4">
              Comment ça marche
            </p>
            <div className="flex flex-col gap-4">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-soft flex items-center justify-center flex-shrink-0">
                    {step.icon}
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-[14px] text-ink m-0 leading-snug font-medium">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/defi/creer')}
          disabled={!canCreate}
          className={`w-full py-3.5 rounded-[14px] border-none text-[15px] font-bold cursor-pointer shadow-soft flex items-center justify-center gap-2 ${
            canCreate
              ? 'bg-gold text-white'
              : 'bg-line text-muted cursor-not-allowed'
          }`}
        >
          {hasActiveDefis ? <Plus size={16} /> : <Sparkles size={16} />}
          {hasActiveDefis ? 'Créer un nouveau défi' : 'Créer mon défi'}
        </button>
        {!canCreate && (
          <p className="text-[12px] text-muted text-center m-0 mt-2">
            Maximum 3 défis actifs simultanément
          </p>
        )}
      </div>
    </div>
  );
};

export default DefiPage;

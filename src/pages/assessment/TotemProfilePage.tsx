import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Stethoscope, Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getProfileProgress } from '../../services/evaluationService';
import { shareResultCard } from '../../utils/shareCard';
import {
  type TotemAnimal,
  getTotemSignature,
  getAnimalDescription,
  classifyTotemDomains,
  composeDrLoMessage,
  getRadianceLevel,
  computeDimensionGauges,
  type DimensionGauge,
} from '../../utils/totemAlgorithm';
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

const GAUGE_ICONS: Record<string, string> = {
  gad7: '🧘', phq9: '☀️', pss10: '🍃', rses: '💎',
  brs: '🔄', ecr_r: '🤝', big_five: '⚖️',
};

const RING_SHORT_LABELS: Record<string, string> = {
  gad7: 'Sérénité', phq9: 'Moral', pss10: 'Calme', rses: 'Estime',
  brs: 'Résilience', ecr_r: 'Sécurité', big_five: 'Stabilité',
};

type GaugeTier = 'force' | 'medium' | 'low';

function getGaugeTier(pct: number): GaugeTier {
  if (pct >= 67) return 'force';
  if (pct >= 34) return 'medium';
  return 'low';
}

const TIER_HEX: Record<GaugeTier, string> = {
  force: '#7A9E8E',
  medium: '#D4AD5A',
  low: '#C48B6A',
};

const TIER_RING_HEX: Record<GaugeTier, string> = {
  force: '#5CE8A0',
  medium: '#F0C050',
  low: '#E8856A',
};

const TIER_BAR_CLASS: Record<GaugeTier, string> = {
  force: 'bg-sage',
  medium: 'bg-[#D4AD5A]',
  low: 'bg-[#C48B6A]',
};

const TIER_TRACK_CLASS: Record<GaugeTier, string> = {
  force: 'bg-sage/15',
  medium: 'bg-[#D4AD5A]/15',
  low: 'bg-[#C48B6A]/15',
};

const TIER_TEXT_CLASS: Record<GaugeTier, string> = {
  force: 'text-sage',
  medium: 'text-[#D4AD5A]',
  low: 'text-[#C48B6A]',
};

const RING_SIZE = 52;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ProgressRing: React.FC<{ gauge: DimensionGauge }> = ({ gauge }) => {
  const offset = RING_CIRCUMFERENCE * (1 - gauge.fillPercent / 100);
  const fillColor = TIER_RING_HEX[getGaugeTier(gauge.fillPercent)];

  return (
    <div className="flex flex-col items-center" style={{ width: 62 }}>
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
            fill="none" stroke={fillColor} strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[16px] leading-none">
          {GAUGE_ICONS[gauge.scaleId] ?? '📊'}
        </span>
      </div>
      <span className="text-[9px] text-white/60 mt-1.5 text-center font-medium leading-tight">
        {RING_SHORT_LABELS[gauge.scaleId] ?? gauge.label}
      </span>
    </div>
  );
};

const GaugeRow: React.FC<{ gauge: DimensionGauge }> = ({ gauge }) => {
  const [expanded, setExpanded] = useState(false);
  const tier = getGaugeTier(gauge.fillPercent);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left bg-card border border-line rounded-[14px] px-4 py-3.5 transition-all hover:shadow-soft"
    >
      <div className="flex items-center gap-3">
        <span className="text-[18px] flex-shrink-0 w-7 text-center">
          {GAUGE_ICONS[gauge.scaleId] ?? '📊'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-semibold text-ink">{gauge.label}</span>
            <span className={`text-[11px] font-bold ${TIER_TEXT_CLASS[tier]}`}>
              {gauge.fillPercent}%
            </span>
          </div>
          <div className={`h-[6px] rounded-full ${TIER_TRACK_CLASS[tier]} overflow-hidden`}>
            <div
              className={`h-full rounded-full ${TIER_BAR_CLASS[tier]} transition-all duration-700 ease-out`}
              style={{ width: `${gauge.fillPercent}%` }}
            />
          </div>
        </div>
        <span className={`text-[14px] text-muted/50 transition-transform flex-shrink-0 ml-1 ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </div>
      {expanded && (
        <p className="text-[13px] text-muted mt-2.5 ml-10 leading-relaxed m-0">
          {tier === 'force'
            ? gauge.forceDescription
            : gauge.growDescription
          }
        </p>
      )}
    </button>
  );
};

const TotemProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  const [animal, setAnimal] = useState<TotemAnimal | null>(null);
  const [profileResults, setProfileResults] = useState<Record<string, ScaleResult>>({});
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [lastImprovement, setLastImprovement] = useState<{ scaleId: string; domainLabel: string; from: string; to: string; at: Date } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setLoading(false);
      return;
    }
    getProfileProgress(currentUser.id)
      .then(p => {
        setProfileResults(p.scaleResults);
        if (p.totem?.animal) {
          setAnimal(p.totem.animal as TotemAnimal);
        }
        if (p.totem?.lastImprovement) {
          const age = Date.now() - p.totem.lastImprovement.at.getTime();
          if (age < 30000) setLastImprovement(p.totem.lastImprovement);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isAuthenticated, currentUser?.id]);

  const handleShare = async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      await shareResultCard(cardRef.current, 'totem');
    } catch { /* user cancelled or unsupported */ }
    setSharing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-10 h-10 rounded-full border-[3px] border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="min-h-screen bg-paper px-4 pt-12 text-center">
        <p className="text-muted text-[15px]">Ton totem n'est pas encore révélé.</p>
        <button
          onClick={() => navigate('/assessment')}
          className="mt-4 text-sage font-semibold text-[14px] bg-transparent border-none cursor-pointer"
        >
          Retour aux tests
        </button>
      </div>
    );
  }

  const sig = getTotemSignature(animal);
  const description = getAnimalDescription(animal);
  const { forces, grows } = classifyTotemDomains(profileResults);
  const radiance = getRadianceLevel(forces, grows);
  const drLoMessage = composeDrLoMessage(animal, forces, grows, radiance.level);
  const gauges = computeDimensionGauges(profileResults);

  const row1 = gauges.slice(0, 4);
  const row2 = gauges.slice(4);

  return (
    <div className="min-h-screen bg-paper pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-paper/80 backdrop-blur-md border-b border-line">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center">
          <button
            onClick={() => navigate('/assessment')}
            className="flex items-center gap-1 text-sage text-[14px] font-medium bg-transparent border-none cursor-pointer p-0"
          >
            <ArrowLeft size={18} />
            Retour
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* Reward toast */}
        {lastImprovement && (
          <div className="mt-4 bg-gold/10 border border-gold/25 rounded-[14px] px-4 py-3 flex items-center gap-3 animate-fadeIn">
            <Sparkles size={18} className="text-gold flex-shrink-0" />
            <p className="text-[13px] text-ink m-0">
              Ton totem rayonne davantage — <strong>{lastImprovement.domainLabel}</strong> est devenu une force
            </p>
          </div>
        )}

        {/* Block 1 — Shareable totem card with progress rings */}
        <div
          ref={cardRef}
          className="relative mt-4 rounded-[20px] overflow-hidden shadow-lift"
          style={{ background: 'linear-gradient(160deg, #1B3A3A 0%, #2A4F4F 50%, #1B3A3A 100%)' }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, #D4AD5A 0%, transparent 60%)' }} />
          <div className="relative flex flex-col items-center pt-8 px-6">
            <div className="w-40 h-40 rounded-[28px] overflow-hidden border-[3px] border-gold/25 shadow-lift">
              <img src={TOTEM_IMAGES[animal]} alt={sig.label} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2 mb-1 mt-5">
              <Sparkles size={14} className="text-gold" />
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gold/70 m-0">
                Ton Totem
              </p>
            </div>
            <h1 className="font-display text-[28px] font-bold text-white m-0 text-center">
              {sig.label}
            </h1>
            <p className="text-[13px] text-white/60 m-0 mt-1 text-center">
              {sig.meaning}
            </p>

            {/* Progress rings */}
            {gauges.length > 0 && (
              <div className="mt-6 mb-2 w-full">
                <div className="flex justify-center gap-2">
                  {row1.map(g => <ProgressRing key={g.scaleId} gauge={g} />)}
                </div>
                {row2.length > 0 && (
                  <div className="flex justify-center gap-2 mt-3">
                    {row2.map(g => <ProgressRing key={g.scaleId} gauge={g} />)}
                  </div>
                )}
              </div>
            )}

            {/* Branding */}
            <p className="text-[9px] text-white/30 m-0 mt-2 mb-4 self-end">
              Health-e
            </p>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={sharing}
          className="mt-3 w-full py-3 rounded-[14px] border border-sage/25 bg-sage/10 text-sage text-[14px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all hover:bg-sage/20 disabled:opacity-50"
        >
          <Share2 size={16} />
          {sharing ? 'Préparation…' : 'Partager mon totem'}
        </button>

        {/* Block 2 — "Qui tu es" */}
        <div className="mt-6 bg-card border border-line rounded-[16px] p-5 shadow-soft">
          <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-sage m-0 mb-3">
            Qui tu es
          </h2>
          <p className="text-[14px] text-ink leading-relaxed m-0">
            {description}
          </p>
        </div>

        {/* Block 3 — Dimension gauges */}
        {gauges.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-ink/70 m-0">
                Ton profil psychologique
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {gauges.map(g => (
                <GaugeRow key={g.scaleId} gauge={g} />
              ))}
            </div>
          </div>
        )}

        {/* Block 4 — Dr Lô message */}
        <div className="mt-6 bg-card border border-line rounded-[16px] p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
              <Stethoscope size={16} className="text-accent" />
            </div>
            <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-accent m-0">
              Le mot de Dr Lô
            </h2>
          </div>
          <p className="text-[14px] text-ink leading-relaxed m-0 italic">
            « {drLoMessage} »
          </p>
        </div>
      </div>
    </div>
  );
};

export default TotemProfilePage;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BatteryCharging, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Heart, Share2, Sparkles, Target, Users, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDefiFlag } from '../../hooks/useDefiFlag';
import { acceptPendingTotem, getProfileProgress, revealTotem, saveTotem } from '../../services/evaluationService';
import { loadProgramme } from '../../services/programmeService';
import { acceptTotemDefi, defiActive as isDefiActive, loadTotemDefi, type TotemDefi } from '../../services/totemService';
import { getArchetype, getArchetypeId } from '../../utils/profileArchetype';
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
  nearestTotems,
  computeTotem,
  loveMatches,
  totemWords,
  totemMeaning,
} from '../../utils/totemAlgorithm';
import { TOTEM_GUIDE, GAUGE_TO_AXIS, TOTEM_ROUTINES } from '../../data/totemGuide';
import { resolveGender } from '../../utils/gender';
import { getMoment, PALETTES } from '../../utils/drloMoment';
import type { ScaleResult } from '../../types/assessment';

import { TOTEM_IMAGES } from '../../data/totemImages';


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

const TIER_RING_HEX: Record<GaugeTier, string> = {
  force: '#5CE8A0',
  medium: '#F0C050',
  low: '#E8856A',
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


// ── Thème chaud sombre (comme l'accueil et Mon espace) ───────────────────────
const C = {
  text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', title: '#FBF5EA',
  sage: '#9DBFAF', line: 'rgba(255,255,255,.12)', glass: 'rgba(255,255,255,.05)', ink: '#1C140D', gold: '#E9C88F',
};
const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${C.line}`, background: C.glass, padding: 16 };
const kicker = (color: string): React.CSSProperties => ({ margin: 0, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, color });

const GaugeRow: React.FC<{ gauge: DimensionGauge; genre: 'homme' | 'femme' }> = ({ gauge, genre }) => {
  const [expanded, setExpanded] = useState(false);
  const tier = getGaugeTier(gauge.fillPercent);
  const color = TIER_RING_HEX[tier];
  return (
    <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
      style={{ ...card, padding: '12px 14px', width: '100%', textAlign: 'left', color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 }} aria-hidden="true">{GAUGE_ICONS[gauge.scaleId] ?? '•'}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{RING_SHORT_LABELS[gauge.scaleId] ?? gauge.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color }}>{gauge.fillPercent}%</span>
          </span>
          <span style={{ display: 'block', height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${gauge.fillPercent}%`, borderRadius: 3, background: color, transition: 'width .7s ease-out' }} />
          </span>
        </span>
        <ChevronDown size={16} color={C.faint} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </span>
      {expanded && (
        <span style={{ display: 'block', margin: '10px 0 0 38px', fontSize: 13.5, lineHeight: 1.55, color: C.soft }}>
          {resolveGender(tier === 'force' ? gauge.forceDescription : gauge.growDescription, genre)}
        </span>
      )}
    </button>
  );
};

const TotemProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { defiEnabled } = useDefiFlag();
  const cardRef = useRef<HTMLDivElement>(null);
  const palette = PALETTES[getMoment()];

  const [animal, setAnimal] = useState<TotemAnimal | null>(null);
  const [profileResults, setProfileResults] = useState<Record<string, ScaleResult>>({});
  const [genre, setGenre] = useState<'homme' | 'femme'>('homme');
  const [loading, setLoading] = useState(true);
  /** Totem calculé mais pas encore révélé : on garde le moment de la révélation */
  const [hidden, setHidden] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [lastImprovement, setLastImprovement] = useState<{ scaleId: string; domainLabel: string; from: string; to: string; at: Date } | null>(null);
  // Le défi de la semaine : gardé dans le compte, pour 7 jours
  const [defi, setDefi] = useState<TotemDefi | null>(null);
  /** Le totem a évolué (tests refaits) : on propose de découvrir le nouveau */
  const [pending, setPending] = useState<TotemAnimal | null>(null);
  const [evolving, setEvolving] = useState(false);
  const [evolvedFrom, setEvolvedFrom] = useState<TotemAnimal | null>(null);
  const [progActive, setProgActive] = useState(false);
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    let cancelled = false;
    loadProgramme(currentUser.id).then(p => { if (!cancelled) setProgActive(!!p && p.status === 'active' && !p.result); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, currentUser?.id]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { setLoading(false); return; }
    getProfileProgress(currentUser.id)
      .then(p => {
        setProfileResults(p.scaleResults);
        if (p.totem?.animal) {
          setAnimal(p.totem.animal as TotemAnimal);
          setHidden(!p.totem.revealedAt);
          if (p.totem.revealedAt && p.totem.pendingAnimal && p.totem.pendingAnimal !== p.totem.animal) setPending(p.totem.pendingAnimal as TotemAnimal);
        } else {
          // Les 7 tests sont faits mais le totem n'a jamais été calculé (on arrive de Mon espace)
          const computed = computeTotem(p.scaleResults ?? {});
          if (computed) {
            setAnimal(computed);
            setHidden(true);
            const arch = getArchetypeId(getArchetype(p.scaleResults ?? {}));
            saveTotem(currentUser.id, computed, arch ?? undefined).catch(() => {});
          }
        }
        const g = p.defiGenre || p.onboardingProfile?.genre;
        if (g === 'femme' || g === 'feminin') setGenre('femme');
        if (p.totem?.lastImprovement) {
          const age = Date.now() - p.totem.lastImprovement.at.getTime();
          if (age < 30000) setLastImprovement(p.totem.lastImprovement);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isAuthenticated, currentUser?.id]);
  useEffect(() => {
    if (currentUser) loadTotemDefi(currentUser.id).then(setDefi).catch(() => {});
  }, [currentUser?.id]);

  const handleShare = async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try { await shareResultCard(cardRef.current, 'totem'); } catch { /* annulé ou non pris en charge */ }
    setSharing(false);
  };

  const page: React.CSSProperties = { minHeight: '100svh', background: palette.bg, color: C.text, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' };
  const primary: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 12, border: 0, background: palette.primary, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' };
  const ghost: React.CSSProperties = { ...primary, background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: C.text, fontWeight: 600 };
  const back = () => navigate('/espace');

  if (loading) {
    return <div style={{ ...page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-white/70 animate-spin" /></div>;
  }

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: 6, height: 56 }}>
      <button onClick={back} aria-label="Revenir à mon espace" style={{ width: 44, height: 44, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronLeft size={24} aria-hidden="true" />
      </button>
      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: C.title }}>Mon totem</span>
    </header>
  );

  if (!animal) {
    return (
      <div style={page}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px' }}>
          {header}
          <p style={{ marginTop: 40, textAlign: 'center', color: C.soft, fontSize: 15 }}>Ton totem n'est pas encore révélé.</p>
          <div style={{ textAlign: 'center' }}><button onClick={back} style={{ ...ghost, marginTop: 12 }}>Revenir à mon espace</button></div>
        </div>
      </div>
    );
  }

  if (hidden) {
    const reveal = async () => {
      if (revealing || !currentUser) return;
      setRevealing(true);
      try { await revealTotem(currentUser.id); } catch { /* on révèle quand même à l'écran */ }
      window.setTimeout(() => { setRevealing(false); setHidden(false); setJustRevealed(true); window.scrollTo(0, 0); }, 1400);
    };
    return (
      <div style={page}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ alignSelf: 'stretch' }}>{header}</div>
          <div className={revealing ? 'drl-joy-glow' : undefined} style={{ marginTop: 40, width: 180, height: 180, borderRadius: 32, overflow: 'hidden', border: '3px solid rgba(233,200,143,.35)', background: '#1B3A3A' }}>
            <img src={TOTEM_IMAGES[animal]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: revealing ? 'blur(6px) brightness(.8)' : 'blur(22px) brightness(.35)', transform: revealing ? 'scale(1.05)' : 'scale(1.2)', transition: 'filter 1.3s ease, transform 1.3s ease' }} />
          </div>
          <p style={{ ...kicker(C.gold), marginTop: 24 }}>Ton totem est prêt</p>
          <h1 style={{ margin: '8px 0 0', fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: C.title }}>Quel animal te ressemble ?</h1>
          <p style={{ margin: '10px 0 22px', fontSize: 15, lineHeight: 1.55, color: C.soft, maxWidth: 340 }}>
            Tes 7 tests ont dessiné ton tempérament. Un animal sur 12 te représente : ta force, ton piège, ta façon d'aimer.
          </p>
          <button onClick={reveal} disabled={revealing} style={{ ...primary, minHeight: 52, padding: '0 26px', fontSize: 16 }}>
            <Sparkles size={18} aria-hidden="true" />{revealing ? 'Révélation…' : 'Révéler mon totem'}
          </button>
        </div>
      </div>
    );
  }

  const g = (t: string) => resolveGender(t, genre);
  const sig = getTotemSignature(animal);
  const guide = TOTEM_GUIDE[animal];
  const description = getAnimalDescription(animal, genre);
  const { forces, grows } = classifyTotemDomains(profileResults);
  const radiance = getRadianceLevel(forces, grows);
  const drLoMessage = composeDrLoMessage(animal, forces, grows, radiance.level);
  const gauges = computeDimensionGauges(profileResults);
  const row1 = gauges.slice(0, 4);
  const row2 = gauges.slice(4);
  const lowest = [...gauges].sort((a, b) => a.fillPercent - b.fillPercent)[0];
  const lowAxis = lowest ? GAUGE_TO_AXIS[lowest.scaleId] : null;
  const near = nearestTotems(animal, 2);
  const love = loveMatches(animal);
  const w = totemWords(animal);
  const defiActive = isDefiActive(defi, animal);

  const daily: { icon: React.ElementType; title: string; text: string; color: string }[] = [
    { icon: Sparkles, title: 'Ta force au quotidien', text: guide.force, color: C.gold },
    { icon: Zap, title: 'Ton piège quand ça chauffe', text: guide.piege, color: '#E8A08F' },
    { icon: BatteryCharging, title: 'Ce qui te recharge', text: guide.recharge, color: C.sage },
    { icon: Heart, title: 'En amour et en amitié', text: guide.lien, color: '#E9A7B8' },
  ];

  return (
    <div style={page}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {header}

        {pending && (
          <div className="drl-in" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12, borderColor: 'rgba(233,200,143,.45)', background: 'rgba(233,200,143,.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={TOTEM_IMAGES[pending]} alt="" className={evolving ? 'drl-joy-glow' : undefined}
                style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0, filter: evolving ? 'none' : 'blur(8px) brightness(.6)', transition: 'filter 1.2s ease' }} />
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>
                <b>Ton totem a évolué.</b> Tes derniers tests dessinent un tempérament qui a bougé : un nouvel animal t'attend.
              </p>
            </div>
            <button disabled={evolving} style={{ ...primary, alignSelf: 'flex-start' }} onClick={async () => {
              if (!currentUser || evolving) return;
              setEvolving(true);
              const arch = getArchetypeId(getArchetype(profileResults));
              try { await acceptPendingTotem(currentUser.id, pending, arch ?? undefined); } catch { /* affiché quand même */ }
              window.setTimeout(() => { setEvolvedFrom(animal); setAnimal(pending); setPending(null); setEvolving(false); window.scrollTo(0, 0); }, 1300);
            }}>
              <Sparkles size={16} aria-hidden="true" />{evolving ? 'Révélation…' : 'Découvrir mon nouveau totem'}
            </button>
          </div>
        )}

        {evolvedFrom && (
          <div className="drl-in" style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', borderColor: 'rgba(233,200,143,.4)', background: 'rgba(233,200,143,.10)' }}>
            <img src="/dr-lo.png" alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Tu es passé{genre === 'femme' ? 'e' : ''} {totemWords(evolvedFrom).du} à {totemWords(animal).un} : c'est le chemin que tu as fait. Relis ce que ton nouveau totem dit de toi.</p>
          </div>
        )}

        {justRevealed && (
          <div className="drl-in" style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', borderColor: 'rgba(233,200,143,.4)', background: 'rgba(233,200,143,.10)' }}>
            <img src="/dr-lo.png" alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Voici {totemWords(animal).ton} ! Descends : je t'explique ce que ton totem dit de toi au quotidien, en amour, et comment le faire rayonner.</p>
          </div>
        )}

        {lastImprovement && (
          <div className="drl-in" style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', borderColor: 'rgba(233,200,143,.4)', background: 'rgba(233,200,143,.10)' }}>
            <Sparkles size={18} color={C.gold} aria-hidden="true" />
            <p style={{ margin: 0, fontSize: 13.5 }}>Ton totem rayonne davantage : <b>{lastImprovement.domainLabel}</b> est devenu une force.</p>
          </div>
        )}

        {/* La carte à partager (inchangée : c'est elle qui circule sur les réseaux) */}
        <div ref={cardRef} className="relative rounded-[20px] overflow-hidden" style={{ background: 'linear-gradient(160deg, #1B3A3A 0%, #2A4F4F 50%, #1B3A3A 100%)', boxShadow: '0 18px 40px rgba(0,0,0,.4)' }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, #D4AD5A 0%, transparent 60%)' }} />
          <div className="relative flex flex-col items-center pt-8 px-6">
            <div className="w-40 h-40 rounded-[28px] overflow-hidden border-[3px] border-gold/25">
              <img src={TOTEM_IMAGES[animal]} alt={sig.label} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2 mb-1 mt-5">
              <Sparkles size={14} className="text-gold" />
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gold/70 m-0">Ton Totem</p>
            </div>
            <h1 className="font-display text-[28px] font-bold text-white m-0 text-center">{sig.label}</h1>
            <p className="text-[13px] text-white/60 m-0 mt-1 text-center">{totemMeaning(animal, genre)}</p>
            {gauges.length > 0 && (
              <div className="mt-6 mb-2 w-full">
                <div className="flex justify-center gap-2">{row1.map(x => <ProgressRing key={x.scaleId} gauge={x} />)}</div>
                {row2.length > 0 && <div className="flex justify-center gap-2 mt-3">{row2.map(x => <ProgressRing key={x.scaleId} gauge={x} />)}</div>}
              </div>
            )}
            <p className="text-[9px] text-white/30 m-0 mt-2 mb-4 self-end">Health-e</p>
          </div>
        </div>
        <button onClick={handleShare} disabled={sharing} style={{ ...ghost, width: '100%', opacity: sharing ? 0.6 : 1 }}>
          <Share2 size={16} aria-hidden="true" />{sharing ? 'Préparation…' : 'Partager mon totem'}
        </button>

        {/* Qui tu es */}
        <section style={card}>
          <p style={kicker(palette.accent)}>Ce que {w.ton} dit de toi</p>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: C.soft }}>{description}</p>
        </section>

        {/* Au quotidien */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ margin: '4px 2px 0', fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: C.title }}>Ton totem au quotidien</h2>
          {daily.map(d => (
            <div key={d.title} style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <d.icon size={18} color={d.color} aria-hidden="true" />
              </span>
              <span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{d.title}</span>
                <span style={{ display: 'block', marginTop: 4, fontSize: 14, lineHeight: 1.55, color: C.soft }}>{g(d.text)}</span>
              </span>
            </div>
          ))}
        </section>

        {/* Le défi de la semaine */}
        <section style={{ ...card, borderColor: 'rgba(242,182,109,.35)', background: 'rgba(242,182,109,.07)' }}>
          <p style={{ ...kicker(palette.accent), display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} aria-hidden="true" />Le défi {w.du} cette semaine</p>
          <p style={{ margin: '8px 0 12px', fontSize: 15, lineHeight: 1.55, color: C.title, fontWeight: 600 }}>{g(guide.defi)}</p>
          {defiActive ? (
            <p style={{ margin: 0, fontSize: 13, color: C.sage }}>Défi relevé pour cette semaine. Je te le rappelle sur l'accueil.</p>
          ) : (
            <button onClick={() => { if (currentUser) acceptTotemDefi(currentUser.id, animal).then(setDefi).catch(() => {}); }} style={primary}>Je relève le défi</button>
          )}
        </section>

        {/* Faire rayonner son totem */}
        {lowest && lowest.fillPercent < 67 && (
          <section style={card}>
            <p style={kicker(C.gold)}>Ce qui ferait rayonner ton totem</p>
            <p style={{ margin: '8px 0 12px', fontSize: 14.5, lineHeight: 1.55, color: C.soft }}>
              Ta jauge « {RING_SHORT_LABELS[lowest.scaleId] ?? lowest.label} » est la plus basse ({lowest.fillPercent} %). C'est elle qui ferait le plus briller {w.ton}. Ton totem évolue avec toi : quand tu refais le test et que ça a bougé, il rayonne davantage.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lowAxis && <button onClick={() => navigate('/', { state: { programme: true } })} style={primary}>{progActive ? 'Voir mon programme' : 'Un programme pour ça'}</button>}
              <button onClick={() => navigate('/', { state: { prescribe: lowest.scaleId } })} style={lowAxis ? ghost : primary}>Refaire ce test avec Dr Lô</button>
            </div>
          </section>
        )}

        {/* Ses routines, à ajouter au programme */}
        <section style={card}>
          <p style={{ ...kicker(palette.accent), display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardCheck size={14} aria-hidden="true" />Les routines {w.du}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '10px 0 12px' }}>
            {TOTEM_ROUTINES[animal].map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 10 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: palette.accent, marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 14, lineHeight: 1.5, color: C.soft }}><b style={{ color: C.text }}>{r.title}</b> · {g(r.text)}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/', { state: { programme: true } })} style={primary}>Les ajouter à mon programme</button>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: C.faint }}>Tu choisis lesquelles garder, et tu peux les retirer à tout moment.</p>
        </section>

        {/* Les jauges */}
        {gauges.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ margin: '4px 2px 2px', fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: C.title }}>Tes 7 jauges</h2>
            <p style={{ margin: '0 2px 4px', fontSize: 12.5, color: C.faint }}>Vert : une force · ambre : moyen · orange : à faire grandir. Touche une jauge pour comprendre.</p>
            {gauges.map(x => <GaugeRow key={x.scaleId} gauge={x} genre={genre} />)}
          </section>
        )}

        {/* En amour */}
        <section style={{ ...card, borderColor: 'rgba(233,167,184,.35)', background: 'rgba(233,167,184,.06)' }}>
          <p style={{ ...kicker('#E9A7B8'), display: 'flex', alignItems: 'center', gap: 6 }}><Heart size={14} aria-hidden="true" />En amour, tu t'accordes le mieux avec</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '12px 0' }}>
            {love.best.map(m => (
              <div key={m.animal} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={TOTEM_IMAGES[m.animal]} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                <span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{getTotemSignature(m.animal).label}</span>
                  <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.45, color: C.soft }}>{(t => t.charAt(0).toUpperCase() + t.slice(1))(m.reasons.join(', '))}.</span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,.04)' }}>
            <img src={TOTEM_IMAGES[love.effort.animal]} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0, opacity: 0.85 }} />
            <span style={{ fontSize: 13.5, lineHeight: 1.45, color: C.soft }}>
              Avec {totemWords(love.effort.animal).un}, l'amour demande plus d'efforts : {love.effort.reasons.join(', ')}. Pas impossible, il faut juste en parler.
            </span>
          </div>
          <p style={{ margin: '12px 0 12px', fontSize: 12.5, color: C.faint }}>C'est une tendance d'après les tempéraments, pas une règle. La vraie réponse, c'est le test de compatibilité avec la personne.</p>
          <button onClick={() => navigate('/', { state: { flow: 'compat' } })} style={primary}>Tester avec mon/ma partenaire</button>
        </section>

        {/* Les totems proches */}
        <section style={card}>
          <p style={{ ...kicker(C.sage), display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} aria-hidden="true" />Tes totems proches</p>
          <div style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
            {near.map(a => (
              <div key={a} style={{ flex: 1, textAlign: 'center' }}>
                <img src={TOTEM_IMAGES[a]} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover' }} />
                <span style={{ display: 'block', marginTop: 6, fontSize: 13.5, fontWeight: 700 }}>{getTotemSignature(a).label}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.soft }}>
            Ce sont tes « jumeaux » de tempérament : avec {near.map(a => totemWords(a).un).join(' ou ')}, en amitié comme au travail, tu te comprends sans beaucoup parler.
          </p>
        </section>

        {/* Le mot de Dr Lô */}
        <section style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <img src="/dr-lo.png" alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
          <span>
            <span style={kicker(palette.accent)}>Le mot de Dr Lô</span>
            <span style={{ display: 'block', marginTop: 6, fontSize: 14.5, lineHeight: 1.6, color: C.soft, fontStyle: 'italic' }}>« {drLoMessage} »</span>
          </span>
        </section>

        {defiEnabled && (
          <button onClick={() => navigate('/', { state: { flow: 'defi' } })}
            style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: C.text, textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(233,200,143,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={18} color={C.gold} aria-hidden="true" />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Tes proches auraient-ils deviné ton totem ?</span>
              <span style={{ display: 'block', fontSize: 12.5, color: C.faint, marginTop: 2 }}>Kan moo ma gën a xam ? Lance ton Défi</span>
            </span>
            <ChevronRight size={16} color={C.faint} aria-hidden="true" />
          </button>
        )}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.faint }}>Pas de diagnostic : ton totem décrit ton tempérament, il évolue avec toi.</p>
      </div>
    </div>
  );
};

export default TotemProfilePage;

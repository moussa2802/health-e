import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BatteryCharging, ChevronDown, ChevronRight, ClipboardCheck, Gauge, Gem, Heart, HeartHandshake, Leaf, RefreshCw, Scale, Share2, Sparkles, Sun, Target, Users, Wind, Zap } from 'lucide-react';
import DrLoShell, { DC } from '../../components/accueil/DrLoShell';
import Btn from '../../components/ui/Btn';
import Fold from '../../components/ui/Fold';
import { COLOR, FONT } from '../../design/charte';
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


import CompanionMark from '../../components/accueil/CompanionMark';
/** Icônes au trait (charte : pas d'emoji dans l'interface). */
const GAUGE_ICONS: Record<string, React.ElementType> = {
  gad7: Wind, phq9: Sun, pss10: Leaf, rses: Gem,
  brs: RefreshCw, ecr_r: HeartHandshake, big_five: Scale,
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
  force: COLOR.ok,
  medium: '#F2B66D',
  low: COLOR.attention,
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
        <span className="absolute inset-0 flex items-center justify-center" style={{ color: fillColor }}>
          {React.createElement(GAUGE_ICONS[gauge.scaleId] ?? Gauge, { size: 18, 'aria-hidden': true })}
        </span>
      </div>
      <span className="text-[13px] text-white/60 mt-1.5 text-center font-medium leading-tight">
        {RING_SHORT_LABELS[gauge.scaleId] ?? gauge.label}
      </span>
    </div>
  );
};


// ── Thème chaud sombre (comme l'accueil et Mon espace) ───────────────────────
const C = DC;
const card: React.CSSProperties = { borderRadius: 20, border: `1px solid ${C.line}`, background: C.glass, padding: 16 };
const kicker = (color: string): React.CSSProperties => ({ margin: 0, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, color });

const GaugeRow: React.FC<{ gauge: DimensionGauge; genre: 'homme' | 'femme' }> = ({ gauge, genre }) => {
  const [expanded, setExpanded] = useState(false);
  const tier = getGaugeTier(gauge.fillPercent);
  const color = TIER_RING_HEX[tier];
  return (
    <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
      style={{ ...card, padding: '12px 14px', width: '100%', textAlign: 'left', color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 26, display: 'flex', justifyContent: 'center', flexShrink: 0, color }} aria-hidden="true">{React.createElement(GAUGE_ICONS[gauge.scaleId] ?? Gauge, { size: 18 })}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{RING_SHORT_LABELS[gauge.scaleId] ?? gauge.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{gauge.fillPercent}%</span>
          </span>
          <span style={{ display: 'block', height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${gauge.fillPercent}%`, borderRadius: 3, background: color, transition: 'width .7s ease-out' }} />
          </span>
        </span>
        <ChevronDown size={16} color={C.faint} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </span>
      {expanded && (
        <span style={{ display: 'block', margin: '10px 0 0 38px', fontSize: 15, lineHeight: 1.55, color: C.soft }}>
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
  /** L'animal intérieur a évolué (tests refaits) : on propose de découvrir le nouveau */
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
          // Les 7 tests sont faits mais l'animal intérieur n'a jamais été calculé (on arrive de Mon espace)
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

  const back = () => navigate('/espace');
  const backTo = { to: '/espace', label: 'Revenir à mon espace' };
  const titleRow = (
    <h1 style={{ margin: '18px 0 0', fontFamily: FONT.display, fontSize: 26, fontWeight: 600, color: C.title }}>Mon animal intérieur</h1>
  );

  if (loading) {
    return <DrLoShell back={backTo} genre={genre} palette={palette}><div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}><div className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-white/70 animate-spin" /></div></DrLoShell>;
  }

  if (!animal) {
    return (
      <DrLoShell back={backTo} genre={genre} palette={palette}>
        {titleRow}
        <p style={{ marginTop: 24, color: C.soft, fontSize: 15 }}>Ton animal intérieur n'est pas encore révélé. Il apparaît après tes 7 tests psychologiques.</p>
        <Btn variant="secondary" onClick={back} style={{ marginTop: 12 }}>Revenir à mon espace</Btn>
      </DrLoShell>
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
      <DrLoShell back={backTo} genre={genre} palette={palette}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className={revealing ? 'drl-joy-glow' : undefined} style={{ marginTop: 40, width: 180, height: 180, borderRadius: 32, overflow: 'hidden', border: '3px solid rgba(233,200,143,.35)', background: '#2A1E14' }}>
            <img src={TOTEM_IMAGES[animal]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: revealing ? 'blur(6px) brightness(.8)' : 'blur(22px) brightness(.35)', transform: revealing ? 'scale(1.05)' : 'scale(1.2)', transition: 'filter 1.3s ease, transform 1.3s ease' }} />
          </div>
          <p style={{ ...kicker(C.gold), marginTop: 24 }}>Ton animal intérieur est prêt</p>
          <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 26, fontWeight: 600, color: C.title }}>Quel animal te ressemble ?</h1>
          <p style={{ margin: '10px 0 22px', fontSize: 15, lineHeight: 1.55, color: C.soft, maxWidth: 340 }}>
            Tes 7 tests ont dessiné ton tempérament. Un animal sur 12 te représente : ta force, ton piège, ta façon d'aimer.
          </p>
          <Btn onClick={reveal} disabled={revealing} icon={<Sparkles size={18} aria-hidden="true" />}>{revealing ? 'Révélation…' : 'Révéler mon animal intérieur'}</Btn>
        </div>
      </DrLoShell>
    );
  }

  const g = (t: string) => resolveGender(t, genre);
  const sig = getTotemSignature(animal);
  const guide = TOTEM_GUIDE[animal];
  const description = getAnimalDescription(animal, genre);
  const archetype = getArchetype(profileResults);
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
  const nForces = gauges.filter(x => getGaugeTier(x.fillPercent) === 'force').length;

  const daily: { icon: React.ElementType; title: string; text: string; color: string }[] = [
    { icon: Sparkles, title: 'Ta force au quotidien', text: guide.force, color: C.gold },
    { icon: Zap, title: 'Ton piège quand ça chauffe', text: guide.piege, color: C.social },
    { icon: BatteryCharging, title: 'Ce qui te recharge', text: guide.recharge, color: C.sage },
    { icon: Heart, title: 'En amour et en amitié', text: guide.lien, color: C.intime },
  ];
  const note = (children: React.ReactNode) => (
    <div className="drl-in" style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', borderColor: 'rgba(233,200,143,.4)', background: 'rgba(233,200,143,.10)' }}>
      <CompanionMark size={36} />
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{children}</p>
    </div>
  );

  return (
    <DrLoShell back={backTo} genre={genre} palette={palette}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        {pending && (
          <div className="drl-in" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12, borderColor: 'rgba(233,200,143,.45)', background: 'rgba(233,200,143,.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={TOTEM_IMAGES[pending]} alt="" className={evolving ? 'drl-joy-glow' : undefined}
                style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0, filter: evolving ? 'none' : 'blur(8px) brightness(.6)', transition: 'filter 1.2s ease' }} />
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
                <b>Ton animal intérieur a évolué.</b> Tes derniers tests dessinent un tempérament qui a bougé : un nouvel animal t'attend.
              </p>
            </div>
            <Btn disabled={evolving} style={{ alignSelf: 'flex-start' }} icon={<Sparkles size={16} aria-hidden="true" />} onClick={async () => {
              if (!currentUser || evolving) return;
              setEvolving(true);
              const arch = getArchetypeId(getArchetype(profileResults));
              try { await acceptPendingTotem(currentUser.id, pending, arch ?? undefined); } catch { /* affiché quand même */ }
              window.setTimeout(() => { setEvolvedFrom(animal); setAnimal(pending); setPending(null); setEvolving(false); window.scrollTo(0, 0); }, 1300);
            }}>
              {evolving ? 'Révélation…' : 'Découvrir mon nouveau totem'}
            </Btn>
          </div>
        )}
        {evolvedFrom && note(<>Tu es passé{genre === 'femme' ? 'e' : ''} {totemWords(evolvedFrom).du} à {totemWords(animal).un} : c'est le chemin que tu as fait. Relis ce que ton nouveau totem dit de toi.</>)}
        {justRevealed && note(<>Voici {totemWords(animal).ton} ! En dessous, je t'explique ce qu'il dit de toi au quotidien, en amour, et comment le faire rayonner.</>)}
        {lastImprovement && (
          <div className="drl-in" style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', borderColor: 'rgba(233,200,143,.4)', background: 'rgba(233,200,143,.10)' }}>
            <Sparkles size={18} color={C.gold} aria-hidden="true" />
            <p style={{ margin: 0, fontSize: 15 }}>Ton animal intérieur rayonne davantage : <b>{lastImprovement.domainLabel}</b> est devenu une force.</p>
          </div>
        )}

        {/* La carte à partager (c'est elle qui circule sur les réseaux) */}
        <div ref={cardRef} className="relative rounded-[20px] overflow-hidden" style={{ background: 'linear-gradient(160deg, #2B1F15 0%, #3A2A1C 55%, #24190F 100%)', border: '1px solid rgba(233,200,143,.22)', boxShadow: '0 18px 40px rgba(0,0,0,.4)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.35, background: 'radial-gradient(ellipse at 50% 28%, #E9C88F 0%, transparent 58%)' }} />
          <div className="relative flex flex-col items-center pt-8 px-6">
            <div className="w-40 h-40 rounded-[28px] overflow-hidden" style={{ border: '3px solid rgba(233,200,143,.35)' }}>
              <img src={TOTEM_IMAGES[animal]} alt={sig.label} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2 mb-1 mt-5">
              <Sparkles size={14} color={C.gold} aria-hidden="true" />
              <p className="m-0" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold }}>Mon animal intérieur</p>
            </div>
            <h1 className="m-0 text-center" style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 600, color: C.title, lineHeight: 1.1 }}>{sig.label}</h1>
            <p className="m-0 mt-2 text-center" style={{ fontSize: 15, color: C.soft, lineHeight: 1.45 }}>{totemMeaning(animal, genre)}</p>
            {gauges.length > 0 && (
              <div className="mt-6 mb-2 w-full">
                <div className="flex justify-center gap-2">{row1.map(x => <ProgressRing key={x.scaleId} gauge={x} />)}</div>
                {row2.length > 0 && <div className="flex justify-center gap-2 mt-3">{row2.map(x => <ProgressRing key={x.scaleId} gauge={x} />)}</div>}
              </div>
            )}
            <p className="m-0 mt-2 mb-4 self-end" style={{ fontSize: 13, color: C.faint }}>health-e.sn</p>
          </div>
        </div>
        <Btn variant="secondary" full onClick={handleShare} disabled={sharing} icon={<Share2 size={16} aria-hidden="true" />}>{sharing ? 'Préparation…' : 'Partager mon animal intérieur'}</Btn>

        {/* Qui tu es + l'archétype : le cœur de la page, toujours visible */}
        <section style={card}>
          <p style={kicker(palette.accent)}>Ce que {w.ton} dit de toi</p>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: C.soft }}>{description}</p>
          {archetype.title && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }} aria-label="Mon archétype">
              <p style={kicker(C.faint)}>Ton archétype</p>
              <p style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: 22, lineHeight: 1.25, fontWeight: 600, color: C.title }}>
                {archetype.title} <em style={{ fontStyle: 'italic', color: palette.accent }}>{archetype.subtitle}</em>
              </p>
              {archetype.traits.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {archetype.traits.map(t => (
                    <span key={t} style={{ padding: '4px 11px', borderRadius: 999, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.05)', fontSize: 13, color: C.soft }}>{t}</span>
                  ))}
                </div>
              )}
              <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.6, color: C.soft }}>{archetype.description}</p>
            </div>
          )}
        </section>

        {/* Le défi de la semaine : la seule action principale de la page */}
        <section style={{ ...card, borderColor: 'rgba(242,182,109,.35)', background: 'rgba(242,182,109,.07)' }}>
          <p style={{ ...kicker(palette.accent), display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} aria-hidden="true" />Le défi {w.du} cette semaine</p>
          <p style={{ margin: '8px 0 12px', fontSize: 15, lineHeight: 1.55, color: C.title, fontWeight: 600 }}>{g(guide.defi)}</p>
          {defiActive ? (
            <p style={{ margin: 0, fontSize: 14, color: C.sage }}>Défi relevé pour cette semaine. Je te le rappelle sur l'accueil.</p>
          ) : (
            <Btn onClick={() => { if (currentUser) acceptTotemDefi(currentUser.id, animal).then(setDefi).catch(() => {}); }}>Je relève le défi</Btn>
          )}
        </section>

        {/* Le détail, replié */}
        <Fold title="Ton animal intérieur au quotidien" summary="Ta force, ton piège, ce qui te recharge, ta façon d'aimer" icon={<Sparkles size={18} color={C.gold} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {daily.map(d => (
              <div key={d.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <d.icon size={18} color={d.color} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{d.title}</span>
                  <span style={{ display: 'block', marginTop: 4, fontSize: 15, lineHeight: 1.55, color: C.soft }}>{g(d.text)}</span>
                </span>
              </div>
            ))}
          </div>
        </Fold>

        {gauges.length > 0 && (
          <Fold title="Tes 7 jauges" summary={`${nForces} force${nForces > 1 ? 's' : ''} sur ${gauges.length}${lowest && lowest.fillPercent < 67 ? ` · à faire grandir : ${RING_SHORT_LABELS[lowest.scaleId] ?? lowest.label}` : ''}`} icon={<Gauge size={18} color={C.sage} />}>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: C.muted }}>Vert : une force · ambre : moyen · rouge : à faire grandir. Touche une jauge pour comprendre.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gauges.map(x => <GaugeRow key={x.scaleId} gauge={x} genre={genre} />)}
            </div>
            {lowest && lowest.fillPercent < 67 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.55, color: C.soft }}>
                  Ta jauge « {RING_SHORT_LABELS[lowest.scaleId] ?? lowest.label} » est la plus basse ({lowest.fillPercent} %). C'est elle qui ferait le plus briller {w.ton}. Quand tu refais le test et que ça a bougé, il rayonne davantage.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {lowAxis && <Btn variant="secondary" onClick={() => navigate('/compagnon', { state: { programme: true } })}>{progActive ? 'Voir mon programme' : 'Un programme pour ça'}</Btn>}
                  <Btn variant="secondary" onClick={() => navigate('/compagnon', { state: { prescribe: lowest.scaleId } })}>Refaire ce test</Btn>
                </div>
              </div>
            )}
          </Fold>
        )}

        <Fold title={`Les routines ${w.du}`} summary={`${TOTEM_ROUTINES[animal].length} habitudes à ajouter à ton programme`} icon={<ClipboardCheck size={18} color={palette.accent} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 0 12px' }}>
            {TOTEM_ROUTINES[animal].map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 10 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: palette.accent, marginTop: 8, flexShrink: 0 }} />
                <span style={{ fontSize: 15, lineHeight: 1.5, color: C.soft }}><b style={{ color: C.text }}>{r.title}</b> · {g(r.text)}</span>
              </div>
            ))}
          </div>
          <Btn variant="secondary" onClick={() => navigate('/compagnon', { state: { programme: true } })}>Les ajouter à mon programme</Btn>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: C.faint }}>Tu choisis lesquelles garder, et tu peux les retirer à tout moment.</p>
        </Fold>

        <Fold title="En amour" summary={`Tu t'accordes le mieux avec ${love.best.map(m => totemWords(m.animal).un).join(' et ')}`} icon={<Heart size={18} color={C.intime} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '0 0 12px' }}>
            {love.best.map(m => (
              <div key={m.animal} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={TOTEM_IMAGES[m.animal]} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                <span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{getTotemSignature(m.animal).label}</span>
                  <span style={{ display: 'block', fontSize: 14, lineHeight: 1.45, color: C.soft }}>{(t => t.charAt(0).toUpperCase() + t.slice(1))(m.reasons.join(', '))}.</span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,.04)' }}>
            <img src={TOTEM_IMAGES[love.effort.animal]} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0, opacity: 0.85 }} />
            <span style={{ fontSize: 14, lineHeight: 1.45, color: C.soft }}>
              Avec {totemWords(love.effort.animal).un}, l'amour demande plus d'efforts : {love.effort.reasons.join(', ')}. Pas impossible, il faut juste en parler.
            </span>
          </div>
          <p style={{ margin: '12px 0 12px', fontSize: 14, color: C.muted }}>C'est une tendance d'après les tempéraments, pas une règle. La vraie réponse, c'est le test de compatibilité avec la personne.</p>
          <Btn variant="secondary" to="/assessment/compatibility">Tester avec la personne</Btn>
        </Fold>

        <Fold title="Tes totems proches" summary={`${near.map(a => getTotemSignature(a).label).join(' et ')} : tes jumeaux de tempérament`} icon={<Users size={18} color={C.sage} />}>
          <div style={{ display: 'flex', gap: 10, margin: '0 0 12px' }}>
            {near.map(a => (
              <div key={a} style={{ flex: 1, textAlign: 'center' }}>
                <img src={TOTEM_IMAGES[a]} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover' }} />
                <span style={{ display: 'block', marginTop: 6, fontSize: 15, fontWeight: 700 }}>{getTotemSignature(a).label}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.soft }}>
            Avec {near.map(a => totemWords(a).un).join(' ou ')}, en amitié comme au travail, tu te comprends sans beaucoup parler.
          </p>
        </Fold>

        {/* Pour toi aujourd'hui */}
        <section style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <CompanionMark size={40} />
          <span>
            <span style={kicker(palette.accent)}>Pour toi aujourd'hui</span>
            <span style={{ display: 'block', marginTop: 6, fontSize: 15, lineHeight: 1.6, color: C.soft, fontStyle: 'italic' }}>« {drLoMessage} »</span>
          </span>
        </section>

        {defiEnabled && (
          <button onClick={() => navigate('/defi')} className="drl-btn"
            style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: C.text, textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(233,200,143,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={18} color={C.gold} aria-hidden="true" />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Tes proches auraient-ils deviné ton animal intérieur ?</span>
              <span style={{ display: 'block', fontSize: 14, color: C.muted, marginTop: 2 }}>Kan moo ma gën a xam ? Lance ton Défi</span>
            </span>
            <ChevronRight size={18} color={C.faint} aria-hidden="true" />
          </button>
        )}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: C.faint }}>Pas de diagnostic : ton animal intérieur décrit ton tempérament, il évolue avec toi.</p>
      </div>
    </DrLoShell>
  );
};

export default TotemProfilePage;

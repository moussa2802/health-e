import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, ChevronRight, Lock, Check, Play, Shield, Stethoscope, Sparkles, NotebookPen, ArrowRight, Flame } from 'lucide-react';
import TotemCard from '../../components/assessment/TotemCard';
import GameTeaser from '../../components/assessment/GameTeaser';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  saveOnboardingToProfile,
  resetUserProfile,
  getInProgressSessions,
  backfillArchetypeId,
} from '../../services/evaluationService';
import {
  getGuestCount,
  getAllGuestResults,
  getGuestInProgressSession,
  GUEST_MAX_TESTS,
} from '../../utils/guestSession';
import {
  isOnboardingComplete,
  getOnboardingProfile,
  saveOnboardingProfile,
} from '../../utils/onboardingProfile';
import OnboardingProfile from '../../components/assessment/OnboardingProfile';
import PageTooltips from '../../components/Onboarding/PageTooltips';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../../data/scales';
import type { AssessmentScale } from '../../types/assessment';
import type { ScaleResult } from '../../types/assessment';
import type { OnboardingProfile as OnboardingProfileType } from '../../types/onboarding';
import { getScaleMeta } from '../../utils/scaleMeta';
import TestCode from '../../components/assessment/TestCode';
import {
  getTotemProgress,
  getTotemSignature,
  type TotemAnimal,
} from '../../utils/totemAlgorithm';
import { getArchetype, getArchetypeId } from '../../utils/profileArchetype';
import { useDefiFlag } from '../../hooks/useDefiFlag';
import { collection, query, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { openDrLoChat } from '../../components/DrLoChat/drLoEvents';
import {
  computePortrait,
  computeStreak,
  pickGuideMessage,
  localDayKey,
  toDate,
  type GuideMessage,
  type LastTest,
} from '../../utils/drLoGuide';
import { db } from '../../utils/firebase';

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

const TOTEM_TILE_IMAGES: Record<TotemAnimal, string> = {
  lion: lionImg, loup: loupImg, cerf: cerfImg, dauphin: dauphinImg,
  tortue: tortueImg, hibou: hibouImg, aigle: aigleImg, elephant: elephantImg,
  panthere: panthereImg, renard: renardImg, cheval: chevalImg, ours: oursImg,
};

const PSY_THRESHOLD = 7;

// Suivis post-test déjà proposés (pour ne pas les répéter) — confort local, non critique
const FOLLOW_UPS_KEY = 'he_drlo_followups_done';
function readDoneFollowUps(): string[] {
  try {
    const raw = localStorage.getItem(FOLLOW_UPS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}
function markFollowUpDone(key: string): string[] {
  const next = [...readDoneFollowUps().filter(k => k !== key), key].slice(-50);
  try { localStorage.setItem(FOLLOW_UPS_KEY, JSON.stringify(next)); } catch { /* stockage indisponible */ }
  return next;
}

const TILE_BG = 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)';
const TILE_GOLD = '#D4AD5A';
const TILE_TERRACOTTA = '#D4896B';
const TILE_SAGE = '#8BA59B';
const TILE_SAGE_ACTION = '#A3BDB3';

const TAB_CONFIG: { id: 'mental' | 'intime' | 'bonus'; label: string }[] = [
  { id: 'mental', label: 'Psychologique' },
  { id: 'intime', label: 'Vie intime' },
  { id: 'bonus', label: 'Bonus' },
];

const SECTION_TITLES: Record<string, string> = {
  mental: 'Profil psychologique',
  intime: 'Vie intime',
  bonus: 'Tests bonus',
};

function getScalesForTab(tab: 'mental' | 'intime' | 'bonus'): AssessmentScale[] {
  if (tab === 'mental') return MENTAL_HEALTH_SCALES;
  if (tab === 'intime') return SEXUAL_HEALTH_SCALES;
  return BONUS_SCALES;
}

const AssessmentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, needsAuthMigration } = useAuth();
  const { defiEnabled } = useDefiFlag();

  const [showOnboarding, setShowOnboarding] = useState(() =>
    isAuthenticated ? false : !isOnboardingComplete()
  );
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfileType | null>(
    () => getOnboardingProfile()
  );
  const [profileResults, setProfileResults] = useState<Record<string, ScaleResult>>({});
  const [bonusCompleted, setBonusCompleted] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [loadRetry, setLoadRetry] = useState(0);
  const [activeTab, setActiveTab] = useState<'mental' | 'intime' | 'bonus'>('mental');
  const [ringMounted, setRingMounted] = useState(false);
  const [barsMounted, setBarsMounted] = useState(false);
  const [inProgressScales, setInProgressScales] = useState<Set<string>>(new Set());
  const [totemData, setTotemData] = useState<{ animal: string; computedAt: Date; revealedAt: Date | null; pendingAnimal: string | null } | null>(null);
  const [journalToday, setJournalToday] = useState<boolean | null>(null);
  const [journalDays, setJournalDays] = useState<string[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [doneFollowUps, setDoneFollowUps] = useState<string[]>(() => readDoneFollowUps());
  const [activeDefis, setActiveDefis] = useState<Array<{ slug: string; titre: string; audience: string; expiresAt: Date }>>([]);
  const [defiHistory, setDefiHistory] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);
  const segmentedRef = useRef<HTMLDivElement>(null);
  const totemRevealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setGuestCount(getGuestCount());
      setProfileResults(getAllGuestResults());
      const ipSet = new Set<string>();
      [...MENTAL_HEALTH_SCALES, ...SEXUAL_HEALTH_SCALES, ...BONUS_SCALES].forEach(s => {
        if (getGuestInProgressSession(s.id)) ipSet.add(s.id);
      });
      setInProgressScales(ipSet);
      setTilesLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    getOrCreateUserProfile(currentUser.id, currentUser.name)
      .then(() => getProfileProgress(currentUser.id))
      .then(p => {
        setProfileResults(p.scaleResults);
        setBonusCompleted(p.bonusCompletedCount);
        setTotemData(p.totem);
        setActiveDefis(p.activeDefis);
        setDefiHistory(p.defiHistory);
        setTilesLoaded(true);
        if (p.totem?.revealedAt && !p.archetypeId && currentUser) {
          const arch = getArchetype(p.scaleResults);
          const archId = getArchetypeId(arch);
          if (archId) {
            backfillArchetypeId(currentUser.id, archId).catch(() => {});
          }
        }
        if (p.onboardingProfile) {
          saveOnboardingProfile(p.onboardingProfile as Parameters<typeof saveOnboardingProfile>[0]);
          setOnboardingProfile(p.onboardingProfile as OnboardingProfileType);
          setShowOnboarding(false);
        } else if (p.completedCount > 0) {
          setShowOnboarding(false);
        } else if (!isOnboardingComplete()) {
          setShowOnboarding(true);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = msg.includes('offline') || msg.includes('unavailable') || msg.includes('permission-denied');
        if (isTransient && loadRetry < 5) {
          setTimeout(() => setLoadRetry(r => r + 1), 4000);
        }
        setTilesLoaded(true);
      });
    getInProgressSessions(currentUser.id)
      .then(sessions => {
        const ipSet = new Set<string>();
        sessions.forEach(s => s.selectedScaleIds.forEach(id => ipSet.add(id)));
        setInProgressScales(ipSet);
      })
      .catch(() => {});
  }, [isAuthenticated, currentUser?.id, loadRetry]);

  // Journal + conversations : humeur du jour, série, et pièces du portrait
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setJournalToday(false);
      setJournalDays([]);
      setJournalCount(0);
      setChatCount(0);
      return;
    }
    const fs = db;
    if (!fs) return;
    const journalCol = collection(fs, 'users', currentUser.id, 'journal');
    getDocs(query(journalCol, orderBy('created_at', 'desc'), limit(60)))
      .then(snap => {
        const days = snap.docs
          .map(d => toDate(d.data().created_at))
          .filter((d): d is Date => !!d)
          .map(localDayKey);
        setJournalDays(days);
        setJournalToday(days.includes(localDayKey(new Date())));
      })
      .catch(() => setJournalToday(false));
    getCountFromServer(journalCol)
      .then(c => setJournalCount(c.data().count))
      .catch(() => {});
    getCountFromServer(collection(fs, 'users', currentUser.id, 'chat_dr_lo'))
      .then(c => setChatCount(c.data().count))
      .catch(() => {});
  }, [isAuthenticated, currentUser?.id]);

  useEffect(() => {
    const t = setTimeout(() => setRingMounted(true), 100);
    const t2 = setTimeout(() => setBarsMounted(true), 200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  if (showOnboarding) {
    return (
      <OnboardingProfile
        defaultPrenom={currentUser?.name ?? onboardingProfile?.prenom ?? undefined}
        onComplete={(profile) => {
          setOnboardingProfile(profile);
          setShowOnboarding(false);
          if (isAuthenticated && currentUser) {
            // Ne jamais effacer des résultats existants (tests faits dans le chat avant le questionnaire)
            (Object.keys(profileResults ?? {}).length === 0 ? resetUserProfile(currentUser.id) : Promise.resolve())
              .then(() => saveOnboardingToProfile(currentUser.id, profile as unknown as Record<string, string>))
              .then(() => setLoadRetry(r => r + 1))
              .catch(() => {});
          }
        }}
      />
    );
  }

  const prenom = onboardingProfile?.prenom;
  const mentalCompleted = MENTAL_HEALTH_SCALES.filter(s => profileResults[s.id]).length;
  const sexualCompleted = SEXUAL_HEALTH_SCALES.filter(s => profileResults[s.id]).length;
  const mentalTotal = MENTAL_HEALTH_SCALES.length;
  const sexualTotal = SEXUAL_HEALTH_SCALES.length;

  const doneCore = mentalCompleted + sexualCompleted;
  const totalCore = mentalTotal + sexualTotal;

  const RING_R = 30;
  const RING_C = 2 * Math.PI * RING_R;

  const currentScales = getScalesForTab(activeTab);
  const psyOk = mentalCompleted >= PSY_THRESHOLD;
  const isUnlocked = psyOk;
  const psyMissing = Math.max(0, PSY_THRESHOLD - mentalCompleted);
  // Totem tile state
  const totemProgress = getTotemProgress(profileResults);
  const totemIsReady = totemProgress.missing.length === 0;
  const totemIsComputed = !!totemData?.animal;
  const totemIsRevealed = !!totemData?.revealedAt;
  const totemHasPending = !!totemData?.pendingAnimal && totemData.pendingAnimal !== totemData.animal;
  const totemAnimal = totemData?.animal as TotemAnimal | undefined;
  const totemSig = totemAnimal ? getTotemSignature(totemAnimal) : null;
  const totemImg = totemAnimal ? TOTEM_TILE_IMAGES[totemAnimal] : null;

  // ── Accueil proactif de Dr Lô (Modif B) ──
  // Portrait : tests (70 %) + journal (15 %) + conversations (15 %)
  const portraitPct = computePortrait({ doneCore, totalCore, journalCount, chatCount });
  const ringOffset = RING_C - (portraitPct / 100) * RING_C;

  // Dernier test terminé + jours d'activité (tests + journal) pour la série
  let lastTest: LastTest | null = null;
  const activityDays = new Set<string>(journalDays);
  Object.entries(profileResults).forEach(([scaleId, r]) => {
    const at = toDate((r as { completedAt?: unknown }).completedAt);
    if (!at) return;
    activityDays.add(localDayKey(at));
    if (!lastTest || at > lastTest.completedAt) {
      lastTest = { scaleId, label: getScaleMeta(scaleId).label, completedAt: at };
    }
  });
  const streak = computeStreak(activityDays, new Date());

  const guide: GuideMessage = pickGuideMessage({
    isAuthenticated,
    prenom,
    doneCore,
    totalCore,
    guestCount,
    guestMax: GUEST_MAX_TESTS,
    totemMissing: totemProgress.missing.length,
    totemReady: totemIsReady,
    totemRevealed: totemIsRevealed,
    journalToday: isAuthenticated ? journalToday : null,
    lastTest,
    dismissedFollowUps: doneFollowUps,
    now: new Date(),
  });

  const handleGuideAction = () => {
    if (guide.followUpKey) setDoneFollowUps(markFollowUpDone(guide.followUpKey));
    const action = guide.action;
    switch (action.kind) {
      case 'chat':
        openDrLoChat({ greeting: action.greeting, source: `home_${guide.id}` });
        break;
      case 'journal':
        navigate('/mon-espace');
        break;
      case 'signup':
        navigate('/patient/access');
        break;
      case 'reveal_totem':
        if (totemRevealRef.current) totemRevealRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else navigate('/assessment/totem');
        break;
      case 'start_test':
        setActiveTab('mental');
        setTimeout(() => segmentedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        break;
    }
  };

  const handleCompatLockedClick = () => {
    setActiveTab('mental');
    setTimeout(() => {
      segmentedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const SkeletonTile = () => (
    <div className="rounded-[14px] p-4 shadow-soft animate-pulse" style={{ background: TILE_BG }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-white/10" />
        <div className="w-16 h-2.5 rounded bg-white/10" />
      </div>
      <div className="w-3/4 h-3 rounded bg-white/10 mb-1.5" />
      <div className="w-1/2 h-2.5 rounded bg-white/10" />
    </div>
  );

  return (
    <>
    <div className="min-h-screen bg-paper">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-[22px] font-semibold text-ink m-0">
              Health-e
            </h1>
            <p className="text-xs text-muted mt-0.5">
              24 outils cliniquement validés
              <span className="ml-1.5 opacity-40 text-[10px]">v.{__APP_VERSION__}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentUser?.type === 'admin' && (
              <Link
                to="/admin/evaluations"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-sage/8 border border-sage/15 text-sage text-xs font-semibold no-underline hover:bg-sage/12 transition-colors"
              >
                Dashboard
              </Link>
            )}
            {!isAuthenticated && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: GUEST_MAX_TESTS }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full border-[1.5px] border-sage/30 ${
                      i < guestCount ? 'bg-sage' : 'bg-sage/20'
                    }`}
                  />
                ))}
                <span className="text-[10px] text-muted font-semibold ml-1">
                  {guestCount}/{GUEST_MAX_TESTS}
                </span>
              </div>
            )}
            {prenom && (
              <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-sm font-bold text-white/90">
                {prenom.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[600px] mx-auto px-5 pt-6 pb-24">

        {/* Guest banner */}
        {!isAuthenticated && (
          <div className="bg-card border border-line rounded-[14px] px-4 py-2.5 flex items-center justify-between gap-2.5 flex-wrap mb-5">
            <p className="text-xs text-ink-soft font-medium m-0">
              {guestCount < GUEST_MAX_TESTS
                ? `${GUEST_MAX_TESTS - guestCount} essai${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} gratuit${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} restant`
                : 'Limite atteinte — crée un compte pour continuer'}
            </p>
            <Link to="/patient/access" className="inline-flex items-center gap-1.5 bg-accent text-white font-semibold text-[11px] px-3 py-1.5 rounded-[10px] no-underline">
              {guestCount >= GUEST_MAX_TESTS ? 'Créer un compte' : 'Se connecter'}
            </Link>
          </div>
        )}

        {/* ── Migration banner (phone-only users) ── */}
        {isAuthenticated && needsAuthMigration() && (
          <Link
            to="/patient/profile"
            className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-[14px] px-4 py-4 mb-5 no-underline hover:from-amber-100 hover:to-orange-100 transition-all shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 m-0">⚠️ Sécurise ton compte</p>
              <p className="text-xs text-gray-600 m-0 mt-0.5">Associe <strong>Google</strong> ou un <strong>email + mot de passe</strong> pour ne pas perdre l'accès</p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-500 flex-shrink-0" />
          </Link>
        )}

        {/* ── Hero card (lightened) ── */}
        <div className="relative bg-ink rounded-block p-5 shadow-soft overflow-hidden mb-5">
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #B5522F 0%, transparent 70%)' }}
          />

          <div className="flex items-center gap-4 relative z-10">
            <div className="flex-shrink-0">
              <svg width="64" height="64" viewBox="0 0 74 74" className="block">
                <circle cx="37" cy="37" r={RING_R} fill="none" stroke="rgba(244,241,233,.16)" strokeWidth="5" />
                <circle
                  ref={ringRef}
                  cx="37" cy="37" r={RING_R}
                  fill="none" stroke="#E9A88C" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringMounted ? ringOffset : RING_C}
                  transform="rotate(-90 37 37)"
                  style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.2,.7,.3,1)' }}
                />
                <text x="37" y="37" textAnchor="middle" dominantBaseline="central" className="font-display" fill="#F4F1E9" fontSize="17" fontWeight="700">
                  {portraitPct}%
                </text>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-[17px] font-semibold text-[#F4F1E9] leading-snug m-0">
                {prenom ? (
                  <>Bonjour {prenom} 👋</>
                ) : (
                  <>Ton profil</>
                )}
              </h2>
              <p className="text-[12px] text-white/70 m-0 mt-0.5">
                Ton portrait se dessine : <span className="text-white font-bold">{portraitPct} %</span>
              </p>
              <p className="text-[11px] text-white/45 m-0 mt-0.5 flex items-center gap-2 flex-wrap">
                <span><span className="text-white/75 font-bold">{doneCore}</span>/{totalCore} tests</span>
                {streak >= 2 && (
                  <span className="inline-flex items-center gap-0.5 text-[#E9A88C] font-bold">
                    <Flame size={11} /> {streak} jours d'affilée
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => openDrLoChat({ source: 'home_button' })}
              aria-label="Parler à Dr Lô"
              className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-bold text-[#F4F1E9] cursor-pointer transition-colors hover:bg-white/15"
            >
              <Stethoscope size={13} />
              Dr Lô
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Message du jour de Dr Lô : toujours une prochaine étape */}
          <div className="relative z-10 mt-4 rounded-xl bg-white/[0.07] border border-white/10 px-3.5 py-3" data-guide-id={guide.id}>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#E9A88C] m-0 flex items-center gap-1">
              <Stethoscope size={11} /> Dr Lô
            </p>
            {!tilesLoaded ? (
              // Pas de message tant que le profil n'est pas chargé (évite un faux « premier test »)
              <div className="mt-2 space-y-1.5 animate-pulse">
                <div className="h-3 w-4/5 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            ) : (
              <>
                <p className="text-[13.5px] leading-snug text-[#F4F1E9] m-0 mt-1">{guide.text}</p>
                <button
                  onClick={handleGuideAction}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-[10px] bg-[#E9A88C] px-3 py-1.5 text-[12px] font-bold text-ink cursor-pointer border-0 hover:brightness-105 transition"
                >
                  {guide.cta} <ArrowRight size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 2×2 Tile grid ── */}
        <div className="grid grid-cols-2 gap-3 mb-5">

          {/* ── Tile A: TOTEM ── */}
          {!tilesLoaded ? (
            <SkeletonTile />
          ) : !totemIsReady ? (
            <div
              className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all"
              style={{ background: TILE_BG }}
              onClick={() => {
                setActiveTab('mental');
                setTimeout(() => segmentedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,173,90,0.15)' }}>
                    <Sparkles size={14} style={{ color: TILE_GOLD }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_GOLD }}>Ton totem</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: totemProgress.total }).map((_, i) => (
                    <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ background: i < totemProgress.completed ? TILE_GOLD : 'rgba(244,241,233,0.15)' }} />
                  ))}
                </div>
              </div>
              <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">Ton Totem</p>
              <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
                Encore {totemProgress.total - totemProgress.completed} test{totemProgress.total - totemProgress.completed > 1 ? 's' : ''}
              </p>
              <p className="text-[12px] font-semibold m-0 mt-auto pt-2 flex items-center gap-1" style={{ color: TILE_GOLD }}>
                Compléter <ArrowRight size={12} />
              </p>
            </div>
          ) : totemIsComputed && !totemIsRevealed ? (
            <div
              className="relative rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer transition-all"
              style={{ background: TILE_BG, animation: 'totemGlow 2.5s ease-in-out infinite' }}
              onClick={() => totemRevealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              <style>{`
                @keyframes totemGlow {
                  0%, 100% { box-shadow: 0 0 8px rgba(212,173,90,.25), 0 1px 3px rgba(0,0,0,.12); }
                  50% { box-shadow: 0 0 20px rgba(212,173,90,.45), 0 0 40px rgba(212,173,90,.15), 0 1px 3px rgba(0,0,0,.12); }
                }
              `}</style>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,173,90,0.15)' }}>
                    <Sparkles size={14} style={{ color: TILE_GOLD }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_GOLD }}>Ton totem</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,173,90,0.2)', color: TILE_GOLD }}>
                  Prêt
                </span>
              </div>
              <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">Ton Totem</p>
              <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
                Tous les tests sont faits !
              </p>
              <p className="text-[12px] font-semibold m-0 mt-auto pt-2 flex items-center gap-1" style={{ color: TILE_GOLD }}>
                Révéler <ArrowRight size={12} />
              </p>
            </div>
          ) : totemIsRevealed && totemImg && totemSig ? (
            <div
              className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all"
              style={{ background: TILE_BG }}
              onClick={() => navigate('/assessment/totem')}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(212,173,90,0.25)' }}>
                  <img src={totemImg} alt={totemSig.label} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_GOLD }}>Totem</span>
              </div>
              <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">{totemSig.label}</p>
              <p className="text-[11px] m-0 mt-1 leading-snug line-clamp-2" style={{ color: 'rgba(244,241,233,0.65)' }}>
                {totemSig.meaning}
              </p>
              <p className="text-[12px] font-semibold m-0 mt-auto pt-2 flex items-center gap-1" style={{ color: TILE_GOLD }}>
                Voir ma carte <ArrowRight size={12} />
              </p>
            </div>
          ) : (
            <div className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden" style={{ background: TILE_BG }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,173,90,0.15)' }}>
                  <Sparkles size={14} style={{ color: TILE_GOLD }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_GOLD }}>Ton totem</span>
              </div>
              <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">Ton Totem</p>
              <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>Calcul en cours…</p>
            </div>
          )}

          {/* ── Tile B: COMPATIBILITÉ ── */}
          {!tilesLoaded ? (
            <SkeletonTile />
          ) : isUnlocked ? (
            <div
              className={`rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all ${!isAuthenticated ? 'opacity-50 pointer-events-none' : ''}`}
              style={{ background: TILE_BG }}
              onClick={() => navigate('/assessment/compatibility')}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,137,107,0.15)' }}>
                  <Users size={14} style={{ color: TILE_TERRACOTTA }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_TERRACOTTA }}>Compatibilité</span>
              </div>
              <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">Compare-toi à un proche</p>
              <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
                Couple, ami(e), famille…
              </p>
              <p className="text-[12px] font-semibold m-0 mt-auto pt-2 flex items-center gap-1" style={{ color: TILE_TERRACOTTA }}>
                Tester <ArrowRight size={12} />
              </p>
            </div>
          ) : (
            <div
              className={`rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all ${!isAuthenticated ? 'opacity-50 pointer-events-none' : ''}`}
              style={{ background: TILE_BG }}
              onClick={handleCompatLockedClick}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,241,233,0.08)' }}>
                    <Users size={14} style={{ color: 'rgba(244,241,233,0.4)' }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(244,241,233,0.4)' }}>Compatibilité</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,241,233,0.08)', color: 'rgba(244,241,233,0.4)' }}>
                  <Lock size={9} /> Verrouillé
                </span>
              </div>
              <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">Compatibilité</p>
              <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
                Encore {psyMissing} test{psyMissing > 1 ? 's' : ''} psy
              </p>
            </div>
          )}

          {/* ── Tile C: JOURNAL ── */}
          {!tilesLoaded ? (
            <SkeletonTile />
          ) : !isAuthenticated ? (
            <div
              className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer opacity-60"
              style={{ background: TILE_BG }}
              onClick={() => navigate('/patient/access')}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,165,155,0.15)' }}>
                  <NotebookPen size={14} style={{ color: TILE_SAGE }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_SAGE }}>Journal</span>
              </div>
              <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">Comment tu te sens ?</p>
              <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
                Connecte-toi pour commencer
              </p>
            </div>
          ) : (
            <div
              className="rounded-[14px] p-4 shadow-soft flex flex-col overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-[1px] transition-all"
              style={{ background: TILE_BG }}
              onClick={() => navigate('/mon-espace')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,165,155,0.15)' }}>
                    <NotebookPen size={14} style={{ color: TILE_SAGE }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TILE_SAGE }}>Journal</span>
                </div>
                {journalToday ? (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,165,155,0.15)', color: TILE_SAGE }}>
                    <Check size={9} /> Noté
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,165,155,0.15)', color: TILE_SAGE }}>
                    Privé
                  </span>
                )}
              </div>
              <p className="text-[14px] font-bold text-[#F4F1E9] m-0 mt-2.5 leading-tight">Comment tu te sens ?</p>
              <p className="text-[11px] m-0 mt-1 leading-snug" style={{ color: 'rgba(244,241,233,0.65)' }}>
                {journalToday ? 'Tu as déjà noté ton humeur' : '30 secondes pour noter ton humeur'}
              </p>
              <p className="text-[12px] font-semibold m-0 mt-auto pt-2 flex items-center gap-1" style={{ color: TILE_SAGE_ACTION }}>
                {journalToday ? 'Voir mon espace' : 'Écrire'} <ArrowRight size={12} />
              </p>
            </div>
          )}

          {/* ── Tile D: GAME TEASER ── */}
          {!tilesLoaded ? (
            <SkeletonTile />
          ) : (
            <GameTeaser
              defiEnabled={defiEnabled}
              totemProgress={totemProgress}
              totemRevealed={totemIsRevealed}
              onLockedClick={handleCompatLockedClick}
              activeDefis={activeDefis}
              hasHistory={defiHistory}
            />
          )}
        </div>

        {/* ── Full TotemCard (reveal / evolution experience) ── */}
        {tilesLoaded && totemIsReady && totemIsComputed && !totemIsRevealed && (
          <div ref={totemRevealRef}>
            <TotemCard
              profileResults={profileResults}
              totem={totemData}
              userId={currentUser?.id ?? null}
              onTotemUpdate={() => setLoadRetry(r => r + 1)}
            />
          </div>
        )}
        {tilesLoaded && totemHasPending && (
          <div ref={totemRevealRef}>
            <TotemCard
              profileResults={profileResults}
              totem={totemData}
              userId={currentUser?.id ?? null}
              onTotemUpdate={() => setLoadRetry(r => r + 1)}
            />
          </div>
        )}

        {/* ── Segmented control ── */}
        <div ref={segmentedRef} className="flex gap-1 bg-[#EAE7DD] p-[5px] rounded-[16px] mb-5">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 rounded-[12px] border-none text-[13px] font-semibold cursor-pointer transition-all ${
                activeTab === tab.id
                  ? 'bg-card text-ink shadow-soft'
                  : 'bg-transparent text-ink-soft hover:text-ink'
              }`}
              aria-label={`Onglet ${tab.label}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Section title + count ── */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink m-0">
            {SECTION_TITLES[activeTab]}
          </h3>
          <span className="text-xs text-muted font-medium">
            {currentScales.length} évaluations
          </span>
        </div>

        {/* ── Scale list ── */}
        <div className="flex flex-col gap-3 mb-6">
          {currentScales.map((scale, index) => {
            const meta = getScaleMeta(scale.id);
            const Icon = meta.icon;
            const isDone = !!profileResults[scale.id];
            const isInProgress = inProgressScales.has(scale.id);
            const catKey = meta.category;
            const iconBgClass = catKey === 'mental' ? 'bg-sage-soft' : catKey === 'sexual' ? 'bg-accent-soft' : 'bg-gold-soft';
            const iconColorClass = catKey === 'mental' ? 'text-sage' : catKey === 'sexual' ? 'text-accent' : 'text-gold';

            return (
              <button
                key={scale.id}
                onClick={() => navigate(`/assessment/test/${scale.id}`)}
                className="w-full bg-card border border-line rounded-card p-4 text-left cursor-pointer shadow-soft hover:shadow-lift hover:-translate-y-[3px] transition-all duration-200 group"
                style={{ animation: `pop .35s cubic-bezier(.2,.7,.3,1) both`, animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-3.5">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className={iconColorClass} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-ink m-0 truncate flex items-center gap-2">
                      <TestCode scaleId={scale.id} />
                      {meta.label}
                    </p>
                    <p className="text-xs text-muted m-0 mt-0.5 truncate">
                      {meta.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted font-semibold bg-paper px-2 py-0.5 rounded-md">
                        {scale.timeEstimateMinutes} min
                      </span>
                      <span className="text-[10px] text-muted font-semibold bg-paper px-2 py-0.5 rounded-md">
                        {scale.items.length} q
                      </span>
                      {isInProgress && !isDone ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap" style={{ color: '#B78A2E', background: 'rgba(183,138,46,0.1)' }}>
                          <Play size={8} fill="currentColor" /> En cours
                        </span>
                      ) : isDone ? (
                        <span className="text-[10px] text-ok font-bold bg-ok/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check size={10} /> Terminé
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="w-[26px] h-[26px] rounded-lg border border-line flex items-center justify-center flex-shrink-0 group-hover:bg-ink group-hover:border-ink transition-colors">
                    <ChevronRight size={14} className="text-muted group-hover:text-white transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>

    <PageTooltips pageKey="home" />
    </>
  );
};

export default AssessmentHomePage;

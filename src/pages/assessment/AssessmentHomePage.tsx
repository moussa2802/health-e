import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Heart, Sparkles, Users, NotebookPen, MessageSquare, ChevronRight, Lock, Check, Play } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  saveOnboardingToProfile,
  resetUserProfile,
  getInProgressSessions,
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
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';
import { getScaleMeta, type ScaleCategory, CATEGORY_COLORS } from '../../utils/scaleMeta';

const MENTAL_THRESHOLD = 8;
const SEXUAL_THRESHOLD = 5;

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

function getCategoryForTab(tab: 'mental' | 'intime' | 'bonus'): ScaleCategory {
  if (tab === 'mental') return 'mental';
  if (tab === 'intime') return 'sexual';
  return 'bonus';
}

const AssessmentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { canAfford, balance } = useKoris();

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
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setGuestCount(getGuestCount());
      setProfileResults(getAllGuestResults());
      const ipSet = new Set<string>();
      [...MENTAL_HEALTH_SCALES, ...SEXUAL_HEALTH_SCALES, ...BONUS_SCALES].forEach(s => {
        if (getGuestInProgressSession(s.id)) ipSet.add(s.id);
      });
      setInProgressScales(ipSet);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    getOrCreateUserProfile(currentUser.id, currentUser.name)
      .then(() => getProfileProgress(currentUser.id))
      .then(p => {
        setProfileResults(p.scaleResults);
        setBonusCompleted(p.bonusCompletedCount);
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
      });
    getInProgressSessions(currentUser.id)
      .then(sessions => {
        const ipSet = new Set<string>();
        sessions.forEach(s => s.selectedScaleIds.forEach(id => ipSet.add(id)));
        setInProgressScales(ipSet);
      })
      .catch(() => {});
  }, [isAuthenticated, currentUser?.id, loadRetry]);

  useEffect(() => {
    const t = setTimeout(() => setRingMounted(true), 100);
    const t2 = setTimeout(() => setBarsMounted(true), 200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  if (showOnboarding) {
    return (
      <OnboardingProfile
        defaultPrenom={currentUser?.name ?? undefined}
        onComplete={(profile) => {
          setOnboardingProfile(profile);
          setShowOnboarding(false);
          if (isAuthenticated && currentUser) {
            resetUserProfile(currentUser.id)
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
  const bonusTotal = BONUS_SCALES.length;

  const doneCore = mentalCompleted + sexualCompleted;
  const totalCore = mentalTotal + sexualTotal;
  const pct = totalCore > 0 ? Math.round((doneCore / totalCore) * 100) : 0;

  const currentScales = getScalesForTab(activeTab);
  const currentCategory = getCategoryForTab(activeTab);
  const catColors = CATEGORY_COLORS[currentCategory];

  const mentalOk = mentalCompleted >= MENTAL_THRESHOLD;
  const sexualOk = sexualCompleted >= SEXUAL_THRESHOLD;
  const isUnlocked = mentalOk && sexualOk;
  const compatCost = KORIS_COSTS.compatibility;
  const hasKoris = canAfford('compatibility');
  const mentalMissing = Math.max(0, MENTAL_THRESHOLD - mentalCompleted);
  const sexualMissing = Math.max(0, SEXUAL_THRESHOLD - sexualCompleted);
  const totalMissing = mentalMissing + sexualMissing;
  const isClose = totalMissing > 0 && totalMissing <= 3;
  const worstCategory = mentalMissing >= sexualMissing ? '/assessment/mental' : '/assessment/sexual';

  const RING_R = 30;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C - (pct / 100) * RING_C;

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
      <div className="max-w-[600px] mx-auto px-5 pt-6 pb-12">

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

        {/* ── 2. Hero card (ink) ── */}
        <div className="relative bg-ink rounded-block p-[22px] shadow-soft overflow-hidden mb-6">
          {/* Decorative halo */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #B5522F 0%, transparent 70%)' }}
          />

          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40 mb-1 relative z-10">
            TON PROFIL
          </p>
          <h2 className="font-display text-xl font-semibold text-[#F4F1E9] leading-snug mb-5 relative z-10">
            {prenom ? (
              <>Bonjour {prenom},<br />continuons à te <em className="not-italic text-[#E9A88C]">comprendre</em>.</>
            ) : (
              <>Continuons à te <em className="not-italic text-[#E9A88C]">comprendre</em>.</>
            )}
          </h2>

          {/* Ring + meta row */}
          <div className="flex items-center gap-5 relative z-10">
            <div className="flex-shrink-0">
              <svg width="74" height="74" viewBox="0 0 74 74" className="block">
                <circle
                  cx="37" cy="37" r={RING_R}
                  fill="none" stroke="rgba(244,241,233,.16)" strokeWidth="5"
                />
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
                <text
                  x="37" y="37"
                  textAnchor="middle" dominantBaseline="central"
                  className="font-display" fill="#F4F1E9" fontSize="17" fontWeight="700"
                >
                  {pct}%
                </text>
              </svg>
            </div>
            <p className="text-[13px] text-white/60 leading-relaxed m-0">
              <span className="text-white/90 font-bold">{doneCore} tests</span> sur{' '}
              <span className="text-white/90 font-bold">{totalCore}</span> complétés.{' '}
              {!isUnlocked && (
                <>Encore quelques-uns et tu débloques ta <span className="text-[#E9A88C] font-semibold">compatibilité</span>.</>
              )}
              {isUnlocked && (
                <span className="text-[#E9A88C] font-semibold">Compatibilité débloquée !</span>
              )}
            </p>
          </div>

          {/* Bouton vers l'analyse globale */}
          <button
            onClick={() => navigate('/assessment/profile')}
            className="mt-5 w-full flex items-center justify-center gap-2 rounded-[14px] border border-white/15 bg-white/10 py-2.5 text-[13px] font-bold text-[#F4F1E9] cursor-pointer transition-colors hover:bg-white/15 relative z-10"
          >
            Voir mon analyse globale
            <ChevronRight size={15} />
          </button>
        </div>

        {/* ── 3. Segmented control ── */}
        <div className="flex gap-1 bg-[#EAE7DD] p-[5px] rounded-[16px] mb-5">
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

        {/* ── 4. Section title + count ── */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink m-0">
            {SECTION_TITLES[activeTab]}
          </h3>
          <span className="text-xs text-muted font-medium">
            {currentScales.length} évaluations
          </span>
        </div>

        {/* ── 5. Scale list ── */}
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
                    <p className="text-[15px] font-bold text-ink m-0 truncate">
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
                      {isDone && (
                        <span className="text-[10px] text-ok font-bold bg-ok/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check size={10} /> Terminé
                        </span>
                      )}
                      {isInProgress && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap" style={{ color: '#B78A2E', background: 'rgba(183,138,46,0.1)' }}>
                          <Play size={8} fill="currentColor" /> En cours
                        </span>
                      )}
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

        {/* ── 6. Compatibility card (ink) ── */}
        {isAuthenticated && (
          <div className="rounded-block p-5 shadow-soft overflow-hidden mb-5" style={{ background: 'linear-gradient(160deg, #20211F 0%, #33322C 100%)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-[#F4F1E9]/80" />
                <div>
                  <h3 className="font-display text-base font-semibold text-[#F4F1E9] m-0">Compatibilité</h3>
                  <p className="text-xs text-white/50 m-0 mt-0.5">
                    Compare ton profil avec ton/ta partenaire — mental et intime.
                  </p>
                </div>
              </div>
              {!isUnlocked && <Lock size={16} className="text-white/30 flex-shrink-0" />}
            </div>

            {/* Progress bars */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/60 font-medium flex items-center gap-1.5">
                    <Brain size={12} /> Psychologique
                  </span>
                  <span className={`text-[11px] font-bold ${mentalOk ? 'text-[#E9A88C]' : 'text-white/40'}`}>
                    {mentalOk && <Check size={10} className="inline -mt-0.5 mr-0.5" />}
                    {mentalCompleted}/{MENTAL_THRESHOLD}
                  </span>
                </div>
                <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(244,241,233,.15)' }}>
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: barsMounted ? `${Math.min(100, (mentalCompleted / MENTAL_THRESHOLD) * 100)}%` : '0%',
                      transition: 'width 1s cubic-bezier(.2,.7,.3,1)',
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/60 font-medium flex items-center gap-1.5">
                    <Heart size={12} /> Vie intime
                  </span>
                  <span className={`text-[11px] font-bold ${sexualOk ? 'text-[#E9A88C]' : 'text-white/40'}`}>
                    {sexualOk && <Check size={10} className="inline -mt-0.5 mr-0.5" />}
                    {sexualCompleted}/{SEXUAL_THRESHOLD}
                  </span>
                </div>
                <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(244,241,233,.15)' }}>
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: barsMounted ? `${Math.min(100, (sexualCompleted / SEXUAL_THRESHOLD) * 100)}%` : '0%',
                      transition: 'width 1s cubic-bezier(.2,.7,.3,1) .15s',
                    }}
                  />
                </div>
              </div>
            </div>

            {isUnlocked ? (
              <>
                <button
                  onClick={() => navigate('/assessment/compatibility')}
                  className={`w-full rounded-[16px] border-none text-[15px] font-bold cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    hasKoris ? 'bg-accent text-white hover:bg-accent/90 shadow-soft' : 'bg-white/20 text-white/60 cursor-not-allowed'
                  }`}
                  style={{ padding: '6px 6px 6px 20px' }}
                >
                  <span className="tracking-tight">Tester la compatibilité</span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.16)' }}>
                    <img src="/kori.png" alt="" className="w-6 h-6 rounded-full object-cover" />
                    <span className="font-display text-[17px] font-semibold leading-none">{compatCost}</span>
                  </span>
                </button>
                <p className="flex items-center justify-center gap-1.5 mt-2 mb-0 text-xs font-semibold text-white/60">
                  <img src="/kori.png" alt="" className="w-4 h-4 rounded-full object-cover" />
                  Ton solde : <b className="text-white/80">{balance} Koris</b>
                </p>
              </>
            ) : (
              <div>
                {isClose && (
                  <p className="text-xs font-semibold text-[#E9A88C] text-center mb-3 m-0">
                    Plus que {totalMissing} test{totalMissing > 1 ? 's' : ''} et tu débloqueras la compatibilité !
                  </p>
                )}
                <button
                  onClick={() => navigate(worstCategory)}
                  className="w-full py-2.5 rounded-xl border border-white/12 bg-white/6 text-white/80 text-[13px] font-semibold cursor-pointer hover:bg-white/10 transition-colors"
                >
                  Continuer mes évaluations
                  <ChevronRight size={14} className="inline ml-1 -mt-0.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 7. Mon Espace card ── */}
        <button
          data-tooltip-id="btn-mon-espace"
          onClick={() => navigate('/mon-espace')}
          className="w-full bg-card border border-line rounded-card p-4 text-left cursor-pointer shadow-soft hover:shadow-lift hover:-translate-y-[3px] transition-all duration-200 group mb-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-soft flex items-center justify-center flex-shrink-0">
              <NotebookPen size={18} className="text-sage" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-ink m-0">Mon Espace</p>
              <p className="text-xs text-muted m-0 mt-0.5">Ton journal & Dr Lô, rien que pour toi</p>
            </div>
            <ChevronRight size={18} className="text-muted group-hover:text-ink transition-colors flex-shrink-0" />
          </div>
        </button>

      </div>
    </div>

    <PageTooltips pageKey="home" />
    </>
  );
};

export default AssessmentHomePage;

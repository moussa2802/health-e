import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Lock, Clock, HelpCircle, Info, Check, RefreshCw, Loader2, Play } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getScaleById, getScaleByCode } from '../../data/scales';
import { getScaleMeta, CATEGORY_COLORS, type ScaleCategory } from '../../utils/scaleMeta';
import TEST_ABOUT from '../../data/testAbout';
import TestHistoryPanel from '../../components/assessment/TestHistoryPanel';
import ConseilsCard from '../../components/assessment/ConseilsCard';
import SexualAccessGate from '../../components/assessment/SexualAccessGate';
import TestCode from '../../components/assessment/TestCode';
import ResultCard from '../../components/assessment/ResultCard';
import {
  getProfileProgress,
  createSession,
  getInProgressSessions,
} from '../../services/evaluationService';
import { getTestHistory, type ScaleResultHistoryEntry } from '../../services/testManagementService';
import {
  getAllGuestResults,
  createGuestSession,
  hasReachedGuestLimit,
  getGuestCount,
  getGuestInProgressSession,
} from '../../utils/guestSession';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getResultCardConfig } from '../../data/experiences';
import { shareResultCard } from '../../utils/shareCard';
import type { ScaleResult, ItemSeverity } from '../../types/assessment';
import { getBigFiveProfile, getBigFiveSummary, BAND_LABEL, type Band } from '../../utils/bigFiveProfile';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS, spendKorisForTest, isTestFreeRetake } from '../../services/korisService';
import KoriCta from '../../components/koris/KoriCta';

const CATEGORY_LABELS: Record<ScaleCategory, string> = {
  mental: 'Psychologique',
  sexual: 'Vie intime',
  bonus: 'Bonus',
};

const BF_BAND_COLORS: Record<Band, { bar: string; bg: string; text: string }> = {
  high: { bar: '#4A5D57', bg: '#E4EAE6', text: '#4A5D57' },
  mid:  { bar: '#A9A08C', bg: '#F1EEE4', text: '#4B4D55' },
  low:  { bar: '#B78A2E', bg: '#F1EAD6', text: '#B78A2E' },
};

const BigFiveDetailBlock: React.FC<{ result: ScaleResult }> = ({ result }) => {
  const dims = getBigFiveProfile(result);
  const summary = dims.length > 0 ? getBigFiveSummary(dims) : null;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (!summary || dims.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Dark header */}
      <div style={{
        background: '#17181B', borderRadius: 22, padding: 20, color: '#F1ECE1',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(23,24,27,.04), 0 8px 24px rgba(23,24,27,.06)',
      }}>
        <div style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          top: -70, right: -60,
          background: 'radial-gradient(circle at 35% 35%, rgba(183,138,46,.5), rgba(183,138,46,0) 70%)',
        }} />
        <div style={{
          position: 'relative', fontSize: 10.5, fontWeight: 700,
          letterSpacing: '.13em', textTransform: 'uppercase' as const, color: '#C0B9A6',
        }}>
          Ton profil
        </div>
        <h2 style={{
          position: 'relative', fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 25, fontWeight: 600, margin: '7px 0 0', lineHeight: 1.15,
        }}>
          {summary.title.replace(/,([^ ])/, ', $1').split(', ').map((part, i, arr) => {
            if (i === arr.length - 1 && arr.length > 1) {
              const words = part.split(' ');
              const lastWord = words.pop();
              return (
                <React.Fragment key={i}>
                  {i > 0 && <>,<br /></>}
                  {words.join(' ')}{words.length > 0 && ' '}<em style={{ fontStyle: 'italic', color: '#E5C88A' }}>{lastWord}</em>
                </React.Fragment>
              );
            }
            return <React.Fragment key={i}>{i > 0 && ', '}{part}</React.Fragment>;
          })}
        </h2>
        <p style={{
          position: 'relative', margin: '11px 0 0', fontSize: 13,
          lineHeight: 1.6, color: '#CFC9B7',
        }}>
          {summary.text}
        </p>
      </div>

      {/* Section header */}
      <div style={{
        marginTop: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <h2 style={{
          fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, fontWeight: 600, margin: 0,
        }}>
          Tes cinq dimensions
        </h2>
        <span style={{ fontSize: 11, color: '#8A8C95', fontWeight: 600 }}>BFI-10</span>
      </div>

      {/* Dimension cards */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {dims.map((dim, idx) => {
          const pct = ((dim.score - 2) / 8) * 100;
          const colors = BF_BAND_COLORS[dim.band];
          return (
            <div
              key={dim.key}
              role="group"
              aria-label={`${dim.label} : ${BAND_LABEL[dim.band]}`}
              style={{
                background: '#FFFFFF', border: '1px solid #E7E4DA',
                borderRadius: 16, padding: '14px 15px',
                boxShadow: '0 1px 2px rgba(23,24,27,.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{dim.label}</h3>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, borderRadius: 20,
                  padding: '3px 9px', whiteSpace: 'nowrap' as const,
                  background: colors.bg, color: colors.text,
                }}>
                  {BAND_LABEL[dim.band]}
                </span>
              </div>
              <div
                role="meter"
                aria-label={`${dim.label} : ${BAND_LABEL[dim.band]}`}
                aria-valuenow={dim.score}
                aria-valuemin={2}
                aria-valuemax={10}
                style={{
                  position: 'relative', height: 8, borderRadius: 20,
                  background: '#EEEADF', margin: '11px 0 9px', overflow: 'hidden',
                }}
              >
                <div style={{
                  display: 'block', height: '100%', borderRadius: 20,
                  background: colors.bar,
                  width: mounted ? `${pct}%` : '0%',
                  transition: prefersReduced ? 'none' : `width 1.1s cubic-bezier(.2,.8,.2,1) ${idx * 90}ms`,
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 9.5, color: '#B4AE9E', fontWeight: 600, marginTop: -4,
              }}>
                <span>Basse</span><span>Moyenne</span><span>Élevée</span>
              </div>
              <p style={{
                margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.55, color: '#4B4D55',
              }}>
                {dim.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Caveat */}
      <div style={{
        marginTop: 16, background: '#F1EEE4', borderRadius: 14,
        padding: '13px 14px', display: 'flex', gap: 10,
      }}>
        <Info size={15} style={{ color: '#8A8C95', flexShrink: 0, marginTop: 1 }} />
        <p style={{
          margin: 0, fontSize: 11.5, lineHeight: 1.55, color: '#4B4D55',
        }}>
          Version courte du Big Five : 2 questions par dimension. Elle donne une <b>tendance générale</b> fiable, mais pas une mesure fine — d'où les niveaux plutôt que des scores au dixième.
        </p>
      </div>
    </div>
  );
};

export const TestCodeRedirect: React.FC = () => {
  const { scaleId } = useParams<{ scaleId: string }>();
  const resolved = scaleId && /^[PVB]\d+$/i.test(scaleId) ? getScaleByCode(scaleId) : undefined;
  if (resolved) return <Navigate to={`/assessment/test/${resolved.id}`} replace />;
  return <TestDetailPage />;
};

const TestDetailPage: React.FC = () => {
  const { scaleId } = useParams<{ scaleId: string }>();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { balance, refreshBalance, setShowNoKorisModal } = useKoris();

  const [result, setResult] = useState<ScaleResult | null>(null);
  const [history, setHistory] = useState<ScaleResultHistoryEntry[]>([]);
  const [signatureValues, setSignatureValues] = useState<{ value: number; max: number }[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [showLoginWall, setShowLoginWall] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [pendingIsGuest, setPendingIsGuest] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const scale = scaleId ? getScaleById(scaleId) : undefined;
  const meta = scaleId ? getScaleMeta(scaleId) : undefined;

  const category: ScaleCategory = meta?.category ?? 'mental';
  const catColors = CATEGORY_COLORS[category];
  const iconBgClass = category === 'mental' ? 'bg-sage-soft' : category === 'sexual' ? 'bg-accent-soft' : 'bg-gold-soft';
  const iconColorClass = category === 'mental' ? 'text-sage' : category === 'sexual' ? 'text-accent' : 'text-gold';

  const isGuest = !isAuthenticated;
  const needsAccount = category === 'sexual' || category === 'bonus';

  const onboardingProfile = getOnboardingProfile();
  const prenom = onboardingProfile?.prenom;

  useEffect(() => {
    if (!scale || !scaleId) { setLoading(false); return; }

    if (isGuest) {
      const guestResults = getAllGuestResults();
      setResult(guestResults[scaleId] ?? null);
      const gip = getGuestInProgressSession(scaleId);
      if (gip) { setPendingSessionId(gip.id); setPendingIsGuest(true); }
      setLoading(false);
      return;
    }

    if (!currentUser) { setLoading(false); return; }

    (async () => {
      try {
        const progress = await getProfileProgress(currentUser.id);
        setResult(progress.scaleResults[scaleId] ?? null);
        setSignatureValues(progress.signatures?.[scaleId] ?? undefined);
        const hist = await getTestHistory(currentUser.id, scaleId);
        setHistory(hist);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
    getInProgressSessions(currentUser.id)
      .then(ips => {
        const ip = ips.find(s => s.selectedScaleIds.includes(scaleId));
        if (ip) { setPendingSessionId(ip.id); setPendingIsGuest(false); }
      })
      .catch(() => {});
  }, [scaleId, isAuthenticated, currentUser?.id]);

  if (!scale || !meta || !scaleId) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink font-semibold">Test introuvable</p>
          <button
            onClick={() => navigate('/assessment')}
            className="mt-3 text-accent text-sm font-semibold bg-transparent border-none cursor-pointer"
          >
            Retour au hub
          </button>
        </div>
      </div>
    );
  }

  const Icon = meta.icon;
  const isDone = !!result;
  const interpretation = result
    ? scale.interpretation.find(r => result.totalScore >= r.min && result.totalScore <= r.max)
      ?? scale.interpretation[scale.interpretation.length - 1]
    : null;

  const isFreeRetake = isDone && isTestFreeRetake(result?.completedAt);
  const testCostLabel = isGuest
    ? ''
    : isFreeRetake
      ? ' — gratuit'
      : ` — ${KORIS_COSTS.test} Kori`;

  const startTest = async () => {
    setErrorMsg(null);

    if (isGuest && needsAccount) {
      navigate(`/patient/access?redirect=/assessment/test/${scaleId}`);
      return;
    }

    if (isGuest) {
      if (hasReachedGuestLimit()) {
        setShowLoginWall(true);
        return;
      }
      const gs = createGuestSession(scaleId);
      navigate(`/assessment/quiz/${gs.id}?guest=true`);
      return;
    }

    if (!currentUser) return;

    if (category === 'sexual') {
      setShowGate(true);
      return;
    }

    await doStartTest();
  };

  const doStartTest = async () => {
    if (!currentUser || !scaleId) return;
    setStarting(true);
    try {
      const lastTakenAt = result?.completedAt ?? null;
      const spendResult = await spendKorisForTest({ [scaleId]: lastTakenAt });
      if (!spendResult.ok) {
        setShowNoKorisModal(true);
        setErrorMsg(`Solde insuffisant (${spendResult.required ?? KORIS_COSTS.test} Koris requis).`);
        return;
      }
      const session = await createSession(currentUser.id, [scaleId]);
      navigate(`/assessment/quiz/${session.id}`);
    } catch {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const session = await createSession(currentUser.id, [scaleId]);
        navigate(`/assessment/quiz/${session.id}`);
      } catch {
        setErrorMsg('Connexion instable. Réessaie dans quelques secondes.');
      }
    } finally {
      setStarting(false);
      refreshBalance();
    }
  };

  const handleGateGranted = async () => {
    setShowGate(false);
    if (!currentUser) return;
    await doStartTest();
  };

  if (showGate) {
    return (
      <SexualAccessGate
        userId={currentUser?.id ?? null}
        onGranted={handleGateGranted}
      />
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-[600px] mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/assessment')}
            className="w-9 h-9 rounded-xl border border-line bg-card flex items-center justify-center cursor-pointer hover:bg-paper-dark transition-colors flex-shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft size={18} className="text-ink" />
          </button>
          <span className="text-sm font-semibold text-muted">
            {CATEGORY_LABELS[category]}
          </span>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-5 pt-6 pb-12">

        {/* ── Identity ── */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
            <Icon size={26} className={iconColorClass} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-semibold text-ink m-0 leading-snug tracking-tight">
              {meta.label}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <TestCode scaleId={scaleId} size="md" />
              <span className={`text-[11px] font-semibold px-2.5 py-[3px] rounded-[20px] ${iconBgClass} ${iconColorClass}`}>
                {CATEGORY_LABELS[category]}
              </span>
              <span className="text-[11px] text-ink-soft font-semibold bg-[#F1EEE4] px-2.5 py-[3px] rounded-[20px]">
                {scale.timeEstimateMinutes} min · {scale.items.length} q
              </span>
            </div>
          </div>
        </div>

        {/* ── CTA button ── */}
        {isGuest && needsAccount ? (
          <button
            onClick={() => navigate(`/patient/access?redirect=/assessment/test/${scaleId}`)}
            className="w-full py-3.5 rounded-[14px] border-none text-sm font-bold cursor-pointer flex items-center justify-center gap-2.5 bg-ink/8 text-ink-soft transition-colors hover:bg-ink/12 mb-6"
          >
            <Lock size={15} />
            Créer un compte pour faire ce test
          </button>
        ) : isGuest ? (
          <button
            onClick={startTest}
            disabled={starting}
            className="w-full py-[15px] rounded-[16px] border-none text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2.5 bg-ink text-[#F4F1E9] shadow-soft transition-colors hover:bg-ink/90 mb-5 disabled:opacity-60"
          >
            {starting ? <><Loader2 size={17} className="animate-spin" /> Chargement…</> : 'Faire le test'}
          </button>
        ) : pendingSessionId ? (
          <div className="flex flex-col gap-2.5 mb-5">
            <button
              onClick={() => navigate(`/assessment/quiz/${pendingSessionId}${pendingIsGuest ? '?guest=true' : ''}`)}
              className="w-full py-[15px] rounded-[16px] border-none text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2.5 shadow-soft transition-colors hover:opacity-90"
              style={{ background: catColors.accent, color: '#fff' }}
            >
              <Play size={15} fill="currentColor" /> Reprendre le test
            </button>
            <KoriCta
              label="Recommencer à zéro"
              cost={KORIS_COSTS.test}
              isFree={isFreeRetake}
              freeReason={isFreeRetake ? 'Ton dernier passage date de plus de 30 jours' : undefined}
              loading={starting}
              onClick={startTest}
              variant="outline"
            />
          </div>
        ) : (
          <KoriCta
            label={isDone ? 'Refaire le test' : 'Faire le test'}
            cost={KORIS_COSTS.test}
            isFree={isFreeRetake}
            freeReason={isFreeRetake ? 'Ton dernier passage date de plus de 30 jours' : undefined}
            loading={starting}
            onClick={startTest}
            className="mb-5"
          />
        )}

        {errorMsg && (
          <p className="text-xs text-danger font-semibold text-center -mt-4 mb-4">{errorMsg}</p>
        )}

        {/* ── Login wall (guest limit) ── */}
        {showLoginWall && (
          <div className="bg-card border border-line rounded-card p-5 mb-6 text-center shadow-soft">
            <p className="text-sm font-semibold text-ink mb-1">Limite d'essais gratuits atteinte</p>
            <p className="text-xs text-muted mb-3">Crée un compte pour continuer tes évaluations.</p>
            <button
              onClick={() => navigate(`/patient/access?redirect=/assessment/test/${scaleId}`)}
              className="bg-accent text-white font-bold text-sm px-6 py-2.5 rounded-xl border-none cursor-pointer hover:bg-accent/90 transition-colors"
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* ── Result card ── */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted text-sm">
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </div>
        ) : isDone && result && interpretation ? (
          <ResultCard
            ref={cardRef}
            scale={scale}
            result={result}
            size="compact"
            signatureValues={signatureValues}
            onShare={() => {
              if (cardRef.current) shareResultCard(cardRef.current, scale.id);
            }}
          />
        ) : !isDone ? (
          <ResultCard scale={scale} size="compact" />
        ) : null}

        {/* ── History ── */}
        {isDone && result && isAuthenticated && (
          <TestHistoryPanel
            scaleId={scaleId}
            scaleName={meta.label}
            scoreMax={scale.scoreRange.max}
            currentScore={result.totalScore}
            currentLabel={interpretation?.label ?? ''}
            currentSeverity={interpretation?.severity ?? 'none'}
            currentDate={result.completedAt}
            history={history.map(h => ({
              id: h.id,
              attemptNumber: h.attemptNumber,
              totalScore: h.totalScore,
              subscaleScores: h.subscaleScores,
              interpretation: { label: h.interpretation.label, severity: h.interpretation.severity },
              completedAt: h.completedAt,
            }))}
            bigFiveMode={scaleId === 'big_five'}
            currentSubscaleScores={scaleId === 'big_five' ? result.subscaleScores : undefined}
          />
        )}

        {/* ── About this test ── */}
        <div className="bg-card border border-line rounded-block p-5 mt-4 shadow-soft">
          <p className="text-[11px] font-bold text-muted uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5">
            <Info size={12} /> À propos de ce test
          </p>
          <p className="text-[13.5px] text-ink-soft leading-relaxed mt-3 m-0">
            <span className="font-bold text-ink">Le test. </span>
            {meta.description}
          </p>
          {TEST_ABOUT[scaleId] && (
            <p className="text-[13.5px] text-ink-soft leading-relaxed mt-3 m-0">
              <span className="font-bold text-ink">{meta.label}. </span>
              {TEST_ABOUT[scaleId]}
            </p>
          )}
        </div>

        {/* ── AI Conseils ── */}
        {isDone && result && isAuthenticated && currentUser && interpretation && (
          <div className="mt-5">
            <ConseilsCard
              userId={currentUser.id}
              scaleId={scaleId}
              scaleName={meta.label}
              score={result.totalScore}
              scoreMax={scale.scoreRange.max}
              niveau={interpretation.label}
              severity={interpretation.severity}
              prenom={prenom}
              interpretation={interpretation.description}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default TestDetailPage;

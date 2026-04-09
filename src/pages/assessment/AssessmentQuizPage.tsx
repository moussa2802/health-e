import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  getSession,
  saveAnswer,
  computeAndSaveScaleResult,
  finalizeSession,
  saveScaleResultToProfile,
} from '../../services/evaluationService';
import {
  getGuestSession,
  saveGuestAnswer,
  computeGuestResult,
  guestToUserSession,
} from '../../utils/guestSession';
import { getScaleById, getAdaptedScaleById } from '../../data/scales';
import type { UserAssessmentSession, AssessmentScale } from '../../types/assessment';
import QuestionItem from '../../components/assessment/QuestionItem';
import { triggerDrLoMentalHealth, triggerDrLoSexualHealth, triggerDrLoSynthesis } from '../../utils/drLoAnalysis';
import { MENTAL_HEALTH_SCALES } from '../../data/scales';
import { getSexualHealthFilter } from '../../utils/sexualHealthFilter';
import { resolveScaleGender } from '../../utils/gender';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { archiveCurrentResult } from '../../services/testManagementService';

// ── Thème par catégorie ───────────────────────────────────────────────────────
function getTheme(category?: string) {
  const isSexual = category === 'sexual_health';
  return {
    accent1: isSexual ? '#C026D3' : '#3B82F6',
    accent2: isSexual ? '#EC4899' : '#2DD4BF',
    pageBg: isSexual
      ? 'linear-gradient(160deg, #FFF0F9 0%, #FAFAFA 55%, #F5F0FF 100%)'
      : 'linear-gradient(160deg, #EFF6FF 0%, #FAFFFE 55%, #F0FDF4 100%)',
    cardBorder: isSexual ? 'rgba(192,38,211,0.12)' : 'rgba(59,130,246,0.12)',
    badgeBg: isSexual ? '#FFF0F9' : '#EFF6FF',
    badgeColor: isSexual ? '#C026D3' : '#3B82F6',
    label: isSexual ? 'Vie intime' : 'Profil psychologique',
  };
}

const SCALE_ICONS: Record<string, string> = {
  gad7: '😰', phq9: '💙', big_five: '🌟', ecr_r: '🫶',
  rses: '💪', brs: '🌱', pss10: '⚡', ace: '🧩',
  pcl5: '🌀', pg13: '🕊️', ceca_q: '👶', social_pressure: '🌍',
  religious_cultural: '✨', economic_stress: '💰',
  nsss: '❤️', sdi2: '🔥', sis_ses: '⚖️', fsfi: '🌸',
  iief: '💙', tsi_base: '🧩', pair: '🫂', sise: '🪞',
  social_pressure_sex: '🤐', griss_base: '💑',
};

// ── Composant principal ───────────────────────────────────────────────────────
const AssessmentQuizPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGuestMode = searchParams.get('guest') === 'true';

  const [session, setSession] = useState<UserAssessmentSession | null>(null);
  const [currentScale, setCurrentScale] = useState<AssessmentScale | null>(null);
  const [localAnswers, setLocalAnswers] = useState<Record<number, number>>({});
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');

  // Charger la session
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);

    if (isGuestMode) {
      const guestSession = getGuestSession(sessionId);
      if (!guestSession) {
        setError('Session introuvable. Veuillez recommencer une nouvelle évaluation.');
        setLoading(false);
        return;
      }
      if (guestSession.status === 'completed') {
        navigate(`/assessment/results/${sessionId}?guest=true`, { replace: true });
        setLoading(false);
        return;
      }
      const s = guestToUserSession(guestSession);
      setSession(s);
      const sexProfile = getSexualHealthFilter()?.experienceProfile;
      const rawScale = getAdaptedScaleById(guestSession.scaleId, sexProfile) ?? getScaleById(guestSession.scaleId);
      if (rawScale) {
        const userGender = getOnboardingProfile()?.genre ?? 'homme';
        setCurrentScale(resolveScaleGender(rawScale, userGender));
        setLocalAnswers(guestSession.answers);
      }
      setLoading(false);
      return;
    }

    getSession(sessionId)
      .then((s) => {
        if (!s) { setError('Session introuvable. Veuillez recommencer une nouvelle évaluation.'); return; }
        if (s.status === 'completed') { navigate(`/assessment/results/${sessionId}`, { replace: true }); return; }
        setSession(s);
        const sexProfile = getSexualHealthFilter()?.experienceProfile;
        const rawScale = getAdaptedScaleById(s.selectedScaleIds[s.currentScaleIndex], sexProfile)
          ?? getScaleById(s.selectedScaleIds[s.currentScaleIndex]);
        if (rawScale) {
          const userGender = getOnboardingProfile()?.genre ?? 'homme';
          setCurrentScale(resolveScaleGender(rawScale, userGender));
          setLocalAnswers(s.answers[rawScale.id] ?? {});
        }
      })
      .catch(() => setError('Erreur lors du chargement de la session.'))
      .finally(() => setLoading(false));
  }, [sessionId, navigate, isGuestMode]);

  const scaleIndex = session?.currentScaleIndex ?? 0;
  const totalScales = session?.selectedScaleIds.length ?? 0;
  const items = currentScale?.items ?? [];
  const currentItem = items[currentItemIndex] ?? null;

  const visibleItems = items.filter((item) => {
    if (!item.conditional) return true;
    const depAnswer = localAnswers[item.conditional.itemId];
    return depAnswer === item.conditional.value;
  });

  const currentVisibleIndex = visibleItems.findIndex((i) => i.id === currentItem?.id);
  const totalVisible = visibleItems.length;

  const progressOverall = totalScales > 0
    ? ((scaleIndex / totalScales) + (totalVisible > 0 ? (currentVisibleIndex + 1) / totalVisible / totalScales : 0)) * 100
    : 0;

  const handleAnswer = useCallback(async (value: number) => {
    if (!currentItem || !sessionId || !currentScale) return;
    const newAnswers = { ...localAnswers, [currentItem.id]: value };
    setLocalAnswers(newAnswers);
    try {
      if (isGuestMode) saveGuestAnswer(sessionId, currentItem.id, value);
      else await saveAnswer(sessionId, currentScale.id, currentItem.id, value);
    } catch { /* silencieux */ }
  }, [currentItem, sessionId, currentScale, localAnswers, isGuestMode]);

  const canGoNext = currentItem ? localAnswers[currentItem.id] !== undefined : false;

  // Ref to always have latest handleNext for auto-advance
  const handleNextRef = useRef<() => void>(() => {});

  const handleNext = useCallback(async () => {
    if (!session || !currentScale || !sessionId) return;
    const nextVisibleIndex = currentVisibleIndex + 1;

    if (nextVisibleIndex < totalVisible) {
      setSlideDir('left');
      setTransitioning(true);
      setTimeout(() => {
        const nextItem = visibleItems[nextVisibleIndex];
        const itemIndex = items.findIndex((i) => i.id === nextItem.id);
        setCurrentItemIndex(itemIndex >= 0 ? itemIndex : currentItemIndex + 1);
        setTransitioning(false);
      }, 220);
    } else {
      setSubmitting(true);
      try {
        if (isGuestMode) {
          const guestResult = computeGuestResult(sessionId);
          if (!guestResult) throw new Error('Erreur lors du calcul du résultat.');
          navigate(`/assessment/results/${sessionId}?guest=true`);
          return;
        }
        const scaleResult = await computeAndSaveScaleResult(sessionId, currentScale.id, localAnswers);
        const nextScaleIndex = scaleIndex + 1;
        if (nextScaleIndex >= totalScales) {
          await finalizeSession(sessionId);
          if (session.userId) {
            try {
              // Archive le résultat existant avant de sauvegarder le nouveau (si retake)
              try {
                await archiveCurrentResult(session.userId, currentScale.id, {});
              } catch { /* Pas de résultat existant — premier passage */ }
              await saveScaleResultToProfile(session.userId, currentScale.id, scaleResult);
              const isMentalScale = MENTAL_HEALTH_SCALES.some(s => s.id === currentScale.id);
              if (isMentalScale) {
                triggerDrLoMentalHealth(session.userId).catch((e) => console.error('[DrLo mental]', e));
              } else {
                triggerDrLoSexualHealth(session.userId).catch((e) => console.error('[DrLo sexual]', e));
              }
              triggerDrLoSynthesis(session.userId).catch((e) => console.error('[DrLo synthesis]', e));
            } catch { /* silencieux */ }
          }
          navigate(`/assessment/results/${sessionId}`);
        } else {
          setSlideDir('left');
          setTransitioning(true);
          setTimeout(() => {
            const nextScaleId = session.selectedScaleIds[nextScaleIndex];
            const rawNext = getAdaptedScaleById(nextScaleId, getSexualHealthFilter()?.experienceProfile)
              ?? getScaleById(nextScaleId);
            if (rawNext) {
              const userGender = getOnboardingProfile()?.genre ?? 'homme';
              setSession({ ...session, currentScaleIndex: nextScaleIndex });
              setCurrentScale(resolveScaleGender(rawNext, userGender));
              setLocalAnswers(session.answers[rawNext.id] ?? {});
              setCurrentItemIndex(0);
            }
            setTransitioning(false);
          }, 220);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
      } finally {
        setSubmitting(false);
      }
    }
  }, [
    session, currentScale, sessionId, currentVisibleIndex, totalVisible,
    visibleItems, items, currentItemIndex, localAnswers, scaleIndex, totalScales, navigate, isGuestMode,
  ]);

  // Keep ref in sync
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  const handlePrev = () => {
    if (currentVisibleIndex > 0) {
      setSlideDir('right');
      setTransitioning(true);
      setTimeout(() => {
        const prevItem = visibleItems[currentVisibleIndex - 1];
        const itemIndex = items.findIndex((i) => i.id === prevItem.id);
        setCurrentItemIndex(itemIndex >= 0 ? itemIndex : currentItemIndex - 1);
        setTransitioning(false);
      }, 180);
    }
  };

  const isLastItemOfScale = currentVisibleIndex === totalVisible - 1;
  const isLastScale = scaleIndex === totalScales - 1;

  const theme = getTheme(currentScale?.category);
  const scaleIcon = currentScale ? (SCALE_ICONS[currentScale.id] ?? '📋') : '📋';

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFF' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '3px solid #3B82F6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: '#64748B', fontSize: 14 }}>Chargement de votre évaluation…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFF', padding: '0 20px' }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(220,38,38,0.15)', padding: '36px 32px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A2342', marginBottom: 8 }}>Une erreur est survenue</h2>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>{error}</p>
          <button
            onClick={() => navigate('/assessment')}
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2DD4BF)', border: 'none', borderRadius: 12, padding: '11px 28px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
          >
            Recommencer
          </button>
        </div>
      </div>
    );
  }

  if (!session || !currentScale || !currentItem) return null;

  return (
    <div style={{ minHeight: '100vh', background: theme.pageBg, fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        .option-btn:hover:not(:disabled) { transform: translateY(-1px) !important; box-shadow: 0 4px 16px rgba(59,130,246,0.13) !important; }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${theme.cardBorder}`,
        boxShadow: '0 2px 20px rgba(0,0,0,0.04)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '13px 20px 11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            {/* Scale icon + name */}
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            }}>
              {scaleIcon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: theme.accent1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {theme.label} · Évaluation {scaleIndex + 1}/{totalScales}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentScale.shortName} — {currentScale.name}
              </p>
            </div>
            {/* Question counter */}
            <div style={{
              background: theme.badgeBg,
              border: `1px solid ${theme.accent1}25`,
              borderRadius: 20, padding: '3px 11px',
              fontSize: 12, fontWeight: 800, color: theme.accent1,
              flexShrink: 0,
            }}>
              {currentVisibleIndex + 1} / {totalVisible}
            </div>
            {/* Abandon */}
            <button
              onClick={() => setShowAbandonConfirm(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#94A3B8', borderRadius: 8, flexShrink: 0, fontSize: 18, lineHeight: 1 }}
              title="Abandonner"
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, background: `${theme.accent1}18`, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressOverall}%`,
              background: `linear-gradient(90deg, ${theme.accent1}, ${theme.accent2})`,
              borderRadius: 99,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', padding: '86px 20px 110px', boxSizing: 'border-box' }}>

        {/* Scale instructions (shown only on first question of a scale) */}
        {currentVisibleIndex === 0 && currentScale.instructions && (
          <div style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${theme.cardBorder}`,
            borderRadius: 16,
            padding: '14px 18px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💬</span>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              {currentScale.instructions}
            </p>
          </div>
        )}

        {/* Question card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1.5px solid ${theme.cardBorder}`,
            borderRadius: 22,
            padding: '28px 26px 26px',
            boxShadow: `0 8px 40px ${theme.accent1}10, 0 2px 8px rgba(0,0,0,0.04)`,
            animation: transitioning
              ? 'fadeOut 0.18s ease forwards'
              : slideDir === 'left'
                ? 'slideInLeft 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                : 'slideInRight 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          }}
        >
          {/* Question number chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              height: 28,
              padding: '0 12px',
              borderRadius: 20,
              background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
              letterSpacing: '0.04em',
            }}>
              Q.{currentVisibleIndex + 1}
            </div>
            {/* Mini dots progress */}
            <div style={{ display: 'flex', gap: 4, flex: 1, overflow: 'hidden' }}>
              {Array.from({ length: Math.min(totalVisible, 20) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 4,
                    flex: 1,
                    borderRadius: 99,
                    background: i <= currentVisibleIndex
                      ? `linear-gradient(90deg, ${theme.accent1}, ${theme.accent2})`
                      : `${theme.accent1}18`,
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>

          <QuestionItem
            item={currentItem}
            value={localAnswers[currentItem.id]}
            onChange={handleAnswer}
            disabled={submitting}
            accentColor={theme.accent1}
            accentColor2={theme.accent2}
            scaleId={currentScale.id}
          />
        </div>
      </div>

      {/* ── Bottom navigation (floating) ─────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 648, margin: '0 auto',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: `1.5px solid ${theme.cardBorder}`,
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        }}>
          {/* Précédent */}
          <button
            onClick={handlePrev}
            disabled={currentVisibleIndex === 0 || submitting}
            style={{
              width: 48, height: 48, borderRadius: 13, flexShrink: 0,
              border: `1.5px solid ${theme.accent1}22`,
              background: currentVisibleIndex === 0 ? '#F8FAFF' : theme.badgeBg,
              color: currentVisibleIndex === 0 ? '#CBD5E1' : theme.accent1,
              fontSize: 20,
              cursor: currentVisibleIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease',
              opacity: currentVisibleIndex === 0 ? 0.5 : 1,
            }}
          >
            ←
          </button>

          {/* Suivant / Terminer */}
          <button
            onClick={handleNext}
            disabled={!canGoNext || submitting}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 13,
              border: 'none',
              background: canGoNext && !submitting
                ? `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`
                : '#F1F5F9',
              color: canGoNext && !submitting ? '#fff' : '#94A3B8',
              fontSize: 14,
              fontWeight: 700,
              cursor: canGoNext && !submitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.18s ease',
              boxShadow: canGoNext && !submitting ? `0 4px 20px ${theme.accent1}35` : 'none',
              letterSpacing: '0.01em',
            }}
          >
            {submitting ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Calcul en cours…
              </>
            ) : isLastItemOfScale ? (
              isLastScale ? '✓ Terminer l\'évaluation' : 'Évaluation suivante →'
            ) : (
              'Suivant →'
            )}
          </button>
        </div>
      </div>

      {/* ── Modal abandon ─────────────────────────────────────────────────── */}
      {showAbandonConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 22, padding: '28px 26px',
            maxWidth: 360, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            animation: 'slideInLeft 0.2s ease',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
              ⚠️
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
              Abandonner l'évaluation ?
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              Vos réponses actuelles seront perdues. Êtes-vous sûr(e) de vouloir arrêter ?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowAbandonConfirm(false)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: '1.5px solid rgba(148,163,184,0.3)',
                  background: '#F8FAFF', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Continuer
              </button>
              <button
                onClick={() => navigate('/assessment')}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                }}
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentQuizPage;

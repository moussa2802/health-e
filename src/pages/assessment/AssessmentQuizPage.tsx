import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { X, ArrowLeft, ChevronRight, Loader2, Phone, Upload } from 'lucide-react';
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
import { getSexualHealthFilter } from '../../utils/sexualHealthFilter';
import { resolveScaleGender } from '../../utils/gender';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { archiveCurrentResult } from '../../services/testManagementService';
import { getScaleMeta, getScaleCategory, getCategoryColor } from '../../utils/scaleMeta';
import { getExperience, getResultCardConfig } from '../../data/experiences';
import TestSignature from '../../components/assessment/TestSignature';
import ResultCard from '../../components/assessment/ResultCard';
import { computeResponseQuality } from '../../utils/responseQuality';
import type { ResponseQuality } from '../../utils/responseQuality';
import { getCrisisResources } from '../../data/crisisResources';
import { shareResultCard } from '../../utils/shareCard';

function getThemeColors(category?: string) {
  const cat = category === 'sexual_health' ? 'sexual' : category === 'bonus' ? 'bonus' : 'mental';
  const colors = getCategoryColor(cat as any);
  return {
    accent: colors.accent,
    pageBg: '#F3F1EA',
    cardBorder: `${colors.accent}18`,
    badgeBg: `${colors.accent}08`,
    label: category === 'sexual_health' ? 'Vie intime' : category === 'bonus' ? 'Bonus' : 'Profil psychologique',
  };
}

function computeResumePosition(
  scale: AssessmentScale,
  answers: Record<number, number>,
): { answered: number; total: number; targetItemIndex: number } | null {
  const vis = scale.items.filter(item => {
    if (!item.conditional) return true;
    return answers[item.conditional.itemId] === item.conditional.value;
  });
  const answered = vis.filter(item => answers[item.id] !== undefined).length;
  if (answered === 0) return null;
  if (answered >= vis.length) {
    const last = vis[vis.length - 1];
    return { answered, total: vis.length, targetItemIndex: Math.max(0, scale.items.findIndex(i => i.id === last.id)) };
  }
  const firstUnanswered = vis.findIndex(item => answers[item.id] === undefined);
  const target = vis[firstUnanswered];
  return { answered, total: vis.length, targetItemIndex: Math.max(0, scale.items.findIndex(i => i.id === target.id)) };
}

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
  const [resumeInfo, setResumeInfo] = useState<{ answered: number; total: number; targetItemIndex: number } | null>(null);
  const [chapterTransition, setChapterTransition] = useState<{ title: string; text: string; chapterIndex: number } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [showIntro, setShowIntro] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [finalNavPath, setFinalNavPath] = useState<string | null>(null);
  const [answerTimesMs, setAnswerTimesMs] = useState<number[]>([]);
  const questionShownAtRef = useRef(Date.now());
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const responseQualityRef = useRef<ResponseQuality | null>(null);
  const [supportScreen, setSupportScreen] = useState<{ message: string } | null>(null);
  const [finalResult, setFinalResult] = useState<import('../../types/assessment').ScaleResult | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
        const genderedScale = resolveScaleGender(rawScale, userGender);
        setCurrentScale(genderedScale);
        const answers = guestSession.answers;
        setLocalAnswers(answers);
        const rp = computeResumePosition(genderedScale, answers);
        if (rp && rp.answered < rp.total) {
          setResumeInfo(rp);
        } else if (rp) {
          setCurrentItemIndex(rp.targetItemIndex);
        }
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
          const genderedScale = resolveScaleGender(rawScale, userGender);
          setCurrentScale(genderedScale);
          const answers = s.answers[rawScale.id] ?? {};
          setLocalAnswers(answers);
          const rp = computeResumePosition(genderedScale, answers);
          if (rp && rp.answered < rp.total) {
            setResumeInfo(rp);
          } else if (rp) {
            setCurrentItemIndex(rp.targetItemIndex);
          }
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

  const experience = currentScale ? getExperience(currentScale.id) : null;

  const progressOverall = totalScales > 0
    ? ((scaleIndex / totalScales) + (totalVisible > 0 ? (currentVisibleIndex + 1) / totalVisible / totalScales : 0)) * 100
    : 0;

  const chapters = experience?.chapters;
  const chapterInfo = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    let acc = 0;
    for (let ci = 0; ci < chapters.length; ci++) {
      if (currentVisibleIndex < acc + chapters[ci].itemCount) {
        return { index: ci, startIndex: acc, localIndex: currentVisibleIndex - acc, chapter: chapters[ci] };
      }
      acc += chapters[ci].itemCount;
    }
    const last = chapters.length - 1;
    const lastStart = chapters.reduce((s, c, i) => i < last ? s + c.itemCount : s, 0);
    return { index: last, startIndex: lastStart, localIndex: currentVisibleIndex - lastStart, chapter: chapters[last] };
  }, [chapters, currentVisibleIndex]);

  const milestoneMsg = experience?.milestones?.[currentVisibleIndex + 1] ?? null;

  const handleAnswer = useCallback(async (value: number) => {
    if (!currentItem || !sessionId || !currentScale) return;
    const newAnswers = { ...localAnswers, [currentItem.id]: value };
    setLocalAnswers(newAnswers);
    setAnswerTimesMs(prev => [...prev, Date.now() - questionShownAtRef.current]);

    const isAlertItem = currentScale.alertItems?.some(a => a.itemId === currentItem.id);

    const exp = getExperience(currentScale.id);
    if (exp.input === 'frequency-strip' && currentItem.type === 'frequency' && !currentItem.noScore && !isAlertItem) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        handleNextRef.current();
      }, 420);
    }
    if (exp.input === 'agreement-scale' && !isAlertItem) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        handleNextRef.current();
      }, 520);
    }
    if (exp.input === 'binary' && exp.tone === 'playful' && !isAlertItem) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        handleNextRef.current();
      }, 420);
    }
    if (exp.input === 'forced-choice' && !isAlertItem) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        handleNextRef.current();
      }, 420);
    }

    if (isAlertItem) {
      const triggered = currentScale.alertItems!.find(a => a.itemId === currentItem.id && value >= a.minValue && a.alertLevel === 3);
      if (triggered) {
        const userGender = getOnboardingProfile()?.genre ?? 'homme';
        const msg = triggered.message
          .replace(/\{\{([^|]+)\|([^}]+)\}\}/g, (_, m, f) => userGender === 'femme' ? f : m);
        setSupportScreen({ message: msg });
      }
    }

    try {
      if (isGuestMode) saveGuestAnswer(sessionId, currentItem.id, value);
      else await saveAnswer(sessionId, currentScale.id, currentItem.id, value);
    } catch { /* silencieux */ }
  }, [currentItem, sessionId, currentScale, localAnswers, isGuestMode]);

  const canGoNext = currentItem ? localAnswers[currentItem.id] !== undefined : false;

  const handleNextRef = useRef<() => void>(() => {});

  const handleNext = useCallback(async () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (!session || !currentScale || !sessionId) return;
    const nextVisibleIndex = currentVisibleIndex + 1;

    if (nextVisibleIndex < totalVisible) {
      if (chapters && chapters.length > 1 && chapterInfo) {
        let acc = 0;
        for (let ci = 0; ci < chapters.length; ci++) {
          acc += chapters[ci].itemCount;
          if (nextVisibleIndex === acc && ci + 1 < chapters.length && chapters[ci + 1].transition) {
            const nextItem = visibleItems[nextVisibleIndex];
            const itemIndex = items.findIndex((i) => i.id === nextItem.id);
            setCurrentItemIndex(itemIndex >= 0 ? itemIndex : currentItemIndex + 1);
            setChapterTransition({ title: chapters[ci + 1].title, text: chapters[ci + 1].transition!, chapterIndex: ci + 1 });
            return;
          }
        }
      }
      setSlideDir('left');
      setTransitioning(true);
      setTimeout(() => {
        const nextItem = visibleItems[nextVisibleIndex];
        const itemIndex = items.findIndex((i) => i.id === nextItem.id);
        setCurrentItemIndex(itemIndex >= 0 ? itemIndex : currentItemIndex + 1);
        setTransitioning(false);
      }, 220);
    } else {
      const scorableValues = currentScale.items
        .filter(i => !i.noScore)
        .map(i => localAnswers[i.id])
        .filter((v): v is number => v !== undefined);
      responseQualityRef.current = computeResponseQuality(answerTimesMs, scorableValues);
      const navState = { state: { responseQuality: responseQualityRef.current } };

      setSubmitting(true);
      try {
        if (isGuestMode) {
          const guestResult = computeGuestResult(sessionId);
          if (!guestResult) throw new Error('Erreur lors du calcul du résultat.');
          const guestExp = getExperience(currentScale.id);
          if (guestExp.finalScreen) {
            setFinalResult(guestResult);
            setFinalNavPath(`/assessment/results/${sessionId}?guest=true`);
            setShowFinal(true);
            setSubmitting(false);
          } else {
            navigate(`/assessment/results/${sessionId}?guest=true`, navState);
          }
          return;
        }
        const scaleResult = await computeAndSaveScaleResult(sessionId, currentScale.id, localAnswers);
        const nextScaleIndex = scaleIndex + 1;
        if (nextScaleIndex >= totalScales) {
          await finalizeSession(sessionId);
          if (session.userId) {
            try {
              try {
                await archiveCurrentResult(session.userId, currentScale.id, {});
              } catch { /* premier passage */ }
              await saveScaleResultToProfile(session.userId, currentScale.id, scaleResult, signatureAnswers);
            } catch { /* silencieux */ }
          }
          const regExp = getExperience(currentScale.id);
          if (regExp.finalScreen) {
            setFinalResult(scaleResult);
            setFinalNavPath(`/assessment/results/${sessionId}`);
            setShowFinal(true);
          } else {
            navigate(`/assessment/results/${sessionId}`, navState);
          }
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
    chapters, chapterInfo,
  ]);

  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  const handlePrev = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
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

  const theme = getThemeColors(currentScale?.category);
  const scaleMeta = currentScale ? getScaleMeta(currentScale.id) : null;
  const ScaleIcon = scaleMeta?.icon;

  const signatureAnswers = useMemo(() => {
    if (!currentScale) return [];
    return currentScale.items
      .filter(item => !item.noScore && localAnswers[item.id] !== undefined)
      .map(item => ({
        value: localAnswers[item.id],
        max: Math.max(...item.options.map(o => o.value)),
      }));
  }, [currentScale, localAnswers]);

  const scorableItemCount = currentScale?.items.filter(i => !i.noScore).length ?? 7;

  useEffect(() => {
    if (currentScale) {
      const exp = getExperience(currentScale.id);
      if (exp.introScreen && currentVisibleIndex === 0 && !resumeInfo) {
        setShowIntro(true);
      }
      setAnswerTimesMs([]);
    }
  }, [currentScale?.id]);

  useEffect(() => {
    questionShownAtRef.current = Date.now();
  }, [currentItemIndex]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F3F1EA' }}>
        <div className="text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-4" style={{ color: '#4A5D57' }} />
          <p className="text-ink-light text-sm">Chargement de votre évaluation…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: '#F3F1EA' }}>
        <div style={{
          background: '#fff', borderRadius: 20, border: '1px solid rgba(220,38,38,0.15)',
          padding: '36px 32px', maxWidth: 420, width: '100%', textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h2 className="font-display text-lg font-semibold text-ink mb-2">Une erreur est survenue</h2>
          <p className="text-sm text-ink-light mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/assessment')}
            style={{
              background: '#4A5D57', border: 'none', borderRadius: 12,
              padding: '11px 28px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
            }}
          >
            Recommencer
          </button>
        </div>
      </div>
    );
  }

  if (!session || !currentScale || !currentItem) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.pageBg }}>
      <style>{`
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${theme.cardBorder}`,
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '13px 20px 11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `${theme.accent}10`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {ScaleIcon && <ScaleIcon size={18} style={{ color: theme.accent }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {theme.label} · {scaleIndex + 1}/{totalScales}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#17181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentScale.shortName} — {currentScale.name}
              </p>
            </div>
            <div style={{
              background: theme.badgeBg,
              border: `1px solid ${theme.accent}20`,
              borderRadius: 20, padding: '3px 11px',
              fontSize: 12, fontWeight: 800, color: theme.accent,
              flexShrink: 0,
            }}>
              {currentVisibleIndex + 1} / {totalVisible}
            </div>
            {signatureAnswers.length >= 2 && (
              <div style={{ flexShrink: 0 }}>
                <TestSignature
                  answers={signatureAnswers}
                  totalItems={scorableItemCount}
                  mode="progress"
                  accentColor={theme.accent}
                  size={32}
                />
              </div>
            )}
            <button
              onClick={() => setShowAbandonConfirm(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                color: '#94A3B8', borderRadius: 8, flexShrink: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ height: 4, background: `${theme.accent}12`, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressOverall}%`,
              background: theme.accent,
              borderRadius: 99,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>

          {chapterInfo && chapters && chapters.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              {chapters.map((ch, ci) => {
                const isActive = ci === chapterInfo.index;
                const isDone = ci < chapterInfo.index;
                return (
                  <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: isActive ? 1 : 0 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: 99, flexShrink: 0,
                      background: isDone ? theme.accent : isActive ? theme.accent : `${theme.accent}25`,
                      transition: 'background 0.3s ease',
                    }} />
                    {isActive && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: theme.accent,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ch.title}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', padding: '86px 20px 110px', boxSizing: 'border-box' }}>
        {currentVisibleIndex === 0 && currentScale.instructions && (
          <div style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              {currentScale.instructions}
            </p>
          </div>
        )}

        {milestoneMsg && (
          <div style={{
            textAlign: 'center', padding: '8px 14px', marginBottom: 10,
            fontSize: 13, fontWeight: 600, color: theme.accent,
            opacity: 0.85, animation: 'fadeIn 0.4s ease',
          }}>
            {milestoneMsg}
          </div>
        )}

        {/* Question card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 20,
            padding: '28px 26px 26px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            animation: transitioning
              ? 'fadeOut 0.18s ease forwards'
              : slideDir === 'left'
                ? 'slideInLeft 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                : 'slideInRight 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              height: 28, padding: '0 12px', borderRadius: 20,
              background: theme.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              Q.{currentVisibleIndex + 1}
            </div>
            <div style={{ display: 'flex', gap: 3, flex: 1, overflow: 'hidden' }}>
              {Array.from({ length: Math.min(totalVisible, 20) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 3,
                    flex: 1,
                    borderRadius: 99,
                    background: i <= currentVisibleIndex ? theme.accent : `${theme.accent}15`,
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
            accentColor={theme.accent}
            scaleId={currentScale.id}
          />
        </div>
      </div>

      {/* Bottom navigation */}
      <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 20 }}>
        <div style={{
          maxWidth: 648, margin: '0 auto',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 18,
          border: `1px solid ${theme.cardBorder}`,
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <button
            onClick={handlePrev}
            disabled={currentVisibleIndex === 0 || submitting}
            style={{
              width: 48, height: 48, borderRadius: 13, flexShrink: 0,
              border: `1px solid ${theme.accent}18`,
              background: currentVisibleIndex === 0 ? '#FAFAF8' : `${theme.accent}06`,
              color: currentVisibleIndex === 0 ? '#CBD5E1' : theme.accent,
              cursor: currentVisibleIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: currentVisibleIndex === 0 ? 0.5 : 1,
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext || submitting}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 13,
              border: 'none',
              background: canGoNext && !submitting ? theme.accent : '#E5E7EB',
              color: canGoNext && !submitting ? '#fff' : '#94A3B8',
              fontSize: 14,
              fontWeight: 700,
              cursor: canGoNext && !submitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.18s ease',
              boxShadow: canGoNext && !submitting ? `0 2px 12px ${theme.accent}25` : 'none',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Calcul en cours…
              </>
            ) : isLastItemOfScale ? (
              isLastScale ? (
                <>Terminer</>
              ) : (
                <>Évaluation suivante <ChevronRight size={16} /></>
              )
            ) : (
              <>Suivant <ChevronRight size={16} /></>
            )}
          </button>
        </div>
        {currentVisibleIndex > 0 && (
          <button
            onClick={() => navigate('/assessment')}
            style={{
              display: 'block', margin: '8px auto 0', padding: '4px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: '#94A3B8',
              fontFamily: 'inherit',
            }}
          >
            Reprendre plus tard
          </button>
        )}
      </div>

      {/* Intro screen */}
      {showIntro && experience?.introScreen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(243,241,234,0.98)',
          zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px', animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            {ScaleIcon && (
              <div style={{
                width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
                background: `${theme.accent}12`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ScaleIcon size={28} style={{ color: theme.accent }} />
              </div>
            )}
            <h2 className="font-display" style={{
              fontSize: 26, fontWeight: 600, color: '#17181B',
              margin: '0 0 8px', letterSpacing: '-0.01em',
            }}>
              {experience.introScreen.title}
            </h2>
            <p style={{
              fontSize: 15, color: '#6B7280', lineHeight: 1.6,
              margin: '0 0 20px',
            }}>
              {experience.introScreen.subtitle}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: `${theme.accent}08`, border: `1px solid ${theme.accent}15`,
              fontSize: 13, fontWeight: 600, color: theme.accent,
              marginBottom: 8,
            }}>
              {experience.introScreen.duration}
            </div>
            {experience.introScreen.tip && (
              <p style={{
                fontSize: 13, color: '#94A3B8', lineHeight: 1.5,
                margin: '12px 0 0',
              }}>
                {experience.introScreen.tip}
              </p>
            )}
            <button
              onClick={() => setShowIntro(false)}
              style={{
                display: 'block', width: '100%', maxWidth: 280,
                margin: '28px auto 0', padding: '14px 28px',
                borderRadius: 14, border: 'none',
                background: theme.accent, color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: `0 4px 16px ${theme.accent}30`,
              }}
            >
              Commencer
            </button>
          </div>
        </div>
      )}

      {/* Resume screen */}
      {resumeInfo && currentScale && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(243,241,234,0.98)',
          zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px', animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            {ScaleIcon && (
              <div style={{
                width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
                background: `${theme.accent}12`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ScaleIcon size={28} style={{ color: theme.accent }} />
              </div>
            )}
            <h2 className="font-display" style={{
              fontSize: 24, fontWeight: 600, color: '#17181B', margin: '0 0 8px',
            }}>
              Tu avais commencé ce test
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, margin: '0 0 28px' }}>
              {resumeInfo.answered} question{resumeInfo.answered > 1 ? 's' : ''} sur {resumeInfo.total}
            </p>

            <div style={{
              width: '100%', maxWidth: 280, margin: '0 auto 28px',
              height: 6, background: `${theme.accent}12`, borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 99, background: theme.accent,
                width: `${(resumeInfo.answered / resumeInfo.total) * 100}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
              <button
                onClick={() => {
                  setCurrentItemIndex(resumeInfo.targetItemIndex);
                  setResumeInfo(null);
                }}
                style={{
                  width: '100%', padding: '14px 28px', borderRadius: 14, border: 'none',
                  background: theme.accent, color: '#fff',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: `0 4px 16px ${theme.accent}30`,
                }}
              >
                Reprendre
              </button>
              <button
                onClick={() => {
                  setLocalAnswers({});
                  setCurrentItemIndex(0);
                  setResumeInfo(null);
                }}
                style={{
                  width: '100%', padding: '14px 28px', borderRadius: 14,
                  border: '1px solid rgba(23,24,27,0.1)', background: '#FAFAF8',
                  color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Recommencer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter transition screen */}
      {chapterTransition && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(243,241,234,0.98)',
          zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px', animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 20,
              background: `${theme.accent}08`, border: `1px solid ${theme.accent}15`,
              fontSize: 12, fontWeight: 700, color: theme.accent,
              marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Chapitre {chapterTransition.chapterIndex + 1} / {chapters?.length ?? 0}
            </div>
            <h2 className="font-display" style={{
              fontSize: 24, fontWeight: 600, color: '#17181B',
              margin: '0 0 12px', letterSpacing: '-0.01em',
            }}>
              {chapterTransition.title}
            </h2>
            <p style={{
              fontSize: 15, color: '#6B7280', lineHeight: 1.7,
              margin: '0 0 28px', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto',
            }}>
              {chapterTransition.text}
            </p>
            <button
              onClick={() => setChapterTransition(null)}
              style={{
                display: 'block', width: '100%', maxWidth: 280,
                margin: '0 auto', padding: '14px 28px',
                borderRadius: 14, border: 'none',
                background: theme.accent, color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: `0 4px 16px ${theme.accent}30`,
              }}
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Final screen */}
      {showFinal && currentScale && finalResult && (() => {
        const { card: cardCfg, tone: cardTone } = getResultCardConfig(currentScale);
        const isSober = cardTone === 'sober';
        return (
          <div style={{
            position: 'fixed', inset: 0, background: '#F7F5EF',
            zIndex: 40, display: 'flex', flexDirection: 'column',
            padding: 14, animation: 'fadeIn 0.6s ease',
          }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResultCard
                ref={cardRef}
                scale={currentScale}
                result={finalResult}
                size="full"
                signatureValues={signatureAnswers}
              />
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              {isSober ? (
                <button
                  onClick={() => {
                    setShowFinal(false);
                    if (finalNavPath) navigate(finalNavPath, { state: { responseQuality: responseQualityRef.current } });
                  }}
                  style={{
                    flex: 1, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                    fontSize: 13.5, borderRadius: 14, padding: 13, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 7,
                    background: '#17181B', color: '#F4F1E9',
                  }}
                >
                  Voir mon résultat
                </button>
              ) : (
                <>
                  {cardCfg.shareable && (
                    <button
                      onClick={() => {
                        if (cardRef.current && currentScale) {
                          shareResultCard(cardRef.current, currentScale.id);
                        }
                      }}
                      style={{
                        flex: 1, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                        fontSize: 13.5, borderRadius: 14, padding: 13, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: 7,
                        background: '#17181B', color: '#F4F1E9',
                      }}
                    >
                      <Upload size={15} />Partager ma carte
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowFinal(false);
                      if (finalNavPath) navigate(finalNavPath, { state: { responseQuality: responseQualityRef.current } });
                    }}
                    style={{
                      flex: 1, border: '1px solid #E7E4DA', cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 700, fontSize: 13.5, borderRadius: 14, padding: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      background: '#FFFFFF', color: '#17181B',
                    }}
                  >
                    Voir le détail
                  </button>
                </>
              )}
            </div>
            {isSober ? (
              <p style={{ textAlign: 'center', fontSize: 11, color: '#8A8C95', margin: '9px 0 0', fontWeight: 600 }}>
                Aucun partage proposé sur ce test.
              </p>
            ) : cardCfg.shareable ? (
              <p style={{ textAlign: 'center', fontSize: 11, color: '#8A8C95', margin: '9px 0 0', fontWeight: 600 }}>
                Enregistre l'image ou partage-la directement.
              </p>
            ) : null}
          </div>
        );
      })()}

      {/* Support screen — alertLevel 3 */}
      {supportScreen && (
        <div style={{
          position: 'fixed', inset: 0, background: '#F3F1EA',
          zIndex: 45, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{ maxWidth: 420, width: '100%' }}>
            <p style={{
              fontSize: 15, lineHeight: 1.7, color: '#4B4D55',
              margin: '0 0 24px', textAlign: 'center',
            }}>
              {supportScreen.message}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {getCrisisResources().filter(r => r.phone).map(r => (
                <a
                  key={r.phone}
                  href={`tel:${r.phone}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#FFFFFF', border: '1px solid #E7E4DA',
                    borderRadius: 12, padding: '12px 16px', textDecoration: 'none',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#17181B' }}>{r.label}</p>
                    {r.availability && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6E7078' }}>{r.availability}</p>
                    )}
                  </div>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: '#4A5D57', color: '#fff',
                    padding: '6px 14px', borderRadius: 8,
                    fontSize: 13, fontWeight: 700,
                  }}>
                    <Phone size={12} />
                    {r.phone}
                  </span>
                </a>
              ))}
              {getCrisisResources().filter(r => !r.phone && r.note).map(r => (
                <div
                  key={r.label}
                  style={{
                    background: '#FFFFFF', border: '1px solid #E7E4DA',
                    borderRadius: 12, padding: '12px 16px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#17181B' }}>{r.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6E7078' }}>{r.note}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setSupportScreen(null)}
                style={{
                  width: '100%', padding: '14px 28px', borderRadius: 14,
                  border: 'none', background: '#4A5D57', color: '#fff',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Continuer le test
              </button>
              <button
                onClick={() => navigate('/assessment')}
                style={{
                  width: '100%', padding: '14px 28px', borderRadius: 14,
                  border: '1px solid #E7E4DA', background: '#FFFFFF', color: '#4B4D55',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Arrêter ici
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon modal */}
      {showAbandonConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(23,24,27,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '28px 26px',
            maxWidth: 360, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h3 className="font-display" style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 600, color: '#17181B' }}>
              Abandonner l'évaluation ?
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
              Tes réponses sont sauvegardées — tu pourras reprendre plus tard.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowAbandonConfirm(false)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: '1px solid rgba(23,24,27,0.1)',
                  background: '#FAFAF8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Continuer
              </button>
              <button
                onClick={() => navigate('/assessment')}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: 'none',
                  background: '#DC2626',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
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

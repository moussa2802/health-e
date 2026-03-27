import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, AlertTriangle, X, Loader2 } from 'lucide-react';
import {
  getSession,
  saveAnswer,
  computeAndSaveScaleResult,
  finalizeSession,
} from '../../services/evaluationService';
import { getScaleById } from '../../data/scales';
import type { UserAssessmentSession, AssessmentScale } from '../../types/assessment';
import QuestionItem from '../../components/assessment/QuestionItem';

const AssessmentQuizPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<UserAssessmentSession | null>(null);
  const [currentScale, setCurrentScale] = useState<AssessmentScale | null>(null);
  const [localAnswers, setLocalAnswers] = useState<Record<number, number>>({});
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Charger la session
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getSession(sessionId)
      .then((s) => {
        if (!s) {
          setError('Session introuvable. Veuillez recommencer une nouvelle évaluation.');
          return;
        }
        if (s.status === 'completed') {
          navigate(`/assessment/results/${sessionId}`, { replace: true });
          return;
        }
        setSession(s);
        const scale = getScaleById(s.selectedScaleIds[s.currentScaleIndex]);
        if (scale) {
          setCurrentScale(scale);
          // Pré-charger les réponses existantes pour cette scale
          const existingAnswers = s.answers[scale.id] ?? {};
          setLocalAnswers(existingAnswers);
        }
      })
      .catch(() => setError('Erreur lors du chargement de la session.'))
      .finally(() => setLoading(false));
  }, [sessionId, navigate]);

  const scaleIndex = session?.currentScaleIndex ?? 0;
  const totalScales = session?.selectedScaleIds.length ?? 0;
  const items = currentScale?.items ?? [];
  const currentItem = items[currentItemIndex] ?? null;

  // Filtrer les items conditionnels
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

    // Sauvegarder en arrière-plan
    try {
      await saveAnswer(sessionId, currentScale.id, currentItem.id, value);
    } catch {
      // Silencieux — on continue quand même
    }
  }, [currentItem, sessionId, currentScale, localAnswers]);

  const canGoNext = currentItem ? localAnswers[currentItem.id] !== undefined : false;

  const handleNext = useCallback(async () => {
    if (!session || !currentScale || !sessionId) return;

    const nextVisibleIndex = currentVisibleIndex + 1;

    if (nextVisibleIndex < totalVisible) {
      // Prochain item dans la même scale
      const nextItem = visibleItems[nextVisibleIndex];
      const itemIndex = items.findIndex((i) => i.id === nextItem.id);
      setCurrentItemIndex(itemIndex >= 0 ? itemIndex : currentItemIndex + 1);
    } else {
      // Fin de la scale → calculer le résultat
      setSubmitting(true);
      try {
        await computeAndSaveScaleResult(sessionId, currentScale.id, localAnswers);

        const nextScaleIndex = scaleIndex + 1;
        if (nextScaleIndex >= totalScales) {
          // Fin de toutes les scales
          await finalizeSession(sessionId);
          navigate(`/assessment/results/${sessionId}`);
        } else {
          // Prochaine scale
          setTransitioning(true);
          setTimeout(() => {
            const nextScaleId = session.selectedScaleIds[nextScaleIndex];
            const nextScale = getScaleById(nextScaleId);
            if (nextScale) {
              const updatedSession = {
                ...session,
                currentScaleIndex: nextScaleIndex,
              };
              setSession(updatedSession);
              setCurrentScale(nextScale);
              const existingAnswers = session.answers[nextScale.id] ?? {};
              setLocalAnswers(existingAnswers);
              setCurrentItemIndex(0);
            }
            setTransitioning(false);
          }, 400);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
      } finally {
        setSubmitting(false);
      }
    }
  }, [
    session, currentScale, sessionId, currentVisibleIndex, totalVisible,
    visibleItems, items, currentItemIndex, localAnswers, scaleIndex,
    totalScales, navigate,
  ]);

  const handlePrev = () => {
    if (currentVisibleIndex > 0) {
      const prevItem = visibleItems[currentVisibleIndex - 1];
      const itemIndex = items.findIndex((i) => i.id === prevItem.id);
      setCurrentItemIndex(itemIndex >= 0 ? itemIndex : currentItemIndex - 1);
    }
  };

  const isLastItemOfScale = currentVisibleIndex === totalVisible - 1;
  const isLastScale = scaleIndex === totalScales - 1;

  // Loading / Error states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de votre évaluation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Une erreur est survenue</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/assessment/select')}
            className="bg-sky-500 text-white px-6 py-2.5 rounded-full font-medium hover:bg-sky-600 transition-colors"
          >
            Recommencer
          </button>
        </div>
      </div>
    );
  }

  if (!session || !currentScale || !currentItem) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-gray-500">
                Évaluation {scaleIndex + 1} sur {totalScales}
              </p>
              <p className="text-sm font-semibold text-gray-900">{currentScale.shortName} — {currentScale.name}</p>
            </div>
            <button
              onClick={() => setShowAbandonConfirm(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Abandonner l'évaluation"
            >
              <X size={18} />
            </button>
          </div>
          {/* Global progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progressOverall}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 max-w-2xl mx-auto w-full px-4 pt-24 pb-32 transition-opacity duration-400 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {/* Scale header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">{currentScale.category === "mental_health"? "Santé mentale": "Santé sexuelle"}</p>
              <h2 className="text-lg font-bold text-gray-900 mb-2">{currentScale.name}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{currentScale.instructions}</p>
            </div>
            <div className="flex-shrink-0 text-center bg-sky-50 rounded-xl px-3 py-2">
              <div className="text-lg font-bold text-sky-700">{currentVisibleIndex + 1}</div>
              <div className="text-xs text-sky-500">/ {totalVisible}</div>
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <QuestionItem
            item={currentItem}
            value={localAnswers[currentItem.id]}
            onChange={handleAnswer}
            disabled={submitting}
          />
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentVisibleIndex === 0 || submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Précédent
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext || submitting}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              canGoNext && !submitting
                ? 'bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Calcul en cours...
              </>
            ) : isLastItemOfScale ? (
              isLastScale ? (
                <>
                  Terminer l'évaluation
                  <ChevronRight size={16} />
                </>
              ) : (
                <>
                  Évaluation suivante
                  <ChevronRight size={16} />
                </>
              )
            ) : (
              <>
                Suivant
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Abandon confirmation modal */}
      {showAbandonConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Abandonner l'évaluation ?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Vos réponses actuelles seront perdues. Êtes-vous sûr(e) de vouloir arrêter ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continuer
              </button>
              <button
                onClick={() => navigate('/assessment')}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Heart, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import type { AssessmentScale } from '../../types/assessment';
import ScaleCard from '../../components/assessment/ScaleCard';
import { useAuth } from '../../contexts/AuthContext';
import { createSession } from '../../services/evaluationService';

const MIN_SELECTION = 2;
const MAX_SELECTION = 10;

const AssessmentSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (scale: AssessmentScale) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scale.id)) {
        next.delete(scale.id);
      } else {
        if (next.size >= MAX_SELECTION) return prev;
        next.add(scale.id);
      }
      return next;
    });
  };

  const count = selected.size;
  const canStart = count >= MIN_SELECTION && count <= MAX_SELECTION;
  const pct = Math.min(100, (count / MAX_SELECTION) * 100);

  const handleStart = async () => {
    if (!canStart) return;
    setError(null);

    if (!isAuthenticated || !currentUser) {
      // Sauvegarder la sélection en sessionStorage et rediriger vers la connexion
      sessionStorage.setItem('pendingAssessmentScales', JSON.stringify([...selected]));
      navigate('/patient/access?redirect=/assessment/select');
      return;
    }

    setLoading(true);
    try {
      const session = await createSession(currentUser.id, [...selected]);
      navigate(`/assessment/quiz/${session.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-gray-900">Choisissez vos évaluations</h1>
            <p className="text-xs text-gray-500">Sélectionnez entre {MIN_SELECTION} et {MAX_SELECTION} domaines à explorer</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Counter */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              count < MIN_SELECTION
                ? 'bg-gray-100 text-gray-500'
                : count === MAX_SELECTION
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-sky-100 text-sky-700'
            }`}>
              <span>{count}</span>
              <span className="text-xs font-normal opacity-70">/ {MAX_SELECTION}</span>
            </div>

            <button
              onClick={handleStart}
              disabled={!canStart || loading}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                canStart && !loading
                  ? 'bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Démarrage...
                </>
              ) : (
                <>
                  Démarrer
                  {count >= MIN_SELECTION && <span>({count})</span>}
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Guest notice */}
        {!isAuthenticated && (
          <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6">
            <AlertCircle size={18} className="text-sky-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-sky-800">
              Vous pouvez explorer les évaluations librement. Pour sauvegarder vos résultats et obtenir votre ID de compatibilité, une connexion sera nécessaire au démarrage.
            </p>
          </div>
        )}

        {/* Mental health section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
              <Brain size={18} className="text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Santé mentale</h2>
              <p className="text-xs text-gray-500">{MENTAL_HEALTH_SCALES.length} évaluations disponibles</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MENTAL_HEALTH_SCALES.map((scale) => (
              <ScaleCard
                key={scale.id}
                scale={scale}
                selected={selected.has(scale.id)}
                onToggle={() => toggle(scale)}
                disabled={count >= MAX_SELECTION && !selected.has(scale.id)}
              />
            ))}
          </div>
        </section>

        {/* Sexual health section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Heart size={18} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Santé sexuelle</h2>
              <p className="text-xs text-gray-500">{SEXUAL_HEALTH_SCALES.length} évaluations · espace privé et confidentiel</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEXUAL_HEALTH_SCALES.map((scale) => (
              <ScaleCard
                key={scale.id}
                scale={scale}
                selected={selected.has(scale.id)}
                onToggle={() => toggle(scale)}
                disabled={count >= MAX_SELECTION && !selected.has(scale.id)}
              />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        {count >= MIN_SELECTION && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-violet-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-2xl hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Démarrage...
                </>
              ) : (
                <>
                  Démarrer {count} évaluation{count > 1 ? 's': ""}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentSelectPage;

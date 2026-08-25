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
    <div className="min-h-screen" style={{ background: '#F3F1EA' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b" style={{ borderColor: 'rgba(23,24,27,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-base font-semibold text-ink">Choisissez vos évaluations</h1>
            <p className="text-xs text-ink-light">Sélectionnez entre {MIN_SELECTION} et {MAX_SELECTION} domaines</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              count < MIN_SELECTION
                ? 'bg-gray-100 text-gray-500'
                : count === MAX_SELECTION
                  ? 'bg-gold/10 text-gold'
                  : 'bg-sage/10 text-sage'
            }`}>
              <span>{count}</span>
              <span className="text-xs font-normal opacity-70">/ {MAX_SELECTION}</span>
            </div>

            <button
              onClick={handleStart}
              disabled={!canStart || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                background: canStart && !loading ? '#4A5D57' : '#D1D5DB',
                color: canStart && !loading ? '#fff' : '#9CA3AF',
                cursor: canStart && !loading ? 'pointer' : 'not-allowed',
                boxShadow: canStart && !loading ? '0 2px 8px rgba(74,93,87,0.2)' : 'none',
              }}
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

        <div className="h-1" style={{ background: 'rgba(74,93,87,0.06)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${pct}%`, background: '#4A5D57' }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!isAuthenticated && (
          <div className="flex items-start gap-3 rounded-xl p-4 mb-6" style={{ background: 'rgba(74,93,87,0.06)', border: '1px solid rgba(74,93,87,0.12)' }}>
            <AlertCircle size={18} className="text-sage flex-shrink-0 mt-0.5" />
            <p className="text-sm text-ink-light">
              Vous pouvez explorer les évaluations librement. Pour sauvegarder vos résultats, une connexion sera nécessaire au démarrage.
            </p>
          </div>
        )}

        {/* Mental health */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74,93,87,0.08)' }}>
              <Brain size={18} color="#4A5D57" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Profil psychologique</h2>
              <p className="text-xs text-ink-light">{MENTAL_HEALTH_SCALES.length} évaluations disponibles</p>
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

        {/* Sexual health */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,96,63,0.08)' }}>
              <Heart size={18} color="#B5522F" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Vie intime</h2>
              <p className="text-xs text-ink-light">{SEXUAL_HEALTH_SCALES.length} évaluations · confidentiel</p>
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

        {/* Floating CTA */}
        {count >= MIN_SELECTION && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex items-center gap-2 text-white font-semibold px-8 py-3.5 rounded-full shadow-2xl transition-all duration-200"
              style={{ background: '#4A5D57' }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Démarrage...
                </>
              ) : (
                <>
                  Démarrer {count} évaluation{count > 1 ? 's' : ''}
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

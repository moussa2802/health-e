import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ArrowRight, Loader2, ChevronRight } from 'lucide-react';
import { getSession } from '../../services/evaluationService';
import { getScaleById } from '../../data/scales';
import type { UserAssessmentSession, ScaleResult } from '../../types/assessment';
import ScoreGauge from '../../components/assessment/ScoreGauge';

// ── Severity helpers ────────────────────────────────────────────────────────

const severityBg: Record<string, string> = {
  none:     'bg-green-50  border-green-200',
  minimal:  'bg-green-50  border-green-200',
  positive: 'bg-green-50  border-green-200',
  mild:     'bg-amber-50  border-amber-200',
  moderate: 'bg-orange-50 border-orange-200',
  severe:   'bg-red-50    border-red-200',
  alert:    'bg-red-50    border-red-200',
};

const severityBadge: Record<string, string> = {
  none:     'bg-green-100  text-green-800  border-green-300',
  minimal:  'bg-green-100  text-green-800  border-green-300',
  positive: 'bg-green-100  text-green-800  border-green-300',
  mild:     'bg-amber-100  text-amber-800  border-amber-300',
  moderate: 'bg-orange-100 text-orange-800 border-orange-300',
  severe:   'bg-red-100    text-red-800    border-red-300',
  alert:    'bg-red-100    text-red-800    border-red-300',
};

const severityIcon: Record<string, React.ReactNode> = {
  none:     <CheckCircle size={16} className="text-green-600" />,
  minimal:  <CheckCircle size={16} className="text-green-600" />,
  positive: <CheckCircle size={16} className="text-green-600" />,
  mild:     <AlertTriangle size={16} className="text-amber-600" />,
  moderate: <AlertTriangle size={16} className="text-orange-600" />,
  severe:   <AlertTriangle size={16} className="text-red-600" />,
  alert:    <AlertTriangle size={16} className="text-red-600" />,
};

// ── Component ───────────────────────────────────────────────────────────────

const AssessmentResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<UserAssessmentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getSession(sessionId)
      .then((s) => {
        if (!s) {
          setError('Session introuvable.');
          return;
        }
        setSession(s);
      })
      .catch(() => setError('Erreur lors du chargement des résultats.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFF' }}>
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de vos résultats...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F8FAFF' }}>
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Résultats introuvables</h2>
          <p className="text-gray-600 mb-6">{error ?? 'Session invalide.'}</p>
          <button
            onClick={() => navigate('/assessment')}
            className="bg-sky-500 text-white px-6 py-2.5 rounded-full font-medium hover:bg-sky-600 transition-colors"
          >
            Retour aux évaluations
          </button>
        </div>
      </div>
    );
  }

  // ── Data resolution ──────────────────────────────────────────────────────

  const scaleId = session.selectedScaleIds[0];
  const result: ScaleResult | undefined = session.scores[scaleId];
  const scale = getScaleById(scaleId);

  if (!result || !scale) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F8FAFF' }}>
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Résultat indisponible</h2>
          <p className="text-gray-600 mb-6">Le résultat de cette évaluation n'a pas pu être chargé.</p>
          <button
            onClick={() => navigate('/assessment')}
            className="bg-sky-500 text-white px-6 py-2.5 rounded-full font-medium hover:bg-sky-600 transition-colors"
          >
            Retour aux évaluations
          </button>
        </div>
      </div>
    );
  }

  const severity = result.interpretation.severity;
  const categoryLabel = scale.category === 'mental_health' ? 'Santé mentale' : 'Santé sexuelle';
  const bgCard = severityBg[severity] ?? severityBg.mild;
  const badge  = severityBadge[severity] ?? severityBadge.mild;
  const icon   = severityIcon[severity] ?? severityIcon.mild;
  const referralRequired = result.interpretation.referralRequired;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#F8FAFF' }}>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="text-center mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-500 mb-1">{categoryLabel}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{scale.name}</h1>
          {scale.shortName && (
            <p className="text-sm text-gray-400 font-mono mt-0.5">{scale.shortName}</p>
          )}
        </div>

        {/* ── Score card principale ── */}
        <div className={`rounded-2xl border p-6 shadow-sm ${bgCard}`}>

          {/* Badge de sévérité */}
          <div className="flex items-center justify-center mb-5">
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${badge}`}>
              {icon}
              {result.interpretation.label}
            </span>
          </div>

          {/* Jauge + score */}
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-end justify-center gap-2 mb-4">
              <span className="text-5xl font-extrabold text-gray-900 leading-none">
                {result.totalScore}
              </span>
              <span className="text-xl text-gray-400 font-light mb-1">
                / {scale.scoreRange.max}
              </span>
            </div>
            <ScoreGauge
              score={result.totalScore}
              min={scale.scoreRange.min}
              max={scale.scoreRange.max}
              severity={severity}
              label={result.interpretation.label}
            />
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 leading-relaxed text-center mb-3">
            {result.interpretation.description}
          </p>

          {/* Recommandation */}
          {result.interpretation.recommendation && (
            <p className="text-xs text-gray-500 italic text-center border-t border-black/10 pt-3">
              {result.interpretation.recommendation}
            </p>
          )}
        </div>

        {/* ── Alerte consultation ── */}
        {referralRequired && (
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-300 rounded-2xl p-4">
            <AlertTriangle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800 mb-1">Consultation recommandée</p>
              <p className="text-sm text-orange-700 leading-relaxed">
                {scale.warningMessage ?? 'Vos résultats suggèrent qu\'une consultation avec un professionnel de santé serait bénéfique.'}
              </p>
              <button
                onClick={() => navigate('/professionals')}
                className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-orange-700 hover:text-orange-900 transition-colors"
              >
                Trouver un professionnel
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Sous-scales ── */}
        {result.subscaleScores && scale.subscales && Object.keys(result.subscaleScores).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Scores par dimension
            </p>
            <div className="space-y-3">
              {scale.subscales.map((sub) => {
                const subScore = result.subscaleScores![sub.key];
                if (subScore === undefined) return null;
                const pct = sub.range.max > sub.range.min
                  ? Math.min(100, ((subScore - sub.range.min) / (sub.range.max - sub.range.min)) * 100)
                  : 0;
                return (
                  <div key={sub.key} className="flex items-center gap-3">
                    <p className="text-xs text-gray-600 w-36 flex-shrink-0 truncate">{sub.label}</p>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-teal-400 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-14 text-right flex-shrink-0">
                      {subScore}<span className="text-gray-400 font-normal">/{sub.range.max}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Boutons d'action ── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={() => navigate('/assessment/profile')}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            Voir mon profil
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/assessment')}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium text-sm px-6 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            Faire une autre évaluation
          </button>
        </div>

        {/* ── Disclaimer ── */}
        <p className="text-xs text-gray-400 text-center leading-relaxed pb-4">
          Ces résultats sont fournis à titre informatif uniquement et ne constituent pas un
          diagnostic médical. En cas de doute ou de symptômes persistants, consultez un
          professionnel de santé qualifié.
        </p>

      </div>
    </div>
  );
};

export default AssessmentResultsPage;

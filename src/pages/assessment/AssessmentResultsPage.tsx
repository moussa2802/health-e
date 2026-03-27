import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, Download, Share2, RefreshCw,
  Loader2, Sparkles, ChevronRight, Copy, Check,
} from 'lucide-react';
import { getSession, saveClaudeInterpretation } from '../../services/evaluationService';
import { getScaleById } from '../../data/scales';
import type { UserAssessmentSession, ScaleResult } from '../../types/assessment';
import ScoreGauge from '../../components/assessment/ScoreGauge';

const severityLabel: Record<string, string> = {
  none: 'Aucun signe',
  minimal: 'Minimal',
  mild: 'Léger',
  moderate: 'Modéré',
  severe: 'Sévère',
  alert: 'Alerte',
  positive: 'Positif',
};

const AssessmentResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<UserAssessmentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeText, setClaudeText] = useState<string | null>(null);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        if (s.claudeInterpretation) {
          setClaudeText(s.claudeInterpretation);
        }
      })
      .catch(() => setError('Erreur lors du chargement des résultats.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleGenerateInterpretation = useCallback(async () => {
    if (!session || !sessionId) return;
    setClaudeLoading(true);
    setClaudeError(null);

    // Préparer le résumé des résultats pour Claude
    const resultsForClaude = Object.values(session.scores).map((r) => {
      const scale = getScaleById(r.scaleId);
      return {
        scale: scale?.name ?? r.scaleId,
        score: r.totalScore,
        maxScore: scale?.scoreRange.max ?? 100,
        interpretation: r.interpretation.label,
        severity: r.interpretation.severity,
        description: r.interpretation.description,
      };
    });

    try {
      const resp = await fetch('/.netlify/functions/claude-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': "application/json"},
        body: JSON.stringify({ results: resultsForClaude, language: 'fr' }),
      });

      if (!resp.ok) {
        throw new Error(`Erreur serveur (${resp.status})`);
      }

      const data = await resp.json();
      const text = data.interpretation ?? data.text ?? '';
      setClaudeText(text);
      await saveClaudeInterpretation(sessionId, text);
    } catch (err: unknown) {
      setClaudeError(
        err instanceof Error
          ? err.message
          : "Impossible de générer l'interprétation pour le moment. Réessayez plus tard."
      );
    } finally {
      setClaudeLoading(false);
    }
  }, [session, sessionId]);

  const handleCopyId = async () => {
    if (!session?.compatibilityId) return;
    try {
      await navigator.clipboard.writeText(session.compatibilityId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silencieux */ }
  };

  const completedAt = session?.completedAt
    ? new Date(session.completedAt as unknown as string | number).toLocaleDateString('fr-FR', {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const scaleResults = session ? Object.values(session.scores) : [];
  const hasAlert = session?.alertDetected ?? false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de vos résultats...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">Vos résultats</h1>
            {completedAt && (
              <p className="text-sm text-gray-500">Complété le {completedAt}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-semibold px-3 py-1.5 rounded-full">
            <CheckCircle size={15} />
            Évaluation complète
          </span>
        </div>

        {/* ── Medical alert (always shown) ── */}
        <div className={`flex items-start gap-3 rounded-xl p-4 mb-6 ${hasAlert ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
          <AlertTriangle size={18} className={`flex-shrink-0 mt-0.5 ${hasAlert ? 'text-red-500' : 'text-amber-600'}`} />
          <div>
            {hasAlert ? (
              <>
                <p className="text-sm font-semibold text-red-800 mb-0.5">Consultation recommandée</p>
                <p className="text-sm text-red-700">
                  Certains de vos résultats suggèrent qu'une consultation avec un professionnel de santé
                  serait bénéfique. Ces évaluations ne remplacent pas un avis médical.
                </p>
                <Link
                  to="/professionals/psychologue-clinicien"
                  className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-red-700 hover:text-red-800"
                >
                  Trouver un professionnel
                  <ChevronRight size={14} />
                </Link>
              </>
            ) : (
              <p className="text-sm text-amber-800">
                Ces évaluations sont fournies à titre informatif uniquement et ne remplacent pas
                une consultation professionnelle. En cas de besoin, n'hésitez pas à consulter.
              </p>
            )}
          </div>
        </div>

        {/* ── Scale results ── */}
        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-gray-900">Résultats par évaluation</h2>
          {scaleResults.map((result: ScaleResult) => {
            const scale = getScaleById(result.scaleId);
            if (!scale) return null;
            const referralRequired = result.interpretation.referralRequired;

            return (
              <div
                key={result.scaleId}
                className={`bg-white rounded-2xl border p-5 shadow-sm ${referralRequired ? 'border-red-200' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-sm">{scale.name}</h3>
                      <span className="text-xs text-gray-400 font-mono">{scale.shortName}</span>
                      {referralRequired && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={11} />
                          Consultation recommandée
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ScoreGauge
                  score={result.totalScore}
                  min={scale.scoreRange.min}
                  max={scale.scoreRange.max}
                  severity={result.interpretation.severity}
                  label={result.interpretation.label}
                />

                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  {result.interpretation.description}
                </p>

                {result.interpretation.recommendation && (
                  <p className="mt-2 text-xs text-gray-500 italic">
                    {result.interpretation.recommendation}
                  </p>
                )}

                {/* Subscales */}
                {result.subscaleScores && scale.subscales && Object.keys(result.subscaleScores).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sous-scores</p>
                    <div className="space-y-2">
                      {scale.subscales.map((sub) => {
                        const subScore = result.subscaleScores![sub.key];
                        if (subScore === undefined) return null;
                        const pct = sub.range.max > sub.range.min
                          ? ((subScore - sub.range.min) / (sub.range.max - sub.range.min)) * 100
                          : 0;
                        return (
                          <div key={sub.key} className="flex items-center gap-3">
                            <p className="text-xs text-gray-600 w-32 flex-shrink-0 truncate">{sub.label}</p>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-sky-400 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                              {subScore}<span className="text-gray-400 font-normal">/{sub.range.max}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* ── Claude interpretation ── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-violet-500 rounded-xl flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Interprétation par IA</h2>
              <p className="text-xs text-gray-500">Analyse personnalisée de vos résultats</p>
            </div>
          </div>

          {claudeText ? (
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {claudeText}
            </div>
          ) : claudeLoading ? (
            <div className="flex items-center gap-3 py-6 text-gray-500">
              <Loader2 size={20} className="animate-spin text-sky-500" />
              <p className="text-sm">Génération de votre analyse personnalisée...</p>
            </div>
          ) : (
            <div>
              {claudeError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{claudeError}</p>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                Obtenez une analyse narrative bienveillante et personnalisée de vos résultats, générée par intelligence artificielle.
              </p>
              <button
                onClick={handleGenerateInterpretation}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-violet-500 text-white font-semibold text-sm px-5 py-2.5 rounded-full hover:shadow-md transition-all duration-200"
              >
                <Sparkles size={15} />
                Générer l'interprétation IA
              </button>
            </div>
          )}
        </section>

        {/* ── Actions ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {/* Download PDF (placeholder — implémentation à connecter) */}
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            <Download size={16} className="text-sky-500" />
            Télécharger le rapport
          </button>

          {/* Share compatibility ID */}
          {session.compatibilityId ? (
            <button
              onClick={handleCopyId}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} className="text-violet-500" />}
              {copied ? "ID copié !": "Partager mon ID"}
            </button>
          ) : (
            <Link
              to="/assessment/compatibility"
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              <Share2 size={16} className="text-violet-500" />
              Test de compatibilité
            </Link>
          )}

          {/* New assessment */}
          <Link
            to="/assessment/select"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-violet-500 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:shadow-md transition-all duration-200"
          >
            <RefreshCw size={16} />
            Nouvelle évaluation
          </Link>
        </section>
      </div>
    </div>
  );
};

export default AssessmentResultsPage;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, ArrowRight, Loader2, ChevronRight,
  Phone, Heart, ShieldAlert, RefreshCw, Trash2, Clock,
} from 'lucide-react';
import { getSession, getProfileProgress } from '../../services/evaluationService';
import { useAuth } from '../../contexts/AuthContext';
import { getGuestSession, guestToUserSession, getGuestCount, GUEST_MAX_TESTS } from '../../utils/guestSession';
import { getScaleById } from '../../data/scales';
import { resolveScaleGender } from '../../utils/gender';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import type { UserAssessmentSession, ScaleResult, TriggeredAlert } from '../../types/assessment';
import { getJournalPrompt, savePendingPrompt } from '../../utils/journalPrompts';
import { archiveCurrentResult, getTestHistory, deleteTestResult, deleteSpecificHistoryEntry, getAnswersFromSession } from '../../services/testManagementService';
import type { ScaleResultHistoryEntry } from '../../services/testManagementService';
import TestHistoryPanel from '../../components/assessment/TestHistoryPanel';
import { createSession } from '../../services/evaluationService';
import ScoreGauge from '../../components/assessment/ScoreGauge';
import ConseilsCard from '../../components/assessment/ConseilsCard';

// ── Severity helpers ─────────────────────────────────────────────────────────

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

// ── Ressources d'urgence (contexte sénégalais) ───────────────────────────────

const EMERGENCY_CONTACTS = [
  { label: 'SAMU Sénégal', number: '15', description: 'Urgences médicales et psychiatriques' },
  { label: 'Police Nationale', number: '17', description: 'En cas de danger immédiat' },
  { label: 'Croix-Rouge Sénégal', number: '+221 33 823 27 25', description: 'Soutien en situation de crise' },
  { label: 'Healt-e — Urgence', number: '', description: 'Contacter un professionnel sur la plateforme', isLink: true },
];

// ── Alerte Niveau 3 : Modal critique (non fermable sans accusé de lecture) ───

interface CriticalAlertModalProps {
  alerts: TriggeredAlert[];
  onAcknowledge: () => void;
}

const CriticalAlertModal: React.FC<CriticalAlertModalProps> = ({ alerts, onAcknowledge }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'white', borderRadius: 20, maxWidth: 480, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* En-tête rouge */}
        <div style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={28} color="white" />
            <div>
              <p style={{ margin: 0, color: 'white', fontSize: 18, fontWeight: 800 }}>Message important</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Lis ce message attentivement</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Message de soutien */}
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#7F1D1D' }}>
              <Heart size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#DC2626' }} />
              {alerts[0]?.message}
            </p>
          </div>

          {/* Message de soutien global */}
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
            Tu n'as pas à traverser ça seul(e). Des professionnels formés sont disponibles pour t'écouter et t'accompagner, sans jugement. Prendre soin de soi est un acte de courage.
          </p>

          {/* Contacts d'urgence */}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Contacts disponibles maintenant
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {EMERGENCY_CONTACTS.filter(c => c.number).map((contact) => (
              <div key={contact.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#F9FAFB', border: '1px solid #E5E7EB',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>{contact.label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{contact.description}</p>
                </div>
                <a
                  href={`tel:${contact.number}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: '#DC2626', color: 'white',
                    padding: '6px 12px', borderRadius: 8,
                    fontSize: 13, fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  <Phone size={12} />
                  {contact.number}
                </a>
              </div>
            ))}
            <Link
              to="/professionals"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(135deg,#EFF6FF,#F0FDFA)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 10, padding: '10px 14px', textDecoration: 'none',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>Healt-e — Professionnels</p>
                <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Consulter un professionnel sur la plateforme</p>
              </div>
              <ChevronRight size={16} color="#3B82F6" />
            </Link>
          </div>

          {/* Accusé de lecture obligatoire */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            cursor: 'pointer', marginBottom: 16,
          }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              J'ai lu ce message et je suis conscient(e) des ressources disponibles pour m'aider.
            </span>
          </label>

          <button
            onClick={onAcknowledge}
            disabled={!acknowledged}
            style={{
              width: '100%',
              background: acknowledged ? 'linear-gradient(135deg,#3B82F6,#2DD4BF)' : '#D1D5DB',
              color: 'white', border: 'none',
              padding: '12px 20px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: acknowledged ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            Continuer vers mes résultats
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Alerte Niveau 2 : Bloc alerte fort ───────────────────────────────────────

const AlertLevel2Block: React.FC<{ message?: string }> = ({ message }) => (
  <div style={{
    background: '#FFF7ED', border: '2px solid #F97316',
    borderRadius: 16, padding: '16px 18px',
  }}>
    <div style={{ display: 'flex', gap: 10 }}>
      <AlertTriangle size={20} color="#EA580C" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#9A3412' }}>
          Consultation professionnelle recommandée
        </p>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#C2410C', lineHeight: 1.5 }}>
          {message ?? 'Ce que tu ressens mérite l\'attention d\'un professionnel de profil psychologique.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {EMERGENCY_CONTACTS.slice(0, 2).map(c => c.number && (
            <a
              key={c.label}
              href={`tel:${c.number}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: '#EA580C', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >
              <Phone size={13} />
              {c.label} — {c.number}
            </a>
          ))}
          <Link
            to="/professionals"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#3B82F6', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Trouver un professionnel sur Healt-e
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  </div>
);

// ── Alerte Niveau 1 : Vigilance douce ────────────────────────────────────────

const AlertLevel1Block: React.FC = () => (
  <div style={{
    background: '#FFFBEB', border: '1px solid #FCD34D',
    borderRadius: 14, padding: '14px 16px',
  }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#92400E' }}>
          Zone de vigilance
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#B45309', lineHeight: 1.5 }}>
          Tes résultats indiquent des difficultés qui méritent attention. Prendre soin de toi est important.
          Un professionnel peut t'apporter un soutien précieux.
        </p>
      </div>
    </div>
  </div>
);

// ── renderAnalysis (Dr Lo markdown → React) ──────────────────────────────────

function renderAnalysis(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    const rendered = parts.map((p, j) =>
      j % 2 === 1 ? <strong key={j} style={{ fontWeight: 700 }}>{p}</strong> : p
    );
    if (line.startsWith('— Dr Lo')) {
      return <p key={i} style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 700, color: '#3B82F6', fontStyle: 'italic' }}>{rendered}</p>;
    }
    if (/^[✅⚠️💡👨‍⚕️]/.test(line)) {
      return <p key={i} style={{ margin: '14px 0 4px', fontSize: 14, fontWeight: 600, color: '#0A2342' }}>{rendered}</p>;
    }
    if (line.startsWith('•') || line.startsWith('-')) {
      return <p key={i} style={{ margin: '3px 0', paddingLeft: 12, fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{rendered}</p>;
    }
    if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ margin: '2px 0', fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{rendered}</p>;
  });
}

// ── Component principal ──────────────────────────────────────────────────────

const AssessmentResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGuestMode = searchParams.get('guest') === 'true';
  const { currentUser, isAuthenticated } = useAuth();

  const [session, setSession] = useState<UserAssessmentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [criticalAlertDismissed, setCriticalAlertDismissed] = useState(false);
  const journalPromptSavedRef = useRef(false);

  // ── Dr Lo analysis polling ──
  const [drLoNarrative, setDrLoNarrative] = useState<string | null>(null);
  const [drLoLoading, setDrLoLoading] = useState(false);
  const drLoPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [history, setHistory] = useState<ScaleResultHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const guestCount = isGuestMode ? getGuestCount() : 0;
  const isLastFreeTest = isGuestMode && guestCount >= GUEST_MAX_TESTS;

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);

    if (isGuestMode) {
      const g = getGuestSession(sessionId);
      if (!g) { setError('Session introuvable.'); setLoading(false); return; }
      setSession(guestToUserSession(g));
      setLoading(false);
      return;
    }

    getSession(sessionId)
      .then((s) => {
        if (!s) { setError('Session introuvable.'); return; }
        setSession(s);
      })
      .catch(() => setError('Erreur lors du chargement des résultats.'))
      .finally(() => setLoading(false));
  }, [sessionId, isGuestMode]);

  // ── Poll for Dr Lo analysis after session loads ──
  useEffect(() => {
    if (isGuestMode || !isAuthenticated || !currentUser || !session) return;

    // Détermine la catégorie de l'échelle complétée pour lire le bon champ Dr Lo
    const completedScaleId = session.selectedScaleIds[0];
    const completedScale = getScaleById(completedScaleId);

    // Les tests bonus n'ont pas d'analyse Dr Lo de profil — on n'affiche rien
    if (completedScale?.category === 'bonus') return;

    const isMentalScale = completedScale?.category === 'mental_health';

    // Timestamp du début de session pour détecter les analyses obsolètes
    const sessionStartedAt = session.startedAt instanceof Date
      ? session.startedAt
      : new Date(session.startedAt as unknown as string);

    setDrLoLoading(true);
    let attempts = 0;
    const MAX_ATTEMPTS = 12;

    const poll = async () => {
      attempts++;
      try {
        const progress = await getProfileProgress(currentUser.id);
        const analysis = isMentalScale
          ? progress.drLoMentalAnalysis
          : progress.drLoSexualAnalysis;
        const updatedAt = isMentalScale
          ? progress.drLoMentalUpdatedAt
          : progress.drLoSexualUpdatedAt;

        // Only accept the analysis if it's newer than the current session
        if (analysis && updatedAt && updatedAt >= sessionStartedAt) {
          setDrLoNarrative(analysis);
          setDrLoLoading(false);
          return;
        }
      } catch { /* silencieux */ }

      if (attempts < MAX_ATTEMPTS) {
        drLoPollingRef.current = setTimeout(poll, 2500);
      } else {
        setDrLoLoading(false);
      }
    };

    poll();
    return () => { if (drLoPollingRef.current) clearTimeout(drLoPollingRef.current); };
  }, [session, isGuestMode, isAuthenticated, currentUser]);

  // ── Save journal prompt once after result loads ──
  useEffect(() => {
    if (!session || !currentUser || isGuestMode || journalPromptSavedRef.current) return;
    journalPromptSavedRef.current = true;

    const sid = session.selectedScaleIds[0];
    const res = session.scores[sid];
    if (!res) return;

    const onboarding = getOnboardingProfile();
    const prompt = getJournalPrompt(
      sid,
      res.totalScore,
      res.interpretation.label,
      res.subscaleScores,
      onboarding?.genre
    );
    if (prompt && sessionId) {
      savePendingPrompt(currentUser.id, sessionId, sid, prompt).catch(() => {});
    }
  }, [session, currentUser, isGuestMode, sessionId]);

  // ── Load test history ──
  useEffect(() => {
    if (isGuestMode || !isAuthenticated || !currentUser || !session) return;
    const sid = session.selectedScaleIds[0];
    getTestHistory(currentUser.id, sid)
      .then(h => setHistory(h))
      .catch(() => {});
  }, [session, isGuestMode, isAuthenticated, currentUser]);

  const handleRetake = async () => {
    if (!currentUser || !session || !scale || isGuestMode) return;
    setRetaking(true);
    try {
      const sid = session.selectedScaleIds[0];
      // Get answers from current session to archive them
      const answers = await getAnswersFromSession(session.id, sid);
      await archiveCurrentResult(currentUser.id, sid, answers ?? {});
      // Create new session for the same scale
      const newSession = await createSession(currentUser.id, [sid]);
      navigate(`/assessment/quiz/${newSession.id}`);
    } catch (err) {
      console.error('Retake error:', err);
      setRetaking(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !session || isGuestMode) return;
    setDeleting(true);
    try {
      const sid = session.selectedScaleIds[0];
      await deleteTestResult(currentUser.id, sid);
      navigate('/assessment');
    } catch (err) {
      console.error('Delete error:', err);
      setDeleting(false);
    }
  };

  const handleDeleteHistoryEntry = async (entryId: string) => {
    if (!currentUser) return;
    try {
      await deleteSpecificHistoryEntry(currentUser.id, entryId);
      setHistory(prev => prev.filter(h => h.id !== entryId));
    } catch (err) {
      console.error('Delete history entry error:', err);
    }
  };

  // ── Loading ──

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

  // ── Data resolution ──

  const scaleId = session.selectedScaleIds[0];
  const result: ScaleResult | undefined = session.scores[scaleId];
  const rawScale = getScaleById(scaleId);
  const userGender = getOnboardingProfile()?.genre ?? 'homme';
  const scale = rawScale ? resolveScaleGender(rawScale, userGender) : null;

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

  // Resolve gender placeholders in the stored interpretation
  const rg = (t: string) => t.replace(/\{\{([^|]+)\|([^}]+)\}\}/g, (_, m, f) => userGender === 'homme' ? m : f);
  const resolvedInterp = {
    ...result.interpretation,
    label: rg(result.interpretation.label),
    description: rg(result.interpretation.description),
    recommendation: rg(result.interpretation.recommendation),
  };
  const severity = resolvedInterp.severity;
  const categoryLabel = scale.category === 'mental_health' ? 'Profil psychologique' : 'Vie intime';
  const bgCard = severityBg[severity] ?? severityBg.mild;
  const badge  = severityBadge[severity] ?? severityBadge.mild;
  const icon   = severityIcon[severity] ?? severityIcon.mild;

  const alertLevel = result.alertLevel ?? 0;
  const criticalAlerts = (result.alertsTriggered ?? []).filter(a => a.alertLevel === 3);
  const showCriticalModal = alertLevel >= 3 && criticalAlerts.length > 0 && !criticalAlertDismissed;

  // ── Render ──

  return (
    <>
      {/* ── Modal Alerte Critique (Niveau 3) ── */}
      {showCriticalModal && (
        <CriticalAlertModal
          alerts={criticalAlerts}
          onAcknowledge={() => setCriticalAlertDismissed(true)}
        />
      )}

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

            <div className="flex items-center justify-center mb-5">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${badge}`}>
                {icon}
                {resolvedInterp.label}
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-end justify-center gap-2 mb-4">
                <span className="text-5xl font-extrabold text-gray-900 leading-none">
                  {typeof result.totalScore === 'number' && result.totalScore % 1 !== 0
                    ? result.totalScore.toFixed(2)
                    : result.totalScore}
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
                label={resolvedInterp.label}
              />
            </div>

            <p className="text-sm text-gray-700 leading-relaxed text-center mb-3">
              {resolvedInterp.description}
            </p>

            {resolvedInterp.recommendation && (
              <p className="text-xs text-gray-500 italic text-center border-t border-black/10 pt-3">
                {resolvedInterp.recommendation}
              </p>
            )}
          </div>

          {/* ── Alertes spécifiques par item (niveau 2 visible) ── */}
          {result.alertsTriggered && result.alertsTriggered
            .filter(a => a.alertLevel === 2)
            .map((alert, i) => (
              <AlertLevel2Block key={i} message={alert.message} />
            ))
          }

          {/* ── Alerte générale si interprétation niveau 2+ ── */}
          {alertLevel === 2 && !result.alertsTriggered?.some(a => a.alertLevel === 2) && (
            <AlertLevel2Block />
          )}
          {alertLevel === 1 && <AlertLevel1Block />}

          {/* ── Ancienne alerte consultation (fallback si pas d'alertLevel) ── */}
          {resolvedInterp.referralRequired && alertLevel === 0 && (
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-300 rounded-2xl p-4">
              <AlertTriangle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-800 mb-1">Consultation recommandée</p>
                <p className="text-sm text-orange-700 leading-relaxed">{scale.warningMessage}</p>
                <button
                  onClick={() => navigate('/professionals')}
                  className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-orange-700 hover:text-orange-900 transition-colors"
                >
                  Trouver un professionnel <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Sous-échelles ── */}
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
                  const displayScore = typeof subScore === 'number' && subScore % 1 !== 0
                    ? subScore.toFixed(2)
                    : subScore;
                  return (
                    <div key={sub.key} className="flex items-center gap-3">
                      <p className="text-xs text-gray-600 w-40 flex-shrink-0 truncate">{sub.label}</p>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-teal-400 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-16 text-right flex-shrink-0">
                        {displayScore}<span className="text-gray-400 font-normal">/{sub.range.max}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Note ECR-R : explication quadrant */}
              {scale.id === 'ecr_r' && result.subscaleScores.anxiety !== undefined && result.subscaleScores.avoidance !== undefined && (
                <div style={{
                  marginTop: 14, padding: '10px 12px',
                  background: '#F0F9FF', borderRadius: 10, border: '1px solid #BAE6FD',
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#0369A1', lineHeight: 1.5 }}>
                    <strong>Ton style :</strong>{' '}
                    {result.subscaleScores.anxiety < 3.5 && result.subscaleScores.avoidance < 3.5 && '🟢 Sécure — faible anxiété et faible évitement'}
                    {result.subscaleScores.anxiety >= 3.5 && result.subscaleScores.avoidance < 3.5 && '🟡 Préoccupé — anxiété élevée, faible évitement'}
                    {result.subscaleScores.anxiety < 3.5 && result.subscaleScores.avoidance >= 3.5 && '🔵 Détaché — faible anxiété, évitement élevé'}
                    {result.subscaleScores.anxiety >= 3.5 && result.subscaleScores.avoidance >= 3.5 && '🔴 Craintif — anxiété et évitement tous deux élevés'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Conseils personnalisés Dr Lô (auto-chargé) ── */}
          {!isGuestMode && isAuthenticated && currentUser && (() => {
            const onboarding = getOnboardingProfile();
            return (
              <ConseilsCard
                userId={currentUser.id}
                scaleId={scale.id}
                scaleName={scale.name}
                score={result.totalScore}
                scoreMax={scale.scoreRange.max}
                niveau={resolvedInterp.label}
                severity={resolvedInterp.severity}
                prenom={onboarding?.prenom ?? undefined}
                genre={onboarding?.genre ?? undefined}
                interpretation={resolvedInterp.description}
                autoLoad
              />
            );
          })()}

          {/* ── Bouton vers l'analyse complète Dr Lô ── */}
          {!isGuestMode && isAuthenticated && (
            <button
              onClick={() => {
                const cat = scale.category === 'mental_health' || scale.category === 'bonus' ? 'mental' : 'sexual';
                navigate(`/assessment/${cat}?tab=profil`);
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)',
                border: '1.5px solid rgba(59,130,246,0.2)',
                borderRadius: 16,
                padding: '16px 20px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 2px 12px rgba(59,130,246,0.06)',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3B82F6, #2DD4BF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
              }}>
                🩺
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0A2342' }}>
                  Voir l'analyse complète Dr Lô
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                  Synthèse globale de ton profil {scale.category === 'mental_health' || scale.category === 'bonus' ? 'psychologique' : 'intime'}
                </p>
              </div>
              <ArrowRight size={18} style={{ color: '#3B82F6', flexShrink: 0 }} />
            </button>
          )}

          {/* ── Bannière inscription (mode invité) ── */}
          {isGuestMode && (
            <div
              style={{
                borderRadius: 16, overflow: 'hidden',
                border: isLastFreeTest ? '2px solid #3B82F6' : '1px solid rgba(59,130,246,0.25)',
                background: isLastFreeTest ? 'linear-gradient(135deg,#EFF6FF,#F0FDFA)' : 'rgba(239,246,255,0.7)',
              }}
            >
              {isLastFreeTest && (
                <div style={{
                  background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
                  padding: '8px 16px', fontSize: 12, fontWeight: 700, color: 'white', textAlign: 'center',
                }}>
                  🎯 Tu as utilisé tous tes essais gratuits !
                </div>
              )}
              <div style={{ padding: '16px 18px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#0A2342' }}>
                  {isLastFreeTest ? 'Crée un compte pour continuer' : `${GUEST_MAX_TESTS - guestCount} essai${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} gratuit restant`}
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748B' }}>
                  {isLastFreeTest ? 'Sauvegarde tes résultats et accède à toutes les évaluations sans limite.' : 'Connecte-toi pour sauvegarder tes résultats et suivre ta progression.'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    to="/patient/access"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
                      color: 'white', fontWeight: 700, fontSize: 13,
                      padding: '9px 18px', borderRadius: 10, textDecoration: 'none',
                    }}
                  >
                    {isLastFreeTest ? 'Créer mon compte gratuit →' : 'Se connecter'}
                  </Link>
                  {!isLastFreeTest && (
                    <button
                      onClick={() => navigate('/assessment')}
                      style={{
                        background: 'white', border: '1px solid rgba(59,130,246,0.25)',
                        color: '#475569', fontWeight: 600, fontSize: 13,
                        padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                      }}
                    >
                      Continuer sans compte
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Boutons Refaire / Supprimer (utilisateurs connectés) ── */}
          {!isGuestMode && isAuthenticated && (
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap',
            }}>
              <button
                onClick={handleRetake}
                disabled={retaking}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #3B82F6, #2DD4BF)',
                  color: 'white', border: 'none', borderRadius: 12,
                  padding: '12px 18px', fontSize: 14, fontWeight: 700,
                  cursor: retaking ? 'not-allowed' : 'pointer',
                  opacity: retaking ? 0.6 : 1,
                }}
              >
                <RefreshCw size={16} />
                {retaking ? 'Préparation…' : 'Refaire ce test'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'white', border: '1.5px solid #FCA5A5',
                  borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600,
                  color: '#DC2626', cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            </div>
          )}

          {/* ── Confirmation suppression ── */}
          {showDeleteConfirm && (
            <div style={{
              background: '#FEF2F2', border: '1.5px solid #FCA5A5',
              borderRadius: 14, padding: 16,
            }}>
              <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#991B1B' }}>
                Supprimer ce résultat ?
              </p>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: '#B91C1C', lineHeight: 1.5 }}>
                Le test redeviendra "à faire" et tout l'historique sera supprimé. Cette action est irréversible.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1, background: 'white', border: '1px solid #E5E7EB',
                    borderRadius: 10, padding: '10px 14px', fontSize: 13,
                    fontWeight: 600, color: '#374151', cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    flex: 1, background: '#DC2626', border: 'none',
                    borderRadius: 10, padding: '10px 14px', fontSize: 13,
                    fontWeight: 700, color: 'white',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          )}

          {/* ── Historique des tentatives ── */}
          {!isGuestMode && history.length > 0 && scale && (
            <>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  background: 'white', border: '1px solid #E5E7EB',
                  borderRadius: 12, padding: '12px 16px', fontSize: 13,
                  fontWeight: 600, color: '#475569', cursor: 'pointer',
                }}
              >
                <Clock size={15} />
                {showHistory ? 'Masquer l\'historique' : `Voir l'historique (${history.length} passage${history.length > 1 ? 's' : ''} précédent${history.length > 1 ? 's' : ''})`}
              </button>
              {showHistory && (
                <TestHistoryPanel
                  scaleId={scale.id}
                  scaleName={scale.name}
                  scoreMax={scale.scoreRange.max}
                  currentScore={result.totalScore}
                  currentLabel={resolvedInterp.label}
                  currentSeverity={resolvedInterp.severity}
                  currentDate={result.completedAt}
                  history={history.map(h => ({
                    id: h.id,
                    attemptNumber: h.attemptNumber,
                    totalScore: h.totalScore,
                    interpretation: { label: h.interpretation.label, severity: h.interpretation.severity },
                    completedAt: h.completedAt,
                  }))}
                  onDeleteEntry={handleDeleteHistoryEntry}
                />
              )}
            </>
          )}

          {/* ── Boutons de navigation ── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {!isGuestMode && (
              <button
                onClick={() => navigate('/assessment/profile')}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                Voir mon profil
                <ArrowRight size={16} />
              </button>
            )}
            <button
              onClick={() => navigate('/assessment')}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium text-sm px-6 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              {isGuestMode ? 'Faire une autre évaluation' : 'Autre évaluation'}
            </button>
          </div>

          {/* ── Lien Mon Espace (si prompt déclenché) ── */}
          {!isGuestMode && isAuthenticated && (
            <button
              onClick={() => navigate('/mon-espace')}
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg,#065F46 0%,#1D4ED8 100%)',
                color: '#fff', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: 22 }}>📔</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                  En parler dans Mon Espace
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                  Dr Lo t'a préparé une invitation dans ton journal
                </p>
              </div>
              <span style={{ fontSize: 16, opacity: 0.8 }}>→</span>
            </button>
          )}

          {/* ── Disclaimer ── */}
          <p className="text-xs text-gray-400 text-center leading-relaxed pb-4">
            Ces résultats sont fournis à titre informatif uniquement et ne constituent pas un diagnostic médical.
            En cas de doute ou de symptômes persistants, consultez un professionnel de santé qualifié.
          </p>

        </div>
      </div>
    </>
  );
};

export default AssessmentResultsPage;

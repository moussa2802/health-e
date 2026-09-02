import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, ArrowRight, Loader2, ChevronRight,
  Phone, Heart, ShieldAlert, RefreshCw, Trash2, Clock, BookOpen,
  Upload, Sparkles, FileText,
} from 'lucide-react';
import { getSession, getProfileProgress } from '../../services/evaluationService';
import { useAuth } from '../../contexts/AuthContext';
import { getGuestSession, guestToUserSession, getGuestCount, GUEST_MAX_TESTS } from '../../utils/guestSession';
import { getScaleById } from '../../data/scales';
import { resolveScaleGender } from '../../utils/gender';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import type { UserAssessmentSession, ScaleResult, TriggeredAlert } from '../../types/assessment';
import { getCrisisResources } from '../../data/crisisResources';
import { getJournalPrompt, savePendingPrompt } from '../../utils/journalPrompts';
import { archiveCurrentResult, getTestHistory, deleteTestResult, deleteSpecificHistoryEntry, getAnswersFromSession } from '../../services/testManagementService';
import type { ScaleResultHistoryEntry } from '../../services/testManagementService';
import TestHistoryPanel from '../../components/assessment/TestHistoryPanel';
import { createSession } from '../../services/evaluationService';
import ConseilsCard from '../../components/assessment/ConseilsCard';
import ResultCard from '../../components/assessment/ResultCard';
import { getResultCardConfig } from '../../data/experiences';
import { shareResultCard } from '../../utils/shareCard';
import { getScaleMeta, getScaleCategory, getCategoryColor } from '../../utils/scaleMeta';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS, spendKorisForTest, isTestFreeRetake } from '../../services/korisService';

const EMERGENCY_CONTACTS = getCrisisResources().map(r => ({
  label: r.label,
  number: r.phone ?? '',
  description: r.availability ?? r.note ?? '',
}));

// ── Critical Alert Modal ──

interface CriticalAlertModalProps {
  alerts: TriggeredAlert[];
  onAcknowledge: () => void;
}

const CriticalAlertModal: React.FC<CriticalAlertModalProps> = ({ alerts, onAcknowledge }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'white', borderRadius: 20, maxWidth: 480, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>
        <div style={{ background: '#DC2626', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={28} color="white" />
            <div>
              <p style={{ margin: 0, color: 'white', fontSize: 18, fontWeight: 700 }}>Message important</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Lis ce message attentivement</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#7F1D1D' }}>
              <Heart size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#DC2626' }} />
              {alerts[0]?.message}
            </p>
          </div>

          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
            Tu n'as pas à traverser ça seul(e). Des professionnels formés sont disponibles pour t'écouter et t'accompagner, sans jugement.
          </p>

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
                background: 'rgba(74,93,87,0.04)',
                border: '1px solid rgba(74,93,87,0.15)',
                borderRadius: 10, padding: '10px 14px', textDecoration: 'none',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#4A5D57' }}>Healt-e — Professionnels</p>
                <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Consulter un professionnel sur la plateforme</p>
              </div>
              <ChevronRight size={16} color="#4A5D57" />
            </Link>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              J'ai lu ce message et je suis conscient(e) des ressources disponibles.
            </span>
          </label>

          <button
            onClick={onAcknowledge}
            disabled={!acknowledged}
            style={{
              width: '100%',
              background: acknowledged ? '#4A5D57' : '#D1D5DB',
              color: 'white', border: 'none',
              padding: '12px 20px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: acknowledged ? 'pointer' : 'not-allowed',
            }}
          >
            Continuer vers mes résultats
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Alert blocks ──

const AlertLevel2Block: React.FC<{ message?: string }> = ({ message }) => (
  <div style={{
    background: '#FFF7ED', border: '1.5px solid #F97316',
    borderRadius: 16, padding: '16px 18px',
  }}>
    <div style={{ display: 'flex', gap: 10 }}>
      <AlertTriangle size={20} color="#EA580C" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#9A3412' }}>
          Consultation professionnelle recommandée
        </p>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#C2410C', lineHeight: 1.5 }}>
          {message ?? 'Ce que tu ressens mérite l\'attention d\'un professionnel.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {EMERGENCY_CONTACTS.slice(0, 2).map(c => c.number && (
            <a key={c.label} href={`tel:${c.number}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#EA580C', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <Phone size={13} /> {c.label} — {c.number}
            </a>
          ))}
          <Link to="/professionals"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4A5D57', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Trouver un professionnel sur Healt-e <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  </div>
);

const AlertLevel1Block: React.FC = () => (
  <div style={{
    background: '#FFFBEB', border: '1px solid #FCD34D',
    borderRadius: 14, padding: '14px 16px',
  }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#92400E' }}>Zone de vigilance</p>
        <p style={{ margin: 0, fontSize: 13, color: '#B45309', lineHeight: 1.5 }}>
          Tes résultats indiquent des difficultés qui méritent attention. Un professionnel peut t'apporter un soutien précieux.
        </p>
      </div>
    </div>
  </div>
);

// ── Main component ──

const AssessmentResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGuestMode = searchParams.get('guest') === 'true';
  const { currentUser, isAuthenticated } = useAuth();
  const { refreshBalance, setShowNoKorisModal } = useKoris();
  const location = useLocation();
  const responseQuality = (location.state as any)?.responseQuality;

  const [session, setSession] = useState<UserAssessmentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [criticalAlertDismissed, setCriticalAlertDismissed] = useState(false);
  const journalPromptSavedRef = useRef(false);
  const [history, setHistory] = useState<ScaleResultHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [signatureValues, setSignatureValues] = useState<{ value: number; max: number }[] | undefined>();
  const cardRef = useRef<HTMLDivElement>(null);

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
      .then((s) => { if (!s) { setError('Session introuvable.'); return; } setSession(s); })
      .catch(() => setError('Erreur lors du chargement des résultats.'))
      .finally(() => setLoading(false));
  }, [sessionId, isGuestMode]);

  useEffect(() => {
    if (!session || !currentUser || isGuestMode || journalPromptSavedRef.current) return;
    journalPromptSavedRef.current = true;
    const sid = session.selectedScaleIds[0];
    const res = session.scores[sid];
    if (!res) return;
    const onboarding = getOnboardingProfile();
    const prompt = getJournalPrompt(sid, res.totalScore, res.interpretation.label, res.subscaleScores, onboarding?.genre);
    if (prompt && sessionId) { savePendingPrompt(currentUser.id, sessionId, sid, prompt).catch(() => {}); }
  }, [session, currentUser, isGuestMode, sessionId]);

  useEffect(() => {
    if (isGuestMode || !isAuthenticated || !currentUser || !session) return;
    const sid = session.selectedScaleIds[0];
    getTestHistory(currentUser.id, sid).then(h => setHistory(h)).catch(() => {});
  }, [session, isGuestMode, isAuthenticated, currentUser]);

  useEffect(() => {
    if (isGuestMode || !isAuthenticated || !currentUser || !session) return;
    const sid = session.selectedScaleIds[0];
    getProfileProgress(currentUser.id)
      .then(p => setSignatureValues(p.signatures?.[sid] ?? undefined))
      .catch(() => {});
  }, [session, isGuestMode, isAuthenticated, currentUser]);

  const handleRetake = async () => {
    if (!currentUser || !session || !scale || isGuestMode) return;
    setRetaking(true);
    try {
      const sid = session.selectedScaleIds[0];
      const lastTakenAt = result?.completedAt ?? null;
      const spendResult = await spendKorisForTest({ [sid]: lastTakenAt });
      if (!spendResult.ok) {
        setShowNoKorisModal(true);
        setRetaking(false);
        return;
      }
      const answers = await getAnswersFromSession(session.id, sid);
      await archiveCurrentResult(currentUser.id, sid, answers ?? {});
      const newSession = await createSession(currentUser.id, [sid]);
      navigate(`/assessment/quiz/${newSession.id}`);
    } catch { setRetaking(false); }
    finally { refreshBalance(); }
  };

  const handleDelete = async () => {
    if (!currentUser || !session || isGuestMode) return;
    setDeleting(true);
    try {
      const sid = session.selectedScaleIds[0];
      await deleteTestResult(currentUser.id, sid);
      navigate('/assessment');
    } catch { setDeleting(false); }
  };

  const handleDeleteHistoryEntry = async (entryId: string) => {
    if (!currentUser) return;
    try {
      await deleteSpecificHistoryEntry(currentUser.id, entryId);
      setHistory(prev => prev.filter(h => h.id !== entryId));
    } catch { /* silencieux */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F3F1EA' }}>
        <div className="text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-4" style={{ color: '#4A5D57' }} />
          <p className="text-ink-light text-sm">Chargement de vos résultats...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F3F1EA' }}>
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow-card">
          <AlertTriangle size={36} className="text-red-500 mx-auto mb-4" />
          <h2 className="font-display text-lg font-semibold text-ink mb-2">Résultats introuvables</h2>
          <p className="text-ink-light mb-6">{error ?? 'Session invalide.'}</p>
          <button onClick={() => navigate('/assessment')}
            className="text-white px-6 py-2.5 rounded-full font-medium" style={{ background: '#4A5D57' }}>
            Retour aux évaluations
          </button>
        </div>
      </div>
    );
  }

  const scaleId = session.selectedScaleIds[0];
  const result: ScaleResult | undefined = session.scores[scaleId];
  const rawScale = getScaleById(scaleId);
  const userGender = getOnboardingProfile()?.genre ?? 'homme';
  const scale = rawScale ? resolveScaleGender(rawScale, userGender) : null;

  if (!result || !scale) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F3F1EA' }}>
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow-card">
          <AlertTriangle size={36} className="text-red-500 mx-auto mb-4" />
          <h2 className="font-display text-lg font-semibold text-ink mb-2">Résultat indisponible</h2>
          <p className="text-ink-light mb-6">Le résultat de cette évaluation n'a pas pu être chargé.</p>
          <button onClick={() => navigate('/assessment')}
            className="text-white px-6 py-2.5 rounded-full font-medium" style={{ background: '#4A5D57' }}>
            Retour aux évaluations
          </button>
        </div>
      </div>
    );
  }

  const rg = (t: string) => t.replace(/\{\{([^|]+)\|([^}]+)\}\}/g, (_, m, f) => userGender === 'homme' ? m : f);
  const resolvedInterp = {
    ...result.interpretation,
    label: rg(result.interpretation.label),
    description: rg(result.interpretation.description),
    recommendation: rg(result.interpretation.recommendation),
  };
  const category = getScaleCategory(scaleId);
  const catColor = getCategoryColor(category);
  const { card: cardCfg, tone: cardTone } = getResultCardConfig(scale);
  const isSober = cardTone === 'sober';
  const isBigFive = scaleId === 'big_five';

  const crumbLabel = scale.category === 'mental_health' ? 'Profil psychologique'
    : scale.category === 'bonus' ? 'Test bonus' : 'Vie intime';

  const retakeFree = isTestFreeRetake(result.completedAt);
  const retakeCostLabel = retakeFree ? 'gratuit' : `${KORIS_COSTS.test} Kori`;

  const alertLevel = result.alertLevel ?? 0;
  const criticalAlerts = (result.alertsTriggered ?? []).filter(a => a.alertLevel === 3)
    .map(a => ({ ...a, message: rg(a.message) }));
  const showCriticalModal = alertLevel >= 3 && criticalAlerts.length > 0 && !criticalAlertDismissed;

  const SEC: React.CSSProperties = {
    marginTop: 14, background: '#fff', border: '1px solid #E7E4DA',
    borderRadius: 18, padding: 17,
    boxShadow: '0 1px 2px rgba(23,24,27,.03)',
  };
  const LAB: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em',
    textTransform: 'uppercase', color: '#8A8C95', margin: 0,
  };
  const AROW: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
  };
  const IC: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 12,
    background: '#E4EAE6', color: '#4A5D57',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <>
      {showCriticalModal && (
        <CriticalAlertModal alerts={criticalAlerts} onAcknowledge={() => setCriticalAlertDismissed(true)} />
      )}

      <div style={{ minHeight: '100vh', background: '#F7F5EF', paddingBottom: 80 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 17px 0' }}>

          {/* Breadcrumb */}
          <p style={{ fontSize: 11, color: '#8A8C95', fontWeight: 600, margin: '0 0 10px' }}>
            {crumbLabel} · {scale.name}{scale.shortName ? ` (${scale.shortName})` : ''}
          </p>

          {/* Dark result card */}
          <ResultCard
            ref={cardRef}
            scale={scale}
            result={result}
            size="full"
            signatureValues={signatureValues}
          />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 9, marginTop: 11 }}>
            {cardCfg.shareable && !isSober && (
              <button
                onClick={() => {
                  if (cardRef.current) shareResultCard(cardRef.current, scale.id);
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
            {!isGuestMode && isAuthenticated && (
              <button
                onClick={handleRetake}
                disabled={retaking}
                style={{
                  flex: 1, cursor: retaking ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  fontWeight: 700, fontSize: 13.5, borderRadius: 14, padding: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: '#FFFFFF', color: '#17181B', border: '1px solid #E7E4DA',
                  opacity: retaking ? 0.6 : 1,
                }}
              >
                <RefreshCw size={15} />{retaking ? 'Préparation...' : 'Refaire'}
                {!retaking && (
                  <span style={{ background: retakeFree ? 'rgba(159,188,175,.22)' : 'rgba(23,24,27,.08)', padding: '2px 7px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                    {retakeFree ? 'GRATUIT' : `${KORIS_COSTS.test}K`}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
            {result.alertsTriggered?.filter(a => a.alertLevel === 2).map((alert, i) => (
              <AlertLevel2Block key={i} message={rg(alert.message)} />
            ))}
            {alertLevel === 2 && !result.alertsTriggered?.some(a => a.alertLevel === 2) && <AlertLevel2Block />}
            {alertLevel === 1 && <AlertLevel1Block />}

            {resolvedInterp.referralRequired && alertLevel === 0 && (
              <div style={{
                background: '#FFF7ED', border: '1px solid #FDBA74',
                borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 10,
              }}>
                <AlertTriangle size={18} style={{ color: '#EA580C', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#9A3412' }}>Consultation recommandée</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#C2410C', lineHeight: 1.5 }}>{scale.warningMessage}</p>
                  <button onClick={() => navigate('/professionals')} style={{
                    background: 'none', border: 'none', padding: 0, marginTop: 6,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 13, fontWeight: 600, color: '#EA580C', cursor: 'pointer',
                  }}>
                    Trouver un professionnel <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Response quality */}
          {responseQuality?.flag === 'low_confidence' && (
            <div style={{
              ...SEC,
              background: '#F1EAD6', border: '1px solid rgba(143,106,31,0.15)',
            }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Clock size={18} style={{ color: '#8F6A1F', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#8F6A1F' }}>Fiabilité réduite</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#92741C', lineHeight: 1.5, textAlign: 'left' }}>
                    Certaines réponses ont été données très rapidement. Pour un résultat plus fiable, reprends le test en prenant le temps de lire chaque question.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ce que ça veut dire */}
          <div style={SEC}>
            <span style={LAB}>Ce que ça veut dire</span>
            <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.65, color: '#4B4D55', textAlign: 'left' }}>
              {resolvedInterp.description}
            </p>
            {resolvedInterp.recommendation && (
              <div style={{
                marginTop: 13, background: '#E4EAE6', borderRadius: 13,
                padding: '12px 13px', display: 'flex', gap: 10,
              }}>
                <Sparkles size={15} style={{ color: '#4A5D57', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: '#33413C', textAlign: 'left' }}>
                  <b style={{ color: '#4A5D57' }}>À retenir :</b> {resolvedInterp.recommendation}
                </p>
              </div>
            )}
          </div>

          {/* Conseils Dr Lo */}
          {!isGuestMode && isAuthenticated && currentUser && (() => {
            const onboarding = getOnboardingProfile();
            return (
              <div style={{ marginTop: 14 }}>
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
                />
              </div>
            );
          })()}

          {/* Dr Lo full analysis */}
          {!isGuestMode && isAuthenticated && (
            <button
              onClick={() => navigate('/assessment/profile')}
              style={{ ...SEC, width: '100%', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={AROW}>
                <div style={IC}><FileText size={19} /></div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#17181B' }}>Voir l'analyse complète</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A8C95', lineHeight: 1.4 }}>
                    Synthèse globale de ton profil
                  </p>
                </div>
                <ChevronRight size={17} style={{ color: '#8A8C95', flexShrink: 0 }} />
              </div>
            </button>
          )}

          {/* Guest banner */}
          {isGuestMode && (
            <div style={{
              ...SEC,
              borderColor: isLastFreeTest ? '#B5522F' : '#E7E4DA',
              borderWidth: isLastFreeTest ? 1.5 : 1,
              overflow: 'hidden', padding: 0,
            }}>
              {isLastFreeTest && (
                <div style={{ background: '#B5522F', padding: '8px 16px', fontSize: 12, fontWeight: 700, color: 'white', textAlign: 'center' }}>
                  Tu as utilisé tous tes essais gratuits !
                </div>
              )}
              <div style={{ padding: '16px 18px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#17181B' }}>
                  {isLastFreeTest ? 'Crée un compte pour continuer' : `${GUEST_MAX_TESTS - guestCount} essai${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} gratuit restant`}
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6B7280', textAlign: 'left' }}>
                  {isLastFreeTest ? 'Sauvegarde tes résultats et accède à toutes les évaluations.' : 'Connecte-toi pour sauvegarder tes résultats.'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to="/patient/access" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#B5522F', color: 'white', fontWeight: 700, fontSize: 13,
                    padding: '9px 18px', borderRadius: 10, textDecoration: 'none',
                  }}>
                    {isLastFreeTest ? 'Créer mon compte gratuit' : 'Se connecter'}
                  </Link>
                  {!isLastFreeTest && (
                    <button onClick={() => navigate('/assessment')} style={{
                      background: 'white', border: '1px solid rgba(23,24,27,0.1)',
                      color: '#475569', fontWeight: 600, fontSize: 13,
                      padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                    }}>
                      Continuer sans compte
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delete */}
          {!isGuestMode && isAuthenticated && (
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting} style={{
                background: 'none', border: 'none', padding: '6px 12px',
                fontSize: 12, fontWeight: 600, color: '#DC2626', cursor: deleting ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5, opacity: deleting ? 0.6 : 1,
              }}>
                <Trash2 size={13} /> Supprimer ce résultat
              </button>
            </div>
          )}

          {/* Delete confirm */}
          {showDeleteConfirm && (
            <div style={{ ...SEC, background: '#FEF2F2', borderColor: '#FCA5A5' }}>
              <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Supprimer ce résultat ?</p>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: '#B91C1C', lineHeight: 1.5, textAlign: 'left' }}>
                Le test redeviendra "à faire" et tout l'historique sera supprimé. Cette action est irréversible.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDeleteConfirm(false)} style={{
                  flex: 1, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10,
                  padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
                }}>Annuler</button>
                <button onClick={handleDelete} disabled={deleting} style={{
                  flex: 1, background: '#DC2626', border: 'none', borderRadius: 10,
                  padding: '10px 14px', fontSize: 13, fontWeight: 700, color: 'white',
                  cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                }}>{deleting ? 'Suppression...' : 'Confirmer la suppression'}</button>
              </div>
            </div>
          )}

          {/* History */}
          {!isGuestMode && history.length > 0 && scale && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setShowHistory(!showHistory)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                background: 'white', border: '1px solid #E7E4DA',
                borderRadius: 14, padding: '12px 16px', fontSize: 13, fontWeight: 600,
                color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Clock size={15} />
                {showHistory ? 'Masquer l\'historique' : `Voir l'historique (${history.length} passage${history.length > 1 ? 's' : ''} précédent${history.length > 1 ? 's' : ''})`}
              </button>
              {showHistory && (
                <div style={{ marginTop: 10 }}>
                  <TestHistoryPanel
                    scaleId={scale.id} scaleName={scale.name} scoreMax={scale.scoreRange.max}
                    currentScore={result.totalScore} currentLabel={resolvedInterp.label}
                    currentSeverity={resolvedInterp.severity} currentDate={result.completedAt}
                    history={history.map(h => ({
                      id: h.id, attemptNumber: h.attemptNumber, totalScore: h.totalScore,
                      subscaleScores: h.subscaleScores,
                      interpretation: { label: h.interpretation.label, severity: h.interpretation.severity },
                      completedAt: h.completedAt,
                    }))}
                    onDeleteEntry={handleDeleteHistoryEntry}
                    bigFiveMode={isBigFive}
                    currentSubscaleScores={isBigFive ? result.subscaleScores : undefined}
                  />
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {!isGuestMode && (
              <button onClick={() => navigate('/assessment/profile')} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: catColor.accent, color: 'white', border: 'none', borderRadius: 14,
                padding: '13px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Voir mon profil <ArrowRight size={16} />
              </button>
            )}
            <button onClick={() => navigate('/assessment')} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#FFFFFF', color: '#4B4D55', border: '1px solid #E7E4DA', borderRadius: 14,
              padding: '13px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {isGuestMode ? 'Faire une autre évaluation' : 'Autre évaluation'}
            </button>
          </div>

          {/* Mon Espace */}
          {!isGuestMode && isAuthenticated && (
            <button onClick={() => navigate('/mon-espace')} style={{
              width: '100%', marginTop: 14, padding: '14px 18px', borderRadius: 14, border: 'none',
              background: '#17181B', color: '#fff', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit',
            }}>
              <BookOpen size={20} color="rgba(255,255,255,0.7)" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>En parler dans Mon Espace</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  Dr Lo t'a préparé une invitation dans ton journal
                </p>
              </div>
              <ChevronRight size={16} style={{ opacity: 0.5 }} />
            </button>
          )}

          {/* Disclaimer */}
          <p style={{
            fontSize: 11, color: 'rgba(138,140,149,.5)', textAlign: 'center',
            lineHeight: 1.7, margin: '20px 0 0', padding: '0 10px',
          }}>
            Ces résultats sont fournis à titre informatif uniquement et ne constituent pas un diagnostic médical.
            En cas de doute, consultez un professionnel de santé qualifié.
          </p>

        </div>
      </div>
    </>
  );
};

export default AssessmentResultsPage;

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  createSession,
} from '../../services/evaluationService';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import type { ScaleResult } from '../../types/assessment';
import type { AssessmentScale } from '../../types/assessment';

// ── Icônes par scale ──────────────────────────────────────────────────────────
const SCALE_ICONS: Record<string, string> = {
  gad7: '😰', phq9: '💙', big_five: '🌟', ecr_r: '🫶',
  rses: '💪', brs: '🌱', pss10: '⚡', ace: '🧩',
  pcl5: '🌀', pg13: '🕊️', ceca_q: '👶', social_pressure: '🌍',
  religious_cultural: '✨', economic_stress: '💰',
  nsss: '❤️', sdi2: '🔥', sis_ses: '⚖️', fsfi: '🌸',
  iief: '💙', tsi_base: '🧩', pair: '🫂', sise: '🪞',
  social_pressure_sex: '🤐', griss_base: '💑',
};

// ── Helpers couleur de sévérité ───────────────────────────────────────────────
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'positive':
    case 'none':
    case 'minimal':
      return '#16A34A';
    case 'mild':
    case 'moderate':
      return '#D97706';
    case 'severe':
    case 'alert':
      return '#DC2626';
    default:
      return '#64748B';
  }
}

function getSeverityBg(severity: string): string {
  switch (severity) {
    case 'positive':
    case 'none':
    case 'minimal':
      return '#DCFCE7';
    case 'mild':
    case 'moderate':
      return '#FEF3C7';
    case 'severe':
    case 'alert':
      return '#FEE2E2';
    default:
      return '#F1F5F9';
  }
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

// ── Composant ScaleRow ────────────────────────────────────────────────────────
interface ScaleRowProps {
  scale: AssessmentScale;
  result?: ScaleResult;
  onStart: (scaleId: string) => void;
  loading: boolean;
}

const ScaleRow: React.FC<ScaleRowProps> = ({ scale, result, onStart, loading }) => {
  const isCompleted = !!result;
  const icon = SCALE_ICONS[scale.id] ?? '📋';

  return (
    <div
      style={{
        background: isCompleted ? '#F0FDF4' : '#FFFFFF',
        border: isCompleted
          ? '1.5px solid rgba(34,197,94,0.3)'
          : '1.5px solid rgba(59,130,246,0.12)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        transition: 'box-shadow 0.15s ease',
      }}
    >
      {/* Icône */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: isCompleted ? '#DCFCE7' : '#EFF6FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>
            {scale.shortName}
          </span>
          {isCompleted && <span style={{ fontSize: 11 }}>✅</span>}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: '#0A2342',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {scale.name}
        </p>

        {isCompleted && result ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: getSeverityBg(result.interpretation.severity),
                color: getSeverityColor(result.interpretation.severity),
              }}
            >
              {result.interpretation.label}
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Score : {result.totalScore}
            </span>
            {result.completedAt && (
              <span style={{ fontSize: 11, color: '#CBD5E1' }}>
                {formatDate(result.completedAt)}
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, display: 'block' }}>
            À faire · {scale.timeEstimateMinutes} min
          </span>
        )}
      </div>

      {/* Bouton action */}
      <div style={{ flexShrink: 0 }}>
        {isCompleted ? (
          <button
            onClick={() => onStart(scale.id)}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(34,197,94,0.4)',
              borderRadius: 18,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: '#16A34A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <div
                style={{
                  width: 12,
                  height: 12,
                  border: '1.5px solid #16A34A',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            ) : (
              'Refaire'
            )}
          </button>
        ) : (
          <button
            onClick={() => onStart(scale.id)}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #2DD4BF)',
              border: 'none',
              borderRadius: 18,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 700,
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: loading ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
            }}
          >
            {loading ? (
              <div
                style={{
                  width: 12,
                  height: 12,
                  border: '1.5px solid rgba(255,255,255,0.8)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            ) : (
              'Commencer'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const AssessmentProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading: authLoading } = useAuth();

  const [scaleResults, setScaleResults] = useState<Record<string, ScaleResult>>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [compatibilityId, setCompatibilityId] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Redirection si non authentifié
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/patient/access');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Chargement du profil
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    setLoadingProfile(true);
    setErrorMsg(null);

    getOrCreateUserProfile(currentUser.id, currentUser.name)
      .then(() => getProfileProgress(currentUser.id))
      .then(progress => {
        setScaleResults(progress.scaleResults);
        setCompletedCount(progress.completedCount);
        setTotalCount(progress.totalCount);
        setIsComplete(progress.isComplete);
        setCompatibilityId(progress.compatibilityId);
      })
      .catch(() => setErrorMsg('Impossible de charger votre profil.'))
      .finally(() => setLoadingProfile(false));
  }, [isAuthenticated, currentUser]);

  // Démarrer une scale
  const startScale = async (scaleId: string) => {
    if (!currentUser) return;
    setLoadingCard(scaleId);
    setErrorMsg(null);
    try {
      const session = await createSession(currentUser.id, [scaleId]);
      navigate(`/assessment/quiz/${session.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du démarrage.';
      setErrorMsg(msg);
    } finally {
      setLoadingCard(null);
    }
  };

  // Copier l'ID
  const handleCopy = async () => {
    if (!compatibilityId) return;
    try {
      await navigator.clipboard.writeText(compatibilityId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback silencieux
    }
  };

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (authLoading || loadingProfile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F8FAFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: '3px solid #3B82F6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 14px',
            }}
          />
          <p style={{ color: '#64748B', fontSize: 14 }}>Chargement de votre profil…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFF',
        fontFamily: "'Inter', -apple-system, sans-serif",
        paddingBottom: 60,
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          padding: '20px 0 18px',
          marginBottom: 28,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
          {/* Fil d'Ariane */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#94A3B8',
              marginBottom: 10,
            }}
          >
            <Link
              to="/assessment"
              style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 500 }}
            >
              Évaluations
            </Link>
            <span>›</span>
            <span style={{ color: '#0A2342', fontWeight: 600 }}>Mon Profil</span>
          </div>

          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#0A2342' }}>
            Mon Profil d'Évaluation
          </h1>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: '#64748B' }}>
            {completedCount}/{totalCount} évaluations complétées
          </p>

          {/* Grande barre de progression */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 10,
                background: '#E0EAFF',
                borderRadius: 99,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #3B82F6, #2DD4BF)',
                  borderRadius: 99,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#3B82F6',
                minWidth: 36,
                textAlign: 'right',
              }}
            >
              {progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Contenu ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>

        {/* ── Erreur ─────────────────────────────────────────────────── */}
        {errorMsg && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 13,
              color: '#DC2626',
              marginBottom: 20,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* ── Card Numéro de référence ───────────────────────────────── */}
        <div
          style={{
            background: isComplete
              ? 'linear-gradient(135deg, #EFF6FF, #F0FDFA)'
              : '#FFFFFF',
            border: isComplete
              ? '1.5px solid rgba(59,130,246,0.25)'
              : '1.5px solid rgba(59,130,246,0.12)',
            borderRadius: 16,
            padding: '20px 22px',
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Icône bouclier */}
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3B82F6, #2DD4BF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 20,
              }}
            >
              🛡️
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0A2342' }}>
                Numéro de référence
              </h2>

              {isComplete && compatibilityId ? (
                <>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748B' }}>
                    Votre profil est complet. Partagez cet identifiant pour la compatibilité.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <code
                      style={{
                        display: 'inline-block',
                        background: '#EFF6FF',
                        border: '1.5px solid rgba(59,130,246,0.25)',
                        borderRadius: 10,
                        padding: '10px 18px',
                        fontSize: 20,
                        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                        fontWeight: 800,
                        color: '#1D4ED8',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {compatibilityId}
                    </code>
                    <button
                      onClick={handleCopy}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 16px',
                        borderRadius: 10,
                        border: copied
                          ? '1.5px solid rgba(22,163,74,0.4)'
                          : '1.5px solid rgba(59,130,246,0.3)',
                        background: copied ? '#F0FDF4' : '#EFF6FF',
                        color: copied ? '#16A34A' : '#2563EB',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {copied ? '✅ Copié !' : '📋 Copier'}
                    </button>
                  </div>
                  <Link
                    to="/assessment/compatibility"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 12,
                      fontSize: 13,
                      color: '#3B82F6',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Tester ma compatibilité avec un proche
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748B', lineHeight: 1.55 }}>
                    Il vous reste{' '}
                    <strong style={{ color: '#3B82F6' }}>
                      {totalCount - completedCount} évaluation{totalCount - completedCount > 1 ? 's' : ''}
                    </strong>{' '}
                    pour obtenir votre numéro de référence unique.
                  </p>
                  <div
                    style={{
                      background: '#F8FAFF',
                      border: '1px solid rgba(59,130,246,0.12)',
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                        Progression
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>
                        {completedCount}/{totalCount}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: '#E0EAFF',
                        borderRadius: 99,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPct}%`,
                          background: 'linear-gradient(90deg, #3B82F6, #2DD4BF)',
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Section Santé Mentale ─────────────────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 22 }}>🧠</span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A2342' }}>
              Santé Mentale
            </h2>
            <span
              style={{
                background: '#EFF6FF',
                color: '#3B82F6',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 20,
                border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              {MENTAL_HEALTH_SCALES.filter(s => !!scaleResults[s.id]).length}/
              {MENTAL_HEALTH_SCALES.length} complétées
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MENTAL_HEALTH_SCALES.map(scale => (
              <ScaleRow
                key={scale.id}
                scale={scale}
                result={scaleResults[scale.id]}
                onStart={startScale}
                loading={loadingCard === scale.id}
              />
            ))}
          </div>
        </section>

        {/* ── Section Santé Sexuelle ────────────────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 22 }}>💋</span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A2342' }}>
              Santé Sexuelle
            </h2>
            <span
              style={{
                background: '#FFF0F9',
                color: '#C026D3',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 20,
                border: '1px solid rgba(192,38,211,0.15)',
              }}
            >
              {SEXUAL_HEALTH_SCALES.filter(s => !!scaleResults[s.id]).length}/
              {SEXUAL_HEALTH_SCALES.length} complétées
            </span>
            <span
              style={{
                background: '#F0FDF4',
                color: '#16A34A',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 10px',
                borderRadius: 20,
                border: '1px solid rgba(22,163,74,0.15)',
              }}
            >
              Confidentiel
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SEXUAL_HEALTH_SCALES.map(scale => (
              <ScaleRow
                key={scale.id}
                scale={scale}
                result={scaleResults[scale.id]}
                onStart={startScale}
                loading={loadingCard === scale.id}
              />
            ))}
          </div>
        </section>

        {/* ── Disclaimer ────────────────────────────────────────────── */}
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid rgba(217,119,6,0.25)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
            <strong>Important :</strong> Ces évaluations sont fournies à titre informatif uniquement et ne
            remplacent en aucun cas une consultation avec un professionnel de santé qualifié.
            En cas de détresse psychologique ou d'urgence, contactez immédiatement un médecin
            ou un service d'urgence.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentProfilePage;

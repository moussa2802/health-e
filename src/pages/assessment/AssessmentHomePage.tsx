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

// ── Couleurs de sévérité ──────────────────────────────────────────────────────
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
      return '#F0FDF4';
    case 'mild':
    case 'moderate':
      return '#FFFBEB';
    case 'severe':
    case 'alert':
      return '#FEF2F2';
    default:
      return '#F8FAFF';
  }
}

// ── Composant ScaleCard ───────────────────────────────────────────────────────
interface ScaleCardProps {
  scale: AssessmentScale;
  result?: ScaleResult;
  isAuthenticated: boolean;
  onStart: (scaleId: string) => void;
  loading: boolean;
}

const ScaleCard: React.FC<ScaleCardProps> = ({
  scale,
  result,
  isAuthenticated,
  onStart,
  loading,
}) => {
  const isCompleted = !!result;
  const icon = SCALE_ICONS[scale.id] ?? '📋';

  return (
    <div
      onClick={() => onStart(scale.id)}
      style={{
        background: '#FFFFFF',
        border: isCompleted
          ? '1.5px solid rgba(34,197,94,0.35)'
          : '1.5px solid rgba(59,130,246,0.18)',
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'relative',
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 6px 20px rgba(59,130,246,0.12)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Icône */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: isCompleted ? '#F0FDF4' : '#EFF6FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            {scale.shortName}
          </span>
          {isCompleted && (
            <span style={{ fontSize: 12 }}>✅</span>
          )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '1px 8px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                background: getSeverityBg(result.interpretation.severity),
                color: getSeverityColor(result.interpretation.severity),
                border: `1px solid ${getSeverityColor(result.interpretation.severity)}30`,
              }}
            >
              {result.interpretation.label}
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Score: {result.totalScore}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, display: 'block' }}>
            {isAuthenticated ? 'À faire' : 'À faire'} · {scale.timeEstimateMinutes} min
          </span>
        )}
      </div>

      {/* Loading spinner ou flèche */}
      <div style={{ flexShrink: 0 }}>
        {loading ? (
          <div
            style={{
              width: 18,
              height: 18,
              border: '2px solid #3B82F6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isCompleted ? '#16A34A' : '#3B82F6'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const AssessmentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  const [scaleResults, setScaleResults] = useState<Record<string, ScaleResult>>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Chargement du profil si authentifié
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
      })
      .catch(() => setErrorMsg('Impossible de charger votre progression.'))
      .finally(() => setLoadingProfile(false));
  }, [isAuthenticated, currentUser]);

  // Démarrer une scale
  const startScale = async (scaleId: string) => {
    if (!isAuthenticated || !currentUser) {
      navigate('/patient/access');
      return;
    }
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

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allScalesCount = MENTAL_HEALTH_SCALES.length + SEXUAL_HEALTH_SCALES.length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFF',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── Keyframes pour le spinner ─────────────────────────────────── */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header de page ────────────────────────────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          padding: '20px 0',
          marginBottom: 28,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Titre */}
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0A2342' }}>
              Mes évaluations
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748B' }}>
              {allScalesCount} outils cliniquement validés
            </p>
          </div>

          {/* Progression + lien profil (si auth) */}
          {isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {!loadingProfile && (
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#3B82F6',
                      marginBottom: 4,
                    }}
                  >
                    {completedCount}/{totalCount} complétées
                  </div>
                  <div
                    style={{
                      width: 130,
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
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              )}
              <Link
                to="/assessment/profile"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #3B82F6, #2DD4BF)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  padding: '7px 14px',
                  borderRadius: 20,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Mon profil
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Bannière non authentifié ──────────────────────────────────── */}
      {!isAuthenticated && (
        <div style={{ maxWidth: 760, margin: '0 auto 20px', padding: '0 20px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: '#1E40AF', fontWeight: 500 }}>
              Connectez-vous pour sauvegarder vos résultats et suivre votre progression
            </p>
            <Link
              to="/patient/access"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'linear-gradient(135deg, #3B82F6, #2DD4BF)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 12,
                padding: '6px 14px',
                borderRadius: 18,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Se connecter
            </Link>
          </div>
        </div>
      )}

      {/* ── Message d'erreur ──────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{ maxWidth: 760, margin: '0 auto 16px', padding: '0 20px' }}>
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 13,
              color: '#DC2626',
            }}
          >
            {errorMsg}
          </div>
        </div>
      )}

      {/* ── Contenu principal ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px 48px' }}>

        {/* ── Section Santé Mentale ─────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          {/* En-tête de section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 22 }}>🧠</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A2342' }}>
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
              {MENTAL_HEALTH_SCALES.length} évaluations
            </span>
          </div>

          {/* Grille de cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: 10,
            }}
          >
            {MENTAL_HEALTH_SCALES.map(scale => (
              <ScaleCard
                key={scale.id}
                scale={scale}
                result={isAuthenticated ? scaleResults[scale.id] : undefined}
                isAuthenticated={isAuthenticated}
                onStart={startScale}
                loading={loadingCard === scale.id}
              />
            ))}
          </div>
        </section>

        {/* ── Section Santé Sexuelle ────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          {/* En-tête de section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 22 }}>💋</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A2342' }}>
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
              {SEXUAL_HEALTH_SCALES.length} évaluations
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

          {/* Grille de cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: 10,
            }}
          >
            {SEXUAL_HEALTH_SCALES.map(scale => (
              <ScaleCard
                key={scale.id}
                scale={scale}
                result={isAuthenticated ? scaleResults[scale.id] : undefined}
                isAuthenticated={isAuthenticated}
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
          <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.55 }}>
            <strong>Important :</strong> Ces évaluations ne remplacent pas une consultation avec un professionnel de
            santé. Elles sont fournies à titre informatif uniquement. En cas de détresse ou d'urgence,
            consultez immédiatement un professionnel qualifié.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentHomePage;

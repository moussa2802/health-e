import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  createSession,
  resetUserProfile,
} from '../../services/evaluationService';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import type { ScaleResult } from '../../types/assessment';
import type { AssessmentScale } from '../../types/assessment';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { triggerDrLoAnalysis } from '../../utils/drLoAnalysis';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDate(date: any): string {
  if (!date) return '';
  try {
    let d: Date;
    if (typeof date.toDate === 'function') {
      d = date.toDate(); // Firestore Timestamp
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) return '';
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

// ── Dr. Lô Panel ──────────────────────────────────────────────────────────────

function renderAnalysis(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Split on **bold** markers
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j} style={{ fontWeight: 700 }}>{part}</strong> : part
    );
    // Signature line
    if (line.startsWith('— Dr Lo')) {
      return (
        <p key={i} style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 700, color: '#3B82F6', fontStyle: 'italic' }}>
          {rendered}
        </p>
      );
    }
    // Section header lines (start with emoji + **text**)
    if (/^[✅⚠️💡👨‍⚕️]/.test(line)) {
      return (
        <p key={i} style={{ margin: '14px 0 4px', fontSize: 14, fontWeight: 600, color: '#0A2342' }}>
          {rendered}
        </p>
      );
    }
    // Bullet points
    if (line.startsWith('•') || line.startsWith('-')) {
      return (
        <p key={i} style={{ margin: '3px 0', paddingLeft: 12, fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
          {rendered}
        </p>
      );
    }
    // Empty line
    if (line.trim() === '') {
      return <div key={i} style={{ height: 6 }} />;
    }
    // Default paragraph
    return (
      <p key={i} style={{ margin: '2px 0', fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
        {rendered}
      </p>
    );
  });
}

interface DrLoPanelProps {
  analysis: string | null;
  completedCount: number;
  prenom: string;
  isRefreshing?: boolean;
}

const DrLoPanel: React.FC<DrLoPanelProps> = ({ analysis, completedCount, prenom, isRefreshing }) => {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(18px)',
        border: '1.5px solid rgba(59,130,246,0.18)',
        borderRadius: 20,
        padding: '22px 24px',
        marginBottom: 28,
        boxShadow: '0 4px 24px rgba(59,130,246,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gradient accent top-left */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
            border: '2px solid rgba(59,130,246,0.25)',
          }}
        >
          <img
            src="/dr-lo.png"
            alt="Dr. LO"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A2342' }}>Dr. Lô</h3>
            <span
              style={{
                background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 20,
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 700,
                color: '#3B82F6',
                letterSpacing: '0.05em',
              }}
            >
              IA ÉVOLUTIVE
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>
            Mise à jour après chaque évaluation
          </p>
        </div>
        {isRefreshing && (
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid #3B82F6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Content */}
      {completedCount === 0 ? (
        <div
          style={{
            background: '#F8FAFF',
            borderRadius: 12,
            padding: '16px 18px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            {prenom ? `Hey ${prenom} 👋 — ` : ''}Complète ta première évaluation pour que je puisse te donner mon analyse personnalisée 🎯
          </p>
        </div>
      ) : analysis ? (
        <div>{renderAnalysis(analysis)}</div>
      ) : (
        <div
          style={{
            background: '#F8FAFF',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: '2px solid #3B82F6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
          <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
            Dr. Lô prépare ton analyse… reviens dans quelques secondes 🔄
          </p>
        </div>
      )}
    </div>
  );
};

// ── Composant CompatibilityCodeCard ──────────────────────────────────────────
interface CodeCardProps {
  type: 'mental' | 'sexual';
  icon: string;
  label: string;
  accentColor: string;
  accentBg: string;
  isComplete: boolean;
  compatibilityId: string | null;
  completedCount: number;
  totalCount: number;
  copied: boolean;
  onCopy: () => void;
}

const CompatibilityCodeCard: React.FC<CodeCardProps> = ({
  icon, label, accentColor, accentBg,
  isComplete, compatibilityId, completedCount, totalCount, copied, onCopy,
}) => {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return (
    <div
      style={{
        background: isComplete ? accentBg : '#FFFFFF',
        border: `1.5px solid ${isComplete ? accentColor + '40' : 'rgba(59,130,246,0.12)'}`,
        borderRadius: 16,
        padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: accentBg,
            border: `1.5px solid ${accentColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0A2342' }}>{label}</h3>
            {isComplete && (
              <span
                style={{
                  background: accentBg,
                  border: `1px solid ${accentColor}30`,
                  borderRadius: 20,
                  padding: '1px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: accentColor,
                  letterSpacing: '0.04em',
                }}
              >
                COMPLET
              </span>
            )}
          </div>

          {isComplete && compatibilityId ? (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748B' }}>
                Partagez ce code pour tester votre compatibilité.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <code
                  style={{
                    display: 'inline-block',
                    background: '#FFFFFF',
                    border: `1.5px solid ${accentColor}30`,
                    borderRadius: 9,
                    padding: '8px 16px',
                    fontSize: 18,
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    fontWeight: 800,
                    color: accentColor,
                    letterSpacing: '0.12em',
                  }}
                >
                  {compatibilityId}
                </code>
                <button
                  onClick={onCopy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 13px',
                    borderRadius: 9,
                    border: copied ? '1.5px solid rgba(22,163,74,0.4)' : `1.5px solid ${accentColor}30`,
                    background: copied ? '#F0FDF4' : '#FFFFFF',
                    color: copied ? '#16A34A' : accentColor,
                    fontSize: 12,
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
                  gap: 4,
                  marginTop: 10,
                  fontSize: 12,
                  color: accentColor,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Tester ma compatibilité →
              </Link>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                <strong style={{ color: accentColor }}>{totalCount - completedCount} évaluation{totalCount - completedCount > 1 ? 's' : ''}</strong> restantes pour obtenir ce code.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: '#E0EAFF',
                    borderRadius: 99,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${accentColor}, ${accentColor}BB)`,
                      borderRadius: 99,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, minWidth: 32, textAlign: 'right' }}>
                  {completedCount}/{totalCount}
                </span>
              </div>
            </>
          )}
        </div>
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
  const [compatibilityIdMental, setCompatibilityIdMental] = useState<string | null>(null);
  const [compatibilityIdSexual, setCompatibilityIdSexual] = useState<string | null>(null);
  const [isMentalComplete, setIsMentalComplete] = useState(false);
  const [isSexualComplete, setIsSexualComplete] = useState(false);
  const [mentalCompletedCount, setMentalCompletedCount] = useState(0);
  const [sexualCompletedCount, setSexualCompletedCount] = useState(0);
  const [drLoAnalysis, setDrLoAnalysis] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedMental, setCopiedMental] = useState(false);
  const [copiedSexual, setCopiedSexual] = useState(false);

  const onboardingProfile = getOnboardingProfile();
  const prenom = onboardingProfile?.prenom || '';
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!currentUser) return;
    if (!window.confirm('Supprimer tous tes résultats et recommencer à zéro ?')) return;
    setResetting(true);
    try {
      await resetUserProfile(currentUser.id);
      localStorage.removeItem('he_onboarding_profile');
      window.location.reload();
    } catch {
      setResetting(false);
    }
  };

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
        setCompatibilityIdMental(progress.compatibilityIdMental);
        setCompatibilityIdSexual(progress.compatibilityIdSexual);
        setIsMentalComplete(progress.isMentalComplete);
        setIsSexualComplete(progress.isSexualComplete);
        setMentalCompletedCount(progress.mentalCompletedCount);
        setSexualCompletedCount(progress.sexualCompletedCount);
        setDrLoAnalysis(progress.drLoAnalysis);
      })
      .catch(() => {
        // Erreurs Firestore transitoires (offline, permission temporaire) → silencieux
      })
      .finally(() => setLoadingProfile(false));
  }, [isAuthenticated, currentUser]);

  // Polling drLoAnalysis — re-déclenche la génération si absente en base
  const drLoPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if (drLoAnalysis) return;
    if (completedCount === 0) return;

    // Re-déclencher si l'analyse n'est pas en base (ex: save raté avant fix des règles Firestore)
    triggerDrLoAnalysis(currentUser.id).catch(() => {});

    let attempts = 0;
    const MAX_ATTEMPTS = 15;
    const poll = async () => {
      attempts++;
      try {
        const p = await getProfileProgress(currentUser.id);
        if (p.drLoAnalysis) { setDrLoAnalysis(p.drLoAnalysis); return; }
      } catch { /* silencieux */ }
      if (attempts < MAX_ATTEMPTS) drLoPollingRef.current = setTimeout(poll, 3000);
    };
    drLoPollingRef.current = setTimeout(poll, 3000);
    return () => { if (drLoPollingRef.current) clearTimeout(drLoPollingRef.current); };
  }, [isAuthenticated, currentUser?.id, drLoAnalysis, completedCount]);

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

  const handleCopyMental = async () => {
    if (!compatibilityIdMental) return;
    try {
      await navigator.clipboard.writeText(compatibilityIdMental);
      setCopiedMental(true);
      setTimeout(() => setCopiedMental(false), 2200);
    } catch { /* silencieux */ }
  };

  const handleCopySexual = async () => {
    if (!compatibilityIdSexual) return;
    try {
      await navigator.clipboard.writeText(compatibilityIdSexual);
      setCopiedSexual(true);
      setTimeout(() => setCopiedSexual(false), 2200);
    } catch { /* silencieux */ }
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

        {/* ── Cards Codes de compatibilité ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {/* Card Mental */}
          <CompatibilityCodeCard
            type="mental"
            icon="🧠"
            label="Profil Mental"
            accentColor="#3B82F6"
            accentBg="#EFF6FF"
            isComplete={isMentalComplete}
            compatibilityId={compatibilityIdMental}
            completedCount={mentalCompletedCount}
            totalCount={MENTAL_HEALTH_SCALES.length}
            copied={copiedMental}
            onCopy={handleCopyMental}
          />
          {/* Card Sexuel */}
          <CompatibilityCodeCard
            type="sexual"
            icon="💋"
            label="Profil Sexuel"
            accentColor="#C026D3"
            accentBg="#FDF4FF"
            isComplete={isSexualComplete}
            compatibilityId={compatibilityIdSexual}
            completedCount={sexualCompletedCount}
            totalCount={SEXUAL_HEALTH_SCALES.length}
            copied={copiedSexual}
            onCopy={handleCopySexual}
          />
        </div>

        {/* ── Dr. Lô Panel ──────────────────────────────────────────── */}
        <DrLoPanel
          analysis={drLoAnalysis}
          completedCount={completedCount}
          prenom={prenom}
        />

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

        {/* ── Reset ─────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: 12,
              cursor: resetting ? 'not-allowed' : 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              padding: '4px 8px',
              opacity: resetting ? 0.5 : 1,
            }}
          >
            {resetting ? 'Réinitialisation…' : 'Réinitialiser mon profil'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentProfilePage;

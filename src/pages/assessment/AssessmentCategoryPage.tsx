import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  createSession,
  saveSexualFilterToProfile,
} from '../../services/evaluationService';
import {
  getGuestCount,
  hasReachedGuestLimit,
  createGuestSession,
  getAllGuestResults,
  GUEST_MAX_TESTS,
} from '../../utils/guestSession';
import {
  getOnboardingProfile,
  getHiddenScaleIds,
} from '../../utils/onboardingProfile';
import {
  getSexualHealthFilter,
  saveSexualHealthFilter,
  isSexualFilterComplete,
  getHiddenSexualScaleIds,
} from '../../utils/sexualHealthFilter';
import SexualHealthFilterWizard from '../../components/assessment/SexualHealthFilter';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import { triggerDrLoMentalHealth, triggerDrLoSexualHealth } from '../../utils/drLoAnalysis';
import { getScaleMeta } from '../../utils/scaleMeta';
import type { ScaleResult, AssessmentScale } from '../../types/assessment';
import type { SexualHealthFilter } from '../../types/onboarding';

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'positive': case 'none': case 'minimal': return '#16A34A';
    case 'mild': case 'moderate': return '#D97706';
    case 'severe': case 'alert': return '#DC2626';
    default: return '#64748B';
  }
}

function getSeverityBg(severity: string): string {
  switch (severity) {
    case 'positive': case 'none': case 'minimal': return '#DCFCE7';
    case 'mild': case 'moderate': return '#FEF3C7';
    case 'severe': case 'alert': return '#FEE2E2';
    default: return '#F1F5F9';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDate(date: any): string {
  if (!date) return '';
  try {
    let d: Date;
    if (typeof date.toDate === 'function') d = date.toDate();
    else if (date instanceof Date) d = date;
    else d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

// ── ScaleRow ──────────────────────────────────────────────────────────────────

const ScaleRow: React.FC<{
  scale: AssessmentScale;
  result?: ScaleResult;
  onStart: (scaleId: string) => void;
  loading: boolean;
}> = ({ scale, result, onStart, loading }) => {
  const isCompleted = !!result;
  const meta = getScaleMeta(scale.id);

  return (
    <div style={{
      background: isCompleted ? '#F0FDF4' : '#FFFFFF',
      border: isCompleted ? '1.5px solid rgba(34,197,94,0.3)' : '1.5px solid rgba(59,130,246,0.12)',
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 13,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: isCompleted ? '#DCFCE7' : '#EFF6FF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{scale.shortName}</span>
          {isCompleted && <span style={{ fontSize: 11 }}>✅</span>}
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A2342', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.label}
        </p>
        {isCompleted && result ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 20,
              fontSize: 11, fontWeight: 700,
              background: getSeverityBg(result.interpretation.severity),
              color: getSeverityColor(result.interpretation.severity),
            }}>
              {result.interpretation.label}
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>Score : {result.totalScore}</span>
            {result.completedAt && (
              <span style={{ fontSize: 11, color: '#CBD5E1' }}>{formatDate(result.completedAt)}</span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, display: 'block' }}>
            À faire · {scale.timeEstimateMinutes} min
          </span>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {isCompleted ? (
          <button onClick={() => onStart(scale.id)} disabled={loading} style={{
            background: 'transparent', border: '1.5px solid rgba(34,197,94,0.4)',
            borderRadius: 18, padding: '5px 12px', fontSize: 11, fontWeight: 600,
            color: '#16A34A', cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: 4, opacity: loading ? 0.6 : 1,
          }}>
            {loading
              ? <div style={{ width: 12, height: 12, border: '1.5px solid #16A34A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : 'Refaire'}
          </button>
        ) : (
          <button onClick={() => onStart(scale.id)} disabled={loading} style={{
            background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)', border: 'none',
            borderRadius: 18, padding: '6px 14px', fontSize: 11, fontWeight: 700,
            color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: 4, opacity: loading ? 0.6 : 1, boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
          }}>
            {loading
              ? <div style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.8)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : 'Commencer'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Required scales for compatibility unlock ──────────────────────────────────

const MENTAL_REQUIRED = [
  { id: 'big_five', label: 'Personnalité' },
  { id: 'ecr_r',   label: 'Style d\'attachement' },
  { id: 'rses',    label: 'Estime de soi' },
  { id: 'gad7',    label: 'Anxiété' },
  { id: 'phq9',    label: 'Humeur & Dépression' },
];
const SEXUAL_REQUIRED = [
  { id: 'nsss', label: 'Satisfaction sexuelle' },
  { id: 'sdi2', label: 'Désir sexuel' },
  { id: 'pair', label: 'Intimité de couple' },
];

function getSeverityDot(severity: string): string {
  switch (severity) {
    case 'positive': case 'none': case 'minimal': return '#16A34A';
    case 'mild': return '#D97706';
    case 'moderate': return '#EA580C';
    case 'severe': case 'alert': return '#DC2626';
    default: return '#64748B';
  }
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'positive': case 'none': case 'minimal': return '🟢';
    case 'mild': return '🟡';
    case 'moderate': return '🟠';
    case 'severe': case 'alert': return '🔴';
    default: return '⚪';
  }
}

// ── ProfileCard ───────────────────────────────────────────────────────────────

const ProfileCard: React.FC<{
  isMental: boolean;
  prenom: string;
  profileResults: Record<string, ScaleResult>;
  scales: AssessmentScale[];
  allScalesForCategory: AssessmentScale[];
  drLoAnalysis: string | null;
  compatibilityId: string | null;
  isAuthenticated: boolean;
  cardRef: React.RefObject<HTMLDivElement>;
}> = ({ isMental, prenom, profileResults, scales, allScalesForCategory, drLoAnalysis, compatibilityId, isAuthenticated, cardRef }) => {

  const accentColor = isMental ? '#1E40AF' : '#7C3AED';
  const gradientBg = isMental
    ? 'linear-gradient(145deg, #0A2342 0%, #1E40AF 50%, #0891B2 100%)'
    : 'linear-gradient(145deg, #3B0764 0%, #7C3AED 50%, #BE185D 100%)';

  const completedScales = scales.filter(s => profileResults[s.id]);
  const completedCount = completedScales.length;
  const totalCount = scales.length;

  // Most recent evaluation date
  const latestDate = completedScales.reduce<Date | null>((best, s) => {
    const r = profileResults[s.id];
    if (!r?.completedAt) return best;
    let d: Date;
    try {
      if (typeof (r.completedAt as {toDate?:()=>Date}).toDate === 'function') {
        d = (r.completedAt as {toDate:()=>Date}).toDate();
      } else { d = new Date(r.completedAt as string); }
      if (isNaN(d.getTime())) return best;
      return !best || d > best ? d : best;
    } catch { return best; }
  }, null);

  const dateStr = latestDate
    ? latestDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  // Compatibility lock status
  const required = isMental ? MENTAL_REQUIRED : SEXUAL_REQUIRED;
  const doneRequired = required.filter(r => profileResults[r.id]).length;
  const totalRequired = required.length;
  const isUnlocked = !!compatibilityId;

  // Initials avatar
  const initials = prenom
    ? prenom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div
      ref={cardRef}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
        maxWidth: 560,
        margin: '0 auto',
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}
    >
      {/* ── Gradient Header ─────────────────────────────────────────────── */}
      <div style={{ background: gradientBg, padding: '28px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{isMental ? '🧠' : '💋'}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.5px' }}>
              HEALTH-E
            </span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20,
            letterSpacing: '1px',
          }}>
            {isMental ? 'SANTÉ MENTALE' : 'SANTÉ SEXUELLE'}
          </span>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#FFFFFF', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
              {prenom || 'Mon Profil'}
            </p>
            {dateStr && (
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
                Évalué·e le {dateStr}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 24px', background: '#FFFFFF' }}>

        {/* Dr Lo section */}
        <div style={{ padding: '20px 0', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              border: `2px solid ${accentColor}30`,
            }}>
              <img src="/dr-lo.png" alt="Dr. Lô"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: accentColor, letterSpacing: '0.5px' }}>
              🩺 ANALYSE DR LÔ
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A' }}>IA</span>
            </div>
          </div>

          <div style={{
            background: '#F8FAFF', borderRadius: 12, padding: '14px 16px',
            border: `1px solid ${accentColor}15`,
          }}>
            {!isAuthenticated && completedCount > 0 ? (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
                  Tu as {completedCount} évaluation{completedCount > 1 ? 's' : ''} — crée un compte pour ton analyse Dr Lô personnalisée 🎯
                </p>
                <Link to="/patient/access" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: `linear-gradient(135deg,${accentColor},${isMental ? '#0891B2' : '#BE185D'})`,
                  color: '#fff', fontWeight: 700, fontSize: 11,
                  padding: '7px 14px', borderRadius: 16, textDecoration: 'none',
                }}>
                  Créer mon compte →
                </Link>
              </>
            ) : completedCount === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', lineHeight: 1.65, fontStyle: 'italic' }}>
                Lance ta première évaluation pour que Dr Lô commence son analyse personnalisée. — Dr Lo 🩺
              </p>
            ) : drLoAnalysis ? (
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {drLoAnalysis}
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 16, height: 16, border: `2px solid ${accentColor}`,
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', flexShrink: 0,
                }} />
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                  Dr. Lô prépare ton analyse…
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Evaluations section */}
        <div style={{ padding: '20px 0', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0A2342', letterSpacing: '0.5px' }}>
              📊 MES ÉVALUATIONS
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{
              height: '100%',
              width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%`,
              background: isMental
                ? 'linear-gradient(90deg,#1E40AF,#0891B2)'
                : 'linear-gradient(90deg,#7C3AED,#BE185D)',
              borderRadius: 99, transition: 'width 0.5s ease',
              minWidth: completedCount > 0 ? 6 : 0,
            }} />
          </div>

          {/* Completed items list */}
          {completedCount === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>
              Aucune évaluation complétée
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {completedScales.map(scale => {
                const result = profileResults[scale.id];
                const meta = getScaleMeta(scale.id);
                const sev = result.interpretation.severity;
                const dotColor = getSeverityDot(sev);
                const emoji = getSeverityEmoji(sev);
                return (
                  <div key={scale.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 10,
                    background: '#F8FAFF',
                  }}>
                    <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0 }}>{meta.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0A2342', flex: 1, minWidth: 0 }}>
                      {meta.label}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: `${dotColor}18`,
                      color: dotColor,
                      fontSize: 11, fontWeight: 700,
                      padding: '2px 9px', borderRadius: 20,
                      border: `1px solid ${dotColor}30`,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {emoji} {result.interpretation.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compatibility code section */}
        <div style={{ padding: '20px 0', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0A2342', letterSpacing: '0.5px', display: 'block', marginBottom: 12 }}>
            🔗 TON CODE DE COMPATIBILITÉ
          </span>

          {!isAuthenticated ? (
            <div style={{
              background: '#F8FAFF', borderRadius: 12, padding: '14px 16px', textAlign: 'center',
              border: '1px dashed #CBD5E1',
            }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748B' }}>
                🔒 Crée un compte pour générer ton code de compatibilité
              </p>
              <Link to="/patient/access" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `linear-gradient(135deg,${accentColor},${isMental ? '#0891B2' : '#BE185D'})`,
                color: '#fff', fontWeight: 700, fontSize: 11,
                padding: '7px 14px', borderRadius: 16, textDecoration: 'none',
              }}>
                Créer mon compte →
              </Link>
            </div>
          ) : isUnlocked ? (
            <div style={{
              background: `linear-gradient(135deg,${accentColor}08,${isMental ? '#0891B2' : '#BE185D'}08)`,
              border: `1.5px solid ${accentColor}30`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 10, color: '#94A3B8', fontWeight: 600, letterSpacing: '1px' }}>
                TON CODE UNIQUE
              </p>
              <p style={{
                margin: '0 0 12px', fontSize: 18, fontWeight: 800,
                color: accentColor, letterSpacing: '1.5px', fontFamily: 'monospace',
              }}>
                {compatibilityId}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>
                Partage ce code pour comparer vos profils de compatibilité ❤️
              </p>
            </div>
          ) : (
            <div style={{
              background: '#F8FAFF', borderRadius: 12, padding: '14px 16px',
              border: '1px dashed #CBD5E1',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                  🔒 {doneRequired}/{totalRequired} évaluations obligatoires
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
                  {Math.round((doneRequired / totalRequired) * 100)}%
                </span>
              </div>
              <div style={{ height: 5, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((doneRequired / totalRequired) * 100)}%`,
                  background: isMental
                    ? 'linear-gradient(90deg,#1E40AF,#0891B2)'
                    : 'linear-gradient(90deg,#7C3AED,#BE185D)',
                  borderRadius: 99, minWidth: doneRequired > 0 ? 6 : 0,
                }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {required.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11 }}>
                      {profileResults[r.id] ? '✅' : '⬜'}
                    </span>
                    <span style={{ fontSize: 11, color: profileResults[r.id] ? '#16A34A' : '#94A3B8', fontWeight: profileResults[r.id] ? 600 : 400 }}>
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{isMental ? '🧠' : '💋'}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>health-e.sn</span>
        </div>
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const AssessmentCategoryPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  const isMental = category === 'mental';
  const isValidCategory = category === 'mental' || category === 'sexual';
  const accentColor = isMental ? '#3B82F6' : '#C026D3';
  const accentGrad = isMental
    ? 'linear-gradient(135deg,#3B82F6,#2DD4BF)'
    : 'linear-gradient(135deg,#C026D3,#EC4899)';

  // ── TOUS les hooks en premier — jamais après un early return ──────────────

  const [activeTab, setActiveTab] = useState<'evaluations' | 'profil'>(
    searchParams.get('tab') === 'profil' ? 'profil' : 'evaluations'
  );
  const [profileResults, setProfileResults] = useState<Record<string, ScaleResult>>({});
  const [drLoAnalysis, setDrLoAnalysis] = useState<string | null>(null);
  const [compatibilityId, setCompatibilityId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showLoginWall, setShowLoginWall] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [sexualFilter, setSexualFilter] = useState<SexualHealthFilter | null>(
    () => getSexualHealthFilter()
  );
  const [showSexualFilter, setShowSexualFilter] = useState(
    !isMental && !isSexualFilterComplete()
  );

  const onboardingProfile = getOnboardingProfile();
  const hiddenIds = onboardingProfile ? getHiddenScaleIds(onboardingProfile) : [];
  const hiddenSexualIds = sexualFilter ? getHiddenSexualScaleIds(sexualFilter) : [];
  const allScales = isMental ? MENTAL_HEALTH_SCALES : SEXUAL_HEALTH_SCALES;
  const scales = allScales.filter(s => !hiddenIds.includes(s.id) && !hiddenSexualIds.includes(s.id));
  const completedCount = scales.filter(s => profileResults[s.id]).length;

  // Redirect si catégorie invalide
  useEffect(() => {
    if (!isValidCategory) {
      navigate('/assessment', { replace: true });
    }
  }, [isValidCategory, navigate]);

  // Charger le profil
  useEffect(() => {
    if (!isValidCategory) return;
    if (!isAuthenticated || !currentUser) {
      setGuestCount(getGuestCount());
      setProfileResults(getAllGuestResults());
      return;
    }
    getOrCreateUserProfile(currentUser.id, currentUser.name)
      .then(() => getProfileProgress(currentUser.id))
      .then(p => {
        setProfileResults(p.scaleResults);
        // Sync le filtre sexuel depuis Firestore si localStorage est vide (nouvel appareil)
        if (!isMental && !isSexualFilterComplete() && p.sexualHealthFilter) {
          saveSexualHealthFilter(p.sexualHealthFilter as SexualHealthFilter);
          setSexualFilter(p.sexualHealthFilter as SexualHealthFilter);
          setShowSexualFilter(false);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, currentUser?.id, isValidCategory]);

  // onSnapshot : Dr Lo en temps réel
  useEffect(() => {
    if (!isValidCategory || !isAuthenticated || !currentUser) return;
    const ref = doc(db, 'userProfiles', currentUser.id);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const drField = isMental ? 'drLoMentalAnalysis' : 'drLoSexualAnalysis';
      if (data[drField]) setDrLoAnalysis(data[drField] as string);
      const codeField = isMental ? 'compatibilityIdMental' : 'compatibilityIdSexual';
      if (data[codeField]) setCompatibilityId(data[codeField] as string);
    }, () => {});
    return () => unsubscribe();
  }, [isAuthenticated, currentUser?.id, isMental, isValidCategory]);

  // Déclenche la génération Dr Lo si absente
  useEffect(() => {
    if (!isValidCategory || !isAuthenticated || !currentUser) return;
    if (drLoAnalysis) return;
    if (completedCount === 0) return;
    if (isMental) {
      triggerDrLoMentalHealth(currentUser.id).catch(() => {});
    } else {
      triggerDrLoSexualHealth(currentUser.id).catch(() => {});
    }
  }, [isAuthenticated, currentUser?.id, drLoAnalysis, completedCount, isMental, isValidCategory]);

  // ── Early returns APRÈS tous les hooks ────────────────────────────────────

  if (!isValidCategory) return null;

  const startScale = async (scaleId: string) => {
    if (!isAuthenticated || !currentUser) {
      if (hasReachedGuestLimit()) { setShowLoginWall(true); return; }
      const gs = createGuestSession(scaleId);
      setGuestCount(getGuestCount());
      navigate(`/assessment/quiz/${gs.id}?guest=true`);
      return;
    }
    setLoadingCard(scaleId);
    setErrorMsg(null);
    try {
      const session = await createSession(currentUser.id, [scaleId]);
      navigate(`/assessment/quiz/${session.id}`);
    } catch {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const session = await createSession(currentUser.id, [scaleId]);
        navigate(`/assessment/quiz/${session.id}`);
      } catch {
        setErrorMsg('Connexion instable. Réessaie dans quelques secondes.');
      }
    } finally {
      setLoadingCard(null);
    }
  };

  const switchTab = (tab: 'evaluations' | 'profil') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const shareProfile = async () => {
    if (!cardRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });
      const dataUrl = canvas.toDataURL('image/png');
      // Try Web Share API (mobile)
      canvas.toBlob(async (blob) => {
        if (blob && navigator.share) {
          try {
            const file = new File([blob], `health-e-profil-${onboardingProfile?.prenom ?? 'moi'}.png`, { type: 'image/png' });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title: 'Mon profil Health-e' });
              return;
            }
          } catch { /* fall through to download */ }
        }
        // Fallback: download
        const link = document.createElement('a');
        link.download = `health-e-profil-${onboardingProfile?.prenom ?? 'moi'}.png`;
        link.href = dataUrl;
        link.click();
      });
    } catch { /* silent */ } finally {
      setIsCapturing(false);
    }
  };

  const copyCompatibilityCode = () => {
    if (!compatibilityId) return;
    navigator.clipboard.writeText(compatibilityId).then(() => {
      setCopyMsg('Copié !');
      setTimeout(() => setCopyMsg(null), 2000);
    });
  };

  if (showSexualFilter) {
    return (
      <SexualHealthFilterWizard
        onComplete={(filter) => {
          setSexualFilter(filter);
          saveSexualHealthFilter(filter);
          setShowSexualFilter(false);
          // Persister dans Firestore pour les autres appareils
          if (isAuthenticated && currentUser) {
            saveSexualFilterToProfile(currentUser.id, filter as unknown as Record<string, unknown>).catch(() => {});
          }
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        padding: '14px 0',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 600, margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={() => navigate('/assessment')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 8px', borderRadius: 8,
              color: '#64748B', fontSize: 20, flexShrink: 0,
            }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A2342', flex: 1 }}>
            {isMental ? '🧠 Santé Mentale' : '💋 Santé Sexuelle'}
          </h1>
          <span style={{
            background: `${accentColor}18`, color: accentColor,
            fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 18,
            border: `1px solid ${accentColor}30`, whiteSpace: 'nowrap',
          }}>
            {completedCount}/{scales.length}
          </span>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 600, margin: '16px auto 0', padding: '0 20px' }}>
        <div style={{
          display: 'flex', background: 'white',
          border: '1px solid rgba(59,130,246,0.1)',
          borderRadius: 14, padding: 4, gap: 4,
        }}>
          {(['evaluations', 'profil'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: activeTab === tab ? accentGrad : 'transparent',
                color: activeTab === tab ? 'white' : '#64748B',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              {tab === 'evaluations' ? '📋 Évaluations' : '👤 Mon Profil'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bandeau erreur ──────────────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{ maxWidth: 600, margin: '10px auto 0', padding: '0 20px' }}>
          <div style={{
            background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#DC2626',
          }}>
            {errorMsg}
          </div>
        </div>
      )}

      {/* ── Bandeau invité ──────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <div style={{ maxWidth: 600, margin: '10px auto 0', padding: '0 20px' }}>
          <div style={{
            background: 'linear-gradient(135deg,#EFF6FF,#F0FDFA)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 12, padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1E40AF', fontWeight: 500 }}>
              {guestCount < GUEST_MAX_TESTS
                ? `${GUEST_MAX_TESTS - guestCount} essai${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} gratuit${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} restant`
                : 'Limite atteinte — crée un compte pour continuer'}
            </p>
            <Link to="/patient/access" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
              color: '#fff', fontWeight: 600, fontSize: 11,
              padding: '5px 12px', borderRadius: 14, textDecoration: 'none',
            }}>
              {guestCount >= GUEST_MAX_TESTS ? 'Créer un compte' : 'Se connecter'}
            </Link>
          </div>
        </div>
      )}

      {/* ── Contenu ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 600, margin: '16px auto 0', padding: '0 20px 60px' }}>

        {/* Onglet Évaluations */}
        {activeTab === 'evaluations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scales.map(scale => (
              <ScaleRow
                key={scale.id}
                scale={scale}
                result={profileResults[scale.id]}
                onStart={startScale}
                loading={loadingCard === scale.id}
              />
            ))}
            <div style={{
              marginTop: 12,
              background: '#FFFBEB', border: '1px solid rgba(217,119,6,0.22)',
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
              <p style={{ margin: 0, fontSize: 11, color: '#92400E', lineHeight: 1.55 }}>
                Ces évaluations ne remplacent pas une consultation avec un professionnel de santé.
                En cas de détresse, consultez immédiatement un spécialiste qualifié.
              </p>
            </div>
          </div>
        )}

        {/* Onglet Mon Profil */}
        {activeTab === 'profil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProfileCard
              isMental={isMental}
              prenom={onboardingProfile?.prenom ?? (currentUser?.name ?? '')}
              profileResults={profileResults}
              scales={scales}
              allScalesForCategory={allScales}
              drLoAnalysis={drLoAnalysis}
              compatibilityId={compatibilityId}
              isAuthenticated={isAuthenticated}
              cardRef={cardRef}
            />

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={shareProfile}
                disabled={isCapturing || completedCount === 0}
                style={{
                  flex: 1,
                  background: isCapturing
                    ? '#E2E8F0'
                    : isMental
                      ? 'linear-gradient(135deg,#1E40AF,#0891B2)'
                      : 'linear-gradient(135deg,#7C3AED,#BE185D)',
                  border: 'none', borderRadius: 14,
                  padding: '13px 16px', cursor: completedCount === 0 ? 'not-allowed' : 'pointer',
                  color: isCapturing ? '#94A3B8' : '#FFFFFF',
                  fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: completedCount === 0 ? 'none' : '0 3px 12px rgba(0,0,0,0.2)',
                  opacity: completedCount === 0 ? 0.5 : 1,
                }}
              >
                {isCapturing
                  ? <><div style={{ width: 14, height: 14, border: '2px solid #94A3B8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Capture…</>
                  : <>📸 Télécharger mon profil</>
                }
              </button>

              {isAuthenticated && compatibilityId && (
                <button
                  onClick={copyCompatibilityCode}
                  style={{
                    flex: 1,
                    background: copyMsg ? '#DCFCE7' : 'white',
                    border: `1.5px solid ${copyMsg ? '#16A34A' : accentColor}30`,
                    borderRadius: 14, padding: '13px 16px',
                    cursor: 'pointer', color: copyMsg ? '#16A34A' : accentColor,
                    fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copyMsg ? `✅ ${copyMsg}` : '🔗 Copier mon code'}
                </button>
              )}
            </div>

            {completedCount === 0 && (
              <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
                Complète au moins une évaluation pour télécharger ton profil
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Modale login wall ──────────────────────────────────────────────── */}
      {showLoginWall && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setShowLoginWall(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 20, padding: 28,
              maxWidth: 400, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0A2342' }}>
              Tu as utilisé tes 3 essais gratuits !
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569', lineHeight: 1.55 }}>
              Crée un compte <strong>gratuit</strong> pour :
            </p>
            <ul style={{ textAlign: 'left', margin: '0 0 20px', padding: '0 0 0 20px', fontSize: 12, color: '#475569', lineHeight: 1.9 }}>
              <li>✅ Accéder aux 24 évaluations sans limite</li>
              <li>✅ Sauvegarder et suivre ta progression</li>
              <li>✅ Obtenir ton profil Dr Lô en santé mentale &amp; sexuelle</li>
              <li>✅ Tester ta compatibilité avec un proche</li>
            </ul>
            <Link to="/patient/access" style={{
              display: 'block', width: '100%',
              background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              padding: '13px 0', borderRadius: 14, textDecoration: 'none', marginBottom: 10,
            }}>
              Créer mon compte gratuit →
            </Link>
            <button
              onClick={() => setShowLoginWall(false)}
              style={{ background: 'transparent', border: 'none', fontSize: 12, color: '#94A3B8', cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentCategoryPage;

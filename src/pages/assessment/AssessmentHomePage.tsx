import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  createSession,
  saveOnboardingToProfile,
  resetUserProfile,
} from '../../services/evaluationService';
import {
  getGuestCount,
  hasReachedGuestLimit,
  createGuestSession,
  getAllGuestResults,
  GUEST_MAX_TESTS,
} from '../../utils/guestSession';
import {
  isOnboardingComplete,
  getOnboardingProfile,
  getHiddenScaleIds,
  saveOnboardingProfile,
} from '../../utils/onboardingProfile';
import OnboardingProfile from '../../components/assessment/OnboardingProfile';
import SexualHealthFilterWizard from '../../components/assessment/SexualHealthFilter';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import {
  getSexualHealthFilter,
  saveSexualHealthFilter,
  isSexualFilterComplete,
  getHiddenSexualScaleIds,
} from '../../utils/sexualHealthFilter';
import type { SexualHealthFilter } from '../../types/onboarding';
import type { ScaleResult, AssessmentScale } from '../../types/assessment';
import type { OnboardingProfile as OnboardingProfileType } from '../../types/onboarding';
import { SCALE_META, getScaleMeta } from '../../utils/scaleMeta';
import { triggerDrLoSynthesis } from '../../utils/drLoAnalysis';

// SCALE_META et getScaleMeta sont importés depuis '../../utils/scaleMeta'

// Extrait l'intro du texte DrLo (entre le 1er et le 2e titre **)
function extractDrLoIntro(analysis: string | null): string | null {
  if (!analysis) return null;
  const lines = analysis.split('\n');
  const firstHeader = lines.findIndex(l => /\*\*Analyse de Dr/.test(l));
  if (firstHeader === -1) return null;
  const secondHeader = lines.findIndex((l, i) => i > firstHeader && /^\*\*/.test(l.trim()));
  const end = secondHeader === -1 ? firstHeader + 6 : secondHeader;
  return lines.slice(firstHeader + 1, end).join('\n').trim() || null;
}

// ── Couleurs ──────────────────────────────────────────────────────────────────
function getSeverityColor(s: string) {
  if (['positive','none','minimal'].includes(s)) return '#16A34A';
  if (s === 'mild') return '#D97706';
  if (s === 'moderate') return '#EA580C';
  return '#DC2626';
}
function getSeverityGradient(s: string) {
  if (['positive','none','minimal'].includes(s)) return 'linear-gradient(90deg,#86EFAC,#16A34A)';
  if (s === 'mild')     return 'linear-gradient(90deg,#FCD34D,#D97706)';
  if (s === 'moderate') return 'linear-gradient(90deg,#FDBA74,#EA580C)';
  return 'linear-gradient(90deg,#FCA5A5,#DC2626)';
}
function getSeverityBg(s: string) {
  if (['positive','none','minimal'].includes(s)) return '#F0FDF4';
  if (s === 'mild')     return '#FFFBEB';
  if (s === 'moderate') return '#FFF7ED';
  return '#FEF2F2';
}

// ═══════════════════════ CompletedScaleCard ══════════════════════════════════
const CompletedScaleCard: React.FC<{
  scale: AssessmentScale;
  result: ScaleResult;
  idx: number;
  accentColor: string;
}> = ({ scale, result, idx, accentColor }) => {
  const meta = getScaleMeta(scale.id);
  const sev = result.interpretation.severity;
  const range = scale.scoreRange.max - scale.scoreRange.min;
  const pct = range > 0
    ? Math.max(4, Math.round(((result.totalScore - scale.scoreRange.min) / range) * 100))
    : 0;

  return (
    <div style={{
      background: '#FFFFFF',
      border: `1.5px solid ${getSeverityColor(sev)}25`,
      borderLeft: `3px solid ${getSeverityColor(sev)}`,
      borderRadius: 12,
      padding: '14px 15px',
      marginBottom: 10,
      animation: `fadeSlideBarIn 0.35s ease both ${idx * 0.06}s`,
    }}>
      {/* En-tête : icon + nom + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{meta.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#0A2342', flex: 1 }}>
          {meta.label}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
          background: getSeverityBg(sev), color: getSeverityColor(sev),
          border: `1px solid ${getSeverityColor(sev)}30`, whiteSpace: 'nowrap',
        }}>
          ✅ {result.interpretation.label}
        </span>
      </div>

      {/* Barre + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: getSeverityGradient(sev), borderRadius: 99,
            transition: 'width 0.9s cubic-bezier(.34,1.56,.64,1)',
          }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: getSeverityColor(sev), minWidth: 36, textAlign: 'right' }}>
          {result.totalScore}/{scale.scoreRange.max}
        </span>
      </div>

      {/* Ce que ça veut dire */}
      {result.interpretation.description && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💬 Ce que ça veut dire
          </p>
          <p style={{
            margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.6,
            background: '#F8FAFF', borderRadius: 8, padding: '8px 10px',
            fontStyle: 'italic',
          }}>
            "{result.interpretation.description}"
          </p>
        </div>
      )}

      {/* Conseil du Dr Lo */}
      {result.interpretation.recommendation && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💡 Conseil du Dr Lo
          </p>
          <p style={{
            margin: '0 0 6px', fontSize: 12, color: '#374151', lineHeight: 1.6,
            background: `${accentColor}08`, borderRadius: 8, padding: '8px 10px',
          }}>
            {result.interpretation.recommendation}
          </p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: accentColor, fontStyle: 'italic', textAlign: 'right' }}>
            — Dr Lo 🩺
          </p>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════ PendingScaleCard ════════════════════════════════════
const PendingScaleCard: React.FC<{
  scale: AssessmentScale;
  onStart: (id: string) => void;
  loading: boolean;
  accentColor: string;
}> = ({ scale, onStart, loading, accentColor }) => {
  const meta = getScaleMeta(scale.id);

  return (
    <div style={{
      background: '#FAFBFF',
      border: '1.5px dashed rgba(148,163,184,0.4)',
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0, opacity: 0.6 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{meta.label}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, color: '#94A3B8',
            background: '#F1F5F9', padding: '1px 6px', borderRadius: 10,
          }}>⏳ {scale.timeEstimateMinutes} min</span>
        </div>
        {meta.description && (
          <p style={{ margin: '0 0 8px', fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
            {meta.description}
          </p>
        )}
        <button
          onClick={() => onStart(scale.id)}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 11px', borderRadius: 14,
            background: loading ? '#F1F5F9' : `${accentColor}12`,
            border: `1px solid ${accentColor}30`,
            color: accentColor, fontSize: 11, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <div style={{ width: 10, height: 10, border: `1.5px solid ${accentColor}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : '→'}
          {loading ? 'Chargement…' : 'Faire cette évaluation'}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════ ProfilePanel ════════════════════════════════════
const SYNTHESIS_PREVIEW_LENGTH = 220;

const ProfilePanel: React.FC<{
  category: 'mental' | 'sexual';
  scales: AssessmentScale[];
  results: Record<string, ScaleResult>;
  profileLink: string;
  drLoAnalysis: string | null;
  drLoSynthesis: string | null;
  prenom: string;
  onStart: (id: string) => void;
  loadingCard: string | null;
}> = ({ category, scales, results, profileLink, drLoAnalysis, drLoSynthesis, prenom, onStart, loadingCard }) => {
  const [expanded, setExpanded] = useState(false);

  const completed = scales.filter(s => results[s.id]).length;
  const total     = scales.length;
  const pct       = Math.round((completed / total) * 100);
  const isMental  = category === 'mental';
  const accentColor = isMental ? '#3B82F6' : '#EC4899';
  const accentGrad  = isMental
    ? 'linear-gradient(135deg,#3B82F6,#2DD4BF)'
    : 'linear-gradient(135deg,#EC4899,#F97316)';

  // Priorité : synthèse courte > intro extraite de l'analyse > message par défaut
  const drLoIntro = extractDrLoIntro(drLoAnalysis);
  const synthesisText = drLoSynthesis || drLoIntro;

  const defaultBubble = completed === 0
    ? `Lance ta première évaluation pour que je puisse commencer à te connaître 🌱`
    : completed === total
    ? `🎉 Profil ${isMental ? 'mental' : 'sexuel'} complet — tu méritais vraiment cet effort, ${prenom || 'toi'} !`
    : `Il te reste ${total - completed} évaluation${total - completed > 1 ? 's' : ''} — plus tu avances, plus mon analyse va être précise pour toi 🎯`;

  const isLong = !!synthesisText && synthesisText.length > SYNTHESIS_PREVIEW_LENGTH;
  const displayText = synthesisText
    ? (expanded || !isLong ? synthesisText : synthesisText.slice(0, SYNTHESIS_PREVIEW_LENGTH) + '…')
    : defaultBubble;

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      border: `1px solid ${isMental ? 'rgba(59,130,246,0.14)' : 'rgba(236,72,153,0.14)'}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Header Dr. LO ── */}
      <div style={{
        padding: '16px',
        background: isMental
          ? 'linear-gradient(135deg,#EFF6FF,#F0FDFA)'
          : 'linear-gradient(135deg,#FDF2F8,#FFF7ED)',
        borderBottom: `1px solid ${isMental ? 'rgba(59,130,246,0.08)' : 'rgba(236,72,153,0.08)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src="/dr-lo.png" alt="Dr. LO"
              style={{
                width: 52, height: 52, borderRadius: '50%',
                objectFit: 'cover', objectPosition: 'top center',
                border: `2.5px solid ${accentColor}`,
                boxShadow: `0 4px 14px ${accentColor}40`,
              }}
            />
            <div style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 10, height: 10, borderRadius: '50%',
              background: '#22C55E', border: '2px solid white',
            }} />
          </div>

          {/* Bulle de texte */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.94)',
            borderRadius: '12px 12px 12px 4px',
            padding: '10px 13px',
            border: `1px solid ${accentColor}20`,
            boxShadow: `0 2px 12px ${accentColor}10`,
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', top: 12, left: -8,
              width: 0, height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '9px solid rgba(255,255,255,0.94)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0A2342' }}>Dr. Lô</span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 9, fontWeight: 700, color: '#16A34A',
                background: '#F0FDF4', padding: '1px 6px', borderRadius: 10,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                En ligne
              </span>
              {synthesisText && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: accentColor,
                  background: `${accentColor}12`, padding: '1px 6px', borderRadius: 10,
                  marginLeft: 2,
                }}>
                  IA
                </span>
              )}
            </div>

            {/* Texte de la synthèse avec animation au changement */}
            <div
              key={synthesisText ? synthesisText.length : 'default'}
              style={{ animation: synthesisText ? 'synthesisFadeIn 0.5s ease both' : 'none' }}
            >
              <p style={{
                margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.7,
                fontStyle: synthesisText ? 'normal' : 'italic',
                whiteSpace: 'pre-line',
              }}>
                {displayText}
              </p>

              {/* Bouton Lire la suite */}
              {isLong && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{
                    background: 'none', border: 'none', padding: '4px 0 0',
                    fontSize: 11, fontWeight: 700, color: accentColor,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  {expanded ? '↑ Réduire' : '↓ Lire la suite'}
                </button>
              )}

              {!synthesisText && (
                <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: accentColor, fontStyle: 'italic' }}>
                  — Dr Lo 🩺
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Barre de progression ── */}
      <div style={{ padding: '10px 16px 10px', borderBottom: '1px solid #F8FAFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0A2342' }}>
            {completed}/{total} complétées
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>{pct}%</span>
        </div>
        <div style={{ height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: accentGrad, borderRadius: 99, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* ── Cartes par scale ── */}
      <div style={{ overflowY: 'auto', maxHeight: 520, padding: '12px 14px 4px' }}>
        {/* Complétées en premier */}
        {scales.filter(s => results[s.id]).map((scale, i) => (
          <CompletedScaleCard
            key={scale.id}
            scale={scale}
            result={results[scale.id]}
            idx={i}
            accentColor={accentColor}
          />
        ))}

        {/* Séparateur si mixte */}
        {completed > 0 && completed < total && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            margin: '4px 0 12px',
          }}>
            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
            <span style={{ fontSize: 10, color: '#CBD5E1', fontWeight: 600, whiteSpace: 'nowrap' }}>
              À faire
            </span>
            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
          </div>
        )}

        {/* Non complétées */}
        {scales.filter(s => !results[s.id]).map(scale => (
          <PendingScaleCard
            key={scale.id}
            scale={scale}
            onStart={onStart}
            loading={loadingCard === scale.id}
            accentColor={accentColor}
          />
        ))}
      </div>

      {/* ── Footer ── */}
      {completed > 0 && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'center',
        }}>
          <Link
            to={profileLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, color: accentColor, textDecoration: 'none',
            }}
          >
            Voir mon profil complet
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════ ScaleCard (compact) ══════════════════════════════
interface ScaleCardProps {
  scale: AssessmentScale;
  result?: ScaleResult;
  onStart: (id: string) => void;
  loading: boolean;
}

const ScaleCard: React.FC<ScaleCardProps> = ({ scale, result, onStart, loading }) => {
  const meta = getScaleMeta(scale.id);
  const icon = meta.icon;
  const done = !!result;

  return (
    <div
      onClick={() => onStart(scale.id)}
      style={{
        background: '#FFFFFF',
        border: done
          ? '1.5px solid rgba(34,197,94,0.3)'
          : '1.5px solid rgba(59,130,246,0.15)',
        borderRadius: 12,
        padding: '11px 13px',
        cursor: 'pointer',
        transition: 'all 0.16s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: loading ? 0.65 : 1,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 5px 18px rgba(59,130,246,0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Icône */}
      <div style={{
        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
        background: done ? '#F0FDF4' : '#EFF6FF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {scale.shortName}
          </span>
          {done && <span style={{ fontSize: 11 }}>✅</span>}
        </div>
        <p style={{
          margin: 0, fontSize: 12, fontWeight: 600, color: '#0A2342',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {meta.label}
        </p>
        {done && result ? (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: getSeverityColor(result.interpretation.severity),
            background: getSeverityBg(result.interpretation.severity),
            padding: '1px 7px', borderRadius: 20,
            display: 'inline-block', marginTop: 2,
          }}>
            {result.interpretation.label}
          </span>
        ) : (
          <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 1, display: 'block' }}>
            {scale.timeEstimateMinutes} min
          </span>
        )}
      </div>

      {/* Arrow / spinner */}
      <div style={{ flexShrink: 0 }}>
        {loading ? (
          <div style={{
            width: 16, height: 16,
            border: '2px solid #3B82F6', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={done ? '#16A34A' : '#3B82F6'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════ PAGE ════════════════════════════════════════════
type Category = 'mental' | 'sexual';
type MobileView = 'scales' | 'profile';

const AssessmentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete());
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfileType | null>(
    () => getOnboardingProfile()
  );

  const [category, setCategory]           = useState<Category>('mental');
  const [mobileView, setMobileView]       = useState<MobileView>('scales');
  const [showSexualFilter, setShowSexualFilter] = useState(false);
  const [sexualFilter, setSexualFilter]   = useState<SexualHealthFilter | null>(() => getSexualHealthFilter());
  const [profileResults, setProfileResults] = useState<Record<string, ScaleResult>>({});
  const [compatibilityId, setCompatibilityId] = useState<string | null>(null);
  const [drLoAnalysis, setDrLoAnalysis] = useState<string | null>(null);
  const [drLoSynthesis, setDrLoSynthesis] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const drLoSynthesisPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadingCard, setLoadingCard]     = useState<string | null>(null);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [showLoginWall, setShowLoginWall] = useState(false);
  const [guestCount, setGuestCount]       = useState(0);
  const [loadRetry, setLoadRetry]         = useState(0);

  // Lire le compteur invité
  useEffect(() => {
    if (!isAuthenticated) {
      setGuestCount(getGuestCount());
      setProfileResults(getAllGuestResults());
    }
  }, [isAuthenticated]);

  // Charger le profil Firestore (avec retry automatique si offline)
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    setLoadingProfile(true);
    getOrCreateUserProfile(currentUser.id, currentUser.name)
      .then(() => getProfileProgress(currentUser.id))
      .then(p => {
        setProfileResults(p.scaleResults);
        setCompatibilityId(p.compatibilityId);
        setDrLoAnalysis(p.drLoAnalysis ?? null);
        setDrLoSynthesis(p.drLoSynthesis ?? null);
        setErrorMsg(null);

        // Restauration de l'onboarding pour les utilisateurs qui reviennent
        if (!isOnboardingComplete()) {
          if (p.onboardingProfile) {
            saveOnboardingProfile(p.onboardingProfile as Parameters<typeof saveOnboardingProfile>[0]);
            setOnboardingProfile(p.onboardingProfile as OnboardingProfileType);
            setShowOnboarding(false);
          } else if (p.completedCount > 0) {
            setShowOnboarding(false);
          }
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        // Retry automatique si offline ou permission temporairement refusée (reset Firestore)
        const isTransient = msg.includes('offline') || msg.includes('unavailable') || msg.includes('permission-denied') || msg.includes('permissions');
        if (isTransient && loadRetry < 5) {
          setTimeout(() => setLoadRetry(r => r + 1), 4000);
        }
        // Pas de bandeau d'erreur — l'état vide s'affiche naturellement si rien ne charge
      })
      .finally(() => setLoadingProfile(false));
  }, [isAuthenticated, currentUser?.id, loadRetry]);

  // Polling : attend que drLoSynthesis soit prête — re-déclenche la génération si absente
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if (drLoSynthesis) return; // déjà chargée
    if (Object.keys(profileResults).length === 0) return; // rien de complété

    // Re-déclencher la synthèse si elle n'est pas encore en base (ex: save raté avant fix des règles)
    triggerDrLoSynthesis(currentUser.id).catch(() => {});

    let attempts = 0;
    const MAX_ATTEMPTS = 15;

    const poll = async () => {
      attempts++;
      try {
        const p = await getProfileProgress(currentUser.id);
        if (p.drLoSynthesis) {
          setDrLoSynthesis(p.drLoSynthesis);
          return;
        }
      } catch { /* silencieux */ }
      if (attempts < MAX_ATTEMPTS) {
        drLoSynthesisPollingRef.current = setTimeout(poll, 3000);
      }
    };

    drLoSynthesisPollingRef.current = setTimeout(poll, 3000);
    return () => {
      if (drLoSynthesisPollingRef.current) clearTimeout(drLoSynthesisPollingRef.current);
    };
  }, [isAuthenticated, currentUser?.id, drLoSynthesis, profileResults]);

  // Démarrer une scale
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
    } catch (err1) {
      console.error('[startScale] 1st attempt failed:', err1);
      // Firestore peut être temporairement instable au chargement — attendre 3s et réessayer une fois
      await new Promise(r => setTimeout(r, 3000));
      try {
        const session = await createSession(currentUser.id, [scaleId]);
        navigate(`/assessment/quiz/${session.id}`);
      } catch (err2) {
        console.error('[startScale] 2nd attempt failed:', err2);
        setErrorMsg('Connexion instable. Réessaie dans quelques secondes.');
      }
    } finally {
      setLoadingCard(null);
    }
  };

  // Scale filtering based on onboarding + sexual profile
  const hiddenIds = onboardingProfile ? getHiddenScaleIds(onboardingProfile) : [];
  const hiddenSexualIds = sexualFilter ? getHiddenSexualScaleIds(sexualFilter) : [];
  const currentScales = (category === 'mental' ? MENTAL_HEALTH_SCALES : SEXUAL_HEALTH_SCALES)
    .filter(s => !hiddenIds.includes(s.id) && !hiddenSexualIds.includes(s.id));
  const totalAll = MENTAL_HEALTH_SCALES.length + SEXUAL_HEALTH_SCALES.length;

  // Greeting based on profile
  const prenom = onboardingProfile?.prenom;

  // ── Onboarding gate ──────────────────────────────────────────────────────
  if (showSexualFilter) {
    return (
      <SexualHealthFilterWizard
        onComplete={(filter) => {
          setSexualFilter(filter);
          saveSexualHealthFilter(filter);
          setShowSexualFilter(false);
        }}
      />
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingProfile
        defaultPrenom={currentUser?.name ?? undefined}
        onComplete={(profile) => {
          setOnboardingProfile(profile);
          setShowOnboarding(false);
          if (isAuthenticated && currentUser) {
            // Réinitialiser les anciennes données puis sauvegarder le nouveau profil
            resetUserProfile(currentUser.id)
              .then(() => saveOnboardingToProfile(currentUser.id, profile as unknown as Record<string, string>))
              .then(() => setLoadRetry(r => r + 1)) // recharger le profil propre
              .catch(() => {});
          }
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideBarIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes synthesisFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header sticky ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        padding: '14px 0',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A2342' }}>
              {prenom ? `Hey ${prenom} 👋` : 'Mes évaluations'}
            </h1>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: '#64748B' }}>{totalAll} outils cliniquement validés</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {Array.from({ length: GUEST_MAX_TESTS }).map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i < guestCount ? 'linear-gradient(135deg,#3B82F6,#2DD4BF)' : 'rgba(59,130,246,0.18)',
                    border: '1.5px solid rgba(59,130,246,0.25)',
                  }} />
                ))}
                <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>{guestCount}/{GUEST_MAX_TESTS}</span>
              </div>
            )}
            {isAuthenticated && !loadingProfile && (
              <Link to="/assessment/profile" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
                color: '#fff', fontWeight: 600, fontSize: 12,
                padding: '6px 13px', borderRadius: 18, textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                Mon profil complet
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Sélecteurs de catégorie ────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['mental','sexual'] as Category[]).map(cat => {
            const active = category === cat;
            const label  = cat === 'mental' ? 'Santé Mentale' : 'Santé Sexuelle';
            const emoji  = cat === 'mental' ? '🧠' : '💋';
            const count  = cat === 'mental' ? MENTAL_HEALTH_SCALES.length : SEXUAL_HEALTH_SCALES.length;
            const completed = (cat === 'mental' ? MENTAL_HEALTH_SCALES : SEXUAL_HEALTH_SCALES)
              .filter(s => profileResults[s.id]).length;
            return (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  setMobileView('scales');
                  if (cat === 'sexual' && !isSexualFilterComplete()) {
                    setShowSexualFilter(true);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: active
                    ? (cat === 'mental' ? '2px solid #3B82F6' : '2px solid #EC4899')
                    : '2px solid rgba(59,130,246,0.12)',
                  background: active
                    ? (cat === 'mental' ? 'linear-gradient(135deg,#EFF6FF,#F0FDFA)' : 'linear-gradient(135deg,#FDF2F8,#FFF7ED)')
                    : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  {active && (
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: cat === 'mental' ? '#3B82F6' : '#EC4899',
                      background: cat === 'mental' ? '#EFF6FF' : '#FDF2F8',
                      border: `1px solid ${cat === 'mental' ? '#3B82F6' : '#EC4899'}30`,
                      padding: '1px 7px', borderRadius: 10,
                    }}>
                      ACTIF
                    </span>
                  )}
                </div>
                <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#0A2342' }}>{label}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>
                  {completed}/{count} complétées
                </p>
                {/* Mini progress */}
                <div style={{ height: 3, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginTop: 7 }}>
                  <div style={{
                    height: '100%',
                    width: `${count > 0 ? Math.round((completed/count)*100) : 0}%`,
                    background: cat === 'mental'
                      ? 'linear-gradient(90deg,#3B82F6,#2DD4BF)'
                      : 'linear-gradient(90deg,#EC4899,#F97316)',
                    borderRadius: 99,
                  }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bannière invité ────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <div style={{ maxWidth: 1100, margin: '12px auto 0', padding: '0 20px' }}>
          <div style={{
            background: 'linear-gradient(135deg,#EFF6FF,#F0FDFA)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 12, padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1E40AF', fontWeight: 500 }}>
              {guestCount < GUEST_MAX_TESTS
                ? `${GUEST_MAX_TESTS - guestCount} essai${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} gratuit${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} restant — inscris-toi pour tout sauvegarder`
                : 'Limite atteinte — crée un compte pour continuer'}
            </p>
            <Link to="/patient/access" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
              color: '#fff', fontWeight: 600, fontSize: 11,
              padding: '5px 12px', borderRadius: 14, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              {guestCount >= GUEST_MAX_TESTS ? 'Créer un compte' : 'Se connecter'}
            </Link>
          </div>
        </div>
      )}

      {/* ── Erreur ────────────────────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{ maxWidth: 1100, margin: '12px auto 0', padding: '0 20px' }}>
          <div style={{
            background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#DC2626',
          }}>
            {errorMsg}
          </div>
        </div>
      )}

      {/* ── Mobile : onglets Évaluations / Profil ─────────────────────────── */}
      <div className="md:hidden" style={{ maxWidth: 1100, margin: '14px auto 0', padding: '0 20px' }}>
        <div style={{
          display: 'flex', background: 'white',
          border: '1px solid rgba(59,130,246,0.12)',
          borderRadius: 12, overflow: 'hidden', padding: 3, gap: 3,
        }}>
          {(['scales','profile'] as MobileView[]).map(v => (
            <button
              key={v}
              onClick={() => setMobileView(v)}
              style={{
                flex: 1, padding: '9px 0',
                borderRadius: 9, border: 'none',
                background: mobileView === v
                  ? 'linear-gradient(135deg,#3B82F6,#2DD4BF)'
                  : 'transparent',
                color: mobileView === v ? 'white' : '#64748B',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              {v === 'scales' ? '📋 Évaluations' : '🧠 Mon Profil'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu principal : 2 colonnes ────────────────────────────────── */}
      <div style={{
        maxWidth: 1100, margin: '16px auto 0',
        padding: '0 20px 48px',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 16,
      }}
        className="assessment-grid"
      >
        <style>{`
          @media (min-width: 768px) {
            .assessment-grid { grid-template-columns: 58% 1fr !important; padding-bottom: 48px !important; }
            .profile-col { display: flex !important; }
            .profile-col-mobile-hidden { display: flex !important; }
          }
          .scales-col-mobile-hidden { display: block; }
          .profile-col-mobile-hidden { display: none; }
          @media (max-width: 767px) {
            .scales-col-mobile-hidden  { display: ${mobileView === 'scales'  ? 'block' : 'none'}; }
            .profile-col-mobile-hidden { display: ${mobileView === 'profile' ? 'flex'  : 'none'} !important; }
          }
        `}</style>

        {/* ── Colonne gauche : échelles ── */}
        <div className="scales-col-mobile-hidden">
          {/* En-tête de section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{category === 'mental' ? '🧠' : '💋'}</span>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A2342' }}>
              {category === 'mental' ? 'Santé Mentale' : 'Santé Sexuelle'}
            </h2>
            <span style={{
              background: category === 'mental' ? '#EFF6FF' : '#FDF2F8',
              color: category === 'mental' ? '#3B82F6' : '#EC4899',
              fontSize: 10, fontWeight: 700,
              padding: '2px 9px', borderRadius: 18,
              border: `1px solid ${category === 'mental' ? 'rgba(59,130,246,0.2)' : 'rgba(236,72,153,0.2)'}`,
            }}>
              {currentScales.length} évaluations
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
            {currentScales.map(scale => (
              <ScaleCard
                key={scale.id}
                scale={scale}
                result={profileResults[scale.id]}
                onStart={startScale}
                loading={loadingCard === scale.id}
              />
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{
            marginTop: 20,
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

        {/* ── Colonne droite : profil ── */}
        <div
          className="profile-col-mobile-hidden"
          style={{ flexDirection: 'column', position: 'sticky', top: 80, height: 'fit-content' }}
        >
          <ProfilePanel
            category={category}
            scales={currentScales}
            results={profileResults}
            profileLink="/assessment/profile"
            drLoAnalysis={drLoAnalysis}
            drLoSynthesis={drLoSynthesis}
            prenom={prenom ?? ''}
            onStart={startScale}
            loadingCard={loadingCard}
          />
        </div>
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
              maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center',
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
              <li>✅ Obtenir ton profil complet en santé mentale &amp; sexuelle</li>
              <li>✅ Tester ta compatibilité avec un proche</li>
            </ul>
            <Link
              to="/patient/access"
              style={{
                display: 'block', width: '100%',
                background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
                color: '#fff', fontWeight: 700, fontSize: 14,
                padding: '13px 0', borderRadius: 14, textDecoration: 'none', marginBottom: 10,
              }}
            >
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

export default AssessmentHomePage;

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
  getSexualRequired,
} from '../../utils/sexualHealthFilter';
import SexualHealthFilterWizard from '../../components/assessment/SexualHealthFilter';
import SexualAccessGate from '../../components/assessment/SexualAccessGate';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../../data/scales';
import { triggerDrLoMentalHealth, triggerDrLoSexualHealth } from '../../utils/drLoAnalysis';
import { getScaleMeta } from '../../utils/scaleMeta';
import PageTooltips from '../../components/Onboarding/PageTooltips';
import { getAllTestAttemptCounts, deleteTestResult, resetFullProfile } from '../../services/testManagementService';
import { getCachedConseils, getOrGenerateConseils, type CachedConseils } from '../../services/conseilsService';
import { generateProfilePDF } from '../../services/pdfProfileService';
import type { ProfilePDFData } from '../../services/pdfProfileService';
import ConfirmResetModal from '../../components/assessment/ConfirmResetModal';
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

function getShortComment(result: ScaleResult): string {
  const description = result.interpretation?.description ?? '';
  const recommendation = result.interpretation?.recommendation ?? '';
  if (description && recommendation) return `${description} ${recommendation}`;
  return description || recommendation || '';
}

// getAdviceForLabel removed — replaced by AI-cached conseils from Firestore

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
  onDelete?: (scaleId: string) => void;
  deleteConfirm?: boolean;
  loading: boolean;
  expandedTestId: string | null;
  onToggle: (scaleId: string) => void;
  expandedAdviceId: string | null;
  onToggleAdvice: (scaleId: string) => void;
  attemptCount?: number;
  cachedConseils?: CachedConseils | null;
  conseilsLoading?: boolean;
}> = ({ scale, result, onStart, onDelete, deleteConfirm, loading, expandedTestId, onToggle, expandedAdviceId, onToggleAdvice, attemptCount, cachedConseils, conseilsLoading }) => {
  const isCompleted = !!result;
  const meta = getScaleMeta(scale.id);
  const fullComment = result ? getShortComment(result) : '';
  const isExpanded = expandedTestId === scale.id;
  const isAdviceExpanded = expandedAdviceId === scale.id;
  const hasConseils = cachedConseils && cachedConseils.conseils && cachedConseils.conseils.length > 0;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{scale.shortName}</span>
          {scale.targetGender === 'female' && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#DB2777', background: 'rgba(219,39,119,0.08)', border: '1px solid rgba(219,39,119,0.2)', borderRadius: 20, padding: '1px 7px' }}>
              Pour les femmes
            </span>
          )}
          {scale.targetGender === 'male' && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 20, padding: '1px 7px' }}>
              Pour les hommes
            </span>
          )}
          {isCompleted && <span style={{ fontSize: 11 }}>✅</span>}
          {isCompleted && attemptCount && attemptCount > 1 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', borderRadius: 20, padding: '1px 7px' }}>
              Passé {attemptCount} fois
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A2342', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.label}
        </p>
        {isCompleted && result ? (
          <>
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
            {fullComment && (
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => onToggle(scale.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#3B82F6',
                    cursor: 'pointer',
                  }}
                >
                  {isExpanded ? 'Masquer' : 'Voir mon analyse'}
                </button>
                {isExpanded && (
                  <div style={{
                    marginTop: 8,
                    background: '#F8FAFF',
                    border: '1px solid rgba(59,130,246,0.12)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#374151',
                    lineHeight: 1.55,
                  }}>
                    {fullComment}
                  </div>
                )}
              </div>
            )}
            {isCompleted && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => onToggleAdvice(scale.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0EA5E9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {conseilsLoading ? (
                    <><div style={{ width: 10, height: 10, border: '1.5px solid #0EA5E9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Génération en cours…</>
                  ) : isAdviceExpanded ? 'Masquer' : hasConseils ? '💡 Voir mes conseils' : '✨ Générer mes conseils'}
                </button>
                {isAdviceExpanded && !conseilsLoading && (
                  hasConseils ? (
                    <div style={{
                      marginTop: 8,
                      background: 'linear-gradient(135deg, #F0FDF4, #EFF6FF)',
                      border: '1px solid rgba(16,185,129,0.18)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: 12,
                      color: '#0A2342',
                      lineHeight: 1.55,
                    }}>
                      {/* Signification */}
                      {cachedConseils!.signification && (
                        <div style={{
                          background: '#F0FDF4',
                          borderRadius: 8, padding: '8px 10px', marginBottom: 10,
                          border: '1px solid rgba(16,185,129,0.15)',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                            📌 Ce que ça veut dire
                          </div>
                          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                            {cachedConseils!.signification}
                          </div>
                        </div>
                      )}
                      {/* 3 Conseils */}
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.04em' }}>
                        ✅ Mes 3 conseils
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cachedConseils!.conseils.map((c, i) => (
                          <div key={i} style={{
                            background: '#F8FAFF', borderRadius: 8, padding: '8px 10px',
                            borderLeft: '3px solid #3B82F6',
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0A2342', marginBottom: 2 }}>{c.titre}</div>
                            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>{c.texte}</div>
                          </div>
                        ))}
                      </div>
                      {/* Exercice */}
                      {cachedConseils!.exercice && (
                        <div style={{
                          marginTop: 10, background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)',
                          borderRadius: 8, padding: '8px 10px',
                          border: '1px solid rgba(59,130,246,0.15)',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                            🏋️ Exercice de la semaine
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0A2342', marginBottom: 2 }}>{cachedConseils!.exercice.titre}</div>
                          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>{cachedConseils!.exercice.description}</div>
                        </div>
                      )}
                      {/* Avis pro */}
                      {cachedConseils!.avis_pro && (
                        <div style={{
                          marginTop: 10, background: '#FFF7ED', borderRadius: 8, padding: '8px 10px',
                          border: '1px solid rgba(249,115,22,0.2)',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', marginBottom: 4 }}>⚕️ Avis du Dr Lô</div>
                          <div style={{ fontSize: 12, color: '#9A3412', lineHeight: 1.55 }}>{cachedConseils!.avis_pro}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      marginTop: 8,
                      background: '#FFF7ED',
                      border: '1px solid rgba(249,115,22,0.15)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 12,
                      color: '#9A3412',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>⚠️</span> La génération a échoué. Réessaie en appuyant à nouveau.
                    </div>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, display: 'block' }}>
            À faire · {scale.timeEstimateMinutes} min
          </span>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        {isCompleted ? (
          <>
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
            {onDelete && (
              <button onClick={() => onDelete(scale.id)} style={{
                background: deleteConfirm ? '#FEE2E2' : 'transparent',
                border: deleteConfirm ? '1px solid #FCA5A5' : 'none',
                borderRadius: 12,
                padding: '2px 8px', fontSize: 10, fontWeight: 600,
                color: '#DC2626', cursor: 'pointer',
                opacity: deleteConfirm ? 1 : 0.6,
              }}>
                {deleteConfirm ? 'Confirmer ?' : 'Supprimer'}
              </button>
            )}
          </>
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
  sexualFilter?: SexualHealthFilter | null;
}> = ({ isMental, prenom, profileResults, scales, allScalesForCategory, drLoAnalysis, compatibilityId, isAuthenticated, cardRef, sexualFilter }) => {

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
  const required = isMental ? MENTAL_REQUIRED : getSexualRequired(sexualFilter ?? null);
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
            {isMental ? 'PROFIL PSYCHOLOGIQUE' : 'VIE INTIME'}
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
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [expandedAdviceId, setExpandedAdviceId] = useState<string | null>(null);
  const [cachedConseilsMap, setCachedConseilsMap] = useState<Record<string, CachedConseils | null>>({});
  const [conseilsLoadingId, setConseilsLoadingId] = useState<string | null>(null);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sexualFilter, setSexualFilter] = useState<SexualHealthFilter | null>(
    () => getSexualHealthFilter()
  );
  const [showSexualFilter, setShowSexualFilter] = useState(
    !isMental && !isSexualFilterComplete()
  );
  const [sexualAccessGranted, setSexualAccessGranted] = useState(isMental);

  const onboardingProfile = getOnboardingProfile();
  const hiddenIds = onboardingProfile ? getHiddenScaleIds(onboardingProfile) : [];
  const hiddenSexualIds = sexualFilter ? getHiddenSexualScaleIds(sexualFilter) : [];
  const allScales = isMental ? MENTAL_HEALTH_SCALES : SEXUAL_HEALTH_SCALES;
  const scales = allScales.filter(s => !hiddenIds.includes(s.id) && !hiddenSexualIds.includes(s.id));
  const completedCount = scales.filter(s => profileResults[s.id]).length;
  const bonusCompleted = isMental ? BONUS_SCALES.filter(s => profileResults[s.id]).length : 0;

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
        // Pré-charger le statut des conseils en cache pour les tests complétés
        const completedIds = Object.keys(p.scaleResults);
        if (completedIds.length > 0) {
          Promise.all(
            completedIds.map(sid =>
              getCachedConseils(currentUser!.id, sid)
                .then(c => [sid, c] as const)
                .catch(() => [sid, null] as const)
            )
          ).then(entries => {
            const map: Record<string, CachedConseils | null> = {};
            for (const [sid, c] of entries) {
              if (c) map[sid] = c;
            }
            setCachedConseilsMap(prev => ({ ...prev, ...map }));
          });
        }
      })
      .catch(() => {});
    // Charger les compteurs de tentatives
    getAllTestAttemptCounts(currentUser.id)
      .then(counts => setAttemptCounts(counts))
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

  const handleDeleteScale = async (scaleId: string) => {
    if (!currentUser) return;
    if (deleteConfirmId === scaleId) {
      try {
        await deleteTestResult(currentUser.id, scaleId);
        setProfileResults(prev => { const copy = { ...prev }; delete copy[scaleId]; return copy; });
        setDeleteConfirmId(null);
      } catch {
        setErrorMsg('Erreur lors de la suppression.');
      }
    } else {
      setDeleteConfirmId(scaleId);
      setTimeout(() => setDeleteConfirmId(null), 5000);
    }
  };

  const handleResetProfile = async () => {
    if (!currentUser) return;
    setResetting(true);
    try {
      await resetFullProfile(currentUser.id);
      window.location.reload();
    } catch {
      setResetting(false);
      setShowResetModal(false);
    }
  };

  const switchTab = (tab: 'evaluations' | 'profil') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const toggleAnalysis = (scaleId: string) => {
    setExpandedTestId(prev => (prev === scaleId ? null : scaleId));
  };

  const toggleAdvice = async (scaleId: string) => {
    const isCollapsing = expandedAdviceId === scaleId;
    setExpandedAdviceId(prev => (prev === scaleId ? null : scaleId));

    // If expanding and we haven't loaded/generated conseils yet (or previous attempt failed)
    const needsLoad = !(scaleId in cachedConseilsMap) || cachedConseilsMap[scaleId] === null;
    if (!isCollapsing && needsLoad && isAuthenticated && currentUser) {
      setConseilsLoadingId(scaleId);
      try {
        // First try cache
        const cached = await getCachedConseils(currentUser.id, scaleId);
        if (cached) {
          setCachedConseilsMap(prev => ({ ...prev, [scaleId]: cached }));
        } else {
          // No cache — generate via AI
          const result = profileResults[scaleId];
          if (result) {
            const scaleObj = [...scales, ...BONUS_SCALES].find(s => s.id === scaleId);
            const scaleMeta = getScaleMeta(scaleId);
            const generated = await getOrGenerateConseils({
              userId: currentUser.id,
              scaleId,
              scaleName: scaleObj?.name ?? scaleMeta.label,
              score: result.totalScore,
              scoreMax: scaleMeta.scoreMax ?? 100,
              niveau: result.interpretation?.label ?? '',
              severity: result.interpretation?.severity ?? 'none',
              prenom: onboardingProfile?.prenom ?? '',
              genre: onboardingProfile?.genre ?? '',
              interpretation: result.interpretation?.description ?? '',
            });
            setCachedConseilsMap(prev => ({ ...prev, [scaleId]: generated }));
          } else {
            setCachedConseilsMap(prev => ({ ...prev, [scaleId]: null }));
          }
        }
      } catch {
        setCachedConseilsMap(prev => ({ ...prev, [scaleId]: null }));
      } finally {
        setConseilsLoadingId(null);
      }
    }
  };

  const shareProfile = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const userName = onboardingProfile?.prenom ?? currentUser?.name ?? 'Utilisateur';
      const profileLabel = isMental ? 'Sante mentale' : 'Vie intime';
      const profileType = isMental ? 'mental_health' : 'sexual_health';

      // Build completed tests data
      const completedTests = scales
        .filter(s => profileResults[s.id])
        .map(s => {
          const r = profileResults[s.id];
          const meta = getScaleMeta(s.id);
          return {
            name: meta?.label ?? s.name ?? s.shortName ?? '',
            icon: meta?.icon ?? '',
            resultLabel: r?.interpretation?.label ?? '',
            severity: r?.interpretation?.severity ?? 'none',
            score: r?.totalScore ?? 0,
            maxScore: meta?.scoreMax ?? s.scoreRange?.max ?? 100,
          };
        });

      // Build bonus tests data (only for mental health)
      const bonusTests = isMental
        ? BONUS_SCALES
            .filter(s => profileResults[s.id])
            .map(s => {
              const r = profileResults[s.id];
              const meta = getScaleMeta(s.id);
              return {
                name: meta?.label ?? s.name ?? s.shortName ?? '',
                icon: meta?.icon ?? '',
                resultLabel: r?.interpretation?.label ?? '',
                severity: r?.interpretation?.severity ?? 'none',
              };
            })
        : undefined;

      // Evaluation date
      const latestDate = scales
        .filter(s => profileResults[s.id])
        .reduce<Date | null>((best, s) => {
          const r = profileResults[s.id];
          if (!r?.completedAt) return best;
          try {
            let d: Date;
            if (typeof (r.completedAt as { toDate?: () => Date }).toDate === 'function') {
              d = (r.completedAt as { toDate: () => Date }).toDate();
            } else {
              d = new Date(r.completedAt as string);
            }
            if (isNaN(d.getTime())) return best;
            return !best || d > best ? d : best;
          } catch { return best; }
        }, null);

      const evalDate = latestDate
        ? latestDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      const pdfData: ProfilePDFData = {
        userName,
        profileType: profileType as 'mental_health' | 'sexual_health',
        profileLabel,
        drLoAnalysis,
        completedTests,
        bonusTests,
        completedCount,
        totalCount: scales.length,
        bonusCount: isMental ? bonusCompleted : undefined,
        bonusTotalCount: isMental ? BONUS_SCALES.length : undefined,
        compatibilityCode: compatibilityId,
        evaluationDate: evalDate,
      };

      await generateProfilePDF(pdfData);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
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

  if (!isMental && !sexualAccessGranted) {
    return (
      <SexualAccessGate
        userId={isAuthenticated && currentUser ? currentUser.id : null}
        onGranted={() => setSexualAccessGranted(true)}
      />
    );
  }

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
            {isMental ? '🧠 Profil psychologique' : '💋 Vie intime'}
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
            {scales.map((scale, idx) => (
              <div key={scale.id} {...(idx === 0 ? { 'data-tooltip-id': 'first-item-card' } : {})}>
                <ScaleRow
                  scale={scale}
                  result={profileResults[scale.id]}
                  onStart={startScale}
                  onDelete={handleDeleteScale}
                  deleteConfirm={deleteConfirmId === scale.id}
                  loading={loadingCard === scale.id}
                  expandedTestId={expandedTestId}
                  onToggle={toggleAnalysis}
                  expandedAdviceId={expandedAdviceId}
                  onToggleAdvice={toggleAdvice}
                  attemptCount={attemptCounts[scale.id]}
                  cachedConseils={cachedConseilsMap[scale.id]}
                  conseilsLoading={conseilsLoadingId === scale.id}
                />
              </div>
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

            {/* ── Sous-section Tests Bonus (mental uniquement) ── */}
            {isMental && (
              <div style={{ marginTop: 20 }}>
                <div style={{
                  background: 'linear-gradient(135deg,#1E0442 0%,#2D0A5A 60%,#1E0442 100%)',
                  borderRadius: 16, padding: '16px 18px', marginBottom: 14,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: -15, right: -15, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 800, color: '#fff' }}>✨ Tests Bonus</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                        Ces tests enrichissent ton profil — très populaires 🔥
                      </p>
                    </div>
                    <span style={{
                      background: 'rgba(167,139,250,0.25)', color: '#C4B5FD',
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      border: '1px solid rgba(167,139,250,0.3)', whiteSpace: 'nowrap',
                    }}>
                      {bonusCompleted}/{BONUS_SCALES.length}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {BONUS_SCALES.map(scale => (
                    <ScaleRow
                      key={scale.id}
                      scale={scale}
                      result={profileResults[scale.id]}
                      onStart={startScale}
                      loading={loadingCard === scale.id}
                      expandedTestId={expandedTestId}
                      onToggle={toggleAnalysis}
                      expandedAdviceId={expandedAdviceId}
                      onToggleAdvice={toggleAdvice}
                      attemptCount={attemptCounts[scale.id]}
                      cachedConseils={cachedConseilsMap[scale.id]}
                      conseilsLoading={conseilsLoadingId === scale.id}
                    />
                  ))}
                </div>
              </div>
            )}
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
              sexualFilter={sexualFilter}
            />

            {/* ── Résultats Tests Bonus (mental uniquement) ── */}
            {isMental && bonusCompleted > 0 && (
              <div style={{
                background: '#fff',
                border: '1.5px solid rgba(124,58,237,0.15)',
                borderRadius: 16, padding: '16px 18px',
                boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#5B21B6', letterSpacing: '0.5px' }}>
                    ✨ TESTS BONUS
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>
                    {bonusCompleted}/{BONUS_SCALES.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {BONUS_SCALES.filter(s => profileResults[s.id]).map(scale => {
                    const result = profileResults[scale.id];
                    const meta = getScaleMeta(scale.id);
                    const sev = result.interpretation.severity;
                    const dotColor = getSeverityDot(sev);
                    const emoji = getSeverityEmoji(sev);
                    return (
                      <div key={scale.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px', borderRadius: 10, background: '#F5F3FF',
                      }}>
                        <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{meta.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0A2342', flex: 1, minWidth: 0 }}>
                          {meta.label}
                        </span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          background: `${dotColor}18`, color: dotColor,
                          fontSize: 10, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 18,
                          border: `1px solid ${dotColor}30`,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {emoji} {result.interpretation.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                  ? <><div style={{ width: 14, height: 14, border: '2px solid #94A3B8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Génération…</>
                  : <>📄 Télécharger mon profil</>
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

            {/* ── Réinitialiser ── */}
            {isAuthenticated && currentUser && (
              <div style={{
                marginTop: 20, padding: '14px 16px',
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#991B1B' }}>
                    Réinitialiser mon profil
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#B91C1C', lineHeight: 1.4 }}>
                    Supprime tous tes résultats et synthèses Dr Lô. Ton compte et préférences sont conservés.
                  </p>
                </div>
                <button
                  onClick={() => setShowResetModal(true)}
                  style={{
                    background: 'white', border: '1px solid #FCA5A5',
                    borderRadius: 8, padding: '7px 14px',
                    fontSize: 11, fontWeight: 700, color: '#DC2626',
                    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const,
                  }}
                >
                  Réinitialiser
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetProfile}
        loading={resetting}
      />

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
              <li>✅ Obtenir ton profil Dr Lô en profil psychologique &amp; vie intime</li>
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
      {/* Tooltips onboarding */}
      <PageTooltips pageKey={category === 'sexual' ? 'sexual' : 'mental'} />
    </div>
  );
};

export default AssessmentCategoryPage;

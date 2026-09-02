import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ArrowLeft, Brain, Heart, ClipboardList, User, Stethoscope, RefreshCw, Target, Lock,
  Link2, Copy, FileDown, CheckCircle2, Circle, Lightbulb, Sparkles, Pin, Dumbbell,
  AlertTriangle, Flame, Loader2, BarChart3,
} from 'lucide-react';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  createSession,
  saveSexualFilterToProfile,
  saveOnboardingToProfile,
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
  saveOnboardingProfile,
} from '../../utils/onboardingProfile';
import {
  getSexualHealthFilter,
  saveSexualHealthFilter,
  isSexualFilterComplete,
  getSexualRequired,
} from '../../utils/sexualHealthFilter';
import {
  getGenderHiddenIds,
  getGreyedScales,
  hasPartnerStatus,
  type GreyedInfo,
} from '../../utils/scaleVisibility';
import SexualHealthFilterWizard from '../../components/assessment/SexualHealthFilter';
import SexualAccessGate from '../../components/assessment/SexualAccessGate';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../../data/scales';
import { triggerDrLoMentalHealth, triggerDrLoSexualHealth, triggerDrLoSynthesis } from '../../utils/drLoAnalysis';
import { getScaleMeta, getScaleCategory, getCategoryColor, getScaleEmoji } from '../../utils/scaleMeta';
import PageTooltips from '../../components/Onboarding/PageTooltips';
import { getAllTestAttemptCounts, deleteTestResult, resetFullProfile } from '../../services/testManagementService';
import { getCachedConseils, getOrGenerateConseils, type CachedConseils } from '../../services/conseilsService';
import { generateProfilePDF } from '../../services/pdfProfileService';
import type { ProfilePDFData } from '../../services/pdfProfileService';
import ConfirmResetModal from '../../components/assessment/ConfirmResetModal';
import GoogleLinkBanner from '../../components/auth/GoogleLinkBanner';
import { useKoris } from '../../contexts/KorisContext';
import { isAiAvailable } from '../../utils/aiCircuitBreaker';
import KorisCostBadge from '../../components/koris/KorisCostBadge';
import TestCode from '../../components/assessment/TestCode';
import type { ScaleResult, AssessmentScale } from '../../types/assessment';
import type { SexualHealthFilter } from '../../types/onboarding';

// ── Design tokens (severity) ────────────────────────────────────────────────
// ok=#3C7A5A · gold=#8F6A1F · accent=#B5522F · danger=#B23A3A

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'positive': case 'none': case 'minimal': return '#3C7A5A';
    case 'mild': return '#8F6A1F';
    case 'moderate': return '#B5522F';
    case 'severe': case 'alert': return '#B23A3A';
    default: return '#6E7078';
  }
}

function getSeverityBg(severity: string): string {
  return `${getSeverityColor(severity)}18`;
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
  greyedInfo?: GreyedInfo;
  onGreyedClick?: (scaleId: string, info: GreyedInfo) => void;
}> = ({ scale, result, onStart, onDelete, deleteConfirm, loading, expandedTestId, onToggle, expandedAdviceId, onToggleAdvice, attemptCount, cachedConseils, conseilsLoading, greyedInfo, onGreyedClick }) => {
  const meta = getScaleMeta(scale.id);
  const catColor = getCategoryColor(getScaleCategory(scale.id));

  if (greyedInfo) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-4 bg-white cursor-pointer"
        style={{ border: '1.5px solid #E7E4DA', opacity: 0.55 }}
        onClick={() => onGreyedClick?.(scale.id, greyedInfo)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#F3F1EA' }}
        >
          <meta.icon size={18} color="#9CA3AF" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <TestCode scaleId={scale.id} />
            <span className="text-[11px] font-bold" style={{ color: '#9CA3AF' }}>{scale.shortName}</span>
          </div>
          <p className="m-0 text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: '#9CA3AF' }}>
            {meta.label}
          </p>
          <p className="m-0 text-[11px] mt-0.5 leading-tight italic" style={{ color: '#B0A890' }}>
            {greyedInfo.reason}
          </p>
        </div>
        <Lock size={14} className="flex-shrink-0" style={{ color: '#C4B99A' }} />
      </div>
    );
  }

  const isCompleted = !!result;
  const fullComment = result ? getShortComment(result) : '';
  const isExpanded = expandedTestId === scale.id;
  const isAdviceExpanded = expandedAdviceId === scale.id;
  const hasConseils = cachedConseils && cachedConseils.conseils && cachedConseils.conseils.length > 0;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-4 bg-white"
      style={{
        border: isCompleted ? '1.5px solid rgba(60,122,90,0.35)' : '1.5px solid #E7E4DA',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isCompleted ? 'rgba(60,122,90,0.12)' : `${catColor.accent}12` }}
      >
        <meta.icon size={18} color={isCompleted ? '#3C7A5A' : catColor.accent} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <TestCode scaleId={scale.id} />
          <span className="text-[11px] font-bold text-muted">{scale.shortName}</span>
          {scale.targetGender === 'female' && (
            <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ color: '#B5522F', background: 'rgba(201,96,63,0.08)', border: '1px solid rgba(201,96,63,0.2)' }}>
              Pour les femmes
            </span>
          )}
          {scale.targetGender === 'male' && (
            <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ color: '#4A5D57', background: 'rgba(74,93,87,0.08)', border: '1px solid rgba(74,93,87,0.2)' }}>
              Pour les hommes
            </span>
          )}
          {isCompleted && <CheckCircle2 size={12} color="#3C7A5A" />}
          {isCompleted && attemptCount && attemptCount > 1 && (
            <span className="text-[10px] font-semibold text-ink-light rounded-full px-2 py-0.5" style={{ background: '#F3F1EA' }}>
              Passé {attemptCount} fois
            </span>
          )}
        </div>
        <p className="m-0 text-[13px] font-semibold text-ink overflow-hidden text-ellipsis whitespace-nowrap">
          {meta.label}
        </p>
        {isCompleted && result ? (
          <>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background: getSeverityBg(result.interpretation.severity), color: getSeverityColor(result.interpretation.severity) }}
              >
                {result.interpretation.label}
              </span>
              <span className="text-[11px] text-muted">Score : {result.totalScore}</span>
              {result.completedAt && (
                <span className="text-[11px] text-muted opacity-70">{formatDate(result.completedAt)}</span>
              )}
            </div>
            {fullComment && (
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => onToggle(scale.id)}
                  className="bg-transparent border-0 p-0 text-[11px] font-bold cursor-pointer"
                  style={{ color: catColor.accent }}
                >
                  {isExpanded ? 'Masquer' : 'Voir mon analyse'}
                </button>
                {isExpanded && (
                  <div className="mt-2 rounded-xl px-3 py-2.5 text-xs text-ink-soft leading-relaxed" style={{ background: '#F3F1EA', border: '1px solid #E7E4DA' }}>
                    {fullComment}
                  </div>
                )}
              </div>
            )}
            {isCompleted && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => onToggleAdvice(scale.id)}
                  className="bg-transparent border-0 p-0 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                  style={{ color: '#8F6A1F' }}
                >
                  {conseilsLoading ? (
                    <><Loader2 size={11} className="animate-spin" /> Génération en cours…</>
                  ) : isAdviceExpanded ? (
                    'Masquer'
                  ) : hasConseils ? (
                    <><Lightbulb size={12} /> Voir mes conseils</>
                  ) : (
                    <><Sparkles size={12} /> Générer mes conseils</>
                  )}
                </button>
                {isAdviceExpanded && !conseilsLoading && (
                  hasConseils ? (
                    <div className="mt-2 rounded-2xl px-3.5 py-3 text-xs text-ink leading-relaxed" style={{ background: '#E4EAE6', border: '1px solid rgba(74,93,87,0.18)' }}>
                      {/* Signification */}
                      {cachedConseils!.signification && (
                        <div className="rounded-lg px-2.5 py-2 mb-2.5" style={{ background: '#FFFFFF', border: '1px solid rgba(74,93,87,0.15)' }}>
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase mb-1 tracking-wide" style={{ color: '#3C7A5A' }}>
                            <Pin size={11} /> Ce que ça veut dire
                          </div>
                          <div className="text-xs text-ink-soft leading-relaxed">
                            {cachedConseils!.signification}
                          </div>
                        </div>
                      )}
                      {/* 3 Conseils */}
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase mb-1.5 tracking-wide" style={{ color: catColor.accent }}>
                        <CheckCircle2 size={11} /> Mes 3 conseils
                      </div>
                      <div className="flex flex-col gap-2">
                        {cachedConseils!.conseils.map((c, i) => (
                          <div key={i} className="rounded-lg px-2.5 py-2" style={{ background: '#FFFFFF', borderLeft: `3px solid ${catColor.accent}` }}>
                            <div className="text-xs font-bold text-ink mb-0.5">{c.titre}</div>
                            <div className="text-xs text-ink-soft leading-relaxed">{c.texte}</div>
                          </div>
                        ))}
                      </div>
                      {/* Exercice */}
                      {cachedConseils!.exercice && (
                        <div className="mt-2.5 rounded-lg px-2.5 py-2" style={{ background: 'rgba(201,96,63,0.06)', border: '1px solid rgba(201,96,63,0.15)' }}>
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase mb-1 tracking-wide" style={{ color: '#B5522F' }}>
                            <Dumbbell size={11} /> Exercice de la semaine
                          </div>
                          <div className="text-xs font-bold text-ink mb-0.5">{cachedConseils!.exercice.titre}</div>
                          <div className="text-xs text-ink-soft leading-relaxed">{cachedConseils!.exercice.description}</div>
                        </div>
                      )}
                      {/* Avis pro */}
                      {cachedConseils!.avis_pro && (
                        <div className="mt-2.5 rounded-lg px-2.5 py-2" style={{ background: '#F1EAD6', border: '1px solid rgba(183,138,46,0.25)' }}>
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase mb-1" style={{ color: '#8F6A1F' }}>
                            <Stethoscope size={11} /> Avis du Dr Lô
                          </div>
                          <div className="text-xs text-ink-soft leading-relaxed">{cachedConseils!.avis_pro}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-xl px-3 py-2.5 text-xs flex items-center gap-1.5" style={{ background: 'rgba(178,58,58,0.06)', border: '1px solid rgba(178,58,58,0.2)', color: '#B23A3A' }}>
                      <AlertTriangle size={13} className="flex-shrink-0" /> La génération a échoué. Réessaie en appuyant à nouveau.
                    </div>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <span className="text-[11px] text-muted mt-0.5 block">
            À faire · {scale.timeEstimateMinutes} min
          </span>
        )}
      </div>
      <div className="flex-shrink-0 flex flex-col gap-1 items-end">
        {isCompleted ? (
          <>
            <button
              onClick={() => onStart(scale.id)}
              disabled={loading}
              className="bg-transparent rounded-full px-3 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              style={{ border: '1.5px solid rgba(60,122,90,0.4)', color: '#3C7A5A', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : 'Refaire'}
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(scale.id)}
                className="rounded-xl px-2 py-0.5 text-[10px] font-semibold cursor-pointer"
                style={{
                  background: deleteConfirm ? 'rgba(178,58,58,0.1)' : 'transparent',
                  border: deleteConfirm ? '1px solid rgba(178,58,58,0.4)' : 'none',
                  color: '#B23A3A',
                  opacity: deleteConfirm ? 1 : 0.6,
                }}
              >
                {deleteConfirm ? 'Confirmer ?' : 'Supprimer'}
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => onStart(scale.id)}
            disabled={loading}
            className="rounded-full px-3.5 py-1.5 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer"
            style={{ background: catColor.accent, opacity: loading ? 0.6 : 1, boxShadow: `0 2px 8px ${catColor.accent}40` }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : 'Commencer'}
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

// ── ProfileCard ───────────────────────────────────────────────────────────────

const ProfileCard: React.FC<{
  isMental: boolean;
  prenom: string;
  profileResults: Record<string, ScaleResult>;
  scales: AssessmentScale[];
  allScalesForCategory: AssessmentScale[];
  drLoAnalysis: string | null;
  drLoUpdatedAt: Date | null;
  drLoUpdating: boolean;
  onUpdateDrLo: () => void;
  compatibilityId: string | null;
  isAuthenticated: boolean;
  cardRef: React.RefObject<HTMLDivElement>;
  sexualFilter?: SexualHealthFilter | null;
  balance: number;
  generateCost: number;
  refreshCost: number;
  hasPartner?: boolean;
}> = ({ isMental, prenom, profileResults, scales, allScalesForCategory, drLoAnalysis, drLoUpdatedAt, drLoUpdating, onUpdateDrLo, compatibilityId, isAuthenticated, cardRef, sexualFilter, balance, generateCost, refreshCost, hasPartner = true }) => {

  const catColor = getCategoryColor(isMental ? 'mental' : 'sexual');
  const accentColor = catColor.accent;
  const CategoryIcon = isMental ? Brain : Heart;

  const completedScales = scales.filter(s => profileResults[s.id]);
  const completedCount = completedScales.length;
  const totalCount = scales.length;

  // Most recent evaluation date — includes ALL results (main + bonus)
  const latestDate = Object.values(profileResults).reduce<Date | null>((best, r) => {
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

  // Dr Lô outdated check: if latest test is newer than last Dr Lô update
  const totalCompletedResults = Object.keys(profileResults).length;
  const isOutdated = (() => {
    if (!drLoAnalysis) return totalCompletedResults > 0; // No analysis yet but tests done
    if (!drLoUpdatedAt) return true; // Has analysis but no timestamp
    if (!latestDate) return false;
    return latestDate.getTime() > drLoUpdatedAt.getTime();
  })();

  const drLoDateStr = drLoUpdatedAt
    ? drLoUpdatedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' à ' + drLoUpdatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  // Compatibility lock status
  const required = isMental ? MENTAL_REQUIRED : getSexualRequired(sexualFilter ?? null, hasPartner);
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
      className="bg-white rounded-block overflow-hidden shadow-lift mx-auto"
      style={{ maxWidth: 560 }}
    >
      {/* ── Solid Header ─────────────────────────────────────────────────── */}
      <div className="px-6 pt-7 pb-8 relative overflow-hidden" style={{ background: accentColor }}>
        {/* Decorative circles */}
        <div className="absolute rounded-full" style={{ top: -30, right: -30, width: 120, height: 120, background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute rounded-full" style={{ bottom: -20, left: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.08)' }} />

        {/* Logo row */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-2">
            <CategoryIcon size={18} color="rgba(255,255,255,0.95)" />
            <span className="text-sm font-extrabold tracking-wide" style={{ color: 'rgba(255,255,255,0.95)' }}>
              HEALTH-E
            </span>
          </div>
          <span
            className="text-[10px] font-bold rounded-full px-2.5 py-1 tracking-wide whitespace-nowrap"
            style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.15)' }}
          >
            {isMental ? 'PROFIL PSYCHOLOGIQUE' : 'VIE INTIME'}
          </span>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 relative">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-extrabold text-white"
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}
          >
            {initials}
          </div>
          <div>
            <p className="font-display m-0 text-2xl font-extrabold text-white tracking-tight">
              {prenom || 'Mon Profil'}
            </p>
            {dateStr && (
              <p className="m-0 mt-0.5 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Évalué·e le {dateStr}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="px-6 pb-6 bg-white">

        {/* Dr Lo section */}
        <div className="py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${accentColor}30` }}>
              <img src="/dr-lo.png" alt="Dr. Lô" className="w-full h-full object-cover" style={{ objectPosition: 'top center' }} />
            </div>
            <span className="text-xs font-extrabold tracking-wide flex items-center gap-1" style={{ color: accentColor }}>
              <Stethoscope size={12} /> ANALYSE DR LÔ
            </span>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#3C7A5A' }} />
              <span className="text-[9px] font-bold" style={{ color: '#3C7A5A' }}>IA</span>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3.5" style={{ background: '#F8F7F3', border: `1px solid ${accentColor}15` }}>
            {!isAuthenticated && completedCount > 0 ? (
              <>
                <p className="m-0 mb-2.5 text-[13px] text-ink-soft leading-relaxed">
                  Tu as {completedCount} évaluation{completedCount > 1 ? 's' : ''} — crée un compte pour ton analyse Dr Lô personnalisée
                </p>
                <Link
                  to="/patient/access"
                  className="inline-flex items-center gap-1.5 text-white font-bold text-[11px] rounded-full px-3.5 py-1.5 no-underline"
                  style={{ background: accentColor }}
                >
                  Créer mon compte →
                </Link>
              </>
            ) : completedCount === 0 ? (
              <p className="m-0 text-[13px] text-muted leading-relaxed italic">
                Lance ta première évaluation pour que Dr Lô commence son analyse personnalisée. — Dr Lo
              </p>
            ) : drLoUpdating ? (
              <div className="flex items-center gap-2.5">
                <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: accentColor }} />
                <p className="m-0 text-xs text-muted">
                  Dr. Lô met à jour ton analyse… Cela peut prendre quelques secondes.
                </p>
              </div>
            ) : drLoAnalysis ? (
              <>
                <p className="m-0 text-[13px] text-ink-soft leading-loose whitespace-pre-line">
                  {drLoAnalysis}
                </p>
                {/* Status + update button */}
                <div className="mt-3 pt-2.5 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  {isOutdated ? (
                    <>
                      <p className="m-0 text-[11px] font-semibold flex items-center gap-1" style={{ color: '#8F6A1F' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#8F6A1F' }} />
                        Profil modifié depuis la dernière analyse
                      </p>
                      <button
                        onClick={onUpdateDrLo}
                        className="text-white border-0 rounded-lg px-3.5 py-1.5 text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
                        style={{ background: accentColor }}
                      >
                        <RefreshCw size={12} /> Actualiser
                        <span className="inline-flex items-center gap-1 bg-white/20 rounded-lg px-1.5 py-0.5 ml-1">
                          <img src="/kori.png" alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                          <span className="font-display text-[11px] font-semibold">{refreshCost}</span>
                        </span>
                      </button>
                    </>
                  ) : (
                    <p className="m-0 text-[11px] font-semibold flex items-center gap-1" style={{ color: '#3C7A5A' }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#3C7A5A' }} />
                      Profil à jour {drLoDateStr ? `· ${drLoDateStr}` : ''}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* No analysis yet, but tests completed — show generate button */
              <div className="text-center py-1.5">
                <p className="m-0 mb-2.5 text-[13px] text-muted leading-relaxed">
                  Tu as {completedCount} évaluation{completedCount > 1 ? 's' : ''}. Génère ton analyse personnalisée Dr Lô.
                </p>
                <button
                  onClick={onUpdateDrLo}
                  className="text-white border-0 rounded-xl px-5 py-2.5 text-[13px] font-bold cursor-pointer inline-flex items-center gap-1.5"
                  style={{ background: accentColor, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}
                >
                  <Stethoscope size={14} /> Générer mon analyse
                  <span className="inline-flex items-center gap-1 bg-white/20 rounded-lg px-1.5 py-0.5 ml-1">
                    <img src="/kori.png" alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    <span className="font-display text-[11px] font-semibold">{generateCost}</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Evaluations section */}
        <div className="py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-ink tracking-wide flex items-center gap-1.5">
              <BarChart3 size={13} /> MES ÉVALUATIONS
            </span>
            <span className="text-xs font-bold" style={{ color: accentColor }}>
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-[5px] rounded-pill overflow-hidden mb-3.5" style={{ background: '#F1F5F9' }}>
            <div
              className="h-full rounded-pill transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%`,
                background: accentColor,
                minWidth: completedCount > 0 ? 6 : 0,
              }}
            />
          </div>

          {/* Completed items list */}
          {completedCount === 0 ? (
            <p className="m-0 text-xs text-muted text-center py-2">
              Aucune évaluation complétée
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {completedScales.map(scale => {
                const result = profileResults[scale.id];
                const meta = getScaleMeta(scale.id);
                const sevColor = getSeverityColor(result.interpretation.severity);
                return (
                  <div key={scale.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: '#F8F7F3' }}>
                    <span className="w-5 flex items-center justify-center flex-shrink-0" style={{ color: sevColor }}>
                      <meta.icon size={15} />
                    </span>
                    <span className="text-xs font-semibold text-ink flex-1 min-w-0">
                      {meta.label}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 whitespace-nowrap flex-shrink-0"
                      style={{ background: `${sevColor}18`, color: sevColor, border: `1px solid ${sevColor}30` }}
                    >
                      {result.interpretation.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compatibility code section */}
        <div className="py-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <span className="text-xs font-extrabold text-ink tracking-wide mb-3 flex items-center gap-1.5">
            <Link2 size={13} /> TON CODE DE COMPATIBILITÉ
          </span>

          {!isAuthenticated ? (
            <div className="rounded-xl px-4 py-3.5 text-center mt-3" style={{ background: '#F8F7F3', border: '1px dashed #CBD5E1' }}>
              <p className="m-0 mb-2.5 text-xs text-muted flex items-center justify-center gap-1">
                <Lock size={12} /> Crée un compte pour générer ton code de compatibilité
              </p>
              <Link
                to="/patient/access"
                className="inline-flex items-center gap-1.5 text-white font-bold text-[11px] rounded-full px-3.5 py-1.5 no-underline"
                style={{ background: accentColor }}
              >
                Créer mon compte →
              </Link>
            </div>
          ) : isUnlocked ? (
            <div className="rounded-xl px-4 py-3.5 mt-3" style={{ background: `${accentColor}08`, border: `1.5px solid ${accentColor}30` }}>
              <p className="m-0 mb-2 text-[10px] text-muted font-semibold tracking-wide">
                TON CODE UNIQUE
              </p>
              <p className="m-0 mb-3 text-lg font-extrabold tracking-wide" style={{ color: accentColor, fontFamily: 'monospace' }}>
                {compatibilityId}
              </p>
              <p className="m-0 text-[11px] text-muted">
                Partage ce code pour comparer vos profils de compatibilité
              </p>
            </div>
          ) : (
            <div className="rounded-xl px-4 py-3.5 mt-3" style={{ background: '#F8F7F3', border: '1px dashed #CBD5E1' }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs text-ink-soft font-semibold flex items-center gap-1">
                  <Lock size={12} /> {doneRequired}/{totalRequired} évaluations obligatoires
                </span>
                <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                  {Math.round((doneRequired / totalRequired) * 100)}%
                </span>
              </div>
              <div className="h-[5px] rounded-pill overflow-hidden mb-3" style={{ background: '#E2E8F0' }}>
                <div
                  className="h-full rounded-pill"
                  style={{
                    width: `${Math.round((doneRequired / totalRequired) * 100)}%`,
                    background: accentColor,
                    minWidth: doneRequired > 0 ? 6 : 0,
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                {required.map(r => (
                  <div key={r.id} className="flex items-center gap-1.5">
                    {profileResults[r.id]
                      ? <CheckCircle2 size={12} color="#3C7A5A" />
                      : <Circle size={12} className="text-muted" />}
                    <span className="text-[11px]" style={{ color: profileResults[r.id] ? '#3C7A5A' : '#6E7078', fontWeight: profileResults[r.id] ? 600 : 400 }}>
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 flex items-center justify-center gap-1.5">
          <CategoryIcon size={14} color="#6E7078" />
          <span className="text-xs font-bold text-muted">health-e.sn</span>
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
  const { canAfford, refreshBalance, balance, getCost, setShowNoKorisModal } = useKoris();

  const isMental = category === 'mental';
  const isValidCategory = category === 'mental' || category === 'sexual';
  const catColor = getCategoryColor(isMental ? 'mental' : 'sexual');
  const accentColor = catColor.accent;

  // ── TOUS les hooks en premier — jamais après un early return ──────────────

  const [activeTab, setActiveTab] = useState<'evaluations' | 'profil'>('evaluations');

  useEffect(() => {
    if (searchParams.get('tab') === 'profil') {
      navigate('/assessment/profile', { replace: true });
    }
  }, [searchParams, navigate]);
  const [profileResults, setProfileResults] = useState<Record<string, ScaleResult>>({});
  const [drLoAnalysis, setDrLoAnalysis] = useState<string | null>(null);
  const [drLoUpdatedAt, setDrLoUpdatedAt] = useState<Date | null>(null);
  const [drLoUpdating, setDrLoUpdating] = useState(false);
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
  const [scaleSearch, setScaleSearch] = useState('');

  const [unlockModal, setUnlockModal] = useState<{ scaleId: string; info: GreyedInfo } | null>(null);
  const [profileVersion, setProfileVersion] = useState(0);

  const onboardingProfile = getOnboardingProfile();
  const allScales = isMental ? MENTAL_HEALTH_SCALES : SEXUAL_HEALTH_SCALES;
  const genderHidden = onboardingProfile ? getGenderHiddenIds(onboardingProfile) : [];
  const greyedMap = onboardingProfile ? getGreyedScales(onboardingProfile, isMental ? null : sexualFilter) : {};
  const visibleScales = allScales.filter(s => !genderHidden.includes(s.id));
  const activeScales = visibleScales.filter(s => !greyedMap[s.id]);
  const completedCount = activeScales.filter(s => profileResults[s.id]).length;
  void profileVersion;
  const bonusCompleted = isMental ? BONUS_SCALES.filter(s => profileResults[s.id]).length : 0;

  const filterScale = (s: AssessmentScale) => {
    if (!scaleSearch.trim()) return true;
    const q = scaleSearch.trim().toLowerCase();
    const m = getScaleMeta(s.id);
    return s.code.toLowerCase() === q
      || s.shortName.toLowerCase().includes(q)
      || s.name.toLowerCase().includes(q)
      || m.label.toLowerCase().includes(q);
  };
  const filteredScales = visibleScales.filter(filterScale);
  const filteredBonus = BONUS_SCALES.filter(filterScale);

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
      const tsField = isMental ? 'drLoMentalUpdatedAt' : 'drLoSexualUpdatedAt';
      if (data[tsField]) {
        const ts = data[tsField];
        if (typeof ts?.toDate === 'function') setDrLoUpdatedAt(ts.toDate());
        else if (ts) setDrLoUpdatedAt(new Date(ts));
      }
      const codeField = isMental ? 'compatibilityIdMental' : 'compatibilityIdSexual';
      if (data[codeField]) setCompatibilityId(data[codeField] as string);
      // Stop updating spinner when new analysis arrives
      setDrLoUpdating(false);
    }, () => {});
    return () => unsubscribe();
  }, [isAuthenticated, currentUser?.id, isMental, isValidCategory]);

  // Dr Lô analysis is now triggered manually via "Mettre à jour" button in ProfileCard

  // ── Early returns APRÈS tous les hooks ────────────────────────────────────

  if (!isValidCategory) return null;

  const startScale = (scaleId: string) => {
    navigate(`/assessment/test/${scaleId}`);
  };

  const handleDeleteScale = async (scaleId: string) => {
    if (!currentUser) return;
    if (deleteConfirmId === scaleId) {
      // Second click — actually delete
      try {
        await deleteTestResult(currentUser.id, scaleId);
        setProfileResults(prev => { const copy = { ...prev }; delete copy[scaleId]; return copy; });
        setAttemptCounts(prev => { const copy = { ...prev }; delete copy[scaleId]; return copy; });
        setCachedConseilsMap(prev => { const copy = { ...prev }; delete copy[scaleId]; return copy; });
        setDeleteConfirmId(null);
      } catch (err) {
        console.error('Delete scale error:', err);
        setErrorMsg('Erreur lors de la suppression.');
        setDeleteConfirmId(null);
      }
    } else {
      // First click — show confirm
      setDeleteConfirmId(scaleId);
      setTimeout(() => setDeleteConfirmId(prev => prev === scaleId ? null : prev), 5000);
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

  const handleUpdateDrLo = async () => {
    if (!currentUser || drLoUpdating || !isAiAvailable()) return;
    const isRefresh = !!drLoAnalysis;
    const cost = getCost(isRefresh ? 'analysis_refresh' : 'analysis');
    if (balance < cost) { setShowNoKorisModal(true); return; }

    setDrLoUpdating(true);
    try {
      if (isMental) {
        await triggerDrLoMentalHealth(currentUser.id, isRefresh);
      } else {
        await triggerDrLoSexualHealth(currentUser.id, isRefresh);
      }
      triggerDrLoSynthesis(currentUser.id).catch(() => {});
      await refreshBalance();
    } catch (err) {
      console.error('Dr Lô update error:', err);
      await refreshBalance();
      setDrLoUpdating(false);
    }
  };

  const switchTab = (tab: 'evaluations' | 'profil') => {
    if (tab === 'profil') {
      navigate('/assessment/profile');
      return;
    }
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
          if (!canAfford('conseils')) {
            setConseilsLoadingId(null);
            return;
          }
          const result = profileResults[scaleId];
          if (result) {
            const scaleObj = [...scales, ...BONUS_SCALES].find(s => s.id === scaleId);
            const scaleMeta = getScaleMeta(scaleId);
            const generated = await getOrGenerateConseils({
              userId: currentUser.id,
              scaleId,
              scaleName: scaleObj?.name ?? scaleMeta.label,
              score: result.totalScore,
              scoreMax: (scaleMeta as any)?.scoreMax ?? 100,
              niveau: result.interpretation?.label ?? '',
              severity: result.interpretation?.severity ?? 'none',
              prenom: onboardingProfile?.prenom ?? '',
              genre: onboardingProfile?.genre ?? '',
              interpretation: result.interpretation?.description ?? '',
            });
            setCachedConseilsMap(prev => ({ ...prev, [scaleId]: generated }));
            await refreshBalance();
          } else {
            setCachedConseilsMap(prev => ({ ...prev, [scaleId]: null }));
          }
        }
      } catch {
        setCachedConseilsMap(prev => ({ ...prev, [scaleId]: null }));
        await refreshBalance();
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
            icon: getScaleEmoji(s.id),
            resultLabel: r?.interpretation?.label ?? '',
            severity: r?.interpretation?.severity ?? 'none',
            score: r?.totalScore ?? 0,
            maxScore: (meta as any)?.scoreMax ?? s.scoreRange?.max ?? 100,
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
                icon: getScaleEmoji(s.id),
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

  // SexualAccessGate is now handled per-test in TestDetailPage

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
    <div className="min-h-screen" style={{ background: '#F3F1EA' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 py-3.5"
        style={{ background: 'rgba(243,241,234,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(23,24,27,0.08)' }}
      >
        <div className="max-w-[600px] mx-auto px-5 flex items-center gap-3">
          <button
            onClick={() => navigate('/assessment')}
            className="bg-transparent border-0 cursor-pointer rounded-lg p-1.5 text-muted flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display m-0 text-lg font-bold text-ink flex-1 flex items-center gap-2">
            {isMental ? <Brain size={18} color={accentColor} /> : <Heart size={18} color={accentColor} />}
            {isMental ? 'Profil psychologique' : 'Vie intime'}
          </h1>
          <span
            className="text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap"
            style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}
          >
            {completedCount}/{activeScales.length}
          </span>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="max-w-[600px] mx-auto px-5 mt-4">
        <div className="flex bg-white rounded-2xl p-1 gap-1" style={{ border: '1px solid rgba(23,24,27,0.08)' }}>
          {(['evaluations', 'profil'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className="flex-1 py-2.5 rounded-xl border-0 font-bold text-[13px] cursor-pointer flex items-center justify-center gap-1.5 transition-colors duration-150"
              style={{
                background: activeTab === tab ? accentColor : 'transparent',
                color: activeTab === tab ? '#fff' : '#6E7078',
              }}
            >
              {tab === 'evaluations' ? <><ClipboardList size={14} /> Évaluations</> : <><User size={14} /> Mon Profil</>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bandeau erreur ──────────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="max-w-[600px] mx-auto px-5 mt-2.5">
          <div className="rounded-xl px-4 py-2.5 text-xs flex items-center gap-2" style={{ background: 'rgba(178,58,58,0.06)', border: '1px solid rgba(178,58,58,0.25)', color: '#B23A3A' }}>
            <AlertTriangle size={14} className="flex-shrink-0" /> {errorMsg}
          </div>
        </div>
      )}

      {/* ── Bandeau invité ──────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <div className="max-w-[600px] mx-auto px-5 mt-2.5">
          <div className="rounded-xl px-4 py-2.5 flex items-center justify-between gap-2.5 flex-wrap" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}20` }}>
            <p className="m-0 text-xs font-medium" style={{ color: accentColor }}>
              {guestCount < GUEST_MAX_TESTS
                ? `${GUEST_MAX_TESTS - guestCount} essai${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} gratuit${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} restant`
                : 'Limite atteinte — crée un compte pour continuer'}
            </p>
            <Link
              to="/patient/access"
              className="inline-flex items-center gap-1 text-white font-semibold text-[11px] rounded-full px-3 py-1.5 no-underline"
              style={{ background: accentColor }}
            >
              {guestCount >= GUEST_MAX_TESTS ? 'Créer un compte' : 'Se connecter'}
            </Link>
          </div>
        </div>
      )}

      {/* ── Google Link Banner (phone-only users) ── */}
      {isAuthenticated && (
        <div className="max-w-[600px] mx-auto px-5">
          <GoogleLinkBanner />
        </div>
      )}

      {/* ── Contenu ─────────────────────────────────────────────────────────── */}
      <div className="max-w-[600px] mx-auto px-5 pt-4 pb-[120px]">

        {/* Onglet Évaluations */}
        {activeTab === 'evaluations' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 bg-white border border-line rounded-[14px] px-3.5 py-3 mb-1">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted, #8A8C95)" strokeWidth="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
              <input
                type="text"
                value={scaleSearch}
                onChange={e => setScaleSearch(e.target.value)}
                placeholder="Tape P7, V2 ou « anxiété »..."
                className="border-0 outline-none bg-transparent flex-1 text-sm text-ink placeholder:text-muted"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
            {filteredScales.map((scale, idx) => (
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
                  greyedInfo={greyedMap[scale.id]}
                  onGreyedClick={(id, info) => setUnlockModal({ scaleId: id, info })}
                />
              </div>
            ))}
            <div className="mt-3 rounded-xl px-3.5 py-2.5 flex items-start gap-2" style={{ background: 'rgba(181,115,42,0.06)', border: '1px solid rgba(181,115,42,0.25)' }}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#B5732A' }} />
              <p className="m-0 text-[11px] leading-relaxed" style={{ color: '#8C5A21' }}>
                Ces évaluations ne remplacent pas une consultation avec un professionnel de santé.
                En cas de détresse, consultez immédiatement un spécialiste qualifié.
              </p>
            </div>

            {/* ── Sous-section Tests Bonus (mental uniquement) ── */}
            {isMental && (
              <div className="mt-5">
                <div className="rounded-2xl px-[18px] py-4 mb-3.5 relative overflow-hidden" style={{ background: '#17181B' }}>
                  <div className="absolute rounded-full" style={{ top: -15, right: -15, width: 90, height: 90, background: 'rgba(183,138,46,0.18)' }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="m-0 mb-0.5 text-[15px] font-extrabold text-white flex items-center gap-1.5">
                        <Sparkles size={15} color="#D4AD5A" /> Tests Bonus
                      </p>
                      <p className="m-0 text-[11px] leading-tight flex items-center gap-1 flex-wrap" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        Ces tests enrichissent ton profil — très populaires <Flame size={11} color="#D4AD5A" />
                      </p>
                    </div>
                    <span className="text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap" style={{ background: 'rgba(183,138,46,0.25)', color: '#D4AD5A', border: '1px solid rgba(183,138,46,0.35)' }}>
                      {bonusCompleted}/{BONUS_SCALES.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {filteredBonus.map(scale => (
                    <ScaleRow
                      key={scale.id}
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Onglet Mon Profil */}
        {activeTab === 'profil' && (
          <div className="flex flex-col gap-3">
            <ProfileCard
              isMental={isMental}
              prenom={onboardingProfile?.prenom ?? (currentUser?.name ?? '')}
              profileResults={profileResults}
              scales={activeScales}
              allScalesForCategory={allScales}
              drLoAnalysis={drLoAnalysis}
              drLoUpdatedAt={drLoUpdatedAt}
              drLoUpdating={drLoUpdating}
              onUpdateDrLo={handleUpdateDrLo}
              compatibilityId={compatibilityId}
              isAuthenticated={isAuthenticated}
              cardRef={cardRef}
              sexualFilter={sexualFilter}
              balance={balance}
              generateCost={getCost('analysis')}
              refreshCost={getCost('analysis_refresh')}
              hasPartner={hasPartnerStatus(onboardingProfile?.situation_relationnelle ?? 'celibataire')}
            />

            {/* ── Résultats Tests Bonus (mental uniquement) ── */}
            {isMental && bonusCompleted > 0 && (
              <div className="bg-white rounded-2xl px-[18px] py-4" style={{ border: '1.5px solid rgba(183,138,46,0.2)', boxShadow: '0 2px 12px rgba(183,138,46,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold tracking-wide flex items-center gap-1.5" style={{ color: '#8A6A1E' }}>
                    <Sparkles size={13} /> TESTS BONUS
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#8F6A1F' }}>
                    {bonusCompleted}/{BONUS_SCALES.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {BONUS_SCALES.filter(s => profileResults[s.id]).map(scale => {
                    const result = profileResults[scale.id];
                    const meta = getScaleMeta(scale.id);
                    const sevColor = getSeverityColor(result.interpretation.severity);
                    return (
                      <div key={scale.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: '#F1EAD6' }}>
                        <span className="w-5 flex items-center justify-center flex-shrink-0" style={{ color: sevColor }}>
                          <meta.icon size={14} />
                        </span>
                        <span className="text-[11px] font-semibold text-ink flex-1 min-w-0">
                          {meta.label}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0"
                          style={{ background: `${sevColor}18`, color: sevColor, border: `1px solid ${sevColor}30` }}
                        >
                          {result.interpretation.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-1">
              <button
                onClick={shareProfile}
                disabled={isCapturing || completedCount === 0}
                className="flex-1 rounded-2xl px-4 py-3.5 text-[13px] font-bold flex items-center justify-center gap-1.5 border-0"
                style={{
                  background: isCapturing ? '#E2E8F0' : accentColor,
                  cursor: completedCount === 0 ? 'not-allowed' : 'pointer',
                  color: isCapturing ? '#94A3B8' : '#FFFFFF',
                  boxShadow: completedCount === 0 ? 'none' : `0 3px 12px ${accentColor}30`,
                  opacity: completedCount === 0 ? 0.5 : 1,
                }}
              >
                {isCapturing
                  ? <><Loader2 size={14} className="animate-spin" /> Génération…</>
                  : <><FileDown size={14} /> Télécharger mon profil</>
                }
              </button>

              {isAuthenticated && compatibilityId && (
                <button
                  onClick={copyCompatibilityCode}
                  className="flex-1 rounded-2xl px-4 py-3.5 text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-colors duration-200"
                  style={{
                    background: copyMsg ? 'rgba(60,122,90,0.1)' : 'white',
                    border: `1.5px solid ${copyMsg ? '#3C7A5A' : accentColor}30`,
                    color: copyMsg ? '#3C7A5A' : accentColor,
                  }}
                >
                  {copyMsg ? <><CheckCircle2 size={14} /> {copyMsg}</> : <><Copy size={14} /> Copier mon code</>}
                </button>
              )}
            </div>

            {completedCount === 0 && (
              <p className="m-0 text-[11px] text-muted text-center">
                Complète au moins une évaluation pour télécharger ton profil
              </p>
            )}

            {/* ── Réinitialiser ── */}
            {isAuthenticated && currentUser && (
              <div className="mt-5 rounded-xl px-4 py-3.5 flex items-center gap-3" style={{ background: 'rgba(178,58,58,0.05)', border: '1px solid rgba(178,58,58,0.2)' }}>
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-xs font-semibold" style={{ color: '#8C2E2E' }}>
                    Réinitialiser mon profil
                  </p>
                  <p className="m-0 mt-0.5 text-[11px] leading-tight" style={{ color: '#B23A3A' }}>
                    Supprime tous tes résultats et synthèses Dr Lô. Ton compte et préférences sont conservés.
                  </p>
                </div>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="bg-white rounded-lg px-3.5 py-1.5 text-[11px] font-bold cursor-pointer flex-shrink-0 whitespace-nowrap"
                  style={{ border: '1px solid rgba(178,58,58,0.35)', color: '#B23A3A' }}
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

      {/* ── Modale déblocage test grisé ────────────────────────────────────── */}
      {unlockModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          onClick={() => setUnlockModal(null)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div
            className="relative w-full bg-white rounded-t-3xl px-5 py-6 shadow-xl"
            style={{ maxWidth: 500 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(183,138,46,0.1)' }}>
                <Lock size={16} style={{ color: '#8F6A1F' }} />
              </div>
              <div>
                <p className="m-0 text-[13px] font-bold text-ink">{unlockModal.info.unlockPrompt}</p>
                <p className="m-0 text-[11px] text-muted">{unlockModal.info.reason}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {unlockModal.info.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    const { info } = unlockModal;
                    if (info.intakeField === 'experienceProfile') {
                      const filter = getSexualHealthFilter();
                      if (filter) {
                        (filter as Record<string, unknown>).experienceProfile = opt.value;
                        saveSexualHealthFilter(filter);
                        setSexualFilter({ ...filter });
                        if (currentUser) {
                          saveSexualFilterToProfile(currentUser.id, filter as unknown as Record<string, unknown>).catch(() => {});
                        }
                      }
                    } else {
                      const profile = getOnboardingProfile();
                      if (profile) {
                        (profile as unknown as Record<string, string>)[info.intakeField] = opt.value;
                        saveOnboardingProfile(profile);
                        if (currentUser) {
                          saveOnboardingToProfile(currentUser.id, profile as unknown as Record<string, string>).catch(() => {});
                        }
                      }
                    }
                    setProfileVersion(v => v + 1);
                    setUnlockModal(null);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white text-[13px] font-medium text-ink cursor-pointer transition-colors"
                  style={{ border: '1.5px solid #E7E4DA' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setUnlockModal(null)}
              className="w-full mt-3 py-2.5 rounded-xl border-0 bg-transparent text-[13px] font-semibold cursor-pointer"
              style={{ color: '#8A8C95' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Modale login wall ──────────────────────────────────────────────── */}
      {showLoginWall && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowLoginWall(false)}
        >
          <div
            className="bg-white rounded-block p-7 w-full text-center"
            style={{ maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${accentColor}12` }}>
              <Target size={26} color={accentColor} />
            </div>
            <h3 className="font-display m-0 mb-2 text-xl font-extrabold text-ink">
              Tu as utilisé tes 3 essais gratuits !
            </h3>
            <p className="m-0 mb-2 text-[13px] text-ink-soft leading-relaxed">
              Crée un compte <strong>gratuit</strong> pour :
            </p>
            <ul className="text-left m-0 mb-5 pl-0 text-xs text-ink-soft leading-loose list-none">
              {[
                'Accéder aux 24 évaluations sans limite',
                'Sauvegarder et suivre ta progression',
                'Obtenir ton profil Dr Lô en profil psychologique & vie intime',
                'Tester ta compatibilité avec un proche',
              ].map(item => (
                <li key={item} className="flex items-start gap-1.5 mb-1">
                  <CheckCircle2 size={14} color="#3C7A5A" className="flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/patient/access"
              className="block w-full text-white font-bold text-sm rounded-2xl py-3.5 no-underline mb-2.5"
              style={{ background: accentColor }}
            >
              Créer mon compte gratuit →
            </Link>
            <button
              onClick={() => setShowLoginWall(false)}
              className="bg-transparent border-0 text-xs text-muted cursor-pointer"
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

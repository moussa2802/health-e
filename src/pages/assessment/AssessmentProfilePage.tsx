import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { triggerDrLoAnalysis } from '../../utils/drLoAnalysis';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  createSession,
} from '../../services/evaluationService';
import ConfirmResetModal from '../../components/assessment/ConfirmResetModal';
import ShareableProfileCard from '../../components/assessment/ShareableProfileCard';
import { resetFullProfile } from '../../services/testManagementService';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import {
  getKeyDimensions,
  getArchetype,
  getShortQuote,
  getIntimateTraits,
  type Archetype,
} from '../../utils/profileArchetype';
import type { ScaleResult } from '../../types/assessment';
import type { AssessmentScale } from '../../types/assessment';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import {
  getScaleMeta,
  getScaleCategory,
  getCategoryColor,
  type ScaleCategory,
} from '../../utils/scaleMeta';
import {
  Brain,
  Heart,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Lightbulb,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Lock,
  Upload,
  Eye,
} from 'lucide-react';

// ── Helpers couleur de sévérité ───────────────────────────────────────────────
function getSeverityClasses(severity: string): string {
  switch (severity) {
    case 'positive':
    case 'none':
    case 'minimal':
      return 'bg-ok/10 text-ok';
    case 'mild':
    case 'moderate':
      return 'bg-warn/10 text-warn';
    case 'severe':
    case 'alert':
      return 'bg-danger/10 text-danger';
    default:
      return 'bg-muted/10 text-muted';
  }
}

// ── Helper couleur solide par catégorie (CTA) ─────────────────────────────────
function getCategorySolidBg(category: ScaleCategory): string {
  switch (category) {
    case 'mental':
      return 'bg-sage';
    case 'sexual':
      return 'bg-accent';
    default:
      return 'bg-gold';
  }
}

function getShortComment(result: ScaleResult): string {
  const description = result.interpretation?.description ?? '';
  const recommendation = result.interpretation?.recommendation ?? '';
  if (description && recommendation) return `${description} ${recommendation}`;
  return description || recommendation || '';
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
  const meta = getScaleMeta(scale.id);
  const Icon = meta.icon;
  const category = getScaleCategory(scale.id);
  const catColor = getCategoryColor(category);
  const [showAnalysis, setShowAnalysis] = React.useState(false);
  const description = result?.interpretation?.description ?? '';
  const recommendation = result?.interpretation?.recommendation ?? '';

  return (
    <div
      className={`flex items-center gap-3 rounded-card border p-3.5 transition-shadow ${
        isCompleted ? `${catColor.bg} ${catColor.border}` : 'bg-card border-line'
      }`}
    >
      {/* Icône */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${catColor.bg} ${catColor.text}`}
      >
        <Icon size={18} />
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-muted">{scale.shortName}</span>
          {isCompleted && <CheckCircle2 size={13} className={catColor.text} />}
        </div>
        <p className="m-0 truncate text-[13px] font-semibold text-ink">{meta.label}</p>

        {isCompleted && result ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-block rounded-pill px-2.5 py-0.5 text-[11px] font-bold ${getSeverityClasses(
                  result.interpretation.severity
                )}`}
              >
                {result.interpretation.label}
              </span>
              <span className="text-[11px] text-muted">Score : {result.totalScore}</span>
              {result.completedAt && (
                <span className="text-[11px] text-muted/70">{formatDate(result.completedAt)}</span>
              )}
            </div>
            {(description || recommendation) && (
              <>
                <button
                  onClick={() => setShowAnalysis(v => !v)}
                  className={`mt-1 flex items-center gap-1 bg-transparent p-0 text-[11px] font-semibold ${catColor.text}`}
                >
                  <MessageCircle size={12} />
                  {showAnalysis ? 'Masquer' : 'Voir mon analyse'}
                  {showAnalysis ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showAnalysis && (
                  <div className={`mt-1.5 rounded-xl border p-2.5 ${catColor.border} ${catColor.bg}`}>
                    {description && (
                      <p className="m-0 text-[11px] leading-relaxed text-ink-soft">{description}</p>
                    )}
                    {recommendation && (
                      <p
                        className={`flex items-start gap-1 text-[11px] italic leading-relaxed text-muted ${
                          description ? 'mt-1.5' : ''
                        }`}
                      >
                        <Lightbulb size={12} className="mt-0.5 flex-shrink-0" />
                        {recommendation}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <span className="mt-0.5 block text-[11px] text-muted">
            À faire · {scale.timeEstimateMinutes} min
          </span>
        )}
      </div>

      {/* Bouton action */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <button
            onClick={() => onStart(scale.id)}
            disabled={loading}
            className={`flex items-center gap-1 rounded-pill border bg-transparent px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60 ${catColor.border} ${catColor.text}`}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : 'Refaire'}
          </button>
        ) : (
          <button
            onClick={() => onStart(scale.id)}
            disabled={loading}
            className={`flex items-center gap-1 rounded-pill px-3.5 py-1.5 text-[11px] font-bold text-white shadow-soft disabled:opacity-60 ${getCategorySolidBg(
              category
            )}`}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : 'Commencer'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Dr Lo Panel ───────────────────────────────────────────────────────────────

const DrLoPanel: React.FC<{
  bloc: 'mental' | 'sexual';
  analysis: string | null;
  completedCount: number;
}> = ({ bloc, analysis, completedCount }) => {
  const [open, setOpen] = React.useState(false);
  if (completedCount === 0) return null;
  const catColor = getCategoryColor(bloc);
  const title = bloc === 'mental' ? 'Dr Lô — Profil psychologique' : 'Dr Lô — Vie intime';

  return (
    <div className={`mt-2 overflow-hidden rounded-block border ${catColor.border} ${catColor.bg}`}>
      {/* En-tête cliquable */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2.5 bg-transparent px-[18px] py-4 text-left"
      >
        <div className={`h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 ${catColor.border}`}>
          <img
            src="/dr-lo.png"
            alt="Dr. Lô"
            className="h-full w-full object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <p className="m-0 text-[13px] font-extrabold text-ink">{title}</p>
          <p className="m-0 text-[10px] font-semibold tracking-wide text-muted">
            {open ? "Masquer l'analyse" : 'Afficher mon analyse'}
          </p>
        </div>
        {open ? (
          <ChevronUp size={16} className={catColor.text} />
        ) : (
          <ChevronDown size={16} className={catColor.text} />
        )}
      </button>

      {/* Contenu collapsible */}
      {open && (
        <div className="px-[18px] pb-4">
          {analysis ? (
            <div className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
              {analysis}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Loader2 size={16} className={`flex-shrink-0 animate-spin ${catColor.text}`} />
              <p className="m-0 text-[13px] italic text-muted">
                Dr. Lô prépare ton analyse… reviens dans quelques secondes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Carte psychologique ──────────────────────────────────────────────────────
const MentalProfileCard: React.FC<{
  archetype: Archetype;
  drLoMentalAnalysis: string | null;
  compatibilityIdMental: string | null;
  copiedMental: boolean;
  onCopyMental: () => void;
}> = ({ archetype, drLoMentalAnalysis, compatibilityIdMental, copiedMental, onCopyMental }) => {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <div className="mb-4 rounded-[22px] border border-line bg-card p-5 shadow-soft relative overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[14px] bg-sage-soft text-sage">
          <Brain size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display m-0 text-[17px] font-bold text-ink">Profil psychologique</h3>
          {archetype.traits.length > 0 && (
            <p className="m-0 mt-1 text-[12.5px] text-muted truncate">
              {archetype.traits.join(' · ')}
            </p>
          )}
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-sage bg-sage-soft rounded-[20px] px-2.5 py-1 mt-3">
        {archetype.title} {archetype.subtitle}
      </span>

      {drLoMentalAnalysis ? (
        revealed ? (
          <div className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
            {drLoMentalAnalysis}
          </div>
        ) : (
          <p className="mt-4 text-[13px] leading-[1.6] text-ink-soft m-0" style={{ filter: 'blur(4px)', userSelect: 'none', opacity: 0.7 }}>
            {drLoMentalAnalysis.slice(0, 200)}…
          </p>
        )
      ) : (
        <p className="mt-4 text-[13px] text-muted italic m-0">
          Complète des tests psychologiques pour obtenir ton analyse.
        </p>
      )}

      <div className="flex gap-2.5 mt-4">
        {drLoMentalAnalysis && (
          <button
            onClick={() => setRevealed(v => !v)}
            className="flex-1 flex items-center justify-center gap-2 rounded-[12px] border-none bg-sage py-3 px-3 text-[13px] font-bold text-white cursor-pointer transition-colors hover:bg-sage/90 text-center"
          >
            {revealed ? 'Masquer' : 'Lire mon analyse psychologique'}
          </button>
        )}
        {compatibilityIdMental && (
          <button
            onClick={onCopyMental}
            className="flex-1 flex items-center justify-center gap-2 rounded-[12px] border border-line bg-paper py-3 px-3 text-[13px] font-bold text-ink cursor-pointer transition-colors hover:bg-card text-center"
          >
            {copiedMental ? <Check size={14} /> : <Copy size={14} />}
            {copiedMental ? 'Copié !' : 'Partager avec partenaire'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Carte intime privée ──────────────────────────────────────────────────────
const IntimatePrivateCard: React.FC<{
  intimateTraits: string[];
  drLoSexualAnalysis: string | null;
  compatibilityIdSexual: string | null;
  copiedSexual: boolean;
  onCopySexual: () => void;
}> = ({ intimateTraits, drLoSexualAnalysis, compatibilityIdSexual, copiedSexual, onCopySexual }) => {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <div className="mb-7 rounded-[22px] border border-line bg-card p-5 shadow-soft relative overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent">
          <Heart size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display m-0 text-[17px] font-bold text-ink">Profil intime</h3>
          {intimateTraits.length > 0 && (
            <p className="m-0 mt-1 text-[12.5px] text-muted truncate">
              {intimateTraits.join(' · ')}
            </p>
          )}
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-sage bg-sage-soft rounded-[20px] px-2.5 py-1 mt-3">
        <Lock size={11} />
        Jamais partagé publiquement
      </span>

      {drLoSexualAnalysis ? (
        revealed ? (
          <div className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
            {drLoSexualAnalysis}
          </div>
        ) : (
          <p className="mt-4 text-[13px] leading-[1.6] text-ink-soft m-0" style={{ filter: 'blur(4px)', userSelect: 'none', opacity: 0.7 }}>
            {drLoSexualAnalysis.slice(0, 200)}…
          </p>
        )
      ) : (
        <p className="mt-4 text-[13px] text-muted italic m-0">
          Complète des tests intimes pour obtenir ton analyse.
        </p>
      )}

      <div className="flex gap-2.5 mt-4">
        {drLoSexualAnalysis && (
          <button
            onClick={() => setRevealed(v => !v)}
            className="flex-1 flex items-center justify-center gap-2 rounded-[12px] border-none bg-accent py-3 px-3 text-[13px] font-bold text-white cursor-pointer transition-colors hover:bg-accent/90 text-center"
          >
            {revealed ? 'Masquer' : 'Lire mon analyse intime'}
          </button>
        )}
        {compatibilityIdSexual && (
          <button
            onClick={onCopySexual}
            className="flex-1 flex items-center justify-center gap-2 rounded-[12px] border border-line bg-paper py-3 px-3 text-[13px] font-bold text-ink cursor-pointer transition-colors hover:bg-card text-center"
          >
            {copiedSexual ? <Check size={14} /> : <Copy size={14} />}
            {copiedSexual ? 'Copié !' : 'Partager avec partenaire'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Composant CompatibilityCodeCard ──────────────────────────────────────────
interface CodeCardProps {
  type: 'mental' | 'sexual';
  label: string;
  isComplete: boolean;
  compatibilityId: string | null;
  completedCount: number;
  totalCount: number;
  copied: boolean;
  onCopy: () => void;
}

const CompatibilityCodeCard: React.FC<CodeCardProps> = ({
  type, label, isComplete, compatibilityId, completedCount, totalCount, copied, onCopy,
}) => {
  const catColor = getCategoryColor(type);
  const Icon = type === 'mental' ? Brain : Heart;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      className={`rounded-block border p-5 ${
        isComplete ? `${catColor.bg} ${catColor.border}` : 'bg-card border-line'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border ${catColor.bg} ${catColor.border} ${catColor.text}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="m-0 text-sm font-extrabold text-ink">{label}</h3>
            {isComplete && (
              <span
                className={`rounded-pill border px-2 py-0.5 text-[10px] font-bold tracking-wide ${catColor.bg} ${catColor.border} ${catColor.text}`}
              >
                COMPLET
              </span>
            )}
          </div>

          {isComplete && compatibilityId ? (
            <>
              <p className="m-0 mb-2.5 text-xs text-muted">
                Partagez ce code pour tester votre compatibilité.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code
                  className={`inline-block rounded-lg border bg-card px-4 py-2 font-mono text-lg font-extrabold tracking-widest ${catColor.border} ${catColor.text}`}
                >
                  {compatibilityId}
                </code>
                <button
                  onClick={onCopy}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    copied ? 'border-ok/40 bg-ok/10 text-ok' : `bg-card ${catColor.border} ${catColor.text}`
                  }`}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
              </div>
              <Link
                to="/assessment/compatibility"
                className={`mt-2.5 inline-flex items-center gap-1 text-xs font-semibold no-underline ${catColor.text}`}
              >
                Tester ma compatibilité <ChevronRight size={13} />
              </Link>
            </>
          ) : (
            <>
              <p className="m-0 mb-2 text-xs leading-relaxed text-muted">
                <strong className={catColor.text}>
                  {totalCount - completedCount} évaluation{totalCount - completedCount > 1 ? 's' : ''}
                </strong>{' '}
                restantes pour obtenir ce code.
              </p>
              <div className="flex items-center gap-2">
                <div className="h-[5px] flex-1 overflow-hidden rounded-pill bg-line">
                  <div
                    className={`h-full rounded-pill ${getCategorySolidBg(type)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`min-w-[32px] text-right text-[11px] font-bold ${catColor.text}`}>
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
  const [signatures, setSignatures] = useState<Record<string, { value: number; max: number }[]>>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [compatibilityIdMental, setCompatibilityIdMental] = useState<string | null>(null);
  const [compatibilityIdSexual, setCompatibilityIdSexual] = useState<string | null>(null);
  const [isMentalComplete, setIsMentalComplete] = useState(false);
  const [isSexualComplete, setIsSexualComplete] = useState(false);
  const [mentalCompletedCount, setMentalCompletedCount] = useState(0);
  const [sexualCompletedCount, setSexualCompletedCount] = useState(0);
  const [drLoMentalAnalysis, setDrLoMentalAnalysis] = useState<string | null>(null);
  const [drLoSexualAnalysis, setDrLoSexualAnalysis] = useState<string | null>(null);
  const [drLoSynthesis, setDrLoSynthesis] = useState<string | null>(null);
  const [updatingAnalysis, setUpdatingAnalysis] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedMental, setCopiedMental] = useState(false);
  const [copiedSexual, setCopiedSexual] = useState(false);

  const [sharing, setSharing] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const onboardingProfile = getOnboardingProfile();
  const prenom = onboardingProfile?.prenom || '';
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleReset = async () => {
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

    const timeout = setTimeout(() => setLoadingProfile(false), 8000);
    getOrCreateUserProfile(currentUser.id, currentUser.name)
      .then(() => getProfileProgress(currentUser.id))
      .then(progress => {
        setScaleResults(progress.scaleResults);
        setSignatures(progress.signatures);
        setCompletedCount(progress.completedCount);
        setTotalCount(progress.totalCount);
        setCompatibilityIdMental(progress.compatibilityIdMental);
        setCompatibilityIdSexual(progress.compatibilityIdSexual);
        setIsMentalComplete(progress.isMentalComplete);
        setIsSexualComplete(progress.isSexualComplete);
        setMentalCompletedCount(progress.mentalCompletedCount);
        setSexualCompletedCount(progress.sexualCompletedCount);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setLoadingProfile(false); });
  }, [isAuthenticated, currentUser]);

  // onSnapshot : mise à jour temps réel des analyses Dr Lo
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const ref = doc(db, 'userProfiles', currentUser.id);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.drLoMentalAnalysis) setDrLoMentalAnalysis(data.drLoMentalAnalysis as string);
      if (data.drLoSexualAnalysis) setDrLoSexualAnalysis(data.drLoSexualAnalysis as string);
      if (data.drLoSynthesis) setDrLoSynthesis(data.drLoSynthesis as string);
    }, () => { /* silencieux */ });
    return () => unsubscribe();
  }, [isAuthenticated, currentUser?.id]);

  const handleUpdateAnalysis = async () => {
    if (!currentUser || updatingAnalysis) return;
    setUpdatingAnalysis(true);
    try {
      await triggerDrLoAnalysis(currentUser.id);
    } catch { /* silencieux */ }
    finally { setUpdatingAnalysis(false); }
  };

  const handleShareCard = useCallback(async () => {
    if (!exportRef.current || sharing) return;
    setSharing(true);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'mon-profil-health-e.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mon profil Health-e' });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'mon-profil-health-e.png';
        a.click();
      }
    } catch { /* user cancelled or unsupported */ }
    finally { setSharing(false); }
  }, [sharing]);

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

  const archetype = getArchetype(scaleResults);
  const mentalDimensions = getKeyDimensions(scaleResults, 'mental');
  const drLoQuote = getShortQuote(drLoSynthesis);
  const intimateTraits = getIntimateTraits(scaleResults);
  const firstSignature = Object.values(signatures).find(s => s?.length >= 3);

  if (authLoading || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <Loader2 size={44} className="mx-auto mb-3.5 animate-spin text-accent" />
          <p className="text-sm text-ink-soft">Chargement de votre profil…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-[60px]">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mb-7 bg-card pb-[18px] pt-5 shadow-soft">
        <div className="mx-auto max-w-[720px] px-5">
          {/* Fil d'Ariane */}
          <div className="mb-2.5 flex items-center gap-1.5 text-xs text-muted">
            <Link to="/assessment" className="font-medium text-accent no-underline">
              Évaluations
            </Link>
            <ChevronRight size={12} />
            <span className="font-semibold text-ink">Mon Profil</span>
          </div>

          <h1 className="font-display m-0 mb-1 text-2xl font-bold text-ink">
            Mon Profil d'Évaluation
          </h1>
          <p className="m-0 mb-3.5 text-sm text-ink-soft">
            {completedCount}/{totalCount} évaluations complétées
          </p>

          {/* Grande barre de progression */}
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-line">
              <div
                className="h-full rounded-pill bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="min-w-[36px] text-right text-[13px] font-bold text-accent">
              {progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Contenu ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[720px] px-5">

        {/* ── Erreur ─────────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="mb-5 rounded-xl border border-danger/20 bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
            {errorMsg}
          </div>
        )}

        {/* ── Carte psychologique partageable ──────────────────────── */}
        {completedCount > 0 && (() => {
          return (
            <>
              <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-muted m-0 mb-3 ml-1">
                Ta carte à partager
              </p>

              <div className="mb-0 max-w-[432px] mx-auto">
                <ShareableProfileCard
                  prenom={prenom}
                  archetype={archetype}
                  dimensions={mentalDimensions}
                  quote={drLoQuote}
                  completedCount={completedCount}
                  totalCount={totalCount}
                  pct={progressPct}
                  signatureValues={firstSignature}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 mt-3.5 mb-7 max-w-[432px] mx-auto">
                <button
                  onClick={handleShareCard}
                  disabled={sharing}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[14px] border-none bg-ink py-[13px] text-[13.5px] font-bold text-[#F4F1E9] cursor-pointer transition-colors hover:bg-ink/90 disabled:opacity-60"
                  aria-label="Partager ma carte"
                >
                  {sharing ? (
                    <><Loader2 size={16} className="animate-spin" /> Export…</>
                  ) : (
                    <><Upload size={16} /> Partager ma carte</>
                  )}
                </button>
                <button
                  onClick={handleUpdateAnalysis}
                  disabled={updatingAnalysis}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[14px] border border-line bg-card py-[13px] text-[13.5px] font-bold text-ink cursor-pointer transition-colors hover:bg-paper disabled:opacity-60"
                  aria-label="Mettre à jour l'analyse"
                >
                  {updatingAnalysis ? (
                    <><Loader2 size={16} className="animate-spin" /> Analyse…</>
                  ) : (
                    <><RefreshCw size={16} /> Actualiser</>
                  )}
                </button>
              </div>

              {/* ── Cartes profil psycho + intime ───────────────────── */}
              {mentalCompletedCount > 0 && (
                <MentalProfileCard
                  archetype={archetype}
                  drLoMentalAnalysis={drLoMentalAnalysis}
                  compatibilityIdMental={compatibilityIdMental}
                  copiedMental={copiedMental}
                  onCopyMental={handleCopyMental}
                />
              )}
              {sexualCompletedCount > 0 && (
                <IntimatePrivateCard
                  intimateTraits={intimateTraits}
                  drLoSexualAnalysis={drLoSexualAnalysis}
                  compatibilityIdSexual={compatibilityIdSexual}
                  copiedSexual={copiedSexual}
                  onCopySexual={handleCopySexual}
                />
              )}
            </>
          );
        })()}

        {/* ── Section Profil psychologique ───────────────────────────── */}
        <section className="mb-8">
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <Brain size={22} className="text-sage" />
            <h2 className="font-display m-0 text-[17px] font-bold text-ink">
              Profil psychologique
            </h2>
            <span className="rounded-pill border border-sage/20 bg-sage/10 px-2.5 py-0.5 text-[11px] font-bold text-sage">
              {MENTAL_HEALTH_SCALES.filter(s => !!scaleResults[s.id]).length}/
              {MENTAL_HEALTH_SCALES.length} complétées
            </span>
          </div>

          <div className="flex flex-col gap-2">
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

          <DrLoPanel
            bloc="mental"
            analysis={drLoMentalAnalysis}
            completedCount={mentalCompletedCount}
          />
        </section>

        {/* ── Section Vie intime ─────────────────────────────────────── */}
        <section className="mb-8">
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <Heart size={22} className="text-accent" />
            <h2 className="font-display m-0 text-[17px] font-bold text-ink">
              Vie intime
            </h2>
            <span className="rounded-pill border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
              {SEXUAL_HEALTH_SCALES.filter(s => !!scaleResults[s.id]).length}/
              {SEXUAL_HEALTH_SCALES.length} complétées
            </span>
            <span className="flex items-center gap-1 rounded-pill border border-ok/20 bg-ok/10 px-2.5 py-0.5 text-[11px] font-semibold text-ok">
              <Lock size={11} />
              Confidentiel
            </span>
          </div>

          <div className="flex flex-col gap-2">
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

          <DrLoPanel
            bloc="sexual"
            analysis={drLoSexualAnalysis}
            completedCount={sexualCompletedCount}
          />
        </section>

        {/* ── Cards Codes de compatibilité ──────────────────────────── */}
        <div className="mb-7 flex flex-col gap-3.5">
          <CompatibilityCodeCard
            type="mental"
            label="Profil Psychologique"
            isComplete={isMentalComplete}
            compatibilityId={compatibilityIdMental}
            completedCount={mentalCompletedCount}
            totalCount={MENTAL_HEALTH_SCALES.length}
            copied={copiedMental}
            onCopy={handleCopyMental}
          />
          <CompatibilityCodeCard
            type="sexual"
            label="Profil Intime"
            isComplete={isSexualComplete}
            compatibilityId={compatibilityIdSexual}
            completedCount={sexualCompletedCount}
            totalCount={SEXUAL_HEALTH_SCALES.length}
            copied={copiedSexual}
            onCopy={handleCopySexual}
          />
        </div>

        {/* ── Disclaimer ────────────────────────────────────────────── */}
        <div className="flex items-start gap-2.5 rounded-xl border border-gold/25 bg-gold-soft px-4 py-3.5">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-gold" />
          <p className="m-0 text-xs leading-relaxed text-ink-soft">
            <strong>Important :</strong> Ces évaluations sont fournies à titre informatif uniquement et ne
            remplacent en aucun cas une consultation avec un professionnel de santé qualifié.
            En cas de détresse psychologique ou d'urgence, contactez immédiatement un médecin
            ou un service d'urgence.
          </p>
        </div>

        {/* ── Zone sensible — Réinitialisation ─────────────────────── */}
        <div className="mt-8 rounded-block border border-danger/30 bg-danger/10 p-5">
          <p className="m-0 mb-1 flex items-center gap-1.5 text-sm font-bold text-danger">
            <AlertTriangle size={15} />
            Zone sensible
          </p>
          <p className="m-0 mb-3.5 text-[13px] leading-relaxed text-danger/80">
            Supprime tous tes résultats de tests et synthèses Dr Lô.
            Ton compte et tes préférences sont conservés. Cette action est irréversible.
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 rounded-xl border border-danger/40 bg-card px-[18px] py-2.5 text-[13px] font-bold text-danger"
          >
            <RefreshCw size={14} />
            Réinitialiser mon profil
          </button>
        </div>

        <ConfirmResetModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          onConfirm={handleReset}
          loading={resetting}
        />
      </div>

      {/* Hidden export card for image generation */}
      <div
        ref={exportRef}
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1, pointerEvents: 'none' }}
      >
        <ShareableProfileCard
          prenom={prenom}
          archetype={archetype}
          dimensions={mentalDimensions}
          quote={drLoQuote}
          completedCount={completedCount}
          totalCount={totalCount}
          pct={progressPct}
          variant="export"
          signatureValues={firstSignature}
        />
      </div>
    </div>
  );
};

export default AssessmentProfilePage;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Home, Users, Briefcase, Key, Brain, Flame, Copy, Check, Lock,
  ChevronRight, ChevronDown, Sparkles, Loader2, AlertCircle, AlertTriangle,
  ThumbsUp, Stethoscope, Zap, RefreshCw, Trash2, TrendingUp, TrendingDown,
  Clock as ClockIcon, CheckCircle2, XCircle, BarChart3,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PageTooltips from '../../components/Onboarding/PageTooltips';
import { getOrCreateUserProfile, getProfileProgress } from '../../services/evaluationService';
import {
  computeCompatibility,
  computeMergedCompatibility,
  createCompatibilityRequest,
  saveCompatibilityHistory,
  getCompatibilityHistory,
  deleteCompatibilityHistory,
  validateCompatibilityCode,
  migrateExistingCompatibilityHistory,
  type CompatibilityHistoryEntry,
  type CodeValidationResult,
} from '../../services/compatibilityService';
import type { CompatibilityResult } from '../../types/assessment';
import { RELATIONSHIP_CATEGORIES, getRelationshipLabel } from '../../utils/relationshipTypes';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';
import { isAiAvailable } from '../../utils/aiCircuitBreaker';

// Icon for each top-level relationship category (relationshipTypes.ts carries an
// `emoji` field used as raw data, but the UI never renders emoji as icons).
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  amoureux: Heart,
  famille: Home,
  amitie: Users,
  professionnel: Briefcase,
};

function scoreStyle(score: number) {
  if (score >= 75) return { hex: '#4A5D57', soft: '#E4EAE6', textClass: 'text-sage', softClass: 'bg-sage-soft', borderClass: 'border-sage/25', label: 'Très bonne compatibilité' };
  if (score >= 50) return { hex: '#8F6A1F', soft: '#F1EAD6', textClass: 'text-gold', softClass: 'bg-gold-soft', borderClass: 'border-gold/25', label: 'Compatibilité modérée' };
  return { hex: '#B5522F', soft: '#F5E4DC', textClass: 'text-accent', softClass: 'bg-accent-soft', borderClass: 'border-accent/25', label: 'Des zones à explorer ensemble' };
}

const CompatibilityPage: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const { canAfford, refreshBalance, balance, getCost } = useKoris();

  const [myIdMental, setMyIdMental] = useState<string | null>(null);
  const [myIdSexual, setMyIdSexual] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [copiedMental, setCopiedMental] = useState(false);
  const [copiedSexual, setCopiedSexual] = useState(false);

  const [partnerMentalId, setPartnerMentalId] = useState('');
  const [partnerSexualId, setPartnerSexualId] = useState('');
  const [mainCategoryId, setMainCategoryId] = useState<string | null>(null);
  const [selectedSubTypeId, setSelectedSubTypeId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [currentResult, setCurrentResult] = useState<CompatibilityResult | null>(null);
  const [currentPartnerPrenom, setCurrentPartnerPrenom] = useState<string>('');
  const [history, setHistory] = useState<CompatibilityHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Code validation state
  const [mentalValidation, setMentalValidation] = useState<CodeValidationResult | null>(null);
  const [sexualValidation, setSexualValidation] = useState<CodeValidationResult | null>(null);
  const [mentalValidating, setMentalValidating] = useState(false);
  const [sexualValidating, setSexualValidating] = useState(false);
  const mentalDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const sexualDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const skipResetRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  const selectedCategory = RELATIONSHIP_CATEGORIES.find(c => c.id === mainCategoryId) ?? null;
  const isRomantic = mainCategoryId === 'amoureux';

  const mentalTrimmed = partnerMentalId.trim().toUpperCase();
  const sexualTrimmed = partnerSexualId.trim().toUpperCase();
  const canSubmit = isAuthenticated && !!selectedSubTypeId && (
    isRomantic
      ? (mentalTrimmed.length > 0 || sexualTrimmed.length > 0)
      : mentalTrimmed.length > 0
  );

  // Debounced code validation
  const validateCode = useCallback((code: string, type: 'mental' | 'sexual') => {
    const setValidation = type === 'mental' ? setMentalValidation : setSexualValidation;
    const setValidating = type === 'mental' ? setMentalValidating : setSexualValidating;
    const debounceRef = type === 'mental' ? mentalDebounceRef : sexualDebounceRef;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setValidation(null); setValidating(false); return; }

    const minLen = trimmed.startsWith('HE-') ? 16 : 7;
    if (trimmed.length < minLen) { setValidation(null); setValidating(false); return; }

    setValidating(true);
    debounceRef.current = setTimeout(async () => {
      if (!currentUser) { setValidating(false); return; }
      try {
        const result = await validateCompatibilityCode(trimmed, currentUser.id);
        setValidation(result);
      } catch {
        setValidation({ valid: false, error: 'Erreur de vérification' });
      } finally {
        setValidating(false);
      }
    }, 600);
  }, [currentUser]);

  // Reset sub-type when main category changes
  useEffect(() => {
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    setSelectedSubTypeId(null);
    setPartnerMentalId('');
    setPartnerSexualId('');
    setFormError(null);
    setMentalValidation(null);
    setSexualValidation(null);
  }, [mainCategoryId]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setLoadingProfile(true);
      const timeout = setTimeout(() => setLoadingProfile(false), 8000);
      getOrCreateUserProfile(currentUser.id, currentUser.name)
        .then(() => getProfileProgress(currentUser.id))
        .then((p) => { setMyIdMental(p.compatibilityIdMental); setMyIdSexual(p.compatibilityIdSexual); })
        .catch(() => {})
        .finally(() => { clearTimeout(timeout); setLoadingProfile(false); });

      // Load history + migrate existing separate entries
      setHistoryLoading(true);
      migrateExistingCompatibilityHistory(currentUser.id)
        .catch(() => {})
        .finally(() => {
          getCompatibilityHistory(currentUser.id)
            .then(setHistory)
            .catch(() => {})
            .finally(() => setHistoryLoading(false));
        });
    }
  }, [isAuthenticated, currentUser]);

  const copy = async (text: string, setCopied: (v: boolean) => void) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* silencieux */ }
  };

  // Recalculate from history
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);

  const handleRecalculate = async (entry: CompatibilityHistoryEntry) => {
    if (!isAuthenticated || !currentUser || recalculatingId) return;
    if (!canAfford('compatibility')) return;

    setRecalculatingId(entry.id);
    try {
      let res: CompatibilityResult;

      if (entry.codeType === 'merged' && entry.mentalCode && entry.intimateCode) {
        res = await computeMergedCompatibility(currentUser.id, entry.relationshipType, entry.mentalCode, entry.intimateCode);
        await saveCompatibilityHistory(currentUser.id, entry.relationshipType, entry.mentalCode, 'merged', res, entry.partnerPrenom, entry.mentalCode, entry.intimateCode).catch(() => {});
      } else {
        const req = await createCompatibilityRequest(currentUser.id, entry.partnerCode, entry.relationshipType);
        res = await computeCompatibility(req.id);
        await saveCompatibilityHistory(currentUser.id, entry.relationshipType, entry.partnerCode, entry.codeType === 'merged' ? 'mental' : entry.codeType, res, entry.partnerPrenom).catch(() => {});
      }

      const updated = await getCompatibilityHistory(currentUser.id);
      setHistory(updated);
      await refreshBalance();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors du recalcul.');
      await refreshBalance();
    } finally {
      setRecalculatingId(null);
    }
  };

  const handleCalculate = async () => {
    setFormError(null);
    if (!isAuthenticated || !currentUser) { setFormError("Tu dois être connecté(e)."); return; }
    if (!selectedSubTypeId) { setFormError("Sélectionne le type de relation."); return; }

    if (mentalTrimmed && mentalValidation && !mentalValidation.valid) {
      setFormError(mentalValidation.error || "Code mental invalide."); return;
    }
    if (sexualTrimmed && sexualValidation && !sexualValidation.valid) {
      setFormError(sexualValidation.error || "Code intime invalide."); return;
    }

    const isMentalFmt = (c: string) => /^HE-MNT-\d{4}-[A-Z0-9]{4}$/i.test(c) || /^SM-[A-Z0-9]{4}$/i.test(c);
    const isSexualFmt = (c: string) => /^HE-SEX-\d{4}-[A-Z0-9]{4}$/i.test(c) || /^SE-[A-Z0-9]{4}$/i.test(c);

    if (mentalTrimmed && !isMentalFmt(mentalTrimmed)) { setFormError("Format invalide — code mental : HE-MNT-2026-XXXX."); return; }
    if (sexualTrimmed && !isSexualFmt(sexualTrimmed)) { setFormError("Format invalide — code intime : HE-SEX-2026-XXXX."); return; }
    if (!mentalTrimmed && !sexualTrimmed) { setFormError("Saisis au moins un code."); return; }
    if (!isRomantic && !mentalTrimmed) { setFormError("Saisis le code mental de cette personne."); return; }
    if (mentalTrimmed === myIdMental || sexualTrimmed === myIdSexual) { setFormError("Tu ne peux pas te comparer à toi-même."); return; }

    if (!canAfford('compatibility')) {
      setFormError(`Solde Koris insuffisant (${KORIS_COSTS.compatibility} Koris requis, solde : ${balance}).`);
      return;
    }

    setCalculating(true);
    try {
      let result: CompatibilityResult;
      const partnerPrenom = mentalValidation?.prenom || sexualValidation?.prenom;

      if (isRomantic && (mentalTrimmed || sexualTrimmed)) {
        result = await computeMergedCompatibility(
          currentUser.id,
          selectedSubTypeId,
          mentalTrimmed || null,
          sexualTrimmed || null,
        );

        const codeType: 'merged' | 'mental' | 'sexual' = (mentalTrimmed && sexualTrimmed) ? 'merged' : (mentalTrimmed ? 'mental' : 'sexual');
        await saveCompatibilityHistory(
          currentUser.id, selectedSubTypeId,
          mentalTrimmed || sexualTrimmed,
          codeType, result, partnerPrenom,
          mentalTrimmed || undefined, sexualTrimmed || undefined,
        ).catch(() => {});
      } else {
        const req = await createCompatibilityRequest(currentUser.id, mentalTrimmed, selectedSubTypeId);
        result = await computeCompatibility(req.id);
        await saveCompatibilityHistory(currentUser.id, selectedSubTypeId, mentalTrimmed, 'mental', result, partnerPrenom).catch(() => {});
      }

      setCurrentResult(result);
      setCurrentPartnerPrenom(partnerPrenom || '');
      getCompatibilityHistory(currentUser.id).then(setHistory).catch(() => {});
      await refreshBalance();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors du calcul. Réessaie.');
      await refreshBalance();
    } finally {
      setCalculating(false);
    }
  };

  const isFamilyCategory = mainCategoryId === 'famille';

  // ── Render helpers ──

  const renderMergedResult = (result: CompatibilityResult, partnerPrenom: string, showActions?: boolean) => {
    const gs = scoreStyle(result.globalScore);
    const hasMental = result.mentalScore !== undefined && result.mentalScore !== null;
    const hasIntimate = result.intimateScore !== undefined && result.intimateScore !== null;
    const isMerged = hasMental && hasIntimate;

    return (
      <div className="flex flex-col gap-3.5 animate-fadeIn">

        {/* Header with partner name + relationship type */}
        {selectedSubTypeId && !showActions && (
          <div className="text-center pb-1">
            <span className="text-[13px] text-muted font-medium">
              {partnerPrenom && <><strong className="text-ink">{partnerPrenom}</strong> · </>}
              <strong className="text-ink">{getRelationshipLabel(selectedSubTypeId)}</strong>
            </span>
          </div>
        )}

        {/* Partial result banner */}
        {result.isPartialResult && (
          <div className="bg-gold-soft border border-gold/25 rounded-2xl px-5 py-3.5 flex items-start gap-2.5">
            <Zap size={18} className="text-gold flex-shrink-0" />
            <div>
              <p className="m-0 mb-0.5 text-[13px] font-bold text-ink">Analyse partielle</p>
              <p className="m-0 text-xs text-ink-soft leading-relaxed">
                {hasMental ? 'Le profil intime' : 'Le profil psychologique'} n'est pas encore disponible. Pour une compatibilité complète, ton/ta partenaire doit aussi compléter {hasMental ? 'les évaluations de vie intime' : 'les évaluations psychologiques'}.
              </p>
            </div>
          </div>
        )}

        {/* Global score card */}
        <div className="bg-card border border-line rounded-block shadow-soft px-6 py-8 text-center">
          <p className="m-0 mb-5 text-[13px] font-semibold text-muted uppercase tracking-wide">
            Score de compatibilité {isMerged ? 'global' : ''}
          </p>
          <div className="relative w-[140px] h-[140px] mx-auto mb-5">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              <circle cx="70" cy="70" r="58" fill="none" stroke={gs.soft} strokeWidth="10" />
              <circle
                cx="70" cy="70" r="58" fill="none"
                stroke={gs.hex} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 58}`}
                strokeDashoffset={`${2 * Math.PI * 58 * (1 - result.globalScore / 100)}`}
                className="transition-[stroke-dashoffset] duration-[1200ms] ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold leading-none" style={{ color: gs.hex }}>{result.globalScore}</span>
              <span className="text-xs font-semibold text-muted">/ 100</span>
            </div>
          </div>
          <p className="m-0 mb-5 text-base font-bold" style={{ color: gs.hex }}>{gs.label}</p>

          {/* Sub-scores (mental + intimate) */}
          {isMerged && (
            <div className="grid grid-cols-2 gap-3 max-w-[320px] mx-auto">
              <div className="bg-sage-soft border border-sage/20 rounded-2xl px-3 py-3.5 text-center">
                <Brain size={18} className="text-sage mx-auto mb-1" />
                <p className="m-0 mb-0.5 text-[11px] font-bold text-sage uppercase tracking-wide">Mental</p>
                <p className="m-0 text-[22px] font-extrabold" style={{ color: scoreStyle(result.mentalScore!).hex }}>{result.mentalScore}<span className="text-xs font-semibold text-muted">/100</span></p>
              </div>
              <div className="bg-accent-soft border border-accent/20 rounded-2xl px-3 py-3.5 text-center">
                <Flame size={18} className="text-accent mx-auto mb-1" />
                <p className="m-0 mb-0.5 text-[11px] font-bold text-accent uppercase tracking-wide">Intime</p>
                <p className="m-0 text-[22px] font-extrabold" style={{ color: scoreStyle(result.intimateScore!).hex }}>{result.intimateScore}<span className="text-xs font-semibold text-muted">/100</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Dimensions */}
        {Object.keys(result.dimensionScores).length > 0 && (
          <div className="bg-card border border-line rounded-block shadow-soft px-6 py-5">
            <p className="m-0 mb-5 text-[13px] font-bold text-ink flex items-center gap-1.5">
              <BarChart3 size={15} className="text-ink-soft" /> Compatibilité par dimension
            </p>

            {/* Mental dimensions */}
            {result.mentalDimensionScores && Object.keys(result.mentalDimensionScores).length > 0 && (
              <>
                {isMerged && (
                  <p className="m-0 mb-2.5 text-[11px] font-bold text-sage uppercase tracking-wide flex items-center gap-1.5">
                    <Brain size={12} /> Psychologique
                  </p>
                )}
                <div className={`flex flex-col gap-3 ${result.intimateDimensionScores && Object.keys(result.intimateDimensionScores).length > 0 ? 'mb-5' : ''}`}>
                  {Object.entries(result.mentalDimensionScores).map(([dim, score]) => {
                    const s = scoreStyle(score);
                    return (
                      <div key={dim}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-semibold text-ink-soft">{dim}</span>
                          <span className="text-[13px] font-extrabold" style={{ color: s.hex }}>{score}</span>
                        </div>
                        <div className="h-2 bg-paper rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${score}%`, backgroundColor: s.hex }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Intimate dimensions */}
            {result.intimateDimensionScores && Object.keys(result.intimateDimensionScores).length > 0 && (
              <>
                {isMerged && (
                  <p className="m-0 mb-2.5 text-[11px] font-bold text-accent uppercase tracking-wide flex items-center gap-1.5">
                    <Flame size={12} /> Vie intime
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  {Object.entries(result.intimateDimensionScores).map(([dim, score]) => {
                    const s = scoreStyle(score);
                    return (
                      <div key={dim}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-semibold text-ink-soft">{dim}</span>
                          <span className="text-[13px] font-extrabold" style={{ color: s.hex }}>{score}</span>
                        </div>
                        <div className="h-2 bg-paper rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${score}%`, backgroundColor: s.hex }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Fallback: show flat dimensionScores if no sub-breakdowns */}
            {!result.mentalDimensionScores && !result.intimateDimensionScores && (
              <div className="flex flex-col gap-3">
                {Object.entries(result.dimensionScores).map(([dim, score]) => {
                  const s = scoreStyle(score);
                  return (
                    <div key={dim}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-semibold text-ink-soft">{dim}</span>
                        <span className="text-[13px] font-extrabold" style={{ color: s.hex }}>{score}</span>
                      </div>
                      <div className="h-2 bg-paper rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${score}%`, backgroundColor: s.hex }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Points forts & tensions */}
        {(result.strengths.length > 0 || result.tensions.length > 0) && (
          <div className={`grid gap-3.5 ${result.strengths.length > 0 && result.tensions.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {result.strengths.length > 0 && (
              <div className="bg-sage-soft border border-sage/25 rounded-2xl px-5 py-5">
                <p className="m-0 mb-3 text-[13px] font-bold text-sage flex items-center gap-1.5">
                  <ThumbsUp size={15} /> Points forts
                </p>
                <ul className="m-0 p-0 list-none flex flex-col gap-2">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-ink-soft leading-relaxed">
                      <Check size={14} className="text-sage flex-shrink-0 mt-0.5" />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.tensions.length > 0 && (
              <div className="bg-gold-soft border border-gold/25 rounded-2xl px-5 py-5">
                <p className="m-0 mb-3 text-[13px] font-bold text-gold flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Zones à explorer
                </p>
                <ul className="m-0 p-0 list-none flex flex-col gap-2">
                  {result.tensions.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-ink-soft leading-relaxed">
                      <ChevronRight size={14} className="text-gold flex-shrink-0 mt-0.5" />{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Dr Lô narrative */}
        {result.claudeNarrative && (
          <div className="bg-card border border-line rounded-block shadow-soft px-6 py-5">
            <p className="m-0 mb-3 text-[13px] font-bold text-ink flex items-center gap-1.5">
              <Stethoscope size={15} className="text-ink-soft" /> Analyse du Dr Lô
            </p>
            <p className="m-0 text-sm text-ink-soft leading-[1.75] whitespace-pre-wrap">{result.claudeNarrative}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[680px] mx-auto px-5 pt-[52px] pb-20 relative z-[1]">

        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-accent-soft flex items-center justify-center">
            <Heart size={28} className="text-accent" />
          </div>
          <h1 className="font-display m-0 mb-3.5 text-[34px] font-semibold text-ink tracking-tight leading-[1.15]">
            Test de <span className="text-accent">compatibilité</span>
          </h1>
          <p className="m-0 mx-auto text-[15px] text-ink-soft leading-relaxed max-w-[460px]">
            Comparez vos profils psychologiques avec un proche — identifiez vos forces communes et les zones à explorer ensemble.
          </p>
        </div>

        {/* ── Mes codes ── */}
        <div className="bg-card border border-line rounded-block shadow-soft px-6 py-6 mb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-[34px] h-[34px] rounded-[10px] bg-ink flex items-center justify-center flex-shrink-0">
              <Key size={16} className="text-white" />
            </div>
            <h2 className="m-0 text-[15px] font-bold text-ink">Mes codes de compatibilité</h2>
          </div>

          {!isAuthenticated ? (
            <div className="flex items-center justify-between gap-4 bg-paper rounded-2xl px-4 py-3.5">
              <p className="m-0 text-sm text-ink-soft">Connecte-toi pour voir et partager tes codes.</p>
              <Link to="/patient/access" className="flex-shrink-0 bg-ink text-white text-[13px] font-bold px-5 py-2.5 rounded-pill no-underline whitespace-nowrap">
                Se connecter
              </Link>
            </div>
          ) : loadingProfile ? (
            <div className="flex items-center gap-2.5 text-muted text-sm">
              <Loader2 size={18} className="animate-spin" />
              Chargement…
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* Mental */}
              <div className="rounded-2xl bg-sage-soft border border-sage/20 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                    <Brain size={18} className="text-sage" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 mb-0.5 text-[11px] font-bold text-sage uppercase tracking-wide">Profil Psychologique</p>
                    {myIdMental
                      ? <code className="text-[15px] font-mono font-extrabold text-ink tracking-wide">{myIdMental}</code>
                      : <span className="text-xs text-muted">Complète 8 évaluations pour obtenir ce code</span>
                    }
                  </div>
                  {myIdMental && (
                    <button
                      onClick={() => copy(myIdMental, setCopiedMental)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${copiedMental ? 'border-sage/50 bg-card text-sage' : 'border-sage/30 bg-card text-sage'}`}
                    >
                      {copiedMental ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
                    </button>
                  )}
                </div>
                {myIdMental && (
                  <p className="m-0 px-4 pb-2.5 text-[10px] text-muted italic flex items-center gap-1">
                    <Lock size={10} /> Partage ce code uniquement avec la personne concernée
                  </p>
                )}
              </div>
              {/* Intime */}
              <div className="rounded-2xl bg-accent-soft border border-accent/20 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                    <Flame size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 mb-0.5 text-[11px] font-bold text-accent uppercase tracking-wide">Vie intime</p>
                    {myIdSexual
                      ? <code className="text-[15px] font-mono font-extrabold text-ink tracking-wide">{myIdSexual}</code>
                      : <span className="text-xs text-muted">Complète 5 évaluations pour obtenir ce code</span>
                    }
                  </div>
                  {myIdSexual && (
                    <button
                      onClick={() => copy(myIdSexual, setCopiedSexual)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${copiedSexual ? 'border-sage/50 bg-card text-sage' : 'border-accent/30 bg-card text-accent'}`}
                    >
                      {copiedSexual ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
                    </button>
                  )}
                </div>
                {myIdSexual && (
                  <p className="m-0 px-4 pb-2.5 text-[10px] text-muted italic flex items-center gap-1">
                    <Lock size={10} /> Partage ce code uniquement avec la personne concernée
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Bannière si aucun code ── */}
        {isAuthenticated && !loadingProfile && !myIdMental && !myIdSexual && (
          <div className="bg-gold-soft border border-gold/25 rounded-2xl px-5 py-4 mb-5 flex items-start gap-3">
            <Lock size={20} className="text-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="m-0 mb-1 text-sm font-bold text-ink">Test verrouillé — profil incomplet</p>
              <p className="m-0 mb-2.5 text-[13px] text-ink-soft leading-relaxed">
                Complète au moins 8 évaluations psychologiques <strong>(MNT)</strong> ou 5 évaluations de vie intime <strong>(SEX)</strong> pour débloquer le test.
              </p>
              <Link to="/assessment/profile" className="text-[13px] font-bold text-ink no-underline inline-flex items-center gap-1">
                Voir mon profil <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* ── Formulaire ── */}
        {!currentResult && (
          <div ref={formRef} className="bg-card border border-line rounded-block shadow-soft px-6 py-7 mb-5">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-ink flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <h2 className="m-0 text-[15px] font-bold text-ink">Découvrir notre compatibilité</h2>
            </div>

            {/* ── ÉTAPE 1 — Type de relation ── */}
            <div className={mainCategoryId ? 'mb-5' : 'mb-6'}>
              <label className="block text-[13px] font-semibold text-ink-soft mb-2.5">
                Avec qui fais-tu ce test ?
              </label>
              <div data-tooltip-id="relation-type-selector" className="grid grid-cols-2 gap-2.5">
                {RELATIONSHIP_CATEGORIES.map(cat => {
                  const isActive = mainCategoryId === cat.id;
                  const CatIcon = CATEGORY_ICONS[cat.id] ?? Users;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMainCategoryId(isActive ? null : cat.id)}
                      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left border-2 transition-colors ${
                        isActive ? 'border-ink bg-ink shadow-soft' : 'border-line bg-paper hover:border-ink/25'
                      }`}
                    >
                      <CatIcon size={22} className={isActive ? 'text-white flex-shrink-0' : 'text-ink-soft flex-shrink-0'} />
                      <span className={`text-[13px] font-bold leading-tight ${isActive ? 'text-white' : 'text-ink'}`}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Étape 2 — Sous-type ── */}
            {selectedCategory && (
              <div className="mb-6 animate-fadeIn">
                <div className="h-px bg-line mb-5" />

                <label className="block text-[13px] font-semibold text-ink-soft mb-3">
                  {selectedCategory.question}
                </label>

                {isFamilyCategory ? (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedCategory.subTypes.map(sub => {
                      const isActive = selectedSubTypeId === sub.id;
                      return (
                        <button key={sub.id} type="button" onClick={() => setSelectedSubTypeId(isActive ? null : sub.id)}
                          className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl text-center border-2 transition-colors ${
                            isActive ? 'border-ink bg-ink shadow-soft' : 'border-line bg-paper hover:border-ink/25'
                          }`}
                        >
                          <span className={`text-[11px] font-bold text-center leading-tight ${isActive ? 'text-white' : 'text-ink'}`}>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedCategory.subTypes.map(sub => {
                      const isActive = selectedSubTypeId === sub.id;
                      return (
                        <button key={sub.id} type="button" onClick={() => setSelectedSubTypeId(isActive ? null : sub.id)}
                          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left border-2 transition-colors ${
                            isActive ? 'border-ink bg-ink shadow-soft' : 'border-line bg-paper hover:border-ink/25'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className={`block text-[13px] font-bold leading-tight ${isActive ? 'text-white' : 'text-ink'}`}>{sub.label}</span>
                            {sub.description && (
                              <span className={`block text-xs mt-0.5 leading-snug ${isActive ? 'text-white/75' : 'text-muted'}`}>
                                {sub.description}
                              </span>
                            )}
                          </div>
                          {isActive && <Check size={18} className="text-white flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── ÉTAPE 3 — Champs de code ── */}
            {selectedSubTypeId && (
              <div className="mb-6 animate-fadeIn">
                <div className="h-px bg-line mb-5" />

                {/* Code mental */}
                <div className="mb-3.5">
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft mb-2">
                    <Brain size={14} className="text-sage" />
                    Code Mental de cette personne
                    {isRomantic
                      ? <span className="font-normal text-muted text-xs">optionnel</span>
                      : <span className="font-normal text-accent text-xs">*</span>
                    }
                  </label>
                  <div className="relative">
                    <input
                      data-tooltip-id="partner-code-input"
                      type="text"
                      value={partnerMentalId}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPartnerMentalId(val);
                        setFormError(null);
                        validateCode(val, 'mental');
                      }}
                      placeholder="HE-MNT-2026-XXXX"
                      maxLength={16}
                      className={`w-full px-4 py-3.5 rounded-2xl text-sm font-mono font-bold text-ink tracking-wide bg-paper outline-none border transition-colors focus:ring-2 ${
                        mentalValidation
                          ? (mentalValidation.valid ? 'border-sage focus:ring-sage/15' : 'border-accent focus:ring-accent/15')
                          : 'border-line focus:ring-ink/10'
                      }`}
                    />
                    {mentalValidating && (
                      <Loader2 size={16} className="animate-spin text-ink-soft absolute right-4 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {mentalValidation && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs animate-fadeIn">
                      {mentalValidation.valid ? (
                        <>
                          <CheckCircle2 size={14} className="text-sage" />
                          <span className="text-sage font-semibold">{mentalValidation.prenom}</span>
                          <span className="text-muted">trouvé(e)</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} className="text-accent" />
                          <span className="text-accent font-medium">{mentalValidation.error}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Code intime — uniquement pour relations amoureuses */}
                {isRomantic && (
                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft mb-2">
                      <Flame size={14} className="text-accent" /> Code Intime de cette personne
                      <span className="font-normal text-muted text-xs">optionnel</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={partnerSexualId}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setPartnerSexualId(val);
                          setFormError(null);
                          validateCode(val, 'sexual');
                        }}
                        placeholder="HE-SEX-2026-XXXX"
                        maxLength={16}
                        className={`w-full px-4 py-3.5 rounded-2xl text-sm font-mono font-bold text-ink tracking-wide bg-paper outline-none border transition-colors focus:ring-2 ${
                          sexualValidation
                            ? (sexualValidation.valid ? 'border-sage focus:ring-sage/15' : 'border-accent focus:ring-accent/15')
                            : 'border-line focus:ring-ink/10'
                        }`}
                      />
                      {sexualValidating && (
                        <Loader2 size={16} className="animate-spin text-ink-soft absolute right-4 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {sexualValidation && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs animate-fadeIn">
                        {sexualValidation.valid ? (
                          <>
                            <CheckCircle2 size={14} className="text-sage" />
                            <span className="text-sage font-semibold">{sexualValidation.prenom}</span>
                            <span className="text-muted">trouvé(e)</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} className="text-accent" />
                            <span className="text-accent font-medium">{sexualValidation.error}</span>
                          </>
                        )}
                      </div>
                    )}
                    <p className="mt-1.5 mb-0 text-[11px] text-muted flex items-center gap-1">
                      <Lock size={10} /> Ce code est partagé uniquement avec consentement mutuel
                    </p>
                  </div>
                )}

                {/* Merged info badge */}
                {isRomantic && mentalTrimmed && sexualTrimmed && mentalValidation?.valid && sexualValidation?.valid && (
                  <div className="mt-3 bg-paper border border-line rounded-xl px-3.5 py-2.5 flex items-center gap-2 animate-fadeIn">
                    <Sparkles size={16} className="text-ink-soft flex-shrink-0" />
                    <p className="m-0 text-xs text-ink-soft font-semibold leading-snug">
                      Analyse fusionnée — les deux profils (mental + intime) seront croisés dans une seule analyse complète
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Erreur */}
            {formError && (
              <div className="bg-accent-soft border border-accent/25 rounded-xl px-3.5 py-2.5 mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="text-accent flex-shrink-0 mt-0.5" />
                <p className="m-0 text-[13px] text-accent leading-relaxed">{formError}</p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleCalculate}
              disabled={calculating || !canSubmit}
              className={`w-full py-4 rounded-2xl border-none text-[15px] font-bold flex items-center justify-center gap-2 tracking-wide transition-colors ${
                !calculating && canSubmit
                  ? 'bg-ink text-white cursor-pointer shadow-soft hover:shadow-lift'
                  : 'bg-line text-muted cursor-not-allowed'
              }`}
            >
              {calculating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Calcul en cours…
                </>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Heart size={16} />
                  Découvrir notre compatibilité
                  <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-extrabold">
                    <img src="/kori.png" alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    {KORIS_COSTS.compatibility} · reste {balance - KORIS_COSTS.compatibility}
                  </span>
                </span>
              )}
            </button>
            {canSubmit && !calculating && (
              <p className="mt-2 mb-0 text-center text-[11px] text-muted flex items-center justify-center gap-1">
                <Lock size={11} /> Résultat instantané et confidentiel
              </p>
            )}
          </div>
        )}

        {/* ── Résultat fusionné ── */}
        {currentResult && (
          <>
            {renderMergedResult(currentResult, currentPartnerPrenom)}
            <button
              onClick={() => { setCurrentResult(null); setCurrentPartnerPrenom(''); setPartnerMentalId(''); setPartnerSexualId(''); setFormError(null); setSelectedSubTypeId(null); setMainCategoryId(null); }}
              className="w-full mt-4 py-3.5 rounded-2xl border border-line bg-card text-ink text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-paper transition-colors"
            >
              <RefreshCw size={15} /> Nouveau calcul
            </button>
          </>
        )}

        {/* ── Historique ── */}
        {isAuthenticated && history.length > 0 && (
          <div className="mt-8 bg-card border border-line rounded-block shadow-soft px-6 py-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-ink flex items-center justify-center flex-shrink-0">
                <ClockIcon size={16} className="text-white" />
              </div>
              <h2 className="m-0 text-[15px] font-bold text-ink">Historique des tests</h2>
            </div>

            {historyLoading ? (
              <div className="flex items-center gap-2.5 text-muted text-sm">
                <Loader2 size={18} className="animate-spin" />
                Chargement…
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {history.map((entry) => {
                  const hs = scoreStyle(entry.result.globalScore);
                  const isExpanded = expandedHistory === entry.id;
                  const isMergedEntry = entry.codeType === 'merged';
                  const hasMentalScore = entry.result.mentalScore !== undefined && entry.result.mentalScore !== null;
                  const hasIntimateScore = entry.result.intimateScore !== undefined && entry.result.intimateScore !== null;
                  const EntryIcon = isMergedEntry ? Users : entry.codeType === 'mental' ? Brain : Flame;

                  // Evolution
                  const samePartnerEntries = history.filter(h => h.partnerCode === entry.partnerCode && h.codeType === entry.codeType);
                  const prevEntry = samePartnerEntries.find((_, i) => {
                    const currentIdx = samePartnerEntries.indexOf(entry);
                    return i === currentIdx + 1;
                  });
                  const evolution = prevEntry ? entry.result.globalScore - prevEntry.result.globalScore : null;

                  return (
                    <div key={entry.id} className={`rounded-2xl border overflow-hidden transition-colors ${isExpanded ? 'border-ink/20 bg-paper' : 'border-line bg-card'}`}>
                      {/* Row summary */}
                      <button
                        onClick={() => setExpandedHistory(isExpanded ? null : entry.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 bg-transparent border-none cursor-pointer text-left"
                      >
                        <EntryIcon size={18} className="text-ink-soft flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="m-0 mb-0.5 text-[13px] font-bold text-ink leading-tight">
                            {entry.partnerPrenom && <span className="text-ink">{entry.partnerPrenom}</span>}
                            {entry.partnerPrenom ? ' · ' : ''}
                            {getRelationshipLabel(entry.relationshipType)}
                            <span className="ml-2 text-[11px] font-medium text-muted">
                              {isMergedEntry ? '· Fusionné' : entry.codeType === 'mental' ? '· Mental' : '· Intime'}
                            </span>
                          </p>
                          <p className="m-0 text-[11px] text-muted">
                            {entry.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <span className="text-[15px] font-extrabold" style={{ color: hs.hex }}>{entry.result.globalScore}</span>
                              <span className="text-[11px] text-muted font-semibold">/100</span>
                            </div>
                            {evolution !== null && evolution !== 0 && (
                              <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${evolution > 0 ? 'text-sage' : 'text-accent'}`}>
                                {evolution > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                {evolution > 0 ? `+${evolution}` : evolution}
                              </span>
                            )}
                          </div>
                          <ChevronDown size={14} className={`text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="px-3 pb-2.5 flex justify-between items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRecalculate(entry); }}
                          disabled={recalculatingId === entry.id}
                          className={`bg-paper border border-line rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft ${recalculatingId === entry.id ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                        >
                          {recalculatingId === entry.id ? (
                            <>
                              <Loader2 size={11} className="animate-spin" />
                              Calcul…
                            </>
                          ) : (
                            <>
                              <RefreshCw size={11} /> Recalculer
                            </>
                          )}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm('Supprimer ce test de compatibilité ?')) return;
                            setDeletingId(entry.id);
                            try {
                              await deleteCompatibilityHistory(entry.id);
                              setHistory(h => h.filter(x => x.id !== entry.id));
                              if (expandedHistory === entry.id) setExpandedHistory(null);
                            } catch {
                              // silently ignore
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          disabled={deletingId === entry.id}
                          className={`bg-transparent border border-accent/25 rounded-lg px-2.5 py-1 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold text-accent ${deletingId === entry.id ? 'opacity-50' : ''}`}
                        >
                          {deletingId === entry.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Trash2 size={11} />
                          )}
                          Supprimer
                        </button>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 animate-fadeIn">
                          <div className="h-px bg-line mb-3.5" />

                          {/* Sub-scores for merged */}
                          {isMergedEntry && hasMentalScore && hasIntimateScore && (
                            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                              <div className="bg-sage-soft rounded-xl px-3 py-2.5 text-center">
                                <Brain size={14} className="text-sage mx-auto mb-0.5" />
                                <p className="m-0 text-base font-extrabold" style={{ color: scoreStyle(entry.result.mentalScore!).hex }}>{entry.result.mentalScore}<span className="text-[10px] text-muted">/100</span></p>
                              </div>
                              <div className="bg-accent-soft rounded-xl px-3 py-2.5 text-center">
                                <Flame size={14} className="text-accent mx-auto mb-0.5" />
                                <p className="m-0 text-base font-extrabold" style={{ color: scoreStyle(entry.result.intimateScore!).hex }}>{entry.result.intimateScore}<span className="text-[10px] text-muted">/100</span></p>
                              </div>
                            </div>
                          )}

                          {/* Score bar */}
                          <div className="flex items-center gap-3 mb-3.5">
                            <div className="flex-1 h-2 bg-paper rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${entry.result.globalScore}%`, backgroundColor: hs.hex }} />
                            </div>
                            <span className="text-[13px] font-bold flex-shrink-0" style={{ color: hs.hex }}>{hs.label}</span>
                          </div>

                          {/* Dimensions */}
                          {Object.keys(entry.result.dimensionScores).length > 0 && (
                            <div className="flex flex-col gap-2.5 mb-3.5">
                              {Object.entries(entry.result.dimensionScores).map(([dim, score]) => {
                                const ds = scoreStyle(score);
                                return (
                                  <div key={dim}>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-ink-soft font-semibold">{dim}</span>
                                      <span className="text-xs font-extrabold" style={{ color: ds.hex }}>{score}</span>
                                    </div>
                                    <div className="h-1.5 bg-paper rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: ds.hex }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Points forts & tensions */}
                          {(entry.result.strengths.length > 0 || entry.result.tensions.length > 0) && (
                            <div className={`flex flex-col gap-1.5 ${entry.result.claudeNarrative ? 'mb-3.5' : ''}`}>
                              {entry.result.strengths.map((s, i) => (
                                <p key={i} className="m-0 text-xs text-ink-soft flex gap-1.5">
                                  <Check size={12} className="text-sage flex-shrink-0 mt-0.5" />{s}
                                </p>
                              ))}
                              {entry.result.tensions.map((t, i) => (
                                <p key={i} className="m-0 text-xs text-ink-soft flex gap-1.5">
                                  <ChevronRight size={12} className="text-gold flex-shrink-0 mt-0.5" />{t}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Narrative Dr Lô */}
                          {entry.result.claudeNarrative && (
                            <div className="bg-card border border-line rounded-2xl px-5 py-4">
                              <p className="m-0 mb-2.5 text-xs font-bold text-ink flex items-center gap-1.5">
                                <Stethoscope size={13} className="text-ink-soft" /> Analyse du Dr Lô
                              </p>
                              <p className="m-0 text-[13px] text-ink-soft leading-[1.75] whitespace-pre-wrap">{entry.result.claudeNarrative}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="m-0 mb-2 text-xs text-muted leading-relaxed">
            Les résultats sont basés sur tes dernières évaluations complétées.
          </p>
          <Link to="/assessment/profile" className="text-[13px] text-ink font-semibold no-underline inline-flex items-center gap-1">
            Voir mon profil <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Tooltips onboarding */}
      <PageTooltips pageKey="compatibility" />
    </div>
  );
};

export default CompatibilityPage;

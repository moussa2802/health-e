import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

function scoreStyle(score: number) {
  if (score >= 75) return { color: '#16A34A', bg: 'rgba(22,163,74,0.1)', bar: 'linear-gradient(90deg, #16A34A, #4ADE80)', label: 'Très bonne compatibilité ✨' };
  if (score >= 50) return { color: '#D97706', bg: 'rgba(217,119,6,0.1)', bar: 'linear-gradient(90deg, #D97706, #FBBF24)', label: 'Compatibilité modérée 🌱' };
  return { color: '#DC2626', bg: 'rgba(220,38,38,0.1)', bar: 'linear-gradient(90deg, #DC2626, #F87171)', label: 'Des zones à explorer ensemble 🔍' };
}

const CompatibilityPage: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const { spend, canAfford, refund } = useKoris();

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

    const spendResult = await spend('compatibility', `Recalcul compatibilité — ${entry.partnerPrenom || entry.partnerCode}`);
    if (!spendResult.allowed) return;

    setRecalculatingId(entry.id);
    try {
      let res: CompatibilityResult;

      if (entry.codeType === 'merged' && entry.mentalCode && entry.intimateCode) {
        // Merged recalculation
        try {
          res = await computeMergedCompatibility(currentUser.id, entry.relationshipType, entry.mentalCode, entry.intimateCode);
        } catch (computeErr) {
          await refund('compatibility');
          throw computeErr;
        }
        await saveCompatibilityHistory(currentUser.id, entry.relationshipType, entry.mentalCode, 'merged', res, entry.partnerPrenom, entry.mentalCode, entry.intimateCode).catch(() => {});
      } else {
        // Single code recalculation
        const req = await createCompatibilityRequest(currentUser.id, entry.partnerCode, entry.relationshipType);
        try {
          res = await computeCompatibility(req.id);
        } catch (computeErr) {
          await refund('compatibility');
          throw computeErr;
        }
        await saveCompatibilityHistory(currentUser.id, entry.relationshipType, entry.partnerCode, entry.codeType === 'merged' ? 'mental' : entry.codeType, res, entry.partnerPrenom).catch(() => {});
      }

      const updated = await getCompatibilityHistory(currentUser.id);
      setHistory(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors du recalcul.');
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
    if (mentalTrimmed === myIdMental || sexualTrimmed === myIdSexual) { setFormError("Tu ne peux pas te comparer à toi-même 😄"); return; }

    // Check Koris — ONE spend for the whole analysis (3 Koris)
    const spendResult = await spend('compatibility', `Compatibilité${isRomantic && mentalTrimmed && sexualTrimmed ? ' fusionnée' : ''} — ${mentalValidation?.prenom || sexualValidation?.prenom || 'partenaire'}`);
    if (!spendResult.allowed) return;

    setCalculating(true);
    try {
      let result: CompatibilityResult;
      const partnerPrenom = mentalValidation?.prenom || sexualValidation?.prenom;

      if (isRomantic && (mentalTrimmed || sexualTrimmed)) {
        // Romantic: use merged computation (handles 1 or 2 codes)
        try {
          result = await computeMergedCompatibility(
            currentUser.id,
            selectedSubTypeId,
            mentalTrimmed || null,
            sexualTrimmed || null,
          );
        } catch (computeErr) {
          await refund('compatibility');
          throw computeErr;
        }

        const codeType: 'merged' | 'mental' | 'sexual' = (mentalTrimmed && sexualTrimmed) ? 'merged' : (mentalTrimmed ? 'mental' : 'sexual');
        await saveCompatibilityHistory(
          currentUser.id, selectedSubTypeId,
          mentalTrimmed || sexualTrimmed,
          codeType, result, partnerPrenom,
          mentalTrimmed || undefined, sexualTrimmed || undefined,
        ).catch(() => {});
      } else {
        // Non-romantic: mental only
        const req = await createCompatibilityRequest(currentUser.id, mentalTrimmed, selectedSubTypeId);
        try {
          result = await computeCompatibility(req.id);
        } catch (computeErr) {
          await refund('compatibility');
          throw computeErr;
        }
        await saveCompatibilityHistory(currentUser.id, selectedSubTypeId, mentalTrimmed, 'mental', result, partnerPrenom).catch(() => {});
      }

      setCurrentResult(result);
      setCurrentPartnerPrenom(partnerPrenom || '');
      getCompatibilityHistory(currentUser.id).then(setHistory).catch(() => {});
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors du calcul. Réessaie.');
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'slideUp 0.35s ease' }}>

        {/* Header with partner name + relationship type */}
        {selectedSubTypeId && !showActions && (
          <div style={{ textAlign: 'center', padding: '0 0 4px' }}>
            <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>
              {partnerPrenom && <><span style={{ fontSize: 16 }}>💑</span> <strong style={{ color: '#7C3AED' }}>{partnerPrenom}</strong> · </>}
              <strong style={{ color: '#7C3AED' }}>{getRelationshipLabel(selectedSubTypeId)}</strong>
            </span>
          </div>
        )}

        {/* Partial result banner */}
        {result.isPartialResult && (
          <div style={{ background: 'rgba(255,251,235,0.95)', border: '1.5px solid rgba(234,179,8,0.25)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#92400E' }}>Analyse partielle</p>
              <p style={{ margin: 0, fontSize: 12, color: '#A16207', lineHeight: 1.5 }}>
                {hasMental ? 'Le profil intime' : 'Le profil psychologique'} n'est pas encore disponible. Pour une compatibilité complète, ton/ta partenaire doit aussi compléter {hasMental ? 'les évaluations de vie intime' : 'les évaluations psychologiques'}.
              </p>
            </div>
          </div>
        )}

        {/* Global score card */}
        <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(18px)', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 22, padding: '32px 24px', textAlign: 'center', boxShadow: '0 8px 40px rgba(124,58,237,0.08)' }}>
          <p style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Score de compatibilité {isMerged ? 'global' : ''}
          </p>
          <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 20px' }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="58" fill="none" stroke={`${gs.color}18`} strokeWidth="10" />
              <circle
                cx="70" cy="70" r="58" fill="none"
                stroke={gs.color} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 58}`}
                strokeDashoffset={`${2 * Math.PI * 58 * (1 - result.globalScore / 100)}`}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: gs.color, lineHeight: 1 }}>{result.globalScore}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>/ 100</span>
            </div>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: gs.color }}>{gs.label}</p>

          {/* Sub-scores (mental + intimate) */}
          {isMerged && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 320, margin: '0 auto' }}>
              <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)', border: '1.5px solid rgba(59,130,246,0.15)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
                <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>🧠</span>
                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mental</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: scoreStyle(result.mentalScore!).color }}>{result.mentalScore}<span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>/100</span></p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #FDF4FF, #FAE8FF)', border: '1.5px solid rgba(192,38,211,0.15)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
                <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>💜</span>
                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: '#C026D3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Intime</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: scoreStyle(result.intimateScore!).color }}>{result.intimateScore}<span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>/100</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Dimensions */}
        {Object.keys(result.dimensionScores).length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(18px)', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 22, padding: '22px 24px', boxShadow: '0 4px 24px rgba(124,58,237,0.06)' }}>
            <p style={{ margin: '0 0 18px', fontSize: 13, fontWeight: 700, color: '#0A2342', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📊</span> Compatibilité par dimension
            </p>

            {/* Mental dimensions */}
            {result.mentalDimensionScores && Object.keys(result.mentalDimensionScores).length > 0 && (
              <>
                {isMerged && <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🧠 Psychologique</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: result.intimateDimensionScores && Object.keys(result.intimateDimensionScores).length > 0 ? 18 : 0 }}>
                  {Object.entries(result.mentalDimensionScores).map(([dim, score]) => {
                    const s = scoreStyle(score);
                    return (
                      <div key={dim}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{dim}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{score}</span>
                        </div>
                        <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${score}%`, background: s.bar, borderRadius: 99, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
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
                {isMerged && <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#C026D3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💜 Vie intime</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(result.intimateDimensionScores).map(([dim, score]) => {
                    const s = scoreStyle(score);
                    return (
                      <div key={dim}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{dim}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{score}</span>
                        </div>
                        <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${score}%`, background: s.bar, borderRadius: 99, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Fallback: show flat dimensionScores if no sub-breakdowns */}
            {!result.mentalDimensionScores && !result.intimateDimensionScores && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(result.dimensionScores).map(([dim, score]) => {
                  const s = scoreStyle(score);
                  return (
                    <div key={dim}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{dim}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{score}</span>
                      </div>
                      <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${score}%`, background: s.bar, borderRadius: 99, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
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
          <div style={{ display: 'grid', gridTemplateColumns: result.strengths.length > 0 && result.tensions.length > 0 ? '1fr 1fr' : '1fr', gap: 14 }}>
            {result.strengths.length > 0 && (
              <div style={{ background: 'rgba(240,253,244,0.95)', border: '1.5px solid rgba(22,163,74,0.2)', borderRadius: 18, padding: '18px 20px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#15803D', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💚</span> Points forts
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.strengths.map((s, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0 }}>✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.tensions.length > 0 && (
              <div style={{ background: 'rgba(255,247,237,0.95)', border: '1.5px solid rgba(234,88,12,0.2)', borderRadius: 18, padding: '18px 20px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#C2410C', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔶</span> Zones à explorer
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.tensions.map((t, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#9A3412', lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0 }}>◆</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Dr Lô narrative */}
        {result.claudeNarrative && (
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(18px)', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 22, padding: '22px 24px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>👨‍⚕️</span> Analyse du Dr Lô
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.claudeNarrative}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #F5F0FF 0%, #FFF0F9 45%, #EFF6FF 100%)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes floatHeart { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-12px) rotate(5deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Blobs décoratifs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '5%', left: '-8%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '-8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)' }} />
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '52px 20px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 60, marginBottom: 18, display: 'inline-block', animation: 'floatHeart 3.5s ease-in-out infinite' }}>
            💞
          </div>
          <h1 style={{ margin: '0 0 14px', fontSize: 34, fontWeight: 900, color: '#0A2342', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
            Test de{' '}
            <span style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              compatibilité
            </span>
          </h1>
          <p style={{ margin: '0 auto', fontSize: 15, color: '#64748B', lineHeight: 1.7, maxWidth: 460 }}>
            Comparez vos profils psychologiques avec un proche — identifiez vos forces communes et les zones à explorer ensemble.
          </p>
        </div>

        {/* ── Mes codes ── */}
        <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 22, padding: '22px 24px', marginBottom: 18, boxShadow: '0 4px 28px rgba(124,58,237,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔑</div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0A2342' }}>Mes codes de compatibilité</h2>
          </div>

          {!isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: '#F8F5FF', borderRadius: 14, padding: '14px 16px' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>Connecte-toi pour voir et partager tes codes.</p>
              <Link to="/patient/access" style={{ flexShrink: 0, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 22, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Se connecter
              </Link>
            </div>
          ) : loadingProfile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94A3B8', fontSize: 14 }}>
              <div style={{ width: 18, height: 18, border: '2px solid #7C3AED', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Chargement…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Mental */}
              <div style={{ borderRadius: 14, background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)', border: '1.5px solid rgba(59,130,246,0.15)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🧠</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Profil Psychologique</p>
                    {myIdMental
                      ? <code style={{ fontSize: 15, fontFamily: "'JetBrains Mono','Courier New',monospace", fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.08em' }}>{myIdMental}</code>
                      : <span style={{ fontSize: 12, color: '#94A3B8' }}>Complète 8 évaluations pour obtenir ce code</span>
                    }
                  </div>
                  {myIdMental && (
                    <button onClick={() => copy(myIdMental, setCopiedMental)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 10, border: copiedMental ? '1.5px solid rgba(22,163,74,0.4)' : '1.5px solid rgba(59,130,246,0.25)', background: copiedMental ? '#F0FDF4' : '#fff', color: copiedMental ? '#16A34A' : '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {copiedMental ? '✅ Copié !' : '📋 Copier'}
                    </button>
                  )}
                </div>
                {myIdMental && (
                  <p style={{ margin: 0, padding: '0 16px 10px', fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>
                    🔒 Partage ce code uniquement avec la personne concernée
                  </p>
                )}
              </div>
              {/* Intime */}
              <div style={{ borderRadius: 14, background: 'linear-gradient(135deg, #FFF0F9, #FDF4FF)', border: '1.5px solid rgba(192,38,211,0.15)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>💋</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: '#C026D3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vie intime</p>
                    {myIdSexual
                      ? <code style={{ fontSize: 15, fontFamily: "'JetBrains Mono','Courier New',monospace", fontWeight: 800, color: '#7E22CE', letterSpacing: '0.08em' }}>{myIdSexual}</code>
                      : <span style={{ fontSize: 12, color: '#94A3B8' }}>Complète 5 évaluations pour obtenir ce code</span>
                    }
                  </div>
                  {myIdSexual && (
                    <button onClick={() => copy(myIdSexual, setCopiedSexual)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 10, border: copiedSexual ? '1.5px solid rgba(22,163,74,0.4)' : '1.5px solid rgba(192,38,211,0.25)', background: copiedSexual ? '#F0FDF4' : '#fff', color: copiedSexual ? '#16A34A' : '#C026D3', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {copiedSexual ? '✅ Copié !' : '📋 Copier'}
                    </button>
                  )}
                </div>
                {myIdSexual && (
                  <p style={{ margin: 0, padding: '0 16px 10px', fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>
                    🔒 Partage ce code uniquement avec la personne concernée
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Bannière si aucun code ── */}
        {isAuthenticated && !loadingProfile && !myIdMental && !myIdSexual && (
          <div style={{ background: 'rgba(255,251,235,0.95)', border: '1.5px solid rgba(234,179,8,0.25)', borderRadius: 16, padding: '16px 20px', marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#92400E' }}>Test verrouillé — profil incomplet</p>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#A16207', lineHeight: 1.5 }}>
                Complète au moins 8 évaluations psychologiques <strong>(MNT)</strong> ou 5 évaluations de vie intime <strong>(SEX)</strong> pour débloquer le test.
              </p>
              <Link to="/assessment/profile" style={{ fontSize: 13, fontWeight: 700, color: '#92400E', textDecoration: 'none' }}>
                Voir mon profil →
              </Link>
            </div>
          </div>
        )}

        {/* ── Formulaire ── */}
        {!currentResult && (
          <div ref={formRef} style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 22, padding: '26px 24px', marginBottom: 18, boxShadow: '0 4px 28px rgba(124,58,237,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✨</div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0A2342' }}>Découvrir notre compatibilité</h2>
            </div>

            {/* ── ÉTAPE 1 — Type de relation ── */}
            <div style={{ marginBottom: mainCategoryId ? 20 : 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                Avec qui fais-tu ce test ?
              </label>
              <div data-tooltip-id="relation-type-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {RELATIONSHIP_CATEGORIES.map(cat => {
                  const isActive = mainCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMainCategoryId(isActive ? null : cat.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', borderRadius: 14, textAlign: 'left',
                        border: isActive ? '2px solid transparent' : '2px solid rgba(124,58,237,0.1)',
                        background: isActive ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : 'rgba(248,245,255,0.8)',
                        cursor: 'pointer', transition: 'all 0.18s ease',
                        boxShadow: isActive ? '0 4px 16px rgba(124,58,237,0.28)' : 'none',
                        transform: isActive ? 'translateY(-1px)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{cat.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#fff' : '#4C1D95', lineHeight: 1.3 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Étape 2 — Sous-type ── */}
            {selectedCategory && (
              <div style={{ marginBottom: 22, animation: 'slideDown 0.2s ease' }}>
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.12), transparent)', marginBottom: 18 }} />

                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                  {selectedCategory.question}
                </label>

                {isFamilyCategory ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {selectedCategory.subTypes.map(sub => {
                      const isActive = selectedSubTypeId === sub.id;
                      return (
                        <button key={sub.id} type="button" onClick={() => setSelectedSubTypeId(isActive ? null : sub.id)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            padding: '12px 8px', borderRadius: 12,
                            border: isActive ? '2px solid transparent' : '2px solid rgba(124,58,237,0.1)',
                            background: isActive ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : 'rgba(248,245,255,0.8)',
                            cursor: 'pointer', transition: 'all 0.18s ease',
                            boxShadow: isActive ? '0 3px 12px rgba(124,58,237,0.28)' : 'none',
                            transform: isActive ? 'translateY(-1px)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 22 }}>{sub.emoji}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#fff' : '#6D28D9', textAlign: 'center', lineHeight: 1.3 }}>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedCategory.subTypes.map(sub => {
                      const isActive = selectedSubTypeId === sub.id;
                      return (
                        <button key={sub.id} type="button" onClick={() => setSelectedSubTypeId(isActive ? null : sub.id)}
                          style={{
                            display: 'flex', alignItems: sub.description ? 'flex-start' : 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 13, textAlign: 'left',
                            border: isActive ? '2px solid transparent' : '2px solid rgba(124,58,237,0.1)',
                            background: isActive ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : 'rgba(248,245,255,0.8)',
                            cursor: 'pointer', transition: 'all 0.18s ease',
                            boxShadow: isActive ? '0 4px 14px rgba(124,58,237,0.28)' : 'none',
                            transform: isActive ? 'translateY(-1px)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 20, flexShrink: 0, marginTop: sub.description ? 1 : 0 }}>{sub.emoji}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: isActive ? '#fff' : '#4C1D95', lineHeight: 1.3 }}>{sub.label}</span>
                            {sub.description && (
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: isActive ? 'rgba(255,255,255,0.78)' : '#94A3B8', marginTop: 2, lineHeight: 1.4 }}>
                                {sub.description}
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.22)" />
                              <polyline points="8 12 11 15 16 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── ÉTAPE 3 — Champs de code ── */}
            {selectedSubTypeId && (
              <div style={{ marginBottom: 22, animation: 'slideDown 0.2s ease' }}>
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.12), transparent)', marginBottom: 18 }} />

                {/* Code mental */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    <span>🧠</span>
                    Code Mental de cette personne
                    {isRomantic
                      ? <span style={{ fontWeight: 400, color: '#94A3B8', fontSize: 12 }}>optionnel</span>
                      : <span style={{ fontWeight: 400, color: '#DC2626', fontSize: 12 }}>*</span>
                    }
                  </label>
                  <div style={{ position: 'relative' }}>
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
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '13px 16px',
                        border: `1.5px solid ${mentalValidation ? (mentalValidation.valid ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.4)') : 'rgba(59,130,246,0.25)'}`,
                        borderRadius: 13, fontSize: 14, fontFamily: "'JetBrains Mono','Courier New',monospace", fontWeight: 700, color: '#0A2342', letterSpacing: '0.06em', background: '#F8FAFF', outline: 'none', transition: 'border-color 0.15s'
                      }}
                      onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)'; }}
                      onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
                    />
                    {mentalValidating && (
                      <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: '2px solid #7C3AED', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    )}
                  </div>
                  {mentalValidation && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, animation: 'slideDown 0.2s ease' }}>
                      {mentalValidation.valid ? (
                        <>
                          <span style={{ color: '#16A34A', fontWeight: 600 }}>✅ {mentalValidation.prenom}</span>
                          <span style={{ color: '#94A3B8' }}>trouvé(e)</span>
                        </>
                      ) : (
                        <span style={{ color: '#DC2626', fontWeight: 500 }}>❌ {mentalValidation.error}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Code intime — uniquement pour relations amoureuses */}
                {isRomantic && (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      <span>💋</span> Code Intime de cette personne
                      <span style={{ fontWeight: 400, color: '#94A3B8', fontSize: 12 }}>optionnel</span>
                    </label>
                    <div style={{ position: 'relative' }}>
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
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '13px 16px',
                          border: `1.5px solid ${sexualValidation ? (sexualValidation.valid ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.4)') : 'rgba(192,38,211,0.2)'}`,
                          borderRadius: 13, fontSize: 14, fontFamily: "'JetBrains Mono','Courier New',monospace", fontWeight: 700, color: '#0A2342', letterSpacing: '0.06em', background: '#FDF4FF', outline: 'none', transition: 'border-color 0.15s'
                        }}
                        onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(192,38,211,0.07)'; }}
                        onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
                      />
                      {sexualValidating && (
                        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: '2px solid #C026D3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      )}
                    </div>
                    {sexualValidation && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, animation: 'slideDown 0.2s ease' }}>
                        {sexualValidation.valid ? (
                          <>
                            <span style={{ color: '#16A34A', fontWeight: 600 }}>✅ {sexualValidation.prenom}</span>
                            <span style={{ color: '#94A3B8' }}>trouvé(e)</span>
                          </>
                        ) : (
                          <span style={{ color: '#DC2626', fontWeight: 500 }}>❌ {sexualValidation.error}</span>
                        )}
                      </div>
                    )}
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94A3B8' }}>
                      🔒 Ce code est partagé uniquement avec consentement mutuel
                    </p>
                  </div>
                )}

                {/* Merged info badge */}
                {isRomantic && mentalTrimmed && sexualTrimmed && mentalValidation?.valid && sexualValidation?.valid && (
                  <div style={{ marginTop: 12, background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.06))', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, animation: 'slideDown 0.2s ease' }}>
                    <span style={{ fontSize: 16 }}>✨</span>
                    <p style={{ margin: 0, fontSize: 12, color: '#6D28D9', fontWeight: 600, lineHeight: 1.4 }}>
                      Analyse fusionnée — les deux profils (mental + intime) seront croisés dans une seule analyse complète
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Erreur */}
            {formError && (
              <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '11px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                <p style={{ margin: 0, fontSize: 13, color: '#DC2626', lineHeight: 1.5 }}>{formError}</p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleCalculate}
              disabled={calculating || !canSubmit}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700,
                background: !calculating && canSubmit ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : '#F1F5F9',
                color: !calculating && canSubmit ? '#fff' : '#94A3B8',
                cursor: !calculating && canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: !calculating && canSubmit ? '0 6px 24px rgba(124,58,237,0.35)' : 'none',
                transition: 'all 0.18s ease', letterSpacing: '0.01em',
              }}
            >
              {calculating ? (
                <>
                  <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Calcul en cours…
                </>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  ❤️ Découvrir notre compatibilité
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10,
                    fontSize: 11, fontWeight: 800,
                  }}>
                    <img src="/kori.png" alt="" style={{ width: 13, height: 13, borderRadius: '50%', objectFit: 'cover' }} />
                    {KORIS_COSTS.compatibility}
                  </span>
                </span>
              )}
            </button>
            {canSubmit && !calculating && (
              <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>
                Résultat instantané et confidentiel 🔒
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
              style={{ width: '100%', marginTop: 16, padding: '14px 0', borderRadius: 14, border: '1.5px solid rgba(124,58,237,0.18)', background: 'rgba(255,255,255,0.8)', color: '#7C3AED', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
            >
              🔄 Nouveau calcul
            </button>
          </>
        )}

        {/* ── Historique ── */}
        {isAuthenticated && history.length > 0 && (
          <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1.5px solid rgba(124,58,237,0.12)', borderRadius: 22, padding: '22px 24px', boxShadow: '0 4px 28px rgba(124,58,237,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🕐</div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0A2342' }}>Historique des tests</h2>
            </div>

            {historyLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94A3B8', fontSize: 14 }}>
                <div style={{ width: 18, height: 18, border: '2px solid #7C3AED', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Chargement…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map((entry) => {
                  const hs = scoreStyle(entry.result.globalScore);
                  const isExpanded = expandedHistory === entry.id;
                  const isMergedEntry = entry.codeType === 'merged';
                  const hasMentalScore = entry.result.mentalScore !== undefined && entry.result.mentalScore !== null;
                  const hasIntimateScore = entry.result.intimateScore !== undefined && entry.result.intimateScore !== null;

                  // Evolution
                  const samePartnerEntries = history.filter(h => h.partnerCode === entry.partnerCode && h.codeType === entry.codeType);
                  const prevEntry = samePartnerEntries.find((_, i) => {
                    const currentIdx = samePartnerEntries.indexOf(entry);
                    return i === currentIdx + 1;
                  });
                  const evolution = prevEntry ? entry.result.globalScore - prevEntry.result.globalScore : null;

                  return (
                    <div key={entry.id} style={{ borderRadius: 16, border: `1.5px solid ${isExpanded ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.08)'}`, background: isExpanded ? 'rgba(248,245,255,0.8)' : '#fff', overflow: 'hidden', transition: 'all 0.2s' }}>
                      {/* Row summary */}
                      <button
                        onClick={() => setExpandedHistory(isExpanded ? null : entry.id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{isMergedEntry ? '💑' : entry.codeType === 'mental' ? '🧠' : '💋'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#0A2342', lineHeight: 1.3 }}>
                            {entry.partnerPrenom && <span style={{ color: '#7C3AED' }}>{entry.partnerPrenom}</span>}
                            {entry.partnerPrenom ? ' · ' : ''}
                            {getRelationshipLabel(entry.relationshipType)}
                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>
                              {isMergedEntry ? '· Fusionné' : entry.codeType === 'mental' ? '· Mental' : '· Intime'}
                            </span>
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>
                            {entry.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 15, fontWeight: 900, color: hs.color }}>{entry.result.globalScore}</span>
                              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>/100</span>
                            </div>
                            {evolution !== null && evolution !== 0 && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: evolution > 0 ? '#16A34A' : '#DC2626' }}>
                                {evolution > 0 ? `↑ +${evolution}` : `↓ ${evolution}`}
                              </span>
                            )}
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#94A3B8' }}>
                            <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div style={{ padding: '0 12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRecalculate(entry); }}
                          disabled={recalculatingId === entry.id}
                          style={{
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))',
                            border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8,
                            padding: '4px 10px', cursor: recalculatingId === entry.id ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 600, color: '#7C3AED',
                            opacity: recalculatingId === entry.id ? 0.7 : 1,
                          }}
                        >
                          {recalculatingId === entry.id ? (
                            <>
                              <div style={{ width: 10, height: 10, border: '1.5px solid #7C3AED', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                              Calcul…
                            </>
                          ) : (
                            <>🔄 Recalculer</>
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
                          style={{
                            background: 'transparent', border: '1px solid rgba(220,38,38,0.2)',
                            borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 600, color: '#DC2626',
                            opacity: deletingId === entry.id ? 0.5 : 1,
                          }}
                        >
                          {deletingId === entry.id ? (
                            <div style={{ width: 10, height: 10, border: '1.5px solid #DC2626', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          ) : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                          )}
                          Supprimer
                        </button>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={{ padding: '0 16px 16px', animation: 'slideDown 0.2s ease' }}>
                          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.12), transparent)', marginBottom: 14 }} />

                          {/* Sub-scores for merged */}
                          {isMergedEntry && hasMentalScore && hasIntimateScore && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                              <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{ fontSize: 14 }}>🧠</span>
                                <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: scoreStyle(entry.result.mentalScore!).color }}>{entry.result.mentalScore}<span style={{ fontSize: 10, color: '#94A3B8' }}>/100</span></p>
                              </div>
                              <div style={{ background: '#FDF4FF', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{ fontSize: 14 }}>💜</span>
                                <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: scoreStyle(entry.result.intimateScore!).color }}>{entry.result.intimateScore}<span style={{ fontSize: 10, color: '#94A3B8' }}>/100</span></p>
                              </div>
                            </div>
                          )}

                          {/* Score bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${entry.result.globalScore}%`, background: hs.bar, borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: hs.color, flexShrink: 0 }}>{hs.label}</span>
                          </div>

                          {/* Dimensions */}
                          {Object.keys(entry.result.dimensionScores).length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                              {Object.entries(entry.result.dimensionScores).map(([dim, score]) => {
                                const ds = scoreStyle(score);
                                return (
                                  <div key={dim}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{dim}</span>
                                      <span style={{ fontSize: 12, fontWeight: 800, color: ds.color }}>{score}</span>
                                    </div>
                                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${score}%`, background: ds.bar, borderRadius: 99 }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Points forts & tensions */}
                          {(entry.result.strengths.length > 0 || entry.result.tensions.length > 0) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: entry.result.claudeNarrative ? 14 : 0 }}>
                              {entry.result.strengths.map((s, i) => (
                                <p key={i} style={{ margin: 0, fontSize: 12, color: '#166534', display: 'flex', gap: 6 }}><span>✓</span>{s}</p>
                              ))}
                              {entry.result.tensions.map((t, i) => (
                                <p key={i} style={{ margin: 0, fontSize: 12, color: '#9A3412', display: 'flex', gap: 6 }}><span>◆</span>{t}</p>
                              ))}
                            </div>
                          )}

                          {/* Narrative Dr Lô */}
                          {entry.result.claudeNarrative && (
                            <div style={{ background: 'rgba(248,245,255,0.95)', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 16, padding: '16px 18px' }}>
                              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>👨‍⚕️</span> Analyse du Dr Lô
                              </p>
                              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{entry.result.claudeNarrative}</p>
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
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
            Les résultats sont basés sur tes dernières évaluations complétées.
          </p>
          <Link to="/assessment/profile" style={{ fontSize: 13, color: '#7C3AED', fontWeight: 600, textDecoration: 'none' }}>
            Voir mon profil →
          </Link>
        </div>
      </div>

      {/* Tooltips onboarding */}
      <PageTooltips pageKey="compatibility" />
    </div>
  );
};

export default CompatibilityPage;

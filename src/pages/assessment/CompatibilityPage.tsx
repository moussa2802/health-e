import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Users, Briefcase, UserCheck, Copy, Check,
  Loader2, AlertTriangle, ChevronRight, Sparkles, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrCreateUserProfile, getProfileProgress, isProfileCompleteById, TOTAL_SCALES } from '../../services/evaluationService';
import {
  createCompatibilityRequest,
  computeCompatibility,
} from '../../services/compatibilityService';
import type { CompatibilityResult, CompatibilityRequest } from '../../types/assessment';

type RelationshipType = CompatibilityRequest['relationshipType'];

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string; icon: React.ReactNode }[] = [
  { value: "couple",    label: "Couple",     icon: <Heart size={18} /> },
  { value: "family",   label: "Famille",    icon: <Users size={18} /> },
  { value: "friend",   label: "Amis",       icon: <UserCheck size={18} /> },
  { value: "colleague", label: "Collègues", icon: <Briefcase size={18} /> },
];

const scoreColor = (score: number) => {
  if (score >= 75) return { ring: "text-green-600", bg: "bg-green-100", bar: "bg-green-500"};
  if (score >= 50) return { ring: "text-yellow-600", bg: "bg-yellow-100", bar: "bg-yellow-500"};
  return { ring: "text-red-600", bg: "bg-red-100", bar: "bg-red-500"};
};

const CompatibilityPage: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();

  // Profile / ID
  const [myCompatibilityId, setMyCompatibilityId] = useState<string | null>(null);
  const [myIsComplete, setMyIsComplete] = useState(false);
  const [myRemaining, setMyRemaining] = useState(TOTAL_SCALES);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  // Form
  const [partnerIdInput, setPartnerIdInput] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('couple');
  const [formError, setFormError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Results
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setLoadingProfile(true);
      getOrCreateUserProfile(currentUser.id, currentUser.name)
        .then(() => getProfileProgress(currentUser.id))
        .then((progress) => {
          setMyCompatibilityId(progress.compatibilityId);
          setMyIsComplete(progress.isComplete);
          setMyRemaining(progress.remaining);
        })
        .catch(() => {})
        .finally(() => setLoadingProfile(false));
    }
  }, [isAuthenticated, currentUser]);

  const handleCopyId = async () => {
    if (!myCompatibilityId) return;
    try {
      await navigator.clipboard.writeText(myCompatibilityId);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    } catch { /* silencieux */ }
  };

  const handleCalculate = async () => {
    setFormError(null);
    const trimmedId = partnerIdInput.trim().toUpperCase();

    if (!trimmedId) {
      setFormError("Veuillez saisir l'identifiant de votre partenaire.");
      return;
    }
    if (!/^HE-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(trimmedId)) {
      setFormError("L'identifiant doit être au format HE-XXXX-XXXX (ex: HE-AB12-CD34).");
      return;
    }
    if (!isAuthenticated || !currentUser) {
      setFormError("Vous devez être connecté(e) pour calculer la compatibilité.");
      return;
    }
    if (trimmedId === myCompatibilityId) {
      setFormError("Vous ne pouvez pas calculer votre compatibilité avec vous-même.");
      return;
    }

    // Vérification : mon propre profil doit être complet
    if (!myIsComplete) {
      setFormError(`Ton profil n'est pas complet. Il te reste ${myRemaining} évaluation(s) à compléter avant de pouvoir utiliser le test de compatibilité.`);
      return;
    }

    // Vérification : le profil du partenaire doit aussi être complet
    setCalculating(true);
    try {
      const partnerComplete = await isProfileCompleteById(trimmedId);
      if (!partnerComplete) {
        setFormError("Le profil associé à cet identifiant n'est pas encore complet. Les deux profils doivent avoir complété toutes les évaluations.");
        setCalculating(false);
        return;
      }
    } catch {
      setFormError("Impossible de vérifier cet identifiant. Vérifiez qu'il est correct.");
      setCalculating(false);
      return;
    }

    try {
      const req = await createCompatibilityRequest(
        currentUser.id,
        trimmedId,
        relationshipType,
      );
      const res = await computeCompatibility(req.id);
      setResult(res);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors du calcul. Veuillez réessayer.');
    } finally {
      setCalculating(false);
    }
  };

  const globalColors = result ? scoreColor(result.globalScore) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* ── Hero ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Heart size={15} />
            <span>Test de compatibilité</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Découvrez votre{' '}
            <span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
              compatibilité
            </span>
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto text-sm sm:text-base">
            Comparez vos profils de bien-être avec un proche et identifiez vos points forts
            ainsi que les zones de dialogue à explorer ensemble.
          </p>
        </div>

        {/* ── Mon ID ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">Mon identifiant de compatibilité</h2>
          {!isAuthenticated ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">Connectez-vous pour voir et partager votre identifiant.</p>
              <Link
                to="/patient/access"
                className="flex-shrink-0 bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-sky-600 transition-colors"
              >
                Se connecter
              </Link>
            </div>
          ) : loadingProfile ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin text-sky-500" />
              Chargement...
            </div>
          ) : myCompatibilityId ? (
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-mono font-bold text-gray-900 tracking-widest text-sm">
                {myCompatibilityId}
              </code>
              <button
                onClick={handleCopyId}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  idCopied
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200'
                }`}
              >
                {idCopied ? <Check size={15} /> : <Copy size={15} />}
                {idCopied ? "Copié !": "Copier"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-red-500">Impossible de charger votre identifiant.</p>
          )}
        </div>

        {/* ── Bannière profil incomplet ── */}
        {isAuthenticated && !loadingProfile && !myIsComplete && (
          <div className="rounded-2xl border p-5 mb-6 flex items-start gap-4"
            style={{ background: "#FFFBEB", borderColor: "rgba(234,179,8,0.3)" }}>
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm mb-1">
                Profil incomplet — test de compatibilité verrouillé
              </p>
              <p className="text-amber-700 text-sm">
                Il te reste <strong>{myRemaining} évaluation{myRemaining > 1 ? "s" : ""}</strong> à compléter pour débloquer le test de compatibilité et obtenir ton numéro de référence.
              </p>
              <Link
                to="/assessment"
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors"
              >
                Compléter mes évaluations <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {!result && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Calculer ma compatibilité</h2>

            {/* Partner ID input */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Identifiant de votre partenaire
              </label>
              <input
                type="text"
                value={partnerIdInput}
                onChange={(e) => setPartnerIdInput(e.target.value.toUpperCase())}
                placeholder="HE-XXXX-XXXX"
                maxLength={12}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
              />
            </div>

            {/* Relationship type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de relation
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRelationshipType(opt.value)}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
                      relationshipType === opt.value
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-sky-200 hover:bg-sky-50'
                    }`}
                  >
                    <span className={relationshipType === opt.value ? 'text-sky-600': "text-gray-400"}>
                      {opt.icon}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}

            <button
              onClick={handleCalculate}
              disabled={calculating || !isAuthenticated}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                !calculating && isAuthenticated
                  ? 'bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {calculating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  Calculer la compatibilité
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {result && globalColors && (
          <div className="space-y-5">
            {/* Global score */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-4">Score de compatibilité global</p>
              <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full border-8 ${globalColors.bg} border-current ${globalColors.ring} mx-auto mb-2`}>
                <span className={`text-3xl font-extrabold ${globalColors.ring}`}>{result.globalScore}</span>
              </div>
              <p className={`text-sm font-semibold ${globalColors.ring}`}>
                {result.globalScore >= 75 ? 'Très bonne compatibilité' :
                 result.globalScore >= 50 ? "Compatibilité modérée": "Des points à explorer ensemble"}
              </p>
            </div>

            {/* Dimension scores */}
            {Object.keys(result.dimensionScores).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Compatibilité par dimension</h3>
                <div className="space-y-3">
                  {Object.entries(result.dimensionScores).map(([dim, score]) => {
                    const c = scoreColor(score);
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <p className="text-sm text-gray-700 w-36 flex-shrink-0">{dim}</p>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold w-10 text-right ${c.ring}`}>{score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strengths & Tensions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.strengths.length > 0 && (
                <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
                  <h3 className="text-sm font-bold text-green-800 mb-3">Points forts</h3>
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                        <Check size={15} className="flex-shrink-0 mt-0.5 text-green-600" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.tensions.length > 0 && (
                <div className="bg-orange-50 rounded-2xl border border-orange-200 p-5">
                  <h3 className="text-sm font-bold text-orange-800 mb-3">Zones de tension</h3>
                  <ul className="space-y-2">
                    {result.tensions.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-orange-700">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-orange-500" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Claude narrative */}
            {result.claudeNarrative ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-violet-500" />
                  <h3 className="text-sm font-bold text-gray-900">Analyse narrative</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.claudeNarrative}</p>
              </div>
            ) : null}

            {/* Reset */}
            <button
              onClick={() => { setResult(null); setPartnerIdInput(''); setFormError(null); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={15} />
              Nouveau calcul
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Le test de compatibilité est basé sur vos dernières évaluations complétées.
            Pour des résultats plus précis, complétez le plus grand nombre d'évaluations communes.
          </p>
          <Link
            to="/assessment/select"
            className="inline-flex items-center gap-1.5 mt-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            Faire une évaluation
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompatibilityPage;

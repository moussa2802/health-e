import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDefiFlag } from '../hooks/useDefiFlag';
import { getProfileProgress } from '../services/evaluationService';
import { authedFetch } from '../utils/authedFetch';
import { DEFI_SCALE_CONFIG } from '../config/defiConfig';
import type { ScaleResult } from '../types/assessment';

const OPTIN_SCALE_LABELS: Record<string, string> = {
  gad7: 'Anxiété',
  rses: 'Estime de soi',
  pss10: 'Stress perçu',
  social_pressure: 'Pression sociale',
  bonus_burnout: 'Burnout professionnel',
  bonus_dependance: 'Dépendance affective',
};

const DURATION_OPTIONS = [
  { value: 48, label: '48h' },
  { value: 72, label: '72h' },
  { value: 168, label: '7 jours' },
];

const DEVOILEMENT_OPTIONS = [
  { value: 'aucun', label: 'Aucun', desc: 'Tes proches ne voient jamais les vraies réponses' },
  { value: 'auto', label: 'Automatique', desc: 'Les réponses sont dévoilées à la fin du défi' },
];

const AUDIENCE_OPTIONS = [
  { value: 'famille', label: 'Famille', emoji: '👨‍👩‍👧' },
  { value: 'amis', label: 'Amis', emoji: '🫂' },
  { value: 'couple', label: 'Couple', emoji: '💕' },
  { value: 'collegues', label: 'Collègues', emoji: '💼' },
  { value: 'tous', label: 'Tout le monde', emoji: '🌍' },
];

const AUDIENCE_TITRE_DEFAULTS: Record<string, string> = {
  famille: 'Défi famille',
  amis: 'Défi entre amis',
  couple: 'Défi couple',
  collegues: 'Défi collègues',
  tous: 'Mon défi',
};

const MAX_REPLACEMENTS = 3;

interface PreviewQuestion {
  key: string;
  text: string;
  theme?: string | null;
}

const DefiCreerPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const { defiEnabled, loading: flagLoading } = useDefiFlag();

  const [scaleResults, setScaleResults] = useState<Record<string, ScaleResult>>({});
  const [totemRevealed, setTotemRevealed] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [tooManyDefis, setTooManyDefis] = useState(false);

  const [audience, setAudience] = useState('');
  const [titre, setTitre] = useState('');
  const [titreManual, setTitreManual] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [genre, setGenre] = useState<'masculin' | 'feminin' | null>(null);
  const [genreKnown, setGenreKnown] = useState(true);
  const [genreEditing, setGenreEditing] = useState(false);
  const [optinScales, setOptinScales] = useState<string[]>([]);
  const [duration, setDuration] = useState(72);
  const [devoilement, setDevoilement] = useState('aucun');
  const [petitsMots, setPetitsMots] = useState(true);

  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selected, setSelected] = useState<PreviewQuestion[]>([]);
  const [available, setAvailable] = useState<PreviewQuestion[]>([]);
  const [totemPreview, setTotemPreview] = useState<{ text: string } | null>(null);
  const [replacements, setReplacements] = useState(0);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const previewGenreRef = useRef<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setProfileLoading(false);
      return;
    }
    getProfileProgress(currentUser.id)
      .then(p => {
        setScaleResults(p.scaleResults);
        setTotemRevealed(!!p.totem?.revealedAt);
        const g = p.defiGenre || p.onboardingProfile?.genre;
        if (g === 'masculin' || g === 'feminin') {
          setGenre(g);
          setGenreKnown(true);
        } else {
          setGenreKnown(false);
        }
        if (p.activeDefis.length >= 3) {
          setTooManyDefis(true);
        }
        try {
          const saved = localStorage.getItem('he_defi_pseudo');
          if (saved) setDisplayName(saved);
        } catch {}
        setProfileLoading(false);
      })
      .catch(() => setProfileLoading(false));
  }, [isAuthenticated, currentUser?.id]);

  const handleGenreSelect = async (val: 'masculin' | 'feminin') => {
    setGenre(val);
    setGenreKnown(true);
    setGenreEditing(false);
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'userProfiles', currentUser.id), { defiGenre: val });
      } catch {}
    }
    if (step === 'preview' && previewGenreRef.current !== val) {
      setStep('form');
    }
  };

  if (authLoading || flagLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-gold animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/patient/access" replace />;
  if (!defiEnabled) return <Navigate to="/assessment" replace />;
  if (!totemRevealed) return <Navigate to="/defi" replace />;

  if (tooManyDefis) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
          <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center gap-3">
            <button onClick={() => navigate('/defi')} className="p-0 border-none bg-transparent cursor-pointer text-ink">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-[18px] font-semibold text-ink m-0">Créer mon défi</h1>
          </div>
        </div>
        <div className="max-w-[600px] mx-auto px-5 py-10 text-center">
          <p className="text-[15px] text-ink m-0 mb-4">
            Tu as déjà 3 défis en cours — c'est le maximum.
          </p>
          <p className="text-[13px] text-muted m-0 mb-6">
            Termine ou attends la fin d'un défi pour en créer un nouveau.
          </p>
          <button
            onClick={() => navigate('/defi')}
            className="px-6 py-3 rounded-[14px] border border-line bg-card text-ink text-[14px] font-medium cursor-pointer"
          >
            Voir mes défis
          </button>
        </div>
      </div>
    );
  }

  const availableOptins = Object.entries(DEFI_SCALE_CONFIG)
    .filter(([id, cfg]) => cfg.public === 'optin' && scaleResults[id])
    .map(([id]) => id);

  const toggleOptin = (scaleId: string) => {
    setOptinScales(prev =>
      prev.includes(scaleId) ? prev.filter(s => s !== scaleId) : [...prev, scaleId]
    );
  };

  const handleAudienceSelect = (val: string) => {
    setAudience(val);
    if (!titreManual) {
      setTitre(AUDIENCE_TITRE_DEFAULTS[val] || 'Mon défi');
    }
  };

  const titreClean = titre.trim().replace(/\s+/g, ' ');
  const titreValid = titreClean.length >= 3 && titreClean.length <= 30 &&
    !/<|>/.test(titreClean) && !/https?:\/\//i.test(titreClean) && !/\d{4,}/.test(titreClean);

  const nameClean = displayName.trim().replace(/\s+/g, ' ');
  const nameValid = nameClean.length >= 2 && nameClean.length <= 20 &&
    !/<|>/.test(nameClean) && !/https?:\/\//i.test(nameClean);

  const formValid = audience !== '' && titreValid && nameValid && genre !== null;

  const handlePreview = async () => {
    if (!formValid || previewLoading) return;
    setPreviewLoading(true);
    setError(null);

    try {
      const res = await authedFetch('/.netlify/functions/defi-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: nameClean,
          ...(genre ? { genre } : {}),
          optinScales,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'aperçu');
        setPreviewLoading(false);
        return;
      }

      setSelected(data.selected);
      setAvailable(data.available);
      setTotemPreview(data.totem);
      setReplacements(0);
      setReplacingIndex(null);
      previewGenreRef.current = genre;
      setStep('preview');
    } catch {
      setError('Erreur réseau — vérifie ta connexion');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleReplace = (questionIndex: number, newQuestion: PreviewQuestion) => {
    const old = selected[questionIndex];
    setSelected(prev => prev.map((q, i) => i === questionIndex ? newQuestion : q));
    setAvailable(prev => [...prev.filter(q => q.key !== newQuestion.key), old]);
    setReplacements(r => r + 1);
    setReplacingIndex(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const selectedKeys = selected.map(q => q.key);
      const res = await authedFetch('/.netlify/functions/defi-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: nameClean,
          optinScales,
          duration,
          devoilement,
          titre: titreClean,
          audience,
          petitsMots,
          selectedKeys,
          ...(genre ? { genre } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur inconnue');
        setSubmitting(false);
        return;
      }

      try { localStorage.setItem('he_defi_pseudo', nameClean); } catch {}
      navigate(`/defi/${data.slug}/partage`, { replace: true });
    } catch {
      setError('Erreur réseau — vérifie ta connexion');
      setSubmitting(false);
    }
  };

  if (step === 'preview') {
    return (
      <div className="min-h-screen bg-paper">
        <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
          <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center gap-3">
            <button onClick={() => { setStep('form'); setReplacingIndex(null); }} className="p-0 border-none bg-transparent cursor-pointer text-ink">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-[18px] font-semibold text-ink m-0">Aperçu des questions</h1>
          </div>
        </div>

        <div className="max-w-[600px] mx-auto px-5 py-6">
          <p className="text-[13px] text-muted m-0 mb-5">
            Voici les questions que tes proches devront deviner.
            {MAX_REPLACEMENTS - replacements > 0
              ? ` Tu peux encore remplacer ${MAX_REPLACEMENTS - replacements} question${MAX_REPLACEMENTS - replacements > 1 ? 's' : ''}.`
              : ' Tu as utilisé tous tes remplacements.'}
          </p>

          <div className="flex flex-col gap-3 mb-6">
            {selected.map((q, i) => (
              <div key={q.key} className="rounded-[14px] border border-line bg-card p-4">
                <p className="text-[14px] text-ink m-0 leading-snug">{q.text}</p>
                {q.theme && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-gold-soft text-[11px] font-medium text-gold">
                    {q.theme}
                  </span>
                )}
                {replacements < MAX_REPLACEMENTS && available.length > 0 && (
                  <button
                    onClick={() => setReplacingIndex(replacingIndex === i ? null : i)}
                    className="mt-2 text-[12px] text-gold font-medium flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
                  >
                    <RefreshCw size={12} />
                    Remplacer
                  </button>
                )}

                {replacingIndex === i && (
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted m-0">
                        Choisir une autre question
                      </p>
                      <button
                        onClick={() => setReplacingIndex(null)}
                        className="p-0 border-none bg-transparent cursor-pointer text-muted"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                      {available.map(aq => (
                        <button
                          key={aq.key}
                          onClick={() => handleReplace(i, aq)}
                          className="text-left px-3 py-2.5 rounded-[10px] border border-line bg-white text-[13px] text-ink cursor-pointer hover:border-gold transition-colors"
                        >
                          {aq.text}
                          {aq.theme && (
                            <span className="inline-block ml-1.5 px-1.5 py-0.5 rounded bg-gold-soft text-[10px] font-medium text-gold align-middle">
                              {aq.theme}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {totemPreview && (
              <div className="rounded-[14px] border border-gold/30 bg-gold-soft p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px]">🐾</span>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold m-0">Question totem</p>
                </div>
                <p className="text-[14px] text-ink m-0 leading-snug">{totemPreview.text}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-[14px] mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-3.5 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer shadow-soft flex items-center justify-center gap-2 transition-opacity ${
              submitting ? 'bg-muted opacity-60 cursor-not-allowed' : 'bg-gold'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Lancer le défi
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate('/defi')} className="p-0 border-none bg-transparent cursor-pointer text-ink">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-[18px] font-semibold text-ink m-0">Créer mon défi</h1>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-5 py-6 flex flex-col gap-7">
        {/* Audience */}
        <div>
          <label className="block text-[13px] font-semibold text-ink mb-2">Pour qui ?</label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleAudienceSelect(opt.value)}
                className={`px-3.5 py-2 rounded-[10px] border text-[13px] font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                  audience === opt.value
                    ? 'border-gold bg-gold text-white'
                    : 'border-line bg-white text-ink'
                }`}
              >
                <span>{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Titre */}
        <div>
          <label className="block text-[13px] font-semibold text-ink mb-2">Nom du défi</label>
          <input
            type="text"
            value={titre}
            onChange={e => { setTitre(e.target.value); setTitreManual(true); }}
            placeholder="Ex : Défi famille, Mon défi..."
            maxLength={30}
            className="w-full px-4 py-3 rounded-[12px] border border-line bg-white text-ink text-[15px] outline-none focus:border-gold transition-colors"
          />
          <p className="text-[12px] text-muted mt-1.5 m-0">
            {titreClean.length}/30 caractères
            {titreClean.length > 0 && !titreValid && ' — titre invalide'}
          </p>
        </div>

        {/* displayName */}
        <div>
          <label className="block text-[13px] font-semibold text-ink mb-2">Comment tes amis t'appellent ?</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Ex : Moussa, Awa..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-[12px] border border-line bg-white text-ink text-[15px] outline-none focus:border-gold transition-colors"
          />
          <p className="text-[12px] text-muted mt-1.5 m-0">
            {nameClean.length}/20 caractères
            {nameClean.length > 0 && !nameValid && ' — pseudo invalide'}
          </p>
        </div>

        {/* Genre */}
        <div>
          <label className="block text-[13px] font-semibold text-ink mb-2">
            Tu es un homme ou une femme ?
          </label>
          {genreKnown && genre && !genreEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-ink">
                👤 {genre === 'masculin' ? 'Homme' : 'Femme'}
              </span>
              <button
                onClick={() => setGenreEditing(true)}
                className="text-[13px] text-gold font-medium bg-transparent border-none cursor-pointer p-0"
              >
                · Modifier
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {([['masculin', 'Homme'], ['feminin', 'Femme']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => handleGenreSelect(val)}
                  className={`flex-1 py-2.5 rounded-[10px] border text-[14px] font-medium cursor-pointer transition-colors ${
                    genre === val
                      ? 'border-gold bg-gold text-white'
                      : 'border-line bg-white text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* optinScales */}
        {availableOptins.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-[13px] font-semibold text-ink">Tests sensibles (optionnels)</label>
              <div className="group relative">
                <Info size={14} className="text-muted cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-2 rounded-lg bg-ink text-white text-[12px] leading-snug w-[200px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Ces tests sont plus personnels. Tu choisis lesquels inclure dans ton défi.
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {availableOptins.map(id => (
                <button
                  key={id}
                  onClick={() => toggleOptin(id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border text-left cursor-pointer transition-colors ${
                    optinScales.includes(id)
                      ? 'border-gold bg-gold-soft'
                      : 'border-line bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    optinScales.includes(id) ? 'border-gold bg-gold' : 'border-line bg-white'
                  }`}>
                    {optinScales.includes(id) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </div>
                  <span className="text-[14px] text-ink">{OPTIN_SCALE_LABELS[id] || id}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Durée */}
        <div>
          <label className="block text-[13px] font-semibold text-ink mb-2">Durée du défi</label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={`flex-1 py-2.5 rounded-[10px] border text-[14px] font-medium cursor-pointer transition-colors ${
                  duration === opt.value
                    ? 'border-gold bg-gold text-white'
                    : 'border-line bg-white text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dévoilement */}
        <div>
          <label className="block text-[13px] font-semibold text-ink mb-2">Dévoilement des réponses</label>
          <div className="flex flex-col gap-2">
            {DEVOILEMENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDevoilement(opt.value)}
                className={`flex items-start gap-3 px-4 py-3 rounded-[12px] border text-left cursor-pointer transition-colors ${
                  devoilement === opt.value
                    ? 'border-gold bg-gold-soft'
                    : 'border-line bg-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  devoilement === opt.value ? 'border-gold' : 'border-line'
                }`}>
                  {devoilement === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-gold" />}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-ink m-0">{opt.label}</p>
                  <p className="text-[12px] text-muted m-0 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Petits mots */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[13px] font-semibold text-ink">Autoriser les petits mots 💌</label>
            <p className="text-[12px] text-muted m-0 mt-0.5">Tes proches pourront t'écrire un message</p>
          </div>
          <button
            onClick={() => setPetitsMots(!petitsMots)}
            className={`w-12 h-7 rounded-full border-none cursor-pointer transition-colors flex items-center px-0.5 ${
              petitsMots ? 'bg-gold' : 'bg-line'
            }`}
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
              petitsMots ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-[14px]">
            {error}
          </div>
        )}

        {/* Preview button */}
        <button
          onClick={handlePreview}
          disabled={!formValid || previewLoading}
          className={`w-full py-3.5 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer shadow-soft flex items-center justify-center gap-2 transition-opacity ${
            !formValid || previewLoading ? 'bg-muted opacity-60 cursor-not-allowed' : 'bg-gold'
          }`}
        >
          {previewLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Chargement...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Voir les questions
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DefiCreerPage;

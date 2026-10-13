import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDefiFlag } from '../hooks/useDefiFlag';
import { getProfileProgress } from '../services/evaluationService';
import { authedFetch } from '../utils/authedFetch';
import { DEFI_SCALE_CONFIG } from '../config/defiConfig';
import type { ScaleResult } from '../types/assessment';

const OPTIN_SCALE_LABELS: Record<string, string> = {
  gad7: 'Anxiété (GAD-7)',
  rses: 'Estime de soi (RSES)',
  pss10: 'Stress perçu (PSS-10)',
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

const DefiCreerPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { defiEnabled, loading: flagLoading } = useDefiFlag();

  const [scaleResults, setScaleResults] = useState<Record<string, ScaleResult>>({});
  const [totemRevealed, setTotemRevealed] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [genre, setGenre] = useState<'masculin' | 'feminin' | null>(null);
  const [genreKnown, setGenreKnown] = useState(true);
  const [optinScales, setOptinScales] = useState<string[]>([]);
  const [duration, setDuration] = useState(72);
  const [devoilement, setDevoilement] = useState('aucun');

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
        const g = p.onboardingProfile?.genre || p.defiGenre;
        if (g === 'masculin' || g === 'feminin') {
          setGenre(g);
          setGenreKnown(true);
        } else {
          setGenreKnown(false);
        }
        if (p.activeDefi && p.activeDefi.expiresAt > new Date()) {
          navigate(`/defi/${p.activeDefi.slug}/partage`, { replace: true });
          return;
        }
        setProfileLoading(false);
      })
      .catch(() => setProfileLoading(false));
  }, [isAuthenticated, currentUser?.id]);

  if (!isAuthenticated) return <Navigate to="/patient/access" replace />;

  if (flagLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-gold animate-spin" />
      </div>
    );
  }

  if (!defiEnabled) return <Navigate to="/assessment" replace />;
  if (!totemRevealed) return <Navigate to="/defi" replace />;

  const availableOptins = Object.entries(DEFI_SCALE_CONFIG)
    .filter(([id, cfg]) => cfg.public === 'optin' && scaleResults[id])
    .map(([id]) => id);

  const toggleOptin = (scaleId: string) => {
    setOptinScales(prev =>
      prev.includes(scaleId) ? prev.filter(s => s !== scaleId) : [...prev, scaleId]
    );
  };

  const nameClean = displayName.trim().replace(/\s+/g, ' ');
  const nameValid = nameClean.length >= 2 && nameClean.length <= 20 &&
    !/<|>/.test(nameClean) && !/https?:\/\//i.test(nameClean);
  const formValid = nameValid && (genreKnown || genre !== null);

  const handleSubmit = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await authedFetch('/.netlify/functions/defi-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: nameClean,
          optinScales,
          duration,
          devoilement,
          ...(!genreKnown && genre ? { genre } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur inconnue');
        setSubmitting(false);
        return;
      }

      navigate(`/defi/${data.slug}/partage`, { replace: true });
    } catch {
      setError('Erreur réseau — vérifie ta connexion');
      setSubmitting(false);
    }
  };

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
        {/* displayName */}
        <div>
          <label className="block text-[13px] font-semibold text-ink mb-2">Ton pseudo pour le défi</label>
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

        {/* Genre (si inconnu) */}
        {!genreKnown && (
          <div>
            <label className="block text-[13px] font-semibold text-ink mb-2">
              Tes amis vont parler de toi au…
            </label>
            <div className="flex gap-2">
              {([['masculin', 'Masculin'], ['feminin', 'Féminin']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setGenre(val)}
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
          </div>
        )}

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

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-[14px]">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!formValid || submitting}
          className={`w-full py-3.5 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer shadow-soft flex items-center justify-center gap-2 transition-opacity ${
            !formValid || submitting ? 'bg-muted opacity-60 cursor-not-allowed' : 'bg-gold'
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
              Lancer mon défi
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DefiCreerPage;

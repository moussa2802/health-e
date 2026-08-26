import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { ArrowLeft, BookOpen, Calendar, Sun, Tag, Save, Stethoscope, RefreshCw, Zap, Loader2, Smile, Meh, Frown, Annoyed, Angry, Heart } from 'lucide-react';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';
import { KORIS_CONFIG } from '../../utils/korisConfig';
import { authedFetch } from '../../utils/authedFetch';
import { isAiAvailable } from '../../utils/aiCircuitBreaker';

const HUMEURS = [
  { emoji: '😊', label: 'Heureux(se)', icon: Smile },
  { emoji: '😐', label: 'Neutre', icon: Meh },
  { emoji: '😔', label: 'Triste', icon: Frown },
  { emoji: '😰', label: 'Anxieux(se)', icon: Annoyed },
  { emoji: '😡', label: 'En colère', icon: Angry },
  { emoji: '🥰', label: 'Amoureux(se)', icon: Heart },
];

const THEMES = ['Relations', 'Travail', 'Famille', 'Santé', 'Émotions', 'Autre'];

interface Props {
  userId: string | null;
}

const NewEntry: React.FC<Props> = ({ userId }) => {
  const navigate = useNavigate();
  const { refreshBalance } = useKoris();
  const onboarding = getOnboardingProfile();
  const prenom = onboarding?.prenom ?? '';

  const [humeur, setHumeur] = useState('');
  const [contenu, setContenu] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [askingDrLo, setAskingDrLo] = useState(false);
  const [drLoResponse, setDrLoResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const toggleTheme = (t: string) => {
    setThemes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleSave = async () => {
    if (!userId) { setError('Connecte-toi pour sauvegarder ton journal.'); return; }
    if (!contenu.trim()) { setError('Écris quelque chose avant de sauvegarder.'); return; }

    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'users', userId, 'journal'), {
        date: now,
        humeur,
        contenu: contenu.trim(),
        themes,
        dr_lo_response: drLoResponse,
        dr_lo_requested_at: drLoResponse ? now : null,
        koris_consumed: drLoResponse ? 0 : 0,
        created_at: now,
        updated_at: now,
        is_private: true,
      });
      navigate('/journal');
    } catch {
      setError("Erreur lors de la sauvegarde. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const handleAskDrLo = async () => {
    if (!contenu.trim()) { setError("Écris quelque chose d'abord."); return; }

    setAskingDrLo(true);
    setError(null);
    try {
      // Construire le contexte profil
      let resumeProfil = '';
      if (userId) {
        try {
          const progress = await getProfileProgress(userId);
          const results = Object.entries(progress.scaleResults ?? {})
            .slice(0, 5)
            .map(([k, v]) => `${k}: ${(v as { interpretation?: { label?: string } }).interpretation?.label ?? '?'}`)
            .join(', ');
          resumeProfil = results;
        } catch { /* ignore */ }
      }

      const context = {
        prenom,
        age: onboarding?.age ?? '',
        genre: onboarding?.genre ?? '',
        situation: onboarding?.situation_relationnelle ?? '',
        resume_profil: resumeProfil,
      };

      const entry = {
        date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        humeur,
        themes,
        contenu,
      };

      const res = await authedFetch('/.netlify/functions/dr-lo-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry, context }),
      });

      const data = await res.json();
      setDrLoResponse(data.response ?? "Je n'ai pas pu répondre. Réessaie dans un instant.");
      await refreshBalance();
    } catch {
      setError("Erreur lors de la demande à Dr Lô.");
      await refreshBalance();
    } finally {
      setAskingDrLo(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-10">
      {/* Header */}
      <div className="bg-ink px-4 py-5 flex items-center gap-3 text-white">
        <button
          onClick={() => navigate('/journal')}
          className="inline-flex items-center gap-1.5 bg-white/15 text-white rounded-pill px-3 py-1.5 text-[13px] font-semibold hover:bg-white/25 transition-colors"
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <h1 className="font-display m-0 text-lg font-semibold flex items-center gap-2">
          <BookOpen size={18} /> Nouvelle entrée
        </h1>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">
        {/* Date */}
        <p className="m-0 mb-5 text-[13px] text-ink-soft font-medium flex items-center gap-1.5">
          <Calendar size={14} /> {today}
        </p>

        {/* Humeur */}
        <div className="mb-5">
          <p className="m-0 mb-2.5 text-sm font-semibold text-ink-soft flex items-center gap-1.5">
            <Sun size={15} /> Comment tu te sens ?
          </p>
          <div className="flex gap-2.5 flex-wrap">
            {HUMEURS.map(h => (
              <button
                key={h.emoji}
                onClick={() => setHumeur(h.emoji === humeur ? '' : h.emoji)}
                title={h.label}
                className={`w-11 h-11 rounded-xl border-0 flex items-center justify-center transition-all ${
                  humeur === h.emoji ? 'bg-accent-soft ring-2 ring-accent text-accent' : 'bg-card ring-1 ring-line text-ink-soft'
                }`}
              >
                <h.icon size={20} />
              </button>
            ))}
          </div>
        </div>

        {/* Zone de texte */}
        <div className="mb-5">
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            placeholder="Écris ce que tu ressens aujourd'hui…"
            rows={8}
            className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-accent/20 text-sm font-sans bg-card text-ink leading-relaxed resize-y outline-none box-border focus:border-accent/50 transition-colors"
          />
        </div>

        {/* Thèmes */}
        <div className="mb-6">
          <p className="m-0 mb-2.5 text-sm font-semibold text-ink-soft flex items-center gap-1.5">
            <Tag size={15} /> Thèmes (optionnel)
          </p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map(t => (
              <button
                key={t}
                onClick={() => toggleTheme(t)}
                className={`px-3.5 py-1.5 rounded-pill border-0 text-xs font-semibold transition-colors ${
                  themes.includes(t) ? 'bg-accent text-white' : 'bg-card text-ink-soft ring-1 ring-line'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-4 text-[13px] text-danger bg-danger/10 px-3.5 py-2.5 rounded-xl">
            {error}
          </p>
        )}

        {/* Bouton sauvegarder */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-2xl border-0 text-[15px] font-bold mb-4 flex items-center justify-center gap-2 transition-colors ${
            saving ? 'bg-line text-muted cursor-default' : 'bg-accent text-white cursor-pointer hover:bg-accent/90'
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>

        {/* Séparateur */}
        <div className="border-t border-line my-2 mb-5" />

        {/* Dr Lô */}
        <div className="bg-card rounded-block px-5 py-5 border border-sage/20">
          <div className="flex items-start gap-3 mb-3.5">
            <Stethoscope size={26} className="text-sage flex-shrink-0" />
            <div>
              <p className="m-0 mb-1 text-sm font-bold text-ink">
                Demander l'avis de Dr Lô
              </p>
              <p className="m-0 text-xs text-muted leading-snug">
                Il lira ton entrée et te donnera un retour personnalisé
              </p>
            </div>
          </div>

          {drLoResponse ? (
            <div className="bg-sage-soft rounded-xl px-4 py-3.5 mb-3.5">
              <p className="m-0 mb-1.5 text-[11px] font-bold text-sage">Dr Lô :</p>
              <p className="m-0 text-[13px] text-ink leading-relaxed whitespace-pre-line">
                {drLoResponse}
              </p>
            </div>
          ) : null}

          <button
            onClick={handleAskDrLo}
            disabled={askingDrLo || !contenu.trim() || !isAiAvailable()}
            className={`w-full py-3 rounded-xl border-0 text-[13px] font-bold mb-2 flex items-center justify-center gap-2 transition-colors ${
              askingDrLo || !contenu.trim() || !isAiAvailable() ? 'bg-line text-muted cursor-default' : 'bg-sage text-white cursor-pointer hover:bg-sage/90'
            }`}
          >
            {askingDrLo ? (
              <><Loader2 size={14} className="animate-spin" /> Dr Lô réfléchit…</>
            ) : drLoResponse ? (
              <><RefreshCw size={14} /> Redemander l'avis</>
            ) : (
              <><Stethoscope size={14} /> Demander l'avis de Dr Lô</>
            )}
          </button>

          <p className="m-0 text-[11px] text-muted text-center flex items-center justify-center gap-1">
            <Zap size={11} /> {KORIS_CONFIG.active ? `Utilise ${KORIS_CONFIG.costs.journal_dr_lo_response} Koris` : 'Utilisera des Koris (bientôt disponible)'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewEntry;

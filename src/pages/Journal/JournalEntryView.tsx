import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, BookOpen, Frown, Stethoscope, RefreshCw, Zap, Loader2, Calendar } from 'lucide-react';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_CONFIG } from '../../utils/korisConfig';
import type { JournalEntry } from './JournalPage';

interface Props {
  userId: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

const JournalEntryView: React.FC<Props> = ({ userId }) => {
  const { spend, refund } = useKoris();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const onboarding = getOnboardingProfile();
  const prenom = onboarding?.prenom ?? '';

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [askingDrLo, setAskingDrLo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !id) { setLoading(false); return; }
    getDoc(doc(db, 'users', userId, 'journal', id))
      .then(snap => {
        if (snap.exists()) setEntry({ id: snap.id, ...snap.data() } as JournalEntry);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId, id]);

  const handleAskDrLo = async () => {
    if (!entry || !userId) return;

    // Koris check
    const spendResult = await spend('journal', 'Avis Dr Lô (journal)');
    if (!spendResult.allowed) return;

    setAskingDrLo(true);
    setError(null);

    try {
      let resumeProfil = '';
      try {
        const progress = await getProfileProgress(userId);
        resumeProfil = Object.entries(progress.scaleResults ?? {})
          .slice(0, 5)
          .map(([k, v]) => `${k}: ${(v as { interpretation?: { label?: string } }).interpretation?.label ?? '?'}`)
          .join(', ');
      } catch { /* ignore */ }

      const context = {
        prenom,
        age: onboarding?.age ?? '',
        genre: onboarding?.genre ?? '',
        situation: onboarding?.situation_relationnelle ?? '',
        resume_profil: resumeProfil,
      };

      const res = await fetch('/.netlify/functions/dr-lo-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry: {
            date: formatDate(entry.date),
            humeur: entry.humeur,
            themes: entry.themes,
            contenu: entry.contenu,
          },
          context,
        }),
      });

      const data = await res.json();
      const response = data.response ?? "Je n'ai pas pu répondre. Réessaie dans un instant.";
      const now = new Date().toISOString();

      await updateDoc(doc(db, 'users', userId, 'journal', entry.id), {
        dr_lo_response: response,
        dr_lo_requested_at: now,
        koris_consumed: 0,
        updated_at: now,
      });

      setEntry(prev => prev ? { ...prev, dr_lo_response: response, dr_lo_requested_at: now } : prev);
    } catch {
      setError("Erreur lors de la demande à Dr Lô.");
      await refund('journal');
    } finally {
      setAskingDrLo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted bg-paper">
        Chargement…
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-paper">
        <Frown size={32} className="text-muted" />
        <p className="text-[15px] text-ink-soft">Entrée introuvable</p>
        <button
          onClick={() => navigate('/journal')}
          className="px-5 py-2.5 rounded-xl border-0 bg-accent text-white font-semibold flex items-center gap-1.5 hover:bg-accent/90 transition-colors"
        >
          <ArrowLeft size={15} /> Retour au journal
        </button>
      </div>
    );
  }

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
          <BookOpen size={18} /> Mon entrée
        </h1>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">
        {/* Date + humeur */}
        <div className="flex items-center gap-2.5 mb-4">
          {entry.humeur ? (
            <span className="text-[28px] leading-none">{entry.humeur}</span>
          ) : (
            <Calendar size={24} className="text-muted" />
          )}
          <p className="m-0 text-sm text-ink-soft font-medium">
            {formatDate(entry.date)}
          </p>
        </div>

        {/* Thèmes */}
        {entry.themes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {entry.themes.map(t => (
              <span key={t} className="text-[11px] text-sage bg-sage-soft rounded-pill px-2.5 py-1 font-semibold">{t}</span>
            ))}
          </div>
        )}

        {/* Contenu */}
        <div className="bg-card rounded-block px-5 py-5 border border-line mb-5">
          <p className="m-0 text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">
            {entry.contenu}
          </p>
        </div>

        {/* Réponse Dr Lô existante */}
        {entry.dr_lo_response && (
          <div className="bg-sage-soft rounded-block px-5 py-5 border border-sage/20 mb-5">
            <p className="m-0 mb-2.5 text-xs font-bold text-sage uppercase tracking-wide flex items-center gap-1.5">
              <Stethoscope size={13} /> Dr Lô a dit :
            </p>
            <p className="m-0 text-[13px] text-ink leading-relaxed whitespace-pre-line">
              {entry.dr_lo_response}
            </p>
            {entry.dr_lo_requested_at && (
              <p className="mt-2.5 mb-0 text-[11px] text-muted">
                {formatDate(entry.dr_lo_requested_at)}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mb-4 text-[13px] text-danger bg-danger/10 px-3.5 py-2.5 rounded-xl">
            {error}
          </p>
        )}

        {/* Bouton Dr Lô */}
        <div className="bg-card rounded-block px-4.5 py-4.5 border border-line">
          <button
            onClick={handleAskDrLo}
            disabled={askingDrLo}
            className={`w-full py-3 rounded-xl border-0 text-[13px] font-bold mb-2 flex items-center justify-center gap-2 transition-colors ${
              askingDrLo ? 'bg-line text-muted cursor-default' : 'bg-sage text-white cursor-pointer hover:bg-sage/90'
            }`}
          >
            {askingDrLo ? (
              <><Loader2 size={14} className="animate-spin" /> Dr Lô réfléchit…</>
            ) : entry.dr_lo_response ? (
              <><RefreshCw size={14} /> Redemander l'avis de Dr Lô</>
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

export default JournalEntryView;

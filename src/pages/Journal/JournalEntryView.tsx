import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
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
    } finally {
      setAskingDrLo(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontFamily: "'Inter',-apple-system,sans-serif" }}>
        Chargement…
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',-apple-system,sans-serif", gap: 12 }}>
        <p style={{ fontSize: 32 }}>😕</p>
        <p style={{ fontSize: 15, color: '#374151' }}>Entrée introuvable</p>
        <button onClick={() => navigate('/journal')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          ← Retour au journal
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#1E0442 0%,#3730A3 100%)',
        padding: '20px 16px',
        display: 'flex', alignItems: 'center', gap: 12, color: '#fff',
      }}>
        <button
          onClick={() => navigate('/journal')}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          ← Retour
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📔 Mon entrée</h1>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Date + humeur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{entry.humeur || '📅'}</span>
          <p style={{ margin: 0, fontSize: 14, color: '#64748B', fontWeight: 500 }}>
            {formatDate(entry.date)}
          </p>
        </div>

        {/* Thèmes */}
        {entry.themes?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {entry.themes.map(t => (
              <span key={t} style={{ fontSize: 11, color: '#7C3AED', background: '#F5F3FF', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        )}

        {/* Contenu */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid rgba(59,130,246,0.1)', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {entry.contenu}
          </p>
        </div>

        {/* Réponse Dr Lô existante */}
        {entry.dr_lo_response && (
          <div style={{ background: '#F0F9FF', borderRadius: 16, padding: '20px', border: '1px solid rgba(14,165,233,0.2)', marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🩺 Dr Lô a dit :
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#0A2342', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
              {entry.dr_lo_response}
            </p>
            {entry.dr_lo_requested_at && (
              <p style={{ margin: '10px 0 0', fontSize: 11, color: '#94A3B8' }}>
                {formatDate(entry.dr_lo_requested_at)}
              </p>
            )}
          </div>
        )}

        {error && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '10px 14px', borderRadius: 10 }}>
            {error}
          </p>
        )}

        {/* Bouton Dr Lô */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px', border: '1px solid rgba(99,102,241,0.15)' }}>
          <button
            onClick={handleAskDrLo}
            disabled={askingDrLo}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: askingDrLo ? '#E2E8F0' : 'linear-gradient(135deg,#8B5CF6,#6366F1)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: askingDrLo ? 'default' : 'pointer',
              marginBottom: 8,
            }}
          >
            {askingDrLo ? 'Dr Lô réfléchit…' : entry.dr_lo_response ? '🔄 Redemander l\'avis de Dr Lô' : '🩺 Demander l\'avis de Dr Lô'}
          </button>
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
            ⚡ {KORIS_CONFIG.active ? `Utilise ${KORIS_CONFIG.costs.journal_dr_lo_response} Koris` : 'Utilisera des Koris (bientôt disponible)'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default JournalEntryView;

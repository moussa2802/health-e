import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { KORIS_CONFIG } from '../../utils/korisConfig';

const HUMEURS = [
  { emoji: '😊', label: 'Heureux(se)' },
  { emoji: '😐', label: 'Neutre' },
  { emoji: '😔', label: 'Triste' },
  { emoji: '😰', label: 'Anxieux(se)' },
  { emoji: '😡', label: 'En colère' },
  { emoji: '🥰', label: 'Amoureux(se)' },
];

const THEMES = ['Relations', 'Travail', 'Famille', 'Santé', 'Émotions', 'Autre'];

interface Props {
  userId: string | null;
}

const NewEntry: React.FC<Props> = ({ userId }) => {
  const navigate = useNavigate();
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

      const res = await fetch('/.netlify/functions/dr-lo-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry, context }),
      });

      const data = await res.json();
      setDrLoResponse(data.response ?? "Je n'ai pas pu répondre. Réessaie dans un instant.");
    } catch {
      setError("Erreur lors de la demande à Dr Lô.");
    } finally {
      setAskingDrLo(false);
    }
  };

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
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📔 Nouvelle entrée</h1>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Date */}
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B', fontWeight: 500 }}>
          📅 {today}
        </p>

        {/* Humeur */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
            🌤️ Comment tu te sens ?
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {HUMEURS.map(h => (
              <button
                key={h.emoji}
                onClick={() => setHumeur(h.emoji === humeur ? '' : h.emoji)}
                title={h.label}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: 'none',
                  background: humeur === h.emoji ? 'rgba(99,102,241,0.15)' : '#fff',
                  outline: humeur === h.emoji ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  fontSize: 22, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {h.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Zone de texte */}
        <div style={{ marginBottom: 20 }}>
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            placeholder="Écris ce que tu ressens aujourd'hui…"
            rows={8}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              border: '1.5px solid rgba(99,102,241,0.2)',
              fontSize: 14, fontFamily: 'inherit', background: '#fff',
              color: '#0A2342', lineHeight: 1.65, resize: 'vertical',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>

        {/* Thèmes */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
            🏷️ Thèmes (optionnel)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {THEMES.map(t => (
              <button
                key={t}
                onClick={() => toggleTheme(t)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none',
                  background: themes.includes(t) ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#fff',
                  color: themes.includes(t) ? '#fff' : '#64748B',
                  outline: themes.includes(t) ? 'none' : '1px solid #E2E8F0',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '10px 14px', borderRadius: 10 }}>
            {error}
          </p>
        )}

        {/* Bouton sauvegarder */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: saving ? '#E2E8F0' : 'linear-gradient(135deg,#3B82F6,#6366F1)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            marginBottom: 16,
          }}
        >
          {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
        </button>

        {/* Séparateur */}
        <div style={{ borderTop: '1px solid #E2E8F0', margin: '8px 0 20px' }} />

        {/* Dr Lô */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 28 }}>🩺</span>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#0A2342' }}>
                Demander l'avis de Dr Lô
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                Il lira ton entrée et te donnera un retour personnalisé
              </p>
            </div>
          </div>

          {drLoResponse ? (
            <div style={{ background: '#F0F9FF', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#0369A1' }}>Dr Lô :</p>
              <p style={{ margin: 0, fontSize: 13, color: '#0A2342', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                {drLoResponse}
              </p>
            </div>
          ) : null}

          <button
            onClick={handleAskDrLo}
            disabled={askingDrLo || !contenu.trim()}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: askingDrLo || !contenu.trim()
                ? '#E2E8F0'
                : 'linear-gradient(135deg,#8B5CF6,#6366F1)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: askingDrLo || !contenu.trim() ? 'default' : 'pointer',
              marginBottom: 8,
            }}
          >
            {askingDrLo ? 'Dr Lô réfléchit…' : drLoResponse ? '🔄 Redemander l\'avis' : '🩺 Demander l\'avis de Dr Lô'}
          </button>

          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
            ⚡ {KORIS_CONFIG.active ? `Utilise ${KORIS_CONFIG.costs.journal_dr_lo_response} Koris` : 'Utilisera des Koris (bientôt disponible)'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewEntry;

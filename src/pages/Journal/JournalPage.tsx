import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';

export interface JournalEntry {
  id: string;
  date: string;
  humeur: string;
  contenu: string;
  themes: string[];
  dr_lo_response: string | null;
  dr_lo_requested_at: string | null;
  koris_consumed: number;
  created_at: string;
  updated_at: string;
  is_private: boolean;
}

const HUMEURS: Record<string, string> = {
  '😊': 'Heureux(se)',
  '😐': 'Neutre',
  '😔': 'Triste',
  '😰': 'Anxieux(se)',
  '😡': 'En colère',
  '🥰': 'Amoureux(se)',
};

function groupByPeriod(entries: JournalEntry[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);

  const groups: { label: string; entries: JournalEntry[] }[] = [
    { label: "Aujourd'hui", entries: [] },
    { label: 'Cette semaine', entries: [] },
    { label: 'Ce mois', entries: [] },
    { label: 'Plus ancien', entries: [] },
  ];

  for (const e of entries) {
    const d = new Date(e.date); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups[0].entries.push(e);
    else if (d >= weekAgo) groups[1].entries.push(e);
    else if (d >= monthAgo) groups[2].entries.push(e);
    else groups[3].entries.push(e);
  }

  return groups.filter(g => g.entries.length > 0);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function JournalStats({ entries }: { entries: JournalEntry[] }) {
  if (!entries.length) return null;

  const streak = (() => {
    const days = new Set(entries.map(e => e.date.split('T')[0]));
    let count = 0;
    const d = new Date();
    while (days.has(d.toISOString().split('T')[0])) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  const thisMonth = entries.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const moodCount: Record<string, number> = {};
  for (const e of thisMonth) {
    if (e.humeur) moodCount[e.humeur] = (moodCount[e.humeur] ?? 0) + 1;
  }
  const dominantMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const drLoResponses = entries.filter(e => e.dr_lo_response).length;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24,
    }}>
      {[
        { icon: '📝', label: `${entries.length} entrée${entries.length > 1 ? 's' : ''} écrite${entries.length > 1 ? 's' : ''}` },
        { icon: '🔥', label: streak > 0 ? `${streak} jour${streak > 1 ? 's' : ''} de suite` : 'Commence aujourd\'hui !' },
        dominantMood ? { icon: dominantMood, label: `Humeur dominante ce mois` } : null,
        { icon: '🩺', label: `${drLoResponses} réponse${drLoResponses > 1 ? 's' : ''} de Dr Lô` },
      ].filter(Boolean).map((stat, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 12, padding: '12px 14px',
          border: '1px solid rgba(59,130,246,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>{stat!.icon}</span>
          <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, lineHeight: 1.4 }}>{stat!.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  userId: string | null;
}

const JournalPage: React.FC<Props> = ({ userId }) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const onboarding = getOnboardingProfile();
  const prenom = onboarding?.prenom ?? '';

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', userId, 'journal'),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!userId || !window.confirm('Supprimer cette entrée définitivement ?')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'users', userId, 'journal', id));
    } finally {
      setDeletingId(null);
    }
  };

  const groups = groupByPeriod(entries);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#1E0442 0%,#3730A3 100%)',
        padding: '28px 20px 24px',
        color: '#fff',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Health-e
        </p>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800 }}>📔 Mon Journal</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          {prenom ? `Ton espace privé, ${prenom} 🤍` : 'Ton espace privé et confidentiel 🤍'}
        </p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Bouton nouvelle entrée */}
        <button
          onClick={() => navigate('/journal/new')}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg,#3B82F6,#6366F1)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          ✏️ Nouvelle entrée
        </button>

        {/* Stats */}
        {entries.length > 0 && <JournalStats entries={entries} />}

        {/* Liste */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 14 }}>
            Chargement…
          </div>
        ) : !userId ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.1)' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🔒</p>
            <p style={{ fontSize: 14, color: '#374151', fontWeight: 600, marginBottom: 8 }}>Connecte-toi pour accéder à ton journal</p>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Tes entrées sont sauvegardées de façon privée et sécurisée.</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 24px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.1)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📔</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2342', marginBottom: 8 }}>Ton journal est vide</p>
            <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
              C'est le moment d'écrire ta première entrée.<br />Dis ce que tu ressens — c'est ton espace.
            </p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {group.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.entries.map(entry => (
                  <div
                    key={entry.id}
                    style={{
                      background: '#fff', borderRadius: 14,
                      border: '1px solid rgba(59,130,246,0.1)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>{entry.humeur || '📅'}</span>
                      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                        {formatDate(entry.date)}
                      </span>
                      {entry.dr_lo_response && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3B82F6', fontWeight: 600, background: '#EFF6FF', borderRadius: 20, padding: '2px 8px' }}>
                          🩺 Dr Lô
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: '#374151', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {entry.contenu || '(entrée vide)'}
                    </p>
                    {entry.themes?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {entry.themes.map(t => (
                          <span key={t} style={{ fontSize: 11, color: '#7C3AED', background: '#F5F3FF', borderRadius: 20, padding: '2px 8px' }}>{t}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => navigate(`/journal/${entry.id}`)}
                        style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)', background: 'transparent', color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Lire
                      </button>
                      <button
                        onClick={() => navigate(`/journal/${entry.id}/edit`)}
                        style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.2)', background: 'transparent', color: '#7C3AED', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        🩺 Dr Lô
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#EF4444', fontSize: 14, cursor: 'pointer' }}
                      >
                        {deletingId === entry.id ? '…' : '🗑️'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JournalPage;

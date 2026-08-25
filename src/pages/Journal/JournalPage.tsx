import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc,
} from 'firebase/firestore';
import { BookOpen, Flame, FileText, Stethoscope, Lock, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';
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

  const stats: { icon: React.ReactNode; label: string }[] = [
    { icon: <FileText size={18} className="text-accent" />, label: `${entries.length} entrée${entries.length > 1 ? 's' : ''} écrite${entries.length > 1 ? 's' : ''}` },
    { icon: <Flame size={18} className="text-accent" />, label: streak > 0 ? `${streak} jour${streak > 1 ? 's' : ''} de suite` : 'Commence aujourd\'hui !' },
  ];
  if (dominantMood) stats.push({ icon: <span className="text-lg leading-none">{dominantMood}</span>, label: 'Humeur dominante ce mois' });
  stats.push({ icon: <Stethoscope size={18} className="text-accent" />, label: `${drLoResponses} réponse${drLoResponses > 1 ? 's' : ''} de Dr Lô` });

  return (
    <div className="grid grid-cols-2 gap-2.5 mb-6">
      {stats.map((stat, i) => (
        <div key={i} className="bg-card rounded-xl px-3.5 py-3 border border-line flex items-center gap-2">
          {stat.icon}
          <span className="text-xs text-ink-soft font-medium leading-snug">{stat.label}</span>
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
    <div className="min-h-screen bg-paper pb-20">
      {/* Header */}
      <div className="bg-ink px-5 pt-7 pb-6 text-white">
        <p className="m-0 mb-1 text-xs text-white/60 uppercase tracking-wide">
          Health-e
        </p>
        <h1 className="font-display m-0 mb-1 text-[26px] font-semibold flex items-center gap-2">
          <BookOpen size={22} /> Mon Journal
        </h1>
        <p className="m-0 text-[13px] text-white/70">
          {prenom ? `Ton espace privé, ${prenom}` : 'Ton espace privé et confidentiel'}
        </p>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">
        {/* Bouton nouvelle entrée */}
        <button
          onClick={() => navigate('/journal/new')}
          className="w-full py-3.5 rounded-2xl border-0 bg-accent text-white text-[15px] font-bold mb-5 flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors"
        >
          <Pencil size={16} /> Nouvelle entrée
        </button>

        {/* Stats */}
        {entries.length > 0 && <JournalStats entries={entries} />}

        {/* Liste */}
        {loading ? (
          <div className="text-center py-10 text-muted text-sm">
            Chargement…
          </div>
        ) : !userId ? (
          <div className="bg-card rounded-block px-6 py-6 text-center border border-line">
            <Lock size={30} className="mx-auto mb-3 text-muted" />
            <p className="text-sm text-ink-soft font-semibold mb-2">Connecte-toi pour accéder à ton journal</p>
            <p className="text-[13px] text-muted">Tes entrées sont sauvegardées de façon privée et sécurisée.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-card rounded-block px-6 py-8 text-center border border-line">
            <BookOpen size={40} className="mx-auto mb-3 text-muted" />
            <p className="text-[15px] font-bold text-ink mb-2">Ton journal est vide</p>
            <p className="text-[13px] text-muted leading-relaxed">
              C'est le moment d'écrire ta première entrée.<br />Dis ce que tu ressens — c'est ton espace.
            </p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} className="mb-6">
              <p className="m-0 mb-2.5 text-xs font-bold text-muted uppercase tracking-wide">
                {group.label}
              </p>
              <div className="flex flex-col gap-2.5">
                {group.entries.map(entry => (
                  <div
                    key={entry.id}
                    className="bg-card rounded-card border border-line px-4 py-3.5"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {entry.humeur ? (
                        <span className="text-xl leading-none">{entry.humeur}</span>
                      ) : (
                        <Calendar size={18} className="text-muted" />
                      )}
                      <span className="text-xs text-ink-soft font-medium">
                        {formatDate(entry.date)}
                      </span>
                      {entry.dr_lo_response && (
                        <span className="ml-auto text-[10px] text-accent font-semibold bg-accent-soft rounded-pill px-2 py-0.5 flex items-center gap-1">
                          <Stethoscope size={10} /> Dr Lô
                        </span>
                      )}
                    </div>
                    <p className="m-0 mb-2.5 text-[13px] text-ink-soft leading-snug overflow-hidden line-clamp-2">
                      {entry.contenu || '(entrée vide)'}
                    </p>
                    {entry.themes?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {entry.themes.map(t => (
                          <span key={t} className="text-[11px] text-sage bg-sage-soft rounded-pill px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/journal/${entry.id}`)}
                        className="flex-1 py-2 rounded-lg border border-accent/20 bg-transparent text-accent text-xs font-semibold hover:bg-accent-soft/50 transition-colors"
                      >
                        Lire
                      </button>
                      <button
                        onClick={() => navigate(`/journal/${entry.id}/edit`)}
                        className="flex-1 py-2 rounded-lg border border-sage/25 bg-transparent text-sage text-xs font-semibold flex items-center justify-center gap-1 hover:bg-sage-soft/50 transition-colors"
                      >
                        <Stethoscope size={11} /> Dr Lô
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="w-9 h-9 rounded-lg border border-danger/20 bg-transparent text-danger flex items-center justify-center hover:bg-danger/5 transition-colors"
                      >
                        {deletingId === entry.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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

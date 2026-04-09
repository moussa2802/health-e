import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc,
  addDoc, updateDoc, getDocs, setDoc, limit,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { getCompatibilityHistory } from '../../services/compatibilityService';
import { getScaleById } from '../../data/scales';
import { KORIS_CONFIG } from '../../utils/korisConfig';
import { loadPendingPrompts, ignorePrompt, type PendingPrompt } from '../../utils/journalPrompts';
import PageTooltips from '../../components/Onboarding/PageTooltips';
import type { JournalEntry } from '../Journal/JournalPage';

// ── Constants ─────────────────────────────────────────────────────────────────

const HUMEURS = [
  { emoji: '😊', label: 'Heureux(se)' },
  { emoji: '😐', label: 'Neutre' },
  { emoji: '😔', label: 'Triste' },
  { emoji: '😰', label: 'Anxieux(se)' },
  { emoji: '😡', label: 'En colere' },
  { emoji: '🥰', label: 'Amoureux(se)' },
];

const THEMES = ['Relations', 'Travail', 'Famille', 'Sante', 'Emotions', 'Autre'];

const PLACEHOLDERS_MATIN = [
  "Ce matin je me sens...",
  "En me reveillant aujourd'hui...",
  "Ce que j'attends de cette journee...",
  "Mon etat d'esprit ce matin...",
];
const PLACEHOLDERS_APREM = [
  "Cet apres-midi, je remarque...",
  "Ce que je ressens en ce moment...",
  "Cette journee jusqu'ici m'a apporte...",
  "Ce qui occupe mon esprit...",
];
const PLACEHOLDERS_SOIR = [
  "En terminant cette journee, je retiens...",
  "Ce soir je me sens...",
  "Ce qui m'a marque aujourd'hui...",
  "Avant de dormir, je pense a...",
];

const ENCOURAGEMENTS = [
  "Belle entree ! Continuer a ecrire est l'une des meilleures choses que tu puisses faire pour toi. 🌱",
  "Tu t'es donne du temps, et c'est precieux. Reviens quand tu veux. 🤍",
  "Ecrire, c'est deja agir. Bien joue ! ✨",
  "Ton journal grandit avec toi. Continue comme ca ! 📔",
  "Chaque mot compte. Tu fais du beau travail. 💙",
];

const DR_LO_PHOTO = '/dr-lo.png';

const SUGGESTIONS_DR_LO = [
  "Comment je vais aujourd'hui ?",
  "J'ai besoin de conseils pour le stress",
  "Explique-moi mon profil psychologique",
  "Je veux parler de mes relations",
  "J'ai des doutes sur ma sante mentale",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  koris_consumed?: number;
}

interface SavedConversation {
  id: string;
  messages: ChatMessage[];
  updated_at: string;
}

type Tab = 'journal' | 'drlo';

interface Props {
  userId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTimePlaceholder(): string {
  const h = new Date().getHours();
  const list = h < 12 ? PLACEHOLDERS_MATIN : h < 18 ? PLACEHOLDERS_APREM : PLACEHOLDERS_SOIR;
  return list[Math.floor(Math.random() * list.length)];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

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

function calcStreak(entries: JournalEntry[]): number {
  const days = new Set(entries.map(e => e.date.split('T')[0]));
  let count = 0;
  const d = new Date();
  while (days.has(d.toISOString().split('T')[0])) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// ── Context builder for Dr Lo ─────────────────────────────────────────────────

async function buildFullContext(userId: string | null) {
  const onboarding = getOnboardingProfile();

  if (!userId) {
    return {
      prenom: onboarding?.prenom ?? '',
      age: onboarding?.age ?? '',
      genre: onboarding?.genre ?? '',
      situation: onboarding?.situation_relationnelle ?? '',
      scores_mentaux: {},
      scores_intimes: {},
      tests_bonus: {},
      tests_compatibilite: [],
      journal_recent: [],
      conseils_generes: [],
      analyse_mentale: null,
      analyse_intime: null,
    };
  }

  // ── Tout charger en parallèle ──────────────────────────────────────────────
  const [progress, compatHist, journalSnap, conseilsSnap] = await Promise.allSettled([
    getProfileProgress(userId),
    getCompatibilityHistory(userId),
    getDocs(query(
      collection(db, 'users', userId, 'journal'),
      orderBy('created_at', 'desc'),
      limit(10)
    )),
    getDocs(collection(db, 'users', userId, 'conseils_cache')),
  ]);

  // ── Résultats des évaluations ──────────────────────────────────────────────
  const scaleResults = progress.status === 'fulfilled' ? (progress.value.scaleResults ?? {}) : {};
  const drLoMentalAnalysis = progress.status === 'fulfilled' ? progress.value.drLoMentalAnalysis : null;
  const drLoSexualAnalysis = progress.status === 'fulfilled' ? progress.value.drLoSexualAnalysis : null;

  type ScoreEntry = {
    scaleName: string;
    score: number | string;
    label: string;
    severity: string;
    description: string;
    subscaleScores?: Record<string, number>;
  };

  const scores_mentaux: Record<string, ScoreEntry> = {};
  const scores_intimes: Record<string, ScoreEntry> = {};
  const tests_bonus: Record<string, ScoreEntry> = {};

  for (const [id, v] of Object.entries(scaleResults)) {
    const val = v as { category?: string; totalScore?: number; interpretation?: { label?: string; severity?: string; description?: string }; subscaleScores?: Record<string, number> };
    const scale = getScaleById(id);
    const entry: ScoreEntry = {
      scaleName: scale?.name ?? id,
      score: val.totalScore ?? '?',
      label: val.interpretation?.label ?? '?',
      severity: val.interpretation?.severity ?? '?',
      description: val.interpretation?.description ?? '',
      subscaleScores: val.subscaleScores,
    };
    if (val.category === 'mental_health') scores_mentaux[id] = entry;
    else if (val.category === 'sexual_health') scores_intimes[id] = entry;
    else tests_bonus[id] = entry;
  }

  // ── Tests de compatibilité — version complète ──────────────────────────────
  type CompatEntry = {
    date: string;
    type_relation: string;
    code_partenaire: string;
    type_profil: string;
    score_global: number;
    points_forts: string[];
    zones_tension: string[];
    recommandations: string[];
    narrative: string;
  };

  const tests_compatibilite: CompatEntry[] = [];
  if (compatHist.status === 'fulfilled') {
    for (const h of compatHist.value.slice(0, 10)) {
      tests_compatibilite.push({
        date: h.createdAt instanceof Date ? h.createdAt.toLocaleDateString('fr-FR') : String(h.createdAt),
        type_relation: h.relationshipType,
        code_partenaire: h.partnerCode,
        type_profil: h.codeType === 'mental' ? 'Profil psychologique' : 'Vie intime',
        score_global: h.result?.globalScore ?? 0,
        points_forts: h.result?.strengths ?? [],
        zones_tension: h.result?.tensions ?? [],
        recommandations: h.result?.recommendations ?? [],
        narrative: (h.result?.claudeNarrative ?? '').substring(0, 400),
      });
    }
  }

  // ── Journal — 10 dernières entrées, 500 chars ──────────────────────────────
  type JournalEntry2 = { date: string; humeur: string; themes: string[]; contenu: string };
  const journal_recent: JournalEntry2[] = [];
  if (journalSnap.status === 'fulfilled') {
    for (const d of journalSnap.value.docs) {
      const data = d.data();
      journal_recent.push({
        date: data.date ?? '',
        humeur: data.humeur ?? '',
        themes: data.themes ?? [],
        contenu: (data.contenu as string ?? '').substring(0, 500),
      });
    }
  }

  // ── Conseils déjà générés ──────────────────────────────────────────────────
  type ConseilEntry = { scaleId: string; scaleName: string; signification: string; score: number };
  const conseils_generes: ConseilEntry[] = [];
  if (conseilsSnap.status === 'fulfilled') {
    for (const d of conseilsSnap.value.docs) {
      const data = d.data();
      conseils_generes.push({
        scaleId: d.id,
        scaleName: getScaleById(d.id)?.name ?? d.id,
        signification: data.signification ?? '',
        score: data.score ?? 0,
      });
    }
  }

  return {
    prenom: onboarding?.prenom ?? '',
    age: onboarding?.age ?? '',
    genre: onboarding?.genre ?? '',
    situation: onboarding?.situation_relationnelle ?? '',
    scores_mentaux,
    scores_intimes,
    tests_bonus,
    tests_compatibilite,
    journal_recent,
    conseils_generes,
    analyse_mentale: drLoMentalAnalysis,
    analyse_intime: drLoSexualAnalysis,
  };
}

async function loadConversations(userId: string): Promise<SavedConversation[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', userId, 'chat_dr_lo'),
        orderBy('updated_at', 'desc'),
        limit(20)
      )
    );
    return snap.docs.map(d => ({
      id: d.id,
      messages: (d.data().messages ?? []) as ChatMessage[],
      updated_at: d.data().updated_at ?? '',
    })).filter(c => c.messages.length > 1);
  } catch {
    return [];
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────

const MonEspacePage: React.FC<Props> = ({ userId }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('journal');
  const [drLoPreFill, setDrLoPreFill] = useState<string>('');

  // ── Journal state ──────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ id: string; contenu: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // New entry form
  const [humeur, setHumeur] = useState('');
  const [contenu, setContenu] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [placeholder] = useState(getTimePlaceholder);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = userId ? `journal_draft_${userId}` : 'journal_draft';
  const formRef = useRef<HTMLDivElement>(null);

  // ── Journal prompts state ──────────────────────────────────────────────────
  const [journalPrompts, setJournalPrompts] = useState<PendingPrompt[]>([]);
  const [activePromptHint, setActivePromptHint] = useState<{titre: string; question: string} | null>(null);

  // ── Dr Lo state ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyView, setHistoryView] = useState(false);
  const [selectedConv, setSelectedConv] = useState<SavedConversation | null>(null);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const conversationId = useRef<string>(`conv_${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const onboarding = getOnboardingProfile();
  const prenom = onboarding?.prenom ?? '';

  // ── Load journal entries ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoadingEntries(false); return; }
    const q = query(collection(db, 'users', userId, 'journal'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
      setLoadingEntries(false);
    }, () => setLoadingEntries(false));
    return unsub;
  }, [userId]);

  // ── Load pending journal prompts ──────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    loadPendingPrompts(userId).then(setJournalPrompts).catch(() => {});
  }, [userId]);

  // ── Restore draft ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.contenu) setContenu(parsed.contenu);
        if (parsed.humeur) setHumeur(parsed.humeur);
        if (parsed.themes) setThemes(parsed.themes);
      }
    } catch { /* ignore */ }
  }, [draftKey]);

  // ── Auto-save draft every 30s ──────────────────────────────────────────────
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    if (!contenu.trim()) return;
    autoSaveRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ contenu, humeur, themes }));
      } catch { /* ignore */ }
    }, 30000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [contenu, humeur, themes, draftKey]);

  // ── Dr Lo welcome message ──────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'drlo' && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Salut ${prenom || 'toi'} ! 😊 Je suis Dr Lo, ton medecin IA. Comment puis-je t'aider aujourd'hui ?`,
        timestamp: new Date().toISOString(),
      }]);
    }
    if (tab === 'drlo') {
      setTimeout(() => chatInputRef.current?.focus(), 120);
    }
  }, [tab]);

  // ── Handle pre-fill from journal ───────────────────────────────────────────
  useEffect(() => {
    if (drLoPreFill && tab === 'drlo') {
      setChatInput(drLoPreFill);
      setDrLoPreFill('');
      setTimeout(() => chatInputRef.current?.focus(), 150);
    }
  }, [tab, drLoPreFill]);

  // ── Scroll chat to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load Dr Lo history ─────────────────────────────────────────────────────
  useEffect(() => {
    if (historyView && userId && conversations.length === 0) {
      setLoadingHistory(true);
      loadConversations(userId)
        .then(setConversations)
        .finally(() => setLoadingHistory(false));
    }
  }, [historyView]);

  // ── Journal handlers ───────────────────────────────────────────────────────

  const handleAcceptPrompt = (prompt: PendingPrompt) => {
    setActivePromptHint({ titre: prompt.titre, question: prompt.questions_suggerees[0] });
    // Remove from list visually (still in Firestore until saved)
    setJournalPrompts(prev => prev.filter(p => p.id !== prompt.id));
    // Scroll to form
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handlePromptQuestion = (prompt: PendingPrompt, question: string) => {
    setActivePromptHint({ titre: prompt.titre, question });
    setJournalPrompts(prev => prev.filter(p => p.id !== prompt.id));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleIgnorePrompt = (prompt: PendingPrompt) => {
    setJournalPrompts(prev => prev.filter(p => p.id !== prompt.id));
    if (userId && prompt.id) ignorePrompt(userId, prompt.id).catch(() => {});
  };

  const toggleTheme = (t: string) => {
    setThemes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleSave = async () => {
    if (!userId) { setJournalError('Connecte-toi pour sauvegarder.'); return; }
    if (!contenu.trim()) { setJournalError('Ecris quelque chose avant de sauvegarder.'); return; }
    setSaving(true);
    setJournalError(null);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'users', userId, 'journal'), {
        date: now,
        humeur,
        contenu: contenu.trim(),
        themes,
        dr_lo_response: null,
        dr_lo_requested_at: null,
        koris_consumed: 0,
        created_at: now,
        updated_at: now,
        is_private: true,
      });
      localStorage.removeItem(draftKey);
      setContenu('');
      setHumeur('');
      setThemes([]);
      setActivePromptHint(null);
      const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
      setSavedMsg(msg);
      setTimeout(() => setSavedMsg(null), 5000);
    } catch {
      setJournalError("Erreur lors de la sauvegarde. Reessaie.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId || !window.confirm('Supprimer cette entree definititivement ?')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'users', userId, 'journal', id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleAskDrLoAboutEntry = async (entry: JournalEntry) => {
    const msg = `J'ai ecrit cette entree dans mon journal (${formatShort(entry.date)}) : "${entry.contenu.substring(0, 300)}${entry.contenu.length > 300 ? '...' : ''}". ${entry.humeur ? `Mon humeur etait ${entry.humeur}.` : ''} Qu'en penses-tu ?`;
    setDrLoPreFill(msg);
    setTab('drlo');
    // Marquer l'entree comme discutee avec Dr Lo
    if (userId && !entry.dr_lo_requested_at) {
      updateDoc(doc(db, 'users', userId, 'journal', entry.id), {
        dr_lo_requested_at: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !userId) return;
    if (!editingEntry.contenu.trim()) return;
    setEditSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId, 'journal', editingEntry.id), {
        contenu: editingEntry.contenu.trim(),
        updated_at: new Date().toISOString(),
      });
      setEditingEntry(null);
    } catch {
      // silencieux — l'entree reste en mode edition
    } finally {
      setEditSaving(false);
    }
  };

  // ── Dr Lo handlers ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text?: string) => {
    const msgText = (text ?? chatInput).trim();
    if (!msgText || chatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: msgText, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const context = await buildFullContext(userId);
      const historique = messages
        .filter((_, i) => i > 0)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/.netlify/functions/dr-lo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText, historique, context }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response ?? "Je n'ai pas pu repondre. Reessaie dans un instant.",
        timestamp: new Date().toISOString(),
        koris_consumed: data.koris_consumed ?? 0,
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      if (userId) {
        setDoc(
          doc(db, 'users', userId, 'chat_dr_lo', conversationId.current),
          {
            messages: finalMessages.map(m => ({
              role: m.role, content: m.content,
              timestamp: m.timestamp, koris_consumed: m.koris_consumed ?? 0,
            })),
            updated_at: new Date().toISOString(),
            created_at: conversationId.current.replace('conv_', ''),
          },
          { merge: true }
        ).catch(() => {});
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Une erreur s'est produite. Verifie ta connexion et reessaie.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, messages, userId]);

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Auto-resize du champ Dr Lo (jusqu'a 5 lignes)
  useEffect(() => {
    const el = chatInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineH = 21; // fontSize 14 * lineHeight 1.5
    const maxH = 5 * lineH + 16; // 5 lignes + padding
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
  }, [chatInput]);

  const startNewConversation = () => {
    conversationId.current = `conv_${Date.now()}`;
    setMessages([{
      role: 'assistant',
      content: `Salut ${prenom || 'toi'} ! 😊 Nouvelle conversation, je t'ecoute !`,
      timestamp: new Date().toISOString(),
    }]);
    setHistoryView(false);
    setSelectedConv(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation(); // empêche d'ouvrir la conv au clic
    if (!userId || deletingConvId) return;
    setDeletingConvId(convId);
    try {
      await deleteDoc(doc(db, 'users', userId, 'chat_dr_lo', convId));
      setConversations(prev => prev.filter(c => c.id !== convId));
      // Si la conv supprimée était la conv active, en démarrer une nouvelle
      if (conversationId.current === convId) startNewConversation();
    } catch {
      // silencieux
    } finally {
      setDeletingConvId(null);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const streak = calcStreak(entries);
  const drLoCount = entries.filter(e => e.dr_lo_response || e.dr_lo_requested_at).length;
  const wordCount = contenu.trim().split(/\s+/).filter(Boolean).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  const groups = groupByPeriod(entries);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFF',
      fontFamily: "'Inter',-apple-system,sans-serif",
      paddingBottom: 80,
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%,100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
        .me-tab-btn { transition: all 0.18s ease; }
        .me-tab-btn:hover { opacity: 0.85; }
        .me-entry-card { transition: box-shadow 0.15s ease; }
        .me-entry-card:hover { box-shadow: 0 4px 20px rgba(59,130,246,0.1); }
        .me-suggestion:hover { background: rgba(99,102,241,0.08) !important; }
        .chat-user-bubble { background: linear-gradient(135deg,#3B82F6,#6366F1); color:#fff; border-radius:16px 16px 4px 16px; }
        .chat-bot-bubble  { background:#F1F5F9; color:#0A2342; border-radius:16px 16px 16px 4px; }
        .chat-input-area:focus { outline:none; border-color:rgba(99,102,241,0.5) !important; }
        .conv-item:hover { background:#F0F4FF; cursor:pointer; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg,#065F46 0%,#1D4ED8 100%)',
        padding: '28px 20px 20px',
        color: '#fff',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, marginBottom: 12,
          }}
        >
          ← Retour
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🌿</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Mon Espace</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              {prenom ? `Ton espace prive, ${prenom}` : 'Ton espace prive et confidentiel'}
            </p>
          </div>
        </div>

        {/* Privacy notice */}
        <div style={{
          marginTop: 14,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
            Tout ce que tu ecris ici est strictement prive.
          </span>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 0,
        background: '#fff',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {(['journal', 'drlo'] as Tab[]).map(t => (
          <button
            key={t}
            data-tooltip-id={t === 'journal' ? 'tab-journal' : 'tab-dr-lo'}
            className="me-tab-btn"
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '14px 0',
              border: 'none', cursor: 'pointer',
              background: 'transparent',
              fontSize: 14, fontWeight: 700,
              color: tab === t ? '#6366F1' : '#94A3B8',
              borderBottom: tab === t ? '2.5px solid #6366F1' : '2.5px solid transparent',
            }}
          >
            {t === 'journal' ? '📔 Journal' : '🩺 Dr Lo'}
          </button>
        ))}
      </div>

      {/* ── Journal Tab ── */}
      {tab === 'journal' && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

          {/* ── Prompt cards de Dr Lo ── */}
          {journalPrompts.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                💡 Dr Lo te propose d'explorer...
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {journalPrompts.map(prompt => (
                  <div key={prompt.id} style={{
                    background: 'linear-gradient(135deg,rgba(99,102,241,0.04),rgba(139,92,246,0.04))',
                    borderRadius: 16, border: '1.5px solid rgba(99,102,241,0.2)',
                    padding: '16px 18px',
                    animation: 'slideUp 0.3s ease',
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: '#0A2342' }}>
                      {prompt.titre}
                    </p>
                    <p style={{ margin: '0 0 14px', fontSize: 13, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                      {prompt.invitation}
                    </p>

                    {/* Questions suggerees */}
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Questions pour t'inspirer :
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {prompt.questions_suggerees.map(q => (
                          <button
                            key={q}
                            onClick={() => handlePromptQuestion(prompt, q)}
                            style={{
                              textAlign: 'left', padding: '8px 12px', borderRadius: 10,
                              border: '1px solid rgba(99,102,241,0.25)',
                              background: 'rgba(255,255,255,0.8)',
                              color: '#4338CA', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                          >
                            ✦ {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleAcceptPrompt(prompt)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                          background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        ✏️ J'ai envie d'en parler
                      </button>
                      <button
                        onClick={() => handleIgnorePrompt(prompt)}
                        style={{
                          padding: '10px 14px', borderRadius: 10,
                          border: '1px solid rgba(99,102,241,0.2)',
                          background: 'transparent', color: '#94A3B8',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Pas maintenant
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          {entries.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {[
                { icon: '🔥', label: streak > 0 ? `${streak}j de suite` : 'Commence !', color: '#F97316' },
                { icon: '📝', label: `${entries.length} entree${entries.length > 1 ? 's' : ''}`, color: '#6366F1' },
                { icon: '🩺', label: `${drLoCount} reponse${drLoCount > 1 ? 's' : ''} Dr Lo`, color: '#0EA5E9' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, background: '#fff', borderRadius: 12, padding: '10px 12px',
                  border: '1px solid rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: 600, lineHeight: 1.3 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* New entry form */}
          <div ref={formRef} style={{
            background: '#fff', borderRadius: 18,
            border: activePromptHint
              ? '1.5px solid rgba(99,102,241,0.4)'
              : '1px solid rgba(99,102,241,0.15)',
            padding: '20px', marginBottom: 24,
            animation: 'slideUp 0.3s ease',
          }}>
            {/* Active prompt hint */}
            {activePromptHint && (
              <div style={{
                background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.06))',
                borderRadius: 12, padding: '12px 14px', marginBottom: 16,
                border: '1px solid rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
              }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#6366F1' }}>
                    {activePromptHint.titre}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                    ✦ {activePromptHint.question}
                  </p>
                </div>
                <button
                  onClick={() => setActivePromptHint(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 16, padding: 0, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            )}

            <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>
              ✏️ Nouvelle entree &nbsp;
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </p>

            {/* Humeur */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  😊 Comment tu te sens ?
                </p>
                {humeur && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: '#6366F1',
                    background: 'rgba(99,102,241,0.1)',
                    padding: '2px 10px', borderRadius: 20,
                  }}>
                    {humeur} {HUMEURS.find(h => h.emoji === humeur)?.label}
                  </span>
                )}
                {!humeur && (
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>Choisis une humeur</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {HUMEURS.map(h => (
                  <button
                    key={h.emoji}
                    onClick={() => setHumeur(h.emoji === humeur ? '' : h.emoji)}
                    title={h.label}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      width: 52, padding: '7px 4px', borderRadius: 12, border: 'none',
                      background: humeur === h.emoji ? 'rgba(99,102,241,0.12)' : '#F8FAFF',
                      outline: humeur === h.emoji ? '2px solid #6366F1' : '1px solid #E2E8F0',
                      fontSize: 22, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {h.emoji}
                    <span style={{
                      fontSize: 8, fontWeight: 600, lineHeight: 1.2,
                      color: humeur === h.emoji ? '#6366F1' : '#94A3B8',
                      textAlign: 'center', whiteSpace: 'nowrap',
                    }}>
                      {h.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div style={{ position: 'relative' }}>
              <textarea
                value={contenu}
                onChange={e => setContenu(e.target.value)}
                placeholder={activePromptHint ? activePromptHint.question : placeholder}
                rows={8}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12,
                  border: '1.5px solid rgba(99,102,241,0.2)',
                  fontSize: 14, fontFamily: 'inherit', background: '#FAFBFF',
                  color: '#0A2342', lineHeight: 1.65, resize: 'vertical',
                  boxSizing: 'border-box', outline: 'none',
                  transition: 'border-color 0.15s', minHeight: 180,
                }}
              />
              {contenu.trim() && (
                <span style={{
                  position: 'absolute', bottom: 10, right: 12,
                  fontSize: 11, color: '#94A3B8',
                }}>
                  {wordCount} mot{wordCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Themes */}
            <div style={{ margin: '14px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🏷️ De quoi ça parle ?
                </p>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  {themes.length === 0 ? 'Choisis un ou plusieurs sujets' : `${themes.length} sélectionné${themes.length > 1 ? 's' : ''}`}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {THEMES.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTheme(t)}
                    style={{
                      padding: '5px 13px', borderRadius: 20, border: 'none',
                      background: themes.includes(t) ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#F1F5F9',
                      color: themes.includes(t) ? '#fff' : '#64748B',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {themes.includes(t) ? '✓ ' : ''}{t}
                  </button>
                ))}
              </div>
              {themes.length === 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#CBD5E1', fontStyle: 'italic' }}>
                  Ces étiquettes t'aident à retrouver tes entrées et aident Dr Lô à mieux te comprendre.
                </p>
              )}
            </div>

            {journalError && (
              <p style={{ margin: '8px 0', fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>
                {journalError}
              </p>
            )}

            {savedMsg && (
              <div style={{
                margin: '8px 0', fontSize: 13, color: '#065F46',
                background: '#ECFDF5', padding: '10px 14px', borderRadius: 10,
                animation: 'slideUp 0.25s ease',
              }}>
                {savedMsg}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !contenu.trim()}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: saving || !contenu.trim()
                  ? '#E2E8F0'
                  : 'linear-gradient(135deg,#3B82F6,#6366F1)',
                color: saving || !contenu.trim() ? '#94A3B8' : '#fff',
                fontSize: 14, fontWeight: 700,
                cursor: saving || !contenu.trim() ? 'default' : 'pointer',
                marginTop: 4,
              }}
            >
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          </div>

          {/* Entries list */}
          {loadingEntries ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 14 }}>
              Chargement...
            </div>
          ) : !userId ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', textAlign: 'center', border: '1px solid rgba(99,102,241,0.1)' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🔒</p>
              <p style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Connecte-toi pour acceder a ton journal</p>
            </div>
          ) : entries.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', textAlign: 'center', border: '1px solid rgba(99,102,241,0.1)' }}>
              <p style={{ fontSize: 36, marginBottom: 10 }}>📔</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2342', marginBottom: 6 }}>Ton journal est vide</p>
              <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
                Ecris ta premiere entree ci-dessus.<br />Dis ce que tu ressens — c'est ton espace.
              </p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label} style={{ marginBottom: 24 }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {group.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.entries.map(entry => (
                    <div
                      key={entry.id}
                      className="me-entry-card"
                      style={{
                        background: '#fff', borderRadius: 14,
                        border: '1px solid rgba(99,102,241,0.1)',
                        padding: '14px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{entry.humeur || '📅'}</span>
                        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                          {formatDate(entry.date)}
                        </span>
                        {(entry.dr_lo_response || entry.dr_lo_requested_at) && (
                          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#0EA5E9', fontWeight: 700, background: '#F0F9FF', borderRadius: 20, padding: '2px 8px' }}>
                            🩺 Dr Lo
                          </span>
                        )}
                      </div>

                      {/* Mode edition inline */}
                      {editingEntry?.id === entry.id ? (
                        <div style={{ marginBottom: 10 }}>
                          <textarea
                            value={editingEntry.contenu}
                            onChange={e => setEditingEntry({ ...editingEntry, contenu: e.target.value })}
                            rows={6}
                            autoFocus
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: 10,
                              border: '1.5px solid rgba(99,102,241,0.35)',
                              fontSize: 13, fontFamily: 'inherit', color: '#0A2342',
                              background: '#FAFBFF', lineHeight: 1.65, resize: 'vertical',
                              boxSizing: 'border-box', outline: 'none', marginBottom: 8,
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={handleSaveEdit}
                              disabled={editSaving}
                              style={{
                                flex: 1, padding: '8px', borderRadius: 9, border: 'none',
                                background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              {editSaving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                            </button>
                            <button
                              onClick={() => setEditingEntry(null)}
                              style={{
                                padding: '8px 14px', borderRadius: 9,
                                border: '1px solid #E2E8F0',
                                background: 'transparent', color: '#94A3B8',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p style={{
                            margin: '0 0 10px', fontSize: 13, color: '#374151', lineHeight: 1.55,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                          }}>
                            {entry.contenu || '(entree vide)'}
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
                              style={{
                                flex: 1, padding: '7px', borderRadius: 9,
                                border: '1px solid rgba(99,102,241,0.2)',
                                background: 'transparent', color: '#6366F1',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              Lire
                            </button>
                            <button
                              onClick={() => setEditingEntry({ id: entry.id, contenu: entry.contenu })}
                              style={{
                                flex: 1, padding: '7px', borderRadius: 9,
                                border: '1px solid rgba(99,102,241,0.2)',
                                background: 'transparent', color: '#6366F1',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              onClick={() => handleAskDrLoAboutEntry(entry)}
                              style={{
                                flex: 1, padding: '7px', borderRadius: 9,
                                border: '1px solid rgba(14,165,233,0.25)',
                                background: 'transparent', color: '#0EA5E9',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              🩺 Dr Lo
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={deletingId === entry.id}
                              style={{
                                width: 34, height: 34, borderRadius: 9,
                                border: '1px solid rgba(239,68,68,0.2)',
                                background: 'transparent', color: '#EF4444',
                                fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              {deletingId === entry.id ? '...' : '🗑️'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Dr Lo Tab ── */}
      {tab === 'drlo' && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>

          {/* Header Dr Lo */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid rgba(99,102,241,0.12)',
            padding: '14px 16px', marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src={DR_LO_PHOTO}
                alt="Dr Lo"
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366F1' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0A2342' }}>Dr Lo</p>
                <p style={{ margin: 0, fontSize: 11, color: '#16A34A' }}>● En ligne</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setHistoryView(!historyView)}
                style={{
                  padding: '7px 14px', borderRadius: 10,
                  border: 'none',
                  background: historyView
                    ? 'linear-gradient(135deg,#4F46E5,#7C3AED)'
                    : 'linear-gradient(135deg,#6366F1,#818CF8)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                🕐 Historique
              </button>
              <button
                onClick={startNewConversation}
                style={{
                  padding: '7px 14px', borderRadius: 10,
                  border: '1.5px solid rgba(99,102,241,0.35)',
                  background: 'white', color: '#6366F1',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                + Nouveau
              </button>
            </div>
          </div>

          {/* Historique view */}
          {historyView ? (
            <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: 13 }}>Chargement...</div>
              ) : conversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: 13 }}>
                  <p style={{ fontSize: 28 }}>💬</p>
                  Aucune conversation sauvegardee.
                </div>
              ) : selectedConv ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(99,102,241,0.12)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => setSelectedConv(null)}
                        style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        ← Retour
                      </button>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>
                        {new Date(selectedConv.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={async e => {
                        await handleDeleteConversation(e, selectedConv.id);
                        setSelectedConv(null);
                      }}
                      disabled={!!deletingConvId}
                      title="Supprimer cette conversation"
                      style={{
                        padding: '5px 10px', borderRadius: 8,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.06)',
                        color: '#EF4444', fontSize: 11, fontWeight: 600,
                        cursor: deletingConvId ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {deletingConvId === selectedConv.id ? '…' : '🗑️ Supprimer'}
                    </button>
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedConv.messages.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                        {m.role === 'assistant' && (
                          <img src={DR_LO_PHOTO} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 4 }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <div className={m.role === 'user' ? 'chat-user-bubble' : 'chat-bot-bubble'}
                          style={{ maxWidth: '80%', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #F1F5F9' }}>
                    <button
                      onClick={() => {
                        setMessages(selectedConv.messages);
                        conversationId.current = selectedConv.id;
                        setHistoryView(false);
                        setSelectedConv(null);
                      }}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                        color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Continuer avec Dr Lo →
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {conversations.map(conv => {
                    const lastUser = [...conv.messages].reverse().find(m => m.role === 'user');
                    const isDeleting = deletingConvId === conv.id;
                    return (
                      <div
                        key={conv.id}
                        className="conv-item"
                        onClick={() => !isDeleting && setSelectedConv(conv)}
                        style={{
                          background: '#fff', borderRadius: 12,
                          border: '1px solid rgba(99,102,241,0.1)',
                          padding: '12px 16px',
                          opacity: isDeleting ? 0.5 : 1,
                          transition: 'opacity 0.15s',
                          cursor: isDeleting ? 'default' : 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                            💬 {conv.messages.length} messages
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>
                              {new Date(conv.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            <button
                              onClick={e => handleDeleteConversation(e, conv.id)}
                              disabled={!!deletingConvId}
                              title="Supprimer cette conversation"
                              style={{
                                width: 28, height: 28, borderRadius: 8,
                                border: '1px solid rgba(239,68,68,0.25)',
                                background: 'rgba(239,68,68,0.05)',
                                color: '#EF4444', fontSize: 12,
                                cursor: deletingConvId ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'background 0.15s',
                              }}
                            >
                              {isDeleting ? '…' : '🗑️'}
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {lastUser?.content ?? '—'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Suggestion chips */}
              {messages.length <= 1 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SUGGESTIONS_DR_LO.map(s => (
                      <button
                        key={s}
                        className="me-suggestion"
                        onClick={() => sendMessage(s)}
                        style={{
                          padding: '6px 12px', borderRadius: 20,
                          border: '1px solid rgba(99,102,241,0.25)',
                          background: 'transparent', color: '#6366F1',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div style={{
                maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
                gap: 12, padding: '4px 0', marginBottom: 12,
              }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                    {m.role === 'assistant' && (
                      <img src={DR_LO_PHOTO} alt="Dr Lo" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <div className={m.role === 'user' ? 'chat-user-bubble' : 'chat-bot-bubble'}
                      style={{ maxWidth: '82%', padding: '10px 14px', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <img src={DR_LO_PHOTO} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="chat-bot-bubble" style={{ padding: '10px 14px', display: 'flex', gap: 5 }}>
                      {[0, 1, 2].map(d => (
                        <span key={d} style={{
                          width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', display: 'inline-block',
                          animation: `typingDot 1.2s ease ${d * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                background: '#fff', borderRadius: 14,
                border: '1.5px solid rgba(99,102,241,0.2)',
                padding: '10px 12px',
                display: 'flex', alignItems: 'flex-end', gap: 10,
              }}>
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ecris a Dr Lo..."
                  rows={1}
                  className="chat-input-area"
                  style={{
                    flex: 1, border: 'none', resize: 'none',
                    fontSize: 14, fontFamily: 'inherit', color: '#0A2342',
                    background: 'transparent', lineHeight: '21px',
                    minHeight: 37, maxHeight: 121,
                    overflowY: 'auto', outline: 'none',
                    transition: 'height 0.1s ease',
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0,
                    background: chatLoading || !chatInput.trim()
                      ? '#E2E8F0'
                      : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                    color: chatLoading || !chatInput.trim() ? '#94A3B8' : '#fff',
                    fontSize: 16, cursor: chatLoading || !chatInput.trim() ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ↑
                </button>
              </div>

              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
                ⚡ {KORIS_CONFIG.active ? `Utilise ${KORIS_CONFIG.costs.chat_dr_lo_message} Koris` : 'Utilisera des Koris (bientot disponible)'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Tooltips onboarding */}
      <PageTooltips pageKey="mon_espace" />
    </div>
  );
};

export default MonEspacePage;

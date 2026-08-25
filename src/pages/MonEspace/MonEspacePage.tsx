import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc,
  addDoc, updateDoc, getDocs, setDoc, limit,
} from 'firebase/firestore';
import {
  ArrowLeft, Leaf, Lock, BookOpen, Stethoscope, Lightbulb, Pencil,
  Flame, FileText, Smile, Tag, Save, Trash2, History, MessageCircle,
  ArrowRight, Zap, ArrowUp, X, Loader2, Meh, Frown, Annoyed, Angry, Heart,
  Calendar, Check,
} from 'lucide-react';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { getCompatibilityHistory } from '../../services/compatibilityService';
import { getScaleById } from '../../data/scales';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';
import { KORIS_CONFIG } from '../../utils/korisConfig';
import { loadPendingPrompts, ignorePrompt, type PendingPrompt } from '../../utils/journalPrompts';
import PageTooltips from '../../components/Onboarding/PageTooltips';
import type { JournalEntry } from '../Journal/JournalPage';

// ── Constants ─────────────────────────────────────────────────────────────────

const HUMEURS = [
  { emoji: '😊', label: 'Heureux(se)', icon: Smile },
  { emoji: '😐', label: 'Neutre', icon: Meh },
  { emoji: '😔', label: 'Triste', icon: Frown },
  { emoji: '😰', label: 'Anxieux(se)', icon: Annoyed },
  { emoji: '😡', label: 'En colere', icon: Angry },
  { emoji: '🥰', label: 'Amoureux(se)', icon: Heart },
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
  "Belle entree ! Continuer a ecrire est l'une des meilleures choses que tu puisses faire pour toi.",
  "Tu t'es donne du temps, et c'est precieux. Reviens quand tu veux.",
  "Ecrire, c'est deja agir. Bien joue !",
  "Ton journal grandit avec toi. Continue comme ca !",
  "Chaque mot compte. Tu fais du beau travail.",
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
  const { spend, refund } = useKoris();
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
        content: `Salut ${prenom || 'toi'} ! Je suis Dr Lo, ton medecin IA. Comment puis-je t'aider aujourd'hui ?`,
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

    // Koris check
    const spendResult = await spend('chat', 'Message Dr Lô');
    if (!spendResult.allowed) return;

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

      if (!res.ok) {
        await refund('chat');
        throw new Error('API error');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response ?? "Je n'ai pas pu repondre. Reessaie dans un instant.",
        timestamp: new Date().toISOString(),
        koris_consumed: KORIS_COSTS.chat,
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
      content: `Salut ${prenom || 'toi'} ! Nouvelle conversation, je t'ecoute !`,
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
    <div className="min-h-screen bg-paper pb-20">
      {/* ── Header ── */}
      <div className="bg-sage text-white px-5 pt-7 pb-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 bg-white/15 text-white rounded-pill px-3 py-1.5 text-[13px] font-semibold mb-3 hover:bg-white/25 transition-colors"
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <div className="flex items-center gap-2.5">
          <Leaf size={26} />
          <div>
            <h1 className="font-display m-0 text-[22px] font-semibold">Mon Espace</h1>
            <p className="m-0 mt-0.5 text-xs text-white/75">
              {prenom ? `Ton espace prive, ${prenom}` : 'Ton espace prive et confidentiel'}
            </p>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="mt-3.5 bg-white/10 rounded-xl px-3.5 py-2 flex items-center gap-2">
          <Lock size={14} />
          <span className="text-xs text-white/90">
            Tout ce que tu ecris ici est strictement prive.
          </span>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex bg-card border-b border-line sticky top-0 z-10">
        {(['journal', 'drlo'] as Tab[]).map(t => (
          <button
            key={t}
            data-tooltip-id={t === 'journal' ? 'tab-journal' : 'tab-dr-lo'}
            onClick={() => setTab(t)}
            className={`flex-1 py-3.5 border-0 border-b-[2.5px] bg-transparent text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === t ? 'text-accent border-accent' : 'text-muted border-transparent hover:opacity-80'
            }`}
          >
            {t === 'journal' ? <BookOpen size={15} /> : <Stethoscope size={15} />}
            {t === 'journal' ? 'Journal' : 'Dr Lo'}
          </button>
        ))}
      </div>

      {/* ── Journal Tab ── */}
      {tab === 'journal' && (
        <div className="max-w-xl mx-auto px-4 py-5">

          {/* ── Prompt cards de Dr Lo ── */}
          {journalPrompts.length > 0 && (
            <div className="mb-6">
              <p className="m-0 mb-2.5 text-[11px] font-bold text-accent uppercase tracking-wide flex items-center gap-1">
                <Lightbulb size={13} /> Dr Lo te propose d'explorer...
              </p>
              <div className="flex flex-col gap-3">
                {journalPrompts.map(prompt => (
                  <div key={prompt.id} className="bg-accent-soft rounded-block border border-accent/25 px-4.5 py-4 animate-fadeIn">
                    <p className="m-0 mb-2 text-[15px] font-extrabold text-ink">
                      {prompt.titre}
                    </p>
                    <p className="m-0 mb-3.5 text-[13px] text-ink-soft leading-relaxed whitespace-pre-line">
                      {prompt.invitation}
                    </p>

                    {/* Questions suggerees */}
                    <div className="mb-3.5">
                      <p className="m-0 mb-2 text-[11px] font-bold text-ink-soft uppercase tracking-wide">
                        Questions pour t'inspirer :
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {prompt.questions_suggerees.map(q => (
                          <button
                            key={q}
                            onClick={() => handlePromptQuestion(prompt, q)}
                            className="text-left px-3 py-2 rounded-xl border border-accent/30 bg-card text-accent text-xs font-semibold hover:bg-accent-soft transition-colors"
                          >
                            • {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptPrompt(prompt)}
                        className="flex-1 py-2.5 rounded-xl border-0 bg-accent text-white text-[13px] font-bold flex items-center justify-center gap-1.5 hover:bg-accent/90 transition-colors"
                      >
                        <Pencil size={13} /> J'ai envie d'en parler
                      </button>
                      <button
                        onClick={() => handleIgnorePrompt(prompt)}
                        className="px-3.5 py-2.5 rounded-xl border border-accent/25 bg-transparent text-muted text-xs font-semibold hover:bg-accent-soft/50 transition-colors"
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
            <div className="flex gap-2.5 mb-5">
              {[
                { icon: Flame, label: streak > 0 ? `${streak}j de suite` : 'Commence !' },
                { icon: FileText, label: `${entries.length} entree${entries.length > 1 ? 's' : ''}` },
                { icon: Stethoscope, label: `${drLoCount} reponse${drLoCount > 1 ? 's' : ''} Dr Lo` },
              ].map((s, i) => (
                <div key={i} className="flex-1 bg-card rounded-xl px-3 py-2.5 border border-line flex items-center gap-1.5">
                  <s.icon size={15} className="text-accent flex-shrink-0" />
                  <span className="text-[11px] text-ink-soft font-semibold leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* New entry form */}
          <div
            ref={formRef}
            className={`bg-card rounded-block px-5 py-5 mb-6 animate-fadeIn border ${
              activePromptHint ? 'border-accent/40' : 'border-line'
            }`}
          >
            {/* Active prompt hint */}
            {activePromptHint && (
              <div className="bg-accent-soft rounded-xl px-3.5 py-3 mb-4 border border-accent/15 flex items-start justify-between gap-2.5">
                <div>
                  <p className="m-0 mb-0.5 text-xs font-bold text-accent">
                    {activePromptHint.titre}
                  </p>
                  <p className="m-0 text-xs text-ink-soft italic">
                    • {activePromptHint.question}
                  </p>
                </div>
                <button
                  onClick={() => setActivePromptHint(null)}
                  className="bg-transparent border-0 cursor-pointer text-muted flex-shrink-0 p-0 hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <p className="m-0 mb-3.5 text-[13px] font-bold text-ink-soft flex items-center gap-1.5 flex-wrap">
              <Pencil size={13} /> Nouvelle entree
              <span className="text-[11px] text-muted font-normal">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </p>

            {/* Humeur */}
            <div className="mb-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="m-0 text-[11px] font-bold text-accent uppercase tracking-wide flex items-center gap-1">
                  <Smile size={13} /> Comment tu te sens ?
                </p>
                {humeur && (
                  <span className="text-[11px] font-bold text-accent bg-accent-soft px-2.5 py-0.5 rounded-pill inline-flex items-center gap-1">
                    {(() => {
                      const selected = HUMEURS.find(h => h.emoji === humeur);
                      if (!selected) return null;
                      const SelectedIcon = selected.icon;
                      return <><SelectedIcon size={12} /> {selected.label}</>;
                    })()}
                  </span>
                )}
                {!humeur && (
                  <span className="text-[11px] text-muted">Choisis une humeur</span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {HUMEURS.map(h => (
                  <button
                    key={h.emoji}
                    onClick={() => setHumeur(h.emoji === humeur ? '' : h.emoji)}
                    title={h.label}
                    className={`flex flex-col items-center gap-0.5 w-[52px] px-1 py-1.5 rounded-xl border-0 transition-all ${
                      humeur === h.emoji
                        ? 'bg-accent-soft ring-2 ring-accent text-accent'
                        : 'bg-paper ring-1 ring-line text-ink-soft'
                    }`}
                  >
                    <h.icon size={20} />
                    <span className={`text-[8px] font-semibold leading-tight text-center whitespace-nowrap ${
                      humeur === h.emoji ? 'text-accent' : 'text-muted'
                    }`}>
                      {h.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={contenu}
                onChange={e => setContenu(e.target.value)}
                placeholder={activePromptHint ? activePromptHint.question : placeholder}
                rows={8}
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-accent/20 text-sm font-sans bg-paper text-ink leading-relaxed resize-y outline-none box-border min-h-[180px] focus:border-accent/50 transition-colors"
              />
              {contenu.trim() && (
                <span className="absolute bottom-2.5 right-3 text-[11px] text-muted">
                  {wordCount} mot{wordCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Themes */}
            <div className="my-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="m-0 text-[11px] font-bold text-accent uppercase tracking-wide flex items-center gap-1">
                  <Tag size={13} /> De quoi ça parle ?
                </p>
                <span className="text-[11px] text-muted">
                  {themes.length === 0 ? 'Choisis un ou plusieurs sujets' : `${themes.length} sélectionné${themes.length > 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {THEMES.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTheme(t)}
                    className={`px-3.5 py-1.5 rounded-pill border-0 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 ${
                      themes.includes(t) ? 'bg-accent text-white' : 'bg-paper text-ink-soft'
                    }`}
                  >
                    {themes.includes(t) && <Check size={11} />}{t}
                  </button>
                ))}
              </div>
              {themes.length === 0 && (
                <p className="mt-1.5 mb-0 text-[11px] text-muted italic">
                  Ces étiquettes t'aident à retrouver tes entrées et aident Dr Lô à mieux te comprendre.
                </p>
              )}
            </div>

            {journalError && (
              <p className="my-2 text-xs text-danger bg-danger/10 px-3 py-2 rounded-lg">
                {journalError}
              </p>
            )}

            {savedMsg && (
              <div className="my-2 text-[13px] text-ok bg-sage-soft px-3.5 py-2.5 rounded-xl animate-fadeIn">
                {savedMsg}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !contenu.trim()}
              className={`w-full py-3 rounded-xl border-0 text-sm font-bold mt-1 flex items-center justify-center gap-2 transition-colors ${
                saving || !contenu.trim()
                  ? 'bg-line text-muted cursor-default'
                  : 'bg-accent text-white cursor-pointer hover:bg-accent/90'
              }`}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>

          {/* Entries list */}
          {loadingEntries ? (
            <div className="text-center py-8 text-muted text-sm">
              Chargement...
            </div>
          ) : !userId ? (
            <div className="bg-card rounded-block px-6 py-6 text-center border border-line">
              <Lock size={28} className="mx-auto mb-2 text-muted" />
              <p className="text-sm text-ink-soft font-semibold">Connecte-toi pour acceder a ton journal</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-card rounded-block px-6 py-7 text-center border border-line">
              <BookOpen size={36} className="mx-auto mb-2.5 text-muted" />
              <p className="text-sm font-bold text-ink mb-1.5">Ton journal est vide</p>
              <p className="text-xs text-muted leading-relaxed">
                Ecris ta premiere entree ci-dessus.<br />Dis ce que tu ressens — c'est ton espace.
              </p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label} className="mb-6">
                <p className="m-0 mb-2.5 text-[11px] font-bold text-muted uppercase tracking-wide">
                  {group.label}
                </p>
                <div className="flex flex-col gap-2.5">
                  {group.entries.map(entry => (
                    <div
                      key={entry.id}
                      className="bg-card rounded-card border border-line px-4 py-3.5 transition-shadow hover:shadow-soft"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {entry.humeur ? (
                          <span className="text-lg leading-none">{entry.humeur}</span>
                        ) : (
                          <Calendar size={16} className="text-muted" />
                        )}
                        <span className="text-xs text-ink-soft font-medium">
                          {formatDate(entry.date)}
                        </span>
                        {(entry.dr_lo_response || entry.dr_lo_requested_at) && (
                          <span className="ml-auto text-[10px] text-sage font-bold bg-sage-soft rounded-pill px-2 py-0.5 flex items-center gap-1">
                            <Stethoscope size={10} /> Dr Lo
                          </span>
                        )}
                      </div>

                      {/* Mode edition inline */}
                      {editingEntry?.id === entry.id ? (
                        <div className="mb-2.5">
                          <textarea
                            value={editingEntry.contenu}
                            onChange={e => setEditingEntry({ ...editingEntry, contenu: e.target.value })}
                            rows={6}
                            autoFocus
                            className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-accent/35 text-[13px] font-sans text-ink bg-paper leading-relaxed resize-y outline-none box-border mb-2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={editSaving}
                              className="flex-1 py-2 rounded-lg border-0 bg-accent text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-accent/90 transition-colors"
                            >
                              {editSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              {editSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                            <button
                              onClick={() => setEditingEntry(null)}
                              className="px-3.5 py-2 rounded-lg border border-line bg-transparent text-muted text-xs font-semibold hover:bg-paper transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="m-0 mb-2.5 text-[13px] text-ink-soft leading-snug overflow-hidden line-clamp-2">
                            {entry.contenu || '(entree vide)'}
                          </p>

                          {entry.themes?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                              {entry.themes.map(t => (
                                <span key={t} className="text-[11px] text-accent bg-accent-soft rounded-pill px-2 py-0.5">{t}</span>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/journal/${entry.id}`)}
                              className="flex-1 py-1.5 rounded-lg border border-accent/20 bg-transparent text-accent text-xs font-semibold hover:bg-accent-soft/50 transition-colors"
                            >
                              Lire
                            </button>
                            <button
                              onClick={() => setEditingEntry({ id: entry.id, contenu: entry.contenu })}
                              className="flex-1 py-1.5 rounded-lg border border-accent/20 bg-transparent text-accent text-xs font-semibold flex items-center justify-center gap-1 hover:bg-accent-soft/50 transition-colors"
                            >
                              <Pencil size={11} /> Modifier
                            </button>
                            <button
                              onClick={() => handleAskDrLoAboutEntry(entry)}
                              className="flex-1 py-1.5 rounded-lg border border-sage/25 bg-transparent text-sage text-xs font-semibold flex items-center justify-center gap-1 hover:bg-sage-soft/50 transition-colors"
                            >
                              <Stethoscope size={11} /> Dr Lo
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={deletingId === entry.id}
                              className="w-[34px] h-[34px] rounded-lg border border-danger/20 bg-transparent text-danger flex items-center justify-center hover:bg-danger/5 transition-colors"
                            >
                              {deletingId === entry.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
        <div className="max-w-xl mx-auto px-4 py-4 flex flex-col">

          {/* Header Dr Lo */}
          <div className="bg-card rounded-block border border-sage/20 px-4 py-3.5 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={DR_LO_PHOTO}
                alt="Dr Lo"
                className="w-10 h-10 rounded-full object-cover border-2 border-sage"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div>
                <p className="m-0 text-sm font-bold text-ink">Dr Lo</p>
                <p className="m-0 text-[11px] text-ok flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ok inline-block" /> En ligne
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setHistoryView(!historyView)}
                className={`px-3.5 py-1.5 rounded-xl border-0 text-white text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  historyView ? 'bg-sage' : 'bg-sage/85 hover:bg-sage'
                }`}
              >
                <History size={13} /> Historique
              </button>
              <button
                onClick={startNewConversation}
                className="px-3.5 py-1.5 rounded-xl border-[1.5px] border-sage/35 bg-card text-sage text-xs font-bold hover:bg-sage-soft transition-colors"
              >
                + Nouveau
              </button>
            </div>
          </div>

          {/* Historique view */}
          {historyView ? (
            <div className="max-h-[65vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="text-center py-8 text-muted text-[13px]">Chargement...</div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted text-[13px]">
                  <MessageCircle size={28} className="mx-auto mb-2" />
                  Aucune conversation sauvegardee.
                </div>
              ) : selectedConv ? (
                <div className="bg-card rounded-block border border-sage/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setSelectedConv(null)}
                        className="bg-transparent border-0 text-sage cursor-pointer text-[13px] font-semibold flex items-center gap-1"
                      >
                        <ArrowLeft size={13} /> Retour
                      </button>
                      <span className="text-xs text-muted">
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
                      className="px-2.5 py-1.5 rounded-lg border border-danger/30 bg-danger/5 text-danger text-[11px] font-semibold flex items-center gap-1"
                    >
                      {deletingConvId === selectedConv.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Supprimer
                    </button>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-2.5">
                    {selectedConv.messages.map((m, i) => (
                      <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.role === 'assistant' && (
                          <img src={DR_LO_PHOTO} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <div className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'bg-sage text-white rounded-2xl rounded-br-md'
                            : 'bg-paper text-ink rounded-2xl rounded-bl-md'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-line">
                    <button
                      onClick={() => {
                        setMessages(selectedConv.messages);
                        conversationId.current = selectedConv.id;
                        setHistoryView(false);
                        setSelectedConv(null);
                      }}
                      className="w-full py-2.5 rounded-xl border-0 bg-sage text-white text-[13px] font-bold flex items-center justify-center gap-1.5 hover:bg-sage/90 transition-colors"
                    >
                      Continuer avec Dr Lo <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {conversations.map(conv => {
                    const lastUser = [...conv.messages].reverse().find(m => m.role === 'user');
                    const isDeleting = deletingConvId === conv.id;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => !isDeleting && setSelectedConv(conv)}
                        className={`bg-card rounded-xl border border-line px-4 py-3 transition-opacity ${
                          isDeleting ? 'opacity-50 cursor-default' : 'opacity-100 cursor-pointer hover:bg-sage-soft/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-ink-soft flex items-center gap-1.5">
                            <MessageCircle size={12} /> {conv.messages.length} messages
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted">
                              {new Date(conv.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            <button
                              onClick={e => handleDeleteConversation(e, conv.id)}
                              disabled={!!deletingConvId}
                              title="Supprimer cette conversation"
                              className="w-7 h-7 rounded-lg border border-danger/25 bg-danger/5 text-danger flex items-center justify-center flex-shrink-0 hover:bg-danger/10 transition-colors"
                            >
                              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                        <p className="m-0 text-xs text-ink-soft overflow-hidden whitespace-nowrap text-ellipsis">
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
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS_DR_LO.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 rounded-pill border border-sage/25 bg-transparent text-sage text-[11px] font-semibold hover:bg-sage-soft transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="max-h-[55vh] overflow-y-auto flex flex-col gap-3 py-1 mb-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 items-end ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <img src={DR_LO_PHOTO} alt="Dr Lo" className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <div className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-sage text-white rounded-2xl rounded-br-md'
                        : 'bg-paper text-ink rounded-2xl rounded-bl-md'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex gap-2 items-end">
                    <img src={DR_LO_PHOTO} alt="" className="w-7 h-7 rounded-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="bg-paper rounded-2xl rounded-bl-md px-3.5 py-2.5 flex gap-1.5">
                      {[0, 1, 2].map(d => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-muted inline-block animate-pulse"
                          style={{ animationDelay: `${d * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="bg-card rounded-2xl border-[1.5px] border-sage/25 px-3 py-2.5 flex items-end gap-2.5">
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ecris a Dr Lo..."
                  rows={1}
                  className="flex-1 border-0 resize-none text-sm font-sans text-ink bg-transparent leading-[21px] min-h-[37px] max-h-[121px] overflow-y-auto outline-none"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={chatLoading || !chatInput.trim()}
                  className={`w-[38px] h-[38px] rounded-xl border-0 flex-shrink-0 flex items-center justify-center transition-colors ${
                    chatLoading || !chatInput.trim()
                      ? 'bg-line text-muted cursor-default'
                      : 'bg-sage text-white cursor-pointer hover:bg-sage/90'
                  }`}
                >
                  <ArrowUp size={17} />
                </button>
              </div>

              <p className="mt-2 mb-0 text-[11px] text-muted text-center flex items-center justify-center gap-1">
                <Zap size={11} /> {KORIS_CONFIG.active ? `Utilise ${KORIS_CONFIG.costs.chat_dr_lo_message} Koris` : 'Utilisera des Koris (bientot disponible)'}
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

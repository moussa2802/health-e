import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, getDoc, limit } from 'firebase/firestore';
import { MessageCircle, History, X, ArrowRight, ArrowLeft, Zap } from 'lucide-react';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { getCompatibilityHistory } from '../../services/compatibilityService';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';
import { KORIS_CONFIG } from '../../utils/korisConfig';
import { authedFetch } from '../../utils/authedFetch';
import { isAiAvailable } from '../../utils/aiCircuitBreaker';

const DAILY_MESSAGE_LIMIT = 10;

const DR_LO_PHOTO = '/dr-lo.png';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
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

type View = 'chat' | 'history';

interface Props {
  userId: string | null;
}

// ── Build full context ────────────────────────────────────────────────────────

async function buildFullContext(userId: string | null) {
  const onboarding = getOnboardingProfile();

  let scaleResults: Record<string, unknown> = {};
  let drLoMentalAnalysis: string | null = null;
  let drLoSexualAnalysis: string | null = null;
  let drLoAnalysis: string | null = null;
  let compatibilityIdMental: string | null = null;
  let compatibilityIdSexual: string | null = null;

  if (userId) {
    try {
      const progress = await getProfileProgress(userId);
      scaleResults = progress.scaleResults ?? {};
      drLoMentalAnalysis = progress.drLoMentalAnalysis;
      drLoSexualAnalysis = progress.drLoSexualAnalysis;
      drLoAnalysis = progress.drLoAnalysis;
      compatibilityIdMental = progress.compatibilityIdMental;
      compatibilityIdSexual = progress.compatibilityIdSexual;
    } catch { /* ignore */ }
  }

  // Séparer les résultats par catégorie
  const scores_mentaux: Record<string, unknown> = {};
  const scores_intimes: Record<string, unknown> = {};
  const tests_bonus: Record<string, unknown> = {};

  for (const [id, v] of Object.entries(scaleResults)) {
    const val = v as { category?: string };
    if (val.category === 'mental_health') scores_mentaux[id] = v;
    else if (val.category === 'sexual_health') scores_intimes[id] = v;
    else tests_bonus[id] = v;
  }

  // Historique compatibilité (3 derniers)
  let compat_history: unknown[] = [];
  if (userId) {
    try {
      const hist = await getCompatibilityHistory(userId);
      compat_history = hist.slice(0, 3).map(h => ({
        date: h.createdAt,
        score: h.result?.overallScore,
        label: h.result?.overallLabel,
        type: h.result?.compatibilityType,
      }));
    } catch { /* ignore */ }
  }

  // Journal récent (5 dernières entrées)
  let journal_recent: unknown[] = [];
  if (userId) {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'users', userId, 'journal'),
          orderBy('created_at', 'desc'),
          limit(5)
        )
      );
      journal_recent = snap.docs.map(d => {
        const data = d.data();
        return {
          date: data.date,
          humeur: data.humeur,
          themes: data.themes,
          contenu: (data.contenu as string ?? '').substring(0, 200),
        };
      });
    } catch { /* ignore */ }
  }

  return {
    prenom: onboarding?.prenom ?? '',
    age: onboarding?.age ?? '',
    genre: onboarding?.genre ?? '',
    situation: onboarding?.situation_relationnelle ?? '',
    scores_mentaux,
    scores_intimes,
    tests_bonus,
    dr_lo_mental_analysis: drLoMentalAnalysis,
    dr_lo_sexual_analysis: drLoSexualAnalysis,
    dr_lo_general_analysis: drLoAnalysis,
    compat_codes: { mental: compatibilityIdMental, sexual: compatibilityIdSexual },
    compat_history,
    journal_recent,
  };
}

// ── Load conversation history from Firestore ──────────────────────────────────

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
    })).filter(c => c.messages.length > 1); // skip empty
  } catch {
    return [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const FloatingChat: React.FC<Props> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedConv, setSelectedConv] = useState<SavedConversation | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationId = useRef<string>(`conv_${Date.now()}`);
  const { canAfford, balance, refreshBalance } = useKoris();

  const onboarding = getOnboardingProfile();
  const prenom = onboarding?.prenom ?? '';

  // Load daily message count from Firestore
  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.chatLastDate === today) {
        const count = data.chatDailyCount ?? 0;
        setDailyCount(count);
        if (count >= DAILY_MESSAGE_LIMIT) setLimitReached(true);
      }
    }).catch(() => {});
  }, [userId]);

  // Message de bienvenue
  useEffect(() => {
    if (open && view === 'chat' && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Salut ${prenom || 'toi'} ! Comment puis-je t'aider aujourd'hui ?`,
        timestamp: new Date().toISOString(),
      }]);
    }
    if (open) {
      setUnread(0);
      if (view === 'chat') setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, view]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea jusqu'à 5 lignes
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 5 * 20 + 16; // 5 lignes × ~20px + padding
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  }, [input]);

  // Charger l'historique quand on bascule sur History
  useEffect(() => {
    if (view === 'history' && userId && conversations.length === 0) {
      setLoadingHistory(true);
      loadConversations(userId)
        .then(setConversations)
        .finally(() => setLoadingHistory(false));
    }
  }, [view]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || !isAiAvailable()) return;

    if (limitReached) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const context = await buildFullContext(userId);

      // Historique: exclure le welcome message (index 0), garder seulement les 5 derniers échanges (10 messages)
      const allHistory = messages
        .filter((_, i) => i > 0)
        .map(m => ({ role: m.role, content: m.content }));
      const historique = allHistory.slice(-10); // Last 5 exchanges (user+assistant pairs)

      const res = await authedFetch('/.netlify/functions/dr-lo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, historique, context }),
      });

      if (!res.ok) {
        throw new Error('API error');
      }

      const data = await res.json();
      await refreshBalance();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response ?? "Je n'ai pas pu répondre. Réessaie dans un instant.",
        timestamp: new Date().toISOString(),
        koris_consumed: KORIS_COSTS.chat,
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      if (!open) setUnread(n => n + 1);

      // Update daily message counter
      const newCount = dailyCount + 1;
      setDailyCount(newCount);
      if (newCount >= DAILY_MESSAGE_LIMIT) setLimitReached(true);
      if (userId) {
        const today = new Date().toISOString().split('T')[0];
        setDoc(doc(db, 'users', userId), {
          chatDailyCount: newCount,
          chatLastDate: today,
        }, { merge: true }).catch(() => {});
      }

      // Persister dans Firestore
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
      // Refund already handled above for API errors
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Une erreur s'est produite. Vérifie ta connexion et réessaie.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const startNewConversation = () => {
    conversationId.current = `conv_${Date.now()}`;
    setMessages([{
      role: 'assistant',
      content: `Salut ${prenom || 'toi'} ! Comment puis-je t'aider aujourd'hui ?`,
      timestamp: new Date().toISOString(),
    }]);
    setView('chat');
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // ── Pill FAB state ──────────────────────────────────────────────────────────
  const SESSION_KEY = 'drlo_pill_shown';
  const [pillExpanded, setPillExpanded] = useState(() => {
    if (typeof sessionStorage === 'undefined') return true;
    return !sessionStorage.getItem(SESSION_KEY);
  });
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (pillExpanded && !sessionStorage.getItem(SESSION_KEY)) {
      collapseTimer.current = setTimeout(() => {
        setPillExpanded(false);
        sessionStorage.setItem(SESSION_KEY, '1');
      }, 4200);
    }
    return () => { if (collapseTimer.current) clearTimeout(collapseTimer.current); };
  }, []);

  const handlePillClick = useCallback(() => {
    if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; }
    setOpen(o => !o);
  }, []);

  const handlePillHover = useCallback(() => {
    if (!open) setPillExpanded(true);
  }, [open]);

  const handlePillLeave = useCallback(() => {
    if (!open && sessionStorage.getItem(SESSION_KEY)) setPillExpanded(false);
  }, [open]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const transitionStyle = prefersReducedMotion.current ? 'none' : undefined;

  return (
    <>
      <style>{`
        @keyframes chatSlideIn {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes typingDot {
          0%,100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes fabPulse {
          0% { transform: scale(1); opacity: 0.8; }
          70% { transform: scale(1.13); opacity: 0; }
          100% { opacity: 0; }
        }
        .dr-lo-pill {
          transition: padding 0.3s cubic-bezier(.3,.9,.3,1);
        }
        .dr-lo-pill-text {
          overflow: hidden;
          white-space: nowrap;
          transition: max-width 0.32s cubic-bezier(.3,.9,.3,1), opacity 0.22s;
        }
        .dr-lo-pill-text.collapsed {
          max-width: 0 !important;
          opacity: 0;
          padding-right: 0 !important;
        }
        .conv-item:hover { background: #F3F1EA; }
        @media (prefers-reduced-motion: reduce) {
          .dr-lo-pill, .dr-lo-pill-text { transition: none !important; }
          .fab-pulse-ring { display: none; }
        }
      `}</style>

      {/* ── Fenêtre ── */}
      {open && (
        <div
          className="fixed bottom-[88px] right-5 w-[340px] max-h-[72vh] bg-card rounded-block shadow-lift flex flex-col z-[9999] overflow-hidden border border-line"
          style={{ animation: 'chatSlideIn 0.2s ease' }}
        >

          {/* Header */}
          <div className="bg-sage px-3.5 py-3 flex items-center gap-2.5 flex-shrink-0">
            <img
              src={DR_LO_PHOTO} alt="Dr Lô"
              className="w-[34px] h-[34px] rounded-full object-cover border-2 border-white/35 flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex-1">
              <p className="m-0 text-[13px] font-bold text-white">Dr Lô</p>
              <p className="m-0 text-[11px] text-white/70 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ok inline-block" />
                En ligne
              </p>
            </div>
            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => { setView('chat'); setSelectedConv(null); }}
                className={`p-1.5 rounded-lg border-0 cursor-pointer text-white transition-colors ${
                  view === 'chat' ? 'bg-white/25' : 'bg-transparent hover:bg-white/10'
                }`}
              >
                <MessageCircle size={14} />
              </button>
              <button
                onClick={() => setView('history')}
                className={`p-1.5 rounded-lg border-0 cursor-pointer text-white transition-colors ${
                  view === 'history' ? 'bg-white/25' : 'bg-transparent hover:bg-white/10'
                }`}
                title="Historique"
              >
                <History size={14} />
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="bg-white/15 border-0 text-white rounded-lg px-2 py-1 cursor-pointer hover:bg-white/25 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Vue Chat ── */}
          {view === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3.5 flex flex-col gap-2.5">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <img
                        src={DR_LO_PHOTO} alt=""
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0 mr-1.5 self-end mb-0.5"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div
                      className={`max-w-[78%] px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-sage text-white rounded-2xl rounded-br-md'
                          : 'bg-paper text-ink rounded-2xl rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start items-end gap-1.5">
                    <img src={DR_LO_PHOTO} alt="" className="w-6 h-6 rounded-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="bg-paper rounded-2xl rounded-bl-md px-3.5 py-2.5 flex gap-1.5 items-center">
                      {[0, 0.18, 0.36].map((delay, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted inline-block" style={{ animation: `typingDot 0.9s ease ${delay}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {!KORIS_CONFIG.active && (
                <div className="px-3.5 py-0.5 flex-shrink-0">
                  <span className="text-[10px] text-muted flex items-center gap-1"><Zap size={10} /> Utilisera des Koris (bientôt)</span>
                </div>
              )}

              {limitReached ? (
                <div className="px-4 py-3 border-t border-line text-center flex-shrink-0">
                  <p className="m-0 text-[13px] text-ink-soft leading-snug">
                    Tu as atteint la limite de messages pour aujourd'hui. Reviens demain pour continuer avec Dr Lo.
                  </p>
                </div>
              ) : (
                <div className="px-2.5 pt-2 pb-3 border-t border-line flex gap-1.5 items-end flex-shrink-0">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ecrire un message... (${KORIS_COSTS.chat} Kori/msg · solde ${balance})`}
                    rows={1}
                    disabled={loading || !isAiAvailable()}
                    className="flex-1 resize-none border-[1.5px] border-line rounded-xl px-2.5 py-2 text-[13px] font-sans bg-paper text-ink leading-5 overflow-y-auto min-h-9 max-h-[116px] outline-none focus:border-sage/60 transition-colors"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim() || !isAiAvailable()}
                    className={`w-9 h-9 rounded-xl border-0 flex-shrink-0 flex items-center justify-center transition-colors ${
                      loading || !input.trim() || !isAiAvailable() ? 'bg-line text-muted cursor-default' : 'bg-sage text-white cursor-pointer hover:bg-sage/90'
                    }`}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Vue Historique ── */}
          {view === 'history' && !selectedConv && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="m-0 text-[13px] font-bold text-ink">Conversations</p>
                <button
                  onClick={startNewConversation}
                  className="text-[11px] font-semibold text-sage bg-sage-soft border-0 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-sage-soft/70 transition-colors"
                >
                  + Nouvelle
                </button>
              </div>

              {!userId ? (
                <p className="text-[13px] text-muted text-center mt-5">
                  Connecte-toi pour voir tes conversations.
                </p>
              ) : loadingHistory ? (
                <p className="text-[13px] text-muted text-center mt-5">Chargement…</p>
              ) : conversations.length === 0 ? (
                <p className="text-[13px] text-muted text-center mt-5 leading-relaxed">
                  Aucune conversation sauvegardée.<br />Pose une question à Dr Lô !
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {conversations.map(conv => {
                    const lastMsg = conv.messages.filter(m => m.role === 'user').pop();
                    return (
                      <button
                        key={conv.id}
                        className="conv-item w-full text-left px-3 py-2.5 rounded-xl border border-line bg-card cursor-pointer transition-colors"
                        onClick={() => setSelectedConv(conv)}
                      >
                        <p className="m-0 mb-0.5 text-xs font-semibold text-ink overflow-hidden text-ellipsis whitespace-nowrap">
                          {lastMsg?.content ?? 'Conversation'}
                        </p>
                        <p className="m-0 text-[11px] text-muted">
                          {formatDate(conv.updated_at)} · {conv.messages.length} messages
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Vue conversation sélectionnée ── */}
          {view === 'history' && selectedConv && (
            <>
              <div className="px-3 py-2 border-b border-line flex-shrink-0">
                <button
                  onClick={() => setSelectedConv(null)}
                  className="text-xs text-sage bg-transparent border-0 cursor-pointer font-semibold flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Retour
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
                {selectedConv.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <img src={DR_LO_PHOTO} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mr-1.5 self-end mb-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <div
                      className={`max-w-[78%] px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-sage text-white rounded-2xl rounded-br-md'
                          : 'bg-paper text-ink rounded-2xl rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2.5 border-t border-line flex-shrink-0">
                <button
                  onClick={startNewConversation}
                  className="w-full py-2 rounded-xl border-0 bg-sage text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-sage/90 transition-colors"
                >
                  Continuer avec Dr Lô <ArrowRight size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Pill FAB ── */}
      <div
        className="dr-lo-pill fixed bottom-5 right-5 z-[10000] flex items-center rounded-full bg-ink cursor-pointer select-none"
        style={{ padding: '6px', boxShadow: '0 6px 22px rgba(23,24,27,.28)', transition: transitionStyle }}
        onClick={handlePillClick}
        onMouseEnter={handlePillHover}
        onMouseLeave={handlePillLeave}
        role="button"
        aria-label={`Parler à Dr Lô, ${KORIS_COSTS.chat} Kori par message`}
        tabIndex={0}
      >
        {/* Avatar */}
        <div className="relative w-[46px] h-[46px] flex-shrink-0">
          <img
            src={DR_LO_PHOTO}
            alt="Dr Lô"
            className="w-full h-full rounded-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="absolute top-[3px] right-[3px] w-[11px] h-[11px] rounded-full bg-ok" style={{ border: '2.5px solid #17181B' }} />
          {!pillExpanded && (
            <span
              className="fab-pulse-ring absolute rounded-full pointer-events-none"
              style={{
                inset: '-4px',
                border: '2px solid rgba(159,188,175,.55)',
                animation: 'fabPulse 2.4s ease-out infinite',
              }}
            />
          )}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center" style={{ border: '2.5px solid #17181B' }}>
              {unread}
            </span>
          )}
        </div>

        {/* Text */}
        <div
          className={`dr-lo-pill-text text-[#F4F1E9] ${pillExpanded ? '' : 'collapsed'}`}
          style={{ maxWidth: pillExpanded ? '190px' : '0', paddingRight: pillExpanded ? '8px' : '0', paddingLeft: pillExpanded ? '10px' : '0', transition: transitionStyle }}
        >
          <b className="block text-[13.5px] font-bold leading-tight">Parler à Dr Lô</b>
          <span className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: '#BFB7A6' }}>
            <img src="/kori.png" alt="" className="w-[13px] h-[13px] rounded-full object-cover" />
            {KORIS_COSTS.chat} Kori par message
          </span>
        </div>
      </div>
    </>
  );
};

export default FloatingChat;

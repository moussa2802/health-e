import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, limit } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { getCompatibilityHistory } from '../../services/compatibilityService';
import { KORIS_CONFIG } from '../../utils/korisConfig';

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationId = useRef<string>(`conv_${Date.now()}`);

  const onboarding = getOnboardingProfile();
  const prenom = onboarding?.prenom ?? '';

  // Message de bienvenue
  useEffect(() => {
    if (open && view === 'chat' && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Salut ${prenom || 'toi'} ! 😊 Comment puis-je t'aider aujourd'hui ?`,
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
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const context = await buildFullContext(userId);

      // Historique: on exclut le message de bienvenue (index 0) et on n'inclut pas le dernier user qu'on vient d'ajouter
      const historique = messages
        .filter((_, i) => i > 0)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/.netlify/functions/dr-lo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, historique, context }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response ?? "Je n'ai pas pu répondre. Réessaie dans un instant.",
        timestamp: new Date().toISOString(),
        koris_consumed: data.koris_consumed ?? 0,
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      if (!open) setUnread(n => n + 1);

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
      content: `Salut ${prenom || 'toi'} ! 😊 Comment puis-je t'aider aujourd'hui ?`,
      timestamp: new Date().toISOString(),
    }]);
    setView('chat');
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
        .dr-lo-fab { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .dr-lo-fab:hover { transform: scale(1.07); box-shadow: 0 6px 28px rgba(99,102,241,0.55) !important; }
        .chat-user-bubble { background: linear-gradient(135deg,#3B82F6,#6366F1); color:#fff; border-radius:16px 16px 4px 16px; }
        .chat-bot-bubble  { background:#F1F5F9; color:#0A2342; border-radius:16px 16px 16px 4px; }
        .chat-input-area:focus { outline:none; border-color:rgba(99,102,241,0.5) !important; }
        .conv-item:hover { background:#F8FAFF; }
      `}</style>

      {/* ── Fenêtre ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 20,
          width: 340, maxHeight: '72vh',
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          zIndex: 9999, overflow: 'hidden',
          fontFamily: "'Inter',-apple-system,sans-serif",
          border: '1px solid rgba(0,0,0,0.07)',
          animation: 'chatSlideIn 0.2s ease',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#1E40AF,#6366F1)',
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <img
              src={DR_LO_PHOTO} alt="Dr Lô"
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.35)', flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>Dr Lô</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                En ligne
              </p>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => { setView('chat'); setSelectedConv(null); }}
                style={{
                  padding: '4px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: view === 'chat' ? 'rgba(255,255,255,0.25)' : 'transparent',
                  color: '#fff',
                }}
              >💬</button>
              <button
                onClick={() => setView('history')}
                style={{
                  padding: '4px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: view === 'history' ? 'rgba(255,255,255,0.25)' : 'transparent',
                  color: '#fff',
                }}
                title="Historique"
              >🕐</button>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '3px 8px', cursor: 'pointer', fontSize: 13 }}
            >✕</button>
          </div>

          {/* ── Vue Chat ── */}
          {view === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <img
                        src={DR_LO_PHOTO} alt=""
                        style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginRight: 6, alignSelf: 'flex-end', marginBottom: 2 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div
                      className={msg.role === 'user' ? 'chat-user-bubble' : 'chat-bot-bubble'}
                      style={{ maxWidth: '78%', padding: '9px 12px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                    <img src={DR_LO_PHOTO} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="chat-bot-bubble" style={{ padding: '10px 14px', display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 0.18, 0.36].map((delay, i) => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', display: 'inline-block', animation: `typingDot 0.9s ease ${delay}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {!KORIS_CONFIG.active && (
                <div style={{ padding: '3px 14px', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: '#CBD5E1' }}>⚡ Utilisera des Koris (bientôt)</span>
                </div>
              )}

              <div style={{ padding: '8px 10px 12px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 7, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  ref={inputRef}
                  className="chat-input-area"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrire un message…"
                  rows={1}
                  disabled={loading}
                  style={{
                    flex: 1, resize: 'none', border: '1.5px solid #E2E8F0',
                    borderRadius: 12, padding: '8px 11px', fontSize: 13,
                    fontFamily: 'inherit', background: '#F8FAFF', color: '#0A2342',
                    lineHeight: '20px', overflowY: 'auto',
                    minHeight: 36, maxHeight: 116,
                    transition: 'height 0.1s ease',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: 'none',
                    background: loading || !input.trim() ? '#E2E8F0' : 'linear-gradient(135deg,#3B82F6,#6366F1)',
                    color: '#fff', fontSize: 15, cursor: loading || !input.trim() ? 'default' : 'pointer',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                >→</button>
              </div>
            </>
          )}

          {/* ── Vue Historique ── */}
          {view === 'history' && !selectedConv && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0A2342' }}>Conversations</p>
                <button
                  onClick={startNewConversation}
                  style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
                >
                  + Nouvelle
                </button>
              </div>

              {!userId ? (
                <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 20 }}>
                  Connecte-toi pour voir tes conversations.
                </p>
              ) : loadingHistory ? (
                <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 20 }}>Chargement…</p>
              ) : conversations.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
                  Aucune conversation sauvegardée.<br />Pose une question à Dr Lô !
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {conversations.map(conv => {
                    const lastMsg = conv.messages.filter(m => m.role === 'user').pop();
                    return (
                      <button
                        key={conv.id}
                        className="conv-item"
                        onClick={() => setSelectedConv(conv)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 12px',
                          borderRadius: 12, border: '1px solid #E2E8F0',
                          background: '#fff', cursor: 'pointer',
                        }}
                      >
                        <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 600, color: '#0A2342', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lastMsg?.content ?? 'Conversation'}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>
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
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
                <button
                  onClick={() => setSelectedConv(null)}
                  style={{ fontSize: 12, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  ← Retour
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedConv.messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <img src={DR_LO_PHOTO} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginRight: 6, alignSelf: 'flex-end', marginBottom: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <div
                      className={msg.role === 'user' ? 'chat-user-bubble' : 'chat-bot-bubble'}
                      style={{ maxWidth: '78%', padding: '9px 12px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
                <button
                  onClick={startNewConversation}
                  style={{
                    width: '100%', padding: '9px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg,#3B82F6,#6366F1)',
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Continuer avec Dr Lô →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bouton flottant ── */}
      <button
        className="dr-lo-fab"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          width: 58, height: 58, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#1E40AF,#6366F1)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.42)',
          cursor: 'pointer', zIndex: 10000,
          padding: 0, overflow: 'hidden',
        }}
        title="Parler à Dr Lô"
      >
        <img
          src={DR_LO_PHOTO}
          alt="Dr Lô"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
            const btn = (e.target as HTMLImageElement).parentElement!;
            if (!btn.querySelector('.drlo-fallback')) {
              const span = document.createElement('span');
              span.className = 'drlo-fallback';
              span.textContent = '🩺';
              span.style.fontSize = '26px';
              btn.appendChild(span);
            }
          }}
        />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 18, height: 18, borderRadius: '50%',
            background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unread}
          </span>
        )}
      </button>
    </>
  );
};

export default FloatingChat;

/**
 * MessagesDrLoPage — les messages que Dr Lô a laissés à sa communauté.
 *   /messages-dr-lo        la liste
 *   /messages-dr-lo/:id    un message, avec les réactions ❤️ 🙏 💪
 * Rien de ce que la personne a répondu n'est visible des autres : seuls des totaux s'affichent.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import MessageComments from '../../components/accueil/MessageComments';
import { useAuth } from '../../contexts/AuthContext';
import {
  getInbox, openMessage, reactToMessage, REACTIONS,
  type Counts, type InboxItem, type Reaction,
} from '../../services/drloBroadcastService';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const day = (t: number) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const h1: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title };

const MessagesDrLoPage: React.FC = () => {
  const palette = usePalette();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, authReady } = useAuth();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [msg, setMsg] = useState<InboxItem | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mine, setMine] = useState<Reaction | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) { navigate('/', { replace: true }); return; }
    setError(''); setMsg(null); setItems(null);
    if (id) {
      openMessage(id).then(r => { setMsg(r.message); setAudioUrl(r.audioUrl ?? null); setCounts(r.counts); setMine(r.message.reaction); })
        .catch(() => setError('Ce message n\'est plus disponible.'));
    } else {
      getInbox().then(r => setItems(r.items)).catch(() => setError('Impossible de charger tes messages pour le moment.'));
    }
  }, [id, authReady, isAuthenticated, navigate]);

  const react = async (r: Reaction) => {
    if (!msg) return;
    const next = mine === r ? null : r;
    setMine(next);
    try { const res = await reactToMessage(msg.id, next); setCounts(res.counts); setMine(res.reaction); }
    catch { setMine(mine); }
  };

  if (id) {
    return (
      <DrLoShell back={{ to: '/messages-dr-lo', label: 'Mes messages' }} palette={palette}>
        <p style={{ margin: '18px 0 0', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Dr Lô</p>
        <h1 style={h1}>Un message pour toi</h1>
        {error && <p role="alert" style={{ marginTop: 16, color: DC.muted, fontSize: 15 }}>{error} <Link to="/" style={{ color: palette.accent }}>Retour</Link></p>}
        {!msg && !error && <p style={{ marginTop: 16, color: DC.faint }}>Un instant…</p>}
        {msg && (
          <>
            <article style={{ ...card, marginTop: 16 }}>
              <p style={{ margin: 0, fontSize: 12, color: DC.faint }}>{day(msg.at)}</p>
              {msg.audio && (audioUrl
                ? <audio controls preload="metadata" src={audioUrl} aria-label="Le vocal de Dr Lô" style={{ width: '100%', marginTop: 10 }} />
                : <p style={{ margin: '10px 0 0', fontSize: 14, color: DC.muted }}>Le vocal n'est pas disponible pour le moment. Réessaie dans un instant.</p>)}
              {msg.text && <p style={{ margin: '10px 0 0', fontSize: 16.5, lineHeight: 1.65, color: DC.text, whiteSpace: 'pre-wrap' }}>{msg.text}</p>}
            </article>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }} role="group" aria-label="Ta réaction">
              {REACTIONS.map(r => (
                <button key={r.id} type="button" onClick={() => react(r.id)} aria-pressed={mine === r.id} aria-label={r.label} className="drl-btn"
                  style={{ flex: 1, minHeight: 52, borderRadius: 16, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: DC.text,
                    border: `1px solid ${mine === r.id ? palette.accent : DC.line}`, background: mine === r.id ? 'rgba(242,182,109,.15)' : DC.glass }}>
                  <span aria-hidden="true">{r.emoji}</span> {counts ? counts[r.id] : ''}
                </button>
              ))}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: DC.faint, textAlign: 'center' }}>Dr Lô ne voit que des totaux, jamais qui a réagi.</p>
            {msg.commentsOpen && <MessageComments messageId={msg.id} palette={palette} />}
          </>
        )}
      </DrLoShell>
    );
  }

  return (
    <DrLoShell back={{ to: '/', label: 'Accueil' }} palette={palette}>
      <p style={{ margin: '18px 0 0', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Dr Lô</p>
      <h1 style={h1}>Les messages de Dr Lô</h1>
      {error && <p role="alert" style={{ marginTop: 16, color: DC.muted, fontSize: 15 }}>{error}</p>}
      {!items && !error && <p style={{ marginTop: 16, color: DC.faint }}>Un instant…</p>}
      {items && items.length === 0 && <p style={{ marginTop: 16, color: DC.muted, fontSize: 15, lineHeight: 1.55 }}>Pas encore de message. Quand Dr Lô t'en laissera un, tu le retrouveras ici.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {(items ?? []).map(i => (
          <Link key={i.id} to={`/messages-dr-lo/${i.id}`} className="drl-btn" style={{ ...card, textDecoration: 'none', display: 'block', borderColor: i.seen ? DC.line : palette.accent }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: DC.faint }}>
              <span>{day(i.at)}</span>{!i.seen && <b style={{ color: palette.accent }}>Nouveau</b>}
            </span>
            <span style={{ marginTop: 6, fontSize: 15, lineHeight: 1.5, color: DC.soft, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{i.text || '🎙 Un vocal de Dr Lô'}</span>
          </Link>
        ))}
      </div>
    </DrLoShell>
  );
};

export default MessagesDrLoPage;

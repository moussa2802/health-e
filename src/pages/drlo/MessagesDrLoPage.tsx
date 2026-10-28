/**
 * MessagesDrLoPage — les messages que Dr Lô a laissés à sa communauté.
 *   /messages-dr-lo        la liste
 *   /messages-dr-lo/:id    un message, avec les réactions ❤️ 🙏 💪
 * Rien de ce que la personne a répondu n'est visible des autres : seuls des totaux s'affichent.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, BellOff } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import MessageComments, { FollowUp, ThreadView } from '../../components/accueil/MessageComments';
import RealDrLoBadge, { RealDrLoPhoto } from '../../components/accueil/RealDrLoBadge';
import WriteDrLoCard from '../../components/accueil/WriteDrLoCard';
import ChannelsLinkCard from '../../components/accueil/ChannelsLinkCard';
import { useAuth } from '../../contexts/AuthContext';
import { followUpQuestion, getMyThreads, markDrloAnswersSeen, type MyQuestion } from '../../services/drloQuestionService';
import {
  getInbox, markListened, muteMessage, openMessage, reactToMessage, REACTIONS,
  type Counts, type InboxItem, type Reaction,
} from '../../services/drloBroadcastService';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const day = (t: number) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const h1: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title };

/** Appelle onMount une seule fois, quand la discussion est affichée. */
const SeenMarker: React.FC<{ onMount: () => void }> = ({ onMount }) => { useEffect(() => { const t = window.setTimeout(onMount, 1500); return () => window.clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null; };

const MessagesDrLoPage: React.FC = () => {
  const palette = usePalette();
  const { id, qid } = useParams<{ id: string; qid: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, authReady } = useAuth();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [news, setNews] = useState({ unread: 0, replies: 0, comments: 0 });
  const [msg, setMsg] = useState<InboxItem | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mine, setMine] = useState<Reaction | null>(null);
  const [error, setError] = useState('');
  const [disc, setDisc] = useState<MyQuestion[] | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) { navigate('/', { replace: true }); return; }
    setError(''); setMsg(null); setItems(null);
    if (qid) {
      setDisc(null);
      getMyThreads().then(r => { setDisc(r.items); }).catch(() => setError('Impossible de charger cette discussion pour le moment.'));
      return;
    }
    getMyThreads().then(r => setDisc(r.items)).catch(() => setDisc([]));
    if (id) {
      openMessage(id).then(r => { setMsg(r.message); setAudioUrl(r.audioUrl ?? null); setCounts(r.counts); setMine(r.message.reaction); })
        .catch(() => setError('Ce message n\'est plus disponible.'));
    } else {
      getInbox().then(r => { setItems(r.items); setNews({ unread: r.unread, replies: r.newReplies ?? 0, comments: r.newComments ?? 0 }); }).catch(() => setError('Impossible de charger tes messages pour le moment.'));
    }
  }, [id, qid, authReady, isAuthenticated, navigate]);

  const react = async (r: Reaction) => {
    if (!msg) return;
    const next = mine === r ? null : r;
    setMine(next);
    try { const res = await reactToMessage(msg.id, next); setCounts(res.counts); setMine(res.reaction); }
    catch { setMine(mine); }
  };

  const discNews = (disc ?? []).reduce((n, d) => n + d.news, 0);
  const toggleMute = async (mid: string, muted: boolean) => {
    setItems(list => list && list.map(i => (i.id === mid ? { ...i, muted, newComments: muted ? 0 : i.newComments } : i)));
    setMsg(m => (m && m.id === mid ? { ...m, muted } : m));
    try { await muteMessage(mid, muted); } catch { setItems(list => list && list.map(i => (i.id === mid ? { ...i, muted: !muted } : i))); setMsg(m => (m && m.id === mid ? { ...m, muted: !muted } : m)); }
  };
  const muteBtn = (mid: string, muted: boolean, style?: React.CSSProperties): React.ReactElement => (
    <button type="button" onClick={() => toggleMute(mid, !muted)} aria-pressed={muted}
      aria-label={muted ? 'Réactiver les alertes de commentaires sur ce message' : 'Ne plus être alerté des commentaires sur ce message'}
      title={muted ? 'Alertes coupées. Toucher pour réactiver' : 'Couper les alertes de commentaires'} className="drl-btn"
      style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: muted ? DC.faint : palette.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {muted ? <BellOff size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}
    </button>
  );

  if (qid) {
    const q = disc?.find(x => x.id === qid) ?? null;
    const reload = () => getMyThreads().then(r => setDisc(r.items)).catch(() => {});
    // Une fois affichée, la discussion est marquée comme lue (les « Nouveau » restent visibles pendant cette visite)
    return (
      <DrLoShell back={{ to: '/messages-dr-lo', label: 'Mes messages' }} palette={palette}>
        <p style={{ margin: '18px 0 0', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Dr Lô</p>
        <h1 style={h1}>Ta discussion avec Dr Lô</h1>
        {error && <p role="alert" style={{ marginTop: 16, color: DC.muted, fontSize: 15 }}>{error}</p>}
        {!disc && !error && <p style={{ marginTop: 16, color: DC.faint }}>Un instant…</p>}
        {disc && !q && <p style={{ marginTop: 16, color: DC.muted, fontSize: 15 }}>Cette discussion n'est plus disponible. <Link to="/messages-dr-lo" style={{ color: palette.accent }}>Retour</Link></p>}
        {q && (
          <>
            <article style={{ ...card, marginTop: 16 }}>
              <RealDrLoBadge palette={palette} kind={q.thread.some(e => e.from === 'drlo' && e.audioSec > 0) ? 'vocal' : 'texte'} />
              <p style={{ margin: '12px 0 0', fontSize: 12, color: DC.faint }}>Ta question du {day(q.createdAt)}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14.5, color: DC.muted, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>« {q.text} »</p>
              <ThreadView entries={q.thread} author="Toi" palette={palette} />
              {q.closed && <p style={{ margin: '12px 0 0', fontSize: 13.5, color: DC.muted }}>Dr Lô a clôturé cette discussion.</p>}
              {!q.closed && q.canReply && <FollowUp send={t => followUpQuestion(q.id, t)} palette={palette} onSent={reload} />}
              {!q.closed && !q.canReply && q.thread.length > 0 && q.thread[q.thread.length - 1].from === 'user' && <p style={{ margin: '12px 0 0', fontSize: 13.5, color: DC.muted }}>Dr Lô te répondra ici.</p>}
            </article>
            <SeenMarker onMount={() => { markDrloAnswersSeen().catch(() => {}); }} />
          </>
        )}
      </DrLoShell>
    );
  }

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
              <RealDrLoBadge palette={palette} kind={msg.audio ? 'vocal' : 'texte'} />
              <p style={{ margin: '12px 0 0', fontSize: 12, color: DC.faint }}>{day(msg.at)}</p>
              {msg.audio && (audioUrl
                ? <audio controls preload="metadata" src={audioUrl} onPlay={() => { if (id) markListened(id).catch(() => {}); }} aria-label="Le vocal de Dr Lô" style={{ width: '100%', marginTop: 10 }} />
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
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: DC.faint, textAlign: 'center' }}>Tes réactions restent anonymes. Dr Lô peut voir si tu as lu ou écouté un message envoyé à toute la communauté.</p>
            {msg.commentsOpen && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: DC.faint }}>{msg.muted ? 'Alertes de commentaires coupées' : 'Tu es alerté des nouveaux commentaires'}</p>
                {muteBtn(msg.id, !!msg.muted)}
              </div>
            )}
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
      <ChannelsLinkCard palette={palette} />
      <WriteDrLoCard palette={palette} />
      {error && <p role="alert" style={{ marginTop: 16, color: DC.muted, fontSize: 15 }}>{error}</p>}
      {!items && !error && <p style={{ marginTop: 16, color: DC.faint }}>Un instant…</p>}
      {items && items.length === 0 && !(disc && disc.length > 0) && <p style={{ marginTop: 16, color: DC.muted, fontSize: 15, lineHeight: 1.55 }}>Pas encore de message. Quand Dr Lô t'en laissera un, tu le retrouveras ici.</p>}
      {((items && items.length > 0) || (disc && disc.length > 0)) && (
        <section aria-label="Du nouveau" style={{ ...card, marginTop: 16, borderColor: (news.unread + news.replies + news.comments + discNews) > 0 ? palette.accent : DC.line }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Du nouveau</p>
          {(news.unread + news.replies + news.comments + discNews) === 0 ? (
            <p style={{ margin: '8px 0 0', fontSize: 14.5, color: DC.muted }}>Tu es à jour. Rien de nouveau pour le moment.</p>
          ) : (
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: DC.text }}>
              {discNews > 0 && <li>🩺 Dr Lô t'a répondu personnellement</li>}
              {news.unread > 0 && <li>📩 {news.unread} nouveau{news.unread > 1 ? 'x' : ''} message{news.unread > 1 ? 's' : ''} de Dr Lô</li>}
              {news.replies > 0 && <li>💬 Dr Lô a répondu à {news.replies > 1 ? `${news.replies} de tes commentaires` : 'un de tes commentaires'}</li>}
              {news.comments > 0 && <li>🗨 {news.comments} nouveau{news.comments > 1 ? 'x' : ''} commentaire{news.comments > 1 ? 's' : ''} de la communauté</li>}
            </ul>
          )}
        </section>
      )}
      {disc && disc.length > 0 && (
        <section aria-label="Tes échanges avec Dr Lô" style={{ marginTop: 16 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.text }}>Tes échanges avec Dr Lô</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {disc.map(d => {
              const lastD = [...d.thread].reverse().find(e => e.from === 'drlo');
              const upd = d.thread.some(e => e.from === 'drlo' && e.updated);
              return (
                <Link key={d.id} to={`/messages-dr-lo/discussion/${d.id}`} className="drl-btn" style={{ ...card, textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'flex-start', borderColor: d.news > 0 ? palette.accent : DC.line }}>
                  <RealDrLoPhoto size={40} palette={palette} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: DC.faint }}>
                      <span>Réponse à ta question du {day(d.createdAt)}</span>
                      {d.news > 0 && <b style={{ color: palette.accent }}>{upd ? 'Mis à jour' : 'Nouveau'}</b>}
                    </span>
                    <span style={{ display: '-webkit-box', marginTop: 6, fontSize: 15, lineHeight: 1.5, color: DC.soft, overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                      {lastD ? (lastD.text || '🎙 Un vocal de Dr Lô') : d.text}
                    </span>
                    {(d.closed || d.canReply) && (
                      <span style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {d.canReply && <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(242,182,109,.16)', color: palette.accent }}>Tu peux répondre</span>}
                        {d.closed && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: DC.glass, color: DC.muted }}>Clôturée</span>}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      {items && items.length > 0 && <h2 style={{ margin: '20px 0 0', fontSize: 15, fontWeight: 700, color: DC.text }}>Messages à toute la communauté</h2>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        {(items ?? []).map(i => (
          <div key={i.id} style={{ position: 'relative' }}>
            <Link to={`/messages-dr-lo/${i.id}`} className="drl-btn" style={{ ...card, textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'flex-start', borderColor: i.seen && !(i.newReplies || i.newComments) ? DC.line : palette.accent, paddingBottom: i.commentsOpen ? 16 : undefined }}>
              <RealDrLoPhoto size={40} palette={palette} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: DC.faint }}>
                  <span>{day(i.at)}</span>{!i.seen && <b style={{ color: palette.accent }}>Nouveau</b>}
                </span>
                <span style={{ display: '-webkit-box', marginTop: 6, fontSize: 15, lineHeight: 1.5, color: DC.soft, overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{i.text || '🎙 Un vocal de Dr Lô'}</span>
                {(i.commentsOpen || (i.newReplies ?? 0) > 0) && (
                  <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8, paddingRight: 52 }}>
                    {(i.newReplies ?? 0) > 0 && <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(242,182,109,.16)', color: palette.accent }}>Dr Lô t'a répondu</span>}
                    {i.commentsOpen && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: DC.muted }}>
                        💬 {i.commentsTotal ?? 0}
                        {(i.newComments ?? 0) > 0 && <span aria-label={`${i.newComments} nouveau${(i.newComments ?? 0) > 1 ? 'x' : ''}`} style={{ minWidth: 20, height: 20, padding: '0 6px', boxSizing: 'border-box', borderRadius: 10, background: '#E8664F', color: '#fff', fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i.newComments}</span>}
                        {i.muted && <span style={{ fontSize: 11.5, color: DC.faint }}>alertes coupées</span>}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </Link>
            {i.commentsOpen && muteBtn(i.id, !!i.muted, { position: 'absolute', right: 10, bottom: 10, width: 40, height: 40, borderRadius: 12 })}
          </div>
        ))}
      </div>
    </DrLoShell>
  );
};

export default MessagesDrLoPage;

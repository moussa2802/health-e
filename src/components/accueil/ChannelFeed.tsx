/**
 * ChannelFeed — le fil d'une chaîne, côté personne.
 * Membre : tout est ouvert (texte, vocal, réactions). Non-membre : seules les publications « aperçu » sont ouvertes,
 * les autres apparaissent verrouillées (aucun contenu ni lien d'écoute n'est envoyé par le serveur).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Lock, Mic } from 'lucide-react';
import { DC, card } from './DrLoShell';
import { RealDrLoPhoto } from './RealDrLoBadge';
import ChannelComments from './ChannelComments';
import type { MomentPalette } from '../../utils/drloMoment';
import { REACTIONS, type Reaction } from '../../services/drloBroadcastService';
import { getFeed, markPostListened, markPostsSeen, reactToPost, type ChannelPost } from '../../services/drloChannelService';

const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const when = (t: number) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
const LONG = 320;

const Post: React.FC<{ p: ChannelPost; member: boolean; palette: MomentPalette }> = ({ p, member, palette }) => {
  const [more, setMore] = useState(false);
  const [mine, setMine] = useState<Reaction | null>(p.mine);
  const [counts, setCounts] = useState(p.counts);
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [nComments, setNComments] = useState(p.comments);
  const react = async (r: Reaction) => {
    if (busy) return;
    setBusy(true);
    try { const res = await reactToPost(p.id, mine === r ? null : r); setMine(res.reaction); setCounts(res.counts); } catch { /* silencieux */ } finally { setBusy(false); }
  };
  if (p.locked) {
    return (
      <article style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, borderStyle: 'dashed' }} aria-label="Publication verrouillée">
        <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Lock size={17} color={DC.faint} /></span>
        <div>
          <p style={{ margin: 0, fontSize: 14, color: DC.soft, fontWeight: 600 }}>{p.hasAudio ? `Vocal de Dr Lô · ${mmss(p.audioSec)}` : 'Texte de Dr Lô'}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: DC.faint }}>{when(p.at)} · Rejoins la chaîne pour voir</p>
        </div>
      </article>
    );
  }
  const text = p.text ?? '';
  const cut = !more && text.length > LONG;
  return (
    <article id={`post-${p.id}`} style={{ ...card, scrollMarginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <RealDrLoPhoto size={36} palette={palette} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: DC.text }}>Dr Lô</p>
          <p style={{ margin: 0, fontSize: 12, color: DC.faint }}>{when(p.at)}{p.hasAudio ? ' · Vocal' : ''}</p>
        </div>
        {p.preview && !member && <span style={{ padding: '2px 9px', borderRadius: 999, background: 'rgba(127,209,160,.15)', color: DC.ok, fontSize: 11.5, fontWeight: 700 }}>Aperçu gratuit</span>}
        {member && !p.seen && <span style={{ padding: '2px 9px', borderRadius: 999, background: 'rgba(242,182,109,.18)', color: palette.accent, fontSize: 11.5, fontWeight: 700 }}>Nouveau</span>}
      </div>
      {p.title && <h3 style={{ margin: '12px 0 0', fontSize: 17, fontWeight: 700, color: DC.text, lineHeight: 1.35 }}>{p.title}</h3>}
      {p.audioUrl && (
        <div style={{ marginTop: 10 }}>
          <audio controls preload="metadata" src={p.audioUrl} aria-label={`Vocal de Dr Lô, ${mmss(p.audioSec)}`} style={{ width: '100%', height: 44 }} onPlay={() => { if (member) markPostListened(p.id).catch(() => {}); }} />
        </div>
      )}
      {p.hasAudio && !p.audioUrl && <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint, display: 'flex', alignItems: 'center', gap: 6 }}><Mic size={14} aria-hidden="true" /> Le vocal n'est pas disponible pour le moment.</p>}
      {text && (
        <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {cut ? `${text.slice(0, LONG).trimEnd()}…` : text}
          {text.length > LONG && <button type="button" onClick={() => setMore(m => !m)} style={{ display: 'block', marginTop: 6, background: 'none', border: 0, padding: 0, color: palette.accent, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{more ? 'Réduire' : 'Lire la suite'}</button>}
        </p>
      )}
      {member && (
        <div role="group" aria-label="Réagir" style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {REACTIONS.map(r => (
            <button key={r.id} type="button" onClick={() => react(r.id)} aria-pressed={mine === r.id} aria-label={r.label} className="drl-btn"
              style={{ minHeight: 40, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 14, border: `1px solid ${mine === r.id ? palette.accent : DC.line}`, background: mine === r.id ? 'rgba(242,182,109,.15)' : DC.glass, color: DC.soft }}>
              {r.emoji} <span style={{ fontSize: 12.5, color: DC.muted }}>{counts[r.id]}</span>
            </button>
          ))}
        </div>
      )}
      {member && (p.commentsOpen || nComments > 0) && (
        <>
          <button type="button" onClick={() => setShowComments(v => !v)} aria-expanded={showComments} className="drl-btn"
            style={{ marginTop: 10, minHeight: 40, padding: 0, background: 'none', border: 0, color: DC.muted, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            💬 {showComments ? 'Masquer les commentaires' : nComments > 0 ? `${nComments} commentaire${nComments > 1 ? 's' : ''}` : 'Commenter'}
          </button>
          {showComments && <ChannelComments postId={p.id} palette={palette} onCount={setNComments} />}
        </>
      )}
    </article>
  );
};

const ChannelFeed: React.FC<{ channelId: string; member: boolean; palette: MomentPalette }> = ({ channelId, member, palette }) => {
  const [posts, setPosts] = useState<ChannelPost[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    getFeed(channelId).then(r => { if (live) setPosts(r.posts); }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Erreur'); });
    return () => { live = false; };
  }, [channelId, member]);
  // À l'ouverture : on descend à la première publication non lue (sinon à la plus récente). Une seule fois.
  const scrolled = useRef(false);
  useEffect(() => {
    if (!posts || scrolled.current || posts.length < 2) return;
    scrolled.current = true;
    const target = member ? (posts.find(p => !p.locked && !p.seen) ?? posts[posts.length - 1]) : null;
    if (!target) return;
    window.setTimeout(() => document.getElementById(`post-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
  }, [posts, member]);
  // Les publications ouvertes sont marquées « vues » après un court instant (membres seulement)
  useEffect(() => {
    if (!member || !posts) return;
    const ids = posts.filter(p => !p.locked && !p.seen).map(p => p.id);
    if (!ids.length) return;
    const t = window.setTimeout(() => { markPostsSeen(channelId, ids.slice(0, 20)).catch(() => {}); }, 1500);
    return () => window.clearTimeout(t);
  }, [posts, member, channelId]);
  if (error) return <p role="alert" style={{ marginTop: 14, color: '#F09A7A', fontSize: 13.5 }}>{error}</p>;
  if (!posts) return <p style={{ marginTop: 14, color: DC.faint, fontSize: 14 }}>Un instant…</p>;
  if (posts.length === 0) return <p style={{ marginTop: 14, color: DC.muted, fontSize: 14.5, lineHeight: 1.55 }}>Dr Lô n'a pas encore publié ici. Tu seras prévenu dès la première publication.</p>;
  return (
    <section aria-label="Publications" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
      {posts.map(p => <Post key={p.id} p={p} member={member} palette={palette} />)}
    </section>
  );
};

export default ChannelFeed;

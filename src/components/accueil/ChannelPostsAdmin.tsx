/**
 * ChannelPostsAdmin — gérer UNE chaîne dans l'espace Dr Lô : publier (texte et/ou vocal, aperçu gratuit),
 * suivre les publications (vus, écoutes, réactions), voir les membres (prénoms seulement, jamais leurs résultats).
 */
import React, { useEffect, useRef, useState } from 'react';
import AudioPlayer from './AudioPlayer';
import { ArrowLeft, Eye, Loader2, Mic, Pencil, Send, Trash2 } from 'lucide-react';
import { blobToBase64, useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import VoiceInput from './VoiceInput';
import { DC, card } from './DrLoShell';
import ChannelCommentsAdmin from './ChannelCommentsAdmin';
import type { MomentPalette } from '../../utils/drloMoment';
import {
  createPost, deletePost, getMembers, listPosts, updatePost,
  type AdminChannel, type AdminPost, type AudienceKind, type MemberRow,
} from '../../services/drloChannelService';

const MAX = 4000;
const TITLE_MAX = 80;
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const when = (t: number) => (t ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const small: React.CSSProperties = { minHeight: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 };

/** Prénoms des membres (ou de ceux qui ont vu / écouté / pas encore vu une publication) : paginé, avec recherche. */
export const MemberList: React.FC<{ channelId: string; postId?: string; kind: AudienceKind; palette: MomentPalette }> = ({ channelId, postId, kind, palette }) => {
  const [items, setItems] = useState<MemberRow[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const seq = useRef(0);
  const load = (query: string, after?: string | null) => {
    const mine = ++seq.current;
    setLoading(true); setErr('');
    getMembers(channelId, { postId, kind, after, q: query }).then(r => {
      if (mine !== seq.current) return;
      setItems(prev => (after ? [...prev, ...r.items] : r.items)); setNext(r.next); setDone(true);
    }).catch(e => { if (mine === seq.current) setErr(e instanceof Error ? e.message : 'Erreur'); }).finally(() => { if (mine === seq.current) setLoading(false); });
  };
  useEffect(() => { setItems([]); setNext(null); setDone(false); const t = setTimeout(() => load(q), q ? 350 : 0); return () => clearTimeout(t); }, [q, kind, postId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ marginTop: 10 }}>
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un prénom" aria-label="Chercher un prénom" className="drl-input" style={{ ...field, minHeight: 44, padding: '0 14px' }} />
      {err && <p role="alert" style={{ margin: '8px 0 0', color: '#F09A7A', fontSize: 13 }}>{err}</p>}
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, maxHeight: 320, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {items.map((i, idx) => (
          <li key={`${i.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 42, borderTop: idx ? `1px solid ${DC.line}` : undefined }}>
            <span aria-hidden="true" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', background: 'rgba(242,182,109,.16)', color: palette.accent, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i.name.slice(0, 1).toUpperCase()}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: DC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</span>
            {kind !== 'unseen' && i.at > 0 && <span style={{ fontSize: 13, color: DC.faint, flexShrink: 0 }}>{when(i.at)}</span>}
          </li>
        ))}
        {done && !loading && items.length === 0 && <li style={{ padding: '10px 0', fontSize: 14, color: DC.faint }}>{q.trim() ? 'Aucun prénom trouvé.' : 'Personne pour l\'instant.'}</li>}
      </ul>
      {loading && <Loader2 size={16} className="animate-spin" aria-label="Chargement" style={{ marginTop: 8 }} />}
      {next && !loading && <button type="button" onClick={() => load(q, next)} className="drl-btn" style={{ marginTop: 8, width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.soft, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Voir plus ({items.length} affichés)</button>}
      <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint }}>Tu ne vois que les prénoms, jamais les résultats de tests.</p>
    </div>
  );
};

const Composer: React.FC<{ channel: AdminChannel; palette: MomentPalette; onPublished: () => void }> = ({ channel, palette, onPublished }) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const voice = useVoiceRecorder();
  const canSend = (text.trim().length >= 2 || !!voice.clip) && voice.state !== 'recording' && voice.state !== 'processing' && !busy && channel.status === 'active';
  const send = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const audio = voice.clip ? { data: await blobToBase64(voice.clip.blob), mime: voice.clip.mime, durationSec: voice.clip.durationSec } : undefined;
      await createPost({ channelId: channel.id, title: title.trim() || undefined, text: text.trim(), audio, preview, commentsOpen, notify });
      setMsg(`Publié dans « ${channel.name} ».`); setTitle(''); setText(''); setPreview(false); voice.reset(); onPublished();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const sw = (on: boolean, set: (v: boolean) => void, label: string, hint: string) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, fontSize: 14, color: DC.soft, cursor: 'pointer' }}>
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} style={{ marginTop: 3 }} />
      <span>{label}<span style={{ display: 'block', fontSize: 13, color: DC.faint }}>{hint}</span></span>
    </label>
  );
  return (
    <section style={card}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.text }}>Nouvelle publication</p>
      {channel.status !== 'active' && <p style={{ margin: '8px 0 0', fontSize: 14, color: '#F09A7A' }}>Cette chaîne est archivée : réactive-la pour publier.</p>}
      <input aria-label="Titre de la publication" maxLength={TITLE_MAX} value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre (facultatif)" className="drl-input" style={{ ...field, marginTop: 10, fontWeight: 700 }} />
      <textarea aria-label="Ta publication" rows={6} maxLength={MAX} value={text} onChange={e => setText(e.target.value)} placeholder="Écris comme tu parles…" className="drl-input" style={{ ...field, marginTop: 10, lineHeight: 1.5, resize: 'vertical', minHeight: 130 }} />
      <p style={{ margin: '4px 0 0', fontSize: 13, color: DC.faint, textAlign: 'right' }}>{text.length} / {MAX}</p>
      <div style={{ marginTop: 10 }}>
        <VoiceInput voice={voice} recordLabel="Enregistrer un vocal" readyHint="Le texte devient facultatif." />
      </div>
      {sw(preview, setPreview, 'Aperçu gratuit', 'Visible et écoutable par tout le monde, même sans être membre. Pour donner envie.')}
      {sw(commentsOpen, setCommentsOpen, 'Commentaires ouverts', 'Les membres peuvent commenter et tu peux leur répondre.')}
      {sw(notify, setNotify, 'Prévenir les membres', 'Notification neutre « Dr Lô a publié dans ' + channel.name + ' » (jamais le contenu). Pas de notification la nuit (22 h – 7 h), ni pour ceux qui ont coupé les alertes.')}
      {err && <p role="alert" style={{ margin: '12px 0 0', color: '#F09A7A', fontSize: 14 }}>{err}</p>}
      {msg && <p role="status" style={{ margin: '12px 0 0', color: DC.ok, fontSize: 14 }}>{msg}</p>}
      <button type="button" disabled={!canSend} onClick={send} className="drl-btn" style={{ marginTop: 14, width: '100%', minHeight: 48, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 15, cursor: canSend ? 'pointer' : 'default', opacity: canSend ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {busy ? <Loader2 size={16} className="animate-spin" aria-label="Publication" /> : <><Send size={16} aria-hidden="true" /> Publier{preview ? ' en aperçu' : ''}</>}
      </button>
    </section>
  );
};

const PostRow: React.FC<{ p: AdminPost; channelId: string; palette: MomentPalette; onChanged: () => void; onError: (m: string) => void }> = ({ p, channelId, palette, onChanged, onError }) => {
  const [open, setOpen] = useState<AudienceKind | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.text);
  const [draftTitle, setDraftTitle] = useState(p.title);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<unknown>) => { setBusy(true); onError(''); try { await f(); await onChanged(); } catch (e) { onError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(false); } };
  const tab = (k: AudienceKind, label: string, n?: number) => (
    <button key={k} type="button" onClick={() => setOpen(o => (o === k ? null : k))} aria-pressed={open === k} className="drl-btn"
      style={{ minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700, border: `1px solid ${open === k ? palette.accent : DC.line}`, background: open === k ? 'rgba(242,182,109,.15)' : DC.glass, color: open === k ? palette.accent : DC.muted }}>
      {label}{n !== undefined ? ` · ${n}` : ''}
    </button>
  );
  const r = p.stats.reactions;
  return (
    <article style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: DC.faint }}>{when(p.createdAt)}</span>
        {p.preview && <span style={{ padding: '2px 9px', borderRadius: 999, background: 'rgba(127,209,160,.15)', color: DC.ok, fontSize: 13, fontWeight: 700 }}>Aperçu gratuit</span>}
        {p.hasAudio && <span style={{ fontSize: 13, color: DC.muted, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mic size={12} aria-hidden="true" /> {mmss(p.audioSec)}</span>}
      </div>
      {editing ? (
        <div style={{ marginTop: 8 }}>
          <input aria-label="Modifier le titre" maxLength={TITLE_MAX} value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="Titre (facultatif)" className="drl-input" style={{ ...field, marginBottom: 8, fontWeight: 700 }} />
          <textarea aria-label="Modifier le texte" rows={5} maxLength={MAX} value={draft} onChange={e => setDraft(e.target.value)} className="drl-input" style={{ ...field, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" disabled={busy || (!p.hasAudio && draft.trim().length < 2)} onClick={() => run(async () => { await updatePost(p.id, { title: draftTitle.trim(), text: draft.trim() }); setEditing(false); })} style={{ ...small, color: DC.text, borderColor: palette.accent }}>Enregistrer</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(p.text); setDraftTitle(p.title); }} style={small}>Annuler</button>
          </div>
        </div>
      ) : (
        <>
          {p.title && <p style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 700, color: DC.text, lineHeight: 1.35 }}>{p.title}</p>}
          {p.text && <p style={{ margin: '8px 0 0', fontSize: 15, color: DC.text, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{p.text}</p>}
        </>
      )}
      {p.audioUrl && <AudioPlayer src={p.audioUrl} ariaLabel="Vocal publié" style={{ marginTop: 8 }} />}
      <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint }}>❤️ {r.heart} · 🙏 {r.pray} · 💪 {r.strong}{p.stats.comments > 0 ? ` · 💬 ${p.stats.comments}` : ''}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {tab('seen', 'Ont vu', p.stats.views)}
        {p.hasAudio && tab('listened', 'Ont écouté', p.stats.listens)}
        {tab('unseen', 'Pas encore vu')}
      </div>
      {open && <div style={{ marginTop: 6, borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.03)', padding: 12 }}><MemberList key={open} channelId={channelId} postId={p.id} kind={open} palette={palette} /></div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, borderTop: `1px solid ${DC.line}`, paddingTop: 10 }}>
        <button type="button" onClick={() => setShowComments(v => !v)} aria-expanded={showComments} style={small}>💬 {showComments ? 'Fermer les commentaires' : `Commentaires (${p.stats.comments})`}</button>
        <button type="button" disabled={busy} onClick={() => run(() => updatePost(p.id, { commentsOpen: !p.commentsOpen }))} style={small}>{p.commentsOpen ? 'Fermer les commentaires aux membres' : 'Rouvrir les commentaires'}</button>
        <button type="button" disabled={busy} onClick={() => run(() => updatePost(p.id, { preview: !p.preview }))} style={small}><Eye size={14} aria-hidden="true" /> {p.preview ? 'Retirer l\'aperçu' : 'Mettre en aperçu'}</button>
        {!editing && <button type="button" onClick={() => setEditing(true)} style={small}><Pencil size={14} aria-hidden="true" /> Modifier le titre et le texte</button>}
        {!confirmDel ? <button type="button" onClick={() => setConfirmDel(true)} style={small}><Trash2 size={14} aria-hidden="true" /> Supprimer</button> : (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <button type="button" disabled={busy} onClick={() => run(() => deletePost(p.id))} style={{ ...small, color: '#F09A7A', borderColor: 'rgba(240,154,122,.6)' }}>Oui, supprimer pour de bon</button>
            <button type="button" onClick={() => setConfirmDel(false)} style={small}>Garder</button>
          </span>
        )}
      </div>
      {showComments && <ChannelCommentsAdmin postId={p.id} palette={palette} />}
    </article>
  );
};

const ChannelPostsAdmin: React.FC<{ channel: AdminChannel; palette: MomentPalette; onBack: () => void; initialTab?: 'publish' | 'posts' | 'members' }> = ({ channel, palette, onBack, initialTab = 'publish' }) => {
  const [tab, setTab] = useState<'publish' | 'posts' | 'members'>(initialTab);
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [err, setErr] = useState('');
  const load = () => listPosts(channel.id).then(r => { setPosts(r.items); }).catch(e => setErr(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, [channel.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = (k: typeof tab, label: string) => (
    <button key={k} type="button" onClick={() => setTab(k)} className="drl-btn" style={{ minHeight: 38, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, border: `1px solid ${tab === k ? palette.accent : DC.line}`, background: tab === k ? 'rgba(242,182,109,.15)' : DC.glass, color: tab === k ? palette.accent : DC.muted }}>{label}</button>
  );
  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" onClick={onBack} style={{ ...small, marginBottom: 10 }}><ArrowLeft size={14} aria-hidden="true" /> Mes chaînes</button>
      <h2 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: 21, color: DC.title }}>{channel.name}</h2>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: DC.muted }}>{channel.memberCount} membre{channel.memberCount > 1 ? 's' : ''} · {channel.price > 0 ? `${channel.price} étincelle${channel.price > 1 ? 's' : ''}` : 'Gratuite'}{channel.status === 'archived' ? ' · Archivée' : ''}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
        {t('publish', 'Publier')}{t('posts', `Publications${posts ? ` · ${posts.length}` : ''}`)}{t('members', `Membres · ${channel.memberCount}`)}
      </div>
      {err && <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{err}</p>}
      {tab === 'publish' && <Composer channel={channel} palette={palette} onPublished={() => { load(); }} />}
      {tab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts === null && <Loader2 className="animate-spin" aria-label="Chargement" />}
          {posts && posts.length === 0 && <p style={{ color: DC.faint, fontSize: 14 }}>Rien de publié pour l'instant.</p>}
          {(posts ?? []).map(p => <PostRow key={p.id} p={p} channelId={channel.id} palette={palette} onChanged={load} onError={setErr} />)}
        </div>
      )}
      {tab === 'members' && <section style={card}><p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.text }}>Membres de la chaîne</p><MemberList channelId={channel.id} kind="all" palette={palette} /></section>}
    </div>
  );
};

export default ChannelPostsAdmin;

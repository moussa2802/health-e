/**
 * MessageComments — les commentaires sous un message de Dr Lô.
 * Visibles par tous les destinataires. Identité au choix : prénom (par défaut), anonyme ou pseudo.
 * Un mot de détresse n'est jamais publié : la personne reçoit un message de soutien (1515, CHU Fann).
 */
import React, { useEffect, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { DC } from './DrLoShell';
import TotemAvatar from './TotemAvatar';
import type { MomentPalette } from '../../utils/drloMoment';
import {
  addComment, deleteComment, followUpComment, getComments, reportComment,
  type IdentityMode, type PublicComment, type ThreadEntry,
} from '../../services/drloBroadcastService';

const KEY = 'he_comment_identity';
const MAX = 400;
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };

function loadIdentity(): { mode: IdentityMode; pseudo: string } {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (['anon', 'prenom', 'pseudo'].includes(v.mode)) return { mode: v.mode, pseudo: String(v.pseudo || '') }; } catch { /* ignore */ }
  return { mode: 'prenom', pseudo: '' }; // par défaut : le prénom. Anonyme ou pseudo, c'est un choix.
}

const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;

/** Un échange sous un commentaire : Dr Lô (texte ou vocal) et la réponse de la personne. */
export const ThreadView: React.FC<{ entries: ThreadEntry[]; author: string; palette: MomentPalette }> = ({ entries, author, palette }) => (
  <>
    {entries.map((e, i) => {
      const drlo = e.from === 'drlo';
      return (
        <div key={i} style={{ marginTop: 8, borderLeft: `2px solid ${drlo ? palette.accent : DC.line}`, paddingLeft: 10 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: drlo ? palette.accent : DC.faint }}>
            {drlo ? 'Dr Lô' : author}
            {e.updated && <span style={{ marginLeft: 8, color: '#F0C987' }}>Réponse mise à jour</span>}
            {e.fresh && <span style={{ marginLeft: 8, color: '#F0C987' }}>Nouveau</span>}
            {e.editedAt && !e.updated ? <span style={{ marginLeft: 8, fontWeight: 400, color: DC.faint }}>modifié</span> : null}
          </p>
          {e.audioSec > 0 && (e.audioUrl
            ? <audio controls preload="metadata" src={e.audioUrl} aria-label="Le vocal de Dr Lô" style={{ width: '100%', height: 40, marginTop: 6 }} />
            : <p style={{ margin: '6px 0 0', fontSize: 13.5, color: DC.muted }}>Vocal de {mmss(e.audioSec)} : indisponible pour le moment.</p>)}
          {e.text && <p style={{ margin: '4px 0 0', fontSize: 14.5, lineHeight: 1.5, color: drlo ? DC.soft : DC.text, whiteSpace: 'pre-wrap' }}>{e.text}</p>}
        </div>
      );
    })}
  </>
);

/** La personne répond à Dr Lô, à tour de rôle, jusqu'à la clôture. */
export const FollowUp: React.FC<{ send: (text: string) => Promise<{ support?: boolean }>; palette: MomentPalette; onSent: () => void }> = ({ send, palette, onSent }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [support, setSupport] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setSupport(false);
    try {
      const r = await send(text);
      setText('');
      if (r.support) setSupport(true); else onSent();
    } catch (er: unknown) { setError(er instanceof Error ? er.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, borderRadius: 22, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.05)', padding: '4px 4px 4px 14px' }}>
        <textarea aria-label="Ta réponse à Dr Lô" rows={1} maxLength={MAX} value={text} onChange={e => setText(e.target.value)} placeholder="Répondre à Dr Lô…" className="drl-input"
          style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.4, color: DC.text, padding: '10px 0', maxHeight: 120 }} />
        <button type="submit" aria-label="Envoyer ma réponse" disabled={busy || text.trim().length < 2} className="drl-btn"
          style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', border: 0, background: palette.primary, color: DC.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: busy || text.trim().length < 2 ? 0.4 : 1 }}>
          <SendHorizontal size={19} aria-hidden="true" />
        </button>
      </div>
      {error && <p role="alert" style={{ margin: '8px 4px 0', color: '#F09A7A', fontSize: 13.5, lineHeight: 1.45 }}>{error}</p>}
      {support && (
        <div role="status" style={{ marginTop: 10, borderRadius: 14, border: '1px solid rgba(233,200,143,.45)', background: 'rgba(233,200,143,.08)', padding: 12, fontSize: 14, lineHeight: 1.55, color: DC.text }}>
          Ce que tu as écrit compte, et on ne l'a pas publié. Si tu penses à te faire du mal ou si tu es en danger, appelle le <a href="tel:1515" style={{ fontWeight: 700, color: palette.accent }}>1515</a> (SAMU) ou le CHU de Fann au <a href="tel:+221338691820" style={{ fontWeight: 700, color: palette.accent }}>+221 33 869 18 20</a>. Parle à une vraie personne, tout de suite.
        </div>
      )}
    </form>
  );
};

const MessageComments: React.FC<{ messageId: string; palette: MomentPalette }> = ({ messageId, palette }) => {
  const [items, setItems] = useState<PublicComment[] | null>(null);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [{ mode, pseudo }, setIdt] = useState(loadIdentity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [support, setSupport] = useState(false);
  const [reported, setReported] = useState<string[]>([]);
  const [idtOpen, setIdtOpen] = useState(false);

  const load = () => getComments(messageId).then(r => { setItems(r.items); setOpen(r.open); }).catch(() => setItems([]));
  useEffect(() => { load(); }, [messageId]); // eslint-disable-line react-hooks/exhaustive-deps
  const setIdentity = (next: { mode: IdentityMode; pseudo: string }) => { setIdt(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ } };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setSupport(false);
    try {
      const r = await addComment(messageId, text, mode, pseudo);
      setText('');
      if (r.support) setSupport(true);
      await load();
    } catch (er: unknown) { setError(er instanceof Error ? er.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  if (items === null) return null;
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? 'rgba(242,182,109,.15)' : DC.glass, color: on ? palette.accent : DC.muted });
  const MODES: { id: IdentityMode; label: string }[] = [{ id: 'prenom', label: 'Mon prénom' }, { id: 'anon', label: 'Anonyme' }, { id: 'pseudo', label: 'Un pseudo' }];

  return (
    <section aria-label="Commentaires" style={{ marginTop: 22 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.text }}>{items.length > 0 ? `${items.length} commentaire${items.length > 1 ? 's' : ''}` : 'Commentaires'}</h2>

      {open ? (
        <form onSubmit={submit} style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, borderRadius: 24, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.05)', padding: '4px 4px 4px 14px' }}>
            <textarea aria-label="Ton commentaire" rows={1} maxLength={MAX} value={text}
              onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
              placeholder="Ajouter un commentaire…" className="drl-input"
              style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.4, color: DC.text, padding: '10px 0', maxHeight: 120 }} />
            <button type="submit" aria-label="Envoyer le commentaire" disabled={busy || text.trim().length < 2} className="drl-btn"
              style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', border: 0, background: palette.primary, color: DC.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: busy || text.trim().length < 2 ? 0.4 : 1 }}>
              <SendHorizontal size={19} aria-hidden="true" />
            </button>
          </div>
          <p style={{ margin: '8px 4px 0', fontSize: 12.5, color: DC.faint, lineHeight: 1.5 }}>
            Tu apparais comme{' '}
            <button type="button" onClick={() => setIdtOpen(o => !o)} aria-expanded={idtOpen} style={{ background: 'none', border: 0, padding: 0, minHeight: 28, color: palette.accent, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}>
              {mode === 'anon' ? 'Anonyme' : mode === 'prenom' ? 'ton prénom' : (pseudo.trim() || 'un pseudo')}
            </button>
          </p>
          {idtOpen && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {MODES.map(m => <button key={m.id} type="button" onClick={() => setIdentity({ mode: m.id, pseudo })} aria-pressed={mode === m.id} style={chip(mode === m.id)}>{m.label}</button>)}
              {mode === 'pseudo' && <input aria-label="Ton pseudo" value={pseudo} maxLength={20} onChange={e => setIdentity({ mode, pseudo: e.target.value })} placeholder="Ton pseudo" className="drl-input" style={{ ...field, minHeight: 40, padding: '0 14px', flexBasis: '100%' }} />}
            </div>
          )}
          {error && <p role="alert" style={{ margin: '10px 4px 0', color: '#F09A7A', fontSize: 13.5, lineHeight: 1.45 }}>{error}</p>}
          {support && (
            <div role="status" style={{ marginTop: 10, borderRadius: 14, border: '1px solid rgba(233,200,143,.45)', background: 'rgba(233,200,143,.08)', padding: 12, fontSize: 14, lineHeight: 1.55, color: DC.text }}>
              Ce que tu as écrit compte, et on ne l'a pas publié. Si tu penses à te faire du mal ou si tu es en danger, appelle le <a href="tel:1515" style={{ fontWeight: 700, color: palette.accent }}>1515</a> (SAMU) ou le CHU de Fann au <a href="tel:+221338691820" style={{ fontWeight: 700, color: palette.accent }}>+221 33 869 18 20</a>. Parle à une vraie personne, tout de suite.
            </div>
          )}
        </form>
      ) : <p style={{ margin: '12px 0 0', fontSize: 14, color: DC.muted }}>Les commentaires sont fermés pour ce message.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {items.length === 0 && open && <p style={{ margin: 0, fontSize: 14, color: DC.faint }}>Aucun commentaire pour l'instant.</p>}
        {items.map(c => (
          <article key={c.id} style={{ padding: '10px 4px', borderTop: `1px solid ${c.pinned ? palette.accent : DC.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TotemAvatar animal={c.totem} />
              <p style={{ margin: 0, fontSize: 12.5, color: DC.faint }}><b style={{ color: DC.soft }}>{c.name}</b>{c.mine ? ' (toi)' : ''}{c.pinned ? ' · épinglé' : ''} · {ago(c.at)}</p>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.text, whiteSpace: 'pre-wrap' }}>{c.text}</p>
            <ThreadView entries={c.thread} author={c.mine ? 'Toi' : c.name} palette={palette} />
            {c.mine && c.canReply && <FollowUp send={t => followUpComment(c.id, t)} palette={palette} onSent={load} />}
            {c.mine && c.closed && c.thread.length > 0 && <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.muted }}>Dr Lô a clôturé cette discussion.</p>}
            {c.mine && !c.closed && !c.canReply && c.thread.length > 0 && c.thread[c.thread.length - 1].from === 'user' && <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.muted }}>Dr Lô te répondra ici.</p>}
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              {c.mine ? (
                <button type="button" onClick={() => deleteComment(c.id).then(load).catch(() => {})} style={{ background: 'none', border: 0, color: DC.faint, fontSize: 12.5, cursor: 'pointer', minHeight: 32 }}>Supprimer</button>
              ) : reported.includes(c.id) ? (
                <span style={{ fontSize: 12.5, color: DC.faint }}>Merci, c'est signalé.</span>
              ) : (
                <button type="button" onClick={() => reportComment(c.id).then(() => setReported(r => [...r, c.id])).catch(() => {})} style={{ background: 'none', border: 0, color: DC.faint, fontSize: 12.5, cursor: 'pointer', minHeight: 32 }}>Signaler</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default MessageComments;

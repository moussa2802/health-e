/**
 * MessageComments — les commentaires sous un message de Dr Lô.
 * Visibles par tous les destinataires. Identité au choix : Anonyme (par défaut), prénom, ou pseudo.
 * Un mot de détresse n'est jamais publié : la personne reçoit un message de soutien (1515, CHU Fann).
 */
import React, { useEffect, useState } from 'react';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import {
  addComment, deleteComment, getComments, reportComment,
  type IdentityMode, type PublicComment,
} from '../../services/drloBroadcastService';

const KEY = 'he_comment_identity';
const MAX = 400;
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };

function loadIdentity(): { mode: IdentityMode; pseudo: string } {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (['anon', 'prenom', 'pseudo'].includes(v.mode)) return { mode: v.mode, pseudo: String(v.pseudo || '') }; } catch { /* ignore */ }
  return { mode: 'anon', pseudo: '' };
}

const MessageComments: React.FC<{ messageId: string; palette: MomentPalette }> = ({ messageId, palette }) => {
  const [items, setItems] = useState<PublicComment[] | null>(null);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [{ mode, pseudo }, setIdt] = useState(loadIdentity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [support, setSupport] = useState(false);
  const [reported, setReported] = useState<string[]>([]);

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
  const MODES: { id: IdentityMode; label: string }[] = [{ id: 'anon', label: 'Anonyme' }, { id: 'prenom', label: 'Mon prénom' }, { id: 'pseudo', label: 'Un pseudo' }];

  return (
    <section aria-label="Commentaires" style={{ marginTop: 22 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DC.text }}>Vos mots</h2>
      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: DC.faint, lineHeight: 1.5 }}>Les autres personnes qui ont reçu ce message peuvent te lire. Pas de numéro, pas de lien, et un ton bienveillant.</p>

      {open ? (
        <form onSubmit={submit} style={{ ...card, marginTop: 12 }}>
          <textarea aria-label="Ton commentaire" rows={3} maxLength={MAX} value={text} onChange={e => setText(e.target.value)} placeholder="Ce que ce message te fait…" className="drl-input" style={{ ...field, lineHeight: 1.5, resize: 'vertical' }} />
          <p style={{ margin: '12px 0 6px', fontSize: 12.5, fontWeight: 700, color: DC.soft }}>Tu apparais comme</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MODES.map(m => <button key={m.id} type="button" onClick={() => setIdentity({ mode: m.id, pseudo })} aria-pressed={mode === m.id} style={chip(mode === m.id)}>{m.label}</button>)}
          </div>
          {mode === 'pseudo' && <input aria-label="Ton pseudo" value={pseudo} maxLength={20} onChange={e => setIdentity({ mode, pseudo: e.target.value })} placeholder="Ton pseudo" className="drl-input" style={{ ...field, marginTop: 8, minHeight: 46, padding: '0 14px' }} />}
          {error && <p role="alert" style={{ margin: '10px 0 0', color: '#F09A7A', fontSize: 13.5, lineHeight: 1.45 }}>{error}</p>}
          {support && (
            <div role="status" style={{ marginTop: 10, borderRadius: 14, border: '1px solid rgba(233,200,143,.45)', background: 'rgba(233,200,143,.08)', padding: 12, fontSize: 14, lineHeight: 1.55, color: DC.text }}>
              Ce que tu as écrit compte, et on ne l'a pas publié. Si tu penses à te faire du mal ou si tu es en danger, appelle le <a href="tel:1515" style={{ fontWeight: 700, color: palette.accent }}>1515</a> (SAMU) ou le CHU de Fann au <a href="tel:+221338691820" style={{ fontWeight: 700, color: palette.accent }}>+221 33 869 18 20</a>. Parle à une vraie personne, tout de suite.
            </div>
          )}
          <button type="submit" disabled={busy || text.trim().length < 2} className="drl-btn"
            style={{ marginTop: 12, width: '100%', minHeight: 48, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: busy || text.trim().length < 2 ? 0.45 : 1 }}>
            Publier
          </button>
        </form>
      ) : <p style={{ margin: '12px 0 0', fontSize: 14, color: DC.muted }}>Les commentaires sont fermés pour ce message.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {items.length === 0 && open && <p style={{ margin: 0, fontSize: 14, color: DC.faint }}>Sois la première personne à écrire un mot.</p>}
        {items.map(c => (
          <article key={c.id} style={{ ...card, padding: 14, borderColor: c.pinned ? palette.accent : DC.line }}>
            <p style={{ margin: 0, fontSize: 12.5, color: DC.faint }}><b style={{ color: DC.soft }}>{c.name}</b>{c.mine ? ' (toi)' : ''}{c.pinned ? ' · épinglé' : ''} · {ago(c.at)}</p>
            <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.text, whiteSpace: 'pre-wrap' }}>{c.text}</p>
            {c.reply && (
              <div style={{ marginTop: 8, borderLeft: `2px solid ${palette.accent}`, paddingLeft: 10 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: palette.accent }}>Dr Lô</p>
                <p style={{ margin: '2px 0 0', fontSize: 14.5, lineHeight: 1.5, color: DC.soft, whiteSpace: 'pre-wrap' }}>{c.reply.text}</p>
              </div>
            )}
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

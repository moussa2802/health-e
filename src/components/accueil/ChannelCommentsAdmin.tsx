/**
 * ChannelCommentsAdmin — modérer et répondre aux commentaires d'UNE publication de chaîne (espace Dr Lô).
 * Dr Lô voit le prénom ou le pseudo choisi par la personne ; un signe de détresse n'est jamais publié et reste sans identité.
 */
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DC } from './DrLoShell';
import TotemAvatar from './TotemAvatar';
import ReplyComposer from './ReplyComposer';
import type { MomentPalette } from '../../utils/drloMoment';
import type { AdminComment } from '../../services/drloBroadcastService';
import { adminPostCommentAct, adminPostComments, editPostReply, replyPostComment } from '../../services/drloChannelService';
import AudioPlayer from './AudioPlayer';

const fmt = (t: number) => (t ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;
const btn: React.CSSProperties = { minHeight: 34, padding: '0 10px', borderRadius: 10, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', fontSize: 13 };

const ChannelCommentsAdmin: React.FC<{ postId: string; palette: MomentPalette }> = ({ postId, palette }) => {
  const [items, setItems] = useState<AdminComment[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const load = () => adminPostComments(postId).then(r => setItems(r.items)).catch(e => setErr(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = (p: Promise<unknown>) => p.then(load).catch(e => setErr(e instanceof Error ? e.message : 'Erreur'));
  const distress = (items ?? []).filter(c => c.status === 'distress').length;
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {err && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 13 }}>{err}</p>}
      {items === null && <Loader2 size={16} className="animate-spin" aria-label="Chargement" />}
      {items && items.length === 0 && <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Aucun commentaire.</p>}
      {distress > 0 && <p style={{ margin: 0, fontSize: 13, color: '#F0C987', lineHeight: 1.5 }}>{distress} commentaire{distress > 1 ? 's' : ''} montrant une détresse : non publié{distress > 1 ? 's' : ''}, la personne a reçu en privé le 1515 et le CHU Fann. Tu ne vois pas qui c'est.</p>}
      {(items ?? []).filter(c => c.status !== 'distress').map(c => (
        <div key={c.id} style={{ borderRadius: 12, border: `1px solid ${c.reports > 0 ? 'rgba(240,154,122,.5)' : DC.line}`, background: 'rgba(255,255,255,.03)', padding: 10, opacity: c.hidden ? 0.55 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TotemAvatar animal={c.totem} size={28} /><p style={{ margin: 0, fontSize: 13, color: DC.faint }}>{c.name}{c.pinned ? ' · épinglé' : ''}{c.hidden ? ' · masqué' : ''}{c.reports > 0 ? ` · signalé ${c.reports} fois` : ''}</p></div>
          <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.text, whiteSpace: 'pre-wrap' }}>{c.text}</p>
          {c.thread.map(e => {
            const key = `${c.id}:${e.index}`;
            const mine = e.from === 'drlo';
            return (
              <div key={key} style={{ marginTop: 8, borderLeft: `2px solid ${mine ? palette.accent : DC.line}`, paddingLeft: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: mine ? palette.accent : DC.faint }}>{mine ? 'Toi' : c.name}{e.editedAt ? ' · modifié' : ''} · {fmt(e.editedAt ?? e.at)}</p>
                {editing === key ? (
                  <div style={{ marginTop: 6 }}>
                    <ReplyComposer initialText={e.text} existingAudio={e.audioSec ? { url: e.audioUrl ?? null, sec: e.audioSec } : null} placeholder="Ta réponse" submitLabel="Enregistrer la modification"
                      onSubmit={async (t, clip, removeAudio) => { await editPostReply(c.id, e.index, { text: t, audio: clip, removeAudio }); setEditing(null); await load(); }}
                      onCancel={() => setEditing(null)} />
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.faint }}>La personne verra que ta réponse a été mise à jour.</p>
                  </div>
                ) : (
                  <>
                    {e.audioSec > 0 && (e.audioUrl ? <AudioPlayer src={e.audioUrl} ariaLabel={mine ? 'Ton vocal' : 'Vocal'} style={{ marginTop: 6 }} /> : <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.muted }}>Vocal de {mmss(e.audioSec)}</p>)}
                    {e.text && <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5, color: mine ? palette.accent : DC.text, whiteSpace: 'pre-wrap' }}>{e.text}</p>}
                    {mine && <button type="button" onClick={() => setEditing(key)} style={{ ...btn, marginTop: 6 }}>Modifier</button>}
                  </>
                )}
              </div>
            );
          })}
          {c.status === 'public' && c.thread.length > 0 && c.thread[c.thread.length - 1].from === 'user' && !c.closed && <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: '#F0C987' }}>La personne t'a répondu : à toi.</p>}
          <div style={{ marginTop: 8 }}>
            {c.closed ? <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Discussion clôturée : la personne ne peut plus écrire.</p>
              : <ReplyComposer placeholder={c.thread.length ? 'Continuer la discussion…' : 'Répondre publiquement…'} submitLabel="Envoyer" onSubmit={async (t, clip) => { await replyPostComment(c.id, t, clip); await load(); }} />}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <button type="button" onClick={() => act(adminPostCommentAct(c.id, 'pin', !c.pinned))} style={btn}>{c.pinned ? 'Désépingler' : 'Épingler'}</button>
            <button type="button" onClick={() => act(adminPostCommentAct(c.id, 'hide', !c.hidden))} style={btn}>{c.hidden ? 'Réafficher' : 'Masquer'}</button>
            {c.thread.length > 0 && <button type="button" onClick={() => act(adminPostCommentAct(c.id, 'close', !c.closed))} style={btn}>{c.closed ? 'Rouvrir la discussion' : 'Clôturer la discussion'}</button>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChannelCommentsAdmin;

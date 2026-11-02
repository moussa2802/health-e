/**
 * ChannelChat — la discussion entre les membres d'une chaîne (en plus des commentaires sous chaque publication).
 * Identité au choix, comme partout : prénom, anonyme ou pseudo (mémorisé sur l'appareil). Pas de numéro, de lien ni d'insulte ;
 * un mot de détresse n'est jamais publié (la personne reçoit un message de soutien). Les messages se rafraîchissent seuls.
 */
import React, { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { DC } from './DrLoShell';
import TotemAvatar from './TotemAvatar';
import LoadingCards from './LoadingCards';
import type { MomentPalette } from '../../utils/drloMoment';
import type { IdentityMode } from '../../services/drloBroadcastService';
import { deleteChatMessage, listChatMessages, reportChatMessage, sendChatMessage, type ChatMessage } from '../../services/drloChannelService';

const KEY = 'he_comment_identity';
const MAX = 500;
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const hhmm = (t: number) => {
  const d = new Date(t); const today = new Date();
  const h = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === today.toDateString() ? h : `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${h}`;
};
function loadIdentity(): { mode: IdentityMode; pseudo: string } {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (['anon', 'prenom', 'pseudo'].includes(v.mode)) return { mode: v.mode, pseudo: String(v.pseudo || '') }; } catch { /* ignore */ }
  return { mode: 'prenom', pseudo: '' };
}
const MODES: { id: IdentityMode; label: string }[] = [{ id: 'prenom', label: 'Mon prénom' }, { id: 'anon', label: 'Anonyme' }, { id: 'pseudo', label: 'Un pseudo' }];

const ChannelChat: React.FC<{ channelId: string; palette: MomentPalette }> = ({ channelId, palette }) => {
  const [items, setItems] = useState<ChatMessage[] | null>(null);
  const [staff, setStaff] = useState(false);
  const [text, setText] = useState('');
  const [{ mode, pseudo }, setIdt] = useState(loadIdentity);
  const [idtOpen, setIdtOpen] = useState(false);
  const [asDrLo, setAsDrLo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [support, setSupport] = useState(false);
  const [reported, setReported] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  const load = () => listChatMessages(channelId).then(r => { setItems(r.items); setStaff(r.staff); }).catch(e => { setItems(prev => prev ?? []); setError(e instanceof Error ? e.message : 'Erreur'); });
  useEffect(() => {
    load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 20000);
    return () => window.clearInterval(t);
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!items) return;
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: firstLoad.current ? 'auto' : 'smooth' });
    firstLoad.current = false;
  }, [items?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const setIdentity = (next: { mode: IdentityMode; pseudo: string }) => { setIdt(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ } };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || text.trim().length < 2) return;
    setBusy(true); setError(''); setSupport(false);
    try {
      const r = await sendChatMessage(channelId, text, mode, pseudo, asDrLo);
      setText('');
      if (r.support) setSupport(true);
      await load();
    } catch (er: unknown) { setError(er instanceof Error ? er.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  if (items === null) return <LoadingCards label="Ouverture de la discussion…" count={1} />;
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? 'rgba(242,182,109,.15)' : DC.glass, color: on ? palette.accent : DC.muted });
  const link: React.CSSProperties = { background: 'none', border: 0, color: DC.faint, fontSize: 13, cursor: 'pointer', minHeight: 32, padding: '0 6px' };
  const asLabel = asDrLo ? 'responsable de la chaîne' : mode === 'anon' ? 'Anonyme' : mode === 'prenom' ? 'ton prénom' : (pseudo.trim() || 'un pseudo');

  return (
    <section aria-label="Discussion de la chaîne" style={{ marginTop: 14 }}>
      <p style={{ margin: '0 2px 10px', fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>
        Ici, les membres de la chaîne échangent entre eux. Reste bienveillant : pas de numéro, de lien ni d'insulte. Personne ne voit qui tu es si tu choisis d'être anonyme.
      </p>
      <div role="log" aria-live="polite" aria-label="Messages" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 460, overflowY: 'auto', padding: '4px 2px' }}>
        {items.length === 0 && <p style={{ margin: 0, fontSize: 15, color: DC.muted, lineHeight: 1.5 }}>Personne n'a encore écrit. Lance la discussion !</p>}
        {items.map(m => (
          <article key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.mine ? 'row-reverse' : 'row', opacity: m.hidden ? 0.5 : 1 }}>
            {!m.mine && <TotemAvatar animal={m.totem} />}
            <div style={{ maxWidth: '82%', borderRadius: 16, padding: '8px 12px', background: m.mine ? 'rgba(242,182,109,.16)' : 'rgba(255,255,255,.07)', border: `1px solid ${m.official ? palette.accent : DC.line}` }}>
              <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>
                <b style={{ color: m.official ? palette.accent : DC.soft }}>{m.mine ? 'Toi' : m.name}</b>{m.official ? ' · responsable de la chaîne' : ''} · {hhmm(m.at)}{m.hidden ? ' · masqué' : ''}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.text, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.text}</p>
              <div style={{ textAlign: m.mine ? 'left' : 'right' }}>
                {(m.mine || staff) && <button type="button" onClick={() => deleteChatMessage(channelId, m.id).then(load).catch(() => {})} style={link}>Supprimer</button>}
                {!m.mine && (reported.includes(m.id) ? <span style={{ fontSize: 13, color: DC.faint }}>Signalé, merci.</span>
                  : <button type="button" onClick={() => reportChatMessage(channelId, m.id).then(() => setReported(r => [...r, m.id])).catch(() => {})} style={link}>Signaler</button>)}
              </div>
            </div>
          </article>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, borderRadius: 24, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.05)', padding: '4px 4px 4px 14px' }}>
          <textarea aria-label="Ton message" rows={1} maxLength={MAX} value={text} className="drl-input" placeholder="Écrire aux autres membres…"
            onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
            style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.4, color: DC.text, padding: '10px 0', maxHeight: 120 }} />
          <button type="submit" aria-label="Envoyer le message" disabled={busy || text.trim().length < 2} className="drl-btn"
            style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', border: 0, background: palette.primary, color: DC.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: busy || text.trim().length < 2 ? 0.4 : 1 }}>
            <SendHorizontal size={19} aria-hidden="true" />
          </button>
        </div>
        <p style={{ margin: '8px 4px 0', fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>
          Tu apparais comme{' '}
          <button type="button" onClick={() => setIdtOpen(o => !o)} aria-expanded={idtOpen} style={{ background: 'none', border: 0, padding: 0, minHeight: 28, color: palette.accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>{asLabel}</button>.
        </p>
        {idtOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {MODES.map(m => <button key={m.id} type="button" onClick={() => { setAsDrLo(false); setIdentity({ mode: m.id, pseudo }); }} aria-pressed={!asDrLo && mode === m.id} style={chip(!asDrLo && mode === m.id)}>{m.label}</button>)}
            {staff && <button type="button" onClick={() => setAsDrLo(true)} aria-pressed={asDrLo} style={chip(asDrLo)}>Responsable de la chaîne</button>}
            {!asDrLo && mode === 'pseudo' && <input aria-label="Ton pseudo" value={pseudo} maxLength={20} onChange={e => setIdentity({ mode, pseudo: e.target.value })} placeholder="Ton pseudo" className="drl-input" style={{ ...field, minHeight: 40, flexBasis: '100%' }} />}
          </div>
        )}
        {error && <p role="alert" style={{ margin: '10px 4px 0', color: '#F09A7A', fontSize: 14, lineHeight: 1.45 }}>{error}</p>}
        {support && (
          <div role="status" style={{ marginTop: 10, borderRadius: 14, border: '1px solid rgba(233,200,143,.45)', background: 'rgba(233,200,143,.08)', padding: 12, fontSize: 14, lineHeight: 1.55, color: DC.text }}>
            Ce que tu as écrit compte, et on ne l'a pas publié. Si tu penses à te faire du mal ou si tu es en danger, appelle le <a href="tel:1515" style={{ fontWeight: 700, color: palette.accent }}>1515</a> (SAMU) ou le CHU de Fann au <a href="tel:+221338691820" style={{ fontWeight: 700, color: palette.accent }}>+221 33 869 18 20</a>. Parle à une vraie personne, tout de suite.
          </div>
        )}
      </form>
    </section>
  );
};

export default ChannelChat;

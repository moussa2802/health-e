/**
 * PencRoom — la salle d'écoute de Pénc mi (plein écran). Audio en direct via LiveKit.
 *   Auditeur : écoute, lève la main, réagit ; s'il est invité, il accepte (ou non) de prendre la parole et redescend quand il veut.
 *   Hôte : parle, voit les mains levées, invite, fait redescendre, coupe un micro, exclut, termine (avec les idées à retenir).
 * Rien n'est enregistré. Le serveur seul ouvre les micros (penc-room).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type Participant } from 'livekit-client';
import { ChevronLeft, Hand, Heart, HelpCircle, Loader2, Mic, MicOff, Send, Share2, UserX, Volume2 } from 'lucide-react';
import { ChatFlux, ChatSheet, HostQuestions, ImageViewer, PinnedQuestion, QuestionsSheet, SlideCard, SlidesManager } from './PencLive';
import { hideChat, liveState, sendChat, sharePenc, type ChatMessage, type LiveState } from '../../services/pencLiveService';
import { DC } from '../accueil/DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import type { Penc } from '../../services/pencService';
import { endPenc } from '../../services/pencService';
import { acceptStage, declineStage, inviteToStage, kickFromPenc, leaveStage, muteSpeaker, removeFromStage, type RoomTicket } from '../../services/pencRoomService';

const COLORS = ['#9DBFAF', '#C9B8E4', '#F09A7A', '#9FB4C8', '#E8A0B8', '#E9C88F'];
const colorOf = (s: string) => COLORS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
const initial = (name: string) => (name.trim()[0] || '?').toUpperCase();
const onStage = (p: Participant) => !!p.permissions?.canPublish || p.attributes.role === 'host';
const micPub = (p: Participant) => p.getTrackPublication(Track.Source.Microphone);
const micOn = (p: Participant) => { const m = micPub(p); return !!m && !m.isMuted; };

const Avatar: React.FC<{ p: Participant; size: number; accent: string; mine: boolean }> = ({ p, size, accent, mine }) => {
  const host = p.attributes.role === 'host';
  const name = p.name || 'Anonyme';
  return (
    <span aria-hidden="true" style={{ width: size, height: size, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: size * 0.38, color: DC.ink,
      background: name === 'Anonyme' ? 'rgba(243,233,220,.18)' : colorOf(name), boxShadow: p.isSpeaking ? `0 0 0 3px #17100A, 0 0 0 6px ${accent}` : host ? `0 0 0 2px ${accent}88` : 'none', outline: mine ? `2px dashed ${accent}` : 'none', outlineOffset: 3, transition: 'box-shadow .15s' }}>
      {name === 'Anonyme' ? <span style={{ color: DC.soft, fontSize: size * 0.32 }}>?</span> : initial(name)}
    </span>
  );
};

const PencRoom: React.FC<{ penc: Penc; ticket: RoomTicket; palette: MomentPalette; onLeave: (ended: boolean) => void }> = ({ penc, ticket, palette, onLeave }) => {
  const roomRef = useRef<Room | null>(null);
  const [, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);
  const [status, setStatus] = useState<'connecting' | 'ok' | 'reconnecting' | 'ended' | 'error'>('connecting');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [hearts, setHearts] = useState<number[]>([]);
  const [hostTab, setHostTab] = useState<'questions' | 'images' | 'hands' | 'stage' | 'room'>('questions');
  const [live, setLive] = useState<LiveState | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [sheet, setSheet] = useState<'chat' | 'questions' | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [chatNote, setChatNote] = useState<{ kind: 'err' | 'crisis' | 'ok'; text: string } | null>(null);
  const lastSent = useRef(0);
  const refresh = () => { liveState(penc.id).then(setLive).catch(() => {}); };
  useEffect(() => { refresh(); const t = window.setInterval(refresh, 45000); return () => window.clearInterval(t); }, [penc.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ending, setEnding] = useState(false);
  const [summary, setSummary] = useState(['', '', '']);
  const [kickId, setKickId] = useState<string | null>(null);
  const wantMic = useRef(ticket.isHost);

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    roomRef.current = room;
    const els: HTMLMediaElement[] = [];
    const tryMic = () => {
      if (wantMic.current && room.localParticipant.permissions?.canPublish) {
        wantMic.current = false;
        room.localParticipant.setMicrophoneEnabled(true).then(bump).catch(() => setError('Ton micro n\'a pas pu s\'ouvrir. Autorise le micro dans ton navigateur.'));
      }
    };
    room
      .on(RoomEvent.TrackSubscribed, (track) => { if (track.kind === Track.Kind.Audio) { const el = track.attach(); el.style.display = 'none'; document.body.appendChild(el); els.push(el); } bump(); })
      .on(RoomEvent.TrackUnsubscribed, (track) => { track.detach().forEach(e => e.remove()); bump(); })
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!room.canPlaybackAudio))
      .on(RoomEvent.ParticipantPermissionsChanged, () => { tryMic(); bump(); })
      .on(RoomEvent.Reconnecting, () => setStatus('reconnecting'))
      .on(RoomEvent.Reconnected, () => setStatus('ok'))
      .on(RoomEvent.Disconnected, () => setStatus(s => (s === 'error' ? s : 'ended')))
      .on(RoomEvent.DataReceived, (payload, from, _k, topic) => {
        if (topic === 'react') { pop(); return; }
        // « live » : seulement ce qu'envoie le serveur (jamais un participant), donc déjà modéré
        if (topic !== 'live' || from) return;
        let m: { k?: string } & Partial<ChatMessage>;
        try { m = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
        if (m.k === 'chat' && m.cid && m.t) { const msg = m as ChatMessage; setChat(c => (c.some(x => x.cid === msg.cid) ? c : [...c, msg].slice(-200))); }
        else if (m.k === 'chat_hide' && m.cid) setChat(c => c.filter(x => x.cid !== m.cid));
        else if (m.k === 'q' || m.k === 'slide') refresh();
      });
    [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.ParticipantAttributesChanged, RoomEvent.ActiveSpeakersChanged,
      RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.TrackPublished, RoomEvent.TrackUnpublished, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished]
      .forEach(ev => room.on(ev, bump));
    room.connect(ticket.url, ticket.token)
      .then(() => { setStatus('ok'); setAudioBlocked(!room.canPlaybackAudio); room.startAudio().catch(() => {}); tryMic(); bump(); })
      .catch(() => { setStatus('error'); setError('Impossible de rejoindre la salle. Vérifie ta connexion et réessaie.'); });
    return () => { room.disconnect(); els.forEach(e => e.remove()); };
  }, [ticket.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const pop = () => {
    const id = Date.now() + Math.random();
    setHearts(h => [...h.slice(-12), id]);
    window.setTimeout(() => setHearts(h => h.filter(x => x !== id)), 1600);
  };
  const room = roomRef.current;
  const me = room?.localParticipant;
  const people: Participant[] = room ? [room.localParticipant, ...room.remoteParticipants.values()] : [];
  const stage = people.filter(onStage).sort((a, b) => (b.attributes.role === 'host' ? 1 : 0) - (a.attributes.role === 'host' ? 1 : 0));
  const listeners = people.filter(p => !onStage(p));
  const hands = listeners.filter(p => p.attributes.hand === '1' && p.attributes.invited !== '1');
  const iSpeak = !!me && onStage(me);
  const invited = !!me && !iSpeak && me.attributes.invited === '1';
  const handUp = !!me && me.attributes.hand === '1';

  const act = async (key: string, f: () => Promise<unknown>) => {
    setBusy(key); setError('');
    try { await f(); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(''); bump(); }
  };
  const toggleHand = () => me && act('hand', () => me.setAttributes({ hand: handUp ? '' : '1' }));
  const toggleMic = () => me && act('mic', () => me.setMicrophoneEnabled(!micOn(me)));
  const accept = () => act('accept', async () => { wantMic.current = true; await acceptStage(penc.id); });
  const decline = () => act('decline', () => declineStage(penc.id));
  const goDown = () => me && act('down', async () => { await me.setMicrophoneEnabled(false).catch(() => {}); await leaveStage(penc.id); });
  const react = () => { pop(); me?.publishData(new TextEncoder().encode('heart'), { reliable: false, topic: 'react' }).catch(() => {}); };
  const finish = () => act('end', async () => { await endPenc(penc.id, summary); room?.disconnect(); onLeave(true); });
  const leave = () => { room?.disconnect(); onLeave(false); };
  const share = () => { sharePenc(penc.id, penc.title).then(r => { if (r === 'copied') { setChatNote({ kind: 'ok', text: 'Lien copié : colle-le dans WhatsApp.' }); window.setTimeout(() => setChatNote(null), 2500); } }); };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (t.length < 2) return;
    if (Date.now() - lastSent.current < 2500) { setChatNote({ kind: 'err', text: 'Doucement : un message toutes les quelques secondes.' }); return; }
    lastSent.current = Date.now();
    setDraft(''); setChatNote(null);
    try {
      const r = await sendChat(penc.id, t);
      if (r.crisis) setChatNote({ kind: 'crisis', text: '' });
    } catch (err) { setDraft(t); setChatNote({ kind: 'err', text: err instanceof Error ? err.message : 'Erreur' }); }
  };
  const slideUrl = live && live.slideIndex !== null ? live.slides[live.slideIndex] : null;

  const btn = (primary: boolean): React.CSSProperties => ({ minHeight: 40, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, border: primary ? 0 : `1px solid ${DC.line}`, background: primary ? palette.primary : 'transparent', color: primary ? DC.ink : DC.text, whiteSpace: 'nowrap' });
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 14, background: 'rgba(255,255,255,.05)', border: `1px solid ${DC.line}` };

  if (status === 'ended') {
    return (
      <section role="dialog" aria-label="Pénc terminé" className="drl-screen font-sans" style={{ position: 'fixed', inset: 0, zIndex: 70, background: palette.bg, color: DC.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 24, color: DC.title }}>Le Pénc est terminé</p>
          <p style={{ margin: '8px 0 18px', fontSize: 15, color: DC.soft }}>Merci d'avoir été là.</p>
          <button type="button" onClick={() => onLeave(true)} style={{ ...btn(true), minHeight: 48, padding: '0 22px' }}>Voir ce qu'on retient</button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={`Pénc mi : ${penc.title}`} className="drl-screen font-sans" style={{ position: 'fixed', inset: 0, zIndex: 70, background: palette.bg, color: DC.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{'@keyframes pencUp{0%{opacity:0;transform:translateY(0) scale(.8)}15%{opacity:1}100%{opacity:0;transform:translateY(-160px) scale(1.2)}}@media (prefers-reduced-motion: reduce){.penc-heart{animation:none!important;opacity:0}}'}</style>
      <div className="drl-wrap-chat" style={{ width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          <button type="button" onClick={leave} aria-label="Quitter la salle et revenir" className="drl-btn" style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={22} aria-hidden="true" /></button>
          <span role="status" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>
            {status === 'ok' ? <><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F09A7A' }} />EN DIRECT · {people.length} présent{people.length > 1 ? 's' : ''}</> : status === 'reconnecting' ? 'Reconnexion…' : status === 'error' ? 'Hors ligne' : 'Connexion…'}
          </span>
          <button type="button" onClick={share} aria-label="Partager le lien du Pénc" className="drl-btn" style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Share2 size={18} aria-hidden="true" /></button>
          {ticket.isMod
            ? <button type="button" onClick={() => setEnding(true)} style={{ ...btn(false), borderColor: 'rgba(240,154,122,.7)' }}>Terminer</button>
            : <button type="button" onClick={leave} style={{ ...btn(false), borderColor: 'rgba(240,154,122,.6)' }}>Quitter</button>}
        </header>

        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `0 16px ${chat.length ? 200 : 16}px`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 24, lineHeight: 1.15, fontWeight: 600, color: DC.title }}>{penc.title}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: DC.muted }}>Animé par {penc.host.name} · rien n'est enregistré</p>
          </div>
          {status === 'connecting' && <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Loader2 className="animate-spin" aria-label="Connexion à la salle" /></div>}
          {audioBlocked && status === 'ok' && (
            <button type="button" onClick={() => room?.startAudio().then(() => setAudioBlocked(false)).catch(() => {})} className="drl-btn" style={{ ...btn(true), minHeight: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Volume2 size={18} aria-hidden="true" />Touche pour activer le son
            </button>
          )}

          {status !== 'connecting' && (
            <section aria-label="Sur scène" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, padding: '16px 8px', borderRadius: 22, background: 'rgba(255,255,255,.04)', border: `1px solid ${DC.line}` }}>
              {stage.map(p => (
                <div key={p.identity} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <Avatar p={p} size={68} accent={palette.accent} mine={p.identity === me?.identity} />
                  <b style={{ fontSize: 14, color: DC.title, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.identity === me?.identity ? `${p.name || 'Toi'} (toi)` : p.name || 'Anonyme'}</b>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: p.attributes.role === 'host' ? palette.accent : DC.muted, fontWeight: p.attributes.role === 'host' ? 700 : 500 }}>
                    {!micOn(p) && <MicOff size={13} aria-hidden="true" />}{p.attributes.role === 'host' ? 'Hôte' : micOn(p) ? 'Intervenant' : 'Micro coupé'}
                  </span>
                </div>
              ))}
            </section>
          )}

          {slideUrl && live && live.slideIndex !== null && <SlideCard url={slideUrl} index={live.slideIndex} total={live.slides.length} onOpen={() => setViewer(slideUrl)} />}
          {live?.pinned && <PinnedQuestion q={live.pinned} />}
          {status === 'ok' && !ticket.isMod && (
            <button type="button" onClick={() => setSheet('questions')} className="drl-btn" style={{ alignSelf: 'flex-start', minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(201,184,228,.5)', background: 'rgba(201,184,228,.1)', color: '#E6DCF4', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={16} aria-hidden="true" />Questions{live && live.questions.filter(q => q.status === 'open').length ? ` · ${live.questions.filter(q => q.status === 'open').length}` : ''}
            </button>
          )}
          {status === 'ok' && ticket.isMod && hostTab === 'room' && (
            <section aria-label="Dans la salle" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.12em', color: DC.muted }}>DANS LA SALLE · {listeners.length}{hands.length ? ` · ${hands.length} MAIN${hands.length > 1 ? 'S' : ''} LEVÉE${hands.length > 1 ? 'S' : ''}` : ''}</p>
              {listeners.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: DC.faint }}>Personne d'autre pour l'instant. Partage le Pénc !</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: 12 }}>
                  {listeners.slice(0, 23).map(p => (
                    <div key={p.identity} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                      <Avatar p={p} size={44} accent={palette.accent} mine={p.identity === me?.identity} />
                      {p.attributes.hand === '1' && <span aria-label="main levée" style={{ position: 'absolute', top: -4, right: 4, width: 22, height: 22, borderRadius: '50%', background: palette.primary, color: DC.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Hand size={12} aria-hidden="true" /></span>}
                      <span style={{ fontSize: 13, color: DC.soft, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.identity === me?.identity ? `${p.name || 'Toi'} (toi)` : p.name || 'Anonyme'}</span>
                    </div>
                  ))}
                  {listeners.length > 23 && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: DC.soft }}>+{listeners.length - 23}</span></div>}
                </div>
              )}
            </section>
          )}

          {ticket.isMod && status === 'ok' && (
            <section aria-label="Gérer la salle" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div role="tablist" aria-label="Gérer" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, border: `1px solid ${DC.line}`, overflowX: 'auto' }}>
                {([['questions', `Questions · ${live ? live.questions.filter(q => q.status === 'open').length : 0}`], ['images', `Images · ${live?.slides.length ?? 0}`], ['hands', `Mains · ${hands.length}`], ['stage', `Scène · ${stage.length}`], ['room', `Salle · ${listeners.length}`]] as const).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={hostTab === k} onClick={() => setHostTab(k)} style={{ flex: '1 0 auto', minHeight: 40, padding: '0 12px', borderRadius: 12, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, whiteSpace: 'nowrap', fontWeight: hostTab === k ? 700 : 500, background: hostTab === k ? palette.primary : 'transparent', color: hostTab === k ? DC.ink : DC.soft }}>{l}</button>
                ))}
              </div>
              {hostTab === 'questions' && <HostQuestions pencId={penc.id} questions={live?.questions ?? []} accent={palette.accent} onChanged={refresh} />}
              {hostTab === 'images' && <SlidesManager pencId={penc.id} slides={live?.slides ?? []} current={live?.slideIndex ?? null} accent={palette.accent} onChanged={refresh} />}
              {(hostTab === 'hands' ? hands : hostTab === 'stage' ? stage.filter(p => p.attributes.role !== 'host') : hostTab === 'room' ? listeners : []).map(p => (
                <div key={p.identity} style={row}>
                  <Avatar p={p} size={36} accent={palette.accent} mine={false} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Anonyme'}{p.attributes.invited === '1' ? <span style={{ fontSize: 13, color: DC.muted, fontWeight: 500 }}> · invité</span> : null}</span>
                  {hostTab !== 'stage' && p.attributes.invited !== '1' && <button type="button" disabled={!!busy} onClick={() => act(`inv${p.identity}`, () => inviteToStage(penc.id, p.identity))} style={btn(true)}>Inviter</button>}
                  {hostTab === 'stage' && micOn(p) && <button type="button" disabled={!!busy} aria-label={`Couper le micro de ${p.name}`} onClick={() => { const m = micPub(p); if (m) act(`mute${p.identity}`, () => muteSpeaker(penc.id, p.identity, m.trackSid)); }} style={btn(false)}><MicOff size={15} aria-hidden="true" /></button>}
                  {hostTab === 'stage' && <button type="button" disabled={!!busy} onClick={() => act(`rm${p.identity}`, () => removeFromStage(penc.id, p.identity))} style={btn(false)}>Descendre</button>}
                  <button type="button" aria-label={`Exclure ${p.name || 'cette personne'}`} onClick={() => setKickId(p.identity)} style={{ ...btn(false), padding: '0 10px' }}><UserX size={15} aria-hidden="true" /></button>
                </div>
              ))}
              {hostTab === 'hands' && hands.length === 0 && <p style={{ margin: 0, fontSize: 14, color: DC.faint }}>Aucune main levée pour l'instant.</p>}
              {kickId && (
                <div role="alertdialog" aria-label="Exclure" style={{ ...row, flexWrap: 'wrap', borderColor: 'rgba(240,154,122,.6)' }}>
                  <span style={{ flex: '1 1 100%', fontSize: 14 }}>Exclure cette personne de ce Pénc ? Elle ne pourra plus revenir.</span>
                  <button type="button" onClick={() => { const id = kickId; setKickId(null); act('kick', () => kickFromPenc(penc.id, id)); }} style={btn(true)}>Exclure</button>
                  <button type="button" onClick={() => setKickId(null)} style={btn(false)}>Annuler</button>
                </div>
              )}
            </section>
          )}

          {ending && (
            <section role="dialog" aria-label="Terminer le Pénc" style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: 14 }}>
              <b style={{ fontSize: 15 }}>Ce qu'on retient (3 idées, vues par tous après la fin)</b>
              {summary.map((s, i) => <input key={i} value={s} maxLength={200} onChange={e => setSummary(summary.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Idée ${i + 1}`} placeholder={`Idée ${i + 1}`} className="drl-input"
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 12px', fontFamily: 'inherit', fontSize: 16, color: DC.text }} />)}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={busy === 'end'} onClick={finish} style={{ ...btn(true), flex: 1, minHeight: 46 }}>{busy === 'end' ? <Loader2 size={16} className="animate-spin" aria-label="Fin" /> : 'Terminer pour tout le monde'}</button>
                <button type="button" onClick={() => setEnding(false)} style={btn(false)}>Retour</button>
              </div>
            </section>
          )}
          {error && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 14, lineHeight: 1.45 }}>{error}</p>}
        </div>
        {chat.length > 0 && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 72px 8px 16px', background: 'linear-gradient(to top, rgba(18,12,7,.92) 35%, rgba(18,12,7,0))', pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}><ChatFlux items={chat} onOpen={() => setSheet('chat')} /></div>
          </div>
        )}
        </div>

        {invited && (
          <section role="dialog" aria-label="Invitation à parler" style={{ margin: '0 16px 10px', padding: 16, borderRadius: 20, border: `1px solid ${palette.accent}88`, background: '#241911', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <b style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: DC.title }}>{penc.host.name} t'invite à prendre la parole</b>
            <span style={{ fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Ta voix sera entendue par les {people.length} personnes présentes, sous le nom « {me?.name || 'Anonyme'} ». Rien n'est enregistré. Ne donne ni ton nom complet, ni ton numéro.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={!!busy} onClick={accept} style={{ ...btn(true), flex: 1, minHeight: 46 }}>Prendre la parole</button>
              <button type="button" disabled={!!busy} onClick={decline} style={{ ...btn(false), minHeight: 46 }}>Non merci</button>
            </div>
          </section>
        )}

        <div aria-hidden="true" style={{ position: 'absolute', right: 24, bottom: 96, width: 40, height: 1, pointerEvents: 'none' }}>
          {hearts.map(h => <Heart key={h} className="penc-heart" size={26} fill="#F09A7A" color="#F09A7A" style={{ position: 'absolute', bottom: 0, left: (h * 7) % 20, animation: 'pencUp 1.6s ease-out forwards' }} />)}
        </div>

        {chatNote && (
          <p role={chatNote.kind === 'err' ? 'alert' : 'status'} style={{ margin: '0 16px 8px', padding: chatNote.kind === 'crisis' ? 12 : 0, borderRadius: 14, background: chatNote.kind === 'crisis' ? 'rgba(240,154,122,.12)' : 'transparent', fontSize: 14, lineHeight: 1.5, color: chatNote.kind === 'err' ? '#F09A7A' : chatNote.kind === 'ok' ? DC.sage : DC.text }}>
            {chatNote.kind === 'crisis'
              ? <>Ce que tu écris compte, et ça ne sera pas affiché devant tout le monde. Si tu penses à te faire du mal ou si tu es en danger maintenant, appelle le SAMU au <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a> ou le CHU de Fann au <a href="tel:+221338691820" style={{ fontWeight: 700 }}>33 869 18 20</a>.</>
              : chatNote.text}
          </p>
        )}
        {iSpeak && !ticket.isHost && (
          <button type="button" onClick={goDown} disabled={!!busy} style={{ ...btn(false), alignSelf: 'center', margin: '0 0 8px' }}>Redescendre de la scène</button>
        )}
        <footer style={{ padding: '10px 12px calc(14px + env(safe-area-inset-bottom, 0px))', background: '#1C130B', borderTop: `1px solid ${DC.line}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          <form onSubmit={send} style={{ flex: 1, minWidth: 0, height: 46, borderRadius: 23, border: `1px solid ${DC.line}`, background: 'rgba(28,20,13,.8)', display: 'flex', alignItems: 'center', padding: '0 6px 0 16px' }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={200} disabled={status !== 'ok'} aria-label="Écris un commentaire" placeholder="Écris un commentaire…" className="drl-input"
              style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: DC.text, fontFamily: 'inherit', fontSize: 16 }} />
            {draft.trim().length >= 2 && <button type="submit" aria-label="Envoyer le commentaire" style={{ width: 36, height: 36, borderRadius: '50%', border: 0, background: palette.primary, color: DC.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Send size={16} aria-hidden="true" /></button>}
          </form>
          <button type="button" onClick={() => setSheet('questions')} aria-label="Poser une question" style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', border: '1px solid rgba(201,184,228,.5)', background: 'rgba(201,184,228,.12)', color: '#C9B8E4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><HelpCircle size={20} aria-hidden="true" /></button>
          {iSpeak ? (
            <button type="button" onClick={toggleMic} disabled={!!busy} aria-pressed={me ? micOn(me) : false} aria-label={me && micOn(me) ? 'Couper mon micro' : 'Ouvrir mon micro'}
              style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: me && micOn(me) ? palette.primary : 'rgba(240,154,122,.25)', color: me && micOn(me) ? DC.ink : DC.text }}>
              {me && micOn(me) ? <Mic size={20} aria-hidden="true" /> : <MicOff size={20} aria-hidden="true" />}
            </button>
          ) : (
            <button type="button" onClick={toggleHand} disabled={!!busy || status !== 'ok'} aria-pressed={handUp} aria-label={handUp ? 'Baisser la main' : 'Lever la main'}
              style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: handUp ? `1px solid ${palette.accent}` : 0, background: handUp ? `${palette.accent}29` : 'rgba(255,255,255,.07)', color: handUp ? palette.accent : DC.text }}>
              <Hand size={20} aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={react} disabled={status !== 'ok'} aria-label="Envoyer un cœur" style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', border: 0, background: 'rgba(240,154,122,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Heart size={20} color="#F09A7A" fill="#F09A7A" aria-hidden="true" /></button>
        </footer>
        {sheet === 'chat' && <ChatSheet items={chat} isMod={ticket.isMod} onHide={cid => { setChat(c => c.filter(x => x.cid !== cid)); hideChat(penc.id, cid).catch(() => {}); }} onClose={() => setSheet(null)} />}
        {sheet === 'questions' && <QuestionsSheet pencId={penc.id} questions={live?.questions ?? []} accent={palette.accent} onChanged={refresh} onClose={() => setSheet(null)} />}
        {viewer && <ImageViewer url={viewer} onClose={() => setViewer(null)} />}
      </div>
    </section>
  );
};

export default PencRoom;

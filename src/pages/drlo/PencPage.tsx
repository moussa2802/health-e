/**
 * PencPage — « Pénc mi » : les discussions en direct.
 *   /penc       l'agenda : en direct, à venir (« Me rappeler »), terminés (ce qu'on retient + le test qui va avec)
 *   /penc/:id   un Pénc : sujet, animateur, accès, inscription
 * En direct : « Écouter maintenant » ouvre la salle d'écoute (PencRoom). L'hôte peut « Démarrer et entrer ».
 */
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Bell, BellRing, HelpCircle, ImagePlus, Loader2, Lock, Radio, Share2 } from 'lucide-react';
import HealthLogo from '../../components/brand/HealthLogo';
import { QuestionsSheet, SlidesManager } from '../../components/penc/PencLive';
import { liveState, previewPenc, sharePenc, type LiveState, type PencPreview } from '../../services/pencLiveService';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import LoadingCards from '../../components/accueil/LoadingCards';
import PencCard from '../../components/penc/PencCard';
import OpenPencNow from '../../components/penc/OpenPencNow';
import { Equalizer, HostAvatar, listenersLabel, PencLiveCard, PencMotif } from '../../components/penc/PencVisuals';
import { NotifOptinCard } from '../../components/accueil/NotificationsPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useLaunch } from '../../hooks/useLaunch';
import { useKoris } from '../../contexts/KorisContext';
import { SCALE_META } from '../../utils/scaleMeta';
import { loadPrefs, pushSupport } from '../../services/pushService';
import { getAgenda, getPenc, registerPenc, startPenc, whenLabel, type Penc } from '../../services/pencService';
import { joinRoom, type RoomTicket } from '../../services/pencRoomService';
import type { IdentityMode } from '../../services/drloBroadcastService';
// La salle (et LiveKit, ~400 Ko) ne se charge qu'au moment d'entrer
const PencRoom = lazy(() => import('../../components/penc/PencRoom'));

const h1: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.1, fontWeight: 600, color: DC.title };
const kicker: React.CSSProperties = { margin: '22px 0 10px', fontSize: 13, letterSpacing: '.12em', fontWeight: 700, color: DC.muted };
const RULES = 'Rien n\'est enregistré. Tu entres micro coupé, sous ton prénom, un pseudo ou en anonyme (avec un nom au hasard).';

/** « Me rappeler » : inscription, puis proposition d'activer les notifications si elles sont coupées. */
function useRemind(uid: string | null, onChanged: () => void) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [askNotif, setAskNotif] = useState(false);
  const { openNoKorisModal } = useKoris();
  const toggle = async (p: Penc) => {
    setBusy(p.id); setError('');
    try {
      await registerPenc(p.id, !p.registered);
      if (!p.registered && uid && pushSupport() !== 'unsupported') loadPrefs(uid).then(pr => { if (!pr.on) setAskNotif(true); }).catch(() => {});
      onChanged();
    } catch (e) {
      // Pénc payant sans assez d'étincelles : on propose d'en acheter, au lieu d'un simple message d'erreur
      if ((e as { status?: number }).status === 402) openNoKorisModal('Réserver ta place au Pénc mi', p.price);
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(''); }
  };
  return { busy, error, askNotif, toggle };
}

const TestLink: React.FC<{ scaleId: string; accent: string }> = ({ scaleId, accent }) => {
  const navigate = useNavigate();
  const meta = SCALE_META[scaleId];
  if (!meta) return null;
  const go = () => (meta.category === 'sexual' ? navigate(`/assessment/test/${scaleId}`) : navigate('/compagnon', { state: { prescribe: scaleId } }));
  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 16, border: `1px solid ${accent}77`, background: `${accent}14` }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', color: accent }}>ET TOI ?</p>
      <p style={{ margin: '6px 0 10px', fontFamily: 'Fraunces, serif', fontSize: 18, lineHeight: 1.25, color: DC.title }}>Le test « {meta.label} »</p>
      <button type="button" onClick={go} className="drl-btn" style={{ minHeight: 46, padding: '0 18px', borderRadius: 999, border: 0, background: accent, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Faire le test</button>
    </div>
  );
};

/** « Aujourd'hui », « Demain », ou « Samedi 8 novembre » : les Pénc à venir sont rangés par jour. */
function dayLabel(t: number) {
  const d = new Date(t); const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (d.toDateString() === now.toDateString()) return 'Aujourd\'hui';
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain';
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const Agenda: React.FC = () => {
  const palette = usePalette();
  const { currentUser } = useAuth();
  const [data, setData] = useState<{ live: Penc[]; upcoming: Penc[]; past: Penc[] } | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'chaines' | 'inscrit'>('all');
  const chainesOn = useLaunch().on('chaines');
  const load = () => getAgenda().then(r => { setData(r); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, []);
  const remind = useRemind(currentUser?.id ?? null, load);
  const keep = (p: Penc) => filter === 'all' || (filter === 'chaines' ? p.access === 'channel' && !p.locked : !!p.registered);
  const live = (data?.live ?? []).filter(keep);
  const upcoming = (data?.upcoming ?? []).filter(keep);
  const days: { label: string; items: Penc[] }[] = [];
  upcoming.forEach(p => { const l = dayLabel(p.startAt); const g = days.find(x => x.label === l); if (g) g.items.push(p); else days.push({ label: l, items: [p] }); });
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 40, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
    border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? `${palette.accent}22` : 'transparent', color: on ? palette.accent : DC.soft });
  return (
    <>
      <header style={{ position: 'relative', marginTop: 4, padding: '22px 18px 20px', borderRadius: 26, overflow: 'hidden', border: `1px solid ${palette.accent}33`,
        background: `radial-gradient(90% 120% at 100% 0%, ${palette.accent}2E, transparent 60%), linear-gradient(170deg, rgba(255,255,255,.05), rgba(255,255,255,.01))` }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -34, top: -22, opacity: 0.7 }}><PencMotif size={150} color={palette.accent} /></div>
        <p style={{ position: 'relative', margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.14em', color: palette.accent }}>LES DISCUSSIONS EN DIRECT</p>
        <h1 style={{ ...h1, position: 'relative', margin: '6px 0 0', fontSize: 34 }}>Pénc mi</h1>
        <p style={{ position: 'relative', margin: '8px 0 0', maxWidth: '68%', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>La place où l'on se retrouve pour parler. Écoute, pose ta question, prends la parole si tu veux.</p>
      </header>

      <div role="tablist" aria-label="Filtrer" style={{ marginTop: 14, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {([['all', 'Tous'], ['chaines', 'Mes chaînes'], ['inscrit', 'Mes rappels']] as const).filter(([k]) => k !== 'chaines' || chainesOn).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} style={chip(filter === k)}>{l}</button>
        ))}
      </div>

      {error && !data && <p role="alert" style={{ marginTop: 20, color: DC.muted }}>{error}</p>}
      {!data && !error && <LoadingCards label="Chargement de Pénc mi…" count={2} />}
      {data && (
        <>
          {live.length > 0 && (
            <>
              <h2 style={kicker}>EN DIRECT</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{live.map(p => <PencLiveCard key={p.id} p={p} palette={palette} />)}</div>
            </>
          )}

          <OpenPencNow palette={palette} />

          {days.map(g => (
            <section key={g.label} aria-label={g.label}>
              <h2 style={kicker}>{g.label.toUpperCase()}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{g.items.map(p => <PencCard key={p.id} p={p} accent={palette.accent} onRemind={remind.toggle} busy={remind.busy === p.id} />)}</div>
            </section>
          ))}
          {remind.error && <p role="alert" style={{ margin: '10px 2px 0', color: '#F09A7A', fontSize: 14 }}>{remind.error}</p>}
          {remind.askNotif && currentUser && <NotifOptinCard uid={currentUser.id} palette={palette} reason="penc" onDone={() => {}} />}

          {live.length === 0 && upcoming.length === 0 && (
            <section style={{ ...card, marginTop: 18, textAlign: 'center', padding: '26px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <PencMotif size={84} color={DC.muted} />
              <b style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: DC.title }}>{filter === 'all' ? 'La place est calme pour l\'instant' : 'Rien ici pour l\'instant'}</b>
              <span style={{ fontSize: 15, lineHeight: 1.5, color: DC.muted, maxWidth: 340 }}>Les prochains Pénc s'affichent ici et sur l'accueil. Un sujet te tient à cœur ? Propose-le.</span>
              <Link to="/boite-a-questions" className="drl-btn" style={{ marginTop: 6, minHeight: 46, padding: '0 18px', borderRadius: 999, border: `1px solid ${palette.accent}`, color: palette.accent, fontSize: 15, fontWeight: 700, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Proposer un sujet</Link>
            </section>
          )}

          {filter === 'all' && data.past.length > 0 && (
            <>
              <h2 style={kicker}>CE QU'ON A RETENU</h2>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -18px', padding: '2px 18px 6px', scrollSnapType: 'x proximity' }}>
                {data.past.map(p => (
                  <Link key={p.id} to={`/penc/${p.id}`} className="drl-btn" style={{ ...card, flex: '0 0 250px', scrollSnapAlign: 'start', boxSizing: 'border-box', textDecoration: 'none', color: DC.text, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 13, color: DC.faint }}>{p.host.name} · {new Date(p.startAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                    <b style={{ fontFamily: 'Fraunces, serif', fontSize: 17, lineHeight: 1.25, color: DC.title }}>{p.title}</b>
                    {p.summary[0] && <span style={{ fontSize: 14, lineHeight: 1.5, color: DC.soft, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>« {p.summary[0]} »</span>}
                  </Link>
                ))}
              </div>
            </>
          )}
          <p style={{ margin: '18px 2px 0', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>{RULES}</p>
        </>
      )}
    </>
  );
};

const ID_KEY = 'he_comment_identity';
const RULES_KEY = 'he_penc_rules';
const loadIdt = (): { mode: IdentityMode; pseudo: string } => {
  try { const v = JSON.parse(localStorage.getItem(ID_KEY) || '{}'); if (['anon', 'prenom', 'pseudo'].includes(v.mode)) return { mode: v.mode, pseudo: String(v.pseudo || '') }; } catch { /* ignore */ }
  return { mode: 'anon', pseudo: '' };
};

/** Avant d'entrer : sous quel nom, et les règles (une seule fois). */
const EnterSheet: React.FC<{ accent: string; primary: string; busy: boolean; host: boolean; onGo: (mode: IdentityMode, pseudo: string) => void; onCancel: () => void }> = ({ accent, primary, busy, host, onGo, onCancel }) => {
  const [idt, setIdt] = useState(loadIdt);
  const [rulesOk, setRulesOk] = useState(() => { if (host) return true; try { return localStorage.getItem(RULES_KEY) === '1'; } catch { return false; } });
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 42, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: on ? 700 : 600, border: `1px solid ${on ? accent : DC.line}`, background: on ? `${accent}26` : 'transparent', color: on ? accent : DC.text });
  const go = () => {
    try { localStorage.setItem(ID_KEY, JSON.stringify(idt)); localStorage.setItem(RULES_KEY, '1'); } catch { /* ignore */ }
    onGo(idt.mode, idt.pseudo);
  };
  return (
    <section role="dialog" aria-label="Entrer dans la salle" style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, borderColor: `${accent}88` }}>
      {!host && (
        <>
          <b style={{ fontSize: 15, color: DC.title }}>Tu entres sous le nom</b>
          <div role="radiogroup" aria-label="Ton nom dans la salle" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {([['prenom', 'Mon prénom'], ['anon', 'Anonyme'], ['pseudo', 'Un pseudo']] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={idt.mode === k} onClick={() => setIdt({ ...idt, mode: k })} style={chip(idt.mode === k)}>{l}</button>)}
          </div>
          {idt.mode === 'anon' && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Tu reçois un nom au hasard (comme « Baobab_Zen » ou « Awa_21 »). Personne ne peut savoir que c'est un nom inventé.</p>}
          {idt.mode === 'pseudo' && <input value={idt.pseudo} maxLength={20} onChange={e => setIdt({ ...idt, pseudo: e.target.value })} aria-label="Ton pseudo" placeholder="Ton pseudo" className="drl-input" style={{ minHeight: 46, boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text }} />}
        </>
      )}
      {!rulesOk && (
        <div style={{ fontSize: 14, lineHeight: 1.55, color: DC.soft }}>
          <b style={{ color: DC.text }}>Les règles du Pénc</b>
          <ul style={{ margin: '6px 0 8px', paddingLeft: 18 }}>
            <li>On s'écoute et on se respecte : pas de moquerie, pas d'insulte.</li>
            <li>Ce qui est dit dans le Pénc reste dans le Pénc. Pas d'enregistrement.</li>
            <li>Ne donne ni ton nom complet, ni ton numéro, ni de détail qui permet de te reconnaître.</li>
            <li>Ce n'est pas une consultation. Urgence : 1515.</li>
          </ul>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: DC.text, cursor: 'pointer' }}><input type="checkbox" checked={rulesOk} onChange={e => setRulesOk(e.target.checked)} /> J'accepte les règles</label>
        </div>
      )}
      <button type="button" disabled={busy || !rulesOk} onClick={go} className="drl-btn" style={{ minHeight: 50, borderRadius: 999, border: 0, background: primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: busy || !rulesOk ? 0.5 : 1 }}>
        {busy ? <Loader2 size={18} className="animate-spin" aria-label="Entrée" /> : host ? 'Entrer dans la salle' : 'Écouter maintenant'}
      </button>
      <button type="button" onClick={onCancel} style={{ minHeight: 42, borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.muted, cursor: 'pointer' }}>Annuler</button>
    </section>
  );
};

const Detail: React.FC<{ id: string }> = ({ id }) => {
  const palette = usePalette();
  const { currentUser } = useAuth();
  const [p, setP] = useState<Penc | null>(null);
  const [error, setError] = useState('');
  const [confirmPay, setConfirmPay] = useState(false);
  const [entering, setEntering] = useState(false);
  const [ticket, setTicket] = useState<RoomTicket | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');
  const loc = useLocation();
  const autoEnter = !!(loc.state as { autoEnter?: boolean } | null)?.autoEnter;
  const [live, setLive] = useState<LiveState | null>(null);
  const [askOpen, setAskOpen] = useState(() => new URLSearchParams(loc.search).get('ask') === '1');
  const [prep, setPrep] = useState(false);
  const [shared, setShared] = useState('');
  const loadLive = () => liveState(id).then(setLive).catch(() => {});
  useEffect(() => { if (askOpen || prep) loadLive(); }, [askOpen, prep]); // eslint-disable-line react-hooks/exhaustive-deps
  const share = () => { if (p) sharePenc(p.id, p.title).then(r => { if (r === 'copied') { setShared('Lien copié : colle-le dans WhatsApp.'); window.setTimeout(() => setShared(''), 3000); } }); };
  const autoDone = useRef(false);
  const load = () => getPenc(id).then(r => { setP(r.penc); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const remind = useRemind(currentUser?.id ?? null, load);
  const enter = async (mode: IdentityMode, pseudo: string) => {
    if (!p) return;
    setJoinBusy(true); setJoinError('');
    try {
      if (p.mineAsHost && p.status === 'scheduled') await startPenc(p.id);
      setTicket(await joinRoom(p.id, mode, pseudo));
      setEntering(false);
    } catch (e) { setJoinError(e instanceof Error ? e.message : 'Erreur'); } finally { setJoinBusy(false); }
  };
  // Pénc ouvert à l'instant par son hôte : on entre directement dans la salle
  useEffect(() => {
    if (autoEnter && !autoDone.current && p && p.mineAsHost && p.status === 'live') { autoDone.current = true; void enter('anon', ''); }
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error && !p) return <p role="alert" style={{ marginTop: 20, color: DC.muted }}>{error} <Link to="/penc" style={{ color: palette.accent }}>Voir Pénc mi</Link></p>;
  if (!p) return <LoadingCards label="Ouverture…" count={1} />;
  const primary: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const canEnter = !p.locked && (p.access !== 'paid' || !!p.registered || !!p.mineAsHost);
  if (ticket) return <Suspense fallback={<LoadingCards label="Ouverture de la salle…" count={1} />}><PencRoom penc={p} ticket={ticket} palette={palette} onLeave={() => { setTicket(null); load(); }} /></Suspense>;
  const status = p.status === 'live' ? 'EN DIRECT' : p.status === 'ended' ? 'TERMINÉ' : 'À VENIR';
  return (
    <>
      <section style={{ marginTop: 10, padding: '26px 18px 20px', borderRadius: 26, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        border: `1px solid ${p.status === 'live' ? `${palette.accent}88` : DC.line}`,
        background: p.status === 'live' ? `radial-gradient(90% 70% at 50% 0%, ${palette.accent}33, transparent 70%), linear-gradient(180deg, #2E1F14, #1A130D)` : 'rgba(255,255,255,.04)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 800, letterSpacing: '.1em',
          color: p.status === 'live' ? palette.accent : DC.muted, background: p.status === 'live' ? `${palette.accent}1F` : 'rgba(255,255,255,.06)' }}>
          {p.status === 'live' && <Equalizer color={palette.accent} />}PÉNC MI · {status}
        </span>
        <div style={{ padding: 10 }}><HostAvatar host={p.host} size={84} palette={palette} live={p.status === 'live'} /></div>
        <h1 style={{ ...h1, margin: 0, fontSize: 27, lineHeight: 1.2 }}>{p.title}</h1>
        <p style={{ margin: 0, fontSize: 15, color: DC.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          <b>{p.host.name}</b>{p.host.title ? <span style={{ color: DC.muted }}>· {p.host.title}</span> : null}
          {p.host.pro && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: DC.sage }}><BadgeCheck size={14} aria-hidden="true" />vérifié par l'équipe</span>}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 2 }}>
          {[p.status === 'live' ? (listenersLabel(p.listeners) ?? 'En direct') : `${whenLabel(p.startAt)}`, `${p.durationMin} min`,
            p.access === 'channel' ? `Membres de « ${p.channelName} »` : p.access === 'paid' ? `${p.price} étincelle${p.price > 1 ? 's' : ''}` : 'Ouvert à tous',
            ...(p.status === 'scheduled' ? [`${p.registeredCount} inscrit${p.registeredCount > 1 ? 's' : ''}`] : [])].map(t => (
            <span key={t} style={{ padding: '6px 10px', borderRadius: 999, fontSize: 13, color: DC.soft, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.04)' }}>{t}</span>
          ))}
        </div>
        {p.description && <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.6, color: DC.soft, whiteSpace: 'pre-wrap', textAlign: 'left', alignSelf: 'stretch' }}>{p.description}</p>}
      </section>

      {p.status === 'ended' ? (
        <>
          {p.summary.length > 0 && (
            <section aria-label="Ce qu'on retient" style={{ ...card, marginTop: 12 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', color: palette.accent }}>CE QU'ON RETIENT</p>
              <ol style={{ margin: '10px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: 1.5, color: DC.text }}>{p.summary.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </section>
          )}
          {p.testScaleId && <TestLink scaleId={p.testScaleId} accent={palette.accent} />}
        </>
      ) : p.locked ? (
        <Link to={`/chaines/${p.channelId}`} className="drl-btn" style={{ ...primary, marginTop: 14, textDecoration: 'none' }}><Lock size={17} aria-hidden="true" />Rejoindre la chaîne pour participer</Link>
      ) : (p.status === 'live' || (p.mineAsHost && p.status === 'scheduled')) && canEnter ? (
        entering
          ? <EnterSheet accent={palette.accent} primary={palette.primary} busy={joinBusy} host={!!p.mineAsHost} onGo={enter} onCancel={() => setEntering(false)} />
          : <button type="button" onClick={() => setEntering(true)} className="drl-btn" style={{ ...primary, marginTop: 14 }}><Radio size={18} aria-hidden="true" />{p.mineAsHost ? (p.status === 'live' ? 'Revenir dans ma salle' : 'Démarrer et entrer') : 'Écouter maintenant'}</button>
      ) : p.access === 'paid' && !p.registered ? (
        confirmPay ? (
          <section style={{ ...card, marginTop: 14 }}>
            <p style={{ margin: 0, fontSize: 15, color: DC.text, lineHeight: 1.5 }}>{p.price} étincelle{p.price > 1 ? 's' : ''} débitée{p.price > 1 ? 's' : ''} maintenant. Rendues si le Pénc est annulé.</p>
            <button type="button" disabled={remind.busy === p.id} onClick={() => remind.toggle(p)} className="drl-btn" style={{ ...primary, marginTop: 12 }}>{remind.busy === p.id ? <Loader2 size={18} className="animate-spin" aria-label="Inscription" /> : 'Confirmer'}</button>
            <button type="button" onClick={() => setConfirmPay(false)} style={{ marginTop: 8, width: '100%', minHeight: 44, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer' }}>Annuler</button>
          </section>
        ) : <button type="button" onClick={() => setConfirmPay(true)} className="drl-btn" style={{ ...primary, marginTop: 14 }}>S'inscrire · {p.price} étincelle{p.price > 1 ? 's' : ''}</button>
      ) : (
        <button type="button" disabled={remind.busy === p.id || (p.access === 'paid' && !!p.registered)} onClick={() => remind.toggle(p)} className="drl-btn"
          style={p.registered ? { ...primary, marginTop: 14, background: 'transparent', border: `1px solid ${palette.accent}`, color: palette.accent } : { ...primary, marginTop: 14 }}>
          {p.registered ? <><BellRing size={18} aria-hidden="true" />Inscrit · on te prévient</> : <><Bell size={18} aria-hidden="true" />Me rappeler</>}
        </button>
      )}
      {p.status !== 'ended' && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: p.locked ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <button type="button" onClick={share} className="drl-btn" style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Share2 size={17} aria-hidden="true" />Partager</button>
          {!p.locked && <button type="button" onClick={() => setAskOpen(true)} className="drl-btn" style={{ minHeight: 46, borderRadius: 999, border: '1px solid rgba(201,184,228,.55)', background: 'rgba(201,184,228,.1)', color: '#E6DCF4', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><HelpCircle size={17} aria-hidden="true" />Poser une question</button>}
        </div>
      )}
      {shared && <p role="status" style={{ margin: '8px 2px 0', fontSize: 14, color: DC.sage }}>{shared}</p>}
      {p.mineAsHost && p.status !== 'ended' && (
        prep ? (
          <section aria-label="Préparer le Pénc" style={{ ...card, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <b style={{ fontSize: 15, color: DC.title }}>Images de présentation</b>
            <SlidesManager pencId={p.id} slides={live?.slides ?? []} current={live?.slideIndex ?? null} accent={palette.accent} onChanged={loadLive} />
            {live && live.questions.length > 0 && <p style={{ margin: 0, fontSize: 14, color: DC.soft }}>{live.questions.filter(q => q.status === 'open').length} question(s) déjà reçue(s) : tu les verras dans la salle, onglet « Questions ».</p>}
          </section>
        ) : <button type="button" onClick={() => setPrep(true)} className="drl-btn" style={{ marginTop: 10, width: '100%', minHeight: 46, borderRadius: 999, border: `1px dashed ${palette.accent}`, background: 'transparent', color: palette.accent, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><ImagePlus size={17} aria-hidden="true" />Préparer les images et voir les questions</button>
      )}
      {askOpen && <QuestionsSheet pencId={p.id} questions={live?.questions ?? []} accent={palette.accent} canAsk={p.status !== 'ended'} onChanged={loadLive} onClose={() => setAskOpen(false)} />}
      {(remind.error || joinError) && <p role="alert" style={{ margin: '10px 2px 0', color: '#F09A7A', fontSize: 14 }}>{joinError || remind.error}</p>}
      {remind.askNotif && currentUser && <NotifOptinCard uid={currentUser.id} palette={palette} reason="penc" onDone={() => {}} />}
      <p style={{ margin: '16px 2px 0', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>{RULES} Ce n'est pas une consultation. Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>.</p>
    </>
  );
};

/** Ouvert depuis le lien partagé, sans compte : le sujet, la date, et entrer (le compte se crée en 30 secondes). */
const PublicPenc: React.FC<{ id: string }> = ({ id }) => {
  const palette = usePalette();
  const navigate = useNavigate();
  const [p, setP] = useState<PencPreview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { previewPenc(id).then(setP).catch(e => setError(e instanceof Error ? e.message : 'Pénc introuvable')); }, [id]);
  const go = (ask: boolean) => navigate(`/patient/access?returnTo=${encodeURIComponent(`/penc/${id}${ask ? '?ask=1' : ''}`)}`);
  const when = p ? new Date(p.startAt) : null;
  return (
    <div className="drl-screen font-sans" style={{ minHeight: '100svh', background: `radial-gradient(circle at 50% 0%, #3A2616 0%, #1C130B 42%, #120C07 100%)`, color: DC.text }}>
      <div className="drl-wrap" style={{ margin: '0 auto', padding: '18px 18px 32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link to="/" aria-label="Health-e, accueil" style={{ display: 'inline-flex', minHeight: 44, alignItems: 'center' }}><HealthLogo height={22} /></Link>
        {error && <p role="alert" style={{ color: DC.muted }}>{error} <Link to="/" style={{ color: palette.accent }}>Découvrir Health-e</Link></p>}
        {!p && !error && <LoadingCards label="Ouverture…" count={1} />}
        {p && when && (
          <>
            <section style={{ padding: '20px 18px', borderRadius: 24, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(233,200,143,.3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.06em', color: '#E9C88F' }}>
                {p.status === 'live' && <Equalizer color={palette.accent} />}PÉNC MI · {p.status === 'live' ? 'EN DIRECT' : p.status === 'ended' ? 'TERMINÉ' : 'À VENIR'}
              </p>
              <h1 style={{ ...h1, margin: 0, fontSize: 26, lineHeight: 1.2 }}>{p.title}</h1>
              {p.description && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: DC.soft, whiteSpace: 'pre-wrap' }}>{p.description}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 4 }}>
                <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,.05)' }}><p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Quand</p><p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700 }}>{whenLabel(p.startAt)}</p></div>
                <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,.05)' }}><p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Animé par</p><p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700 }}>{p.host.name}</p></div>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: DC.muted }}>
                {p.registeredCount > 0 ? `${p.registeredCount} inscrit${p.registeredCount > 1 ? 's' : ''} · ` : ''}{p.access === 'paid' ? `${p.price} étincelle${p.price > 1 ? 's' : ''}` : p.access === 'channel' ? `Membres de « ${p.channelName} »` : 'Gratuit'}
              </p>
            </section>
            {p.status !== 'ended' ? (
              <>
                <button type="button" onClick={() => go(false)} className="drl-btn" style={{ minHeight: 52, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontFamily: 'inherit', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>{p.status === 'live' ? 'Rejoindre le Pénc' : 'Me rappeler'}</button>
                <button type="button" onClick={() => go(true)} className="drl-btn" style={{ minHeight: 48, borderRadius: 999, border: '1px solid rgba(201,184,228,.5)', background: 'transparent', color: '#E6DCF4', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Laisser une question avant</button>
                <p style={{ margin: 0, textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>Pas encore de compte ? Tu le crées en 30 secondes, avec juste un pseudo si tu préfères. Dans le Pénc, tu peux rester anonyme.</p>
              </>
            ) : <Link to="/" className="drl-btn" style={{ minHeight: 52, borderRadius: 999, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Découvrir Health-e</Link>}
          </>
        )}
      </div>
    </div>
  );
};

const PencPage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { authReady, isAuthenticated } = useAuth();
  useEffect(() => { if (authReady && !isAuthenticated && !id) navigate(`/patient/access?returnTo=${encodeURIComponent('/penc')}`, { replace: true }); }, [authReady, isAuthenticated, navigate, id]);
  if (!authReady) return null;
  if (!isAuthenticated) return id ? <PublicPenc id={id} /> : null;
  return (
    <DrLoShell back={id ? { to: '/penc', label: 'Pénc mi' } : { to: '/', label: 'Accueil' }} palette={palette}>
      {id ? <Detail id={id} /> : <div style={{ marginTop: 16 }}><Agenda /></div>}
    </DrLoShell>
  );
};

export default PencPage;

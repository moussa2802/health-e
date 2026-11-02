/**
 * PencPage — « Pénc mi » : les discussions en direct.
 *   /penc       l'agenda : en direct, à venir (« Me rappeler »), terminés (ce qu'on retient + le test qui va avec)
 *   /penc/:id   un Pénc : sujet, animateur, accès, inscription
 * La salle d'écoute (audio) arrive à l'étape suivante.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Bell, BellRing, Loader2, Lock, Radio } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import LoadingCards from '../../components/accueil/LoadingCards';
import PencCard from '../../components/penc/PencCard';
import { NotifOptinCard } from '../../components/accueil/NotificationsPanel';
import { useAuth } from '../../contexts/AuthContext';
import { SCALE_META } from '../../utils/scaleMeta';
import { loadPrefs, pushSupport } from '../../services/pushService';
import { getAgenda, getPenc, registerPenc, whenLabel, type Penc } from '../../services/pencService';

const h1: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.1, fontWeight: 600, color: DC.title };
const kicker: React.CSSProperties = { margin: '22px 0 10px', fontSize: 13, letterSpacing: '.12em', fontWeight: 700, color: DC.muted };
const RULES = 'Rien n\'est enregistré. Tu entres micro coupé, sous ton prénom, un pseudo ou en anonyme.';

/** « Me rappeler » : inscription, puis proposition d'activer les notifications si elles sont coupées. */
function useRemind(uid: string | null, onChanged: () => void) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [askNotif, setAskNotif] = useState(false);
  const toggle = async (p: Penc) => {
    setBusy(p.id); setError('');
    try {
      await registerPenc(p.id, !p.registered);
      if (!p.registered && uid && pushSupport() !== 'unsupported') loadPrefs(uid).then(pr => { if (!pr.on) setAskNotif(true); }).catch(() => {});
      onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(''); }
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

const LiveCard: React.FC<{ p: Penc; accent: string }> = ({ p, accent }) => (
  <Link to={`/penc/${p.id}`} className="drl-btn" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', color: DC.text, borderColor: `${accent}99`, background: `${accent}1F` }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: accent }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F09A7A' }} />EN DIRECT</span>
    <b style={{ fontFamily: 'Fraunces, serif', fontSize: 20, lineHeight: 1.2, color: DC.title }}>{p.title}</b>
    <span style={{ fontSize: 14, color: DC.soft }}>{p.host.name}{p.host.title ? ` · ${p.host.title}` : ''}</span>
  </Link>
);

const Agenda: React.FC = () => {
  const palette = usePalette();
  const { currentUser } = useAuth();
  const [data, setData] = useState<{ live: Penc[]; upcoming: Penc[]; past: Penc[] } | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'chaines' | 'inscrit'>('all');
  const load = () => getAgenda().then(r => { setData(r); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, []);
  const remind = useRemind(currentUser?.id ?? null, load);
  if (error && !data) return <p role="alert" style={{ marginTop: 20, color: DC.muted }}>{error}</p>;
  if (!data) return <LoadingCards label="Chargement de Pénc mi…" count={2} />;
  const keep = (p: Penc) => filter === 'all' || (filter === 'chaines' ? p.access === 'channel' && !p.locked : !!p.registered);
  const live = data.live.filter(keep);
  const upcoming = data.upcoming.filter(keep);
  return (
    <>
      <h1 style={h1}>Pénc mi</h1>
      <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft }}>On se retrouve pour parler, en direct. Tu écoutes, tu poses ta question, et si tu veux, tu prends la parole.</p>
      <div role="tablist" aria-label="Filtrer" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4, padding: 4, borderRadius: 999, border: `1px solid ${DC.line}` }}>
        {([['all', 'Tous'], ['chaines', 'Mes chaînes'], ['inscrit', 'Inscrit']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            style={{ minHeight: 42, borderRadius: 999, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: filter === k ? 700 : 500, background: filter === k ? palette.primary : 'transparent', color: filter === k ? DC.ink : DC.soft }}>{l}</button>
        ))}
      </div>
      {live.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>{live.map(p => <LiveCard key={p.id} p={p} accent={palette.accent} />)}</div>}
      <h2 style={kicker}>À VENIR</h2>
      {upcoming.length === 0 && <p style={{ margin: 0, fontSize: 15, color: DC.muted }}>{filter === 'all' ? 'Aucun Pénc programmé pour l\'instant. Reviens bientôt.' : 'Rien ici pour l\'instant.'}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{upcoming.map(p => <PencCard key={p.id} p={p} accent={palette.accent} onRemind={remind.toggle} busy={remind.busy === p.id} />)}</div>
      {remind.error && <p role="alert" style={{ margin: '10px 2px 0', color: '#F09A7A', fontSize: 14 }}>{remind.error}</p>}
      {remind.askNotif && currentUser && <NotifOptinCard uid={currentUser.id} palette={palette} reason="penc" onDone={() => {}} />}
      {filter === 'all' && data.past.length > 0 && (
        <>
          <h2 style={kicker}>CE QU'ON A RETENU</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.past.map(p => (
              <Link key={p.id} to={`/penc/${p.id}`} className="drl-btn" style={{ ...card, textDecoration: 'none', color: DC.text }}>
                <b style={{ display: 'block', fontSize: 16, color: DC.title }}>{p.title}</b>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: DC.faint }}>{p.host.name} · {new Date(p.startAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                {p.summary[0] && <span style={{ display: 'block', marginTop: 6, fontSize: 14, lineHeight: 1.5, color: DC.soft }}>« {p.summary[0]} »</span>}
              </Link>
            ))}
          </div>
        </>
      )}
      <p style={{ margin: '18px 2px 0', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>{RULES}</p>
    </>
  );
};

const Detail: React.FC<{ id: string }> = ({ id }) => {
  const palette = usePalette();
  const { currentUser } = useAuth();
  const [p, setP] = useState<Penc | null>(null);
  const [error, setError] = useState('');
  const [confirmPay, setConfirmPay] = useState(false);
  const load = () => getPenc(id).then(r => { setP(r.penc); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const remind = useRemind(currentUser?.id ?? null, load);
  if (error && !p) return <p role="alert" style={{ marginTop: 20, color: DC.muted }}>{error} <Link to="/penc" style={{ color: palette.accent }}>Voir Pénc mi</Link></p>;
  if (!p) return <LoadingCards label="Ouverture…" count={1} />;
  const primary: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const status = p.status === 'live' ? 'EN DIRECT' : p.status === 'ended' ? 'TERMINÉ' : 'À VENIR';
  return (
    <>
      <section style={{ ...card, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, borderColor: p.status === 'live' ? `${palette.accent}99` : DC.line }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: p.status === 'live' ? palette.accent : DC.muted }}>
          {p.status === 'live' && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F09A7A' }} />}PÉNC MI · {status}
        </span>
        <h1 style={{ ...h1, margin: 0, fontSize: 26 }}>{p.title}</h1>
        <p style={{ margin: 0, fontSize: 15, color: DC.soft }}>{whenLabel(p.startAt)} · {p.durationMin} min</p>
        <p style={{ margin: 0, fontSize: 15, color: DC.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          Animé par <b>{p.host.name}</b>{p.host.title ? ` · ${p.host.title}` : ''}
          {p.host.pro && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: DC.sage }}><BadgeCheck size={14} aria-hidden="true" />vérifié par Dr Lô</span>}
        </p>
        {p.description && <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft, whiteSpace: 'pre-wrap' }}>{p.description}</p>}
        <p style={{ margin: '4px 0 0', fontSize: 13, color: DC.faint }}>
          {p.access === 'channel' ? `Réservé aux membres de « ${p.channelName} »` : p.access === 'paid' ? `Entrée : ${p.price} étincelle${p.price > 1 ? 's' : ''}` : 'Ouvert à tous'} · {p.registeredCount} inscrit{p.registeredCount > 1 ? 's' : ''}
        </p>
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
      ) : p.status === 'live' ? (
        <div role="status" style={{ ...card, marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Radio size={20} color={palette.accent} aria-hidden="true" />
          <span style={{ fontSize: 15, lineHeight: 1.5, color: DC.text }}>C'est en direct. La salle d'écoute s'ouvre ici dans la prochaine mise à jour.</span>
        </div>
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
      {remind.error && <p role="alert" style={{ margin: '10px 2px 0', color: '#F09A7A', fontSize: 14 }}>{remind.error}</p>}
      {remind.askNotif && currentUser && <NotifOptinCard uid={currentUser.id} palette={palette} reason="penc" onDone={() => {}} />}
      <p style={{ margin: '16px 2px 0', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>{RULES} Ce n'est pas une consultation. Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>.</p>
    </>
  );
};

const PencPage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { authReady, isAuthenticated } = useAuth();
  useEffect(() => { if (authReady && !isAuthenticated) navigate(`/patient/access?returnTo=${encodeURIComponent(id ? `/penc/${id}` : '/penc')}`, { replace: true }); }, [authReady, isAuthenticated, navigate, id]);
  if (!authReady || !isAuthenticated) return null;
  return (
    <DrLoShell back={id ? { to: '/penc', label: 'Pénc mi' } : undefined} palette={palette}>
      {id ? <Detail id={id} /> : <div style={{ marginTop: 16 }}><Agenda /></div>}
    </DrLoShell>
  );
};

export default PencPage;

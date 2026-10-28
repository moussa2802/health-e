/**
 * ChainesPage — les chaînes de Dr Lô, côté personne.
 *   /chaines       la liste (« Mes chaînes » puis « À découvrir »)
 *   /chaines/:id   une chaîne : conditions, ce qu'il manque, rejoindre, quitter
 * L'admissibilité est calculée par le serveur ; ici on ne fait qu'afficher. On ne voit que le NOMBRE de membres.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, BellOff, Check, ChevronRight, Circle, Loader2, Users } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { RealDrLoPhoto } from '../../components/accueil/RealDrLoBadge';
import ChannelFeed from '../../components/accueil/ChannelFeed';
import { useAuth } from '../../contexts/AuthContext';
import { SCALE_META } from '../../utils/scaleMeta';
import { getChannel, joinChannel, leaveChannel, listChannels, muteChannel, type Channel, type Missing } from '../../services/drloChannelService';
import type { Level } from '../../services/drloBroadcastService';

const LEVEL_LABEL: Record<Level, string> = { bon: 'tout va bien', leger: 'léger', modere: 'modéré', eleve: 'élevé' };
const scaleLabel = (id: string) => SCALE_META[id]?.label ?? id;
const TOTEM_LABEL: Record<string, string> = { elephant: 'éléphant', panthere: 'panthère' };
const totemLabel = (t: string) => TOTEM_LABEL[t] ?? t;
const h1: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'Georgia, serif', fontSize: 28, lineHeight: 1.15, color: DC.title };
const monthYear = (t: number | null) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Une phrase simple pour chaque condition non remplie. */
function missingText(m: Missing): string {
  switch (m.kind) {
    case 'test': return `Fais le test « ${scaleLabel(m.scaleId)} »${m.levels?.length ? ` (résultat : ${m.levels.map(l => LEVEL_LABEL[l]).join(' ou ')})` : ''}`;
    case 'level': return `Ton résultat au test « ${scaleLabel(m.scaleId)} » ne correspond pas (il faut : ${m.levels.map(l => LEVEL_LABEL[l]).join(' ou ')})`;
    case 'totem': return m.known ? `Réservé aux totems : ${m.totems.map(totemLabel).join(', ')}` : 'Découvre ton totem (7 tests psychologiques)';
    case 'age': return m.known ? `Réservé aux ${m.minAge} ans et plus` : 'Complète ton profil (tranche d\'âge) pour entrer';
    case 'balance': return `Il te manque ${m.need - m.have} étincelle${m.need - m.have > 1 ? 's' : ''}`;
  }
}
/** Où envoyer la personne pour régler ce qui manque. */
function missingLink(m: Missing): { to: string; label: string } | null {
  switch (m.kind) {
    case 'test': return { to: `/assessment/test/${m.scaleId}`, label: 'Faire le test' };
    case 'level': return { to: `/assessment/test/${m.scaleId}`, label: 'Revoir le test' };
    case 'totem': return m.known ? null : { to: '/assessment/totem', label: 'Mon totem' };
    case 'age': return m.known ? null : { to: '/assessment/profile', label: 'Mon profil' };
    case 'balance': return { to: '/acheter-koris', label: 'Obtenir des étincelles' };
  }
}

const Cover: React.FC<{ c: Channel; h: number }> = ({ c, h }) => (
  <div aria-hidden="true" style={{ height: h, background: c.photoUrl ? `center / cover url(${c.photoUrl})` : 'linear-gradient(135deg, rgba(157,191,175,.35), rgba(233,200,143,.25))' }} />
);
const Pills: React.FC<{ c: Channel }> = ({ c }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12.5, color: DC.muted, alignItems: 'center' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={14} aria-hidden="true" /> {c.memberCount} membre{c.memberCount > 1 ? 's' : ''}</span>
    <span style={{ padding: '2px 10px', borderRadius: 999, border: `1px solid ${DC.line}`, color: DC.gold, fontWeight: 700 }}>{c.price > 0 ? `${c.price} étincelles` : 'Gratuite'}</span>
  </div>
);

// ───────── Liste ─────────
const List: React.FC<{ palette: ReturnType<typeof usePalette> }> = ({ palette }) => {
  const [items, setItems] = useState<Channel[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { listChannels().then(r => setItems(r.items)).catch(e => setError(e instanceof Error ? e.message : 'Erreur')); }, []);
  const mine = (items ?? []).filter(c => c.member);
  const others = (items ?? []).filter(c => !c.member);
  const row = (c: Channel) => (
    <Link key={c.id} to={`/chaines/${c.id}`} className="drl-btn" style={{ ...card, padding: 0, overflow: 'hidden', textDecoration: 'none', display: 'block', borderColor: c.member ? palette.accent : DC.line }}>
      <Cover c={c} h={96} />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 18, color: DC.title, flex: 1 }}>{c.name}</h3>
          {c.archived && <span style={{ fontSize: 11.5, color: DC.faint }}>Archivée</span>}
          {c.member && c.news && c.news.posts + c.news.replies > 0 && (
            <span style={{ minWidth: 22, height: 22, padding: '0 7px', boxSizing: 'border-box', borderRadius: 11, background: '#E8664F', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label={`${c.news.posts + c.news.replies} nouveauté${c.news.posts + c.news.replies > 1 ? 's' : ''}`}>{c.news.posts + c.news.replies}</span>
          )}
          <ChevronRight size={18} color={DC.faint} aria-hidden="true" />
        </div>
        <p style={{ margin: '4px 0 8px', fontSize: 14, color: DC.soft, lineHeight: 1.45 }}>{c.description}</p>
        <Pills c={c} />
        {!c.member && (
          <p style={{ margin: '10px 0 0', fontSize: 13.5, fontWeight: 700, color: c.eligible ? DC.ok : palette.accent }}>
            {c.eligible ? 'Tu peux rejoindre cette chaîne' : c.missing.length === 1 ? missingText(c.missing[0]) : `Il te manque ${c.missing.length} choses pour entrer`}
          </p>
        )}
      </div>
    </Link>
  );
  return (
    <>
      <p style={{ margin: '18px 0 0', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Dr Lô</p>
      <h1 style={h1}>Les chaînes</h1>
      <p style={{ margin: '8px 0 0', fontSize: 14.5, color: DC.muted, lineHeight: 1.55 }}>Des espaces thématiques où Dr Lô publie des vocaux et des textes dans la durée. Tu entres une fois, tu restes aussi longtemps que tu veux.</p>
      {error && <p role="alert" style={{ marginTop: 16, color: '#F09A7A', fontSize: 14 }}>{error}</p>}
      {!items && !error && <Loader2 className="animate-spin" aria-label="Chargement" style={{ marginTop: 20 }} />}
      {items && items.length === 0 && <p style={{ marginTop: 16, color: DC.muted, fontSize: 15 }}>Pas encore de chaîne. Dr Lô en ouvrira bientôt.</p>}
      {mine.length > 0 && <section aria-label="Mes chaînes" style={{ marginTop: 20 }}><h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.text }}>Mes chaînes</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>{mine.map(row)}</div></section>}
      {others.length > 0 && <section aria-label="À découvrir" style={{ marginTop: 20 }}><h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.text }}>À découvrir</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>{others.map(row)}</div></section>}
    </>
  );
};

// ───────── Une chaîne ─────────
const Detail: React.FC<{ id: string; palette: ReturnType<typeof usePalette> }> = ({ id, palette }) => {
  const [c, setC] = useState<Channel | null>(null);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actErr, setActErr] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const load = () => getChannel(id).then(r => { setC(r.channel); setBalance(r.balance); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p role="alert" style={{ marginTop: 20, color: DC.muted, fontSize: 15 }}>{error} <Link to="/chaines" style={{ color: palette.accent }}>Retour aux chaînes</Link></p>;
  if (!c) return <Loader2 className="animate-spin" aria-label="Chargement" style={{ marginTop: 20 }} />;

  const miss = (f: (m: Missing) => boolean) => c.missing.find(f);
  const row = (ok: boolean, text: string, m?: Missing) => {
    const link = !ok && m ? missingLink(m) : null;
    return (
      <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', fontSize: 14.5, color: ok ? DC.soft : DC.text }}>
        {ok ? <Check size={18} color={DC.ok} aria-label="Fait" style={{ flex: 'none', marginTop: 1 }} /> : <Circle size={18} color={palette.accent} aria-label="À faire" style={{ flex: 'none', marginTop: 1 }} />}
        <span style={{ flex: 1, lineHeight: 1.45 }}>{text}</span>
        {link && <Link to={link.to} style={{ color: palette.accent, fontWeight: 700, fontSize: 13.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>{link.label} ›</Link>}
      </li>
    );
  };
  const conditions: React.ReactElement[] = [];
  for (const t of c.rules.tests ?? []) {
    const bad = miss(m => (m.kind === 'test' || m.kind === 'level') && m.scaleId === t.scaleId);
    const base = `Test « ${scaleLabel(t.scaleId)} » fait${t.levels?.length ? ` (résultat : ${t.levels.map(l => LEVEL_LABEL[l]).join(' ou ')})` : ''}`;
    conditions.push(row(!bad, bad ? missingText(bad) : base, bad));
  }
  if (c.rules.totems?.length) { const bad = miss(m => m.kind === 'totem'); conditions.push(row(!bad, bad ? missingText(bad) : `Totem : ${c.rules.totems.map(totemLabel).join(', ')}`, bad)); }
  if (c.rules.minAge) { const bad = miss(m => m.kind === 'age'); conditions.push(row(!bad, bad ? missingText(bad) : `${c.rules.minAge} ans et plus`, bad)); }
  if (c.price > 0) { const bad = miss(m => m.kind === 'balance'); conditions.push(row(!bad, bad ? `${c.price} étincelles à l'entrée (tu en as ${balance}). ${missingText(bad)}` : `${c.price} étincelles à l'entrée (tu en as ${balance})`, bad)); }

  const join = async () => {
    setBusy(true); setActErr('');
    try { await joinChannel(id, ack); setSheet(false); setAck(false); setWelcome(true); await load(); }
    catch (e) { setActErr(e instanceof Error ? e.message : 'Erreur'); await load(); }
    finally { setBusy(false); }
  };
  const toggleMute = async () => {
    if (!c) return;
    setBusy(true); setActErr('');
    try { await muteChannel(id, !c.muted); await load(); }
    catch (e) { setActErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const leave = async () => {
    setBusy(true); setActErr('');
    try { await leaveChannel(id); setConfirmLeave(false); setWelcome(false); await load(); }
    catch (e) { setActErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const primary: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
  const needAck = c.requireFramingAck && !!c.framingText;

  return (
    <>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <Cover c={c} h={150} />
        <div style={{ padding: 16 }}>
          <h1 style={{ ...h1, margin: 0, fontSize: 25 }}>{c.name}</h1>
          <p style={{ margin: '8px 0 10px', fontSize: 14.5, color: DC.soft, lineHeight: 1.5 }}>{c.description}</p>
          <Pills c={c} />
        </div>
      </div>

      {c.member ? (
        <>
          <section style={{ ...card, marginTop: 14, borderColor: palette.accent }} aria-label="Ma place dans la chaîne">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RealDrLoPhoto size={40} palette={palette} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: DC.text, fontSize: 15 }}>{welcome ? 'Bienvenue dans la chaîne' : 'Tu fais partie de cette chaîne'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: DC.faint }}>Depuis le {monthYear(c.joinedAt)}</p>
              </div>
              <button type="button" onClick={toggleMute} disabled={busy} className="drl-btn" aria-pressed={c.muted}
                aria-label={c.muted ? 'Réactiver les alertes de cette chaîne' : 'Couper les alertes de cette chaîne'}
                style={{ marginLeft: 'auto', width: 44, height: 44, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: c.muted ? DC.faint : palette.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {c.muted ? <BellOff size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: DC.faint, lineHeight: 1.5 }}>{c.muted ? 'Alertes coupées : tu ne seras pas prévenu des nouvelles publications.' : 'Tu es prévenu à chaque nouvelle publication (jamais la nuit).'}</p>
          </section>
          <ChannelFeed channelId={id} member palette={palette} />
          {!confirmLeave ? (
            <button type="button" onClick={() => setConfirmLeave(true)} style={{ marginTop: 14, background: 'none', border: 0, color: DC.faint, fontSize: 13.5, textDecoration: 'underline', cursor: 'pointer' }}>Quitter la chaîne</button>
          ) : (
            <section style={{ ...card, marginTop: 14 }} role="alertdialog" aria-label="Quitter la chaîne">
              <p style={{ margin: 0, fontSize: 14.5, color: DC.text, lineHeight: 1.5 }}>Tu peux quitter quand tu veux. Les étincelles de l'entrée ne sont pas remboursées{c.price > 0 ? ` et il faudra les repayer (${c.price}) pour revenir` : ''}.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" disabled={busy} onClick={leave} style={{ flex: 1, minHeight: 44, borderRadius: 999, border: '1px solid rgba(240,154,122,.6)', background: 'rgba(240,154,122,.12)', color: DC.text, fontWeight: 700, cursor: 'pointer' }}>Oui, quitter</button>
                <button type="button" onClick={() => setConfirmLeave(false)} style={{ flex: 1, minHeight: 44, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer' }}>Rester</button>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <section style={{ ...card, marginTop: 14 }} aria-label="Pour rejoindre">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.text }}>Pour rejoindre</h2>
            {conditions.length === 0 ? <p style={{ margin: '8px 0 0', fontSize: 14.5, color: DC.soft }}>Aucune condition : cette chaîne est ouverte à tous.</p> : <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none' }}>{conditions}</ul>}
          </section>
          {actErr && <p role="alert" style={{ margin: '12px 0 0', color: '#F09A7A', fontSize: 13.5 }}>{actErr}</p>}
          {!sheet ? (
            <button type="button" disabled={!c.eligible} onClick={() => setSheet(true)} className="drl-btn" style={{ ...primary, marginTop: 14, opacity: c.eligible ? 1 : 0.45, cursor: c.eligible ? 'pointer' : 'default' }}>
              {c.eligible ? (c.price > 0 ? `Rejoindre · ${c.price} étincelles` : 'Rejoindre gratuitement') : `Il te manque ${c.missing.length} condition${c.missing.length > 1 ? 's' : ''}`}
            </button>
          ) : (
            <section style={{ ...card, marginTop: 14, borderColor: palette.accent }} aria-label="Avant d'entrer">
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 19, color: DC.title }}>Avant d'entrer</h2>
              {c.framingText && <div style={{ margin: '10px 0', padding: 12, borderRadius: 14, background: 'rgba(255,255,255,.06)', fontSize: 14.5, color: DC.soft, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.framingText}</div>}
              {needAck && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, color: DC.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /> J'ai lu et j'ai compris
                </label>
              )}
              <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>{c.price > 0 ? `Entrée unique : ${c.price} étincelles, non remboursables. ` : ''}Tu peux quitter la chaîne quand tu veux.</p>
              <button type="button" disabled={busy || (needAck && !ack)} onClick={join} className="drl-btn" style={{ ...primary, marginTop: 12, opacity: busy || (needAck && !ack) ? 0.45 : 1 }}>
                {busy ? <Loader2 size={16} className="animate-spin" aria-label="Entrée en cours" /> : c.price > 0 ? `Confirmer · ${c.price} étincelles` : 'Confirmer'}
              </button>
              <button type="button" onClick={() => { setSheet(false); setAck(false); }} style={{ marginTop: 8, width: '100%', minHeight: 42, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer' }}>Annuler</button>
            </section>
          )}
          <h2 style={{ margin: '20px 0 0', fontSize: 15, fontWeight: 700, color: DC.text }}>Dans cette chaîne</h2>
          <ChannelFeed channelId={id} member={false} palette={palette} />
          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: DC.faint, lineHeight: 1.5 }}>Les membres ne se voient pas entre eux : tu vois seulement leur nombre. Dr Lô ne voit jamais tes résultats de tests.</p>
        </>
      )}
    </>
  );
};

const ChainesPage: React.FC = () => {
  const palette = usePalette();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, authReady } = useAuth();
  useEffect(() => { if (authReady && !isAuthenticated) navigate('/', { replace: true }); }, [authReady, isAuthenticated, navigate]);
  if (!authReady || !isAuthenticated) return null;
  return (
    <DrLoShell back={id ? { to: '/chaines', label: 'Les chaînes' } : { to: '/messages-dr-lo', label: 'Les messages de Dr Lô' }} palette={palette}>
      {id ? <Detail key={id} id={id} palette={palette} /> : <List palette={palette} />}
    </DrLoShell>
  );
};

export default ChainesPage;

/**
 * HomePenc — Pénc mi sur l'accueil (connecté).
 *   En direct : la grande carte « EN DIRECT » (qui anime, combien écoutent, Écouter).
 *   À venir   : les 2 prochains de la semaine, avec « Me rappeler ».
 *   Rien      : une entrée vers la page Pénc mi, avec son motif (la place où l'on se retrouve).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DC } from '../accueil/DrLoShell';
import { SectionTitle } from '../accueil/HomeParts';
import PencCard from './PencCard';
import { PencLiveCard, PencMotif } from './PencVisuals';
import type { MomentPalette } from '../../utils/drloMoment';
import { getAgenda, registerPenc, type Penc } from '../../services/pencService';

/**
 * L'agenda gardé sur ce téléphone : la section s'affiche tout de suite (avant, elle arrivait en dernier,
 * le temps que le serveur réponde), puis se met à jour. Un « en direct » de plus de 15 min n'est pas repris.
 */
const CACHE = 'he_penc_agenda_v1';
type Agenda = { live: Penc[]; upcoming: Penc[] };
function readCache(): Agenda | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null') as { at: number; a: Agenda } | null;
    if (!c || Date.now() - c.at > 3 * 86400000) return null;
    const now = Date.now();
    return {
      live: Date.now() - c.at < 15 * 60000 ? c.a.live : [],
      upcoming: c.a.upcoming.filter(p => p.startAt > now - 30 * 60000),
    };
  } catch { return null; }
}
const writeCache = (a: Agenda) => { try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), a })); } catch { /* ignore */ } };

/** full = Pénc mi « en continu » (vague 4) : agenda et entrée permanente ; sinon, seulement la carte quand un Pénc est en direct. */
const HomePenc: React.FC<{ palette: MomentPalette; full?: boolean; onLive?: (live: boolean) => void }> = ({ palette, full = true, onLive }) => {
  const cached = useState(readCache)[0];
  const pick = (a: Agenda) => ({
    live: a.live.filter(p => !p.locked).slice(0, 2),
    next: a.upcoming.filter(p => !p.locked && p.startAt - Date.now() < 7 * 86400000).slice(0, 2),
  });
  const [live, setLive] = useState<Penc[]>(() => (cached ? pick(cached).live : []));
  const [next, setNext] = useState<Penc[]>(() => (cached ? pick(cached).next : []));
  const [loaded, setLoaded] = useState(!!cached);
  const [busy, setBusy] = useState('');
  const load = () => getAgenda().then(r => {
    writeCache({ live: r.live, upcoming: r.upcoming });
    const x = pick(r);
    setLive(x.live);
    onLive?.(x.live.length > 0);
    setNext(x.next);
  }).catch(() => {}).finally(() => setLoaded(true));
  useEffect(() => { if (cached) onLive?.(pick(cached).live.length > 0); load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const remind = async (p: Penc) => { setBusy(p.id); try { await registerPenc(p.id, !p.registered); await load(); } catch { /* la page Pénc mi explique les erreurs */ } finally { setBusy(''); } };
  // Première visite (rien en mémoire) : une place réservée, pour que l'accueil ne saute pas quand ça arrive
  if (!loaded) return full ? <div aria-hidden="true" style={{ marginTop: 14, height: 88, borderRadius: 20, background: 'rgba(255,255,255,.03)', border: `1px solid ${DC.line}` }} /> : null;
  if (!full && !live.length) return null;
  const all = <Link to="/penc" style={{ fontSize: 14, fontWeight: 700, color: palette.accent, whiteSpace: 'nowrap' }}>Tout voir</Link>;

  if (!live.length && !next.length) {
    return (
      <Link to="/penc" className="drl-btn" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px 12px 10px', borderRadius: 20, border: `1px solid ${palette.accent}44`, background: `radial-gradient(90% 140% at 0% 50%, ${palette.accent}22, transparent 70%), rgba(255,255,255,.03)`, color: DC.text, textDecoration: 'none' }}>
        <PencMotif size={64} color={palette.accent} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 19, color: DC.title }}>Pénc mi</b>
          <span style={{ display: 'block', marginTop: 2, fontSize: 14, lineHeight: 1.4, color: DC.muted }}>On se retrouve pour parler, en direct. Écoute, pose ta question, prends la parole si tu veux.</span>
        </span>
        <ArrowRight size={18} color={DC.muted} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <>
      {live.length > 0 && (
        <>
          <SectionTitle aside={full ? all : undefined}>En direct maintenant</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{live.map(p => <PencLiveCard key={p.id} p={p} palette={palette} />)}</div>
        </>
      )}
      {full && next.length > 0 && (
        <>
          <SectionTitle aside={live.length ? undefined : all}>Pénc mi cette semaine</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{next.map(p => <PencCard key={p.id} p={p} accent={palette.accent} onRemind={remind} busy={busy === p.id} />)}</div>
        </>
      )}
    </>
  );
};

export default HomePenc;

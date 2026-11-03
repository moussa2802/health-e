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

const HomePenc: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [live, setLive] = useState<Penc[]>([]);
  const [next, setNext] = useState<Penc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const load = () => getAgenda().then(r => {
    setLive(r.live.filter(p => !p.locked).slice(0, 2));
    setNext(r.upcoming.filter(p => !p.locked && p.startAt - Date.now() < 7 * 86400000).slice(0, 2));
  }).catch(() => {}).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);
  const remind = async (p: Penc) => { setBusy(p.id); try { await registerPenc(p.id, !p.registered); await load(); } catch { /* la page Pénc mi explique les erreurs */ } finally { setBusy(''); } };
  if (!loaded) return null;
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
          <SectionTitle aside={all}>En direct maintenant</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{live.map(p => <PencLiveCard key={p.id} p={p} palette={palette} />)}</div>
        </>
      )}
      {next.length > 0 && (
        <>
          <SectionTitle aside={live.length ? undefined : all}>Pénc mi cette semaine</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{next.map(p => <PencCard key={p.id} p={p} accent={palette.accent} onRemind={remind} busy={busy === p.id} />)}</div>
        </>
      )}
    </>
  );
};

export default HomePenc;

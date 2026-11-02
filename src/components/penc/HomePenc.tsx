/**
 * HomePenc — Pénc mi sur l'accueil (connecté) : la bande « EN DIRECT » quand un Pénc a lieu,
 * puis les 2 prochains Pénc de la semaine avec « Me rappeler ». Rien s'il n'y a rien.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DC } from '../accueil/DrLoShell';
import { SectionTitle } from '../accueil/HomeParts';
import PencCard from './PencCard';
import type { MomentPalette } from '../../utils/drloMoment';
import { getAgenda, registerPenc, type Penc } from '../../services/pencService';

const HomePenc: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [live, setLive] = useState<Penc[]>([]);
  const [next, setNext] = useState<Penc[]>([]);
  const [busy, setBusy] = useState('');
  const load = () => getAgenda().then(r => {
    setLive(r.live.filter(p => !p.locked));
    setNext(r.upcoming.filter(p => !p.locked && p.startAt - Date.now() < 7 * 86400000).slice(0, 2));
  }).catch(() => {});
  useEffect(() => { load(); }, []);
  const remind = async (p: Penc) => { setBusy(p.id); try { await registerPenc(p.id, !p.registered); await load(); } catch { /* la page Pénc mi explique les erreurs */ } finally { setBusy(''); } };
  if (!live.length && !next.length) return null;
  return (
    <>
      {live.map(p => (
        <Link key={p.id} to={`/penc/${p.id}`} className="drl-btn" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18, background: palette.primary, color: DC.ink, textDecoration: 'none' }}>
          <span aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 22 }}>
            {[10, 20, 14, 18].map((h, i) => <span key={i} className="drl-dot" style={{ width: 4, height: h, borderRadius: 2, background: DC.ink, animationDelay: `${i * 0.15}s` }} />)}
          </span>
          <span style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '.08em' }}>EN DIRECT · PÉNC MI</span>
            <b style={{ display: 'block', fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</b>
            <span style={{ display: 'block', fontSize: 13 }}>{p.host.name}</span>
          </span>
          <span style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, background: DC.ink, color: palette.accent, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center' }}>Écouter</span>
        </Link>
      ))}
      {next.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <SectionTitle>Pénc mi cette semaine</SectionTitle>
            <Link to="/penc" style={{ fontSize: 14, fontWeight: 700, color: palette.accent, whiteSpace: 'nowrap' }}>Tout voir</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{next.map(p => <PencCard key={p.id} p={p} accent={palette.accent} onRemind={remind} busy={busy === p.id} />)}</div>
        </>
      )}
    </>
  );
};

export default HomePenc;

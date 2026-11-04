/**
 * PencCard — un Pénc dans l'agenda ou sur l'accueil : pastille de date, sujet, animateur, « Me rappeler ».
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Lock } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import { dateParts, type Penc } from '../../services/pencService';

const PencCard: React.FC<{ p: Penc; accent: string; onRemind?: (p: Penc) => void; busy?: boolean }> = ({ p, accent, onRemind, busy }) => {
  const d = dateParts(p.startAt);
  // Couleurs de la charte : or pour les rendez-vous ouverts à tous, lavande pour ceux d'une chaîne
  const tint = p.access === 'channel' ? '#C9B8E4' : '#E9C88F';
  return (
    <article style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, borderColor: `${tint}55`, background: `linear-gradient(135deg, ${tint}1F, ${tint}06 70%)` }}>
      <span aria-hidden="true" style={{ width: 54, flex: 'none', borderRadius: 14, padding: '6px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15, background: `${tint}22`, border: `1px solid ${tint}77` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: tint }}>{d.day}</span>
        <b style={{ fontSize: 20, color: DC.title }}>{d.num}</b>
        <span style={{ fontSize: 13, color: DC.muted }}>{d.time}</span>
      </span>
      <Link to={`/penc/${p.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: DC.text }}>
        <b style={{ display: 'block', fontSize: 16, lineHeight: 1.3, color: DC.title }}>{p.title}</b>
        <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: DC.soft }}>{p.host.name}{p.host.title ? ` · ${p.host.title}` : ''}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 13, color: DC.faint }}>
          {p.access === 'channel' && <><Lock size={13} aria-hidden="true" />Membres de « {p.channelName} »</>}
          {p.access === 'paid' && `${p.price} étincelle${p.price > 1 ? 's' : ''}`}
          {p.access === 'all' && `${p.registeredCount} inscrit${p.registeredCount > 1 ? 's' : ''}`}
        </span>
      </Link>
      {onRemind && !p.locked && p.access !== 'paid' && (
        <button type="button" onClick={() => onRemind(p)} disabled={busy} aria-pressed={!!p.registered} aria-label={p.registered ? 'Ne plus me rappeler' : 'Me rappeler'} className="drl-btn"
          style={{ width: 46, height: 46, flex: 'none', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${p.registered ? accent : DC.line}`, background: p.registered ? `${accent}26` : 'transparent', color: p.registered ? accent : DC.soft }}>
          {p.registered ? <BellRing size={19} aria-hidden="true" /> : <Bell size={19} aria-hidden="true" />}
        </button>
      )}
    </article>
  );
};

export default PencCard;

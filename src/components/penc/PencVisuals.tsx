/**
 * PencVisuals — l'identité visuelle de Pénc mi.
 *   PencMotif     : la place du village vue d'en haut (des personnes en cercle autour d'un centre qui brille).
 *   Equalizer     : les barres « en direct ».
 *   HostAvatar    : la photo de Dr Lô, ou l'initiale d'un pro (avec anneaux qui pulsent quand c'est en direct).
 *   PencLiveCard  : la carte d'un Pénc en direct (accueil et page Pénc mi), façon salons audio : qui anime, combien écoutent, « Écouter ».
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Headphones } from 'lucide-react';
import { DC } from '../accueil/DrLoShell';
import { RealDrLoPhoto } from '../accueil/RealDrLoBadge';
import type { MomentPalette } from '../../utils/drloMoment';
import type { Penc } from '../../services/pencService';
import '../accueil/accueil.css';

export const PencMotif: React.FC<{ size?: number; color: string }> = ({ size = 120, color }) => {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return { x: 60 + Math.cos(a) * 40, y: 60 + Math.sin(a) * 40, r: i % 3 === 0 ? 5.5 : 4.5 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="none" stroke={color} strokeOpacity=".12" />
      <circle cx="60" cy="60" r="40" fill="none" stroke={color} strokeOpacity=".22" strokeDasharray="2 5" />
      <circle cx="60" cy="60" r="22" fill={color} fillOpacity=".10" />
      <circle cx="60" cy="60" r="9" fill={color} />
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={color} fillOpacity={i % 3 === 0 ? 0.95 : 0.55} />)}
    </svg>
  );
};

export const Equalizer: React.FC<{ color: string }> = ({ color }) => (
  <span className="pc-eq" aria-hidden="true" style={{ color }}><span /><span /><span /><span /></span>
);

export const HostAvatar: React.FC<{ host: Penc['host']; size: number; palette: MomentPalette; live?: boolean }> = ({ host, size, palette, live }) => (
  <span style={{ position: 'relative', width: size, height: size, flex: 'none', display: 'inline-flex', color: palette.accent }}>
    {live && <><span className="pc-ring" aria-hidden="true" /><span className="pc-ring" aria-hidden="true" /></>}
    {host.pro
      ? <span aria-hidden="true" style={{ position: 'relative', width: size, height: size, borderRadius: '50%', background: '#9DBFAF', color: DC.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: size * 0.42, border: `2px solid ${palette.accent}`, boxSizing: 'border-box' }}>{(host.name.trim()[0] || '?').toUpperCase()}</span>
      : <span style={{ position: 'relative' }}><RealDrLoPhoto size={size} palette={palette} /></span>}
  </span>
);

export const listenersLabel = (n: number | null | undefined) => (n == null ? null : n <= 1 ? (n === 1 ? '1 personne écoute' : 'Sois le premier à écouter') : `${n} personnes écoutent`);

export const PencLiveCard: React.FC<{ p: Penc; palette: MomentPalette }> = ({ p, palette }) => {
  const who = listenersLabel(p.listeners);
  return (
    <Link to={`/penc/${p.id}`} className="drl-btn"
      style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 22, textDecoration: 'none', color: DC.text,
        border: `1px solid ${palette.accent}99`, boxShadow: `0 14px 34px -18px ${palette.accent}AA`,
        background: `radial-gradient(130% 120% at 0% 0%, ${palette.accent}38, transparent 58%), linear-gradient(160deg, #3A2618, #1C140E)` }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Equalizer color={palette.accent} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 800, letterSpacing: '.12em', color: palette.accent }}>EN DIRECT · PÉNC MI</span>
        {p.access === 'channel' && <span style={{ fontSize: 13, color: DC.muted }}>{p.channelName}</span>}
      </span>
      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>{p.title}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <HostAvatar host={p.host} size={42} palette={palette} live />
        <span style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 15, fontWeight: 700, color: DC.text }}>{p.host.name}{p.host.pro && <BadgeCheck size={15} color={DC.sage} aria-label="vérifié par l'équipe Health-e" />}</span>
          <span style={{ display: 'block', fontSize: 13, color: DC.muted }}>{who ?? (p.host.title || 'Anime le Pénc')}</span>
        </span>
      </span>
      <span style={{ minHeight: 48, borderRadius: 999, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Headphones size={18} aria-hidden="true" />{p.locked ? 'Voir le Pénc' : 'Écouter'}
      </span>
    </Link>
  );
};

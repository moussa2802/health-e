/**
 * CompanionMark — le compagnon : un petit bonhomme rond et souriant, toujours le même, dans un rond chaud.
 * Seuls changent sa couleur et le petit signe qu'il porte sur la tête (pousse par défaut). Ce n'est ni un visage humain ni un médecin.
 * La photo de Dr Lô n'apparaît que là où l'on reçoit ou envoie un message à lui (RealDrLoPhoto).
 */
import React from 'react';
import { getCompanionColor, getCompanionIcon } from '../../utils/companion';

/** Les petits signes (dessinés dans un carré de 24, posés sur la tête du bonhomme). */
export const ICON_PATHS: Record<string, React.ReactNode> = {
  pousse: <><path d="M12 21v-8" /><path d="M12 13c0-3.6-2.4-6-6-6 0 3.6 2.4 6 6 6z" /><path d="M12 11c0-3 2-5.4 6-5.4 0 3-2 5.4-6 5.4z" /></>,
  etoile: <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" />,
  lune: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  flamme: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.3 2.4-5 3.4-7.6.3-.8.4-1.6.3-2.4 3.2 1.2 5.3 3.8 5.5 6.3.6-.5.9-1.2 1-2 1.7 1.8 2.8 3.5 2.8 5.7 0 3.4-2.6 6-6.5 6z" />,
  coeur: <path d="M12 20.3S3.8 15.4 3.8 9.4A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.2 2.6c0 6-8.2 10.9-8.2 10.9z" />,
  feuille: <path d="M5 19c0-8 5-13.5 14-14 .3 9-4.8 14-14 14z" />,
};

const INK = '#2A1D12';

/** Le bonhomme seul (sans le rond), pour les aperçus. */
export const CompanionBody: React.FC<{ color: string; icon?: string; size: number }> = ({ color, icon, size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <g transform="translate(13 0.5) scale(0.58)" fill={color} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[icon ?? getCompanionIcon()] ?? ICON_PATHS.pousse}
    </g>
    <ellipse cx="14.5" cy="38" rx="3.2" ry="1.7" fill={color} />
    <ellipse cx="25.5" cy="38" rx="3.2" ry="1.7" fill={color} />
    <circle cx="20" cy="25" r="12.5" fill={color} />
    <circle cx="15.6" cy="24" r="1.7" fill={INK} />
    <circle cx="24.4" cy="24" r="1.7" fill={INK} />
    <path d="M16.2 28.6c1.9 2.1 5.7 2.1 7.6 0" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const CompanionMark: React.FC<{ size?: number; icon?: string; ring?: string; color?: string; className?: string; style?: React.CSSProperties }> = ({ size = 40, icon, ring, color, className, style }) => {
  const c = color ?? getCompanionColor().hex;
  return (
  <span aria-hidden="true" className={className}
    style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      background: 'radial-gradient(circle at 30% 25%, #4A3523, #2A1D12)', border: `${size >= 60 ? 3 : 2}px solid ${ring ?? `${c}73`}`, ...style }}>
    <CompanionBody color={c} icon={icon} size={Math.round(size * 0.74)} />
  </span>
  );
};

export default CompanionMark;

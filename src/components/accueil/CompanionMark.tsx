/**
 * CompanionMark — l'image du compagnon : un emblème (pousse par défaut, au choix) dans un rond chaud. Neutre exprès : ce n'est ni un visage ni un médecin.
 * La photo de Dr Lô n'apparaît que là où l'on reçoit ou envoie un message à lui (RealDrLoPhoto).
 */
import React from 'react';
import { getCompanionColor, getCompanionIcon } from '../../utils/companion';

export const ICON_PATHS: Record<string, React.ReactNode> = {
  pousse: <><path d="M12 21v-8" /><path d="M12 13c0-3.6-2.4-6-6-6 0 3.6 2.4 6 6 6z" /><path d="M12 11c0-3 2-5.4 6-5.4 0 3-2 5.4-6 5.4z" /></>,
  etoile: <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" />,
  lune: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  soleil: <><circle cx="12" cy="12" r="3.8" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></>,
  flamme: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.3 2.4-5 3.4-7.6.3-.8.4-1.6.3-2.4 3.2 1.2 5.3 3.8 5.5 6.3.6-.5.9-1.2 1-2 1.7 1.8 2.8 3.5 2.8 5.7 0 3.4-2.6 6-6.5 6z" />,
  coeur: <path d="M12 20.3S3.8 15.4 3.8 9.4A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.2 2.6c0 6-8.2 10.9-8.2 10.9z" />,
  vague: <><path d="M3 9c2.2 0 2.2-2 4.5-2S9.8 9 12 9s2.2-2 4.5-2S18.8 9 21 9" /><path d="M3 14c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.2-2 4.5-2 2.3 2 4.5 2" /><path d="M3 19c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.2-2 4.5-2 2.3 2 4.5 2" /></>,
  feuille: <><path d="M5 19c0-8 5-13.5 14-14 .3 9-4.8 14-14 14z" /><path d="M5 19c3-4 6-6.5 9-8" /></>,
};

const CompanionMark: React.FC<{ size?: number; icon?: string; ring?: string; color?: string; className?: string; style?: React.CSSProperties }> = ({ size = 40, icon, ring, color, className, style }) => {
  const c = color ?? getCompanionColor().hex;
  return (
  <span aria-hidden="true" className={className}
    style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 30% 25%, #4A3523, #2A1D12)', border: `${size >= 60 ? 3 : 2}px solid ${ring ?? `${c}73`}`, ...style }}>
    <svg width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[icon ?? getCompanionIcon()] ?? ICON_PATHS.pousse}
    </svg>
  </span>
  );
};

export default CompanionMark;

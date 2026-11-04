/**
 * CompanionMark — le compagnon dans son rond chaud : une aura de lumière vivante avec deux yeux de lumière
 * (CompanionAura, choisie le 4 nov. 2026 à la place du petit bonhomme). Changent : sa couleur, son petit signe
 * (une petite lumière près de sa tête) et son humeur (mood). Ce n'est ni un visage humain ni un médecin.
 * La photo de Dr Lô n'apparaît que là où l'on reçoit ou envoie un message à lui (RealDrLoPhoto).
 */
import React, { useEffect, useState } from 'react';
import { getCompanionColor, getCompanionIcon } from '../../utils/companion';
import CompanionAura, { type AuraMood } from './CompanionAura';
import { COMPANION_EVENT, getCompanionStage } from '../../utils/companionStage';

/** Se redessine quand la couleur, le signe ou le stade changent (sur ce téléphone ou après la synchro du compte). */
function useCompanionLook() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick(t => t + 1);
    window.addEventListener(COMPANION_EVENT, on);
    return () => window.removeEventListener(COMPANION_EVENT, on);
  }, []);
}

/** Les petits signes (dessinés dans un carré de 24). */
export const ICON_PATHS: Record<string, React.ReactNode> = {
  pousse: <><path d="M12 21v-8" /><path d="M12 13c0-3.6-2.4-6-6-6 0 3.6 2.4 6 6 6z" /><path d="M12 11c0-3 2-5.4 6-5.4 0 3-2 5.4-6 5.4z" /></>,
  etoile: <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" />,
  lune: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  flamme: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.3 2.4-5 3.4-7.6.3-.8.4-1.6.3-2.4 3.2 1.2 5.3 3.8 5.5 6.3.6-.5.9-1.2 1-2 1.7 1.8 2.8 3.5 2.8 5.7 0 3.4-2.6 6-6.5 6z" />,
  coeur: <path d="M12 20.3S3.8 15.4 3.8 9.4A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.2 2.6c0 6-8.2 10.9-8.2 10.9z" />,
  feuille: <path d="M5 19c0-8 5-13.5 14-14 .3 9-4.8 14-14 14z" />,
};

/** L'aura seule (sans le rond), pour les aperçus (choix du signe). */
export const CompanionBody: React.FC<{ color: string; icon?: string; size: number; mood?: AuraMood }> = ({ color, icon, size, mood }) => (
  <CompanionAura size={size} color={color} mood={mood} live={false} stage={3} sign={ICON_PATHS[icon ?? getCompanionIcon()] ?? ICON_PATHS.pousse} />
);

const CompanionMark: React.FC<{ size?: number; icon?: string; ring?: string; color?: string; mood?: AuraMood; live?: boolean; stage?: number; onTap?: () => void; className?: string; style?: React.CSSProperties }> = ({ size = 40, icon, ring, color, mood, live, stage, onTap, className, style }) => {
  useCompanionLook();
  const c = color ?? getCompanionColor().hex;
  // Le signe n'apparaît qu'à partir d'une taille où il se lit
  const sign = size >= 44 ? ICON_PATHS[icon ?? getCompanionIcon()] ?? ICON_PATHS.pousse : undefined;
  return (
    <span aria-hidden="true" className={className}
      style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 60%, #2E2016, #17100A)', border: `${size >= 60 ? 3 : 2}px solid ${ring ?? `${c}73`}`, ...style }}>
      <CompanionAura size={Math.round(size * 1.12)} color={c} mood={mood} live={live} sign={sign} stage={stage ?? getCompanionStage()} onTap={onTap} />
    </span>
  );
};

export default CompanionMark;

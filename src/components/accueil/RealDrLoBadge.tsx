/**
 * RealDrLoBadge — la vraie photo de Dr Lô, pour qu'on sache que c'est LUI qui parle et pas l'IA.
 * Utilisée sur les messages qu'il écrit lui-même (carte d'accueil, liste, page du message).
 * L'IA garde son illustration (DrLoAvatar) : les deux ne se confondent jamais.
 */
import React from 'react';
import type { MomentPalette } from '../../utils/drloMoment';

export const REAL_DRLO_PHOTO = '/dr-lo-reel.jpg';

/** Chargée tout de suite (pas en différé : petite image, toujours en haut de l'écran).
 *  Si elle ne charge pas, une initiale élégante prend sa place : jamais un cercle vide. */
export const RealDrLoPhoto: React.FC<{ size: number; palette: MomentPalette }> = ({ size, palette }) => {
  const [failed, setFailed] = React.useState(false);
  const base: React.CSSProperties = { width: size, height: size, borderRadius: '50%', border: `2px solid ${palette.accent}`, flexShrink: 0, boxSizing: 'border-box' };
  if (failed) {
    return (
      <span role="img" aria-label="Dr Lô" style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(233,200,143,.14)', color: palette.accent, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: Math.round(size * 0.42) }}>
        L
      </span>
    );
  }
  return (
    <img src={REAL_DRLO_PHOTO} alt="Dr Lô" width={size} height={size} decoding="async" onError={() => setFailed(true)}
      style={{ ...base, objectFit: 'cover', objectPosition: '50% 30%', display: 'block' }} />
  );
};

/** En-tête d'un message : photo + « Dr Lô » + mention « écrit par lui, pas par l'IA ». */
const RealDrLoBadge: React.FC<{ palette: MomentPalette; kind?: 'texte' | 'vocal' }> = ({ palette, kind = 'texte' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <RealDrLoPhoto size={56} palette={palette} />
    <div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F4EEE4' }}>Dr Lô</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, lineHeight: 1.4, color: '#A79E90' }}>
        {kind === 'vocal' ? 'Un vocal de lui-même, pas de l\'IA' : 'Écrit par lui-même, pas par l\'IA'}
      </p>
    </div>
  </div>
);

export default RealDrLoBadge;

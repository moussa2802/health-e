/**
 * DrLoAvatar — Dr Lô vivant : son halo montre ce qu'il fait réellement.
 *  idle : respire doucement · listening : la personne écrit / dicte
 *  reading : relit (balayage) · thinking : réfléchit (orbite) · writing : écrit
 *  breathing : guide la respiration (le cercle grandit / se resserre)
 */
import React from 'react';
import type { MomentPalette } from '../../utils/drloMoment';

export type DrLoState = 'idle' | 'listening' | 'reading' | 'thinking' | 'writing' | 'breathing';

/**
 * aura (0 → 1, facultatif) : l'aura-jauge des crédits autour de Dr Lô. Basse, elle s'atténue
 * doucement ; jamais un Dr Lô fatigué ou triste (règle anti-manipulation).
 */
const DrLoAvatar: React.FC<{ state: DrLoState; palette: MomentPalette; size?: number; aura?: number | null }> = ({ state, palette, size = 128, aura = null }) => {
  const box = size + 28;
  const haloClass = state === 'breathing' ? 'drl-halo-guided' : state === 'listening' ? 'drl-listen' : 'drl-halo';
  return (
    <div style={{ position: 'relative', width: box, height: box, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {aura !== null && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: -12, borderRadius: '50%',
          background: `conic-gradient(${aura < 0.16 ? palette.accentSoft : palette.accent} ${Math.round(Math.max(0, Math.min(1, aura)) * 360)}deg, rgba(255,255,255,.07) 0)`,
          WebkitMask: `radial-gradient(circle, transparent ${box / 2 + 6}px, #000 ${box / 2 + 7}px)`,
          mask: `radial-gradient(circle, transparent ${box / 2 + 6}px, #000 ${box / 2 + 7}px)`,
          opacity: aura < 0.16 ? 0.6 : 1, transition: 'background .6s ease',
        }} />
      )}
      <div className={haloClass} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${palette.accentSoft}` }} />
      {state === 'reading' && (
        <div aria-hidden="true" className="drl-sweep" style={{ position: 'absolute', inset: -5, borderRadius: '50%', border: '3px solid transparent', borderTopColor: palette.accent, borderRightColor: palette.accentSoft, filter: `drop-shadow(0 0 8px ${palette.accent})` }} />
      )}
      {(state === 'thinking' || state === 'writing') && (
        <div aria-hidden="true" className="drl-orbit" style={{ position: 'absolute', inset: -8, animationDuration: state === 'writing' ? '4s' : undefined }}>
          <span style={{ position: 'absolute', left: '50%', top: 0, width: 9, height: 9, marginLeft: -4, borderRadius: '50%', background: palette.accent, boxShadow: `0 0 10px ${palette.accent}` }} />
          <span style={{ position: 'absolute', left: '10%', bottom: '18%', width: 7, height: 7, borderRadius: '50%', background: palette.accent, opacity: 0.7, boxShadow: `0 0 8px ${palette.accent}` }} />
          <span style={{ position: 'absolute', right: '10%', bottom: '18%', width: 5, height: 5, borderRadius: '50%', background: palette.accent, opacity: 0.45 }} />
        </div>
      )}
      <img
        src="/dr-lo.png"
        alt="Dr Lô"
        width={size}
        height={size}
        style={{ position: 'relative', width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `3px solid ${palette.accent}` }}
      />
      <span aria-hidden="true" style={{ position: 'absolute', right: size * 0.14, bottom: size * 0.14, width: 16, height: 16, borderRadius: '50%', background: '#4CC37E', border: '3px solid #17130F' }} />
    </div>
  );
};

export default DrLoAvatar;

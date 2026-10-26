/** « Plus que N tests » : la silhouette floue d'un animal (jamais le vrai totem) et la progression sur 7. */
import React from 'react';
import { TOTEM_IMAGES } from '../../data/totemImages';
import { DC } from './DrLoShell';

const TotemTeaserCard: React.FC<{ remaining: number; total: number }> = ({ remaining, total }) => {
  const done = Math.max(0, total - remaining);
  return (
    <div className="drl-in" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', borderRadius: 18, border: `1px solid ${DC.line}`, background: DC.glass, padding: 12 }}>
      <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: '#0F0B08' }}>
        {/* Silhouette : tellement floue et sombre qu'on ne peut pas deviner l'animal */}
        <img src={TOTEM_IMAGES.lion} alt="" aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(16px) brightness(.32) saturate(.5)', transform: 'scale(1.3)' }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DC.title }}>Ton animal-totem t'attend</p>
        <p style={{ margin: '3px 0 8px', fontSize: 12.5, color: DC.muted }}>
          {done} test{done > 1 ? 's' : ''} sur {total} · il se révèle au {total}e
        </p>
        <div style={{ display: 'flex', gap: 5 }} role="img" aria-label={`${done} tests faits sur ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < done ? DC.gold : 'rgba(255,255,255,.14)' }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TotemTeaserCard;

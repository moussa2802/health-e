/**
 * KorisCostBadge — Petit indicateur de coût avec image kori inline.
 */

import React from 'react';
import { useKoris } from '../../contexts/KorisContext';
import { type KorisFeatureType } from '../../services/korisService';

const KORI_IMG = '/kori.png';

interface Props {
  feature: KorisFeatureType;
  style?: React.CSSProperties;
}

const KorisCostBadge: React.FC<Props> = ({ feature, style }) => {
  const { getCost, canAfford } = useKoris();
  const cost = getCost(feature);

  if (cost === 0) return null;

  const affordable = canAfford(feature);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 11,
        fontWeight: 600,
        color: affordable ? '#0D9488' : '#DC2626',
        background: affordable
          ? 'rgba(13,148,136,0.08)'
          : 'rgba(239,68,68,0.08)',
        padding: '2px 7px 2px 4px',
        borderRadius: 10,
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={affordable ? `Coût: ${cost} Koris` : `Solde insuffisant (${cost} Koris requis)`}
    >
      <img
        src={KORI_IMG}
        alt=""
        style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }}
      />
      {cost}
    </span>
  );
};

export default KorisCostBadge;

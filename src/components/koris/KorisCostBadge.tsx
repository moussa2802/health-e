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
  className?: string;
}

const KorisCostBadge: React.FC<Props> = ({ feature, style, className = '' }) => {
  const { getCost, canAfford, balance } = useKoris();
  const cost = getCost(feature);

  if (cost === 0) return null;

  const affordable = canAfford(feature);
  const remaining = balance - cost;

  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
        affordable ? 'text-gold bg-gold-soft' : 'text-danger bg-danger/10'
      } ${className}`}
      title={affordable ? `Coût: ${cost} Koris · Reste: ${remaining}` : `Solde insuffisant (${cost} Koris requis, solde: ${balance})`}
    >
      <img
        src={KORI_IMG}
        alt=""
        className="w-3.5 h-3.5 rounded-full object-cover"
      />
      {cost}
      <span className="opacity-60 text-[10px]">→ {remaining}</span>
    </span>
  );
};

export default KorisCostBadge;

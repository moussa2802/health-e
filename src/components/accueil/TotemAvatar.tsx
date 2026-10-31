/**
 * TotemAvatar — la photo de profil d'un commentaire : l'image de l'animal intérieur de la personne (s'il a été révélé),
 * sinon une silhouette neutre. L'animal intérieur ne dit rien d'intime : c'est l'animal qu'elle peut déjà partager.
 */
import React from 'react';
import { User } from 'lucide-react';
import { TOTEM_IMAGES } from '../../data/totemImages';
import type { TotemAnimal } from '../../utils/totemAlgorithm';

const NAMES: Record<string, string> = { lion: 'Lion', loup: 'Loup', cerf: 'Cerf', dauphin: 'Dauphin', tortue: 'Tortue', hibou: 'Hibou', aigle: 'Aigle', elephant: 'Éléphant', panthere: 'Panthère', renard: 'Renard', cheval: 'Cheval', ours: 'Ours' };

const TotemAvatar: React.FC<{ animal?: string | null; size?: number }> = ({ animal, size = 34 }) => {
  const src = animal ? TOTEM_IMAGES[animal as TotemAnimal] : undefined;
  const box: React.CSSProperties = { width: size, height: size, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(242,182,109,.4)', background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  if (!src) return <span aria-hidden="true" style={box}><User size={Math.round(size * 0.5)} color="#A79E90" /></span>;
  return (
    <span style={box} title={`Totem : ${NAMES[animal as string] ?? ''}`}>
      <img src={src} alt={`Totem ${NAMES[animal as string] ?? ''}`} width={size} height={size} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
    </span>
  );
};

export default TotemAvatar;

/**
 * Card — la carte de la charte : fond verre, bordure fine, arrondi 20.
 * `tint` met en avant une carte avec une couleur d'univers (bordure + léger fond), jamais pour un bouton.
 */
import React from 'react';
import { COLOR, RADIUS } from '../../design/charte';

const Card: React.FC<{
  children: React.ReactNode;
  tint?: keyof typeof COLOR.univers | 'action';
  as?: 'section' | 'div' | 'article';
  style?: React.CSSProperties;
  'aria-label'?: string;
}> = ({ children, tint, as = 'section', style, ...rest }) => {
  const c = tint ? (tint === 'action' ? COLOR.action : COLOR.univers[tint]) : null;
  const Tag = as;
  return (
    <Tag aria-label={rest['aria-label']} style={{
      borderRadius: RADIUS.card, padding: 16, textAlign: 'left', boxSizing: 'border-box',
      border: `1px solid ${c ? `${c}66` : COLOR.line}`, background: c ? `${c}12` : COLOR.glass, ...style,
    }}>
      {children}
    </Tag>
  );
};

export default Card;

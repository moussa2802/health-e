import React from 'react';
import { getScaleById } from '../../data/scales';

type Size = 'sm' | 'md' | 'dark';

interface Props {
  scaleId: string;
  size?: Size;
  className?: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  mental_health: { bg: '#E4EAE6', color: '#4A5D57' },
  sexual_health: { bg: '#F5E4DC', color: '#C9603F' },
  bonus: { bg: '#F1EAD6', color: '#B78A2E' },
};

const DARK_STYLE = {
  bg: 'rgba(241,236,225,.14)',
  color: '#EDE7DB',
  border: '1px solid rgba(241,236,225,.2)',
};

const CATEGORY_UPPER: Record<string, string> = {
  mental_health: 'PROFIL PSY',
  sexual_health: 'VIE INTIME',
  bonus: 'BONUS',
};

const TestCode: React.FC<Props> = ({ scaleId, size = 'sm', className = '' }) => {
  const scale = getScaleById(scaleId);
  if (!scale) return null;

  const isDark = size === 'dark';
  const isMd = size === 'md';
  const catStyle = CATEGORY_STYLES[scale.category] ?? CATEGORY_STYLES.mental_health;

  const style: React.CSSProperties = isDark
    ? { background: DARK_STYLE.bg, color: DARK_STYLE.color, border: DARK_STYLE.border }
    : { background: catStyle.bg, color: catStyle.color };

  const fontSize = isMd ? 13 : 11.5;
  const padding = isMd ? '5px 9px' : '4px 7px';

  const label = isDark ? `${scale.code} · ${CATEGORY_UPPER[scale.category] ?? 'PROFIL PSY'}` : scale.code;

  return (
    <span
      className={className}
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontWeight: 700,
        fontSize,
        letterSpacing: '0.04em',
        borderRadius: 7,
        padding,
        display: 'inline-block',
        lineHeight: 1,
        ...style,
      }}
      aria-label={`Test ${scale.code} — ${scale.name}`}
    >
      {label}
    </span>
  );
};

export default TestCode;

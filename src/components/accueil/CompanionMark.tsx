/**
 * CompanionMark — l'image du compagnon : une pousse dans un rond chaud. Neutre exprès : ce n'est ni un visage ni un médecin.
 * La photo de Dr Lô n'apparaît que là où l'on reçoit ou envoie un message à lui (RealDrLoPhoto).
 */
import React from 'react';

const CompanionMark: React.FC<{ size?: number; ring?: string; className?: string; style?: React.CSSProperties }> = ({ size = 40, ring = 'rgba(242,182,109,.45)', className, style }) => (
  <span aria-hidden="true" className={className}
    style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 30% 25%, #4A3523, #2A1D12)', border: `${size >= 60 ? 3 : 2}px solid ${ring}`, ...style }}>
    <svg width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} viewBox="0 0 24 24" fill="none" stroke="#F2B66D" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21v-8" />
      <path d="M12 13c0-3.6-2.4-6-6-6 0 3.6 2.4 6 6 6z" />
      <path d="M12 11c0-3 2-5.4 6-5.4 0 3-2 5.4-6 5.4z" />
    </svg>
  </span>
);

export default CompanionMark;

/**
 * PageHeader — l'en-tête des pages qui n'utilisent pas DrLoShell (défi…) : même bouton retour que DrLoShell
 * (carré arrondi 44 px, verre), titre en Fraunces. Reste en haut de l'écran en défilant.
 */
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { COLOR, FONT } from '../../design/charte';

const PageHeader: React.FC<{ title: React.ReactNode; onBack: () => void; backLabel?: string; right?: React.ReactNode }> = ({ title, onBack, backLabel = 'Retour', right }) => (
  <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(24,18,13,.86)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${COLOR.line}` }}>
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12, boxSizing: 'border-box' }}>
      <button type="button" onClick={onBack} aria-label={backLabel} className="drl-btn"
        style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 13, border: `1px solid ${COLOR.line}`, background: COLOR.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.muted, cursor: 'pointer' }}>
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <h1 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 600, color: COLOR.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
      {right}
    </div>
  </div>
);

export default PageHeader;

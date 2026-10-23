/**
 * DrLoShell — cadre commun des écrans « Mon Dr Lô » (thème chaud sombre) :
 * fond selon le moment de la journée, retour, « visible par toi seul(e) », masquer l'écran.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, EyeOff, Lock } from 'lucide-react';
import './accueil.css';
import { getMoment, PALETTES, type MomentPalette } from '../../utils/drloMoment';

export const DC = {
  text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', title: '#FBF5EA',
  sage: '#9DBFAF', ok: '#7FD1A0', gold: '#E9C88F', social: '#F09A7A', intime: '#E8A0B8', confier: '#C9B8E4',
  line: 'rgba(255,255,255,.12)', glass: 'rgba(255,255,255,.05)', ink: '#1C140D',
};

export const card: React.CSSProperties = {
  borderRadius: 20, border: `1px solid ${DC.line}`, background: DC.glass, padding: 16, textAlign: 'left',
};

export function usePalette(): MomentPalette {
  const [m] = useState(() => getMoment());
  return PALETTES[m];
}

const DrLoShell: React.FC<{
  back: { to: string; label: string };
  genre?: 'homme' | 'femme';
  palette: MomentPalette;
  children: React.ReactNode;
}> = ({ back, genre, palette, children }) => {
  const [veiled, setVeiled] = useState(false);
  const seul = genre === 'femme' ? 'seule' : genre === 'homme' ? 'seul' : 'seul(e)';
  return (
    <div className="drl-screen font-sans" style={{ minHeight: '100svh', background: palette.bg, color: DC.text, position: 'relative' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 18px 28px', boxSizing: 'border-box' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Link to={back.to} aria-label={back.label} className="drl-btn"
            style={{ width: 44, height: 44, borderRadius: 13, border: `1px solid ${DC.line}`, background: DC.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DC.muted }}>
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: DC.muted }}>
            <Lock size={14} aria-hidden="true" /> Visible par toi {seul}
          </span>
          <button onClick={() => setVeiled(true)} aria-label="Masquer l'écran" className="drl-btn"
            style={{ width: 44, height: 44, borderRadius: 13, border: `1px solid ${DC.line}`, background: DC.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DC.muted, cursor: 'pointer' }}>
            <EyeOff size={20} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
      {veiled && (
        <button onClick={() => setVeiled(false)} aria-label="Revenir à l'écran"
          style={{ position: 'fixed', inset: 0, zIndex: 60, border: 0, background: 'rgba(15,12,10,.86)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', color: DC.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <EyeOff size={26} aria-hidden="true" /> Écran masqué · touche pour revenir
        </button>
      )}
    </div>
  );
};

export default DrLoShell;

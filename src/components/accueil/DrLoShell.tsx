/**
 * DrLoShell — cadre commun des écrans « Mon Dr Lô » (thème chaud sombre) :
 * fond selon le moment de la journée, retour, « visible par toi seul », masquer l'écran.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { canGoBackInApp } from '../../utils/navTrail';
import { ArrowLeft, EyeOff, Lock } from 'lucide-react';
import './accueil.css';
import { getMoment, PALETTES, type MomentPalette } from '../../utils/drloMoment';
import { COLOR, RADIUS } from '../../design/charte';
import HealthLogo from '../brand/HealthLogo';

/** Couleurs du thème sombre — tirées de la charte (src/design/charte.ts), source unique. */
export const DC = {
  text: COLOR.text, soft: COLOR.soft, muted: COLOR.muted, faint: COLOR.faint, title: COLOR.title,
  sage: COLOR.univers.mental, ok: COLOR.ok, gold: COLOR.action, social: COLOR.univers.social, intime: COLOR.univers.intime, confier: COLOR.univers.journal,
  line: COLOR.line, glass: COLOR.glass, ink: COLOR.onAction,
  action: COLOR.action, attention: COLOR.attention,
};

export const card: React.CSSProperties = {
  borderRadius: RADIUS.card, border: `1px solid ${DC.line}`, background: DC.glass, padding: 16, textAlign: 'left',
};

export function usePalette(): MomentPalette {
  const [m] = useState(() => getMoment());
  return PALETTES[m];
}

const DrLoShell: React.FC<{
  /** Absent sur les pages d'onglet (Tests, Moi) : il n'y a pas de page « avant ». */
  back?: { to: string; label: string };
  genre?: 'homme' | 'femme';
  palette: MomentPalette;
  /** Colonne de 480 px au plus (même système que l'accueil) */
  narrow?: boolean;
  children: React.ReactNode;
}> = ({ back, genre, palette, narrow, children }) => {
  const navigate = useNavigate();
  const [veiled, setVeiled] = useState(false);
  const seul = genre === 'femme' ? 'seule' : genre === 'homme' ? 'seul' : 'uniquement';
  return (
    <div className="drl-screen font-sans" style={{ minHeight: '100svh', background: palette.bg, color: DC.text, position: 'relative', ['--he-action' as string]: palette.primary } as React.CSSProperties}>
      <div className={narrow ? 'drl-wrap drl-wrap-home' : 'drl-wrap'} style={{ margin: '0 auto', padding: '16px 18px calc(92px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {back ? (
            <Link to={back.to} aria-label={back.label} className="drl-btn"
              onClick={e => { if (canGoBackInApp((window.history.state as { idx?: number } | null)?.idx)) { e.preventDefault(); navigate(-1); } }}
              style={{ width: 44, height: 44, borderRadius: 13, border: `1px solid ${DC.line}`, background: DC.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DC.muted }}>
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
          ) : null}
          <Link to="/" aria-label="Health-e, accueil" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, marginRight: 'auto', marginLeft: back ? 4 : 0 }}>
            <HealthLogo height={20} />
          </Link>
          <span title={`Visible par toi ${seul}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: DC.muted }}>
            <Lock size={13} aria-hidden="true" /> Privé<span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> : visible par toi {seul}</span>
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

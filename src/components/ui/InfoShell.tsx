/**
 * InfoShell — cadre des pages d'information publiques (FAQ, contact, confidentialité, conditions, éthique).
 * Même univers que le reste du site (fond chaud du moment, Fraunces, retour carré), sans le
 * « Visible par toi uniquement » de DrLoShell : ces pages sont publiques.
 * InfoSection / InfoList : blocs de texte lisibles (15 px, 65 caractères environ).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePalette } from '../accueil/DrLoShell';
import { COLOR, FONT, RADIUS } from '../../design/charte';

const InfoShell: React.FC<{
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  updated?: string;
  children: React.ReactNode;
}> = ({ eyebrow, title, intro, updated, children }) => {
  const palette = usePalette();
  return (
    <div className="drl-screen font-sans" style={{ minHeight: '100svh', background: palette.bg, color: COLOR.text, ['--he-action' as string]: palette.primary } as React.CSSProperties}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 18px calc(92px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
        <Link to="/" aria-label="Retour à l'accueil" className="drl-btn"
          style={{ width: 44, height: 44, borderRadius: 13, border: `1px solid ${COLOR.line}`, background: COLOR.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.muted }}>
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <header style={{ margin: '22px 0 24px' }}>
          {eyebrow && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: palette.accent }}>{eyebrow}</p>}
          <h1 style={{ margin: eyebrow ? '6px 0 0' : 0, fontFamily: FONT.display, fontSize: 30, fontWeight: 600, lineHeight: 1.15, color: COLOR.title }}>{title}</h1>
          {intro && <div style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.6, color: COLOR.soft, maxWidth: '62ch' }}>{intro}</div>}
          {updated && <p style={{ margin: '10px 0 0', fontSize: 13, color: COLOR.faint }}>Mis à jour le {updated}</p>}
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>
    </div>
  );
};

export const InfoSection: React.FC<{ title: string; children: React.ReactNode; id?: string }> = ({ title, children, id }) => (
  <section id={id} style={{ borderRadius: RADIUS.card, border: `1px solid ${COLOR.line}`, background: COLOR.glass, padding: '18px 18px 20px' }}>
    <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 600, color: COLOR.title, lineHeight: 1.3 }}>{title}</h2>
    <div className="he-info-body" style={{ marginTop: 8, fontSize: 15, lineHeight: 1.65, color: COLOR.soft, maxWidth: '65ch' }}>{children}</div>
  </section>
);

export const InfoList: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
);

export const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <p style={{ margin: '8px 0 0' }}>{children}</p>;

export const CONTACT_EMAIL = 'healthe.service@gmail.com';

export default InfoShell;

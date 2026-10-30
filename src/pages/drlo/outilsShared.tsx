/** Petits morceaux communs aux pages Routine, Boîte à outils et Les outils. */
import React from 'react';
import { BookOpen, Headphones, ListChecks } from 'lucide-react';
import { DC } from '../../components/accueil/DrLoShell';
import { PRACTICE_THEMES, type PracticeType } from '../../services/practiceService';

export const TYPE_ICON = { guided: Headphones, technique: ListChecks, carnet: BookOpen } as const;
export const themeLabel = (id: string) => PRACTICE_THEMES.find(t => t.id === id)?.label ?? 'Autre';
export const THEME_ORDER = PRACTICE_THEMES.map(t => t.id);
export const pageTitle: React.CSSProperties = { margin: '18px 0 0', fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.15, fontWeight: 600, color: DC.title };
export const kicker: React.CSSProperties = { margin: '22px 0 0', fontSize: 13, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F2B66D' };

export const TypeIcon: React.FC<{ type: PracticeType; color?: string; size?: number }> = ({ type, color = '#F2B66D', size = 24 }) => {
  const I = TYPE_ICON[type];
  return <I size={size} color={color} aria-hidden="true" />;
};

/** Barre d'avancement en `of` segments. */
export const Segments: React.FC<{ done: number; of: number; color?: string }> = ({ done, of, color = '#9DBFAF' }) => (
  <div style={{ display: 'flex', gap: 6 }} role="progressbar" aria-valuemin={0} aria-valuemax={of} aria-valuenow={Math.min(done, of)} aria-label="Avancement de l'apprentissage">
    {Array.from({ length: of }, (_, i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < done ? color : 'rgba(243,233,220,.2)' }} />)}
  </div>
);

export const pill = (bg: string): React.CSSProperties => ({ fontSize: 13, fontWeight: 700, color: '#1B130C', background: bg, padding: '2px 10px', borderRadius: 999 });

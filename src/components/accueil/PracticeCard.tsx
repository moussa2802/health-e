/** Carte « À toi maintenant » : une pratique proposée sous un épisode (ou ailleurs). Ouvre /pratique/:id. */
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Headphones, ListChecks } from 'lucide-react';
import { DC } from './DrLoShell';
import { typeLabel, type Practice } from '../../services/practiceService';

const ICON = { guided: Headphones, technique: ListChecks, carnet: BookOpen } as const;

export function priceLabel(p: Pick<Practice, 'price' | 'free' | 'unlocked'>): string {
  if (p.unlocked) return 'Débloquée';
  if (p.price === 0) return 'Gratuite';
  if (p.free) return 'Offerte aux membres';
  return `${p.price} étincelle${p.price > 1 ? 's' : ''}, une fois`;
}

const PracticeCard: React.FC<{ p: Practice; accent: string; from?: string }> = ({ p, accent, from }) => {
  const Icon = ICON[p.type];
  return (
    <Link to={`/pratique/${p.id}${from ? `?from=${encodeURIComponent(from)}` : ''}`} className="drl-btn"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, border: `1px solid ${accent}55`, background: 'rgba(242,182,109,.08)', textDecoration: 'none', color: DC.text }}>
      <span aria-hidden="true" style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, background: 'rgba(242,182,109,.16)', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: accent }}>À toi maintenant</span>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: DC.title, lineHeight: 1.3 }}>{p.title}</span>
        <span style={{ display: 'block', fontSize: 13, color: DC.muted }}>{typeLabel(p.type)} · {p.minutes} min · {priceLabel(p)}</span>
      </span>
      <ChevronRight size={18} color={DC.faint} aria-hidden="true" />
    </Link>
  );
};

export default PracticeCard;

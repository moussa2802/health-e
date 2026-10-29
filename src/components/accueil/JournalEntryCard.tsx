/**
 * JournalEntryCard — une page du journal dans une liste (Mon journal, et l'onglet « Mon journal » de Me confier) :
 * la date en grand à gauche, la première ligne comme titre, l'humeur, le carnet, l'avis de Dr Lô.
 * + les petits outils partagés du journal (dates, titres, carnets).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { DC, card } from './DrLoShell';
import MoodIcon from './MoodIcon';
import { MOODS } from '../../utils/moodLog';
import { DEFAULT_CARNET, type JournalItem } from '../../services/confierService';

export const INK = '#C9B8E4'; // violet doux de « Me confier »
export const PROGRAMME = 'Programme';
export const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const DAYS_SHORT = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const keyOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fullDate = (d: Date) => cap(`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`);
export const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const moodByLabel = (label: string) => MOODS.find(m => m.label === label || m.id === label);
/** La première ligne sert de titre, le reste d'aperçu. */
export function split(text: string): { title: string; rest: string } {
  const t = text.trim();
  const nl = t.indexOf('\n');
  const first = nl > 0 ? t.slice(0, nl) : t;
  if (first.length <= 70) return { title: first, rest: nl > 0 ? t.slice(nl + 1).trim() : '' };
  const cut = first.slice(0, 70).replace(/\s+\S*$/, '');
  return { title: `${cut}…`, rest: t };
}
/** Le carnet « Programme » toujours en dernier. */
export const sortCarnets = (list: string[]) => [...list.filter(c => c !== PROGRAMME), ...list.filter(c => c === PROGRAMME)];

export const EntryCard: React.FC<{ it: JournalItem }> = ({ it }) => {
  const d = new Date(it.date);
  const { title, rest } = split(it.contenu);
  const mood = it.humeur ? moodByLabel(it.humeur) : undefined;
  const programme = it.carnet === PROGRAMME;
  return (
    <Link to={`/journal/${it.id}`} className="drl-btn" style={{ ...card, padding: 0, display: 'flex', textDecoration: 'none', color: DC.text, overflow: 'hidden', opacity: programme ? 0.8 : 1 }}>
      <span aria-hidden="true" style={{ width: 62, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14, background: 'rgba(201,184,228,.08)', borderRight: '1px solid rgba(201,184,228,.18)' }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: INK }}>{Number.isNaN(d.getTime()) ? '' : DAYS_SHORT[d.getDay()]}</span>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 26, lineHeight: 1.1, fontWeight: 600, color: DC.title }}>{Number.isNaN(d.getTime()) ? '·' : d.getDate()}</span>
        {mood && <span style={{ marginTop: 6 }}><MoodIcon id={mood.id} color={mood.color} /></span>}
      </span>
      <span style={{ flex: 1, minWidth: 0, padding: '12px 14px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: DC.faint }}>
          {!Number.isNaN(d.getTime()) && hhmm(d)}
          {it.carnet !== DEFAULT_CARNET && <span style={{ padding: '1px 8px', borderRadius: 999, border: '1px solid rgba(201,184,228,.35)', color: INK, fontWeight: 700 }}>{it.carnet}</span>}
          {it.drLo && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#E9C88F', fontWeight: 700 }}><Sparkles size={11} aria-hidden="true" /> avis de Dr Lô</span>}
        </span>
        <span style={{ display: 'block', marginTop: 4, fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, lineHeight: 1.3, color: DC.title }}>{title || 'Page sans texte'}</span>
        {rest && <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 4, fontSize: 14, lineHeight: 1.5, color: DC.muted }}>{rest}</span>}
      </span>
    </Link>
  );
};


export default EntryCard;

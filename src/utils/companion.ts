/**
 * companion.ts — le nom que chaque personne donne à son compagnon (l'IA).
 * Jamais « docteur », « Dr », « médecin » ni « Lô » : « Dr Lô » désigne toujours le vrai médecin.
 * Même règle côté serveur (netlify/functions/_companion.js).
 */
export const COMPANION_DEFAULT = 'Mon compagnon';
export const COMPANION_MAX = 24;
const KEY = 'he_companion_name';
const BANNED = new Set(['dr', 'drs', 'doc', 'docteur', 'docteure', 'doctor', 'doctora', 'medecin', 'toubib', 'professeur', 'prof', 'pr', 'lo']);
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Le nom à garder, ou '' s'il est vide, trop long, étrange ou fait penser à un médecin. */
export function cleanCompanionName(raw: unknown): string {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > COMPANION_MAX) return '';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’-]*$/u.test(name)) return '';
  if (fold(name).split(/[^a-z0-9]+/).filter(Boolean).some(t => BANNED.has(t))) return '';
  return name;
}

/** Le nom choisi sur cet appareil, ou '' si la personne n'en a pas encore donné. */
export function getCompanionName(): string {
  try { return cleanCompanionName(localStorage.getItem(KEY)); } catch { return ''; }
}
/** Le nom à afficher : celui choisi, sinon « Mon compagnon ». */
export const companionLabel = () => getCompanionName() || COMPANION_DEFAULT;

export function saveCompanionName(raw: unknown): string {
  const name = cleanCompanionName(raw);
  try { if (name) localStorage.setItem(KEY, name); else localStorage.removeItem(KEY); } catch { /* stockage indisponible */ }
  return name;
}
/** Ce nom a-t-il déjà été demandé (même refusé / passé) sur cet appareil ? */
const ASKED = 'he_companion_asked';
export const companionAsked = () => { try { return localStorage.getItem(ASKED) === '1'; } catch { return true; } };
export const markCompanionAsked = () => { try { localStorage.setItem(ASKED, '1'); } catch { /* ignore */ } };

// ── La couleur du compagnon : un choix pour s'y attacher (sur l'appareil, comme le nom) ──
export interface CompanionColor { id: string; label: string; hex: string }
export const COMPANION_COLORS: CompanionColor[] = [
  { id: 'ambre', label: 'Ambre', hex: '#F2B66D' },
  { id: 'sauge', label: 'Sauge', hex: '#9DBFAF' },
  { id: 'lavande', label: 'Lavande', hex: '#C9B8E4' },
  { id: 'corail', label: 'Corail', hex: '#F09A7A' },
  { id: 'ciel', label: 'Ciel', hex: '#9FB4C8' },
  { id: 'rose', label: 'Rose', hex: '#E8A0B8' },
];
const COLOR_KEY = 'he_companion_color';
export const getCompanionColor = (): CompanionColor => {
  try { const id = localStorage.getItem(COLOR_KEY); return COMPANION_COLORS.find(c => c.id === id) ?? COMPANION_COLORS[0]; } catch { return COMPANION_COLORS[0]; }
};
export const saveCompanionColor = (id: string): CompanionColor => {
  const c = COMPANION_COLORS.find(x => x.id === id) ?? COMPANION_COLORS[0];
  try { localStorage.setItem(COLOR_KEY, c.id); } catch { /* ignore */ }
  return c;
};
// ── Son petit signe : ce qu'il porte sur la tête (le bonhomme reste le même ; sur l'appareil, comme le nom et la couleur) ──
export const COMPANION_ICONS = [
  { id: 'pousse', label: 'Pousse' },
  { id: 'etoile', label: 'Étoile' },
  { id: 'lune', label: 'Lune' },
  { id: 'flamme', label: 'Flamme' },
  { id: 'coeur', label: 'Cœur' },
  { id: 'feuille', label: 'Feuille' },
] as const;
export type CompanionIconId = typeof COMPANION_ICONS[number]['id'];
const ICON_KEY = 'he_companion_icon';
export const getCompanionIcon = (): CompanionIconId => {
  try { const id = localStorage.getItem(ICON_KEY); return (COMPANION_ICONS.find(i => i.id === id)?.id ?? 'pousse') as CompanionIconId; } catch { return 'pousse'; }
};
export const saveCompanionIcon = (id: string): CompanionIconId => {
  const i = (COMPANION_ICONS.find(x => x.id === id)?.id ?? 'pousse') as CompanionIconId;
  try { localStorage.setItem(ICON_KEY, i); } catch { /* ignore */ }
  return i;
};
/** Des noms pour « Surprends-moi » : courts, chaleureux, jamais ceux d'un médecin. */
export const COMPANION_NAME_IDEAS = ['Kora', 'Confident', 'Allié', 'Sama', 'Ndank', 'Baobab', 'Teranga', 'Lumi', 'Sora', 'Maam'];

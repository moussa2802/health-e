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

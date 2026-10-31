/**
 * _companion — le nom que chaque personne donne à son compagnon (l'IA). Jamais « docteur », « Dr », « médecin » :
 * « Dr Lô » désigne toujours le vrai médecin. Même règle côté navigateur (src/utils/companion.ts).
 */
const MAX_LEN = 24;
const BANNED = new Set(['dr', 'drs', 'doc', 'docteur', 'docteure', 'doctor', 'doctora', 'medecin', 'toubib', 'professeur', 'prof', 'pr', 'lo']);
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Le nom propre à utiliser, ou '' s'il est vide, trop long, étrange ou fait penser à un médecin. */
function sanitizeCompanionName(raw) {
  const name = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  if (!name || name.length > MAX_LEN) return '';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’-]*$/u.test(name)) return '';
  const tokens = fold(name).split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((t) => BANNED.has(t))) return '';
  return name;
}

module.exports = { sanitizeCompanionName, MAX_LEN };

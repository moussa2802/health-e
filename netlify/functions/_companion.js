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

/**
 * Sa façon de parler, choisie par la personne dans l'atelier. Seules ces valeurs passent (jamais un texte libre :
 * personne ne peut glisser ses propres consignes). Le reste des règles (sécurité, crise, pas de diagnostic) ne change pas.
 */
const STYLE_TEXT = {
  douce: 'Ton : DOUX. Tu prends ton temps, tu rassures, tu valides ce que la personne ressent avant de proposer quoi que ce soit. Phrases calmes.',
  franche: 'Ton : FRANC. Tu vas droit au but, avec bienveillance : tu nommes les choses clairement, tu proposes une action concrète vite. Pas de détours ni de longues formules.',
  taquine: 'Ton : TAQUIN. Tu taquines avec tendresse, un peu d\'humour léger, comme un ami proche ; jamais moqueur, et tu redeviens doux dès que la personne va mal.',
};
const LANG_TEXT = {
  fr: 'Langue : surtout en français, un mot de wolof de temps en temps seulement.',
  mix: 'Langue : un mélange naturel de français et de wolof, comme on parle à Dakar.',
  wo: 'Langue : davantage de wolof (salutations, expressions, phrases courtes en wolof), en gardant le français pour ce qui est précis ou médical.',
};
function companionStyleBlock(style, lang) {
  const s = STYLE_TEXT[style] || null;
  const l = LANG_TEXT[lang] || null;
  if (!s && !l) return '';
  return ['━━━ TA FAÇON DE PARLER (choisie par la personne) ━━━', s, l, 'Ce réglage ne change jamais les règles de sécurité : en moment difficile, tu restes doux et tu orientes.'].filter(Boolean).join('\n');
}

module.exports = { sanitizeCompanionName, companionStyleBlock, MAX_LEN };

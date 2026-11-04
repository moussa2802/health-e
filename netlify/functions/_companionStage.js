/**
 * _companionStage — les 4 stades du compagnon (logique pure, testée).
 *   0 Étincelle : à l'inscription
 *   1 Braise : après le premier test
 *   2 Flamme : quand l'animal intérieur se révèle
 *   3 Feu de veillée : 30 jours après l'arrivée, l'animal révélé
 * Il grandit avec ce que la personne fait pour elle, jamais avec de l'argent ; il ne rapetisse jamais.
 * Même liste côté navigateur (src/utils/companionStage.ts).
 */
const DAY = 86400000;
const VEILLEE_DAYS = 30;
const COLORS = ['ambre', 'sauge', 'lavande', 'corail', 'ciel', 'rose'];
const ICONS = ['pousse', 'etoile', 'lune', 'flamme', 'coeur', 'feuille'];

const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : v ? Date.parse(v) || 0 : 0);

/** Le stade que méritent les faits. */
function computeStage({ tests = 0, revealed = false, createdMs = 0, now = Date.now() }) {
  if (revealed && createdMs && now - createdMs >= VEILLEE_DAYS * DAY) return 3;
  if (revealed) return 2;
  if (tests > 0) return 1;
  return 0;
}

/** Jamais en arrière : le plus haut des deux. */
const keepGrowing = (stored, computed) => Math.max(Number(stored) || 0, Number(computed) || 0);

/** Les faits lus dans le profil et le portefeuille. */
function factsOf(profile, patient, now = Date.now()) {
  const p = profile || {};
  const totem = p.totem || {};
  const createdMs = ms(p.createdAt) || ms(patient && patient.korisWallet && patient.korisWallet.createdAt) || 0;
  return { tests: Object.keys(p.scaleResults || {}).length, revealed: !!(totem.animal && totem.revealedAt), createdMs, now };
}

const cleanColor = (c) => (COLORS.includes(c) ? c : null);
const cleanIcon = (i) => (ICONS.includes(i) ? i : null);

module.exports = { VEILLEE_DAYS, COLORS, ICONS, computeStage, keepGrowing, factsOf, cleanColor, cleanIcon };

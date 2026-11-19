/**
 * _compteurs — comment on montre les chiffres de « preuve sociale » (lecteurs d'un cas, « utile », « moi aussi », vues d'une réponse).
 * Décision de la direction (18/11/2026) :
 *   - sous le seuil : ni chiffre ni « 0 » (un petit chiffre produit l'inverse d'une preuve sociale, et peut laisser deviner qui a réagi) ;
 *   - au-dessus : exact jusqu'à 99, puis par dizaines (« 120+ »), puis par centaines (« 1200+ ») ;
 *   - les chiffres bruts restent toujours visibles pour Dr Lô seul (jamais arrondis, jamais masqués).
 */
const SEUILS = { lecteurs: 50, utile: 10, moi: 10, vues: 50 };

/** 7 → « 7 » ; 123 → « 120+ » ; 1234 → « 1200+ ». */
function arrondir(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (v < 100) return String(v);
  if (v < 1000) return `${Math.floor(v / 10) * 10}+`;
  return `${Math.floor(v / 100) * 100}+`;
}

/** Le chiffre à montrer au public, ou null (rien à montrer) en dessous du seuil. */
const afficher = (n, seuil) => ((Number(n) || 0) >= seuil ? arrondir(n) : null);

module.exports = { SEUILS, arrondir, afficher };

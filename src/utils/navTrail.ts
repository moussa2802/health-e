/**
 * navTrail — la page d'où l'on vient. Sert au bouton « retour » : il ramène à la page précédente,
 * et non à une page choisie d'avance (sinon on change d'onglet sans l'avoir demandé).
 */
let current = '';
let previous = '';

export function noteLocation(pathname: string): void {
  if (pathname === current) return;
  previous = current;
  current = pathname;
}

/** Pages qu'on ne rouvre pas en revenant en arrière : un test en cours, un défi joué. */
const TRANSIENT = /^\/(assessment\/quiz\/|d\/|api\/d\/)/;

/** Vrai si « retour » peut remonter l'historique de l'appli (et pas sortir du site ni rouvrir un test en cours). */
export function canGoBackInApp(historyIdx: number | undefined): boolean {
  return (historyIdx ?? 0) > 0 && !!previous && !TRANSIENT.test(previous);
}

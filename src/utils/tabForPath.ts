/** Quel onglet de la barre du bas est actif pour une adresse, ou null si la barre ne doit pas s'afficher. */
export type TabId = 'accueil' | 'tests' | 'compagnon' | 'moi';

/**
 * Pages ouvertes depuis plusieurs onglets (l'accueil, « Moi »…) : elles gardent l'onglet d'où l'on vient,
 * pour que la barre ne change pas sous les doigts. Sans onglet précédent (lien direct), on prend leur onglet habituel.
 */
export function isSharedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return p === '/chaines' || p.startsWith('/chaines/') || p === '/messages-dr-lo' || p.startsWith('/messages-dr-lo/') || p === '/question' || p === '/boite-a-questions'
    || p === '/routine' || p === '/boite-a-outils' || p === '/outils' || p === '/humeur';
}

export function tabForPath(pathname: string, previous: TabId | null = null): TabId | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (isSharedPath(p) && previous) return previous;
  if (p === '/') return 'accueil';
  if (p === '/chaines' || p.startsWith('/chaines/') || p === '/messages-dr-lo' || p.startsWith('/messages-dr-lo/') || p === '/question' || p === '/boite-a-questions') return 'accueil';
  if (p === '/espace/mental' || p === '/espace/intime' || p === '/espace/bonus' || p === '/espace/social' || p.startsWith('/espace/resultat/')) return 'tests';
  if (p === '/compagnon' || p === '/journal' || p.startsWith('/journal/')) return 'compagnon';
  if (p === '/espace' || p === '/humeur' || p === '/routine' || p === '/boite-a-outils' || p === '/outils' || p === '/defi' || p === '/defi/mes-defis' || p === '/decouvre' || p === '/acheter-koris') return 'moi';
  return null;
}

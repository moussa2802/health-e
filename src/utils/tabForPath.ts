/** Quel onglet de la barre du bas est actif pour une adresse, ou null si la barre ne doit pas s'afficher. */
export type TabId = 'accueil' | 'tests' | 'compagnon' | 'moi';

export function tabForPath(pathname: string): TabId | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return 'accueil';
  if (p === '/chaines' || p.startsWith('/chaines/') || p === '/messages-dr-lo' || p.startsWith('/messages-dr-lo/') || p === '/question' || p === '/boite-a-questions') return 'accueil';
  if (p === '/espace/mental' || p === '/espace/intime' || p === '/espace/bonus' || p === '/espace/social' || p.startsWith('/espace/resultat/')) return 'tests';
  if (p === '/compagnon' || p === '/journal' || p.startsWith('/journal/')) return 'compagnon';
  if (p === '/espace' || p === '/humeur' || p === '/routine' || p === '/boite-a-outils' || p === '/outils' || p === '/defi' || p === '/defi/mes-defis' || p === '/decouvre' || p === '/acheter-koris') return 'moi';
  return null;
}


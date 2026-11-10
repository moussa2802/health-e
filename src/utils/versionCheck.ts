/**
 * versionCheck — filet de sécurité de la mise à jour de l'appli installée (service worker).
 *
 * Normalement, le service worker se met à jour seul (autoUpdate, skipWaiting, clientsClaim) et la page se recharge.
 * Mais si son installation échoue (réseau coupé pendant le téléchargement, quota plein…), l'ancien service worker
 * continue de servir une ancienne version, parfois très ancienne. Ici, on compare la version qui tourne avec
 * /version.json (jamais mis en cache) : si elles diffèrent, on demande la mise à jour ; si rien n'a changé peu après,
 * on désinstalle le service worker de l'appli (pas celui des notifications), on vide ses caches et on recharge.
 * Une seule tentative par version, pour ne jamais tourner en boucle.
 */

export type VersionAction = 'rien' | 'reparer';

/** Décision pure (testée) : faut-il réparer ? */
export function decideVersion(courante: string, distante: string | null | undefined, dejaEssayee: string | null): VersionAction {
  if (!courante || courante === 'dev') return 'rien';
  if (!distante || !/^[a-z0-9]{6,40}$/i.test(distante)) return 'rien';
  if (distante === courante) return 'rien';
  if (dejaEssayee === distante) return 'rien';
  return 'reparer';
}

const TRIED_KEY = 'he-version-reparee';

/** La version publiée en ligne, ou null (hors ligne, fichier absent, réponse illisible). */
export async function fetchVersionEnLigne(): Promise<string | null> {
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as { version?: unknown };
    return typeof j.version === 'string' ? j.version : null;
  } catch { return null; }
}

/**
 * Vérifie, et répare si besoin. `onReload` recharge la page (en respectant les verrous : test en cours, etc.).
 * `attente` : le temps laissé à la mise à jour normale avant de forcer.
 */
export async function verifierVersion(courante: string, onReload: () => void, attente = 20000): Promise<void> {
  const distante = await fetchVersionEnLigne();
  let deja: string | null = null;
  try { deja = localStorage.getItem(TRIED_KEY); } catch { /* ignore */ }
  if (decideVersion(courante, distante, deja) !== 'reparer') return;
  const sw = navigator.serviceWorker;
  // 1. La voie normale : demander la mise à jour du service worker (le rechargement suit tout seul)
  try { const reg = await sw?.getRegistration('/'); await reg?.update(); } catch { /* ignore */ }
  await new Promise(r => setTimeout(r, attente));
  // 2. Toujours l'ancienne version : on répare (une seule fois pour cette version)
  try { localStorage.setItem(TRIED_KEY, String(distante)); } catch { /* ignore */ }
  try {
    const regs = (await sw?.getRegistrations()) ?? [];
    const racine = `${location.origin}/`;
    await Promise.all(regs.filter(r => r.scope === racine).map(r => r.unregister()));
    if ('caches' in window) {
      const noms = await caches.keys();
      await Promise.all(noms.filter(n => /workbox|precache|runtime/i.test(n)).map(n => caches.delete(n)));
    }
  } catch { /* au pire, le rechargement ira chercher le réseau */ }
  onReload();
}

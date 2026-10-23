/**
 * guestImport.ts — Que faut-il transférer dans le compte quand un invité s'inscrit ou se connecte ?
 * Logique pure (testable avec node --test).
 *  - un test invité n'est importé qu'une fois (importedTo) ;
 *  - on n'écrase jamais un résultat plus récent déjà présent dans le compte ;
 *  - l'humeur : les jours déjà notés dans le compte gardent leur valeur.
 */
export interface GuestTestLike { id: string; scaleId: string; importedTo?: string; result?: { completedAt: unknown } }

export function toMillis(v: unknown): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string' || typeof v === 'number') { const t = new Date(v).getTime(); return Number.isNaN(t) ? 0 : t; }
  const t = v as { toMillis?: () => number; seconds?: number };
  return t.toMillis ? t.toMillis() : (t.seconds ?? 0) * 1000;
}

export function planTestImport<T extends GuestTestLike>(
  guest: T[],
  accountResults: Record<string, { completedAt?: unknown }>,
): T[] {
  // Le plus récent par échelle
  const latest = new Map<string, T>();
  for (const g of guest) {
    if (g.importedTo || !g.result) continue;
    const prev = latest.get(g.scaleId);
    if (!prev || toMillis(g.result.completedAt) > toMillis(prev.result!.completedAt)) latest.set(g.scaleId, g);
  }
  return [...latest.values()].filter(g => {
    const acc = accountResults[g.scaleId];
    return !acc || toMillis(acc.completedAt) < toMillis(g.result!.completedAt);
  });
}

export function mergeMoods<T>(account: Record<string, T>, guest: Record<string, T>): Record<string, T> {
  return { ...guest, ...account };
}

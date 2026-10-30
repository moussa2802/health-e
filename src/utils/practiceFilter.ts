/**
 * practiceFilter.ts — recherche et filtre de la page « Les outils » (pur, testé).
 * Recherche sans accents ni majuscules sur le titre, la présentation et le thème ; le thème choisi restreint la liste.
 */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export interface Filterable { title: string; summary: string; theme: string }

export function practiceMatches(p: Filterable, query: string, theme: string, themeLabel: (id: string) => string): boolean {
  if (theme && p.theme !== theme) return false;
  const q = norm(query);
  if (!q) return true;
  const hay = norm(`${p.title} ${p.summary} ${themeLabel(p.theme)}`);
  return q.split(/\s+/).every(w => hay.includes(w));
}

/** Thèmes qui contiennent au moins un outil, dans l'ordre donné. */
export function themesInUse(items: { theme: string }[], order: string[]): string[] {
  const used = new Set(items.map(i => i.theme));
  return order.filter(t => used.has(t));
}

/** « Jour 3 sur 5 » → fraction de la barre d'avancement (0 à 1). */
export const learnRatio = (done: number, of: number) => (of > 0 ? Math.max(0, Math.min(1, done / of)) : 0);

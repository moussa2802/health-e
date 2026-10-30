/** Catégories pour ranger les chaînes (liste fermée, la même que côté serveur dans _drloChannels.js). */
export const CHANNEL_CATEGORIES: { id: string; label: string }[] = [
  { id: 'sante-mentale', label: 'Santé mentale' },
  { id: 'sante-sexuelle', label: 'Santé sexuelle' },
  { id: 'couple', label: 'Couple et relations' },
  { id: 'emotions', label: 'Émotions et stress' },
  { id: 'estime', label: 'Confiance en soi' },
  { id: 'famille', label: 'Famille et société' },
  { id: 'homme', label: 'Pour les hommes' },
  { id: 'femme', label: 'Pour les femmes' },
];
export const MAX_CHANNEL_CATEGORIES = 4;
export const categoryLabel = (id: string) => CHANNEL_CATEGORIES.find(c => c.id === id)?.label ?? id;

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** La chaîne correspond-elle à la recherche (nom, description, catégories) ? Minuscules, sans accents ; tous les mots doivent y être. */
export function channelMatches(c: { name: string; description: string; categories?: string[] }, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold(`${c.name} ${c.description} ${(c.categories ?? []).map(categoryLabel).join(' ')}`);
  return words.every(w => hay.includes(w));
}

/**
 * pageSection — la rubrique d'une adresse (même liste que netlify/functions/_stats.js → sectionOf).
 * Sert au suivi d'utilisation : « quelles parties du site sont les plus visitées ».
 */
export function sectionOf(path: string): string {
  const p = String(path || '/').split('?')[0];
  if (p === '/' || p === '') return 'accueil';
  const rules: [RegExp, string][] = [
    [/^\/compagnon/, 'compagnon'], [/^\/espace/, 'moi'], [/^\/assessment\/totem/, 'animal'], [/^\/assessment\/compatibility|^\/compat\//, 'compat'],
    [/^\/assessment\/results/, 'resultats'], [/^\/assessment/, 'tests'], [/^\/penc|^\/p\//, 'penc'], [/^\/journal/, 'journal'],
    [/^\/acheter-koris/, 'achat'], [/^\/chaines|^\/c\//, 'chaines'], [/^\/question|^\/messages-dr-lo/, 'question'], [/^\/defi|^\/decouvre/, 'defi'],
    [/^\/humeur/, 'humeur'], [/^\/point-de-la-semaine/, 'bilan'], [/^\/routine|^\/boite-a-outils|^\/pratique/, 'outils'], [/^\/admin|^\/espace-pro|^\/drlo/, ''],
  ];
  for (const [re, s] of rules) if (re.test(p)) return s;
  return 'autre';
}

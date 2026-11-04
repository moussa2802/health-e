/**
 * launch — le lancement par vagues (décision du 3 nov. 2026, doc « Charte graphique et lancement par étapes »).
 * Une fonctionnalité est visible si (1) sa vague est ouverte pour tout le monde (réglée dans l'Espace pro, onglet Accueil),
 * sauf exception, et (2) la personne l'a débloquée par sa progression. Rien n'est supprimé : tout reste accessible par lien.
 */
export type FeatureKey = 'confier' | 'programme' | 'routine' | 'synthese' | 'defis' | 'compat' | 'chaines' | 'penc_page' | 'question';
export type Unlock = 'tests1' | 'tests3' | 'animal';
export interface LaunchCfg { wave: number; open: string[]; closed: string[] }
export interface Progress { tests: number; animal: boolean }

export const FEATURES: Record<FeatureKey, { label: string; wave: 1 | 2 | 3 | 4; unlock?: Unlock }> = {
  confier: { label: 'Me confier (journal)', wave: 2, unlock: 'tests1' },
  programme: { label: 'Mon programme', wave: 2, unlock: 'tests3' },
  routine: { label: 'Routine et boîte à outils', wave: 2, unlock: 'tests3' },
  synthese: { label: 'Synthèse globale', wave: 2, unlock: 'animal' },
  defis: { label: 'Défis entre proches', wave: 2, unlock: 'animal' },
  compat: { label: 'Compatibilité', wave: 3 },
  chaines: { label: 'Chaînes', wave: 3 },
  penc_page: { label: 'Pénc mi en continu (page et agenda)', wave: 4 },
  question: { label: 'Question privée au médecin', wave: 4 },
};
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
export const UNLOCK_LABEL: Record<Unlock, string> = { tests1: 'après 1 test', tests3: 'après 3 tests', animal: 'après l\'animal intérieur' };
export const WAVES: { n: 1 | 2 | 3 | 4; name: string; text: string }[] = [
  { n: 1, name: 'Se découvrir', text: 'Tests, résultat, animal intérieur, compagnon, humeur, tes messages, questions anonymes.' },
  { n: 2, name: 'Aller plus loin', text: '+ Me confier, programme, routine et outils, synthèse, défis entre proches.' },
  { n: 3, name: 'À deux', text: '+ Compatibilité, chaînes.' },
  { n: 4, name: 'La communauté', text: '+ Pénc mi en continu, question privée.' },
];
export const DEFAULT_LAUNCH: LaunchCfg = { wave: 1, open: [], closed: [] };

/** Ouverte pour tout le monde (vague + exceptions), sans regarder la progression. */
export function openForAll(key: FeatureKey, cfg: LaunchCfg): boolean {
  if (cfg.closed.includes(key)) return false;
  return cfg.open.includes(key) || FEATURES[key].wave <= cfg.wave;
}

/** Visible pour cette personne. Une exception « ouvert » ignore aussi la progression. */
export function featureOn(key: FeatureKey, cfg: LaunchCfg, p: Progress | null): boolean {
  if (!openForAll(key, cfg)) return false;
  if (cfg.open.includes(key)) return true;
  const u = FEATURES[key].unlock;
  if (!u) return true;
  if (!p) return false;
  return u === 'tests1' ? p.tests >= 1 : u === 'tests3' ? p.tests >= 3 : p.animal;
}

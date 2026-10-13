import type { ScaleResult } from '../types/assessment';

export type DefiLevel = 'auto' | 'optin' | 'interdit';

export interface ScaleDefiConfig {
  public: DefiLevel;
  intime: DefiLevel;
}

/**
 * Classification de chaque test pour le jeu "Kan moo ma gën a xam ?"
 * Spec section 5.1.
 *
 * - auto    = proposé et coché par défaut
 * - optin   = proposé mais décoché (le créateur l'active)
 * - interdit = indisponible dans ce mode
 *
 * NOTE Brique 3 — reformulations obligatoires :
 * - bonus_tdah       → "tête en l'air / concentré(e)", jamais "TDAH"
 * - bonus_hpi        → "vif d'esprit / posé(e)", jamais "HPI"
 * - bonus_narcissisme → "aime briller / plutôt discret(e)"
 * - bonus_manipulation → "stratège / spontané(e)"
 * Ces libellés sont des traits valorisants, jamais des diagnostics.
 */
export const DEFI_SCALE_CONFIG: Record<string, ScaleDefiConfig> = {
  // ✅ Auto — proposé + coché dans les deux modes
  big_five:            { public: 'auto',     intime: 'auto' },
  ecr_r:               { public: 'auto',     intime: 'auto' },
  brs:                 { public: 'auto',     intime: 'auto' },
  bonus_tdah:          { public: 'auto',     intime: 'auto' },
  bonus_hsp:           { public: 'auto',     intime: 'auto' },
  bonus_hpi:           { public: 'auto',     intime: 'auto' },
  bonus_jalousie:      { public: 'auto',     intime: 'auto' },
  bonus_eq:            { public: 'auto',     intime: 'auto' },
  bonus_confiance:     { public: 'auto',     intime: 'auto' },
  bonus_personnalite:  { public: 'interdit', intime: 'optin' },
  bonus_narcissisme:   { public: 'auto',     intime: 'auto' },
  bonus_manipulation:  { public: 'auto',     intime: 'auto' },

  // ⚙️ Optin — proposé mais décoché
  gad7:                { public: 'optin',    intime: 'optin' },
  rses:                { public: 'optin',    intime: 'optin' },
  pss10:               { public: 'optin',    intime: 'optin' },
  social_pressure:     { public: 'optin',    intime: 'optin' },
  bonus_burnout:       { public: 'optin',    intime: 'optin' },
  bonus_dependance:    { public: 'optin',    intime: 'optin' },

  // ⛔ Interdit en public, ⚙️ optin en intime — tests sensibles
  phq9:                { public: 'interdit', intime: 'optin' },
  ace:                 { public: 'interdit', intime: 'optin' },
  pcl5:                { public: 'interdit', intime: 'optin' },
  pg13:                { public: 'interdit', intime: 'optin' },
  ceca_q:              { public: 'interdit', intime: 'optin' },
  religious_cultural:  { public: 'interdit', intime: 'optin' },
  economic_stress:     { public: 'interdit', intime: 'optin' },

  // ⛔ Interdit en public, ⚙️ optin en intime — vie intime (majeurs uniquement)
  nsss:                { public: 'interdit', intime: 'optin' },
  sdi2:                { public: 'interdit', intime: 'optin' },
  sis_ses:             { public: 'interdit', intime: 'optin' },
  fsfi:                { public: 'interdit', intime: 'optin' },
  iief:                { public: 'interdit', intime: 'optin' },
  tsi_base:            { public: 'interdit', intime: 'optin' },
  pair:                { public: 'interdit', intime: 'optin' },
  sise:                { public: 'interdit', intime: 'optin' },
  social_pressure_sex: { public: 'interdit', intime: 'optin' },
  griss_base:          { public: 'interdit', intime: 'optin' },
};

export function isScaleEligible(
  scaleResult: ScaleResult,
  mode: 'public' | 'intime',
): boolean {
  const config = DEFI_SCALE_CONFIG[scaleResult.scaleId];
  if (!config) return false;
  if (config[mode] === 'interdit') return false;
  if ((scaleResult.alertLevel ?? 0) >= 3) return false;
  return true;
}

export function getScaleDefiLevel(
  scaleId: string,
  mode: 'public' | 'intime',
): DefiLevel | null {
  const config = DEFI_SCALE_CONFIG[scaleId];
  return config ? config[mode] : null;
}

if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
  import('../data/scales').then(({ ALL_SCALES }) => {
    const configKeys = new Set(Object.keys(DEFI_SCALE_CONFIG));
    const scaleIds = new Set(ALL_SCALES.map(s => s.id));

    for (const key of configKeys) {
      if (!scaleIds.has(key)) {
        console.warn(`[defiConfig] Clé "${key}" n'existe pas dans ALL_SCALES`);
      }
    }
    for (const id of scaleIds) {
      if (!configKeys.has(id)) {
        console.warn(`[defiConfig] Scale "${id}" absent de DEFI_SCALE_CONFIG`);
      }
    }
  });
}

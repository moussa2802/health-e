/**
 * Configuration Koris — système de crédits Health-e
 *
 * ⚠️  DEPRECATED: Ce fichier est conservé pour rétrocompatibilité.
 *     Le nouveau système utilise:
 *       - src/services/korisService.ts (logique métier)
 *       - src/contexts/KorisContext.tsx (React context)
 *
 * active: true → le système Koris est actif
 */

export const KORIS_CONFIG = {
  active: true,

  costs: {
    chat_dr_lo_message: 1,
    journal_dr_lo_response: 1,
    generer_analyse: 1,
    test_compatibilite: 0,
    telecharger_profil: 0,
    test_principal: 0,
    test_bonus: 0,
  },
} as const;

export type KorisFeature = keyof typeof KORIS_CONFIG.costs;

/**
 * @deprecated Utiliser useKoris().spend() à la place.
 */
export async function canUseFeature(
  _userId: string | null,
  _feature: KorisFeature
): Promise<{ allowed: boolean; cost: number; balance?: number }> {
  if (!KORIS_CONFIG.active) {
    return { allowed: true, cost: 0 };
  }

  const cost = KORIS_CONFIG.costs[_feature];
  return { allowed: true, cost };
}

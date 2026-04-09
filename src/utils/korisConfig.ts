/**
 * Configuration Koris — système de crédits Health-e
 * active: false → toutes les fonctions bypasse la déduction
 * Passer active: true lors de l'intégration Koris
 */

export const KORIS_CONFIG = {
  active: false,

  costs: {
    chat_dr_lo_message: 5,      // par message envoyé à Dr Lô
    journal_dr_lo_response: 5,  // avis Dr Lô sur une entrée journal
    generer_analyse: 10,        // génération analyse Dr Lô (profil)
    test_compatibilite: 20,     // test de compatibilité
    telecharger_profil: 20,     // téléchargement PDF profil
    test_principal: 5,          // à partir du 4ème test principal
    test_bonus: 5,              // par test bonus
  },
} as const;

export type KorisFeature = keyof typeof KORIS_CONFIG.costs;

/**
 * Vérifie si la feature coûte des Koris.
 * Retourne true si l'action peut être effectuée (bypass si inactif).
 * À enrichir avec la logique de déduction quand Koris sera intégré.
 */
export async function canUseFeature(
  _userId: string | null,
  _feature: KorisFeature
): Promise<{ allowed: boolean; cost: number; balance?: number }> {
  if (!KORIS_CONFIG.active) {
    return { allowed: true, cost: 0 };
  }

  // TODO: vérifier le solde Koris dans Firestore et déduire
  const cost = KORIS_CONFIG.costs[_feature];
  return { allowed: true, cost };
}

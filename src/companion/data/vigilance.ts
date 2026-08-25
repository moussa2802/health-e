import type { Checkin, MoodType } from "../types";
import type { DrLoResponse } from "./drLoResponses";

// ⚠️ Seuil à valider par le médecin (Papa Moussa) avant mise en production.
//
// Détecte un signal sérieux, observable et simple : humeur basse ("triste"
// ou "anxieuse") sur les 4 derniers check-ins consécutifs. Ce n'est PAS un
// diagnostic, juste un repère qui déclenche une orientation douce.
export function detectVigilanceSignal(
  recentCheckins: Pick<Checkin, "mood">[]
): boolean {
  const lowMoods: MoodType[] = ["sad", "anxious"];
  const recent = recentCheckins.slice(-4);
  if (recent.length < 4) return false;
  return recent.every((c) => lowMoods.includes(c.mood));
}

// Message de vigilance de Dr Lô — orientation douce, jamais de diagnostic.
// Remplace (pas ne s'ajoute pas à) la réponse du jour normale quand le
// signal est détecté, pour ne pas noyer le message important.
export const vigilanceMessage: DrLoResponse = {
  message:
    "Je remarque que ça fait plusieurs jours que tu ne te sens pas bien. Ce n'est pas rien, et tu n'as pas à traverser ça seule. Ça pourrait valoir la peine d'en parler à quelqu'un de confiance, ou à un professionnel. Je suis là aussi. 🤍",
  suggestions: [
    "Si tu veux, on peut faire le point avec une évaluation plus complète",
  ],
};

// ─── NIVEAU 2 (hors MVP — NE PAS IMPLÉMENTER) ───────────────────────────────
// Filet de sécurité pour détresse grave / idées noires. Nécessite des
// ressources d'aide réelles et vérifiées pour le Sénégal (numéros d'urgence,
// lignes d'écoute...) que le médecin doit fournir séparément. Tant qu'elles
// ne sont pas fournies, ne mettre AUCUNE ressource, même provisoire.
// Point d'insertion prévu : un second détecteur (mots-clés dans la note du
// check-in, et/ou fréquence répétée du signal niveau 1) déclenchant un écran
// dédié avec ces ressources, en complément du message ci-dessus.

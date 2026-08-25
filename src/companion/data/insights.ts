import type { Checkin } from "../types";

/**
 * Observation simple et bienveillante sur la tendance récente. Se base sur
 * l'énergie (mesure neutre 1-5), jamais sur un classement des humeurs entre
 * "bonnes" et "mauvaises" — on ne juge pas ce que ressent l'utilisatrice.
 * `recentCheckins` : ordre chronologique croissant (le plus récent en dernier).
 */
export function getWeeklyInsight(recentCheckins: Checkin[]): string {
  if (recentCheckins.length < 3) {
    return "Chaque jour compte — continue à prendre ce moment pour toi. 🌸";
  }
  const [a, b, c] = recentCheckins.slice(-3).map((checkin) => checkin.energy);
  if (a < b && b < c) return "Ton énergie remonte depuis quelques jours. 🌱";
  if (a > b && b > c)
    return "Ton énergie semble redescendre ces derniers jours — sois douce avec toi-même. 🤍";
  return "Tu prends soin de toi chaque jour, continue ainsi. 🌸";
}

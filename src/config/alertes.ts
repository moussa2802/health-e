/**
 * Alertes automatiques de l'appli (« compagnon d'abord », décision de Papa Moussa, 10/11/2026).
 * Toutes coupées : pas d'écran, pas d'alarme ; un mot chaleureux, et un numéro seulement si la personne dit clairement
 * qu'elle va se faire du mal maintenant ou qu'elle est en danger immédiat (c'est alors le compagnon qui le glisse).
 * Retour en arrière : remettre le drapeau voulu à true (le code d'avant est gardé tel quel derrière chaque drapeau).
 * Côté serveur : DISTRESS_MODERATION (netlify/functions/_drloComments.js) et BILAN_LOW_MOOD_NUMBER (_drloProgramme.js).
 */

/** Écran de crise ouvert par la liste de mots, la balise [[crise]] du compagnon ou le tri « crisis » de l'accueil. */
export const CRISIS_SCREEN_AUTO: boolean = false;

/** Réponse inquiétante à une question de test (question 9 du test d'humeur) : écran, fenêtre rouge ou carte de numéros. */
export const TEST_ALERT_NUMBERS: boolean = false;

/** Programme : carte de numéros quand les derniers jours sont durs (humeur basse) ou que la personne est fragile. */
export const PROGRAMME_LOW_MOOD_NUMBERS: boolean = false;

/** Fin d'un test dans la discussion, résultat global sévère : carte des numéros d'urgence sous le message. */
export const SEVERE_RESULT_NUMBERS: boolean = false;

/** Page de résultat classique, alertes de niveau 2 (ex. question 7 du test d'anxiété) : bloc « Consultation professionnelle recommandée » avec deux numéros. */
export const LEVEL2_ALERT_NUMBERS: boolean = false;

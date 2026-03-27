import type { AssessmentScale } from '../../../types/assessment';

const freq5 = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Presque jamais" },
  { value: 2, label: "Parfois" },
  { value: 3, label: "Assez souvent" },
  { value: 4, label: "Très souvent" },
];

export const ECONOMIC_STRESS: AssessmentScale = {
  id: 'economic_stress',
  name: "Stress Économique et Survie",
  shortName: "Stress Économique",
  category: 'mental_health',
  description: "Évalue le niveau de stress lié aux difficultés économiques, à la précarité et aux obligations financières sociales.",
  instructions: "Au cours du dernier mois, à quelle fréquence avez-vous vécu les situations suivantes ?",
  timeEstimateMinutes: 4,
  reference: "Questionnaire Healt-e (2026). Adapté du PSS-10 (Cohen, 1983) pour le contexte africain francophone.",
  licenseNote: "Questionnaire original Healt-e. Tous droits réservés.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 40 },
  reverseIds: [9, 10],
  items: [
    { id: 1,  text: "Vous avez eu du mal à couvrir vos besoins de base (nourriture, logement, transport)",                                        type: 'frequency', options: freq5 },
    { id: 2,  text: "Vous vous êtes senti(e) dépassé(e) par vos difficultés financières",                                                         type: 'frequency', options: freq5 },
    { id: 3,  text: "Des membres de votre famille vous ont sollicité financièrement alors que vous n'étiez pas en mesure d'aider",                type: 'frequency', options: freq5 },
    { id: 4,  text: "La charge financière envers votre famille élargie vous a pesé",                                                              type: 'frequency', options: freq5 },
    { id: 5,  text: "Vous vous êtes senti(e) diminué(e) ou honteux(se) à cause de difficultés financières",                                      type: 'frequency', options: freq5 },
    { id: 6,  text: "Le manque d'argent a affecté votre confiance en vous ou votre image sociale",                                               type: 'frequency', options: freq5 },
    { id: 7,  text: "Vous avez ressenti du stress lié à des dettes ou au remboursement d'emprunts",                                              type: 'frequency', options: freq5 },
    { id: 8,  text: "Vous avez eu du mal à honorer vos obligations sociales (cérémonies, baptêmes, funérailles, tontines)",                      type: 'frequency', options: freq5 },
    { id: 9,  text: "Malgré les difficultés, vous avez gardé votre dignité et votre estime de vous-même",                                        type: 'frequency', options: freq5, reversed: true },
    { id: 10, text: "Vous avez trouvé des solutions créatives pour faire face aux contraintes économiques",                                       type: 'frequency', options: freq5, reversed: true },
  ],
  interpretation: [
    { min: 0,  max: 13, label: "Stress économique faible",   severity: 'minimal',  description: "Faible niveau de stress lié à des difficultés économiques.", referralRequired: false, recommendation: "Maintenez vos stratégies de gestion financière actuelles." },
    { min: 14, max: 26, label: "Stress économique modéré",   severity: 'moderate', description: "Niveau notable de stress économique impactant le bien-être.", referralRequired: false, recommendation: "Identifier les priorités financières et chercher des soutiens disponibles dans votre communauté." },
    { min: 27, max: 40, label: "Stress économique élevé",    severity: 'severe',   description: "Stress économique sévère avec impact sur la santé mentale.", referralRequired: true, recommendation: "Un soutien psychologique et social est recommandé. Vous n'êtes pas seul(e) face à ces défis." },
  ],
};

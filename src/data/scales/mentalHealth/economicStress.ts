import type { AssessmentScale } from '../../../types/assessment';

const freq5 = [
  { value: 0, label: "Jamais", subtitle: "Ça ne m'est pas arrivé" },
  { value: 1, label: "Presque jamais", subtitle: "De temps en temps" },
  { value: 2, label: "Parfois", subtitle: "Ça arrive régulièrement" },
  { value: 3, label: "Assez souvent", subtitle: "C'est fréquent" },
  { value: 4, label: "Très souvent", subtitle: "Presque tout le temps" },
];

export const ECONOMIC_STRESS: AssessmentScale = {
  id: 'economic_stress',
  name: "Stress Économique et Survie",
  shortName: "Stress Économique",
  category: 'mental_health',
  description: "Évalue le niveau de stress lié aux difficultés économiques, à la précarité et aux obligations financières sociales.",
  instructions: "Au cours du dernier mois, à quelle fréquence as-tu vécu ces situations liées à l'argent et aux obligations familiales ?",
  timeEstimateMinutes: 4,
  reference: "Questionnaire Healt-e (2026). Adapté du PSS-10 (Cohen, 1983) pour le contexte africain francophone.",
  licenseNote: "Questionnaire original Healt-e. Tous droits réservés.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 40 },
  reverseIds: [9, 10],
  items: [
    { id: 1,  text: "Tu as eu du mal à couvrir tes besoins de base — manger, payer le loyer, le transport ?",                                        type: 'frequency', options: freq5 },
    { id: 2,  text: "Tu t'es {{senti|sentie}} complètement {{dépassé|dépassée}} par tes problèmes d'argent ?",                                                         type: 'frequency', options: freq5 },
    { id: 3,  text: "Des proches t'ont demandé de l'argent alors que toi-même tu galérais financièrement ?",                                          type: 'frequency', options: freq5 },
    { id: 4,  text: "La charge financière envers ta famille élargie t'a pesé sur les épaules ?",                                                      type: 'frequency', options: freq5 },
    { id: 5,  text: "Tu t'es {{senti|sentie}} {{diminué|diminuée}} ou {{honteux|honteuse}} à cause de ta situation financière ?",                                                type: 'frequency', options: freq5 },
    { id: 6,  text: "Le manque d'argent a touché ta confiance en toi ou ton image aux yeux des autres ?",                                             type: 'frequency', options: freq5 },
    { id: 7,  text: "Tu as ressenti du stress à cause de dettes ou de remboursements qui traînent ?",                                                 type: 'frequency', options: freq5 },
    { id: 8,  text: "Tu as eu du mal à assurer ta part dans les cérémonies, baptêmes, funérailles ou tontines ?",                                     type: 'frequency', options: freq5 },
    { id: 9,  text: "Malgré les galères, tu as réussi à garder ta dignité et ton estime de toi 💪",                                                   type: 'frequency', options: freq5 },
    { id: 10, text: "Tu as trouvé des solutions créatives pour t'en sortir malgré les contraintes financières ?",                                     type: 'frequency', options: freq5 },
  ],
  interpretation: [
    { min: 0,  max: 13, label: "Stress économique faible",   severity: 'minimal',  description: "Ton niveau de stress lié à l'argent est plutôt bas — c'est une bonne nouvelle.", referralRequired: false, recommendation: "Continue comme ça ! Tes stratégies pour gérer les finances semblent fonctionner. Garde le cap 🙏" },
    { min: 14, max: 26, label: "Stress économique modéré",   severity: 'moderate', description: "L'argent te pèse pas mal en ce moment, et ça peut clairement affecter ton moral.", referralRequired: false, recommendation: "Essaie d'identifier ce qui te stresse le plus côté finances, et regarde les soutiens disponibles autour de toi — famille, communauté, associations. Tu n'as pas à tout porter {{seul|seule}}." },
    { min: 27, max: 40, label: "Stress économique élevé",    severity: 'severe',   description: "Le poids de l'argent est vraiment lourd en ce moment, et ça impacte sérieusement ton bien-être.", referralRequired: true, recommendation: "Ce que tu traverses est difficile, et tu mérites un coup de main. Un soutien psychologique ou social peut t'aider à reprendre pied. Tu n'es pas {{seul|seule}} dans cette situation ❤️" },
  ],
};

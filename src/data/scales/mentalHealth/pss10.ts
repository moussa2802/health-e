import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Presque jamais" },
  { value: 2, label: "Parfois" },
  { value: 3, label: "Assez souvent" },
  { value: 4, label: "Très souvent" },
];

export const PSS10: AssessmentScale = {
  id: 'pss10',
  name: "Stress Perçu",
  shortName: "PSS-10",
  category: 'mental_health',
  description: "Mesure le degré auquel les situations de la vie sont perçues comme stressantes.",
  instructions: "Au cours du dernier mois, à quelle fréquence avez-vous ressenti ou pensé ce qui suit ?",
  timeEstimateMinutes: 4,
  reference: "Cohen, S., Kamarck, T., & Mermelstein, R. (1983). A global measure of perceived stress. Journal of Health and Social Behavior, 24(4), 385–396.",
  licenseNote: "Domaine public. Libre de droits.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 40 },
  reverseIds: [4, 5, 7, 8],
  items: [
    { id: 1,  text: "Vous avez été bouleversé(e) par quelque chose d'inattendu",                                          type: 'frequency', options: opts },
    { id: 2,  text: "Vous avez senti que vous étiez incapable de contrôler les choses importantes de votre vie",          type: 'frequency', options: opts },
    { id: 3,  text: "Vous vous êtes senti(e) nerveux(se) et stressé(e)",                                                  type: 'frequency', options: opts },
    { id: 4,  text: "Vous avez été confiant(e) dans votre capacité à gérer vos problèmes personnels",                    type: 'frequency', options: opts, reversed: true },
    { id: 5,  text: "Vous avez senti que les choses tournaient comme vous le vouliez",                                    type: 'frequency', options: opts, reversed: true },
    { id: 6,  text: "Vous n'avez pas pu faire face à tout ce que vous aviez à faire",                                     type: 'frequency', options: opts },
    { id: 7,  text: "Vous avez été capable de contrôler les irritations dans votre vie",                                  type: 'frequency', options: opts, reversed: true },
    { id: 8,  text: "Vous vous êtes senti(e) maître de la situation",                                                    type: 'frequency', options: opts, reversed: true },
    { id: 9,  text: "Vous avez été en colère à cause de choses hors de votre contrôle",                                  type: 'frequency', options: opts },
    { id: 10, text: "Vous avez senti que les difficultés s'accumulaient au point de ne pas pouvoir y faire face",         type: 'frequency', options: opts },
  ],
  interpretation: [
    { min: 0,  max: 13, label: "Stress faible",    severity: 'minimal',  description: "Niveau de stress gérable, dans la norme.", referralRequired: false, recommendation: "Maintenez vos pratiques de bien-être actuelles." },
    { min: 14, max: 26, label: "Stress modéré",    severity: 'moderate', description: "Niveau de stress notable pouvant impacter votre santé.", referralRequired: false, recommendation: "Identifier les sources de stress et mettre en place des stratégies de gestion." },
    { min: 27, max: 40, label: "Stress élevé",     severity: 'severe',   description: "Niveau de stress élevé nécessitant attention.", referralRequired: true, recommendation: "Consulter un professionnel de santé pour vous accompagner dans la gestion du stress." },
  ],
};

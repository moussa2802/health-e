import type { AssessmentScale } from '../../../types/assessment';

const agree5 = [
  { value: 1, label: "Jamais / Pas du tout" },
  { value: 2, label: "Rarement" },
  { value: 3, label: "Parfois" },
  { value: 4, label: "Souvent" },
  { value: 5, label: "Toujours / Tout à fait" },
];

export const SOCIAL_PRESSURE: AssessmentScale = {
  id: 'social_pressure',
  name: "Pression Sociale, Mariage et Genre",
  shortName: "Pression Sociale",
  category: 'mental_health',
  description: "Évalue l'impact des pressions sociales liées au mariage, aux rôles de genre et aux attentes de l'entourage.",
  instructions: "Indiquez à quelle fréquence vous vivez ou ressentez les situations suivantes.",
  timeEstimateMinutes: 5,
  reference: "Questionnaire Healt-e (2026). Développé en collaboration avec des professionnels de santé mentale au Sénégal.",
  licenseNote: "Questionnaire original Healt-e. Tous droits réservés.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 12, max: 60 },
  items: [
    { id: 1,  text: "Ma famille me presse de me marier ou d'être en couple",                                                    type: 'likert', options: agree5, subscale: 'marriage_pressure' },
    { id: 2,  text: "Je sens que mon statut marital est un sujet de jugement dans ma communauté",                               type: 'likert', options: agree5, subscale: 'marriage_pressure' },
    { id: 3,  text: "Je reçois des commentaires sur mon âge et le fait de ne pas être marié(e) ou parent",                     type: 'likert', options: agree5, subscale: 'marriage_pressure' },
    { id: 4,  text: "On attend de moi que j'assume des rôles définis par mon genre (homme fort, femme au foyer...)",            type: 'likert', options: agree5, subscale: 'gender_roles' },
    { id: 5,  text: "Je ressens de la pression pour correspondre aux attentes de ma communauté concernant mon rôle de genre",   type: 'likert', options: agree5, subscale: 'gender_roles' },
    { id: 6,  text: "Mes choix de vie sont limités par ce que la société attend de mon genre",                                  type: 'likert', options: agree5, subscale: 'gender_roles' },
    { id: 7,  text: "Je me sens jugé(e) par mon entourage pour mes choix personnels (carrière, mode de vie, partenaire)",       type: 'likert', options: agree5, subscale: 'social_judgment' },
    { id: 8,  text: "La peur du regard des autres influence mes décisions importantes",                                         type: 'likert', options: agree5, subscale: 'social_judgment' },
    { id: 9,  text: "Mon niveau économique influence ma valeur perçue dans les relations amoureuses",                           type: 'likert', options: agree5, subscale: 'economic_pressure' },
    { id: 10, text: "Je ressens une pression financière liée aux attentes de ma famille ou de ma communauté pour les fêtes",   type: 'likert', options: agree5, subscale: 'economic_pressure' },
    { id: 11, text: "Je sacrifie mes désirs personnels pour correspondre aux attentes sociales",                                type: 'likert', options: agree5, subscale: 'conformity' },
    { id: 12, text: "Il m'est difficile de faire des choix authentiques sans l'approbation de mon entourage",                  type: 'likert', options: agree5, subscale: 'conformity' },
  ],
  subscales: [
    { key: 'marriage_pressure', label: "Pression au mariage",         itemIds: [1,2,3],   range: { min: 3, max: 15 } },
    { key: 'gender_roles',      label: "Rôles de genre",              itemIds: [4,5,6],   range: { min: 3, max: 15 } },
    { key: 'social_judgment',   label: "Jugement social",             itemIds: [7,8],     range: { min: 2, max: 10 } },
    { key: 'economic_pressure', label: "Pression économique",        itemIds: [9,10],    range: { min: 2, max: 10 } },
    { key: 'conformity',        label: "Conformité vs authenticité", itemIds: [11,12],   range: { min: 2, max: 10 } },
  ],
  interpretation: [
    { min: 12, max: 24, label: "Pression sociale faible",    severity: 'positive', description: "Vous semblez relativement libre des pressions sociales.", referralRequired: false, recommendation: "Continuez à cultiver votre authenticité." },
    { min: 25, max: 42, label: "Pression sociale modérée",   severity: 'mild',     description: "Vous ressentez une pression sociale notable qui peut parfois limiter votre liberté.", referralRequired: false, recommendation: "Identifier les pressions les plus contraignantes peut vous aider à y faire face." },
    { min: 43, max: 60, label: "Pression sociale élevée",    severity: 'moderate', description: "La pression sociale pèse significativement sur vos choix et votre bien-être.", referralRequired: false, recommendation: "Un accompagnement pour affirmer votre identité propre peut être bénéfique." },
  ],
};

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
  instructions: "Ces questions portent sur les pressions que tu peux ressentir de la part de ton entourage et de ta société. Réponds franchement 💬",
  timeEstimateMinutes: 5,
  reference: "Questionnaire Healt-e (2026). Développé en collaboration avec des professionnels du profil psychologique au Sénégal.",
  licenseNote: "Questionnaire original Healt-e. Tous droits réservés.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 12, max: 60 },
  items: [
    { id: 1,  text: "Ta famille te met la pression pour que tu te maries ou que tu sois en couple ?",                                                type: 'likert', options: agree5, subscale: 'marriage_pressure' },
    { id: 2,  text: "Tu sens que ton statut marital est un sujet de jugement dans ton entourage ou ta communauté ?",                                 type: 'likert', options: agree5, subscale: 'marriage_pressure' },
    { id: 3,  text: "Tu reçois des remarques sur ton âge et le fait de ne pas être {{marié|mariée}} ou parent ?",                                           type: 'likert', options: agree5, subscale: 'marriage_pressure' },
    { id: 4,  text: "On attend de toi que tu joues un rôle bien défini par ton genre — homme fort, femme au foyer… ?",                              type: 'likert', options: agree5, subscale: 'gender_roles' },
    { id: 5,  text: "Tu ressens de la pression pour coller aux attentes de ta communauté sur ce que doit être un homme ou une femme ?",              type: 'likert', options: agree5, subscale: 'gender_roles' },
    { id: 6,  text: "Tes choix de vie sont limités par ce que la société attend de ton genre ?",                                                     type: 'likert', options: agree5, subscale: 'gender_roles' },
    { id: 7,  text: "Tu te sens {{jugé|jugée}} par ton entourage pour tes choix personnels — carrière, mode de vie, partenaire ?",                         type: 'likert', options: agree5, subscale: 'social_judgment' },
    { id: 8,  text: "La peur du regard des autres influence tes décisions importantes ?",                                                            type: 'likert', options: agree5, subscale: 'social_judgment' },
    { id: 9,  text: "Tu as l'impression que ta situation financière change la façon dont on te voit dans les relations amoureuses ?",                type: 'likert', options: agree5, subscale: 'economic_pressure' },
    { id: 10, text: "Tu ressens une pression financière liée aux attentes de ta famille ou de ta communauté pour les fêtes et cérémonies ?",        type: 'likert', options: agree5, subscale: 'economic_pressure' },
    { id: 11, text: "Tu sacrifies tes envies personnelles pour correspondre à ce que la société attend de toi ?",                                    type: 'likert', options: agree5, subscale: 'conformity' },
    { id: 12, text: "C'est difficile pour toi de faire des choix authentiques sans l'approbation de ton entourage ?",                                type: 'likert', options: agree5, subscale: 'conformity' },
  ],
  subscales: [
    { key: 'marriage_pressure', label: "Pression au mariage",         itemIds: [1,2,3],   range: { min: 3, max: 15 } },
    { key: 'gender_roles',      label: "Rôles de genre",              itemIds: [4,5,6],   range: { min: 3, max: 15 } },
    { key: 'social_judgment',   label: "Jugement social",             itemIds: [7,8],     range: { min: 2, max: 10 } },
    { key: 'economic_pressure', label: "Pression économique",        itemIds: [9,10],    range: { min: 2, max: 10 } },
    { key: 'conformity',        label: "Conformité vs authenticité", itemIds: [11,12],   range: { min: 2, max: 10 } },
  ],
  interpretation: [
    { min: 12, max: 24, label: "Pression sociale faible",    severity: 'positive', description: "Tu sembles assez libre par rapport aux pressions de ton entourage — c'est une vraie force.", referralRequired: false, recommendation: "Continue à cultiver cette authenticité, elle te protège 🌟" },
    { min: 25, max: 42, label: "Pression sociale modérée",   severity: 'mild',     description: "Tu ressens une pression sociale notable qui peut parfois limiter ta liberté de choix.", referralRequired: false, recommendation: "Essaie d'identifier les pressions qui te pèsent le plus — les nommer, c'est déjà un premier pas pour s'en libérer." },
    { min: 43, max: 60, label: "Pression sociale élevée",    severity: 'moderate', description: "La pression de ton entourage et de ta société pèse vraiment sur tes choix et ton bien-être au quotidien.", referralRequired: false, recommendation: "Tu mérites de vivre selon tes propres valeurs. Un accompagnement pour t'aider à affirmer qui tu es vraiment pourrait te faire beaucoup de bien 💛" },
  ],
};

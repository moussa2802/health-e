import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 1, label: "Pas du tout d'accord" },
  { value: 2, label: "2" }, { value: 3, label: "3" }, { value: 4, label: "4" },
  { value: 5, label: "5" }, { value: 6, label: "6" },
  { value: 7, label: "Tout à fait d'accord" },
];

export const ECR_R: AssessmentScale = {
  id: 'ecr_r',
  name: "Style d'Attachement Adulte",
  shortName: "ECR-R",
  category: 'mental_health',
  description: "Évalue le style d'attachement adulte dans les relations proches selon deux dimensions : l'anxiété d'abandon et l'évitement de l'intimité.",
  instructions: "Les affirmations suivantes concernent votre façon de ressentir les choses dans vos relations proches. Indiquez dans quelle mesure vous êtes d'accord.",
  timeEstimateMinutes: 5,
  reference: "Fraley, R.C., Waller, N.G., & Brennan, K.A. (2000). An item response theory analysis of self-report measures of adult attachment. Journal of Personality and Social Psychology, 78(2), 350–365.",
  licenseNote: "Libre pour usage clinique et de recherche.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 12, max: 84 },
  items: [
    { id: 1,  text: "J'ai peur d'être abandonné(e) par mes proches",                                         type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 2,  text: "Je me fais souvent du souci à l'idée que mon/ma partenaire ne m'aime plus",             type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 3,  text: "Je crains que mes partenaires ne m'apprécient pas autant que je les apprécie",          type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 4,  text: "Quand mon/ma partenaire est absent(e), je m'inquiète qu'il/elle s'intéresse à quelqu'un d'autre", type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 5,  text: "Je m'inquiète beaucoup de mes relations",                                                type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 6,  text: "Quand mon/ma partenaire n'est pas disponible, je me sens anxieux(se)",                  type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 7,  text: "Je préfère ne pas montrer mes sentiments à mon/ma partenaire",                          type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 8,  text: "Je suis mal à l'aise d'être proche des autres",                                         type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 9,  text: "Je préfère ne pas dépendre des autres",                                                 type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 10, text: "Je suis nerveux(se) quand mes partenaires s'approchent trop de moi",                    type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 11, text: "J'essaie d'éviter d'être trop proche de mon/ma partenaire",                             type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 12, text: "Je trouve difficile de laisser mon/ma partenaire me soutenir émotionnellement",         type: 'likert', options: opts, subscale: 'avoidance' },
  ],
  subscales: [
    { key: 'anxiety',   label: "Anxiété d'attachement", itemIds: [1,2,3,4,5,6],    range: { min: 6, max: 42 } },
    { key: 'avoidance', label: "Évitement de l'intimité", itemIds: [7,8,9,10,11,12], range: { min: 6, max: 42 } },
  ],
  interpretation: [
    { min: 12, max: 30, label: "Style sécure",     severity: 'positive', description: "Faible anxiété et faible évitement : style d'attachement sécure et équilibré.", referralRequired: false, recommendation: "Votre style d'attachement favorise des relations stables et épanouissantes." },
    { min: 31, max: 48, label: "Style préoccupé",  severity: 'mild',     description: "Anxiété élevée : tendance à chercher beaucoup de réassurance dans les relations.", referralRequired: false, recommendation: "Travailler la confiance en soi et la régulation émotionnelle peut être bénéfique." },
    { min: 49, max: 66, label: "Style détaché",    severity: 'moderate', description: "Évitement élevé : tendance à maintenir une distance émotionnelle.", referralRequired: false, recommendation: "Explorer les raisons de cette distance peut enrichir vos relations." },
    { min: 67, max: 84, label: "Style craintif",   severity: 'moderate', description: "Anxiété et évitement élevés : peur de l'intimité et des abandons.", referralRequired: false, recommendation: "Un accompagnement psychologique peut vous aider à construire des relations plus sécures." },
  ],
};

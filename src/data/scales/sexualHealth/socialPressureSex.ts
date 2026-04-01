import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 1, label: "Jamais / Pas du tout" },
  { value: 2, label: "Rarement" },
  { value: 3, label: "Parfois" },
  { value: 4, label: "Souvent" },
  { value: 5, label: "Toujours / Tout à fait" },
];

export const SOCIAL_PRESSURE_SEX: AssessmentScale = {
  id: 'social_pressure_sex',
  name: "Pression Sociale et Sexualité",
  shortName: "Pression Sexualité",
  category: 'sexual_health',
  description: "Évalue l'impact des pressions sociales et culturelles sur la vie sexuelle.",
  instructions: "Indiquez à quelle fréquence vous vivez ou ressentez les situations suivantes concernant votre sexualité.",
  timeEstimateMinutes: 5,
  reference: "Questionnaire Healt-e (2026). Développé pour le contexte africain francophone.",
  licenseNote: "Questionnaire original Healt-e. Tous droits réservés.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 14, max: 70 },
  items: [
    { id: 1,  text: "Je me sens obligé(e) d'avoir des rapports sexuels même quand je n'en ai pas envie (devoir conjugal, pression du partenaire)", type: 'likert', options: opts, subscale: 'coercion' },
    { id: 2,  text: "Je ressens une pression liée à ma virginité ou à mes expériences sexuelles passées",                                          type: 'likert', options: opts, subscale: 'coercion' },
    { id: 3,  text: "On attend de moi que j'aie ou n'aie pas de rapports sexuels selon des critères culturels (âge, statut marital, genre)",      type: 'likert', options: opts, subscale: 'coercion' },
    { id: 4,  text: "La sexualité est un sujet tabou dans ma famille ou communauté",                                                              type: 'likert', options: opts, subscale: 'taboo' },
    { id: 5,  text: "Il m'est difficile de parler de sexualité avec mes proches ou mon partenaire",                                               type: 'likert', options: opts, subscale: 'taboo' },
    { id: 6,  text: "Je manque d'informations fiables sur la sexualité en raison du silence culturel autour de ce sujet",                        type: 'likert', options: opts, subscale: 'taboo' },
    { id: 7,  text: "Les normes culturelles de mon milieu limitent ma capacité à exprimer et à ressentir du plaisir sexuel",                      type: 'likert', options: opts, subscale: 'norms' },
    { id: 8,  text: "Je me sens coupable de ressentir du plaisir sexuel à cause des messages culturels ou religieux reçus",                      type: 'likert', options: opts, subscale: 'norms' },
    { id: 9,  text: "Je crains d'être jugé(e) ou stigmatisé(e) à cause de mes pratiques ou préférences sexuelles",                              type: 'likert', options: opts, subscale: 'stigma' },
    { id: 10, text: "Certains aspects de ma sexualité sont considérés comme inacceptables dans mon environnement social",                        type: 'likert', options: opts, subscale: 'stigma' },
    { id: 11, text: "Mon partenaire et moi évitions de parler ouvertement de nos désirs ou insatisfactions sexuelles",                          type: 'likert', options: opts, subscale: 'communication' },
    { id: 12, text: "Il m'est difficile de dire non ou d'exprimer mes limites sexuelles dans ma relation",                                       type: 'likert', options: opts, subscale: 'communication' },
    // Items pression virginité — contexte sénégalais
    { id: 13, text: "Dans mon entourage, la question de la virginité est une pression que je ressens régulièrement",                             type: 'likert', options: opts, subscale: 'virginity' },
    { id: 14, text: "Ma façon de vivre ma sexualité crée un conflit avec ce qu'on attend de moi",                  type: 'likert', options: opts, subscale: 'virginity' },
  ],
  subscales: [
    { key: 'coercion',      label: "Pression et coercition",       itemIds: [1,2,3],   range: { min: 3, max: 15 } },
    { key: 'taboo',         label: "Tabou et silence",             itemIds: [4,5,6],   range: { min: 3, max: 15 } },
    { key: 'norms',         label: "Normes culturelles",           itemIds: [7,8],     range: { min: 2, max: 10 } },
    { key: 'stigma',        label: "Stigmatisation",               itemIds: [9,10],    range: { min: 2, max: 10 } },
    { key: 'communication', label: "Communication sexuelle",       itemIds: [11,12],   range: { min: 2, max: 10 } },
    { key: 'virginity',     label: "Pression virginité / valeurs", itemIds: [13,14],   range: { min: 2, max: 10 } },
  ],
  interpretation: [
    { min: 14, max: 28, label: "Pression sociale faible",    severity: 'positive', description: "Vous semblez relativement libre des pressions sociales dans votre sexualité.", referralRequired: false, recommendation: "Continuez à cultiver une sexualité épanouie et respectueuse de vos valeurs." },
    { min: 29, max: 49, label: "Pression sociale modérée",   severity: 'mild',     description: "Des pressions sociales influencent modérément votre vie sexuelle.", referralRequired: false, recommendation: "Identifier ces pressions et leurs impacts peut vous aider à mieux les gérer." },
    { min: 50, max: 70, label: "Pression sociale élevée",    severity: 'moderate', description: "Des pressions sociales importantes limitent votre épanouissement sexuel.", referralRequired: false, recommendation: "Un accompagnement par un professionnel sensible aux enjeux culturels peut être bénéfique." },
  ],
};

import type { AssessmentScale } from '../../../types/assessment';

const agree5 = [
  { value: 1, label: "Pas du tout d'accord" },
  { value: 2, label: "Plutôt pas d'accord" },
  { value: 3, label: "Neutre" },
  { value: 4, label: "Plutôt d'accord" },
  { value: 5, label: "Tout à fait d'accord" },
];

export const RELIGIOUS_CULTURAL: AssessmentScale = {
  id: 'religious_cultural',
  name: "Impact Religieux et Culturel sur la Psyché",
  shortName: "Religion & Culture",
  category: 'mental_health',
  description: "Évalue l'influence des croyances religieuses et des valeurs culturelles sur la santé mentale et les décisions de vie.",
  instructions: "Indiquez dans quelle mesure vous êtes d'accord avec chacune des affirmations suivantes.",
  timeEstimateMinutes: 6,
  reference: "Questionnaire Healt-e (2026). Inspiré des travaux de l'École de Psychiatrie de Fann, Dakar, Sénégal.",
  licenseNote: "Questionnaire original Healt-e. Tous droits réservés.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 14, max: 70 },
  items: [
    { id: 1,  text: "Ma foi religieuse m'aide à faire face aux difficultés de la vie",                                                            type: 'likert', options: agree5, subscale: 'religious_support', reversed: true },
    { id: 2,  text: "La prière ou la méditation m'apporte un sentiment de paix intérieure",                                                       type: 'likert', options: agree5, subscale: 'religious_support', reversed: true },
    { id: 3,  text: "Ma communauté religieuse est une source de soutien importante pour moi",                                                     type: 'likert', options: agree5, subscale: 'religious_support', reversed: true },
    { id: 4,  text: "Mes croyances religieuses influencent fortement mes décisions de vie (mariage, carrière, comportements)",                    type: 'likert', options: agree5, subscale: 'religious_influence' },
    { id: 5,  text: "Je me sens en conflit entre mes valeurs religieuses et certains de mes désirs ou besoins personnels",                        type: 'likert', options: agree5, subscale: 'cultural_conflict' },
    { id: 6,  text: "Je me sens partagé(e) entre les valeurs de ma culture d'origine et les valeurs modernes ou occidentales",                   type: 'likert', options: agree5, subscale: 'cultural_conflict' },
    { id: 7,  text: "Il m'arrive de me sentir incompris(e) par ma famille ou communauté à cause de mes idées ou modes de vie",                   type: 'likert', options: agree5, subscale: 'cultural_conflict' },
    { id: 8,  text: "Je ressens de la culpabilité ou de la honte liée à des comportements que ma religion ou culture désapprouve",               type: 'likert', options: agree5, subscale: 'guilt_shame' },
    { id: 9,  text: "La peur du jugement religieux ou communautaire m'empêche parfois d'être honnête sur mes véritables sentiments",             type: 'likert', options: agree5, subscale: 'guilt_shame' },
    { id: 10, text: "Je me sens coupable de ne pas suivre parfaitement les prescriptions religieuses ou culturelles",                             type: 'likert', options: agree5, subscale: 'guilt_shame' },
    { id: 11, text: "Je consulte un guérisseur traditionnel, un marabout ou un religieux avant de chercher une aide médicale",                   type: 'likert', options: agree5, subscale: 'traditional_medicine' },
    { id: 12, text: "Je crois que certaines souffrances psychiques peuvent avoir des causes spirituelles ou surnaturelles",                      type: 'likert', options: agree5, subscale: 'traditional_medicine' },
    { id: 13, text: "Les pratiques ancestrales (cérémonies, rites de passage) ont un rôle important dans mon équilibre psychologique",           type: 'likert', options: agree5, subscale: 'traditional_medicine' },
    { id: 14, text: "Dans l'ensemble, ma religion et ma culture contribuent positivement à mon bien-être psychologique",                         type: 'likert', options: agree5, subscale: 'religious_support', reversed: true },
  ],
  subscales: [
    { key: 'religious_support',   label: "Soutien religieux / culturel",       itemIds: [1,2,3,14],  reverseIds: [1,2,3,14], range: { min: 4, max: 20 } },
    { key: 'religious_influence',  label: "Influence religieuse sur les choix", itemIds: [4],         range: { min: 1, max: 5 } },
    { key: 'cultural_conflict',   label: "Conflit culturel",                   itemIds: [5,6,7],     range: { min: 3, max: 15 } },
    { key: 'guilt_shame',         label: "Culpabilité et honte",               itemIds: [8,9,10],    range: { min: 3, max: 15 } },
    { key: 'traditional_medicine', label: "Médecine traditionnelle",           itemIds: [11,12,13],  range: { min: 3, max: 15 } },
  ],
  interpretation: [
    { min: 14, max: 30, label: "Impact spirituel faible / intégration harmonieuse", severity: 'positive', description: "Religion et culture semblent apporter plus de soutien que de contrainte.", referralRequired: false, recommendation: "Continuez à puiser dans vos ressources spirituelles et culturelles." },
    { min: 31, max: 50, label: "Tensions culturelles modérées",                    severity: 'mild',     description: "Quelques conflits entre valeurs personnelles et culturelles / religieuses.", referralRequired: false, recommendation: "Explorer ces tensions avec un professionnel sensible aux enjeux culturels peut être utile." },
    { min: 51, max: 70, label: "Conflit culturel ou spirituel important",          severity: 'moderate', description: "Des tensions significatives entre vos valeurs personnelles et religieuses/culturelles.", referralRequired: false, recommendation: "Un accompagnement par un professionnel compétent en questions culturelles est recommandé." },
  ],
};

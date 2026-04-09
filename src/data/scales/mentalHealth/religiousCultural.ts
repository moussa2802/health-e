import type { AssessmentScale } from '../../../types/assessment';

const agree5 = [
  { value: 1, label: "Pas du tout" },
  { value: 2, label: "Un peu" },
  { value: 3, label: "Moyennement" },
  { value: 4, label: "Beaucoup" },
  { value: 5, label: "Totalement" },
];

export const RELIGIOUS_CULTURAL: AssessmentScale = {
  id: 'religious_cultural',
  name: "Impact Religieux et Culturel sur la Psyché",
  shortName: "Religion & Culture",
  category: 'mental_health',
  description: "Évalue l'influence des croyances religieuses et des valeurs culturelles sur le profil psychologique et les décisions de vie.",
  instructions: "Ces questions portent sur la place de ta foi et de ta culture dans ta vie. Pas de jugement ici — on veut juste comprendre ton vécu 🤲",
  timeEstimateMinutes: 6,
  reference: "Questionnaire Healt-e (2026). Inspiré des travaux de l'École de Psychiatrie de Fann, Dakar, Sénégal.",
  licenseNote: "Questionnaire original Healt-e. Tous droits réservés.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 14, max: 70 },
  items: [
    { id: 1,  text: "Ta foi t'aide à tenir le coup quand la vie devient difficile ?",                                                                 type: 'likert', options: agree5, subscale: 'religious_support', reversed: true },
    { id: 2,  text: "La prière ou la méditation t'apporte un vrai sentiment de paix intérieure ?",                                                    type: 'likert', options: agree5, subscale: 'religious_support', reversed: true },
    { id: 3,  text: "Ta communauté religieuse est un vrai pilier de soutien pour toi ?",                                                              type: 'likert', options: agree5, subscale: 'religious_support', reversed: true },
    { id: 4,  text: "Tes croyances religieuses influencent fortement tes choix de vie — mariage, carrière, comportements au quotidien ?",              type: 'likert', options: agree5, subscale: 'religious_influence' },
    { id: 5,  text: "Il t'arrive de sentir un tiraillement entre ce que ta religion enseigne et ce que tu veux ou ressens vraiment ?",                 type: 'likert', options: agree5, subscale: 'cultural_conflict' },
    { id: 6,  text: "Tu te sens {{partagé|partagée}} entre les valeurs de ta culture d'origine et les valeurs plus modernes ou occidentales ?",                 type: 'likert', options: agree5, subscale: 'cultural_conflict' },
    { id: 7,  text: "Il t'arrive de te sentir {{incompris|incomprise}} par ta famille ou ta communauté à cause de tes idées ou de ta façon de vivre ?",           type: 'likert', options: agree5, subscale: 'cultural_conflict' },
    { id: 8,  text: "Tu ressens de la culpabilité ou de la honte par rapport à des choses que ta religion ou ta culture désapprouve ?",                type: 'likert', options: agree5, subscale: 'guilt_shame' },
    { id: 9,  text: "La peur du jugement religieux ou communautaire t'empêche parfois d'être honnête sur ce que tu ressens vraiment ?",                type: 'likert', options: agree5, subscale: 'guilt_shame' },
    { id: 10, text: "Tu te sens coupable de ne pas suivre parfaitement les prescriptions de ta religion ou de ta culture ?",                           type: 'likert', options: agree5, subscale: 'guilt_shame' },
    { id: 11, text: "Quand tu ne vas pas bien, ton premier réflexe c'est d'aller voir un marabout, guérisseur ou guide religieux avant d'aller chez le médecin ?", type: 'likert', options: agree5, subscale: 'traditional_medicine' },
    { id: 12, text: "Tu crois que certaines souffrances psychiques peuvent avoir des causes spirituelles ou surnaturelles ?",                          type: 'likert', options: agree5, subscale: 'traditional_medicine' },
    { id: 13, text: "Les pratiques ancestrales — cérémonies, rites de passage — jouent un rôle important dans ton équilibre intérieur ?",              type: 'likert', options: agree5, subscale: 'traditional_medicine' },
    { id: 14, text: "Dans l'ensemble, ta religion et ta culture contribuent positivement à ton bien-être psychologique ?",                             type: 'likert', options: agree5, subscale: 'religious_support', reversed: true },
  ],
  subscales: [
    { key: 'religious_support',   label: "Soutien religieux / culturel",       itemIds: [1,2,3,14],  reverseIds: [1,2,3,14], range: { min: 4, max: 20 } },
    { key: 'religious_influence',  label: "Influence religieuse sur les choix", itemIds: [4],         range: { min: 1, max: 5 } },
    { key: 'cultural_conflict',   label: "Conflit culturel",                   itemIds: [5,6,7],     range: { min: 3, max: 15 } },
    { key: 'guilt_shame',         label: "Culpabilité et honte",               itemIds: [8,9,10],    range: { min: 3, max: 15 } },
    { key: 'traditional_medicine', label: "Médecine traditionnelle",           itemIds: [11,12,13],  range: { min: 3, max: 15 } },
  ],
  interpretation: [
    { min: 14, max: 30, label: "Impact spirituel faible / intégration harmonieuse", severity: 'positive', description: "Ta foi et ta culture semblent t'apporter plus de force que de contrainte — c'est un bel équilibre.", referralRequired: false, recommendation: "Continue à puiser dans tes ressources spirituelles et culturelles, elles te font du bien 🤲" },
    { min: 31, max: 50, label: "Tensions culturelles modérées",                    severity: 'mild',     description: "Il y a des moments où tu sens un décalage entre tes valeurs personnelles et ce que ta religion ou ta culture attend de toi.", referralRequired: false, recommendation: "Explorer ces tensions avec quelqu'un qui comprend les enjeux culturels peut t'aider à y voir plus clair. Tu n'es pas {{le seul|la seule}} à vivre ça." },
    { min: 51, max: 70, label: "Conflit culturel ou spirituel important",          severity: 'moderate', description: "Tu vis des tensions profondes entre ce que tu ressens et ce que ta foi ou ta culture te demande. Ça peut peser lourd.", referralRequired: false, recommendation: "Un accompagnement avec un professionnel sensible à ces questions culturelles et spirituelles pourrait vraiment t'aider à trouver ton chemin 🌿" },
  ],
};

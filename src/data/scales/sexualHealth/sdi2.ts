import type { AssessmentScale } from '../../../types/assessment';

const freqOpts = [
  { value: 0, label: "Jamais" },
  { value: 2, label: "Rarement" },
  { value: 4, label: "Parfois" },
  { value: 6, label: "Souvent" },
  { value: 8, label: "Très souvent" },
];

const intensOpts = [
  { value: 1, label: "Très faible" },
  { value: 3, label: "Faible" },
  { value: 5, label: "Modérée" },
  { value: 7, label: "Forte" },
  { value: 9, label: "Très forte" },
];

export const SDI2: AssessmentScale = {
  id: 'sdi2',
  name: "Désir Sexuel",
  shortName: "SDI-2",
  category: 'sexual_health',
  description: "Évalue le désir sexuel selon deux dimensions : le désir envers un partenaire et le désir sexuel personnel.",
  instructions: "Les questions suivantes portent sur votre désir sexuel au cours des dernier mois.",
  timeEstimateMinutes: 6,
  reference: "Spector, I.P., Carey, M.P., & Steinberg, L. (1996). The Sexual Desire Inventory. Journal of Sex & Marital Therapy, 22(3), 175–190.",
  licenseNote: "Libre pour usage clinique et de recherche.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 112 },
  items: [
    { id: 1,  text: "À quelle fréquence avez-vous ressenti du désir sexuel envers votre partenaire ou une personne attirante ?", type: 'likert', options: freqOpts, subscale: 'dyadic' },
    { id: 2,  text: "Quelle est l'intensité de votre désir d'avoir des activités sexuelles avec un partenaire ?",               type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 3,  text: "À quel point souhaitez-vous initier une activité sexuelle avec votre partenaire ?",                       type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 4,  text: "À quel point seriez-vous réceptif(ve) si votre partenaire initiait une activité sexuelle ?",              type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 5,  text: "Combien de fois par semaine aimeriez-vous idéalement avoir des rapports sexuels avec un partenaire ?",    type: 'likert', options: [{ value: 0, label: "Jamais" }, { value: 2, label: "Moins d'une fois" }, { value: 4, label: "1 à 2 fois" }, { value: 6, label: "3 à 4 fois" }, { value: 8, label: "5 fois ou plus" }], subscale: 'dyadic' },
    { id: 6,  text: "Comment évaluez-vous votre niveau de désir sexuel actuel envers un partenaire ?",                        type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 7,  text: "À quelle fréquence avez-vous des pensées ou fantasmes sexuels impliquant un partenaire ?",               type: 'likert', options: freqOpts, subscale: 'dyadic' },
    { id: 8,  text: "À quel point êtes-vous attiré(e) sexuellement par votre partenaire en ce moment ?",                     type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 9,  text: "À quel point votre désir pour votre partenaire affecte-t-il votre humeur générale ?",                   type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 10, text: "À quelle fréquence ressentez-vous du désir sexuel de façon générale ?",                                  type: 'likert', options: freqOpts, subscale: 'solitary' },
    { id: 11, text: "À quelle fréquence avez-vous des fantasmes sexuels ?",                                                   type: 'likert', options: freqOpts, subscale: 'solitary' },
    { id: 12, text: "À quel point votre désir sexuel personnel est-il fort ?",                                                type: 'likert', options: intensOpts, subscale: 'solitary' },
    { id: 13, text: "À quelle fréquence avez-vous des pensées sexuelles spontanées ?",                                        type: 'likert', options: freqOpts, subscale: 'solitary' },
    { id: 14, text: "À quel point êtes-vous préoccupé(e) par des pensées ou des besoins sexuels ?",                         type: 'likert', options: intensOpts, subscale: 'solitary' },
  ],
  subscales: [
    { key: 'dyadic',    label: "Désir dyadique (envers un partenaire)", itemIds: [1,2,3,4,5,6,7,8,9],  range: { min: 0, max: 72 } },
    { key: 'solitary',  label: "Désir solitaire (personnel)",           itemIds: [10,11,12,13,14],      range: { min: 0, max: 40 } },
  ],
  interpretation: [
    { min: 0,  max: 30,  label: "Désir sexuel faible",      severity: 'mild',     description: "Niveau de désir sexuel faible, pouvant nécessiter exploration.", referralRequired: false, recommendation: "Un faible désir peut avoir de nombreuses causes. Consulter un professionnel peut vous aider." },
    { min: 31, max: 60,  label: "Désir sexuel modéré",      severity: 'minimal',  description: "Niveau de désir sexuel dans la moyenne.", referralRequired: false, recommendation: "Continuer à explorer ce qui stimule votre désir dans un cadre sécurisant." },
    { min: 61, max: 90,  label: "Désir sexuel élevé",       severity: 'positive', description: "Bon niveau de désir sexuel.", referralRequired: false, recommendation: "Channeler ce désir dans des expériences enrichissantes et respectueuses." },
    { min: 91, max: 112, label: "Désir sexuel très élevé",  severity: 'positive', description: "Désir sexuel très élevé.", referralRequired: false, recommendation: "S'assurer que ce désir s'exprime dans des contextes sains et consentis." },
  ],
};

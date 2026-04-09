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
  description: "Évalue ton désir sexuel selon deux dimensions : le désir envers {{un|une}} partenaire et le désir sexuel personnel.",
  instructions: "Ces questions portent sur ton désir sexuel ces derniers mois — à la fois envers {{un|une}} partenaire et de façon générale. Réponds selon ton vécu réel 💫",
  timeEstimateMinutes: 6,
  reference: "Spector, I.P., Carey, M.P., & Steinberg, L. (1996). The Sexual Desire Inventory. Journal of Sex & Marital Therapy, 22(3), 175–190.",
  licenseNote: "Libre pour usage clinique et de recherche.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 112 },
  items: [
    { id: 1,  text: "Ces derniers temps, à quelle fréquence as-tu ressenti du désir sexuel — envers ton/ta partenaire ou quelqu'un d'attirant ?", type: 'likert', options: freqOpts, subscale: 'dyadic' },
    { id: 2,  text: "L'envie d'avoir des activités sexuelles avec quelqu'un — elle est forte comment en ce moment ?",               type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 3,  text: "À quel point tu as envie de prendre l'initiative sexuellement avec ton/ta partenaire ?",                       type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 4,  text: "Si ton/ta partenaire prenait l'initiative d'un rapport sexuel, tu serais plutôt {{réceptif|réceptive}} ?",              type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 5,  text: "Dans l'idéal, combien de fois par semaine tu aimerais avoir des rapports sexuels ?",    type: 'likert', options: [{ value: 0, label: "Jamais" }, { value: 2, label: "Moins d'une fois" }, { value: 4, label: "1 à 2 fois" }, { value: 6, label: "3 à 4 fois" }, { value: 8, label: "5 fois ou plus" }], subscale: 'dyadic' },
    { id: 6,  text: "Ton niveau de désir sexuel envers {{un|une}} partenaire en ce moment — tu le situes où ?",                        type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 7,  text: "À quelle fréquence tu as des pensées ou fantasmes sexuels impliquant quelqu'un ?",               type: 'likert', options: freqOpts, subscale: 'dyadic' },
    { id: 8,  text: "À quel point tu es {{attiré|attirée}} sexuellement par ton/ta partenaire en ce moment ?",                     type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 9,  text: "Ton désir pour ton/ta partenaire, ça joue sur ton humeur au quotidien ?",                   type: 'likert', options: intensOpts, subscale: 'dyadic' },
    { id: 10, text: "De façon générale, à quelle fréquence tu ressens du désir sexuel ?",                                  type: 'likert', options: freqOpts, subscale: 'solitary' },
    { id: 11, text: "À quelle fréquence tu as des fantasmes sexuels ?",                                                   type: 'likert', options: freqOpts, subscale: 'solitary' },
    { id: 12, text: "Ton désir sexuel personnel — il est fort comment ces temps-ci ?",                                                type: 'likert', options: intensOpts, subscale: 'solitary' },
    { id: 13, text: "À quelle fréquence des pensées sexuelles te viennent spontanément ?",                                        type: 'likert', options: freqOpts, subscale: 'solitary' },
    { id: 14, text: "À quel point tes pensées ou besoins sexuels occupent ton esprit ?",                         type: 'likert', options: intensOpts, subscale: 'solitary' },
  ],
  subscales: [
    { key: 'dyadic',    label: "Désir dyadique (envers un partenaire)", itemIds: [1,2,3,4,5,6,7,8,9],  range: { min: 0, max: 72 } },
    { key: 'solitary',  label: "Désir solitaire (personnel)",           itemIds: [10,11,12,13,14],      range: { min: 0, max: 40 } },
  ],
  interpretation: [
    { min: 0,  max: 30,  label: "Désir sexuel faible",      severity: 'mild',     description: "Ton niveau de désir est bas ces derniers temps. Ça peut venir de plein de choses — stress, fatigue, hormones, relation. Ce n'est pas un jugement sur toi.", referralRequired: false, recommendation: "Un désir en berne, ça se comprend et ça se travaille. En parler avec un pro (sexologue, médecin) peut t'aider à y voir plus clair." },
    { min: 31, max: 60,  label: "Désir sexuel modéré",      severity: 'minimal',  description: "Ton désir sexuel est dans la moyenne — il est là, à son rythme.", referralRequired: false, recommendation: "Continue à explorer ce qui allume ta flamme dans un cadre qui te convient et te sécurise." },
    { min: 61, max: 90,  label: "Désir sexuel élevé",       severity: 'positive', description: "Tu as un bon niveau de désir sexuel — la flamme est bien là !", referralRequired: false, recommendation: "Canaliser ce désir dans des expériences enrichissantes et respectueuses, c'est la meilleure façon d'en profiter." },
    { min: 91, max: 112, label: "Désir sexuel très élevé",  severity: 'positive', description: "Ton désir sexuel est très élevé — tu as une énergie sexuelle puissante.", referralRequired: false, recommendation: "Assure-toi que ce désir s'exprime dans des contextes sains, consentis et qui te font du bien." },
  ],
};

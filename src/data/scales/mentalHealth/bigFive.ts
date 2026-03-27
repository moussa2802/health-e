import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 1, label: "Pas du tout d'accord" },
  { value: 2, label: "Plutôt pas d'accord" },
  { value: 3, label: "Neutre" },
  { value: 4, label: "Plutôt d'accord" },
  { value: 5, label: "Tout à fait d'accord" },
];

export const BIG_FIVE: AssessmentScale = {
  id: 'big_five',
  name: "Les Cinq Grands Traits de Personnalité",
  shortName: "Big Five",
  category: 'mental_health',
  description: "Évalue les cinq grandes dimensions de la personnalité : Ouverture, Conscienciosité, Extraversion, Agréabilité et Névrosisme.",
  instructions: "Indiquez dans quelle mesure vous êtes d'accord avec chacune des affirmations suivantes. Il n'y a pas de bonne ou mauvaise réponse.",
  timeEstimateMinutes: 5,
  reference: "Rammstedt, B. & John, O.P. (2007). Measuring personality in one minute or less. Journal of Research in Personality, 41, 203–212.",
  licenseNote: "BFI-10. Domaine public pour usage de recherche et clinique.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 10, max: 50 },
  reverseIds: [2, 4, 6, 8, 10],
  items: [
    { id: 1,  text: "Je me vois comme quelqu'un d'extraverti(e), plein(e) d'entrain",            type: 'likert', options: opts, subscale: 'extraversion' },
    { id: 2,  text: "Je me vois comme quelqu'un qui a tendance à critiquer les autres",           type: 'likert', options: opts, subscale: 'agreeableness', reversed: true },
    { id: 3,  text: "Je me vois comme quelqu'un de fiable, qui travaille avec sérieux",           type: 'likert', options: opts, subscale: 'conscientiousness' },
    { id: 4,  text: "Je me vois comme quelqu'un d'anxieux, qui se fait facilement du souci",     type: 'likert', options: opts, subscale: 'neuroticism', reversed: true },
    { id: 5,  text: "Je me vois comme quelqu'un d'ouvert d'esprit, avec de nombreux intérêts",   type: 'likert', options: opts, subscale: 'openness' },
    { id: 6,  text: "Je me vois comme quelqu'un de réservé(e), discret(ète)",                    type: 'likert', options: opts, subscale: 'extraversion', reversed: true },
    { id: 7,  text: "Je me vois comme quelqu'un de serviable, qui pense aux autres",             type: 'likert', options: opts, subscale: 'agreeableness' },
    { id: 8,  text: "Je me vois comme quelqu'un parfois négligent(e)",                           type: 'likert', options: opts, subscale: 'conscientiousness', reversed: true },
    { id: 9,  text: "Je me vois comme quelqu'un de calme, émotionnellement stable",              type: 'likert', options: opts, subscale: 'neuroticism' },
    { id: 10, text: "Je me vois comme quelqu'un qui manque d'imagination et de créativité",      type: 'likert', options: opts, subscale: 'openness', reversed: true },
  ],
  subscales: [
    { key: 'extraversion',      label: "Extraversion",      itemIds: [1, 6], reverseIds: [6], range: { min: 2, max: 10 } },
    { key: 'agreeableness',     label: "Agréabilité",       itemIds: [2, 7], reverseIds: [2], range: { min: 2, max: 10 } },
    { key: 'conscientiousness', label: "Conscienciosité",   itemIds: [3, 8], reverseIds: [8], range: { min: 2, max: 10 } },
    { key: 'neuroticism',       label: "Névrosisme",        itemIds: [4, 9], reverseIds: [9], range: { min: 2, max: 10 } },
    { key: 'openness',          label: "Ouverture",         itemIds: [5, 10], reverseIds: [10], range: { min: 2, max: 10 } },
  ],
  interpretation: [
    { min: 10, max: 25, label: "Profil introverti / instable", severity: 'mild',    description: "Tendance à l'introversion et/ou à une certaine instabilité émotionnelle.", referralRequired: false, recommendation: "Connaissance de soi utile pour mieux gérer vos relations." },
    { min: 26, max: 38, label: "Profil équilibré",             severity: 'minimal', description: "Personnalité équilibrée avec des forces dans plusieurs dimensions.", referralRequired: false, recommendation: "Continuez à développer vos points forts." },
    { min: 39, max: 50, label: "Profil ouvert et stable",      severity: 'positive', description: "Forte ouverture, stabilité émotionnelle et orientation vers les autres.", referralRequired: false, recommendation: "Votre profil est un atout dans vos relations personnelles et professionnelles." },
  ],
};

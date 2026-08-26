import type { AssessmentScale } from '../../../types/assessment';

// BFI-10 : Big Five Inventory — 10 items
// Traduction française officielle GESIS (Rammstedt & John, 2007)
// Échelle 1-5, accord croissant
// Items inversés : 1, 7, 8, 9, 10

const opts = [
  { value: 1, label: "Pas du tout d'accord" },
  { value: 2, label: "Plutôt pas d'accord" },
  { value: 3, label: "Ni en accord ni en désaccord" },
  { value: 4, label: "Plutôt d'accord" },
  { value: 5, label: "Tout à fait d'accord" },
];

export const BIG_FIVE: AssessmentScale = {
  id: 'big_five',
  code: 'P3',
  name: "Les Cinq Grands Traits de Personnalité",
  shortName: "Big Five",
  category: 'mental_health',
  description: "Évalue les cinq grandes dimensions de la personnalité : Ouverture, Conscienciosité, Extraversion, Agréabilité et Stabilité émotionnelle.",
  instructions: "Je me vois comme quelqu'un qui…",
  timeEstimateMinutes: 5,
  reference: "Rammstedt, B. & John, O.P. (2007). Measuring personality in one minute or less. Journal of Research in Personality, 41, 203–212.",
  adaptationNote: "Traduction française officielle GESIS du BFI-10. Formulation verbatim conservée. Aucun changement de contenu ni d'ordre des items.",
  licenseNote: "BFI-10. Domaine public pour usage de recherche et clinique.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 10, max: 50 },
  reverseIds: [1, 7, 8, 9, 10],
  items: [
    { id: 1,  text: "…est réservé",                                                    type: 'likert', options: opts, subscale: 'extraversion', reversed: true },
    { id: 2,  text: "…fait généralement confiance aux autres",                          type: 'likert', options: opts, subscale: 'agreeableness' },
    { id: 3,  text: "…travaille consciencieusement",                                    type: 'likert', options: opts, subscale: 'conscientiousness' },
    { id: 4,  text: "…est « relaxe », détendu, gère bien le stress",                    type: 'likert', options: opts, subscale: 'emotional_stability' },
    { id: 5,  text: "…a une grande imagination",                                        type: 'likert', options: opts, subscale: 'openness' },
    { id: 6,  text: "…est sociable, extraverti",                                        type: 'likert', options: opts, subscale: 'extraversion' },
    { id: 7,  text: "…a tendance à critiquer les autres",                               type: 'likert', options: opts, subscale: 'agreeableness', reversed: true },
    { id: 8,  text: "…a tendance à être paresseux",                                     type: 'likert', options: opts, subscale: 'conscientiousness', reversed: true },
    { id: 9,  text: "…est facilement anxieux",                                          type: 'likert', options: opts, subscale: 'emotional_stability', reversed: true },
    { id: 10, text: "…est peu intéressé par tout ce qui est artistique",                 type: 'likert', options: opts, subscale: 'openness', reversed: true },
  ],
  subscales: [
    { key: 'extraversion',      label: "Extraversion",            itemIds: [1, 6], reverseIds: [1], range: { min: 2, max: 10 } },
    { key: 'agreeableness',     label: "Agréabilité",             itemIds: [2, 7], reverseIds: [7], range: { min: 2, max: 10 } },
    { key: 'conscientiousness', label: "Conscienciosité",         itemIds: [3, 8], reverseIds: [8], range: { min: 2, max: 10 } },
    { key: 'emotional_stability', label: "Stabilité émotionnelle",  itemIds: [4, 9], reverseIds: [9], range: { min: 2, max: 10 } },
    { key: 'openness',          label: "Ouverture",               itemIds: [5, 10], reverseIds: [10], range: { min: 2, max: 10 } },
  ],
  interpretation: [
    { min: 10, max: 25, label: "Profil discret et sensible", severity: 'mild',    description: "Tu as un côté plutôt introverti et tu ressens les choses intensément — ce n'est pas un défaut, c'est une forme de richesse intérieure. Mais ça peut parfois rendre le quotidien un peu plus lourd.", referralRequired: false, recommendation: "Mieux te connaître, c'est mieux te protéger. Prends le temps d'explorer ce qui te ressource et ce qui te coûte de l'énergie." },
    { min: 26, max: 38, label: "Profil équilibré",          severity: 'minimal', description: "Tu as un bel équilibre entre tes différentes facettes — tu sais t'adapter et tu as des forces dans plusieurs domaines. C'est une vraie base solide.", referralRequired: false, recommendation: "Continue à cultiver ce qui te fait du bien. Tu peux aussi explorer les dimensions où tu te sens moins à l'aise — il y a souvent du potentiel caché là-dedans." },
    { min: 39, max: 50, label: "Profil ouvert et stable",   severity: 'positive', description: "Tu es quelqu'un d'ouvert, stable émotionnellement et tourné(e) vers les autres. Ce genre de profil est un vrai atout dans la vie — personnelle comme professionnelle.", referralRequired: false, recommendation: "Ton profil est une force. N'hésite pas à t'en servir pour accompagner ou inspirer les gens autour de toi." },
  ],
};

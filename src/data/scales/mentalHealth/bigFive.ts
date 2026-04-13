import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 1, label: "Pas du tout moi", subtitle: "Je ne me reconnais pas du tout" },
  { value: 2, label: "Pas trop moi", subtitle: "Ça ne me ressemble pas vraiment" },
  { value: 3, label: "Plus ou moins", subtitle: "Ça dépend des situations" },
  { value: 4, label: "Plutôt moi", subtitle: "Ça me ressemble" },
  { value: 5, label: "Tout à fait moi", subtitle: "Je me reconnais complètement" },
];

export const BIG_FIVE: AssessmentScale = {
  id: 'big_five',
  name: "Les Cinq Grands Traits de Personnalité",
  shortName: "Big Five",
  category: 'mental_health',
  description: "Évalue les cinq grandes dimensions de la personnalité : Ouverture, Conscienciosité, Extraversion, Agréabilité et Névrosisme.",
  instructions: "Dis-moi comment tu te vois — pas comment tu voudrais être, mais comment tu es vraiment 🪞",
  timeEstimateMinutes: 5,
  reference: "Rammstedt, B. & John, O.P. (2007). Measuring personality in one minute or less. Journal of Research in Personality, 41, 203–212.",
  licenseNote: "BFI-10. Domaine public pour usage de recherche et clinique.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 10, max: 50 },
  reverseIds: [2, 4, 6, 8, 10],
  items: [
    { id: 1,  text: "Tu te vois plutôt comme quelqu'un d'{{extraverti|extravertie}}, {{plein|pleine}} d'énergie ?",                    type: 'likert', options: opts, subscale: 'extraversion' },
    { id: 2,  text: "Tu dirais que tu as parfois tendance à juger ou critiquer les autres ?",                      type: 'likert', options: opts, subscale: 'agreeableness' },
    { id: 3,  text: "Tu te considères comme quelqu'un de fiable, sur qui on peut compter ?",                       type: 'likert', options: opts, subscale: 'conscientiousness' },
    { id: 4,  text: "Tu dirais que tu es quelqu'un qui se fait facilement du souci, qui s'inquiète souvent ?",     type: 'likert', options: opts, subscale: 'neuroticism' },
    { id: 5,  text: "Tu te vois comme quelqu'un de curieux, {{ouvert|ouverte}} à plein de choses différentes ?",            type: 'likert', options: opts, subscale: 'openness' },
    { id: 6,  text: "Tu dirais que tu es plutôt {{réservé|réservée}}, quelqu'un qui reste dans son coin ?",                  type: 'likert', options: opts, subscale: 'extraversion' },
    { id: 7,  text: "Tu te vois comme quelqu'un de serviable, qui fait attention aux autres ?",                    type: 'likert', options: opts, subscale: 'agreeableness' },
    { id: 8,  text: "Il t'arrive d'être un peu {{négligent|négligente}} ou de laisser traîner les choses ?",                   type: 'likert', options: opts, subscale: 'conscientiousness' },
    { id: 9,  text: "Tu te vois comme quelqu'un de calme, qui gère bien ses émotions ?",                           type: 'likert', options: opts, subscale: 'neuroticism' },
    { id: 10, text: "Tu dirais que l'imagination et la créativité, ce n'est pas trop ton truc ?",                  type: 'likert', options: opts, subscale: 'openness' },
  ],
  subscales: [
    { key: 'extraversion',      label: "Extraversion",      itemIds: [1, 6], reverseIds: [6], range: { min: 2, max: 10 } },
    { key: 'agreeableness',     label: "Agréabilité",       itemIds: [2, 7], reverseIds: [2], range: { min: 2, max: 10 } },
    { key: 'conscientiousness', label: "Conscienciosité",   itemIds: [3, 8], reverseIds: [8], range: { min: 2, max: 10 } },
    { key: 'neuroticism',       label: "Névrosisme",        itemIds: [4, 9], reverseIds: [9], range: { min: 2, max: 10 } },
    { key: 'openness',          label: "Ouverture",         itemIds: [5, 10], reverseIds: [10], range: { min: 2, max: 10 } },
  ],
  interpretation: [
    { min: 10, max: 25, label: "Profil discret et sensible", severity: 'mild',    description: "Tu as un côté plutôt introverti et tu ressens les choses intensément — ce n'est pas un défaut, c'est une forme de richesse intérieure. Mais ça peut parfois rendre le quotidien un peu plus lourd.", referralRequired: false, recommendation: "Mieux te connaître, c'est mieux te protéger. Prends le temps d'explorer ce qui te ressource et ce qui te coûte de l'énergie 💡" },
    { min: 26, max: 38, label: "Profil équilibré",          severity: 'minimal', description: "Tu as un bel équilibre entre tes différentes facettes — tu sais t'adapter et tu as des forces dans plusieurs domaines. C'est une vraie base solide.", referralRequired: false, recommendation: "Continue à cultiver ce qui te fait du bien. Tu peux aussi explorer les dimensions où tu te sens moins à l'aise — il y a souvent du potentiel caché là-dedans ✨" },
    { min: 39, max: 50, label: "Profil ouvert et stable",   severity: 'positive', description: "Tu es quelqu'un d'ouvert, stable émotionnellement et {{tourné|tournée}} vers les autres. Ce genre de profil est un vrai atout dans la vie — personnelle comme professionnelle.", referralRequired: false, recommendation: "Ton profil est une force. N'hésite pas à t'en servir pour accompagner ou inspirer les gens autour de toi 🌱" },
  ],
};

import type { AssessmentScale } from '../../../types/assessment';

// BRS : Brief Resilience Scale (Smith et al., 2008)
// 6 items, échelle 1-5
// Items 2, 4, 6 inversés (formulés négativement)
// Score : MOYENNE (somme / 6), plage 1–5
// Seuils : 1–2.99 faible | 3–4.30 normale | 4.31–5 élevée

const opts = [
  { value: 1, label: "Pas du tout d'accord" },
  { value: 2, label: "Plutôt pas d'accord" },
  { value: 3, label: "Neutre" },
  { value: 4, label: "Plutôt d'accord" },
  { value: 5, label: "Tout à fait d'accord" },
];

export const BRS: AssessmentScale = {
  id: 'brs',
  name: "Résilience Brève",
  shortName: "BRS",
  category: 'mental_health',
  description: "Mesure la capacité à rebondir après le stress et les difficultés.",
  instructions: "Indiquez dans quelle mesure vous êtes d'accord avec chacune des affirmations suivantes.",
  timeEstimateMinutes: 2,
  reference: "Smith, B.W., et al. (2008). The brief resilience scale. International Journal of Behavioral Medicine, 15(3), 194–200.",
  licenseNote: "Libre pour usage clinique et de recherche.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 1, max: 5 },  // score = moyenne
  scoringMode: 'mean',
  // reverseIds utilisé pour le totalScore (= la moyenne calculée sur toutes items après inversions)
  reverseIds: [2, 4, 6],
  items: [
    { id: 1, text: "J'arrive à rebondir rapidement après des moments difficiles",                  type: 'likert', options: opts },
    { id: 2, text: "J'ai du mal à surmonter les événements difficiles",                            type: 'likert', options: opts, reversed: true },
    { id: 3, text: "Je me remets assez vite après des épreuves ou des maladies",                   type: 'likert', options: opts },
    { id: 4, text: "Il m'est difficile de récupérer quand quelque chose de grave m'arrive",        type: 'likert', options: opts, reversed: true },
    { id: 5, text: "Je suis généralement capable de passer à travers les périodes difficiles",     type: 'likert', options: opts },
    { id: 6, text: "Je mets beaucoup de temps à me remettre d'un contretemps",                    type: 'likert', options: opts, reversed: true },
  ],
  interpretation: [
    {
      min: 1, max: 2.99,
      label: "Résilience faible",
      severity: 'moderate',
      alertLevel: 1,
      description: "Difficulté à récupérer des situations stressantes. Cette vulnérabilité peut impacter votre bien-être émotionnel.",
      referralRequired: false,
      recommendation: "Des techniques de gestion du stress, un soutien social renforcé et éventuellement un accompagnement professionnel peuvent renforcer votre résilience."
    },
    {
      min: 3, max: 4.30,
      label: "Résilience normale",
      severity: 'minimal',
      description: "Capacité de récupération dans la moyenne. Vous faites généralement face aux défis de manière satisfaisante.",
      referralRequired: false,
      recommendation: "Continuez à développer vos stratégies d'adaptation et cultivez votre réseau de soutien."
    },
    {
      min: 4.31, max: 5,
      label: "Résilience élevée",
      severity: 'positive',
      description: "Grande capacité à rebondir face aux adversités. Ressource psychologique précieuse.",
      referralRequired: false,
      recommendation: "Votre résilience est un atout remarquable. Vous pouvez aussi soutenir les autres dans leur développement."
    },
  ],
};

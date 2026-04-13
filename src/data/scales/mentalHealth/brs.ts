import type { AssessmentScale } from '../../../types/assessment';

// BRS : Brief Resilience Scale (Smith et al., 2008)
// 6 items, échelle 1-5
// Items 2, 4, 6 inversés (formulés négativement)
// Score : MOYENNE (somme / 6), plage 1–5
// Seuils : 1–2.99 faible | 3–4.30 normale | 4.31–5 élevée

const opts = [
  { value: 1, label: "Pas du tout", subtitle: "Non, c'est très difficile" },
  { value: 2, label: "Pas vraiment", subtitle: "J'ai souvent du mal" },
  { value: 3, label: "Plus ou moins", subtitle: "Ça dépend" },
  { value: 4, label: "Plutôt oui", subtitle: "La plupart du temps" },
  { value: 5, label: "Tout à fait", subtitle: "Oui, sans problème" },
];

export const BRS: AssessmentScale = {
  id: 'brs',
  name: "Résilience Brève",
  shortName: "BRS",
  category: 'mental_health',
  description: "Mesure la capacité à rebondir après le stress et les difficultés.",
  instructions: "Ces questions portent sur ta façon de réagir face aux épreuves de la vie. Réponds spontanément 💪",
  timeEstimateMinutes: 2,
  reference: "Smith, B.W., et al. (2008). The brief resilience scale. International Journal of Behavioral Medicine, 15(3), 194–200.",
  licenseNote: "Libre pour usage clinique et de recherche.",
  warningMessage: "Ces résultats sont un premier éclairage, pas un diagnostic — si tu ressens le besoin d'en parler, un professionnel de santé sera toujours le meilleur allié 🤝",
  scoreRange: { min: 1, max: 5 },  // score = moyenne
  scoringMode: 'mean',
  // reverseIds utilisé pour le totalScore (= la moyenne calculée sur toutes items après inversions)
  reverseIds: [2, 4, 6],
  items: [
    { id: 1, text: "Quand tu traverses un moment difficile, tu arrives à rebondir assez vite ?",                    type: 'likert', options: opts },
    { id: 2, text: "Quand quelque chose de dur t'arrive, tu as du mal à t'en remettre ?",                           type: 'likert', options: opts },
    { id: 3, text: "Après une épreuve ou une maladie, tu te remets sur pied plutôt rapidement ?",                   type: 'likert', options: opts },
    { id: 4, text: "Quand un coup dur te tombe dessus, tu as du mal à récupérer ?",                                 type: 'likert', options: opts },
    { id: 5, text: "En général, tu arrives à traverser les périodes difficiles sans trop couler ?",                  type: 'likert', options: opts },
    { id: 6, text: "Après un contretemps, tu mets beaucoup de temps avant de remonter la pente ?",                  type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 1, max: 2.99,
      label: "Ta résilience est fragile en ce moment",
      severity: 'moderate',
      alertLevel: 1,
      description: "Les coups durs te touchent fort et tu as du mal à remonter la pente — c'est comme encaisser vague après vague sans avoir le temps de reprendre ton souffle 🌊",
      referralRequired: false,
      recommendation: "C'est pas une fatalité : apprendre des techniques de gestion du stress, s'appuyer sur des proches de confiance, ou échanger avec un professionnel peut vraiment t'aider à renforcer ta capacité à rebondir."
    },
    {
      min: 3, max: 4.30,
      label: "Ta résilience est dans la moyenne",
      severity: 'minimal',
      description: "Tu arrives globalement à encaisser les difficultés et à te relever — tu plies mais tu ne casses pas, et c'est déjà beaucoup 🌱",
      referralRequired: false,
      recommendation: "Continue à cultiver ce qui te fait du bien : tes stratégies marchent. Tu peux aussi renforcer ton réseau de soutien pour les jours où c'est plus compliqué."
    },
    {
      min: 4.31, max: 5,
      label: "Ta résilience est solide 💪",
      severity: 'positive',
      description: "Tu as une vraie capacité à rebondir face aux galères — c'est une force précieuse, comme un ressort intérieur qui ne lâche pas.",
      referralRequired: false,
      recommendation: "Belle ressource ! Tu peux aussi la mettre au service des autres en les soutenant dans leurs moments difficiles — ta solidité peut inspirer."
    },
  ],
};

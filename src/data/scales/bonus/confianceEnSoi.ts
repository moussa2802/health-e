import type { AssessmentScale } from '../../../types/assessment';

// GSE + items Confiance en soi : General Self-Efficacy Scale (Schwarzer & Jerusalem, 1995)
// 10 items GSE + 5 items confiance spécifiques — Likert 1-4 → adapté 0-3
// Score total : 0-45  |  Seuils : 0-15 faible / 16-28 modérée / 29-38 bonne / 39-45 très haute

const opts = [
  { value: 0, label: 'Pas du tout vrai' },
  { value: 1, label: 'À peine vrai' },
  { value: 2, label: 'Plutôt vrai' },
  { value: 3, label: 'Tout à fait vrai' },
];

export const BONUS_CONFIANCE: AssessmentScale = {
  id: 'bonus_confiance',
  name: 'Confiance en soi globale',
  shortName: 'GSE + Confiance',
  category: 'bonus',
  description: 'Mesure ta confiance en tes capacités à faire face aux défis, à te respecter et à t\'affirmer dans ta vie.',
  instructions: 'Ces affirmations portent sur la façon dont tu te vois et dont tu fais face aux défis. Indique dans quelle mesure chacune est vraie pour toi.',
  timeEstimateMinutes: 5,
  reference: 'Schwarzer, R., & Jerusalem, M. (1995). Generalized Self-Efficacy scale. Measures in health psychology: A user\'s portfolio.',
  licenseNote: 'GSE © Ralf Schwarzer & Matthias Jerusalem, 1995. Adaptation française à usage d\'évaluation personnelle.',
  warningMessage: 'La confiance en soi est un trait qui évolue avec le temps, les expériences et l\'accompagnement.',
  scoreRange: { min: 0, max: 45 },
  items: [
    { id: 1,  text: 'Je peux toujours résoudre des problèmes difficiles si j\'y mets les efforts nécessaires.', type: 'likert', options: opts },
    { id: 2,  text: 'Même si quelqu\'un s\'y oppose, je trouve les moyens d\'obtenir ce que je veux ou ce dont j\'ai besoin.', type: 'likert', options: opts },
    { id: 3,  text: 'Il m\'est facile de tenir à mes projets et d\'atteindre mes objectifs.', type: 'likert', options: opts },
    { id: 4,  text: 'Je suis confiant(e) dans ma capacité à gérer efficacement des événements imprévus.', type: 'likert', options: opts },
    { id: 5,  text: 'Grâce à mes ressources personnelles, je sais comment gérer les situations difficiles.', type: 'likert', options: opts },
    { id: 6,  text: 'Je peux résoudre la plupart des problèmes si j\'investis les efforts nécessaires.', type: 'likert', options: opts },
    { id: 7,  text: 'Je reste calme face aux difficultés car je fais confiance à ma capacité à y faire face.', type: 'likert', options: opts },
    { id: 8,  text: 'Quand je suis face à un problème difficile, je suis capable de trouver plusieurs solutions possibles.', type: 'likert', options: opts },
    { id: 9,  text: 'Si je suis en difficulté, je peux généralement trouver une façon de m\'en sortir.', type: 'likert', options: opts },
    { id: 10, text: 'Quoiqu\'il arrive, je suis généralement capable de m\'adapter à la situation.', type: 'likert', options: opts },
    { id: 11, text: 'Je me sens à l\'aise pour exprimer mon opinion, même en désaccord avec la majorité.', type: 'likert', options: opts },
    { id: 12, text: 'Je crois sincèrement en ma valeur propre — indépendamment des avis des autres.', type: 'likert', options: opts },
    { id: 13, text: 'Je n\'ai pas besoin de l\'approbation constante des autres pour me sentir bien.', type: 'likert', options: opts },
    { id: 14, text: 'Je suis à l\'aise pour dire non quand quelque chose ne me convient pas.', type: 'likert', options: opts },
    { id: 15, text: 'Je me respecte — mes besoins, mes limites et mes valeurs.', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 15,
      label: 'Faible confiance en soi',
      severity: 'moderate',
      description: 'Tu te fais peu confiance dans ta capacité à faire face aux défis. Les situations difficiles peuvent te sembler très déstabilisantes.',
      referralRequired: false,
      recommendation: 'Travailler la confiance en soi est possible — avec du coaching, un suivi psychologique ou des pratiques régulières d\'auto-affirmation.',
    },
    {
      min: 16, max: 28,
      label: 'Confiance en soi modérée',
      severity: 'mild',
      description: 'Tu as une confiance en toi variable — solide dans certains domaines, fragile dans d\'autres. Tu te remets en question parfois plus que nécessaire.',
      referralRequired: false,
      recommendation: 'Identifier les domaines où tu te fais déjà confiance peut t\'aider à renforcer les zones plus fragiles progressivement.',
    },
    {
      min: 29, max: 38,
      label: 'Bonne confiance en soi',
      severity: 'minimal',
      description: 'Tu as une bonne confiance en tes capacités. Tu fais face aux défis avec sérénité et tu sais trouver des ressources face aux obstacles.',
      referralRequired: false,
      recommendation: 'Continue à t\'affirmer et à te faire confiance. Ta résilience est une vraie force.',
    },
    {
      min: 39, max: 45,
      label: 'Très haute confiance en soi',
      severity: 'positive',
      description: 'Tu as une confiance en toi très développée. Tu te fais confiance, tu t\'affirmes naturellement et tu gères les imprévus avec calme.',
      referralRequired: false,
      recommendation: 'Veille à maintenir cette confiance dans le respect des autres et à rester ouvert(e) à la remise en question constructive.',
    },
  ],
};

import type { AssessmentScale } from '../../../types/assessment';

// GSE + items Confiance en soi : General Self-Efficacy Scale (Schwarzer & Jerusalem, 1995)
// 10 items GSE + 5 items confiance spécifiques — Likert 1-4 → adapté 0-3
// Score total : 0-45  |  Seuils : 0-15 faible / 16-28 modérée / 29-38 bonne / 39-45 très haute

const opts = [
  { value: 0, label: 'Pas du tout', subtitle: "Ce n'est vraiment pas mon cas" },
  { value: 1, label: 'Un peu', subtitle: "Ça m'arrive mais c'est rare" },
  { value: 2, label: 'Plutôt oui', subtitle: "Je m'en sens assez capable" },
  { value: 3, label: 'Tout à fait', subtitle: "C'est clairement une force chez moi" },
];

export const BONUS_CONFIANCE: AssessmentScale = {
  id: 'bonus_confiance',
  name: 'Confiance en soi globale',
  shortName: 'GSE + Confiance',
  category: 'bonus',
  description: 'Mesure ta confiance en tes capacités à faire face aux défis, à te respecter et à t\'affirmer dans ta vie.',
  instructions: 'Ces questions portent sur ta confiance en toi — ta capacité à faire face aux défis et à t\'affirmer. Réponds selon comment tu es vraiment, pas comment tu voudrais être 💪',
  timeEstimateMinutes: 5,
  reference: 'Schwarzer, R., & Jerusalem, M. (1995). Generalized Self-Efficacy scale. Measures in health psychology: A user\'s portfolio.',
  licenseNote: 'GSE © Ralf Schwarzer & Matthias Jerusalem, 1995. Adaptation française à usage d\'évaluation personnelle.',
  warningMessage: 'La confiance en soi est un trait qui évolue avec le temps, les expériences et l\'accompagnement.',
  scoreRange: { min: 0, max: 45 },
  items: [
    { id: 1,  text: 'Quand tu fais face à un problème difficile, tu te sens capable de le résoudre si tu y mets l\'effort ?', type: 'likert', options: opts },
    { id: 2,  text: 'Même quand quelqu\'un s\'oppose à toi, tu trouves les moyens d\'obtenir ce dont tu as besoin ?', type: 'likert', options: opts },
    { id: 3,  text: 'Tenir à tes projets et atteindre tes objectifs, c\'est quelque chose qui te vient facilement ?', type: 'likert', options: opts },
    { id: 4,  text: 'Quand un imprévu tombe, tu te fais confiance pour gérer la situation efficacement ?', type: 'likert', options: opts },
    { id: 5,  text: 'Tu sens que tu as les ressources personnelles pour naviguer les situations difficiles ?', type: 'likert', options: opts },
    { id: 6,  text: 'Tu es capable de résoudre la plupart des problèmes si tu y mets l\'énergie nécessaire ?', type: 'likert', options: opts },
    { id: 7,  text: 'Face aux difficultés, tu restes plutôt calme parce que tu te fais confiance pour gérer ?', type: 'likert', options: opts },
    { id: 8,  text: 'Quand un problème est compliqué, tu arrives à imaginer plusieurs solutions possibles ?', type: 'likert', options: opts },
    { id: 9,  text: 'Quand tu es dans une mauvaise passe, tu trouves généralement un moyen de t\'en sortir ?', type: 'likert', options: opts },
    { id: 10, text: 'Quoi qu\'il arrive, tu te sens capable de t\'adapter à la situation ?', type: 'likert', options: opts },
    { id: 11, text: 'Tu es à l\'aise pour dire ce que tu penses, même quand tout le monde est d\'un avis différent ?', type: 'likert', options: opts },
    { id: 12, text: 'Tu crois sincèrement en ta propre valeur — sans avoir besoin que les autres te le confirment ?', type: 'likert', options: opts },
    { id: 13, text: 'Tu n\'as pas besoin de l\'approbation constante des autres pour te sentir bien dans ta peau ?', type: 'likert', options: opts },
    { id: 14, text: 'Dire non quand quelque chose ne te convient pas, c\'est facile pour toi ?', type: 'likert', options: opts },
    { id: 15, text: 'Tu respectes tes propres besoins, tes limites et tes valeurs — sans culpabiliser ?', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 15,
      label: 'Faible confiance en soi',
      severity: 'moderate',
      description: 'En ce moment, tu te fais peu confiance pour affronter les défis. Les situations difficiles peuvent te sembler très déstabilisantes — et c\'est probablement épuisant au quotidien.',
      referralRequired: false,
      recommendation: 'La bonne nouvelle, c\'est que la confiance en soi se construit — avec du coaching, un suivi psychologique ou des petites victoires au quotidien. Tu n\'es pas "{{cassé|cassée}}", tu as juste besoin d\'outils 🛠️',
    },
    {
      min: 16, max: 28,
      label: 'Confiance en soi modérée',
      severity: 'mild',
      description: 'Ta confiance en toi est variable — solide dans certains domaines, plus fragile dans d\'autres. Tu te remets parfois en question plus que nécessaire.',
      referralRequired: false,
      recommendation: 'Regarde les domaines où tu te fais déjà confiance — ils existent ! Construis à partir de là pour renforcer les zones plus fragiles, petit à petit 🌱',
    },
    {
      min: 29, max: 38,
      label: 'Bonne confiance en soi',
      severity: 'minimal',
      description: 'Tu as une belle confiance en tes capacités. Tu fais face aux défis avec sérénité et tu sais mobiliser tes ressources quand ça se complique.',
      referralRequired: false,
      recommendation: 'Continue à t\'affirmer et à te faire confiance. Ta résilience est une vraie force — prends-en soin 💪',
    },
    {
      min: 39, max: 45,
      label: 'Très haute confiance en soi',
      severity: 'positive',
      description: 'Tu as une confiance en toi très solide. Tu te fais confiance naturellement, tu t\'affirmes sans hésitation et tu gères les imprévus avec calme. C\'est une vraie force.',
      referralRequired: false,
      recommendation: 'Garde cette belle énergie — et veille à rester {{ouvert|ouverte}} à la remise en question constructive. La confiance est encore plus belle quand elle s\'accompagne d\'humilité 🌟',
    },
  ],
};

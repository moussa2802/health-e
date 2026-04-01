import type { AssessmentScale } from '../../../types/assessment';

// HPI — Haut Potentiel Intellectuel : estimation par traits cognitifs et comportementaux
// Inspiré du GATES (Gifted and Talented Evaluation Scales) et des surexcitabilités de Dabrowski
// 15 items, Likert 0-4  |  Score 0-60
// Ce test est une estimation des traits associés au HPI — pas un test de QI

const opts = [
  { value: 0, label: 'Pas du tout' },
  { value: 1, label: 'Un peu' },
  { value: 2, label: 'Modérément' },
  { value: 3, label: 'Souvent' },
  { value: 4, label: 'Tout à fait' },
];

export const BONUS_HPI: AssessmentScale = {
  id: 'bonus_hpi',
  name: 'Haut Potentiel Intellectuel',
  shortName: 'HPI / GATES',
  category: 'bonus',
  description: 'Estimation des traits associés au haut potentiel intellectuel — curiosité intense, vitesse de traitement, profondeur de pensée et sensibilité.',
  instructions: 'Ces affirmations décrivent des façons de penser, de ressentir et de fonctionner. Indique dans quelle mesure chacune te correspond en général.',
  timeEstimateMinutes: 5,
  reference: 'Adapté du GATES (Gifted and Talented Evaluation Scales, Gilliam et al.) et des travaux de Dabrowski sur les surexcitabilités intellectuelles.',
  licenseNote: 'Outil d\'estimation des traits associés au HPI — ne constitue pas un test de QI clinique.',
  warningMessage: 'Ce test mesure des traits comportementaux et cognitifs associés au haut potentiel — il ne remplace pas une évaluation psychométrique du QI.',
  scoreRange: { min: 0, max: 60 },
  items: [
    { id: 1,  text: 'Tes idées surgissent souvent trop vite pour que tu puisses les suivre ou les noter correctement.', type: 'likert', options: opts },
    { id: 2,  text: 'Tu t\'ennuies facilement quand les tâches ne sont pas suffisamment complexes ou stimulantes.', type: 'likert', options: opts },
    { id: 3,  text: 'Tu remarques des connexions entre des idées ou des domaines qui semblent n\'avoir aucun rapport pour les autres.', type: 'likert', options: opts },
    { id: 4,  text: 'Tu te poses régulièrement des questions profondes — sens de la vie, conscience, origine de l\'univers, éthique...', type: 'likert', options: opts },
    { id: 5,  text: 'Tu as besoin de comprendre comment les choses fonctionnent vraiment en profondeur, pas seulement en surface.', type: 'likert', options: opts },
    { id: 6,  text: 'Tu as souvent l\'impression de penser différemment des personnes de ton entourage.', type: 'likert', options: opts },
    { id: 7,  text: 'Tu apprends de nouvelles choses très rapidement, parfois sans effort conscient apparent.', type: 'likert', options: opts },
    { id: 8,  text: 'Analyser, observer et comprendre te procure autant (ou plus) de plaisir qu\'interagir socialement.', type: 'likert', options: opts },
    { id: 9,  text: 'Tu as une mémoire particulièrement développée pour les faits, les détails ou les schémas complexes.', type: 'likert', options: opts },
    { id: 10, text: 'Tu ressens un perfectionnisme intellectuel qui te pousse à creuser encore et encore jusqu\'à vraiment comprendre.', type: 'likert', options: opts },
    { id: 11, text: 'Tu arrives souvent à anticiper la suite logique d\'un raisonnement ou d\'une situation avant les autres.', type: 'likert', options: opts },
    { id: 12, text: 'Les injustices ou les grands problèmes mondiaux t\'affectent émotionnellement, même quand ils ne te concernent pas directement.', type: 'likert', options: opts },
    { id: 13, text: 'Tu as des centres d\'intérêt très variés dans lesquels tu t\'investis avec une intensité particulière.', type: 'likert', options: opts },
    { id: 14, text: 'Tu as parfois du mal à trouver des personnes qui te comprennent vraiment sur le plan intellectuel ou émotionnel.', type: 'likert', options: opts },
    { id: 15, text: 'Tu as souvent le sentiment que ton cerveau ne s\'arrête jamais complètement — même la nuit ou au repos.', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 25,
      label: 'Fonctionnement intellectuel standard',
      severity: 'none',
      description: 'Peu de traits associés au haut potentiel ressortent dans ton profil. Tu fonctionnes de manière efficace et équilibrée.',
      referralRequired: false,
      recommendation: 'L\'intelligence prend de nombreuses formes. Ce test mesure un type particulier de fonctionnement cognitif parmi d\'autres.',
    },
    {
      min: 26, max: 40,
      label: 'Fonctionnement au-dessus de la moyenne',
      severity: 'mild',
      description: 'Tu présentes plusieurs traits associés à un haut potentiel intellectuel. Tu as probablement une curiosité et une profondeur de pensée plus développées que la moyenne.',
      referralRequired: false,
      recommendation: 'Ces traits peuvent être une ressource précieuse — dans ta vie professionnelle, tes créations, tes relations. Nourris ta curiosité.',
    },
    {
      min: 41, max: 52,
      label: 'Indices forts de haut potentiel',
      severity: 'positive',
      description: 'Tu présentes de nombreux traits caractéristiques du haut potentiel intellectuel — pensée rapide, connexions créatives, intensité émotionnelle et intellectuelle.',
      referralRequired: false,
      recommendation: 'Si tu n\'as jamais été évalué(e) officiellement, un bilan psychométrique avec un psychologue peut confirmer et mieux comprendre ton fonctionnement.',
    },
    {
      min: 53, max: 60,
      label: 'Profil très fortement associé au HPI',
      severity: 'positive',
      description: 'Ton profil présente une forte concentration de traits associés au haut potentiel intellectuel et émotionnel (double-excitabilité).',
      referralRequired: false,
      recommendation: 'Comprendre son HPI peut changer beaucoup de choses — relations, travail, bien-être. Un bilan avec un psychologue spécialisé peut être une expérience transformatrice.',
    },
  ],
};

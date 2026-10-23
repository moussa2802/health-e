import type { AssessmentScale } from '../../../types/assessment';

// SCI : Sleep Condition Indicator (Espie et al., 2014) — 8 items, chacun noté 0 à 4.
// Score total 0-32 : plus le score est HAUT, meilleur est le sommeil. ≤ 16 = insomnie probable.
// Copyright Sleepio Ltd (Big Health), licence CC BY-NC 4.0 : vérifier l'autorisation pour Health-e
// (les tests consomment des étincelles payantes : usage potentiellement commercial).

const dureeOpts = [
  { value: 4, label: '15 minutes ou moins' },
  { value: 3, label: '16 à 30 minutes' },
  { value: 2, label: '31 à 45 minutes' },
  { value: 1, label: '46 à 60 minutes' },
  { value: 0, label: 'Plus d\'une heure' },
];

const impactOpts = [
  { value: 4, label: 'Pas du tout' },
  { value: 3, label: 'Un peu' },
  { value: 2, label: 'Moyennement' },
  { value: 1, label: 'Beaucoup' },
  { value: 0, label: 'Énormément' },
];

export const BONUS_SOMMEIL: AssessmentScale = {
  id: 'bonus_sommeil',
  code: 'B12',
  name: 'Qualité du sommeil',
  shortName: 'SCI',
  category: 'bonus',
  description: 'Évalue tes difficultés de sommeil (endormissement, réveils, qualité des nuits) et leur impact sur tes journées.',
  instructions: 'Pense à une nuit habituelle du dernier mois',
  timeEstimateMinutes: 2,
  reference: 'Espie, C.A., Kyle, S.D., Hames, P., Gardani, M., Fleming, L., & Cape, J. (2014). The Sleep Condition Indicator: a clinical screening tool to evaluate insomnia disorder. BMJ Open, 4(3), e004183.',
  licenseNote: 'SCI © Sleepio Ltd, licence Creative Commons BY-NC 4.0. Adaptation française Health-e (tutoiement).',
  warningMessage: 'Ce test repère des difficultés de sommeil, il ne pose pas de diagnostic. Si tu ronfles fort, t\'arrêtes de respirer la nuit ou t\'endors au volant, parles-en à un médecin.',
  scoreRange: { min: 0, max: 32 },
  scoringVersion: 1,
  items: [
    { id: 1, text: 'Combien de temps il te faut, en général, pour t\'endormir ?', type: 'multiple_choice', options: dureeOpts },
    { id: 2, text: 'Si tu te réveilles pendant la nuit, combien de temps tu restes {{éveillé|éveillée}} en tout ?', type: 'multiple_choice', options: dureeOpts },
    {
      id: 3, text: 'Combien de nuits par semaine ton sommeil te pose problème ?', type: 'multiple_choice',
      options: [
        { value: 4, label: '0 ou 1 nuit' },
        { value: 3, label: '2 nuits' },
        { value: 2, label: '3 nuits' },
        { value: 1, label: '4 nuits' },
        { value: 0, label: '5 à 7 nuits' },
      ],
    },
    {
      id: 4, text: 'Comment tu juges la qualité de ton sommeil ?', type: 'multiple_choice',
      options: [
        { value: 4, label: 'Très bonne' },
        { value: 3, label: 'Bonne' },
        { value: 2, label: 'Moyenne' },
        { value: 1, label: 'Mauvaise' },
        { value: 0, label: 'Très mauvaise' },
      ],
    },
    { id: 5, text: 'Ce dernier mois, ton mauvais sommeil a touché ton humeur, ton énergie ou tes relations ?', type: 'likert', options: impactOpts },
    { id: 6, text: 'Ce dernier mois, ton mauvais sommeil a touché ta concentration, ton travail ou ta capacité à rester {{éveillé|éveillée}} ?', type: 'likert', options: impactOpts },
    { id: 7, text: 'Ce dernier mois, à quel point ton mauvais sommeil t\'a {{dérangé|dérangée}} ?', type: 'likert', options: impactOpts },
    {
      id: 8, text: 'Depuis combien de temps tu as des soucis de sommeil ?', type: 'multiple_choice',
      options: [
        { value: 4, label: 'Je n\'en ai pas, ou moins d\'un mois' },
        { value: 3, label: '1 à 2 mois' },
        { value: 2, label: '3 à 6 mois' },
        { value: 1, label: '7 à 12 mois' },
        { value: 0, label: 'Plus d\'un an' },
      ],
    },
  ],
  interpretation: [
    {
      min: 0, max: 8,
      label: 'Sommeil très perturbé',
      severity: 'severe',
      alertLevel: 1,
      description: 'Tes nuits sont difficiles presque tout le temps, et ça pèse sur tes journées. Ce n\'est pas une fatalité : les troubles du sommeil se soignent bien.',
      referralRequired: true,
      recommendation: 'Parles-en à un médecin : il existe une thérapie du sommeil (TCC de l\'insomnie) très efficace, souvent sans médicament. En attendant, une heure de lever fixe chaque matin est le meilleur premier pas.',
    },
    {
      min: 9, max: 16,
      label: 'Sommeil perturbé',
      severity: 'moderate',
      alertLevel: 1,
      description: 'Ton sommeil te pose un vrai problème plusieurs nuits par semaine et ça se ressent dans la journée.',
      referralRequired: false,
      recommendation: 'Un rythme régulier (même heure de lever), moins d\'écrans le soir et pas de café après 14 h font une vraie différence en quelques semaines. Si ça dure depuis des mois, parles-en à un médecin.',
    },
    {
      min: 17, max: 24,
      label: 'Quelques nuits difficiles',
      severity: 'mild',
      description: 'Ton sommeil est correct la plupart du temps, avec des nuits plus compliquées de temps en temps.',
      referralRequired: false,
      recommendation: 'Protège ce qui marche : un coucher et un lever réguliers, et un moment calme sans écran avant de dormir.',
    },
    {
      min: 25, max: 32,
      label: 'Tu dors plutôt bien',
      severity: 'minimal',
      description: 'Tes nuits sont bonnes et tu te sens plutôt {{reposé|reposée}} dans la journée.',
      referralRequired: false,
      recommendation: 'Continue comme ça : ton sommeil est une vraie ressource pour ton moral et ton énergie.',
    },
  ],
};

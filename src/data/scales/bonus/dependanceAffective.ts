import type { AssessmentScale } from '../../../types/assessment';

// DAQ adapté : Dépendance Affective — 15 items, Likert 0-4
// Score total : 0-60  |  Seuils : 0-15 / 16-30 / 31-45 / 46-60
// Inspiré du Dependent Personality Questionnaire et de l'échelle de Livesley

const opts = [
  { value: 0, label: 'Pas du tout' },
  { value: 1, label: 'Un peu' },
  { value: 2, label: 'Modérément' },
  { value: 3, label: 'Souvent' },
  { value: 4, label: 'Tout à fait' },
];

export const BONUS_DEPENDANCE: AssessmentScale = {
  id: 'bonus_dependance',
  name: 'Dépendance affective',
  shortName: 'DAQ',
  category: 'bonus',
  description: 'Évalue le niveau de dépendance affective dans les relations — la tendance à s\'oublier pour maintenir un lien.',
  instructions: 'Ces affirmations parlent de toi dans tes relations proches. Indique dans quelle mesure chacune te correspond, en général (pas forcément en ce moment).',
  timeEstimateMinutes: 5,
  reference: 'Adapté du Dependent Personality Questionnaire (Livesley et al.) et des travaux de Bornstein (1993) sur la dépendance.',
  licenseNote: 'Adaptation française à usage d\'auto-évaluation psychologique.',
  warningMessage: 'Ce test explore des dynamiques relationnelles courantes. Il ne remplace pas une évaluation clinique.',
  scoreRange: { min: 0, max: 60 },
  items: [
    { id: 1,  text: 'J\'ai besoin d\'être souvent rassuré(e) pour croire que la personne que j\'aime tient vraiment à moi.', type: 'likert', options: opts },
    { id: 2,  text: 'J\'ai du mal à prendre des décisions importantes sans demander l\'avis de quelqu\'un de proche.', type: 'likert', options: opts },
    { id: 3,  text: 'Je m\'adapte aux désirs des autres pour éviter d\'être abandonné(e) ou rejeté(e).', type: 'likert', options: opts },
    { id: 4,  text: 'Lorsque je suis seul(e), je me sens perdu(e), vide ou profondément mal à l\'aise.', type: 'likert', options: opts },
    { id: 5,  text: 'Je préfère souvent faire selon les désirs des autres plutôt que d\'affirmer les miens.', type: 'likert', options: opts },
    { id: 6,  text: 'J\'ai tendance à m\'oublier dans mes relations pour plaire et être apprécié(e).', type: 'likert', options: opts },
    { id: 7,  text: 'La perspective d\'être quitté(e) ou abandonné(e) me génère une peur intense, voire panique.', type: 'likert', options: opts },
    { id: 8,  text: 'Je me sens incomplet(e) ou moins bien quand je ne suis pas en relation proche avec quelqu\'un.', type: 'likert', options: opts },
    { id: 9,  text: 'J\'ai du mal à exprimer mon désaccord avec des personnes dont j\'ai besoin émotionnellement.', type: 'likert', options: opts },
    { id: 10, text: 'Je consacre beaucoup d\'énergie à éviter les conflits pour ne pas perdre une relation qui compte.', type: 'likert', options: opts },
    { id: 11, text: 'Je me sens responsable du bonheur et du bien-être émotionnel des personnes que j\'aime.', type: 'likert', options: opts },
    { id: 12, text: 'J\'ai déjà toléré des comportements inacceptables pour ne pas perdre une relation importante.', type: 'likert', options: opts },
    { id: 13, text: 'Je cherche constamment l\'approbation des autres pour me sentir bien dans ma peau.', type: 'likert', options: opts },
    { id: 14, text: 'La solitude me semble insupportable, même pour une courte période.', type: 'likert', options: opts },
    { id: 15, text: 'Je m\'attache très vite et très intensément aux personnes qui entrent dans ma vie.', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 15,
      label: 'Très peu de dépendance affective',
      severity: 'minimal',
      description: 'Tu sembles avoir une bonne autonomie affective. Tu sais maintenir des liens forts tout en gardant ton identité propre.',
      referralRequired: false,
      recommendation: 'Continue à cultiver cet équilibre entre connexion aux autres et respect de toi-même.',
    },
    {
      min: 16, max: 30,
      label: 'Dépendance affective légère',
      severity: 'mild',
      description: 'Tu as quelques tendances à la dépendance affective. C\'est courant, surtout dans les relations intenses. Ces dynamiques peuvent évoluer avec la conscience de soi.',
      referralRequired: false,
      recommendation: 'Explorer tes besoins affectifs — en solo ou avec un thérapeute — peut t\'aider à renforcer ton autonomie émotionnelle.',
    },
    {
      min: 31, max: 45,
      label: 'Dépendance affective modérée',
      severity: 'moderate',
      description: 'Tu as une dépendance affective assez marquée qui peut peser sur tes relations et ton bien-être. Tu tends à t\'oublier pour maintenir le lien.',
      referralRequired: false,
      recommendation: 'Un accompagnement psychologique peut faire une vraie différence pour apprendre à t\'aimer d\'abord et à construire des relations plus équilibrées.',
    },
    {
      min: 46, max: 60,
      label: 'Dépendance affective marquée',
      severity: 'severe',
      description: 'Tu présentes une dépendance affective forte qui peut affecter significativement ta qualité de vie et tes relations.',
      referralRequired: true,
      recommendation: 'Un suivi avec un professionnel de santé mentale est fortement recommandé. La dépendance affective se travaille — tu n\'as pas à rester prisonnier(ère) de ces schémas.',
      alertLevel: 1,
    },
  ],
};

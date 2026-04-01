import type { AssessmentScale } from '../../../types/assessment';

// WLEIS : Wong and Law Emotional Intelligence Scale — 16 items, Likert 1-7
// 4 sous-échelles × 4 items : SEA, OEA, UOE, ROE
// Score total : 16-112  |  Seuils adaptés
// Wong, C.S. & Law, K.S. (2002). The effects of leader and follower emotional intelligence.

const opts = [
  { value: 1, label: 'Pas du tout d\'accord' },
  { value: 2, label: 'Très peu d\'accord' },
  { value: 3, label: 'Peu d\'accord' },
  { value: 4, label: 'Neutre' },
  { value: 5, label: 'Plutôt d\'accord' },
  { value: 6, label: 'D\'accord' },
  { value: 7, label: 'Tout à fait d\'accord' },
];

export const BONUS_EQ: AssessmentScale = {
  id: 'bonus_eq',
  name: 'Intelligence émotionnelle',
  shortName: 'WLEIS',
  category: 'bonus',
  description: 'Mesure ton intelligence émotionnelle selon 4 dimensions : compréhension de soi, compréhension des autres, utilisation des émotions et régulation émotionnelle.',
  instructions: 'Ces affirmations portent sur ta façon de percevoir et de gérer les émotions — les tiennes et celles des autres. Indique ton niveau d\'accord avec chacune.',
  timeEstimateMinutes: 6,
  reference: 'Wong, C.S. & Law, K.S. (2002). The effects of leader and follower emotional intelligence on performance and attitude. The Leadership Quarterly, 13(3), 243-274.',
  licenseNote: 'WLEIS © Chi-Sum Wong & Kenneth S. Law. Adaptation française à usage d\'auto-évaluation.',
  warningMessage: 'L\'intelligence émotionnelle est une compétence qui se développe tout au long de la vie avec la pratique et la réflexion.',
  scoreRange: { min: 16, max: 112 },
  subscales: [
    {
      key: 'sea',
      label: 'Conscience de soi émotionnelle',
      itemIds: [1, 2, 3, 4],
      range: { min: 4, max: 28 },
    },
    {
      key: 'oea',
      label: 'Empathie et lecture des autres',
      itemIds: [5, 6, 7, 8],
      range: { min: 4, max: 28 },
    },
    {
      key: 'uoe',
      label: 'Utilisation des émotions',
      itemIds: [9, 10, 11, 12],
      range: { min: 4, max: 28 },
    },
    {
      key: 'roe',
      label: 'Régulation émotionnelle',
      itemIds: [13, 14, 15, 16],
      range: { min: 4, max: 28 },
    },
  ],
  items: [
    // SEA — Self-Emotion Appraisal
    { id: 1,  text: 'Je suis capable de comprendre la plupart de mes émotions et de les identifier clairement.', type: 'likert', options: opts, subscale: 'sea' },
    { id: 2,  text: 'Je comprends vraiment bien ce que je ressens à l\'intérieur.', type: 'likert', options: opts, subscale: 'sea' },
    { id: 3,  text: 'Je sais toujours dire ce que je ressens, même dans des situations complexes.', type: 'likert', options: opts, subscale: 'sea' },
    { id: 4,  text: 'J\'ai une bonne compréhension de mes propres émotions et de leurs causes.', type: 'likert', options: opts, subscale: 'sea' },

    // OEA — Others' Emotion Appraisal
    { id: 5,  text: 'Je suis un(e) bon(ne) observateur(trice) des émotions des personnes autour de moi.', type: 'likert', options: opts, subscale: 'oea' },
    { id: 6,  text: 'Je suis très sensible aux sentiments et aux états émotionnels des autres.', type: 'likert', options: opts, subscale: 'oea' },
    { id: 7,  text: 'Je comprends bien les émotions des personnes qui m\'entourent au quotidien.', type: 'likert', options: opts, subscale: 'oea' },
    { id: 8,  text: 'J\'ai une bonne capacité à lire les émotions des gens proches de moi.', type: 'likert', options: opts, subscale: 'oea' },

    // UOE — Use of Emotion
    { id: 9,  text: 'Je me fixe des objectifs importants, puis je me motive pour les atteindre.', type: 'likert', options: opts, subscale: 'uoe' },
    { id: 10, text: 'Je me rappelle que je suis capable, même dans les moments de doute.', type: 'likert', options: opts, subscale: 'uoe' },
    { id: 11, text: 'Je suis quelqu\'un qui sait s\'auto-motiver et maintenir son élan même face aux obstacles.', type: 'likert', options: opts, subscale: 'uoe' },
    { id: 12, text: 'Je m\'encourage intérieurement pour donner le meilleur de moi-même.', type: 'likert', options: opts, subscale: 'uoe' },

    // ROE — Regulation of Emotion
    { id: 13, text: 'Je suis capable de contrôler mes émotions et de les réguler selon la situation.', type: 'likert', options: opts, subscale: 'roe' },
    { id: 14, text: 'Je peux me calmer rapidement quand je suis très en colère ou très frustré(e).', type: 'likert', options: opts, subscale: 'roe' },
    { id: 15, text: 'J\'ai un bon contrôle sur mes propres réactions émotionnelles.', type: 'likert', options: opts, subscale: 'roe' },
    { id: 16, text: 'Je me remets vite d\'un état de tristesse ou d\'abattement intense.', type: 'likert', options: opts, subscale: 'roe' },
  ],
  interpretation: [
    {
      min: 16, max: 48,
      label: 'Intelligence émotionnelle en développement',
      severity: 'moderate',
      description: 'Ton intelligence émotionnelle est encore en développement. Tu peux avoir du mal à identifier tes émotions, à lire celles des autres ou à les réguler efficacement.',
      referralRequired: false,
      recommendation: 'Travailler sur ton intelligence émotionnelle est l\'un des investissements les plus rentables pour ta vie et tes relations. La pleine conscience, le journal intime et la thérapie sont d\'excellents outils.',
    },
    {
      min: 49, max: 72,
      label: 'Intelligence émotionnelle modérée',
      severity: 'mild',
      description: 'Tu as une intelligence émotionnelle dans la moyenne. Tu te débrouilles bien dans certaines situations émotionnelles mais certains aspects peuvent être renforcés.',
      referralRequired: false,
      recommendation: 'Développer ta conscience de toi et ta régulation émotionnelle peut transformer tes relations et ton leadership.',
    },
    {
      min: 73, max: 96,
      label: 'Bonne intelligence émotionnelle',
      severity: 'positive',
      description: 'Tu as une bonne intelligence émotionnelle. Tu te connais bien, tu lis les autres avec finesse et tu gères tes émotions de façon mature.',
      referralRequired: false,
      recommendation: 'Continue à cultiver cette conscience émotionnelle — c\'est une ressource rare et précieuse dans toutes tes relations.',
    },
    {
      min: 97, max: 112,
      label: 'Très haute intelligence émotionnelle',
      severity: 'positive',
      description: 'Ton intelligence émotionnelle est exceptionnellement développée. Tu excelles dans la conscience de soi, l\'empathie, la motivation et la régulation émotionnelle.',
      referralRequired: false,
      recommendation: 'Tu as un don naturel pour les relations humaines. Partager et développer ces compétences peut avoir un impact fort autour de toi.',
    },
  ],
};

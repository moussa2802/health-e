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
  instructions: 'Ces questions portent sur ta façon de percevoir et gérer les émotions — les tiennes et celles des autres. Fais confiance à ton ressenti 🎯',
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
    { id: 1,  text: 'Tu arrives à comprendre la plupart de tes émotions et à mettre des mots dessus clairement ?', type: 'likert', options: opts, subscale: 'sea' },
    { id: 2,  text: 'Tu comprends vraiment bien ce qui se passe à l\'intérieur de toi — tes ressentis profonds ?', type: 'likert', options: opts, subscale: 'sea' },
    { id: 3,  text: 'Même dans des situations complexes, tu sais dire ce que tu ressens ?', type: 'likert', options: opts, subscale: 'sea' },
    { id: 4,  text: 'Tu as une bonne compréhension de tes propres émotions et de ce qui les déclenche ?', type: 'likert', options: opts, subscale: 'sea' },

    // OEA — Others' Emotion Appraisal
    { id: 5,  text: 'Tu captes facilement les émotions des gens autour de toi — même quand ils ne disent rien ?', type: 'likert', options: opts, subscale: 'oea' },
    { id: 6,  text: 'Tu es très sensible aux sentiments et aux états émotionnels des autres ?', type: 'likert', options: opts, subscale: 'oea' },
    { id: 7,  text: 'Tu comprends bien les émotions des personnes qui t\'entourent au quotidien ?', type: 'likert', options: opts, subscale: 'oea' },
    { id: 8,  text: 'Tu arrives à lire les émotions des gens proches de toi — même quand ils essaient de les cacher ?', type: 'likert', options: opts, subscale: 'oea' },

    // UOE — Use of Emotion
    { id: 9,  text: 'Tu te fixes des objectifs importants et tu utilises tes émotions comme carburant pour les atteindre ?', type: 'likert', options: opts, subscale: 'uoe' },
    { id: 10, text: 'Dans les moments de doute, tu arrives à te rappeler que tu es capable — et ça te remet en mouvement ?', type: 'likert', options: opts, subscale: 'uoe' },
    { id: 11, text: 'Tu sais t\'auto-motiver et garder ton élan même quand tu rencontres des obstacles ?', type: 'likert', options: opts, subscale: 'uoe' },
    { id: 12, text: 'Tu t\'encourages intérieurement pour donner le meilleur de toi-même ?', type: 'likert', options: opts, subscale: 'uoe' },

    // ROE — Regulation of Emotion
    { id: 13, text: 'Tu arrives à contrôler tes émotions et à les adapter selon la situation ?', type: 'likert', options: opts, subscale: 'roe' },
    { id: 14, text: 'Quand tu es très en colère ou {{frustré|frustrée}}, tu arrives à te calmer assez vite ?', type: 'likert', options: opts, subscale: 'roe' },
    { id: 15, text: 'Tu as un bon contrôle sur tes propres réactions émotionnelles — même sous pression ?', type: 'likert', options: opts, subscale: 'roe' },
    { id: 16, text: 'Tu te remets assez vite d\'un coup de tristesse ou d\'un moment d\'abattement intense ?', type: 'likert', options: opts, subscale: 'roe' },
  ],
  interpretation: [
    {
      min: 16, max: 48,
      label: 'Intelligence émotionnelle en développement',
      severity: 'moderate',
      description: 'Ta capacité à lire et gérer les émotions est encore en construction — et c\'est tout à fait normal. C\'est une compétence qui se développe à tout âge.',
      referralRequired: false,
      recommendation: 'Travailler sur ton intelligence émotionnelle est l\'un des investissements les plus rentables pour ta vie et tes relations. La pleine conscience, le journal intime et la thérapie sont d\'excellents outils pour avancer.',
    },
    {
      min: 49, max: 72,
      label: 'Intelligence émotionnelle modérée',
      severity: 'mild',
      description: 'Tu as une intelligence émotionnelle dans la moyenne. Tu te débrouilles bien dans pas mal de situations émotionnelles, mais certains aspects peuvent encore être renforcés.',
      referralRequired: false,
      recommendation: 'Développer ta conscience de toi et ta régulation émotionnelle peut vraiment transformer tes relations et ta façon de naviguer dans la vie.',
    },
    {
      min: 73, max: 96,
      label: 'Bonne intelligence émotionnelle',
      severity: 'positive',
      description: 'Tu as une belle intelligence émotionnelle. Tu te connais bien, tu lis les autres avec finesse et tu gères tes émotions avec maturité — c\'est une vraie richesse.',
      referralRequired: false,
      recommendation: 'Continue à cultiver cette conscience émotionnelle — c\'est une ressource rare et précieuse dans toutes tes relations.',
    },
    {
      min: 97, max: 112,
      label: 'Très haute intelligence émotionnelle',
      severity: 'positive',
      description: 'Ton intelligence émotionnelle est exceptionnellement développée. Tu excelles dans la conscience de soi, l\'empathie, la motivation et la régulation émotionnelle — chapeau.',
      referralRequired: false,
      recommendation: 'Tu as un vrai don pour les relations humaines. Partager et développer ces compétences peut avoir un impact fort autour de toi.',
    },
  ],
};

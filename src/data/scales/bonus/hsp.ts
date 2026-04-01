import type { AssessmentScale } from '../../../types/assessment';

// HSP Scale : Highly Sensitive Person Scale — 15 items clés, Likert 0-4
// Adapté de l'échelle d'Elaine Aron (1996), 27 items → sélection des 15 items les plus discriminants
// Score total : 0-60  |  Seuils : 0-20 faible / 21-35 modérée / 36-50 haute / 51-60 très haute
// Aron, E.N. & Aron, A. (1997). Sensory-processing sensitivity and its relation to introversion and emotionality.

const opts = [
  { value: 0, label: 'Pas du tout' },
  { value: 1, label: 'Un peu' },
  { value: 2, label: 'Modérément' },
  { value: 3, label: 'Beaucoup' },
  { value: 4, label: 'Extrêmement' },
];

export const BONUS_HSP: AssessmentScale = {
  id: 'bonus_hsp',
  name: 'Hypersensibilité (HSP)',
  shortName: 'HSP Scale',
  category: 'bonus',
  description: 'Mesure le niveau de sensibilité de traitement sensoriel — la profondeur avec laquelle tu traites les stimulations et les émotions.',
  instructions: 'Ces affirmations décrivent des expériences sensorielles et émotionnelles. Indique dans quelle mesure chacune s\'applique à toi en général.',
  timeEstimateMinutes: 5,
  reference: 'Aron, E.N. & Aron, A. (1997). Sensory-processing sensitivity and its relation to introversion and emotionality. Journal of Personality and Social Psychology, 73(2), 345-368.',
  licenseNote: 'Adaptation française des items clés de la HSP Scale d\'Elaine Aron.',
  warningMessage: 'La haute sensibilité est un trait de personnalité normal, présent chez environ 15-20% de la population. Ce n\'est pas une pathologie.',
  scoreRange: { min: 0, max: 60 },
  items: [
    { id: 1,  text: 'Je suis facilement submergé(e) par les stimulations fortes — lumières vives, bruits forts, odeurs intenses, textures rugueuses...', type: 'likert', options: opts },
    { id: 2,  text: 'Je remarque des subtilités dans mon environnement que les autres ne semblent pas percevoir.', type: 'likert', options: opts },
    { id: 3,  text: 'Les humeurs et émotions des personnes autour de moi m\'affectent profondément.', type: 'likert', options: opts },
    { id: 4,  text: 'Les films, musiques ou œuvres d\'art puissants me touchent très intensément — parfois jusqu\'aux larmes.', type: 'likert', options: opts },
    { id: 5,  text: 'Je me sens dépassé(e) quand j\'ai trop de choses à gérer en même temps ou que les délais s\'accumulent.', type: 'likert', options: opts },
    { id: 6,  text: 'Je détecte naturellement quand quelqu\'un est mal à l\'aise dans une pièce, avant même qu\'il le dise.', type: 'likert', options: opts },
    { id: 7,  text: 'Je suis particulièrement perturbé(e) par les bruits forts, les clignotements ou les stimulations visuelles intenses.', type: 'likert', options: opts },
    { id: 8,  text: 'Les changements importants dans ma vie me déstabilisent davantage qu\'ils ne semblent affecter les autres.', type: 'likert', options: opts },
    { id: 9,  text: 'J\'évite les films violents, les actualités choquantes ou les contenus trop négatifs car ils me perturbent longtemps.', type: 'likert', options: opts },
    { id: 10, text: 'Faire plusieurs choses en même temps ou être interrompu(e) souvent me dérange vraiment.', type: 'likert', options: opts },
    { id: 11, text: 'La beauté de la nature, de la musique ou de l\'art me touche profondément et me procure des émotions intenses.', type: 'likert', options: opts },
    { id: 12, text: 'Ma conscience des détails fins m\'aide dans mon travail ou dans mes relations.', type: 'likert', options: opts },
    { id: 13, text: 'Les bruits forts soudains ou les surprises me font sursauter beaucoup plus que les autres.', type: 'likert', options: opts },
    { id: 14, text: 'Après une journée chargée socialement ou émotionnellement, j\'ai besoin de me retirer dans un endroit calme pour récupérer.', type: 'likert', options: opts },
    { id: 15, text: 'La faim me perturbe fortement — elle affecte ma concentration, mon humeur ou mes capacités cognitives.', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 20,
      label: 'Faible sensibilité sensorielle',
      severity: 'none',
      description: 'Tu as un seuil de traitement sensoriel assez élevé. Tu te laisses peu submerger par les stimulations de l\'environnement.',
      referralRequired: false,
      recommendation: 'Ton profil peut être une force dans les environnements stimulants ou stressants.',
    },
    {
      min: 21, max: 35,
      label: 'Sensibilité modérée',
      severity: 'mild',
      description: 'Tu as une sensibilité dans la moyenne, avec quelques moments où tu ressens les choses plus intensément que les autres.',
      referralRequired: false,
      recommendation: 'Tu bénéficieras de temps en temps de moments de calme pour recharger ton énergie.',
    },
    {
      min: 36, max: 50,
      label: 'Haute sensibilité (HSP probable)',
      severity: 'moderate',
      description: 'Tu fais probablement partie des personnes hautement sensibles — environ 15-20% de la population. Tu traites les informations en profondeur et ressens les émotions intensément.',
      referralRequired: false,
      recommendation: 'La haute sensibilité est un trait, pas un défaut. Apprendre à gérer ton énergie et tes environnements peut transformer cette sensibilité en véritable force.',
    },
    {
      min: 51, max: 60,
      label: 'Très haute sensibilité',
      severity: 'severe',
      description: 'Tu as un niveau de sensibilité sensorielle et émotionnelle très élevé. Tu ressens tout plus intensément — les joies comme les difficultés.',
      referralRequired: false,
      recommendation: 'Prendre soin de ton environnement et de ton rythme est essentiel pour toi. Un accompagnement peut t\'aider à transformer cette hypersensibilité en super-pouvoir.',
    },
  ],
};

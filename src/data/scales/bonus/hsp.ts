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
  instructions: 'Ces questions portent sur ta sensibilité — la façon dont tu ressens les choses au quotidien. Il n\'y a pas de bonne ou mauvaise réponse 🌿',
  timeEstimateMinutes: 5,
  reference: 'Aron, E.N. & Aron, A. (1997). Sensory-processing sensitivity and its relation to introversion and emotionality. Journal of Personality and Social Psychology, 73(2), 345-368.',
  licenseNote: 'Adaptation française des items clés de la HSP Scale d\'Elaine Aron.',
  warningMessage: 'La haute sensibilité est un trait de personnalité normal, présent chez environ 15-20% de la population. Ce n\'est pas une pathologie.',
  scoreRange: { min: 0, max: 60 },
  items: [
    { id: 1,  text: 'Les lumières vives, les bruits forts, les odeurs intenses ou les textures rugueuses te submergent facilement ?', type: 'likert', options: opts },
    { id: 2,  text: 'Tu remarques des subtilités dans ton environnement que les autres ne semblent pas du tout percevoir ?', type: 'likert', options: opts },
    { id: 3,  text: 'Les humeurs et les émotions des gens autour de toi t\'affectent profondément — tu les absorbes presque malgré toi ? 🫧', type: 'likert', options: opts },
    { id: 4,  text: 'Un film puissant, une musique ou une œuvre d\'art peut te toucher si fort que tu en as les larmes aux yeux ? 🎬', type: 'likert', options: opts },
    { id: 5,  text: 'Quand tu as trop de choses à gérer en même temps ou que les délais s\'accumulent, tu te sens vite {{dépassé|dépassée}} ?', type: 'likert', options: opts },
    { id: 6,  text: 'Tu détectes naturellement quand quelqu\'un est mal à l\'aise dans une pièce — avant même qu\'il ouvre la bouche ?', type: 'likert', options: opts },
    { id: 7,  text: 'Les bruits forts, les clignotements ou les stimulations visuelles intenses te perturbent vraiment — plus que la plupart des gens ?', type: 'likert', options: opts },
    { id: 8,  text: 'Les changements importants dans ta vie te déstabilisent davantage qu\'ils ne semblent affecter les autres autour de toi ?', type: 'likert', options: opts },
    { id: 9,  text: 'Tu évites les films violents, les actualités choquantes ou les contenus trop négatifs parce qu\'ils te restent en tête longtemps ? 📵', type: 'likert', options: opts },
    { id: 10, text: 'Faire plusieurs choses en même temps ou être souvent {{interrompu|interrompue}} — ça te dérange vraiment, ça te coupe dans ton élan ?', type: 'likert', options: opts },
    { id: 11, text: 'La beauté de la nature, la musique ou l\'art te procurent des émotions intenses — parfois un vrai frisson intérieur ? 🌅', type: 'likert', options: opts },
    { id: 12, text: 'Ta conscience des détails fins t\'aide dans ton travail ou dans tes relations — tu perçois ce que les autres manquent ?', type: 'likert', options: opts },
    { id: 13, text: 'Un bruit fort soudain ou une surprise te fait sursauter beaucoup plus que les gens autour de toi ?', type: 'likert', options: opts },
    { id: 14, text: 'Après une journée chargée en émotions ou en interactions, tu as besoin de te retirer au calme pour recharger tes batteries ?', type: 'likert', options: opts },
    { id: 15, text: 'Quand tu as faim, ça te perturbe vraiment — ta concentration, ton humeur et tes capacités en prennent un coup ? 🍽️', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 20,
      label: 'Faible sensibilité sensorielle',
      severity: 'none',
      description: 'Tu as un seuil de traitement sensoriel plutôt élevé — tu te laisses peu submerger par les stimulations de ton environnement. C\'est un vrai atout dans les contextes intenses.',
      referralRequired: false,
      recommendation: 'Ton profil peut être une force précieuse dans les environnements stimulants ou stressants. Continue comme ça !',
    },
    {
      min: 21, max: 35,
      label: 'Sensibilité modérée',
      severity: 'mild',
      description: 'Ta sensibilité est dans la moyenne, avec quelques moments où tu ressens les choses plus intensément que les autres. C\'est un équilibre intéressant.',
      referralRequired: false,
      recommendation: 'De temps en temps, t\'accorder des moments de calme pour recharger ton énergie te fera du bien — même si tu n\'en ressens pas toujours le besoin sur le moment.',
    },
    {
      min: 36, max: 50,
      label: 'Haute sensibilité (HSP probable)',
      severity: 'moderate',
      description: 'Tu fais probablement partie des personnes hautement sensibles — environ 15 à 20 % de la population. Tu traites les informations en profondeur et tu ressens les émotions avec une intensité particulière.',
      referralRequired: false,
      recommendation: 'La haute sensibilité est un trait de tempérament, pas un défaut. Apprendre à gérer ton énergie et à choisir tes environnements peut transformer cette sensibilité en véritable super-pouvoir 💪',
    },
    {
      min: 51, max: 60,
      label: 'Très haute sensibilité',
      severity: 'positive',
      description: 'Tu as un niveau de sensibilité sensorielle et émotionnelle très élevé. C\'est un trait de tempérament — pas un problème. Tu ressens tout avec une intensité rare : les joies sont plus lumineuses, les beautés plus vibrantes, et oui, les difficultés aussi se ressentent plus fort.',
      referralRequired: false,
      recommendation: 'Prendre soin de ton environnement et de ton rythme est essentiel pour toi. Cette sensibilité est un cadeau — et avec les bonnes stratégies, elle devient une force incroyable au quotidien 🌟',
    },
  ],
};

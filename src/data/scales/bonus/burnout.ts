import type { AssessmentScale } from '../../../types/assessment';

// MBI court : Maslach Burnout Inventory — version courte 9 items
// 3 sous-échelles × 3 items : Épuisement, Dépersonnalisation, Accomplissement (inversé)
// Fréquence 0-6  |  Score 0-54
// Maslach, C., Jackson, S.E., & Leiter, M.P. (1996)

const opts = [
  { value: 0, label: 'Jamais', subtitle: "Ça ne m'arrive pas" },
  { value: 1, label: 'Quelques fois par an', subtitle: "C'est vraiment rare" },
  { value: 2, label: 'Une fois par mois', subtitle: "Environ 1 fois par mois" },
  { value: 3, label: 'Quelques fois par mois', subtitle: "2-3 fois par mois" },
  { value: 4, label: 'Une fois par semaine', subtitle: "Environ 1 fois par semaine" },
  { value: 5, label: 'Plusieurs fois par semaine', subtitle: "Quasiment un jour sur deux" },
  { value: 6, label: 'Tous les jours', subtitle: "Chaque jour ou presque" },
];

export const BONUS_BURNOUT: AssessmentScale = {
  id: 'bonus_burnout',
  name: 'Burnout professionnel',
  shortName: 'MBI Court',
  category: 'bonus',
  description: 'Évalue le niveau d\'épuisement professionnel selon les 3 dimensions du burnout : épuisement émotionnel, dépersonnalisation et sens de l\'accomplissement.',
  instructions: 'Ces questions portent sur ce que tu ressens par rapport à ton travail ou tes activités principales. Dis-moi à quelle fréquence tu vis ces situations 💼',
  timeEstimateMinutes: 4,
  reference: 'Maslach, C., Jackson, S.E., & Leiter, M.P. (1996). Maslach Burnout Inventory Manual (3e éd.). Consulting Psychologists Press.',
  licenseNote: 'Adaptation courte du MBI pour usage d\'auto-évaluation et de dépistage.',
  warningMessage: 'Le burnout est une condition sérieuse qui nécessite une prise en charge. Ne supporte pas {{seul|seule}} — parles-en à ton médecin.',
  scoreRange: { min: 0, max: 54 },
  subscales: [
    {
      key: 'epuisement',
      label: 'Épuisement émotionnel',
      itemIds: [1, 2, 3],
      range: { min: 0, max: 18 },
    },
    {
      key: 'depersonnalisation',
      label: 'Dépersonnalisation',
      itemIds: [4, 5, 6],
      range: { min: 0, max: 18 },
    },
    {
      key: 'accomplissement',
      label: 'Accomplissement personnel',
      itemIds: [7, 8, 9],
      reverseIds: [7, 8, 9],
      range: { min: 0, max: 18 },
    },
  ],
  items: [
    // Épuisement émotionnel
    { id: 1, text: 'Tu te sens émotionnellement {{vidé|vidée}} par ton travail ?', type: 'frequency', options: opts, subscale: 'epuisement' },
    { id: 2, text: 'En fin de journée de travail, tu te sens complètement {{épuisé|épuisée}} et à plat ?', type: 'frequency', options: opts, subscale: 'epuisement' },
    { id: 3, text: 'Le matin, tu te réveilles déjà {{fatigué|fatiguée}} rien qu\'à l\'idée d\'affronter une nouvelle journée de travail ?', type: 'frequency', options: opts, subscale: 'epuisement' },

    // Dépersonnalisation
    { id: 4, text: 'Il t\'arrive de traiter certaines personnes au travail de façon impersonnelle — comme si elles étaient juste des dossiers à gérer ?', type: 'frequency', options: opts, subscale: 'depersonnalisation' },
    { id: 5, text: 'Travailler avec des gens tout au long de la journée, ça te demande un effort vraiment épuisant ?', type: 'frequency', options: opts, subscale: 'depersonnalisation' },
    { id: 6, text: 'Tu ne te soucies plus vraiment de ce qui arrive aux personnes avec qui tu travailles ?', type: 'frequency', options: opts, subscale: 'depersonnalisation' },

    // Accomplissement personnel (inversé : score élevé = pas de burnout)
    { id: 7, text: 'Tu accomplis des choses qui valent vraiment la peine dans ton travail ?', type: 'frequency', options: opts, subscale: 'accomplissement', reversed: true },
    { id: 8, text: 'Tu te sens {{plein|pleine}} d\'énergie et d\'enthousiasme quand tu travailles ?', type: 'frequency', options: opts, subscale: 'accomplissement', reversed: true },
    { id: 9, text: 'Tu as le sentiment de résoudre les problèmes de façon efficace dans ton travail ?', type: 'frequency', options: opts, subscale: 'accomplissement', reversed: true },
  ],
  interpretation: [
    {
      min: 0, max: 15,
      label: 'Pas de burnout détecté',
      severity: 'minimal',
      description: 'Ton niveau d\'épuisement professionnel est faible — et c\'est une très bonne chose. Tu sembles garder un bon équilibre entre ce que tu donnes et ce que tu récupères.',
      referralRequired: false,
      recommendation: 'Continue à protéger cet équilibre travail-vie perso. C\'est précieux.',
    },
    {
      min: 16, max: 30,
      label: 'Légère fatigue professionnelle',
      severity: 'mild',
      description: 'Tu montres quelques signes de fatigue professionnelle. Ce n\'est pas encore critique, mais ces signaux méritent ton attention avant que ça ne s\'installe.',
      referralRequired: false,
      recommendation: 'Accorde-toi des vrais moments de récupération, réévalue ta charge de travail et n\'hésite pas à en parler à quelqu\'un de confiance.',
    },
    {
      min: 31, max: 42,
      label: 'Burnout modéré — attention requise',
      severity: 'moderate',
      description: 'Tu présentes des signes modérés de burnout. Ton épuisement émotionnel ou physique commence à déborder sur ta vie pro et perso — et c\'est normal de le ressentir.',
      referralRequired: false,
      recommendation: 'Parles-en à ton médecin traitant. Un arrêt de travail ou un réaménagement de tes conditions peut être nécessaire — et ce n\'est pas un signe de faiblesse.',
      alertLevel: 1,
    },
    {
      min: 43, max: 54,
      label: 'Épuisement sévère — prends soin de toi',
      severity: 'severe',
      description: 'Tu présentes des signes sévères de burnout. Ton niveau d\'épuisement est critique — ton corps et ton esprit t\'envoient un signal fort qu\'il faut écouter.',
      referralRequired: true,
      recommendation: 'Consulte ton médecin le plus tôt possible. Le burnout sévère nécessite un accompagnement adapté — tu n\'as pas à traverser ça {{seul|seule}}.',
      alertLevel: 2,
    },
  ],
};

import type { AssessmentScale } from '../../../types/assessment';

// MBI court : Maslach Burnout Inventory — version courte 9 items
// 3 sous-échelles × 3 items : Épuisement, Dépersonnalisation, Accomplissement (inversé)
// Fréquence 0-6  |  Score 0-54
// Maslach, C., Jackson, S.E., & Leiter, M.P. (1996)

const opts = [
  { value: 0, label: 'Jamais' },
  { value: 1, label: 'Quelques fois par an' },
  { value: 2, label: 'Une fois par mois' },
  { value: 3, label: 'Quelques fois par mois' },
  { value: 4, label: 'Une fois par semaine' },
  { value: 5, label: 'Plusieurs fois par semaine' },
  { value: 6, label: 'Tous les jours' },
];

export const BONUS_BURNOUT: AssessmentScale = {
  id: 'bonus_burnout',
  name: 'Burnout professionnel',
  shortName: 'MBI Court',
  category: 'bonus',
  description: 'Évalue le niveau d\'épuisement professionnel selon les 3 dimensions du burnout : épuisement émotionnel, dépersonnalisation et sens de l\'accomplissement.',
  instructions: 'Ces affirmations portent sur tes sentiments par rapport à ton travail ou tes activités principales. Indique à quelle fréquence tu vis chacune de ces situations.',
  timeEstimateMinutes: 4,
  reference: 'Maslach, C., Jackson, S.E., & Leiter, M.P. (1996). Maslach Burnout Inventory Manual (3e éd.). Consulting Psychologists Press.',
  licenseNote: 'Adaptation courte du MBI pour usage d\'auto-évaluation et de dépistage.',
  warningMessage: 'Le burnout est une condition sérieuse qui nécessite une prise en charge. Ne supporte pas seul(e) — parles-en à ton médecin.',
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
    { id: 1, text: 'Je me sens émotionnellement vidé(e) par mon travail.', type: 'frequency', options: opts, subscale: 'epuisement' },
    { id: 2, text: 'Je me sens épuisé(e) et à plat en fin de journée de travail.', type: 'frequency', options: opts, subscale: 'epuisement' },
    { id: 3, text: 'Je me sens fatigué(e) quand je me lève le matin et que je dois affronter une nouvelle journée de travail.', type: 'frequency', options: opts, subscale: 'epuisement' },

    // Dépersonnalisation
    { id: 4, text: 'Je traite certaines personnes de mon travail de façon impersonnelle, comme des objets.', type: 'frequency', options: opts, subscale: 'depersonnalisation' },
    { id: 5, text: 'Travailler avec les gens tout au long de la journée me demande un effort vraiment épuisant.', type: 'frequency', options: opts, subscale: 'depersonnalisation' },
    { id: 6, text: 'Je ne me soucie plus vraiment de ce qui arrive aux personnes avec qui je travaille.', type: 'frequency', options: opts, subscale: 'depersonnalisation' },

    // Accomplissement personnel (inversé : score élevé = pas de burnout)
    { id: 7, text: 'J\'accomplis des choses qui valent vraiment la peine dans mon travail.', type: 'frequency', options: opts, subscale: 'accomplissement', reversed: true },
    { id: 8, text: 'Je me sens plein(e) d\'énergie et d\'enthousiasme dans mon travail.', type: 'frequency', options: opts, subscale: 'accomplissement', reversed: true },
    { id: 9, text: 'J\'ai le sentiment de résoudre les problèmes de façon efficace dans mon travail.', type: 'frequency', options: opts, subscale: 'accomplissement', reversed: true },
  ],
  interpretation: [
    {
      min: 0, max: 15,
      label: 'Pas de burnout détecté',
      severity: 'minimal',
      description: 'Ton niveau d\'épuisement professionnel est faible. Tu sembles maintenir un bon équilibre entre engagement et ressources.',
      referralRequired: false,
      recommendation: 'Continue à prendre soin de ton équilibre travail-vie personnelle.',
    },
    {
      min: 16, max: 30,
      label: 'Légère fatigue professionnelle',
      severity: 'mild',
      description: 'Tu présentes quelques signes de fatigue professionnelle. Ces signaux méritent attention avant que la situation ne s\'aggrave.',
      referralRequired: false,
      recommendation: 'Accorde-toi des moments de récupération, réévalue ta charge de travail et n\'hésite pas à en parler à quelqu\'un de confiance.',
    },
    {
      min: 31, max: 42,
      label: 'Burnout modéré — attention requise',
      severity: 'moderate',
      description: 'Tu présentes des signes modérés de burnout. Ton épuisement émotionnel ou physique commence à affecter ta vie professionnelle et personnelle.',
      referralRequired: false,
      recommendation: 'Parles-en à ton médecin traitant. Un arrêt de travail ou un réaménagement de tes conditions peut être nécessaire.',
      alertLevel: 1,
    },
    {
      min: 43, max: 54,
      label: 'Burnout sévère — aide urgente recommandée',
      severity: 'severe',
      description: 'Tu présentes des signes sévères de burnout. Ton niveau d\'épuisement est critique et nécessite une prise en charge rapide.',
      referralRequired: true,
      recommendation: 'Consulte ton médecin le plus tôt possible. Le burnout sévère est une urgence médicale qui nécessite un accompagnement adapté.',
      alertLevel: 2,
    },
  ],
};

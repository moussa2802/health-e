import type { ScaleExperience } from '../../types/experience';

export const SOCIAL_PRESSURE_SEX_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quelle fréquence ?',
  tone: 'sober',
  introScreen: {
    title: 'Pression Sociale et Sexualité',
    subtitle: 'Ce test mesure l\'impact des pressions sociales, culturelles et familiales sur ta vie sexuelle. 14 questions. Certaines questions abordent des sujets sensibles. Tu peux t\'arrêter à tout moment sans perdre tes réponses.',
    duration: '5 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image. Si tu traverses un moment difficile, des ressources de soutien sont accessibles depuis le menu.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

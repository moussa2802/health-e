import type { ScaleExperience } from '../../types/experience';

export const SOCIAL_PRESSURE_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point es-tu d\'accord ?',
  tone: 'normal',
  introScreen: {
    title: 'Pression Sociale, Mariage et Genre',
    subtitle: 'Ce test évalue l\'impact des pressions sociales liées au mariage, aux rôles de genre et aux attentes de ton entourage. 12 questions.',
    duration: '5 min',
    tip: 'Réponds selon ce que tu vis réellement, pas ce que tu penses devoir répondre.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'score', shareable: true },
};

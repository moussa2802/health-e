import type { ScaleExperience } from '../../types/experience';

export const GRISS_BASE_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quelle fréquence ?',
  tone: 'normal',
  introScreen: {
    title: 'Communication et Satisfaction dans le Couple',
    subtitle: 'Ce test évalue la communication sexuelle et la satisfaction dans ta relation de couple sur 8 dimensions. 16 questions.',
    duration: '7 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

import type { ScaleExperience } from '../../types/experience';

export const PSS10_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quelle fréquence ?',
  tone: 'normal',
  introScreen: {
    title: 'Stress Perçu',
    subtitle: 'Ce test mesure ton niveau de stress ressenti au cours du dernier mois. 10 questions.',
    duration: '4 min',
    tip: 'Réponds en pensant au mois qui vient de passer, pas à aujourd\'hui uniquement.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'score', shareable: true },
};

import type { ScaleExperience } from '../../types/experience';

export const GAD7_EXPERIENCE: ScaleExperience = {
  input: 'frequency-strip',
  introScreen: {
    title: 'Anxiété généralisée',
    subtitle: 'Ces 7 questions portent sur ce que tu as ressenti au cours des 2 dernières semaines.',
    duration: '3 min',
    tip: 'Choisis la fréquence qui correspond le mieux à ton ressenti.',
  },
  finalScreen: {
    title: 'Évaluation terminée',
    subtitle: 'Ton profil d\'anxiété est prêt.',
  },
  resultCard: { variant: 'score', shareable: true },
};

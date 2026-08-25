import type { ScaleExperience } from '../../types/experience';

export const PHQ9_EXPERIENCE: ScaleExperience = {
  input: 'frequency-strip',
  introScreen: {
    title: 'Ton humeur',
    subtitle: 'Ces 9 questions portent sur ce que tu as ressenti au cours des 2 dernières semaines.',
    duration: '4 min',
    tip: 'Réponds spontanément — il n\'y a pas de bonne réponse.',
  },
  finalScreen: {
    title: 'Évaluation terminée',
    subtitle: 'Ton profil d\'humeur est prêt.',
  },
  resultCard: { variant: 'score', shareable: true },
};

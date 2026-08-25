import type { ScaleExperience } from '../../types/experience';

export const BIG_FIVE_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te ressemble ?',
  introScreen: {
    title: 'Ta personnalité',
    subtitle: 'Ces 10 questions explorent les 5 grandes dimensions de ta personnalité.',
    duration: '5 min',
    tip: 'Il n\'y a pas de bonne ou mauvaise réponse — réponds spontanément.',
  },
  finalScreen: {
    title: 'Évaluation terminée',
    subtitle: 'Ton profil de personnalité est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: true },
};

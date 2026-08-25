import type { ScaleExperience } from '../../types/experience';

export const SISE_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te correspond ?',
  tone: 'normal',
  introScreen: {
    title: 'Identité et Satisfaction Sexuelles',
    subtitle: 'Ce test explore la clarté, la satisfaction et l\'acceptation de ton identité sexuelle. 16 questions.',
    duration: '7 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

import type { ScaleExperience } from '../../types/experience';

export const SIS_SES_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te correspond ?',
  tone: 'normal',
  introScreen: {
    title: 'Excitation et Inhibition Sexuelle',
    subtitle: 'Ce test explore ce qui favorise et ce qui freine ta réponse sexuelle. Trois dimensions : excitation, inhibition par la performance et inhibition par les conséquences. 28 questions.',
    duration: '12 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

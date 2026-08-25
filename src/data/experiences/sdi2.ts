import type { ScaleExperience } from '../../types/experience';

export const SDI2_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  tone: 'normal',
  introScreen: {
    title: 'Désir Sexuel',
    subtitle: 'Ce test mesure ton niveau de désir sexuel selon deux dimensions : envers un ou une partenaire et de façon personnelle. 14 questions.',
    duration: '6 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

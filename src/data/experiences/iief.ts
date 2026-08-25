import type { ScaleExperience } from '../../types/experience';

export const IIEF_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  tone: 'normal',
  introScreen: {
    title: 'Fonctionnement Sexuel Masculin',
    subtitle: 'Ce test s\'adresse aux hommes. Il évalue le fonctionnement sexuel sur 5 domaines : fonction érectile, orgasme, désir, satisfaction des rapports et satisfaction globale. 15 questions portant sur les 4 dernières semaines.',
    duration: '7 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

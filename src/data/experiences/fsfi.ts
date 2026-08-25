import type { ScaleExperience } from '../../types/experience';

export const FSFI_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  tone: 'normal',
  introScreen: {
    title: 'Fonctionnement Sexuel Féminin',
    subtitle: 'Ce test s\'adresse aux femmes. Il évalue le fonctionnement sexuel sur 6 domaines : désir, excitation, lubrification, orgasme, satisfaction et douleur. 19 questions portant sur les 4 dernières semaines.',
    duration: '8 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

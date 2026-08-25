import type { ScaleExperience } from '../../types/experience';

export const NSSS_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point es-tu satisfait(e) ?',
  tone: 'normal',
  introScreen: {
    title: 'Satisfaction Sexuelle Globale',
    subtitle: 'Ce test évalue ta satisfaction sexuelle sur deux axes : ce que tu ressens personnellement et ce que tu vis avec ton ou ta partenaire. 20 questions.',
    duration: '10 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

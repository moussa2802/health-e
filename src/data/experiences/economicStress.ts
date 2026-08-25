import type { ScaleExperience } from '../../types/experience';

export const ECONOMIC_STRESS_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quelle fréquence ?',
  tone: 'normal',
  introScreen: {
    title: 'Stress Économique et Survie',
    subtitle: 'Ce test évalue le stress lié aux difficultés financières, à la précarité et aux obligations familiales. 10 questions portant sur le dernier mois.',
    duration: '4 min',
    tip: 'Réponds selon ta situation réelle, pas celle que tu aimerais avoir.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'score', shareable: true },
};

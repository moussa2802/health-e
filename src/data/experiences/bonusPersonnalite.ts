import type { ScaleExperience } from '../../types/experience';

export const BONUS_PERSONNALITE_EXPERIENCE: ScaleExperience = {
  input: 'binary',
  answerPrompt: 'Est-ce que ça te correspond ?',
  tone: 'playful',
  introScreen: {
    title: 'Tes traits de personnalité, en bref',
    subtitle: '12 questions courtes pour explorer certains schémas de pensée et de comportement qui peuvent influencer ton quotidien.',
    duration: '5 min',
    tip: 'Réponds par oui ou non selon ta première impression.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
};

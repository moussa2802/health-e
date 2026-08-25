import type { ScaleExperience } from '../../types/experience';

export const BONUS_NARCISSISME_EXPERIENCE: ScaleExperience = {
  input: 'forced-choice',
  answerPrompt: 'Laquelle te ressemble le plus ?',
  tone: 'playful',
  introScreen: {
    title: 'Quel rôle joue le narcissisme chez toi ?',
    subtitle: '16 paires d\'affirmations. Pour chacune, choisis celle qui te correspond le mieux — même si aucune n\'est parfaite.',
    duration: '5 min',
    tip: 'Il n\'y a pas de piège : chaque option est valable.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
};

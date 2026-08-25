import type { ScaleExperience } from '../../types/experience';

export const BONUS_JALOUSIE_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quelle fréquence ?',
  tone: 'playful',
  introScreen: {
    title: 'La jalousie a-t-elle de l\'emprise sur toi ?',
    subtitle: 'Ce test évalue l\'intensité de tes réactions de jalousie dans tes relations : la comparaison, la méfiance et l\'insécurité.',
    duration: '5 min',
    tip: 'Sois honnête avec toi-même — ce test reste strictement confidentiel.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
};

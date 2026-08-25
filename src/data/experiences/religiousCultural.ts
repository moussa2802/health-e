import type { ScaleExperience } from '../../types/experience';

export const RELIGIOUS_CULTURAL_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point es-tu d\'accord ?',
  tone: 'normal',
  introScreen: {
    title: 'Impact Religieux et Culturel',
    subtitle: 'Ce test explore la place de ta foi et de ta culture dans ta vie, et leur influence sur ton bien-être. 14 questions.',
    duration: '6 min',
    tip: 'Il n\'y a pas de bonne ou mauvaise réponse. On veut comprendre ton vécu, pas te juger.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'score', shareable: true },
};

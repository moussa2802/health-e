import type { ScaleExperience } from '../../types/experience';

export const BONUS_MANIPULATION_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te ressemble ?',
  tone: 'playful',
  introScreen: {
    title: 'Détectes-tu la manipulation ?',
    subtitle: 'Ce test évalue ta tendance à utiliser — ou à subir — des stratégies de manipulation dans tes relations.',
    duration: '7 min',
    tip: 'Réponds selon ce que tu fais vraiment, pas ce que tu aimerais faire.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
};

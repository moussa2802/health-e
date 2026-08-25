import type { ScaleExperience } from '../../types/experience';

export const BONUS_DEPENDANCE_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te ressemble ?',
  tone: 'playful',
  introScreen: {
    title: 'Ta relation à l\'autre, un équilibre ?',
    subtitle: 'Ce test explore ta dépendance affective : le besoin de l\'autre, la peur de la solitude et la difficulté à poser tes limites.',
    duration: '5 min',
    tip: 'Pense à tes relations en général, pas à un moment isolé.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
};

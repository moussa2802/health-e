import type { ScaleExperience } from '../../types/experience';

export const BONUS_HSP_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te ressemble ?',
  tone: 'playful',
  introScreen: {
    title: 'Es-tu hypersensible ?',
    subtitle: 'Ce test mesure ta sensibilité sensorielle et émotionnelle : ta réactivité aux stimuli, à l\'humeur des autres et à ton environnement.',
    duration: '5 min',
    tip: 'Il n\'y a rien à performer — choisis ce qui te ressemble le plus.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
};

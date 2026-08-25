import type { ScaleExperience } from '../../types/experience';

export const RSES_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point es-tu d\'accord ?',
  introScreen: {
    title: 'Ton estime de soi',
    subtitle: 'Ces 10 questions explorent la perception que tu as de toi-même.',
    duration: '3 min',
    tip: 'Réponds spontanément — il n\'y a pas de bonne réponse.',
  },
  finalScreen: {
    title: 'Évaluation terminée',
    subtitle: 'Ton profil d\'estime de soi est prêt.',
  },
  resultCard: { variant: 'score', shareable: true },
};

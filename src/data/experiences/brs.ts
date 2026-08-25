import type { ScaleExperience } from '../../types/experience';

export const BRS_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point es-tu d\'accord ?',
  introScreen: {
    title: 'Ta résilience',
    subtitle: 'Ces 6 questions explorent ta capacité à rebondir après les moments difficiles.',
    duration: '2 min',
    tip: 'Réponds spontanément — il n\'y a pas de bonne réponse.',
  },
  finalScreen: {
    title: 'Évaluation terminée',
    subtitle: 'Ton profil de résilience est prêt.',
  },
  resultCard: { variant: 'score', shareable: true },
};

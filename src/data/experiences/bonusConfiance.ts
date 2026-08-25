import type { ScaleExperience } from '../../types/experience';

export const BONUS_CONFIANCE_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te ressemble ?',
  tone: 'playful',
  introScreen: {
    title: 'Quelle confiance tu t\'accordes ?',
    subtitle: 'Ce test mesure ta confiance en toi au quotidien : comment tu te perçois, comment tu gères les défis et ce que tu penses de ta valeur.',
    duration: '5 min',
    tip: 'Il n\'y a pas de bonne réponse — fais confiance à ta première impression.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
};

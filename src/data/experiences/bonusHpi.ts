import type { ScaleExperience } from '../../types/experience';

export const BONUS_HPI_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te ressemble ?',
  tone: 'playful',
  introScreen: {
    title: 'Un fonctionnement à haut potentiel ?',
    subtitle: 'Ce test explore les traits souvent associés au haut potentiel intellectuel : la pensée rapide, l\'intensité émotionnelle et le besoin de sens.',
    duration: '5 min',
    tip: 'Réponds selon ce que tu vis habituellement, pas dans tes meilleurs jours.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
};

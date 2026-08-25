import type { ScaleExperience } from '../../types/experience';

export const BONUS_BURNOUT_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quelle fréquence ?',
  tone: 'playful',
  introScreen: {
    title: 'Es-tu au bord du burn-out ?',
    subtitle: 'Ce test évalue trois dimensions de l\'épuisement professionnel : la fatigue émotionnelle, le détachement et le sentiment d\'efficacité.',
    duration: '4 min',
    tip: 'Réponds en pensant à tes dernières semaines au travail.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
  chapters: [
    {
      title: 'Épuisement',
      itemCount: 3,
      transition: 'Ces questions portent sur la fatigue émotionnelle que ton travail peut générer.',
    },
    {
      title: 'Détachement',
      itemCount: 3,
      transition: 'Ces questions portent sur ta distance émotionnelle par rapport aux personnes que tu côtoies au travail.',
    },
    {
      title: 'Accomplissement',
      itemCount: 3,
      transition: 'Ces questions portent sur ton sentiment d\'efficacité et de réalisation au travail.',
    },
  ],
};

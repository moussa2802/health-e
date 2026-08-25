import type { ScaleExperience } from '../../types/experience';

export const BONUS_EQ_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te ressemble ?',
  tone: 'playful',
  introScreen: {
    title: 'Ton intelligence émotionnelle',
    subtitle: 'Ce test explore quatre facettes : comprendre tes émotions, percevoir celles des autres, les utiliser et les réguler.',
    duration: '6 min',
    tip: 'Pense à ta façon de réagir dans la vie de tous les jours.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
  chapters: [
    {
      title: 'Conscience de soi',
      itemCount: 4,
      transition: 'Comment perçois-tu et comprends-tu tes propres émotions ?',
    },
    {
      title: 'Lecture des autres',
      itemCount: 4,
      transition: 'Comment perçois-tu les émotions de ceux qui t\'entourent ?',
    },
    {
      title: 'Utilisation',
      itemCount: 4,
      transition: 'Comment utilises-tu tes émotions pour avancer ?',
    },
    {
      title: 'Régulation',
      itemCount: 4,
      transition: 'Comment gères-tu tes émotions quand elles sont intenses ?',
    },
  ],
  milestones: {
    8: 'Moitié du test passée.',
  },
};

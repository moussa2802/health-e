import type { ScaleExperience } from '../../types/experience';

export const BONUS_TDAH_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quelle fréquence ?',
  tone: 'playful',
  introScreen: {
    title: 'Présentes-tu des signes de TDAH ?',
    subtitle: 'Ce test explore les traits d\'inattention et d\'hyperactivité-impulsivité tels qu\'ils se manifestent au quotidien.',
    duration: '7 min',
    tip: 'Pense à tes six derniers mois, pas seulement aux derniers jours.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'statement', shareable: true },
  chapters: [
    {
      title: 'Attention et organisation',
      itemCount: 6,
      transition: 'Ces questions portent sur ta capacité d\'attention, d\'organisation et de concentration.',
    },
    {
      title: 'Hyperactivité et impulsivité',
      itemCount: 12,
      transition: 'Ces questions portent sur ton niveau d\'agitation, d\'impatience et de contrôle des impulsions.',
    },
  ],
  milestones: {
    12: 'Plus que 6 questions.',
  },
};

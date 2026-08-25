import type { ScaleExperience } from '../../types/experience';

export const ECR_R_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te correspond ?',
  introScreen: {
    title: 'Ton style d\'attachement',
    subtitle: 'Ces questions explorent ta façon de vivre tes relations amoureuses.',
    duration: '10 min',
    tip: 'Pense à tes relations en général, pas à une seule personne.',
  },
  finalScreen: {
    title: 'Évaluation terminée',
    subtitle: 'Ton profil d\'attachement est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: true },
  chapters: [
    {
      title: 'Ta peur de perdre',
      itemCount: 18,
      transition: 'Ces questions portent sur la place que prend la crainte de l’abandon dans tes relations.',
    },
    {
      title: 'Ton besoin de distance',
      itemCount: 18,
      transition: 'Ces questions portent sur ton confort avec la proximité et le fait de compter sur l’autre.',
    },
  ],
  milestones: {
    9: 'Tu es à la moitié du premier chapitre.',
    27: 'Plus que 9 questions.',
  },
};

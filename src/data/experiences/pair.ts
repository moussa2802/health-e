import type { ScaleExperience } from '../../types/experience';

export const PAIR_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça vous correspond ?',
  tone: 'normal',
  introScreen: {
    title: 'Intimité dans la Relation',
    subtitle: 'Ce test évalue la qualité de l\'intimité dans ta relation sur 5 dimensions : émotionnelle, sociale, sexuelle, intellectuelle et récréative. 24 questions.',
    duration: '10 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

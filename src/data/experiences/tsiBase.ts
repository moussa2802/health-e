import type { ScaleExperience } from '../../types/experience';

export const TSI_BASE_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quelle fréquence ?',
  tone: 'sober',
  introScreen: {
    title: 'Traumatismes Sexuels et Détresse Associée',
    subtitle: 'Ce test évalue les symptômes de détresse liés à des expériences sexuelles difficiles : pensées intrusives, évitement, dissociation, honte et détresse. 16 questions. Tu peux t\'arrêter à tout moment.',
    duration: '7 min',
    tip: 'Ton résultat est strictement privé, non partageable et non exportable en image. Si tu traverses un moment difficile, des ressources de soutien sont accessibles depuis le menu.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'dimensions', shareable: false },
};

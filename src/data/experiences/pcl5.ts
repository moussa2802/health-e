import type { ScaleExperience } from '../../types/experience';

export const PCL5_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça t\'a gêné ?',
  tone: 'sober',
  introScreen: {
    title: 'Stress Post-Traumatique',
    subtitle: 'Ce test évalue les symptômes de stress post-traumatique au cours du dernier mois : intrusions, évitement, humeur et hyperactivation. 20 questions. Les questions peuvent réveiller des souvenirs difficiles. Tu peux t\'arrêter à tout moment sans perdre tes réponses.',
    duration: '8 min',
    tip: 'Ton résultat est confidentiel et non partageable. Si tu traverses un moment difficile, des ressources de soutien sont accessibles depuis le menu.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'score', shareable: false },
};

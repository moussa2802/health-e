import type { ScaleExperience } from '../../types/experience';

export const PG13_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  inputByItemType: {
    boolean: 'binary',
    multiple_choice: 'segmented',
  },
  answerPrompt: 'À quel point ça te correspond ?',
  tone: 'sober',
  introScreen: {
    title: 'Deuil Prolongé',
    subtitle: 'Ce test évalue les symptômes de deuil prolongé suite à une perte significative. 13 questions. Les questions peuvent réveiller des souvenirs difficiles. Tu peux t\'arrêter à tout moment sans perdre tes réponses.',
    duration: '6 min',
    tip: 'Ton résultat est confidentiel et non partageable. Si tu traverses un moment difficile, des ressources de soutien sont accessibles depuis le menu.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'score', shareable: false },
};

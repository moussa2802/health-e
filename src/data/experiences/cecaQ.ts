import type { ScaleExperience } from '../../types/experience';

export const CECA_Q_EXPERIENCE: ScaleExperience = {
  input: 'agreement-scale',
  answerPrompt: 'À quel point ça te correspond ?',
  tone: 'sober',
  introScreen: {
    title: 'Carences Affectives de l\'Enfance',
    subtitle: 'Ce test explore les expériences de soins et de maltraitance durant l\'enfance, avant 17 ans. 16 questions. Les questions peuvent réveiller des souvenirs difficiles. Tu peux t\'arrêter à tout moment sans perdre tes réponses.',
    duration: '8 min',
    tip: 'Ton résultat est confidentiel et non partageable. Si tu traverses un moment difficile, des ressources de soutien sont accessibles depuis le menu.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'score', shareable: false },
};

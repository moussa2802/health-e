import type { ScaleExperience } from '../../types/experience';

export const ACE_EXPERIENCE: ScaleExperience = {
  input: 'binary',
  tone: 'sober',
  introScreen: {
    title: 'Expériences Négatives de l\'Enfance',
    subtitle: 'Ce test évalue l\'exposition à des expériences difficiles pendant l\'enfance, avant 18 ans. 10 questions oui/non. Les questions peuvent réveiller des souvenirs difficiles. Tu peux t\'arrêter à tout moment sans perdre tes réponses.',
    duration: '5 min',
    tip: 'Ton résultat est confidentiel et non partageable. Si tu traverses un moment difficile, des ressources de soutien sont accessibles depuis le menu.',
  },
  finalScreen: {
    title: 'Test terminé',
    subtitle: 'Ton résultat est prêt.',
  },
  resultCard: { variant: 'score', shareable: false },
};

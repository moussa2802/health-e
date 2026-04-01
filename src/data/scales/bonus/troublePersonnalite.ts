import type { AssessmentScale } from '../../../types/assessment';

// PDQ-4 adapté + PID-5 court : Dépistage des traits de personnalité problématiques
// 12 items Vrai/Faux (0/1)  |  Score 0-12
// Hyler et al. (1994) PDQ-4 adapté ; APA DSM-5 PID-5 short form

const opts = [
  { value: 0, label: 'Faux — Ce n\'est pas moi' },
  { value: 1, label: 'Vrai — Je me reconnais' },
];

export const BONUS_PERSONNALITE: AssessmentScale = {
  id: 'bonus_personnalite',
  name: 'Traits de personnalité',
  shortName: 'PDQ-4 / PID-5',
  category: 'bonus',
  description: 'Dépistage de traits de personnalité qui peuvent influencer tes relations et ton bien-être, basé sur les critères du DSM-5.',
  instructions: 'Lis chaque affirmation et indique si elle est vraie ou fausse pour toi — en te basant sur comment tu es en général depuis au moins 2 ans, et pas seulement en ce moment.',
  timeEstimateMinutes: 5,
  reference: 'Adapté du Personality Diagnostic Questionnaire-4 (Hyler, 1994) et du PID-5 Short Form (APA, 2013).',
  licenseNote: 'Outil de dépistage adapté pour usage éducatif et d\'auto-évaluation.',
  warningMessage: 'Ce test explore des traits de personnalité — pas un diagnostic. Seul un clinicien peut évaluer un trouble de la personnalité.',
  scoreRange: { min: 0, max: 12 },
  items: [
    { id: 1,  text: 'Je me méfie profondément des gens car je pense souvent qu\'ils veulent me nuire ou me trahir.', type: 'multiple_choice', options: opts },
    { id: 2,  text: 'Je suis très froid(e) et distant(e) dans mes relations — je préfère vraiment être seul(e).', type: 'multiple_choice', options: opts },
    { id: 3,  text: 'J\'ai des expériences inhabituelles — je vois, entends ou ressens des choses que les autres ne perçoivent pas.', type: 'multiple_choice', options: opts },
    { id: 4,  text: 'Mon image de moi, mes émotions et mes relations changent très souvent et de façon instable.', type: 'multiple_choice', options: opts },
    { id: 5,  text: 'J\'ai du mal à prendre des décisions seul(e) — j\'ai besoin d\'une validation excessive des autres.', type: 'multiple_choice', options: opts },
    { id: 6,  text: 'Je me sens supérieur(e) aux autres et je pense mériter un traitement spécial et privilégié.', type: 'multiple_choice', options: opts },
    { id: 7,  text: 'Je suis très perfectionniste et rigide sur les règles — au point que ça crée des problèmes dans ma vie.', type: 'multiple_choice', options: opts },
    { id: 8,  text: 'Je me retrouve souvent seul(e) car les relations avec les autres me semblent trop risquées ou anxiogènes.', type: 'multiple_choice', options: opts },
    { id: 9,  text: 'J\'ai des comportements impulsifs récurrents qui me causent des problèmes (dépenses, substances, alimentation...).', type: 'multiple_choice', options: opts },
    { id: 10, text: 'J\'éprouve peu ou pas de remords lorsque mes actes blessent ou nuisent aux autres.', type: 'multiple_choice', options: opts },
    { id: 11, text: 'Je change souvent de comportement ou d\'attitude selon les personnes pour ne pas être rejeté(e).', type: 'multiple_choice', options: opts },
    { id: 12, text: 'J\'ai des accès de colère intense ou des comportements impulsifs que j\'ai du mal à contrôler.', type: 'multiple_choice', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 2,
      label: 'Peu de traits problématiques détectés',
      severity: 'minimal',
      description: 'Peu de traits de personnalité problématiques ressortent dans ton profil. Tu sembles fonctionner avec une bonne flexibilité émotionnelle et relationnelle.',
      referralRequired: false,
      recommendation: 'Continue à prendre soin de toi et de tes relations.',
    },
    {
      min: 3, max: 5,
      label: 'Quelques traits présents',
      severity: 'mild',
      description: 'Quelques traits de personnalité méritent attention. Ces aspects peuvent influencer certaines de tes relations ou certains aspects de ta vie.',
      referralRequired: false,
      recommendation: 'Explorer ces traits avec un thérapeute peut t\'aider à mieux les comprendre et à les gérer de façon constructive.',
    },
    {
      min: 6, max: 8,
      label: 'Traits significatifs — évaluation recommandée',
      severity: 'moderate',
      description: 'Tu présentes plusieurs traits de personnalité qui méritent une attention sérieuse. Ces traits peuvent impacter significativement tes relations et ton bien-être.',
      referralRequired: false,
      recommendation: 'Un suivi psychologique est recommandé. Ces traits se travaillent — la thérapie (TCC, DBT, schémathérapie) peut faire une grande différence.',
      alertLevel: 1,
    },
    {
      min: 9, max: 12,
      label: 'Indices marqués — consultation recommandée',
      severity: 'severe',
      description: 'Ton profil présente un nombre élevé de traits associés aux troubles de la personnalité. Ces schémas affectent probablement plusieurs domaines de ta vie.',
      referralRequired: true,
      recommendation: 'Une consultation avec un professionnel de santé mentale (psychologue ou psychiatre) est fortement recommandée.',
      alertLevel: 2,
    },
  ],
};

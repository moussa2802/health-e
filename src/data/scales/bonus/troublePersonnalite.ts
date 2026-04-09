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
  instructions: 'Ces affirmations décrivent des façons d\'être et de fonctionner. Indique si ça te correspond en général — depuis au moins 2 ans, pas juste en ce moment 🔍',
  timeEstimateMinutes: 5,
  reference: 'Adapté du Personality Diagnostic Questionnaire-4 (Hyler, 1994) et du PID-5 Short Form (APA, 2013).',
  licenseNote: 'Outil de dépistage adapté pour usage éducatif et d\'auto-évaluation.',
  warningMessage: 'Ce test explore des traits de personnalité — pas un diagnostic. Seul un clinicien peut évaluer un trouble de la personnalité.',
  scoreRange: { min: 0, max: 12 },
  items: [
    { id: 1,  text: 'Tu te méfies profondément des gens parce que tu penses souvent qu\'ils veulent te nuire ou te trahir ?', type: 'multiple_choice', options: opts },
    { id: 2,  text: 'Tu es très {{froid|froide}} et {{distant|distante}} dans tes relations — au fond, tu préfères vraiment être {{seul|seule}} ?', type: 'multiple_choice', options: opts },
    { id: 3,  text: 'Il t\'arrive de voir, d\'entendre ou de ressentir des choses que les autres autour de toi ne semblent pas percevoir ?', type: 'multiple_choice', options: opts },
    { id: 4,  text: 'Ton image de toi, tes émotions et tes relations changent très souvent — comme si rien n\'était jamais vraiment stable ?', type: 'multiple_choice', options: opts },
    { id: 5,  text: 'Tu as du mal à prendre des décisions {{seul|seule}} — tu as besoin que quelqu\'un valide tes choix avant d\'avancer ?', type: 'multiple_choice', options: opts },
    { id: 6,  text: 'Tu te sens {{supérieur|supérieure}} aux autres et tu penses mériter un traitement spécial, différent de tout le monde ?', type: 'multiple_choice', options: opts },
    { id: 7,  text: 'Tu es tellement perfectionniste et rigide sur les règles que ça finit par te créer des problèmes dans ta vie ?', type: 'multiple_choice', options: opts },
    { id: 8,  text: 'Tu te retrouves souvent {{seul|seule}} parce que les relations avec les autres te semblent trop risquées ou trop anxiogènes ?', type: 'multiple_choice', options: opts },
    { id: 9,  text: 'Tu as des comportements impulsifs qui reviennent souvent et qui te causent des problèmes — dépenses, substances, alimentation... ?', type: 'multiple_choice', options: opts },
    { id: 10, text: 'Tu ressens peu ou pas de remords quand tes actes blessent ou font du mal aux autres ?', type: 'multiple_choice', options: opts },
    { id: 11, text: 'Tu changes souvent de comportement ou d\'attitude selon les personnes — pour éviter d\'être {{rejeté|rejetée}} ?', type: 'multiple_choice', options: opts },
    { id: 12, text: 'Tu as des accès de colère intense ou des réactions impulsives que tu as du mal à contrôler ?', type: 'multiple_choice', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 2,
      label: 'Peu de traits problématiques détectés',
      severity: 'minimal',
      description: 'Bonne nouvelle : très peu de traits de personnalité problématiques ressortent dans ton profil. Tu sembles fonctionner avec une belle flexibilité émotionnelle et relationnelle — c\'est une vraie force.',
      referralRequired: false,
      recommendation: 'Continue à prendre soin de toi et de tes relations. Tu es sur une bonne base.',
    },
    {
      min: 3, max: 5,
      label: 'Quelques traits présents',
      severity: 'mild',
      description: 'Quelques traits de personnalité méritent ton attention. Ce n\'est pas alarmant — mais ces aspects peuvent influencer certaines de tes relations ou certains domaines de ta vie sans que tu t\'en rendes toujours compte.',
      referralRequired: false,
      recommendation: 'Explorer ces traits avec {{un|une}} thérapeute peut t\'aider à mieux les comprendre et à les transformer en quelque chose de constructif.',
    },
    {
      min: 6, max: 8,
      label: 'Traits significatifs — évaluation recommandée',
      severity: 'moderate',
      description: 'Plusieurs traits de personnalité ressortent de façon significative dans ton profil. Ces schémas peuvent peser sur tes relations et ton bien-être au quotidien — et tu le ressens peut-être déjà.',
      referralRequired: false,
      recommendation: 'Un suivi psychologique serait vraiment bénéfique. Ces traits se travaillent — la thérapie (TCC, DBT, schémathérapie) peut faire une grande différence dans ta vie.',
      alertLevel: 1,
    },
    {
      min: 9, max: 12,
      label: 'Plusieurs traits marqués — un échange pro serait utile',
      severity: 'severe',
      description: 'Ton profil présente un nombre élevé de traits associés aux troubles de la personnalité. Ces schémas affectent probablement plusieurs domaines de ta vie — mais ce n\'est pas une fatalité.',
      referralRequired: true,
      recommendation: 'Une consultation avec un professionnel spécialisé (psychologue ou psychiatre) est fortement recommandée. Tu mérites un accompagnement adapté pour avancer.',
      alertLevel: 2,
    },
  ],
};

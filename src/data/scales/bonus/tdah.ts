import type { AssessmentScale } from '../../../types/assessment';

// ASRS-v1.1 : Adult ADHD Self-Report Scale — 18 items
// Partie A (6 items screening) + Partie B (12 items complémentaires)
// Score total : 0-72  |  Seuils cliniques : Part A ≥ 14 suggère un TDAH possible
// Kessler et al. (2005) — Échelle validée par l'OMS pour le dépistage du TDAH adulte

const opts = [
  { value: 0, label: 'Jamais' },
  { value: 1, label: 'Rarement' },
  { value: 2, label: 'Parfois' },
  { value: 3, label: 'Souvent' },
  { value: 4, label: 'Très souvent' },
];

export const BONUS_TDAH: AssessmentScale = {
  id: 'bonus_tdah',
  name: 'TDAH (Adulte)',
  shortName: 'ASRS-v1.1',
  category: 'bonus',
  description: 'Dépistage des symptômes du trouble déficitaire de l\'attention avec ou sans hyperactivité (TDAH) chez l\'adulte.',
  instructions: 'Ces questions portent sur la façon dont tu te sens et tu te comportes habituellement. Indique à quelle fréquence chaque situation te concerne.',
  timeEstimateMinutes: 7,
  reference: 'Kessler, R.C. et al. (2005). The World Health Organization Adult ADHD Self-Report Scale (ASRS). Psychological Medicine, 35(2), 245-256.',
  licenseNote: 'ASRS-v1.1 © World Health Organization. Reproduction autorisée pour usage éducatif et de dépistage personnel.',
  warningMessage: 'Ce test est un outil de dépistage — pas un diagnostic. Seul un professionnel de santé peut diagnostiquer le TDAH.',
  scoreRange: { min: 0, max: 72 },
  subscales: [
    {
      key: 'partie_a',
      label: 'Partie A — Screening',
      itemIds: [1, 2, 3, 4, 5, 6],
      range: { min: 0, max: 24 },
    },
    {
      key: 'partie_b',
      label: 'Partie B — Symptômes complémentaires',
      itemIds: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      range: { min: 0, max: 48 },
    },
  ],
  items: [
    // Partie A — Screening (6 items)
    { id: 1,  text: '⬛ PARTIE A\n\nÀ quelle fréquence as-tu du mal à terminer les derniers détails d\'un projet, une fois la partie difficile terminée ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 2,  text: 'À quelle fréquence as-tu du mal à organiser une tâche qui demande de la méthode et de la planification ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 3,  text: 'À quelle fréquence oublies-tu des rendez-vous ou des obligations importantes ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 4,  text: 'Quand tu dois faire quelque chose qui demande de la réflexion, à quelle fréquence tu repousses ou tu évites de commencer ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 5,  text: 'À quelle fréquence bouges-tu les mains ou les pieds, ou tu te tortilles quand tu dois rester assis(e) longtemps ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 6,  text: 'À quelle fréquence te sens-tu trop actif(ve), ou obligé(e) de faire des choses — comme si tu étais propulsé(e) par un moteur ?', type: 'frequency', options: opts, subscale: 'partie_a' },

    // Partie B — Complémentaire (12 items)
    { id: 7,  text: '⬛ PARTIE B\n\nÀ quelle fréquence fais-tu des erreurs d\'inattention dans des travaux difficiles ou ennuyeux ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 8,  text: 'À quelle fréquence as-tu du mal à maintenir ton attention sur un travail monotone ou répétitif ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 9,  text: 'À quelle fréquence as-tu du mal à te concentrer sur ce que quelqu\'un te dit, même quand il s\'adresse directement à toi ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 10, text: 'À quelle fréquence perds-tu des objets dont tu as besoin (clés, téléphone, lunettes, documents...) ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 11, text: 'À quelle fréquence es-tu distrait(e) par les sons ou les activités qui se passent autour de toi ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 12, text: 'À quelle fréquence quittes-tu ta chaise dans des réunions ou des situations où tu dois rester assis(e) ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 13, text: 'À quelle fréquence te sens-tu agité(e), impatient(e) ou à cran, surtout dans des situations calmes ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 14, text: 'À quelle fréquence as-tu du mal à te détendre et à profiter tranquillement de tes temps libres ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 15, text: 'À quelle fréquence parles-tu trop, au point que les autres te le signalent parfois ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 16, text: 'À quelle fréquence termines-tu les phrases des autres ou réponds-tu avant qu\'ils aient fini de parler ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 17, text: 'À quelle fréquence as-tu du mal à attendre ton tour dans une file, une conversation ou une activité collective ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 18, text: 'À quelle fréquence interromps-tu les activités ou les conversations des autres sans t\'en rendre compte ?', type: 'frequency', options: opts, subscale: 'partie_b' },
  ],
  interpretation: [
    {
      min: 0, max: 17,
      label: 'Peu de symptômes détectés',
      severity: 'minimal',
      description: 'Peu de symptômes associés au TDAH sont présents. Ton niveau d\'attention et d\'activité semble dans la norme.',
      referralRequired: false,
      recommendation: 'Si tu ressens des difficultés d\'attention ponctuelles, elles sont probablement liées au stress ou à la surcharge et non au TDAH.',
    },
    {
      min: 18, max: 35,
      label: 'Symptômes légers',
      severity: 'mild',
      description: 'Tu présentes quelques symptômes associés au TDAH, qui peuvent parfois impacter ton organisation ou ta concentration.',
      referralRequired: false,
      recommendation: 'Des stratégies d\'organisation, la pleine conscience ou le coaching peuvent t\'aider. Une évaluation professionnelle peut clarifier la situation si tu le souhaites.',
    },
    {
      min: 36, max: 52,
      label: 'Symptômes modérés — évaluation recommandée',
      severity: 'moderate',
      description: 'Tu présentes un niveau modéré de symptômes associés au TDAH. Ces difficultés d\'attention et/ou d\'hyperactivité méritent une attention particulière.',
      referralRequired: false,
      recommendation: 'Une consultation avec un psychiatre ou un médecin formé au TDAH adulte est recommandée pour une évaluation complète.',
      alertLevel: 1,
    },
    {
      min: 53, max: 72,
      label: 'Symptômes élevés — consultation conseillée',
      severity: 'severe',
      description: 'Tu présentes un nombre élevé de symptômes associés au TDAH adulte. Ces difficultés impactent probablement ton quotidien, ta vie professionnelle ou tes relations.',
      referralRequired: true,
      recommendation: 'Une consultation avec un spécialiste est fortement conseillée. Le TDAH se traite efficacement — et de nombreuses personnes connaissent une transformation importante après un bon accompagnement.',
      alertLevel: 1,
    },
  ],
};

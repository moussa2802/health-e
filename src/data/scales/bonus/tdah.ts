import type { AssessmentScale } from '../../../types/assessment';

// ASRS-v1.1 : Adult ADHD Self-Report Scale — 18 items
// Partie A (6 items screening) + Partie B (12 items complémentaires)
// Score total : 0-72  |  Seuils cliniques : Part A ≥ 14 suggère un TDAH possible
// Kessler et al. (2005) — Échelle validée par l'OMS pour le dépistage du TDAH adulte

const opts = [
  { value: 0, label: 'Jamais', subtitle: "Ça ne m'arrive pas" },
  { value: 1, label: 'Rarement', subtitle: "Quelques fois par an tout au plus" },
  { value: 2, label: 'Parfois', subtitle: "De temps en temps" },
  { value: 3, label: 'Souvent', subtitle: "Régulièrement, plusieurs fois par semaine" },
  { value: 4, label: 'Très souvent', subtitle: "Quasiment tous les jours" },
];

export const BONUS_TDAH: AssessmentScale = {
  id: 'bonus_tdah',
  name: 'TDAH (Adulte)',
  shortName: 'ASRS-v1.1',
  category: 'bonus',
  description: 'Dépistage des symptômes du trouble déficitaire de l\'attention avec ou sans hyperactivité (TDAH) chez l\'adulte.',
  instructions: 'Ces questions portent sur ta façon de fonctionner au quotidien — concentration, organisation, énergie. Réponds selon ce qui te correspond en général, pas juste aujourd\'hui 🧠',
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
    { id: 1,  text: 'Quand le plus dur d\'un projet est fait, tu galères à boucler les derniers détails ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 2,  text: 'Organiser une tâche qui demande de la méthode et de la planification, c\'est un vrai casse-tête pour toi ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 3,  text: 'Il t\'arrive d\'oublier des rendez-vous ou des obligations importantes — même quand c\'est noté quelque part ? 📅', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 4,  text: 'Face à une tâche qui demande de la réflexion, tu repousses ou tu évites carrément de commencer ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 5,  text: 'Quand tu dois rester {{assis|assise}} longtemps, tes mains, tes pieds ou ton corps ne tiennent pas en place ?', type: 'frequency', options: opts, subscale: 'partie_a' },
    { id: 6,  text: 'Tu te sens parfois {{propulsé|propulsée}} par un moteur interne — trop {{actif|active}}, {{obligé|obligée}} de faire quelque chose en permanence ? ⚡', type: 'frequency', options: opts, subscale: 'partie_a' },

    // Partie B — Complémentaire (12 items)
    { id: 7,  text: 'Sur les tâches difficiles ou ennuyeuses, tu fais des erreurs d\'inattention — des trucs bêtes qui t\'échappent ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 8,  text: 'Maintenir ton attention sur un travail monotone ou répétitif, c\'est vraiment galère pour toi ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 9,  text: 'Même quand quelqu\'un te parle directement, ton esprit part ailleurs et tu perds le fil de ce qu\'il dit ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 10, text: 'Tu perds régulièrement tes affaires — clés, téléphone, lunettes, documents... ? 🔑', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 11, text: 'Les bruits ou les activités autour de toi te distraient facilement, même quand tu essaies de te concentrer ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 12, text: 'En réunion ou dans une situation où tu dois rester {{assis|assise}}, tu finis par te lever — impossible de rester en place ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 13, text: 'Dans les moments calmes, tu te sens {{agité|agitée}}, {{impatient|impatiente}} ou à cran — comme si le calme te pesait ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 14, text: 'Profiter tranquillement de tes temps libres sans rien faire, c\'est difficile pour toi — tu as du mal à te poser ? 🛋️', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 15, text: 'On t\'a déjà fait remarquer que tu parles trop ou que tu monopolises la conversation sans t\'en rendre compte ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 16, text: 'Tu finis les phrases des autres ou tu réponds avant qu\'ils aient terminé de parler ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 17, text: 'Attendre ton tour — dans une file, une conversation, une activité — ça te demande un effort considérable ?', type: 'frequency', options: opts, subscale: 'partie_b' },
    { id: 18, text: 'Tu interromps les conversations ou les activités des autres sans t\'en rendre compte — et tu le réalises après coup ?', type: 'frequency', options: opts, subscale: 'partie_b' },
  ],
  interpretation: [
    {
      min: 0, max: 17,
      label: 'Peu de symptômes détectés',
      severity: 'minimal',
      description: 'Peu de symptômes associés au TDAH sont présents chez toi. Ton niveau d\'attention et d\'activité semble dans la norme — rien d\'inquiétant de ce côté.',
      referralRequired: false,
      recommendation: 'Si tu ressens des difficultés d\'attention ponctuelles, elles sont probablement liées au stress ou à la surcharge — pas au TDAH. Prends soin de ton sommeil et de ton rythme.',
    },
    {
      min: 18, max: 35,
      label: 'Symptômes légers',
      severity: 'mild',
      description: 'Tu présentes quelques symptômes qui peuvent ressembler au TDAH — des moments où l\'organisation ou la concentration te posent problème. C\'est à surveiller, sans dramatiser.',
      referralRequired: false,
      recommendation: 'Des stratégies d\'organisation, la pleine conscience ou le coaching peuvent t\'aider au quotidien. Si tu veux en avoir le cœur net, une évaluation professionnelle peut clarifier les choses.',
    },
    {
      min: 36, max: 52,
      label: 'Symptômes modérés — évaluation recommandée',
      severity: 'moderate',
      description: 'Tu présentes un niveau modéré de symptômes associés au TDAH. Ces difficultés d\'attention et/ou d\'hyperactivité méritent qu\'on s\'y intéresse sérieusement.',
      referralRequired: false,
      recommendation: 'Une consultation avec un psychiatre ou un médecin formé au TDAH adulte est recommandée. Comprendre comment ton cerveau fonctionne, c\'est le premier pas vers des solutions concrètes.',
      alertLevel: 1,
    },
    {
      min: 53, max: 72,
      label: 'Fonctionnement très compatible TDAH',
      severity: 'severe',
      description: 'Tu présentes un nombre élevé de symptômes associés au TDAH adulte. Ces difficultés impactent probablement ton quotidien — travail, relations, gestion du temps. La bonne nouvelle ? Le TDAH, ça se comprend et ça se gère.',
      referralRequired: true,
      recommendation: 'Une consultation avec un spécialiste est vraiment conseillée. Beaucoup de personnes vivent une vraie transformation après un bon diagnostic et un accompagnement adapté — tu mérites d\'avoir les clés pour fonctionner à ton plein potentiel 🚀',
      alertLevel: 1,
    },
  ],
};

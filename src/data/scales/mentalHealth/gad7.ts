import type { AssessmentScale } from '../../../types/assessment';

// GAD-7 : Generalized Anxiety Disorder 7-item scale (Spitzer et al., 2006)
// 7 items scorés 0-3 + 1 question fonctionnelle (noScore=true, hors calcul)
// Score total : 0-21  |  Seuils : 0-4 minimal / 5-9 léger / 10-14 modéré / 15-21 sévère
// Alerte item 7 uniquement si "Presque tous les jours" (valeur 3)

const opts = [
  { value: 0, label: "Jamais", subtitle: "Pas une seule fois" },
  { value: 1, label: "Plusieurs jours", subtitle: "Quelques jours sur les 14" },
  { value: 2, label: "Plus de la moitié du temps", subtitle: "7 jours ou plus" },
  { value: 3, label: "Presque tous les jours", subtitle: "Quasiment en permanence" },
];

const functionalOpts = [
  { value: 1, label: "Pas du tout difficile", subtitle: "Aucun impact sur mon quotidien" },
  { value: 2, label: "Un peu difficile", subtitle: "Ça complique un peu les choses" },
  { value: 3, label: "Assez difficile", subtitle: "Ça me gêne vraiment" },
  { value: 4, label: "Extrêmement difficile", subtitle: "Je n'arrive presque plus à fonctionner" },
];

export const GAD7: AssessmentScale = {
  id: 'gad7',
  name: "Trouble Anxieux Généralisé",
  shortName: "GAD-7",
  category: 'mental_health',
  description: "Mesure la sévérité de l'anxiété généralisée au cours des 2 dernières semaines.",
  instructions: "Au cours des 2 dernières semaines, à quelle fréquence as-tu été gêné(e) par les problèmes suivants :",
  timeEstimateMinutes: 3,
  reference: "Spitzer, R.L., Kroenke, K., Williams, J.B.W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166(10), 1092–1097.",
  adaptationNote: "Traduction validée FR, adaptée au tutoiement (registre uniquement). Aucun changement de contenu ni d'ordre des items.",
  licenseNote: "Domaine public. Libre de droits.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 21 },
  // ALERTE item 7 : seulement si "Presque tous les jours" (valeur 3)
  // À croiser avec PHQ-9 item 9 pour évaluation globale du risque
  alertItems: [
    {
      itemId: 7,
      minValue: 3,
      alertLevel: 2,
      message: "Tu as indiqué ressentir presque tous les jours la peur qu'il t'arrive quelque chose de terrible. Cette peur persistante mérite l'attention d'un professionnel — il existe des approches efficaces pour t'aider.",
    },
  ],
  items: [
    {
      id: 1,
      text: "Un sentiment de nervosité, d'anxiété ou de tension",
      type: 'frequency',
      options: opts,
    },
    {
      id: 2,
      text: "Une incapacité à arrêter de s'inquiéter ou à contrôler ses inquiétudes",
      type: 'frequency',
      options: opts,
    },
    {
      id: 3,
      text: "Une inquiétude excessive à propos de différentes choses",
      type: 'frequency',
      options: opts,
    },
    {
      id: 4,
      text: "Des difficultés à se détendre",
      type: 'frequency',
      options: opts,
    },
    {
      id: 5,
      text: "Une agitation telle qu'il est difficile de tenir en place",
      type: 'frequency',
      options: opts,
    },
    {
      id: 6,
      text: "Une tendance à être facilement contrarié(e) ou irritable",
      type: 'frequency',
      options: opts,
    },
    {
      id: 7,
      text: "Un sentiment de peur comme si quelque chose de terrible risquait de se produire",
      type: 'frequency',
      options: opts,
    },
    {
      // Question de sévérité fonctionnelle — obligatoire cliniquement, exclue du score total
      id: 8,
      text: "Si tu as vécu une ou plusieurs de ces situations : dans quelle mesure ça a rendu les choses difficiles — ton travail, la maison, ta vie sociale ?",
      type: 'multiple_choice',
      options: functionalOpts,
      noScore: true,
    },
  ],
  interpretation: [
    {
      min: 0,  max: 4,
      label: "Anxiété minimale",
      severity: 'minimal',
      description: "Ton niveau d'anxiété est bas — c'est plutôt rassurant. On est dans la zone normale, pas de signal d'alerte ici",
      referralRequired: false,
      recommendation: "Continue ce que tu fais déjà pour prendre soin de toi — tes habitudes de bien-être fonctionnent. Garde un œil dessus si ça change."
    },
    {
      min: 5,  max: 9,
      label: "Anxiété légère",
      severity: 'mild',
      alertLevel: 1,
      description: "Il y a un peu d'anxiété qui flotte — rien de dramatique, mais c'est assez présent pour que tu le ressentes au quotidien.",
      referralRequired: false,
      recommendation: "Des choses simples peuvent vraiment aider : la respiration, la marche, la pleine conscience. Bouge ton corps, ça calme la tête"
    },
    {
      min: 10, max: 14,
      label: "Stress bien présent",
      severity: 'moderate',
      alertLevel: 1,
      description: "L'anxiété prend de la place dans ta vie — elle touche ton quotidien, ton travail, tes relations. C'est important de ne pas la laisser s'installer.",
      referralRequired: false,
      recommendation: "Parler à un professionnel (psychologue ou médecin) pourrait vraiment t'aider à comprendre ce qui se passe et à retrouver du calme. Tu mérites ça"
    },
    {
      min: 15, max: 21,
      label: "Anxiété forte",
      severity: 'severe',
      alertLevel: 2,
      description: "Ce que tu vis est intense — et c'est normal que ça te pèse. L'anxiété à ce niveau peut vraiment épuiser, mais sache que ça se soigne bien quand on est {{accompagné|accompagnée}}.",
      referralRequired: true,
      recommendation: "Prends rendez-vous avec un médecin ou un psychologue — il existe des approches qui marchent vraiment (thérapie, soutien, parfois un coup de pouce médical). Tu n'as pas à gérer ça {{seul|seule}}"
    },
  ],
};

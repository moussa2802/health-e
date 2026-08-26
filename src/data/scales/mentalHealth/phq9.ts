import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Plusieurs jours" },
  { value: 2, label: "Plus de la moitié du temps" },
  { value: 3, label: "Presque tous les jours" },
];

export const PHQ9: AssessmentScale = {
  id: 'phq9',
  code: 'P2',
  name: "Questionnaire sur la santé du patient",
  shortName: "PHQ-9",
  category: 'mental_health',
  description: "Dépistage et mesure de la sévérité des symptômes dépressifs.",
  instructions: "Au cours des 2 dernières semaines, à quelle fréquence as-tu été gêné(e) par les problèmes suivants :",
  timeEstimateMinutes: 3,
  reference: "Kroenke, K., Spitzer, R.L., & Williams, J.B. (2001). The PHQ-9. Journal of General Internal Medicine, 16(9), 606–613.",
  licenseNote: "Libre de droits — autorisation Pfizer.",
  adaptationNote: "Traduction validée FR, adaptée au tutoiement (registre uniquement). Aucun changement de contenu ni d'ordre des items.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 27 },
  // ALERTE CRITIQUE : item 9 (pensées suicidaires) — tout score ≥ 1 déclenche l'alerte niveau 3
  alertItems: [
    {
      itemId: 9,
      minValue: 1,
      alertLevel: 3,
      message: "Tu as mentionné avoir des pensées de te faire du mal ou que tu serais mieux {{mort|morte}}. C'est très important et tu n'es pas {{seul|seule}}. Des personnes sont là pour t'aider maintenant.",
    },
  ],
  items: [
    { id: 1, text: "Peu d'intérêt ou de plaisir à faire les choses", type: 'frequency', options: opts },
    { id: 2, text: "Te sentir triste, déprimé(e) ou désespéré(e)", type: 'frequency', options: opts },
    { id: 3, text: "Difficultés à t'endormir, à rester endormi(e), ou trop dormir", type: 'frequency', options: opts },
    { id: 4, text: "Te sentir fatigué(e) ou avoir peu d'énergie", type: 'frequency', options: opts },
    { id: 5, text: "Peu d'appétit ou trop d'appétit", type: 'frequency', options: opts },
    { id: 6, text: "Mauvaise perception de toi-même — tu penses que tu es un(e) perdant(e) ou que tu n'as pas satisfait tes propres attentes ou celles de ta famille", type: 'frequency', options: opts },
    { id: 7, text: "Difficultés à te concentrer sur des choses telles que lire le journal ou regarder la télévision", type: 'frequency', options: opts },
    { id: 8, text: "Tu bouges ou tu parles si lentement que les autres ont pu le remarquer ; ou au contraire tu es si agité(e) que tu bouges beaucoup plus que d'habitude", type: 'frequency', options: opts },
    { id: 9, text: "Tu as pensé que tu serais mieux mort(e), ou pensé à te blesser d'une façon ou d'une autre", type: 'frequency', options: opts },
  ],
  interpretation: [
    { min: 0,  max: 4,  label: "Moral plutôt bon",                    severity: 'none',     description: "Pas de signes dépressifs significatifs — ton moral tient la route", referralRequired: false, recommendation: "Continue à prendre soin de toi et à cultiver ce qui te fait du bien au quotidien." },
    { min: 5,  max: 9,  label: "Petite baisse de moral",              severity: 'mild',     description: "Il y a un petit voile sur ton humeur — rien d'alarmant, mais c'est assez présent pour que tu le ressentes.", referralRequired: false, recommendation: "Bouger, voir du monde, garder un rythme de sommeil régulier — ces petites choses font une vraie différence. Observe comment ça évolue" },
    { min: 10, max: 14, label: "Baisse de moral",                     severity: 'moderate', description: "Ta baisse de moral est bien réelle et elle mérite qu'on s'en occupe. Ce n'est pas « dans ta tête » — c'est un signal que quelque chose a besoin d'attention.", referralRequired: false, recommendation: "Parler à un professionnel (psychologue ou médecin) peut t'aider à y voir plus clair et à retrouver un élan. Tu mérites ce soutien." },
    { min: 15, max: 19, label: "Période difficile",                   severity: 'severe',   description: "Ce que tu traverses est lourd — et ça pèse sur ta vie de tous les jours. Ce n'est pas une faiblesse, c'est un signal que ton corps et ton esprit ont besoin d'aide.", referralRequired: true, recommendation: "Consulter un médecin ou un psychologue rapidement est vraiment important. Il existe des solutions qui marchent — thérapie, accompagnement, parfois un traitement. Tu n'as pas à porter ça {{seul|seule}}" },
    { min: 20, max: 27, label: "Période très difficile",              severity: 'severe',   description: "Tu traverses une période vraiment difficile. Ce que tu ressens est intense et mérite une attention sérieuse — mais sache qu'il existe des solutions efficaces.", referralRequired: true, recommendation: "Parler à un médecin ou un psychologue rapidement peut faire une vraie différence. Tu n'as pas à porter ça {{seul|seule}}." },
  ],
};

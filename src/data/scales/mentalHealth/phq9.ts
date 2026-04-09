import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Plusieurs jours" },
  { value: 2, label: "Plus de la moitié du temps" },
  { value: 3, label: "Presque tous les jours" },
];

export const PHQ9: AssessmentScale = {
  id: 'phq9',
  name: "Questionnaire sur la santé du patient",
  shortName: "PHQ-9",
  category: 'mental_health',
  description: "Dépistage et mesure de la sévérité des symptômes dépressifs.",
  instructions: "Ces 2 dernières semaines, dis-moi combien de fois ces situations t'ont {{concerné|concernée}} :",
  timeEstimateMinutes: 3,
  reference: "Kroenke, K., Spitzer, R.L., & Williams, J.B. (2001). The PHQ-9. Journal of General Internal Medicine, 16(9), 606–613.",
  licenseNote: "Libre de droits — autorisation Pfizer.",
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
    { id: 1, text: "Des choses qui te plaisaient avant te semblent un peu... vides ? Comme si la saveur avait disparu 🍽️", type: 'frequency', options: opts },
    { id: 2, text: "Est-ce qu'il t'arrive de te réveiller le matin avec ce sentiment lourd que rien ne va vraiment aller mieux ?", type: 'frequency', options: opts },
    { id: 3, text: "Tu as du mal à t'endormir ou tu te réveilles trop tôt sans pouvoir te rendormir ?", type: 'frequency', options: opts },
    { id: 4, text: "Tu te sens souvent {{fatigué|fatiguée}} ou à plat, même après avoir dormi ?", type: 'frequency', options: opts },
    { id: 5, text: "Ton appétit a changé — tu manges moins que d'habitude ?", type: 'frequency', options: opts },
    { id: 6, text: "Est-ce qu'il t'arrive de te trouver {{nul|nulle}}, ou de te dire que tu as déçu des gens autour de toi ?", type: 'frequency', options: opts },
    { id: 7, text: "Tu as du mal à te concentrer — lire, regarder un film, suivre une conversation ?", type: 'frequency', options: opts },
    { id: 8, text: "Est-ce que les autres ont remarqué que tu bouges ou parles plus lentement que d'habitude ?", type: 'frequency', options: opts },
    { id: 9, text: "Est-ce qu'il t'arrive d'avoir des pensées comme « je serais mieux {{mort|morte}} » ou l'idée de te faire du mal ? (Cette question est importante — sois honnête avec toi-même 🤍)", type: 'frequency', options: opts },
  ],
  interpretation: [
    { min: 0,  max: 4,  label: "Moral plutôt bon",                    severity: 'none',     description: "Pas de signes dépressifs significatifs — ton moral tient la route 😌", referralRequired: false, recommendation: "Continue à prendre soin de toi et à cultiver ce qui te fait du bien au quotidien." },
    { min: 5,  max: 9,  label: "Petite baisse de moral",              severity: 'mild',     description: "Il y a un petit voile sur ton humeur — rien d'alarmant, mais c'est assez présent pour que tu le ressentes.", referralRequired: false, recommendation: "Bouger, voir du monde, garder un rythme de sommeil régulier — ces petites choses font une vraie différence. Observe comment ça évolue 💛" },
    { min: 10, max: 14, label: "Baisse de moral",                     severity: 'moderate', description: "Ta baisse de moral est bien réelle et elle mérite qu'on s'en occupe. Ce n'est pas « dans ta tête » — c'est un signal que quelque chose a besoin d'attention.", referralRequired: false, recommendation: "Parler à un professionnel (psychologue ou médecin) peut t'aider à y voir plus clair et à retrouver un élan. Tu mérites ce soutien." },
    { min: 15, max: 19, label: "Période difficile",                   severity: 'severe',   description: "Ce que tu traverses est lourd — et ça pèse sur ta vie de tous les jours. Ce n'est pas une faiblesse, c'est un signal que ton corps et ton esprit ont besoin d'aide.", referralRequired: true, recommendation: "Consulter un médecin ou un psychologue rapidement est vraiment important. Il existe des solutions qui marchent — thérapie, accompagnement, parfois un traitement. Tu n'as pas à porter ça {{seul|seule}} 🤝" },
    { min: 20, max: 27, label: "Période très difficile",              severity: 'severe',   description: "Tu traverses une période vraiment difficile. Ce que tu ressens est intense et mérite une attention sérieuse — mais sache qu'il existe des solutions efficaces.", referralRequired: true, recommendation: "Parler à un médecin ou un psychologue rapidement peut faire une vraie différence. Tu n'as pas à porter ça {{seul|seule}}." },
  ],
};

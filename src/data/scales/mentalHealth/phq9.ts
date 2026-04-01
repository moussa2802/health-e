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
  instructions: "Ces 2 dernières semaines, dis-moi combien de fois ces situations t'ont concerné(e) :",
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
      message: "Tu as mentionné avoir des pensées de te faire du mal ou que tu serais mieux mort(e). C'est très important et tu n'es pas seul(e). Des personnes sont là pour t'aider maintenant.",
    },
  ],
  items: [
    { id: 1, text: "Des choses qui te plaisaient avant te semblent un peu... vides ? Comme si la saveur avait disparu 🍽️", type: 'frequency', options: opts },
    { id: 2, text: "Est-ce qu'il t'arrive de te réveiller le matin avec ce sentiment lourd que rien ne va vraiment aller mieux ?", type: 'frequency', options: opts },
    { id: 3, text: "Tu as du mal à t'endormir ou tu te réveilles trop tôt sans pouvoir te rendormir ?", type: 'frequency', options: opts },
    { id: 4, text: "Tu te sens souvent fatigué(e) ou à plat, même après avoir dormi ?", type: 'frequency', options: opts },
    { id: 5, text: "Ton appétit a changé — tu manges moins que d'habitude ?", type: 'frequency', options: opts },
    { id: 6, text: "Est-ce qu'il t'arrive de te trouver nul(le), ou de te dire que tu as déçu des gens autour de toi ?", type: 'frequency', options: opts },
    { id: 7, text: "Tu as du mal à te concentrer — lire, regarder un film, suivre une conversation ?", type: 'frequency', options: opts },
    { id: 8, text: "Est-ce que les autres ont remarqué que tu bouges ou parles plus lentement que d'habitude ?", type: 'frequency', options: opts },
    { id: 9, text: "Est-ce qu'il t'arrive d'avoir des pensées comme « je serais mieux mort(e) » ou l'idée de te faire du mal ? (Cette question est importante — sois honnête avec toi-même 🤍)", type: 'frequency', options: opts },
  ],
  interpretation: [
    { min: 0,  max: 4,  label: "Aucune dépression",                severity: 'none',     description: "Pas de symptômes dépressifs significatifs.", referralRequired: false, recommendation: "Continuez à prendre soin de votre bien-être." },
    { min: 5,  max: 9,  label: "Dépression légère",                severity: 'mild',     description: "Symptômes légers pouvant affecter le quotidien.", referralRequired: false, recommendation: "Activité physique, soutien social et surveillance conseillés." },
    { min: 10, max: 14, label: "Dépression modérée",               severity: 'moderate', description: "Symptômes modérés nécessitant attention.", referralRequired: false, recommendation: "Consultation avec un professionnel de santé mentale recommandée." },
    { min: 15, max: 19, label: "Dépression modérément sévère",     severity: 'severe',   description: "Symptômes importants impactant significativement la vie.", referralRequired: true, recommendation: "Consultation avec un médecin ou psychiatre fortement recommandée." },
    { min: 20, max: 27, label: "Dépression sévère",                severity: 'severe',   description: "Dépression sévère nécessitant une prise en charge immédiate.", referralRequired: true, recommendation: "Consultation urgente nécessaire. Parlez à un professionnel de santé." },
  ],
};

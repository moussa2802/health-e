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
  instructions: "Au cours des 2 dernières semaines, à quelle fréquence avez-vous été dérangé(e) par les problèmes suivants ?",
  timeEstimateMinutes: 3,
  reference: "Kroenke, K., Spitzer, R.L., & Williams, J.B. (2001). The PHQ-9. Journal of General Internal Medicine, 16(9), 606–613.",
  licenseNote: "Libre de droits — autorisation Pfizer.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 27 },
  items: [
    { id: 1, text: "Peu d'intérêt ou de plaisir à faire les choses", type: 'frequency', options: opts },
    { id: 2, text: "Se sentir triste, déprimé(e) ou désespéré(e)", type: 'frequency', options: opts },
    { id: 3, text: "Difficultés à s'endormir, à rester endormi(e), ou dormir trop", type: 'frequency', options: opts },
    { id: 4, text: "Se sentir fatigué(e) ou manquer d'énergie", type: 'frequency', options: opts },
    { id: 5, text: "Manque d'appétit ou manger trop", type: 'frequency', options: opts },
    { id: 6, text: "Mauvaise opinion de soi-même — avoir le sentiment d'être un(e) raté(e) ou d'avoir déçu sa famille", type: 'frequency', options: opts },
    { id: 7, text: "Difficultés à se concentrer sur des choses comme lire ou regarder la télévision", type: 'frequency', options: opts },
    { id: 8, text: "Bouger ou parler si lentement que les autres ont pu le remarquer, ou être si agité(e) que vous bougez plus que d'habitude", type: 'frequency', options: opts },
    { id: 9, text: "Avoir des pensées comme vous seriez mieux mort(e) ou l'idée de vous faire du mal", type: 'frequency', options: opts },
  ],
  interpretation: [
    { min: 0,  max: 4,  label: "Aucune dépression",                severity: 'none',     description: "Pas de symptômes dépressifs significatifs.", referralRequired: false, recommendation: "Continuez à prendre soin de votre bien-être." },
    { min: 5,  max: 9,  label: "Dépression légère",                severity: 'mild',     description: "Symptômes légers pouvant affecter le quotidien.", referralRequired: false, recommendation: "Activité physique, soutien social et surveillance conseillés." },
    { min: 10, max: 14, label: "Dépression modérée",               severity: 'moderate', description: "Symptômes modérés nécessitant attention.", referralRequired: false, recommendation: "Consultation avec un professionnel de santé mentale recommandée." },
    { min: 15, max: 19, label: "Dépression modérément sévère",     severity: 'severe',   description: "Symptômes importants impactant significativement la vie.", referralRequired: true, recommendation: "Consultation avec un médecin ou psychiatre fortement recommandée." },
    { min: 20, max: 27, label: "Dépression sévère",                severity: 'severe',   description: "Dépression sévère nécessitant une prise en charge immédiate.", referralRequired: true, recommendation: "Consultation urgente nécessaire. Parlez à un professionnel de santé." },
  ],
};

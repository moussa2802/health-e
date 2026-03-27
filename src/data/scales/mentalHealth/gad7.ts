import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Plusieurs jours" },
  { value: 2, label: "Plus de la moitié du temps" },
  { value: 3, label: "Presque tous les jours" },
];

export const GAD7: AssessmentScale = {
  id: 'gad7',
  name: "Trouble anxieux généralisé",
  shortName: "GAD-7",
  category: 'mental_health',
  description: "Mesure la sévérité de l'anxiété généralisée au cours des 2 dernières semaines.",
  instructions: "Au cours des 2 dernières semaines, à quelle fréquence avez-vous été dérangé(e) par les problèmes suivants ?",
  timeEstimateMinutes: 3,
  reference: "Spitzer, R.L., et al. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166(10), 1092–1097.",
  licenseNote: "Domaine public. Libre de droits.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 0, max: 21 },
  items: [
    { id: 1, text: "Vous sentir nerveux(se), anxieux(se) ou à bout", type: 'frequency', options: opts },
    { id: 2, text: "Ne pas être capable d'arrêter de vous inquiéter ou de contrôler vos inquiétudes", type: 'frequency', options: opts },
    { id: 3, text: "Vous inquiéter trop à propos de différentes choses", type: 'frequency', options: opts },
    { id: 4, text: "Avoir du mal à vous relaxer", type: 'frequency', options: opts },
    { id: 5, text: "Être tellement agité(e) qu'il vous est difficile de rester en place", type: 'frequency', options: opts },
    { id: 6, text: "Devenir facilement irritable ou irrité(e)", type: 'frequency', options: opts },
    { id: 7, text: "Avoir peur qu'il vous arrive quelque chose de terrible", type: 'frequency', options: opts },
  ],
  interpretation: [
    { min: 0,  max: 4,  label: "Anxiété minimale",  severity: 'minimal',  description: "Niveau d'anxiété faible, dans la norme.", referralRequired: false, recommendation: "Maintenez vos habitudes de bien-être." },
    { min: 5,  max: 9,  label: "Anxiété légère",    severity: 'mild',     description: "Présence de quelques symptômes anxieux.", referralRequired: false, recommendation: "Techniques de relaxation et mindfulness recommandées." },
    { min: 10, max: 14, label: "Anxiété modérée",   severity: 'moderate', description: "Symptômes anxieux significatifs impactant le quotidien.", referralRequired: false, recommendation: "Consultation avec un professionnel de santé mentale conseillée." },
    { min: 15, max: 21, label: "Anxiété sévère",    severity: 'severe',   description: "Anxiété sévère nécessitant une attention professionnelle.", referralRequired: true, recommendation: "Consultation urgente avec un médecin ou psychologue recommandée." },
  ],
};

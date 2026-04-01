import type { AssessmentScale } from '../../../types/assessment';

// GAD-7 : Generalized Anxiety Disorder 7-item scale (Spitzer et al., 2006)
// 7 items scorés 0-3 + 1 question fonctionnelle (noScore=true, hors calcul)
// Score total : 0-21  |  Seuils : 0-4 minimal / 5-9 léger / 10-14 modéré / 15-21 sévère
// Alerte item 7 uniquement si "Presque tous les jours" (valeur 3)

const opts = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Plusieurs jours" },
  { value: 2, label: "Plus de la moitié du temps" },
  { value: 3, label: "Presque tous les jours" },
];

const functionalOpts = [
  { value: 1, label: "Pas du tout difficile" },
  { value: 2, label: "Un peu difficile" },
  { value: 3, label: "Assez difficile" },
  { value: 4, label: "Extrêmement difficile" },
];

export const GAD7: AssessmentScale = {
  id: 'gad7',
  name: "Trouble Anxieux Généralisé",
  shortName: "GAD-7",
  category: 'mental_health',
  description: "Mesure la sévérité de l'anxiété généralisée au cours des 2 dernières semaines.",
  instructions: "Ces 2 dernières semaines, dis-moi combien de fois ces situations t'ont concerné(e) :",
  timeEstimateMinutes: 3,
  reference: "Spitzer, R.L., Kroenke, K., Williams, J.B.W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166(10), 1092–1097.",
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
      text: "T'arrive-t-il de te sentir comme une casserole sur le feu 🫧 — nerveux(se), tendu(e), à bout — sans vraiment savoir pourquoi ?",
      type: 'frequency',
      options: opts,
    },
    {
      id: 2,
      text: "Tes inquiétudes ont-elles parfois tendance à tourner en boucle dans ta tête, comme une chanson qu'on n'arrive pas à enlever ? 🔄",
      type: 'frequency',
      options: opts,
    },
    {
      id: 3,
      text: "Est-ce que tu t'inquiètes souvent à propos de plein de choses différentes en même temps ?",
      type: 'frequency',
      options: opts,
    },
    {
      id: 4,
      text: "Ton cerveau reste en mode 'on' même quand tu essaies de te reposer ?",
      type: 'frequency',
      options: opts,
    },
    {
      id: 5,
      text: "Est-ce qu'il t'arrive d'être tellement agité(e) intérieurement que tu n'arrives pas à rester en place ?",
      type: 'frequency',
      options: opts,
    },
    {
      id: 6,
      text: "Tu t'emportes facilement ou tu t'irrites pour des petites choses ?",
      type: 'frequency',
      options: opts,
    },
    {
      id: 7,
      text: "As-tu parfois la peur qu'il t'arrive quelque chose de terrible — une catastrophe que tu ne peux pas contrôler ?",
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
      description: "Niveau d'anxiété faible, dans la norme. Peu ou pas de symptômes.",
      referralRequired: false,
      recommendation: "Maintenez vos habitudes de bien-être et de gestion du stress."
    },
    {
      min: 5,  max: 9,
      label: "Anxiété légère",
      severity: 'mild',
      alertLevel: 1,
      description: "Présence de quelques symptômes anxieux pouvant affecter le quotidien.",
      referralRequired: false,
      recommendation: "Des techniques de relaxation, la pleine conscience et l'activité physique peuvent réduire ces symptômes."
    },
    {
      min: 10, max: 14,
      label: "Anxiété modérée",
      severity: 'moderate',
      alertLevel: 1,
      description: "Symptômes anxieux significatifs impactant votre quotidien, travail et relations.",
      referralRequired: false,
      recommendation: "Une consultation avec un professionnel de santé mentale (psychologue ou médecin) est conseillée."
    },
    {
      min: 15, max: 21,
      label: "Anxiété sévère",
      severity: 'severe',
      alertLevel: 2,
      description: "Anxiété sévère nécessitant une attention professionnelle. Ces symptômes peuvent être significativement améliorés avec un accompagnement adapté.",
      referralRequired: true,
      recommendation: "Consultation avec un médecin ou psychologue recommandée. Des traitements efficaces (thérapie, soutien) existent."
    },
  ],
};

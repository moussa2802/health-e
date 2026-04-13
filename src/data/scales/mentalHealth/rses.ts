import type { AssessmentScale } from '../../../types/assessment';

// Échelle de Likert 1-4 conforme à la version originale de Rosenberg (1965)
const opts = [
  { value: 4, label: "Oui, tout à fait", subtitle: "C'est exactement ça" },
  { value: 3, label: "Plutôt oui", subtitle: "Ça me correspond assez" },
  { value: 2, label: "Pas vraiment", subtitle: "Ça ne me correspond pas trop" },
  { value: 1, label: "Pas du tout", subtitle: "Ce n'est vraiment pas moi" },
];

export const RSES: AssessmentScale = {
  id: 'rses',
  name: "Estime de Soi de Rosenberg",
  shortName: "RSES",
  category: 'mental_health',
  description: "Mesure l'estime de soi globale à travers des sentiments positifs et négatifs envers soi-même.",
  instructions: "Ces questions portent sur la façon dont tu te perçois. Réponds avec honnêteté — ce n'est pas un examen 😊",
  timeEstimateMinutes: 3,
  reference: "Rosenberg, M. (1965). Society and the adolescent self-image. Princeton University Press.",
  licenseNote: "Domaine public.",
  warningMessage: "Ces résultats sont un premier éclairage, pas un diagnostic — si quelque chose te préoccupe, n'hésite pas à en parler à un professionnel 🤝",
  // Items 2, 5, 6, 8, 9 sont négatifs → inversés. Score sur 40 (10 items × 4).
  scoreRange: { min: 10, max: 40 },
  items: [
    { id: 1,  text: "Globalement, tu es plutôt {{content|contente}} de qui tu es ?",                                         type: 'likert', options: opts },
    { id: 2,  text: "Il t'arrive de penser que tu ne vaux pas grand-chose ?",                                      type: 'likert', options: opts, reversed: true },
    { id: 3,  text: "Tu trouves que tu as quand même pas mal de qualités ?",                                       type: 'likert', options: opts },
    { id: 4,  text: "Tu te sens capable de faire les choses aussi bien que la plupart des gens ?",                 type: 'likert', options: opts },
    { id: 5,  text: "Tu as l'impression de ne pas avoir grand-chose dont être {{fier|fière}} ?",                      type: 'likert', options: opts, reversed: true },
    { id: 6,  text: "Ça t'arrive de te sentir vraiment inutile, comme si tu ne servais à rien ?",                  type: 'likert', options: opts, reversed: true },
    { id: 7,  text: "Tu penses que tu es quelqu'un de valable, au moins autant que les autres ?",                  type: 'likert', options: opts },
    { id: 8,  text: "Tu aimerais avoir plus de respect pour toi-même ?",                                           type: 'likert', options: opts, reversed: true },
    { id: 9,  text: "Quand tu fais le bilan, tu as tendance à te voir comme {{un|une}} {{raté|ratée}} ?",                     type: 'likert', options: opts, reversed: true },
    { id: 10, text: "De manière générale, tu as une attitude positive envers toi-même ?",                          type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 10, max: 14,
      label: "Ton estime de toi est très basse en ce moment",
      severity: 'moderate',
      alertLevel: 2,
      description: "Tu portes un regard très dur sur toi-même — c'est comme si tu te regardais à travers un miroir déformant qui ne montre que les défauts 🪞",
      referralRequired: true,
      recommendation: "Un accompagnement psychologique peut t'aider à reconstruire une image de toi plus juste et plus douce. Tu mérites de te voir {{tel|telle}} que tu es vraiment."
    },
    {
      min: 15, max: 25,
      label: "Ton estime de toi est plutôt fragile",
      severity: 'mild',
      alertLevel: 1,
      description: "Tu doutes souvent de ta valeur et ça peut peser sur ta confiance au quotidien — comme marcher sur un sol un peu instable.",
      referralRequired: false,
      recommendation: "Un accompagnement thérapeutique pourrait t'aider à renforcer les fondations. Des petits pas, comme noter tes réussites chaque jour, peuvent aussi faire la différence."
    },
    {
      min: 26, max: 30,
      label: "Ton estime de toi est dans la moyenne",
      severity: 'minimal',
      description: "Tu as une image de toi globalement correcte, même si ça peut varier selon les jours et les contextes — et c'est normal 🌤️",
      referralRequired: false,
      recommendation: "Continue à t'investir dans ce qui te valorise et te fait du bien. Chaque victoire, même petite, consolide la confiance."
    },
    {
      min: 31, max: 40,
      label: "Tu as une bonne estime de toi ✨",
      severity: 'positive',
      description: "Tu portes un regard positif et bienveillant sur toi-même — c'est une vraie force au quotidien, dans tes relations comme dans tes projets.",
      referralRequired: false,
      recommendation: "Belle fondation ! Continue à cultiver tes forces et à t'entourer de personnes qui te tirent vers le haut."
    },
  ],
};

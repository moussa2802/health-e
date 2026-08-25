import type { AssessmentScale } from '../../../types/assessment';

// ÉES-10 : Échelle d'estime de soi de Rosenberg
// Traduction française validée : Vallières & Vallerand (1990), UQAM
// 10 items, échelle 1-4, items 3, 5, 8, 9, 10 inversés
// Score : somme (10–40)

const opts = [
  { value: 1, label: "Tout à fait en désaccord" },
  { value: 2, label: "Plutôt en désaccord" },
  { value: 3, label: "Plutôt en accord" },
  { value: 4, label: "Tout à fait en accord" },
];

export const RSES: AssessmentScale = {
  id: 'rses',
  name: "Estime de Soi de Rosenberg",
  shortName: "RSES",
  category: 'mental_health',
  description: "Mesure l'estime de soi globale à travers des sentiments positifs et négatifs envers soi-même.",
  instructions: "Pour chacune des descriptions suivantes, indique à quel point elle est vraie pour toi.",
  timeEstimateMinutes: 3,
  reference: "Rosenberg, M. (1965). Society and the adolescent self-image. Princeton University Press. / Vallières, E. F. & Vallerand, R. J. (1990). Traduction et validation canadienne-française de l'échelle de l'estime de soi de Rosenberg. International Journal of Psychology, 25(2), 305–316.",
  adaptationNote: "Traduction validée ÉES-10 (Vallières & Vallerand, 1990), UQAM. Formulation à la première personne conservée (registre verbatim). Aucun changement de contenu ni d'ordre des items.",
  licenseNote: "Domaine public.",
  warningMessage: "Ces résultats sont un premier éclairage, pas un diagnostic — si quelque chose te préoccupe, n'hésite pas à en parler à un professionnel de santé.",
  scoreRange: { min: 10, max: 40 },
  reverseIds: [3, 5, 8, 9, 10],
  items: [
    { id: 1,  text: "Je pense que je suis une personne de valeur, au moins égale à n'importe qui d'autre",       type: 'likert', options: opts },
    { id: 2,  text: "Je pense que je possède un certain nombre de belles qualités",                               type: 'likert', options: opts },
    { id: 3,  text: "Tout bien considéré, je suis porté(e) à me considérer comme un(e) raté(e)",                  type: 'likert', options: opts, reversed: true },
    { id: 4,  text: "Je suis capable de faire les choses aussi bien que la majorité des gens",                     type: 'likert', options: opts },
    { id: 5,  text: "Je sens peu de raisons d'être fier(e) de moi",                                               type: 'likert', options: opts, reversed: true },
    { id: 6,  text: "J'ai une attitude positive vis-à-vis de moi-même",                                           type: 'likert', options: opts },
    { id: 7,  text: "Dans l'ensemble, je suis satisfait(e) de moi",                                               type: 'likert', options: opts },
    { id: 8,  text: "J'aimerais avoir plus de respect pour moi-même",                                             type: 'likert', options: opts, reversed: true },
    { id: 9,  text: "Parfois je me sens vraiment inutile",                                                        type: 'likert', options: opts, reversed: true },
    { id: 10, text: "Il m'arrive de penser que je suis un(e) bon(ne) à rien",                                     type: 'likert', options: opts, reversed: true },
  ],
  interpretation: [
    {
      min: 10, max: 14,
      label: "Ton estime de toi est très basse en ce moment",
      severity: 'moderate',
      alertLevel: 2,
      description: "Tu portes un regard très dur sur toi-même — c'est comme si tu te regardais à travers un miroir déformant qui ne montre que les défauts.",
      referralRequired: true,
      recommendation: "Un accompagnement psychologique peut t'aider à reconstruire une image de toi plus juste et plus douce. Tu mérites de te voir tel(le) que tu es vraiment."
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
      description: "Tu as une image de toi globalement correcte, même si ça peut varier selon les jours et les contextes — et c'est normal.",
      referralRequired: false,
      recommendation: "Continue à t'investir dans ce qui te valorise et te fait du bien. Chaque victoire, même petite, consolide la confiance."
    },
    {
      min: 31, max: 40,
      label: "Tu as une bonne estime de toi",
      severity: 'positive',
      description: "Tu portes un regard positif et bienveillant sur toi-même — c'est une vraie force au quotidien, dans tes relations comme dans tes projets.",
      referralRequired: false,
      recommendation: "Belle fondation ! Continue à cultiver tes forces et à t'entourer de personnes qui te tirent vers le haut."
    },
  ],
};

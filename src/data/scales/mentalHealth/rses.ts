import type { AssessmentScale } from '../../../types/assessment';

// Échelle de Likert 1-4 conforme à la version originale de Rosenberg (1965)
const opts = [
  { value: 4, label: "Tout à fait d'accord" },
  { value: 3, label: "D'accord" },
  { value: 2, label: "Pas d'accord" },
  { value: 1, label: "Pas du tout d'accord" },
];

export const RSES: AssessmentScale = {
  id: 'rses',
  name: "Estime de Soi de Rosenberg",
  shortName: "RSES",
  category: 'mental_health',
  description: "Mesure l'estime de soi globale à travers des sentiments positifs et négatifs envers soi-même.",
  instructions: "Pour chaque affirmation, indiquez dans quelle mesure vous êtes d'accord.",
  timeEstimateMinutes: 3,
  reference: "Rosenberg, M. (1965). Society and the adolescent self-image. Princeton University Press.",
  licenseNote: "Domaine public.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  // Items 2, 5, 6, 8, 9 sont négatifs → inversés. Score sur 40 (10 items × 4).
  scoreRange: { min: 10, max: 40 },
  items: [
    { id: 1,  text: "Dans l'ensemble, je suis satisfait(e) de moi",                                         type: 'likert', options: opts },
    { id: 2,  text: "Parfois je pense que je ne vaux rien",                                                 type: 'likert', options: opts, reversed: true },
    { id: 3,  text: "Je pense que j'ai un certain nombre de bonnes qualités",                               type: 'likert', options: opts },
    { id: 4,  text: "Je suis capable de faire les choses aussi bien que la plupart des gens",               type: 'likert', options: opts },
    { id: 5,  text: "Je sens que je n'ai pas grand-chose dont être fier(fière)",                            type: 'likert', options: opts, reversed: true },
    { id: 6,  text: "Il m'arrive de me sentir vraiment inutile",                                            type: 'likert', options: opts, reversed: true },
    { id: 7,  text: "Je pense que je suis quelqu'un de valable, au moins autant que les autres",            type: 'likert', options: opts },
    { id: 8,  text: "J'aimerais avoir plus de respect pour moi-même",                                       type: 'likert', options: opts, reversed: true },
    { id: 9,  text: "Tout bien considéré, j'ai tendance à penser que je suis un(e) raté(e)",                type: 'likert', options: opts, reversed: true },
    { id: 10, text: "J'ai une attitude positive vis-à-vis de moi-même",                                     type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 10, max: 14,
      label: "Estime de soi très faible",
      severity: 'moderate',
      alertLevel: 2,
      description: "Niveau d'estime de soi très bas pouvant sérieusement impacter le bien-être et les relations.",
      referralRequired: true,
      recommendation: "Un accompagnement psychologique peut vous aider à reconstruire une image de soi plus positive."
    },
    {
      min: 15, max: 25,
      label: "Estime de soi faible",
      severity: 'mild',
      alertLevel: 1,
      description: "Niveau d'estime de soi bas pouvant affecter la confiance en soi et les relations.",
      referralRequired: false,
      recommendation: "Un accompagnement thérapeutique peut vous aider à renforcer votre estime de soi."
    },
    {
      min: 26, max: 30,
      label: "Estime de soi dans la normale",
      severity: 'minimal',
      description: "Niveau d'estime de soi dans la moyenne, avec des variations possibles selon les contextes.",
      referralRequired: false,
      recommendation: "Renforcer la confiance en soi à travers des activités valorisantes est bénéfique."
    },
    {
      min: 31, max: 40,
      label: "Bonne estime de soi",
      severity: 'positive',
      description: "Niveau d'estime de soi élevé et positif, atout précieux pour le bien-être et les relations.",
      referralRequired: false,
      recommendation: "Maintenir cette estime de soi positive en cultivant vos forces et en soutenant les autres."
    },
  ],
};

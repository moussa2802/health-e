import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 3, label: "Tout à fait d'accord" },
  { value: 2, label: "D'accord" },
  { value: 1, label: "Pas d'accord" },
  { value: 0, label: "Pas du tout d'accord" },
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
  scoreRange: { min: 0, max: 30 },
  reverseIds: [3, 5, 8, 9, 10],
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
    { min: 0,  max: 14, label: "Faible estime de soi",   severity: 'moderate', description: "Niveau d'estime de soi bas pouvant impacter le bien-être et les relations.", referralRequired: false, recommendation: "Un accompagnement thérapeutique peut vous aider à renforcer votre estime de soi." },
    { min: 15, max: 25, label: "Estime de soi moyenne",  severity: 'mild',     description: "Niveau d'estime de soi dans la moyenne avec des variations possibles.", referralRequired: false, recommendation: "Renforcer la confiance en soi à travers des activités valorisantes est bénéfique." },
    { min: 26, max: 30, label: "Bonne estime de soi",    severity: 'positive', description: "Niveau d'estime de soi élevé et positif.", referralRequired: false, recommendation: "Maintenir cette estime de soi positive en cultivant vos forces." },
  ],
};

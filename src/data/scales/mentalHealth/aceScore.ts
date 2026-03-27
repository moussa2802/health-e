import type { AssessmentScale } from '../../../types/assessment';

const yesNo = [
  { value: 0, label: "Non" },
  { value: 1, label: "Oui" },
];

export const ACE: AssessmentScale = {
  id: 'ace',
  name: "Expériences Négatives de l'Enfance",
  shortName: "ACE Score",
  category: 'mental_health',
  description: "Évalue l'exposition à des expériences négatives pendant l'enfance (avant 18 ans) pouvant avoir un impact sur la santé à l'âge adulte.",
  instructions: "Avant votre 18ème anniversaire, avez-vous vécu les expériences suivantes ? (Ces questions portent sur votre enfance.)",
  timeEstimateMinutes: 5,
  reference: "Felitti, V.J., et al. (1998). Relationship of childhood abuse and household dysfunction to many of the leading causes of death in adults. American Journal of Preventive Medicine, 14(4), 245–258.",
  licenseNote: "Centers for Disease Control and Prevention (CDC). Domaine public.",
  warningMessage: "Ces questions portent sur des expériences difficiles. Prenez soin de vous. Ces résultats ne remplacent pas une consultation professionnelle.",
  scoreRange: { min: 0, max: 10 },
  items: [
    { id: 1,  text: "Un parent ou un adulte dans votre foyer vous a souvent insulté(e), rabaissé(e), humilié(e) ou vous a fait peur",                                          type: 'boolean', options: yesNo },
    { id: 2,  text: "Un parent ou un adulte dans votre foyer vous a souvent frappé(e), giflé(e) ou blessé(e) physiquement",                                                   type: 'boolean', options: yesNo },
    { id: 3,  text: "Un adulte (ou personne de plus de 5 ans que vous) a essayé de vous toucher sexuellement ou vous a fait faire des actes sexuels",                          type: 'boolean', options: yesNo },
    { id: 4,  text: "Vous avez souvent eu le sentiment que personne dans votre famille ne vous aimait ou pensait que vous étiez important(e)",                                 type: 'boolean', options: yesNo },
    { id: 5,  text: "Vous manquiez souvent de nourriture, de vêtements propres ou de protection, ou vos parents étaient trop ivres pour vous amener chez le médecin",         type: 'boolean', options: yesNo },
    { id: 6,  text: "Vous avez perdu un parent biologique suite à un divorce, un abandon ou pour d'autres raisons",                                                           type: 'boolean', options: yesNo },
    { id: 7,  text: "Votre mère (ou belle-mère) était souvent frappée, bousculée, giflée ou menacée par son partenaire",                                                     type: 'boolean', options: yesNo },
    { id: 8,  text: "Vous viviez avec quelqu'un qui avait un problème de consommation d'alcool ou de drogue",                                                                 type: 'boolean', options: yesNo },
    { id: 9,  text: "Un membre de votre foyer souffrait de dépression, de troubles mentaux ou avait tenté de se suicider",                                                    type: 'boolean', options: yesNo },
    { id: 10, text: "Un membre de votre foyer était emprisonné",                                                                                                              type: 'boolean', options: yesNo },
  ],
  interpretation: [
    { min: 0, max: 0, label: "Aucune expérience négative déclarée", severity: 'none',     description: "Aucune expérience négative significative de l'enfance déclarée.", referralRequired: false, recommendation: "Maintenir un soutien social et émotionnel positif." },
    { min: 1, max: 3, label: "Risque faible à modéré",              severity: 'mild',     description: "Quelques expériences difficiles qui peuvent influencer la santé adulte.", referralRequired: false, recommendation: "Une attention à votre bien-être émotionnel est recommandée." },
    { min: 4, max: 6, label: "Risque élevé",                        severity: 'moderate', description: "Plusieurs expériences négatives associées à un risque accru de problèmes de santé.", referralRequired: false, recommendation: "Consulter un professionnel de santé mentale peut être bénéfique." },
    { min: 7, max: 10, label: "Risque très élevé",                  severity: 'severe',   description: "Score élevé associé à des risques importants sur la santé physique et mentale.", referralRequired: true, recommendation: "Une consultation avec un professionnel de santé mentale est fortement recommandée." },
  ],
};

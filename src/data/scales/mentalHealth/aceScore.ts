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
  instructions: "Ces questions portent sur ton enfance, avant tes 18 ans. Réponds selon ce que tu as réellement vécu — il n'y a pas de bonne ou mauvaise réponse. Prends le temps qu'il te faut 🤍",
  timeEstimateMinutes: 5,
  reference: "Felitti, V.J., et al. (1998). Relationship of childhood abuse and household dysfunction to many of the leading causes of death in adults. American Journal of Preventive Medicine, 14(4), 245–258.",
  licenseNote: "Centers for Disease Control and Prevention (CDC). Domaine public.",
  warningMessage: "Ces questions portent sur des expériences difficiles. Prenez soin de vous. Ces résultats ne remplacent pas une consultation professionnelle.",
  scoreRange: { min: 0, max: 10 },
  items: [
    { id: 1,  text: "Quand tu étais enfant, est-ce qu'un adulte à la maison t'insultait, te rabaissait, t'humiliait ou te faisait peur — régulièrement ?",                    type: 'boolean', options: yesNo },
    { id: 2,  text: "Est-ce qu'il t'est arrivé de recevoir des punitions physiques qui te semblaient injustes ou beaucoup trop dures ?",                                      type: 'boolean', options: yesNo },
    { id: 3,  text: "Est-ce qu'un adulte (au moins 5 ans de plus que toi) a essayé de te toucher de façon inappropriée, ou t'y a forcé(e) ?",                                type: 'boolean', options: yesNo },
    { id: 4,  text: "As-tu souvent eu le sentiment que personne dans ta famille ne t'aimait vraiment ou ne te voyait comme quelqu'un d'important ?",                          type: 'boolean', options: yesNo },
    { id: 5,  text: "Est-ce que tu manquais souvent de l'essentiel — nourriture, vêtements propres — parce que personne à la maison ne s'en occupait ?",                    type: 'boolean', options: yesNo },
    { id: 6,  text: "As-tu perdu un parent à cause d'un divorce, d'un abandon ou d'une autre raison avant tes 18 ans ?",                                                     type: 'boolean', options: yesNo },
    { id: 7,  text: "Est-ce que tu as vu ta mère (ou belle-mère) se faire maltraiter physiquement ou menacer par son partenaire ?",                                           type: 'boolean', options: yesNo },
    { id: 8,  text: "Est-ce qu'il y avait quelqu'un dans ta famille qui avait un problème sérieux avec l'alcool ou la drogue ?",                                              type: 'boolean', options: yesNo },
    { id: 9,  text: "Est-ce qu'un membre de ta famille souffrait de dépression, d'un trouble mental, ou avait tenté de se suicider ?",                                       type: 'boolean', options: yesNo },
    { id: 10, text: "Est-ce qu'un membre de ta famille a été emprisonné ?",                                                                                                   type: 'boolean', options: yesNo },
  ],
  interpretation: [
    { min: 0, max: 0, label: "Aucune expérience négative déclarée", severity: 'none',     description: "Aucune expérience négative significative de l'enfance déclarée.", referralRequired: false, recommendation: "Maintenir un soutien social et émotionnel positif." },
    { min: 1, max: 3, label: "Risque faible à modéré",              severity: 'mild',     description: "Quelques expériences difficiles qui peuvent influencer la santé adulte.", referralRequired: false, recommendation: "Une attention à votre bien-être émotionnel est recommandée." },
    { min: 4, max: 6, label: "Risque élevé",      severity: 'moderate', alertLevel: 2, description: "Score ≥ 4 : plusieurs expériences négatives associées à un risque accru de problèmes de santé physique et mentale.", referralRequired: true, recommendation: "Une consultation avec un professionnel de santé mentale est fortement recommandée pour comprendre et intégrer ces expériences." },
    { min: 7, max: 10, label: "Risque très élevé", severity: 'severe', alertLevel: 3, description: "Score ≥ 7 : accumulation d'adversités dans l'enfance associée à des impacts significatifs sur la santé à l'âge adulte.", referralRequired: true, recommendation: "Un accompagnement psychologique spécialisé en traumatisme complexe est fortement recommandé. Tu mérites ce soutien." },
  ],
};

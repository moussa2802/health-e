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
  warningMessage: "Ce test explore ton histoire d'enfance. Un score élevé reflète ce que tu as traversé — pas forcément comment tu vas aujourd'hui. 🤍",
  scoreRange: { min: 0, max: 10 },
  items: [
    { id: 1,  text: "Quand tu étais enfant, est-ce qu'un adulte à la maison t'insultait, te rabaissait, t'humiliait ou te faisait peur — régulièrement ?",                    type: 'boolean', options: yesNo },
    { id: 2,  text: "Est-ce qu'il t'est arrivé de recevoir des punitions physiques qui te semblaient injustes ou beaucoup trop dures ?",                                      type: 'boolean', options: yesNo },
    { id: 3,  text: "Est-ce qu'un adulte (au moins 5 ans de plus que toi) a essayé de te toucher de façon inappropriée, ou t'y a {{forcé|forcée}} ?",                                type: 'boolean', options: yesNo },
    { id: 4,  text: "As-tu souvent eu le sentiment que personne dans ta famille ne t'aimait vraiment ou ne te voyait comme quelqu'un d'important ?",                          type: 'boolean', options: yesNo },
    { id: 5,  text: "Est-ce que tu manquais souvent de l'essentiel — nourriture, vêtements propres — parce que personne à la maison ne s'en occupait ?",                    type: 'boolean', options: yesNo },
    { id: 6,  text: "As-tu perdu un parent à cause d'un divorce, d'un abandon ou d'une autre raison avant tes 18 ans ?",                                                     type: 'boolean', options: yesNo },
    { id: 7,  text: "Est-ce que tu as vu ta mère (ou belle-mère) se faire maltraiter physiquement ou menacer par son partenaire ?",                                           type: 'boolean', options: yesNo },
    { id: 8,  text: "Est-ce qu'il y avait quelqu'un dans ta famille qui avait un problème sérieux avec l'alcool ou la drogue ?",                                              type: 'boolean', options: yesNo },
    { id: 9,  text: "Est-ce qu'un membre de ta famille souffrait de dépression, d'un trouble mental, ou avait tenté de se suicider ?",                                       type: 'boolean', options: yesNo },
    { id: 10, text: "Est-ce qu'un membre de ta famille a été emprisonné ?",                                                                                                   type: 'boolean', options: yesNo },
  ],
  interpretation: [
    {
      min: 0, max: 0,
      label: "Aucune expérience négative déclarée",
      severity: 'none',
      description: "Aucune expérience négative significative de l'enfance déclarée. C'est une vraie chance.",
      referralRequired: false,
      recommendation: "Ton enfance semble avoir été protectrice. Continue à cultiver tes liens et ton bien-être."
    },
    {
      min: 1, max: 3,
      label: "Quelques épreuves traversées",
      severity: 'mild',
      description: "Tu as traversé quelques épreuves dans l'enfance. Ce n'est pas rien — et le fait d'en prendre conscience est déjà important.",
      referralRequired: false,
      recommendation: "Prendre soin de ton bien-être émotionnel est précieux. Si tu en ressens le besoin, un professionnel peut t'accompagner dans cette démarche."
    },
    {
      min: 4, max: 6,
      label: "Risque élevé",
      severity: 'moderate',
      alertLevel: 2,
      description: "Un score de 4 ou plus indique plusieurs expériences difficiles dans l'enfance, associées à un risque accru pour ta santé physique et psychologique. Ce score reflète ce que tu as traversé — pas qui tu es aujourd'hui.",
      referralRequired: true,
      recommendation: "Un échange avec un professionnel du bien-être psychologique est vraiment recommandé. Comprendre et intégrer ces expériences, c'est un cadeau que tu te fais à toi-même."
    },
    {
      min: 7, max: 10,
      label: "Risque très élevé",
      severity: 'severe',
      alertLevel: 3,
      description: "Un score de 7 ou plus reflète une accumulation d'épreuves dans l'enfance qui peut peser sur ta santé d'adulte. Ce chiffre raconte ton histoire — il ne définit pas ton avenir.",
      referralRequired: true,
      recommendation: "Un accompagnement psychologique spécialisé en traumatisme est fortement recommandé. Tu mérites ce soutien — et ce n'est jamais trop tard pour commencer."
    },
  ],

  contextQuestion: {
    id: 11,
    text: "Aujourd'hui, quand tu repenses à ces expériences, dans quelle mesure est-ce que ça affecte encore ta vie au quotidien ?",
    options: [
      { value: 1, label: "Plus du tout — j'ai fait la paix avec ça" },
      { value: 2, label: "Un peu — ça me revient parfois" },
      { value: 3, label: "Assez — ça pèse encore régulièrement" },
      { value: 4, label: "Beaucoup — c'est encore très présent et douloureux" },
    ],
    noScore: true as const,
    resolvedThreshold: 2,
  },

  resolvedInterpretation: [
    {
      min: 0, max: 0,
      label: "Aucune expérience négative déclarée",
      severity: 'none' as const,
      description: "Aucune expérience négative significative de l'enfance déclarée.",
      referralRequired: false,
      recommendation: "Ton enfance semble avoir été protectrice. Continue à cultiver tes liens et ton bien-être."
    },
    {
      min: 1, max: 3,
      label: "Quelques épreuves surmontées",
      severity: 'minimal' as const,
      description: "Tu as traversé quelques épreuves dans l'enfance, mais tu sembles avoir fait un beau chemin depuis.",
      referralRequired: false,
      recommendation: "Ton parcours montre de la résilience. Continue à prendre soin de toi."
    },
    {
      min: 4, max: 6,
      label: "Épreuves significatives — résilience présente",
      severity: 'mild' as const,
      description: "Tu as vécu plusieurs expériences difficiles dans l'enfance. Le fait que ça ne t'affecte plus au quotidien est un signe de force. Ce score reflète ce que tu as traversé, pas qui tu es aujourd'hui.",
      referralRequired: false,
      recommendation: "Ta résilience est remarquable. Si tu souhaites approfondir ta connaissance de toi-même, un accompagnement peut toujours être enrichissant — mais ce n'est pas une urgence."
    },
    {
      min: 7, max: 10,
      label: "Parcours d'enfance très éprouvant — résilience forte",
      severity: 'mild' as const,
      alertLevel: 1,
      description: "Tu as traversé beaucoup d'épreuves dans l'enfance. Le fait que tu sois ici et que ces souvenirs ne dominent plus ta vie montre une grande force intérieure. Ce score reflète ton histoire, pas ton état actuel.",
      referralRequired: false,
      recommendation: "Ta capacité à avancer malgré ces expériences est admirable. Un suivi psychologique n'est pas urgent, mais il peut être enrichissant pour consolider ce chemin de guérison. Tu mérites ce soutien si tu le souhaites."
    },
  ],
};

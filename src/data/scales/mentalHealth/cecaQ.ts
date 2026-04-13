import type { AssessmentScale } from '../../../types/assessment';

const freq = [
  { value: 1, label: "Jamais", subtitle: "Ça ne m'est pas arrivé" },
  { value: 2, label: "Rarement", subtitle: "De temps en temps" },
  { value: 3, label: "Parfois", subtitle: "Ça arrivait régulièrement" },
  { value: 4, label: "Souvent", subtitle: "C'était fréquent" },
];

const yesNoSexual = [
  { value: 1, label: "Non", subtitle: "Ça ne m'est pas arrivé" },
  { value: 4, label: "Oui", subtitle: "Ça m'est arrivé" },
];

export const CECA_Q: AssessmentScale = {
  id: 'ceca_q',
  name: "Carences Affectives de l'Enfance",
  shortName: "CECA-Q",
  category: 'mental_health',
  description: "Évalue les expériences de soins et de maltraitance durant l'enfance, notamment les attitudes parentales et les éventuels abus.",
  instructions: "Ces questions portent sur ton enfance, avant tes 17 ans. Pense à la personne qui s'occupait principalement de toi. Prends ton temps, il n'y a aucune obligation de répondre à tout 🤍",
  timeEstimateMinutes: 8,
  reference: "Bifulco, A., Brown, G.W., & Harris, T.O. (1994). Childhood Experience of Care and Abuse (CECA). Social Psychiatry and Psychiatric Epidemiology, 29(4), 141–198.",
  licenseNote: "Basé sur les questions publiées dans les articles de Bifulco (1994). Usage clinique et de recherche.",
  warningMessage: "Ces questions portent sur ton enfance et peuvent évoquer des souvenirs difficiles. Un score élevé ne signifie pas que tu as un problème aujourd'hui. Prends soin de toi. 🤍",
  scoreRange: { min: 16, max: 64 },
  items: [
    { id: 1,  text: "La personne qui s'occupait de toi te montrait de l'affection — des câlins, des mots tendres, te dire qu'elle t'aimait ?",              type: 'likert', options: freq, subscale: 'maternal_care', reversed: true },
    { id: 2,  text: "Cette personne était disponible et à l'écoute quand tu en avais besoin ?",                                        type: 'likert', options: freq, subscale: 'maternal_care', reversed: true },
    { id: 3,  text: "Cette personne s'intéressait à tes activités scolaires, à ta vie de tous les jours ?",                               type: 'likert', options: freq, subscale: 'maternal_care', reversed: true },
    { id: 4,  text: "Cette personne te critiquait, te rabaissait ou te disait que tu n'étais pas capable ?",                     type: 'likert', options: freq, subscale: 'maternal_antipathy' },
    { id: 5,  text: "Cette personne se mettait en colère contre toi ou restait indifférente à ce que tu ressentais ?",                            type: 'likert', options: freq, subscale: 'maternal_antipathy' },
    { id: 6,  text: "Cette personne te comparait défavorablement à d'autres enfants — frères, sœurs, cousins ?",                      type: 'likert', options: freq, subscale: 'maternal_antipathy' },
    { id: 7,  text: "Tu te sentais {{aimé|aimée}} et en sécurité dans ton foyer ?",                                                      type: 'likert', options: freq, subscale: 'paternal_care', reversed: true },
    { id: 8,  text: "Les adultes de ton foyer s'assuraient que tu avais à manger, que tu étais {{habillé|habillée}} et {{pris|prise}} en charge ?",               type: 'likert', options: freq, subscale: 'paternal_care', reversed: true },
    { id: 9,  text: "Tu pouvais compter sur un adulte de confiance dans ta famille élargie — oncle, tante, grand-parent ?",        type: 'likert', options: freq, subscale: 'paternal_care', reversed: true },
    { id: 10, text: "Un adulte de ton foyer avait des comportements violents ou te faisait peur ?",                                  type: 'likert', options: freq, subscale: 'paternal_antipathy' },
    { id: 11, text: "Tu recevais des punitions physiques sévères ou des châtiments corporels ?",                                      type: 'likert', options: freq, subscale: 'paternal_antipathy' },
    { id: 12, text: "L'atmosphère à la maison était tendue, avec des conflits fréquents entre les adultes ?",                               type: 'likert', options: freq, subscale: 'paternal_antipathy' },
    { id: 13, text: "Un adulte de ton entourage a eu des comportements à caractère sexuel inappropriés envers toi ?",               type: 'likert', options: yesNoSexual, subscale: 'sexual_abuse' },
    { id: 14, text: "Tu as été {{contraint|contrainte}} ou {{manipulé|manipulée}} pour faire ou voir des choses de nature sexuelle ?",                    type: 'likert', options: yesNoSexual, subscale: 'sexual_abuse' },
    { id: 15, text: "Ces expériences t'ont-elles été imposées par un membre de la famille ou une personne proche ?",              type: 'likert', options: yesNoSexual, subscale: 'sexual_abuse' },
    { id: 16, text: "Avec le recul, est-ce que ces expériences d'enfance ont eu un impact durable sur ta vie d'adulte ?",
      type: 'likert', options: [{ value: 1, label: "Aucun impact", subtitle: "Ça ne m'affecte pas" }, { value: 2, label: "Peu d'impact", subtitle: "Quelques traces légères" }, { value: 3, label: "Assez important", subtitle: "Ça a laissé des marques" }, { value: 4, label: "Très important", subtitle: "Ça m'affecte encore beaucoup" }] },
  ],
  subscales: [
    { key: 'maternal_care',      label: "Soins et affection",       itemIds: [1,2,3],    reverseIds: [1,2,3], range: { min: 3, max: 12 } },
    { key: 'maternal_antipathy', label: "Antipathie parentale",     itemIds: [4,5,6],    range: { min: 3, max: 12 } },
    { key: 'paternal_care',      label: "Sécurité du foyer",        itemIds: [7,8,9],    reverseIds: [7,8,9], range: { min: 3, max: 12 } },
    { key: 'paternal_antipathy', label: "Violence et conflits",     itemIds: [10,11,12], range: { min: 3, max: 12 } },
    { key: 'sexual_abuse',       label: "Abus sexuels",             itemIds: [13,14,15], range: { min: 3, max: 12 } },
  ],
  interpretation: [
    {
      min: 16, max: 26,
      label: "Enfance globalement positive",
      severity: 'positive',
      description: "Ton enfance semble avoir été globalement sécurisante. C'est une vraie force pour la suite.",
      referralRequired: false,
      recommendation: "Ton parcours d'enfance semble avoir été protecteur. Continue à cultiver ces bases solides."
    },
    {
      min: 27, max: 40,
      label: "Quelques expériences difficiles",
      severity: 'mild',
      description: "Tu as connu quelques moments difficiles dans l'enfance. Ce n'est pas rien — et le fait que tu en prennes conscience est déjà un pas important.",
      referralRequired: false,
      recommendation: "Explorer ces expériences avec un professionnel peut t'aider à mieux te comprendre et à avancer plus sereinement."
    },
    {
      min: 41, max: 64,
      label: "Expériences négatives significatives",
      severity: 'moderate',
      alertLevel: 2,
      description: "Ton enfance a été marquée par des expériences difficiles qui peuvent encore peser aujourd'hui. Ce score reflète ce que tu as traversé — pas qui tu es.",
      referralRequired: true,
      recommendation: "Un accompagnement par un professionnel spécialisé en trauma est vraiment recommandé. Tu mérites ce soutien — et ce n'est jamais trop tard pour commencer."
    },
  ],

  contextQuestion: {
    id: 17,
    text: "Avec le recul, dans quelle mesure est-ce que ces expériences d'enfance continuent d'affecter ta vie aujourd'hui ?",
    options: [
      { value: 1, label: "Plus du tout — j'ai avancé", subtitle: "Ces souvenirs ne me pèsent plus" },
      { value: 2, label: "Un peu — quelques traces", subtitle: "De temps en temps" },
      { value: 3, label: "Assez — ça influence encore mes relations ou mon humeur", subtitle: "C'est encore présent" },
      { value: 4, label: "Beaucoup — c'est encore très présent", subtitle: "Ça pèse au quotidien" },
    ],
    noScore: true as const,
    resolvedThreshold: 2,
  },

  resolvedInterpretation: [
    {
      min: 16, max: 26,
      label: "Enfance globalement positive",
      severity: 'positive' as const,
      description: "Ton enfance semble avoir été globalement sécurisante.",
      referralRequired: false,
      recommendation: "Ton parcours d'enfance semble avoir été protecteur."
    },
    {
      min: 27, max: 40,
      label: "Quelques expériences difficiles — intégrées",
      severity: 'minimal' as const,
      description: "Tu as connu quelques moments difficiles dans l'enfance, mais tu sembles les avoir intégrés dans ton parcours.",
      referralRequired: false,
      recommendation: "Ton chemin de guérison est en bonne voie. Explorer ces expériences avec un professionnel peut enrichir ta connaissance de toi-même si tu le souhaites."
    },
    {
      min: 41, max: 64,
      label: "Expériences difficiles significatives — chemin parcouru",
      severity: 'mild' as const,
      alertLevel: 1,
      description: "Tu as vécu des expériences d'enfance significativement difficiles. Le fait qu'elles n'affectent plus ton quotidien témoigne de ta résilience.",
      referralRequired: false,
      recommendation: "Ta force intérieure est remarquable. Un accompagnement professionnel reste une option enrichissante — pas une urgence."
    },
  ],
};

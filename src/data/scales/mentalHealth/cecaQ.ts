import type { AssessmentScale } from '../../../types/assessment';

const freq = [
  { value: 1, label: "Jamais" },
  { value: 2, label: "Rarement" },
  { value: 3, label: "Parfois" },
  { value: 4, label: "Souvent" },
];

export const CECA_Q: AssessmentScale = {
  id: 'ceca_q',
  name: "Carences Affectives de l'Enfance",
  shortName: "CECA-Q",
  category: 'mental_health',
  description: "Évalue les expériences de soins et de maltraitance durant l'enfance, notamment les attitudes parentales et les éventuels abus.",
  instructions: "Pensez à votre enfance (avant 17 ans). Répondez en pensant à la personne qui s'occupait principalement de vous (mère, père, tuteur, grand-parent, etc.).",
  timeEstimateMinutes: 8,
  reference: "Bifulco, A., Brown, G.W., & Harris, T.O. (1994). Childhood Experience of Care and Abuse (CECA). Social Psychiatry and Psychiatric Epidemiology, 29(4), 141–198.",
  licenseNote: "Basé sur les questions publiées dans les articles de Bifulco (1994). Usage clinique et de recherche.",
  warningMessage: "Ces questions portent sur votre enfance et peuvent évoquer des souvenirs douloureux. Ces résultats ne remplacent pas une consultation professionnelle.",
  scoreRange: { min: 16, max: 64 },
  items: [
    { id: 1,  text: "La personne qui s'occupait de vous vous montrait de l'affection et vous disait qu'elle vous aimait",              type: 'likert', options: freq, subscale: 'maternal_care', reversed: true },
    { id: 2,  text: "Cette personne était disponible et à l'écoute quand vous en aviez besoin",                                        type: 'likert', options: freq, subscale: 'maternal_care', reversed: true },
    { id: 3,  text: "Cette personne s'intéressait à vos activités scolaires et à votre vie quotidienne",                               type: 'likert', options: freq, subscale: 'maternal_care', reversed: true },
    { id: 4,  text: "Cette personne vous critiquait, vous rabaissait ou vous disait que vous n'étiez pas capable",                     type: 'likert', options: freq, subscale: 'maternal_antipathy' },
    { id: 5,  text: "Cette personne était en colère contre vous ou indifférente à vos besoins émotionnels",                            type: 'likert', options: freq, subscale: 'maternal_antipathy' },
    { id: 6,  text: "Cette personne vous comparait défavorablement à d'autres enfants (frères, sœurs, cousins)",                      type: 'likert', options: freq, subscale: 'maternal_antipathy' },
    { id: 7,  text: "Vous vous sentiez aimé(e) et en sécurité dans votre foyer",                                                      type: 'likert', options: freq, subscale: 'paternal_care', reversed: true },
    { id: 8,  text: "Les adultes de votre foyer s'assuraient que vous aviez à manger, étiez vêtu(e) et pris en charge",               type: 'likert', options: freq, subscale: 'paternal_care', reversed: true },
    { id: 9,  text: "Vous pouviez compter sur un adulte de confiance dans votre famille élargie (oncle, tante, grand-parent)",        type: 'likert', options: freq, subscale: 'paternal_care', reversed: true },
    { id: 10, text: "Un adulte de votre foyer avait des comportements violents ou vous faisait peur",                                  type: 'likert', options: freq, subscale: 'paternal_antipathy' },
    { id: 11, text: "Vous receviez des punitions physiques sévères ou des châtiments corporels",                                      type: 'likert', options: freq, subscale: 'paternal_antipathy' },
    { id: 12, text: "L'atmosphère à la maison était tendue, avec des conflits fréquents entre adultes",                               type: 'likert', options: freq, subscale: 'paternal_antipathy' },
    { id: 13, text: "Un adulte de votre entourage avait des comportements à caractère sexuel inappropriés envers vous",               type: 'likert', options: freq, subscale: 'sexual_abuse' },
    { id: 14, text: "Vous avez été contraint(e) ou manipulé(e) pour faire ou voir des choses de nature sexuelle",                    type: 'likert', options: freq, subscale: 'sexual_abuse' },
    { id: 15, text: "Ces expériences vous ont-elles été imposées par un membre de la famille ou une personne proche ?",              type: 'likert', options: freq, subscale: 'sexual_abuse' },
    { id: 16, text: "Ces expériences difficiles ont-elles eu un impact durable sur votre vie adulte ?",
      type: 'likert', options: [{ value: 1, label: "Aucun impact" }, { value: 2, label: "Peu d'impact" }, { value: 3, label: "Assez important" }, { value: 4, label: "Très important" }] },
  ],
  subscales: [
    { key: 'maternal_care',      label: "Soins et affection",       itemIds: [1,2,3],    reverseIds: [1,2,3], range: { min: 3, max: 12 } },
    { key: 'maternal_antipathy', label: "Antipathie parentale",     itemIds: [4,5,6],    range: { min: 3, max: 12 } },
    { key: 'paternal_care',      label: "Sécurité du foyer",        itemIds: [7,8,9],    reverseIds: [7,8,9], range: { min: 3, max: 12 } },
    { key: 'paternal_antipathy', label: "Violence et conflits",     itemIds: [10,11,12], range: { min: 3, max: 12 } },
    { key: 'sexual_abuse',       label: "Abus sexuels",             itemIds: [13,14,15], range: { min: 3, max: 12 } },
  ],
  interpretation: [
    { min: 16, max: 26, label: "Enfance globalement positive",      severity: 'positive', description: "Expériences d'enfance globalement sécurisantes.", referralRequired: false, recommendation: "Votre parcours d'enfance semble avoir été protecteur." },
    { min: 27, max: 40, label: "Quelques expériences difficiles",   severity: 'mild',     description: "Quelques expériences difficiles ayant pu laisser des traces.", referralRequired: false, recommendation: "Explorer ces expériences avec un professionnel peut enrichir votre connaissance de vous-même." },
    { min: 41, max: 64, label: "Expériences négatives significatives", severity: 'moderate', description: "Expériences d'enfance difficiles pouvant influencer la santé mentale.", referralRequired: true, recommendation: "Un accompagnement par un professionnel spécialisé est recommandé." },
  ],
};

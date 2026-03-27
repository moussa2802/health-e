import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Rarement" },
  { value: 2, label: "Parfois" },
  { value: 3, label: "Souvent" },
];

export const TSI_BASE: AssessmentScale = {
  id: 'tsi_base',
  name: "Traumatismes Sexuels et Détresse Associée",
  shortName: "Trauma Sexuel",
  category: 'sexual_health',
  description: "Évalue les symptômes de détresse liés à des traumatismes sexuels ou des abus. Basé sur les travaux publiés de Briere (1995).",
  instructions: "Au cours du dernier mois, à quelle fréquence avez-vous vécu les expériences suivantes ? Si vous n'avez pas vécu de traumatisme sexuel, répondez en fonction de votre vécu général.",
  timeEstimateMinutes: 7,
  reference: "Briere, J. (1995). Trauma Symptom Inventory professional manual. Psychological Assessment Resources. Questions basées sur les articles publiés, pas l'outil commercial PAR Inc.",
  licenseNote: "Basé sur les construits théoriques publiés de Briere (1995). Ne constitue pas l'outil TSI-2 commercial.",
  warningMessage: "Ces questions peuvent évoquer des souvenirs difficiles. Ces résultats ne remplacent pas une consultation professionnelle. Si vous êtes en détresse, contactez un professionnel.",
  scoreRange: { min: 0, max: 48 },
  items: [
    { id: 1,  text: "Des pensées ou images intrusives à contenu sexuel que vous n'avez pas choisies",                                          type: 'frequency', options: opts, subscale: 'intrusive' },
    { id: 2,  text: "Des rêves ou cauchemars à contenu sexuel perturbants",                                                                    type: 'frequency', options: opts, subscale: 'intrusive' },
    { id: 3,  text: "Des flashbacks d'expériences sexuelles non désirées ou traumatiques",                                                    type: 'frequency', options: opts, subscale: 'intrusive' },
    { id: 4,  text: "Éviter des personnes, endroits ou situations qui vous rappellent une expérience sexuelle difficile",                     type: 'frequency', options: opts, subscale: 'avoidance' },
    { id: 5,  text: "Perdre intérêt pour les activités sexuelles à cause de mauvaises expériences passées",                                  type: 'frequency', options: opts, subscale: 'avoidance' },
    { id: 6,  text: "Ne pas vouloir parler ou penser à des expériences sexuelles difficiles",                                                 type: 'frequency', options: opts, subscale: 'avoidance' },
    { id: 7,  text: "Vous sentir détaché(e) ou absent(e) émotionnellement pendant une activité sexuelle",                                    type: 'frequency', options: opts, subscale: 'dissociation' },
    { id: 8,  text: "Vous sentir comme si vous regardiez votre corps de l'extérieur pendant un rapport sexuel",                              type: 'frequency', options: opts, subscale: 'dissociation' },
    { id: 9,  text: "Des moments où vous perdez le fil ou ne vous souvenez pas de ce qui s'est passé pendant une activité sexuelle",         type: 'frequency', options: opts, subscale: 'dissociation' },
    { id: 10, text: "Vous sentir honteux(se) ou coupable à cause d'une expérience sexuelle vécue",                                          type: 'frequency', options: opts, subscale: 'shame' },
    { id: 11, text: "Penser que ce qui vous est arrivé sexuellement est de votre faute",                                                    type: 'frequency', options: opts, subscale: 'shame' },
    { id: 12, text: "Avoir du mal à parler de vos expériences sexuelles difficiles de peur d'être jugé(e) ou blâmé(e)",                     type: 'frequency', options: opts, subscale: 'shame' },
    { id: 13, text: "Une détresse émotionnelle forte quand vous pensez à une expérience sexuelle difficile",                                 type: 'frequency', options: opts, subscale: 'distress' },
    { id: 14, text: "Des réactions physiques (palpitations, sueurs, tension) quand vous pensez à une expérience sexuelle difficile",        type: 'frequency', options: opts, subscale: 'distress' },
    { id: 15, text: "Des comportements sexuels à risque que vous utilisez pour oublier ou éviter de penser à des expériences difficiles",    type: 'frequency', options: opts, subscale: 'distress' },
    { id: 16, text: "Ces expériences sexuelles difficiles affectent vos relations ou votre vie quotidienne",                                 type: 'frequency', options: opts, subscale: 'distress' },
  ],
  subscales: [
    { key: 'intrusive',    label: "Pensées intrusives",   itemIds: [1,2,3],      range: { min: 0, max: 9 } },
    { key: 'avoidance',    label: "Évitement",            itemIds: [4,5,6],      range: { min: 0, max: 9 } },
    { key: 'dissociation', label: "Dissociation",         itemIds: [7,8,9],      range: { min: 0, max: 9 } },
    { key: 'shame',        label: "Honte et culpabilité", itemIds: [10,11,12],   range: { min: 0, max: 9 } },
    { key: 'distress',     label: "Détresse sexuelle",    itemIds: [13,14,15,16], range: { min: 0, max: 12 } },
  ],
  interpretation: [
    { min: 0,  max: 15, label: "Peu de symptômes traumatiques sexuels",         severity: 'minimal',  description: "Peu de symptômes liés à des traumatismes sexuels.", referralRequired: false, recommendation: "Maintenir un espace de dialogue sécurisant sur la sexualité." },
    { min: 16, max: 30, label: "Symptômes traumatiques sexuels modérés",        severity: 'moderate', description: "Présence de symptômes qui méritent attention et soutien.", referralRequired: false, recommendation: "Un accompagnement par un professionnel spécialisé en trauma peut être bénéfique." },
    { min: 31, max: 48, label: "Symptômes traumatiques sexuels significatifs",  severity: 'severe',   description: "Symptômes significatifs nécessitant une prise en charge professionnelle.", referralRequired: true, recommendation: "Consulter un psychologue ou thérapeute spécialisé en trauma sexuel est fortement recommandé." },
  ],
};

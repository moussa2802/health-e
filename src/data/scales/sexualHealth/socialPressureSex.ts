import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 1, label: "Jamais / Pas du tout" },
  { value: 2, label: "Rarement" },
  { value: 3, label: "Parfois" },
  { value: 4, label: "Souvent" },
  { value: 5, label: "Toujours / Tout à fait" },
];

export const SOCIAL_PRESSURE_SEX: AssessmentScale = {
  id: 'social_pressure_sex',
  name: "Pression Sociale et Sexualité",
  shortName: "Pression Sexualité",
  category: 'sexual_health',
  description: "Évalue l'impact des pressions sociales et culturelles sur la vie sexuelle.",
  instructions: "Ces questions portent sur les pressions sociales et culturelles qui pèsent sur ta sexualité. Pas de jugement — on veut comprendre ce que tu vis 🤲",
  timeEstimateMinutes: 5,
  reference: "Questionnaire Healt-e (2026). Développé pour le contexte africain francophone.",
  licenseNote: "Questionnaire original Healt-e. Tous droits réservés.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  scoreRange: { min: 14, max: 70 },
  items: [
    { id: 1,  text: "Il t'arrive de te sentir {{obligé|obligée}} d'avoir des rapports sexuels même quand tu n'en as pas envie — par devoir conjugal ou pression de ton/ta partenaire ?",  type: 'likert', options: opts, subscale: 'coercion' },
    { id: 2,  text: "Tu ressens une pression liée à ta virginité ou à tes expériences sexuelles passées ?",                                                                       type: 'likert', options: opts, subscale: 'coercion' },
    { id: 3,  text: "On attend de toi que tu aies ou que tu n'aies pas de rapports sexuels selon des critères culturels — âge, statut marital, genre ?",                          type: 'likert', options: opts, subscale: 'coercion' },
    { id: 4,  text: "Dans ta famille ou ta communauté, la sexualité est un sujet tabou — on n'en parle pas ?",                                                                    type: 'likert', options: opts, subscale: 'taboo' },
    { id: 5,  text: "C'est difficile pour toi de parler de sexualité avec tes proches ou ton/ta partenaire ?",                                                                    type: 'likert', options: opts, subscale: 'taboo' },
    { id: 6,  text: "Tu manques d'informations fiables sur la sexualité parce que le sujet est trop tabou autour de toi ?",                                                       type: 'likert', options: opts, subscale: 'taboo' },
    { id: 7,  text: "Les normes culturelles de ton milieu limitent ta capacité à exprimer et à ressentir du plaisir sexuel ?",                                                    type: 'likert', options: opts, subscale: 'norms' },
    { id: 8,  text: "Tu te sens coupable de ressentir du plaisir sexuel à cause de ce que ta culture ou ta religion t'a enseigné ?",                                              type: 'likert', options: opts, subscale: 'norms' },
    { id: 9,  text: "Tu as peur d'être {{jugé|jugée}} ou {{stigmatisé|stigmatisée}} à cause de tes pratiques ou préférences sexuelles ?",                                                            type: 'likert', options: opts, subscale: 'stigma' },
    { id: 10, text: "Certains aspects de ta sexualité sont considérés comme inacceptables dans ton entourage ?",                                                                  type: 'likert', options: opts, subscale: 'stigma' },
    { id: 11, text: "Ton/ta partenaire et toi, vous évitez de parler ouvertement de vos désirs ou insatisfactions sexuelles ?",                                                   type: 'likert', options: opts, subscale: 'communication' },
    { id: 12, text: "C'est difficile pour toi de dire non ou d'exprimer tes limites sexuelles dans ta relation ?",                                                                type: 'likert', options: opts, subscale: 'communication' },
    // Items pression virginité — contexte sénégalais
    { id: 13, text: "La question de la virginité te met la pression dans ton entourage ?",                                                                                        type: 'likert', options: opts, subscale: 'virginity' },
    { id: 14, text: "Ta façon de vivre ta sexualité crée un conflit avec ce qu'on attend de toi ?",                                                                              type: 'likert', options: opts, subscale: 'virginity' },
  ],
  subscales: [
    { key: 'coercion',      label: "Pression et coercition",       itemIds: [1,2,3],   range: { min: 3, max: 15 } },
    { key: 'taboo',         label: "Tabou et silence",             itemIds: [4,5,6],   range: { min: 3, max: 15 } },
    { key: 'norms',         label: "Normes culturelles",           itemIds: [7,8],     range: { min: 2, max: 10 } },
    { key: 'stigma',        label: "Stigmatisation",               itemIds: [9,10],    range: { min: 2, max: 10 } },
    { key: 'communication', label: "Communication sexuelle",       itemIds: [11,12],   range: { min: 2, max: 10 } },
    { key: 'virginity',     label: "Pression virginité / valeurs", itemIds: [13,14],   range: { min: 2, max: 10 } },
  ],
  interpretation: [
    { min: 14, max: 28, label: "Pression sociale faible",    severity: 'positive', description: "Tu sembles relativement libre des pressions sociales dans ta sexualité. C'est une vraie force.", referralRequired: false, recommendation: "Continue à cultiver une sexualité épanouie et en accord avec tes valeurs. Tu es sur le bon chemin." },
    { min: 29, max: 49, label: "Pression sociale modérée",   severity: 'mild',     description: "Des pressions sociales influencent ta vie sexuelle de manière modérée. C'est très courant, surtout dans notre contexte.", referralRequired: false, recommendation: "Identifier ces pressions et comprendre comment elles t'affectent, c'est déjà un grand pas. Dr Lô peut t'aider à y voir plus clair." },
    { min: 50, max: 70, label: "Pression sociale élevée",    severity: 'moderate', description: "Les pressions sociales pèsent lourd sur ta sexualité. Tu n'es pas {{seul|seule}} à vivre ça — beaucoup de personnes dans notre contexte traversent la même chose.", referralRequired: false, recommendation: "Un accompagnement par un professionnel sensible aux enjeux culturels peut vraiment t'aider à te libérer de ces pressions. N'hésite pas." },
  ],
};

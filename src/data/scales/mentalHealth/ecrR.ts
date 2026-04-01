import type { AssessmentScale } from '../../../types/assessment';

// ECR-R : Experiences in Close Relationships — Revised (Fraley, Waller & Brennan, 2000)
// 36 items, échelle 1-7
// Sous-échelles : Anxiété (items impairs 1,3,5…35) + Évitement (items pairs 2,4,6…36)
// Items inversés Évitement : 4, 16, 18, 22, 26, 28, 30, 34, 36 (formulation positive)
// Score : moyenne par sous-échelle (1–7), non une somme
// Quadrants : Sécure (<3.5//<3.5) | Préoccupé (≥3.5//<3.5) | Détaché (<3.5//≥3.5) | Craintif (≥3.5//≥3.5)

const opts = [
  { value: 1, label: "Pas du tout d'accord" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "Neutre" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "Tout à fait d'accord" },
];

export const ECR_R: AssessmentScale = {
  id: 'ecr_r',
  name: "Style d'Attachement Adulte",
  shortName: "ECR-R",
  category: 'mental_health',
  description: "Évalue le style d'attachement adulte selon deux dimensions : l'anxiété d'abandon et l'évitement de l'intimité. Identifie les quatre styles d'attachement (sécure, préoccupé, détaché, craintif).",
  instructions: "Ces affirmations concernent votre façon de ressentir les choses dans vos relations amoureuses. Indiquez dans quelle mesure vous êtes d'accord avec chacune.",
  timeEstimateMinutes: 10,
  reference: "Fraley, R.C., Waller, N.G., & Brennan, K.A. (2000). An item response theory analysis of self-report measures of adult attachment. Journal of Personality and Social Psychology, 78(2), 350–365.",
  licenseNote: "Libre pour usage clinique et de recherche.",
  warningMessage: "Ces résultats ne remplacent pas une consultation avec un professionnel de santé.",
  // totalScore = somme brute de tous les items (36–252) — pour compatibilité technique.
  // Les scores cliniquement significatifs sont les MOYENNES des sous-échelles (1–7).
  scoreRange: { min: 36, max: 252 },
  // Items inversés globaux (pour totalScore) = items inversés de la sous-échelle Évitement
  reverseIds: [4, 16, 18, 22, 26, 28, 30, 34, 36],
  items: [
    // ── Anxiété (items impairs) ──
    { id: 1,  text: "J'ai peur de perdre l'amour de mon/ma partenaire.",                                                              type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 3,  text: "Je m'inquiète souvent que mon/ma partenaire ne veuille pas rester avec moi.",                                    type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 5,  text: "Je souhaite souvent que les sentiments de mon/ma partenaire pour moi soient aussi forts que les miens.",          type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 7,  text: "Je m'inquiète beaucoup de mes relations amoureuses.",                                                             type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 9,  text: "J'ai peur d'être abandonné(e).",                                                                                 type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 11, text: "Mon désir d'être très proche de mes partenaires fait parfois fuir les gens.",                                     type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 13, text: "J'ai peur que si mon/ma partenaire me connaît vraiment, il/elle ne m'appréciera plus.",                          type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 15, text: "Je ressens de la frustration de ne pas recevoir autant d'affection et de soutien que j'en ai besoin.",            type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 17, text: "Je m'inquiète souvent que mon/ma partenaire ne m'aime pas vraiment.",                                             type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 19, text: "J'ai du mal à me permettre de dépendre de mes partenaires.",                                                      type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 21, text: "Je partage souvent mes sentiments avec des gens qui se soucient moins de moi que moi d'eux.",                    type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 23, text: "J'ai souvent peur que mon/ma partenaire ne tienne pas vraiment à moi.",                                          type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 25, text: "Je ressens du ressentiment quand mon/ma partenaire passe du temps loin de moi.",                                  type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 27, text: "Je me sens frustré(e) quand mon/ma partenaire n'est pas aussi disponible que je le voudrais.",                    type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 29, text: "Mon/ma partenaire ne semble me remarquer que lorsque je suis en colère.",                                         type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 31, text: "Je me demande parfois ce que mon/ma partenaire ressent vraiment pour moi.",                                       type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 33, text: "Il me semble que mes partenaires ne veulent pas se rapprocher autant que je le voudrais.",                        type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 35, text: "Parfois j'ai l'impression de forcer mes partenaires à montrer plus de sentiment et d'engagement.",                type: 'likert', options: opts, subscale: 'anxiety' },
    // ── Évitement (items pairs) ──
    { id: 2,  text: "Je préfère ne pas montrer à mon/ma partenaire ce que je ressens au fond de moi.",                                type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 4,  text: "Je trouve relativement facile de me rapprocher de mon/ma partenaire.",                                            type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
    { id: 6,  text: "Je ne me sens pas à l'aise de m'ouvrir à mes partenaires amoureux(ses).",                                        type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 8,  text: "Je préfère ne pas être trop proche de mes partenaires.",                                                          type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 10, text: "Je me sens mal à l'aise quand mon/ma partenaire veut être très proche de moi.",                                   type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 12, text: "Je veux me rapprocher de mon/ma partenaire, mais je me retrouve toujours à reculer.",                             type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 14, text: "Je suis nerveux(se) quand mes partenaires s'approchent trop de moi.",                                             type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 16, text: "Mon/ma partenaire me comprend vraiment et comprend mes besoins.",                                                  type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
    { id: 18, text: "Je parle habituellement de mes problèmes et préoccupations avec mon/ma partenaire.",                              type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
    { id: 20, text: "Je ne me sens pas à l'aise de dépendre de mes partenaires amoureux(ses).",                                        type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 22, text: "Je m'inquiète rarement que mon/ma partenaire ne me quitte.",                                                       type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
    { id: 24, text: "J'essaie d'éviter de trop me rapprocher de mon/ma partenaire.",                                                   type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 26, text: "Il me réconforte de me tourner vers mon/ma partenaire dans les moments difficiles.",                              type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
    { id: 28, text: "Je dis pratiquement tout à mon/ma partenaire.",                                                                   type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
    { id: 30, text: "Je discute de mes problèmes avec mon/ma partenaire.",                                                             type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
    { id: 32, text: "Je me sens quelque peu mal à l'aise d'être proche des autres.",                                                   type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 34, text: "Il m'est facile de dépendre de mes partenaires amoureux(ses).",                                                   type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
    { id: 36, text: "Il m'est facile d'être affectueux(se) avec mon/ma partenaire.",                                                   type: 'likert', options: opts, subscale: 'avoidance', reversed: true },
  ],
  subscales: [
    {
      key: 'anxiety',
      label: "Anxiété d'attachement",
      itemIds: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35],
      reverseIds: [],         // aucun item anxiété inversé
      range: { min: 1, max: 7 },
      scoringMode: 'mean',    // moyenne sur 18 items
    },
    {
      key: 'avoidance',
      label: "Évitement de l'intimité",
      itemIds: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36],
      reverseIds: [4, 16, 18, 22, 26, 28, 30, 34, 36],  // items positivement formulés
      range: { min: 1, max: 7 },
      scoringMode: 'mean',    // moyenne sur 18 items
    },
  ],
  interpretation: [
    {
      min: 36, max: 107,
      label: "Style sécure",
      severity: 'positive',
      description: "Faible anxiété et faible évitement. Vous êtes à l'aise avec l'intimité et la dépendance mutuelle. Vos relations sont généralement stables et satisfaisantes.",
      referralRequired: false,
      recommendation: "Votre style d'attachement sécure est un atout précieux. Continuez à nourrir vos relations par la communication ouverte et la confiance."
    },
    {
      min: 108, max: 162,
      label: "Style préoccupé ou détaché",
      severity: 'mild',
      description: "Anxiété ou évitement modérés. Vous pouvez alterner entre chercher la proximité et la maintenir à distance. Les résultats par sous-échelle précisent votre style.",
      referralRequired: false,
      recommendation: "Explorer vos patterns relationnels avec un professionnel peut enrichir vos relations et renforcer votre sécurité intérieure."
    },
    {
      min: 163, max: 252,
      label: "Style craintif",
      severity: 'moderate',
      description: "Anxiété et évitement élevés. Peur simultanée de l'intimité et de l'abandon. Ce style peut générer des conflits relationnels importants.",
      referralRequired: true,
      recommendation: "Un accompagnement psychologique centré sur l'attachement peut transformer significativement vos relations. Vous méritez des liens sécures."
    },
  ],
};

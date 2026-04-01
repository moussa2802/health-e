import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 0, label: "Pas du tout" },
  { value: 1, label: "Un peu" },
  { value: 2, label: "Modérément" },
  { value: 3, label: "Beaucoup" },
  { value: 4, label: "Extrêmement" },
];

export const PCL5: AssessmentScale = {
  id: 'pcl5',
  name: "Trouble de Stress Post-Traumatique",
  shortName: "PCL-5",
  category: 'mental_health',
  description: "Évalue les symptômes du trouble de stress post-traumatique (TSPT) selon le DSM-5.",
  instructions: "Au cours du dernier mois, dans quelle mesure avez-vous été dérangé(e) par les problèmes suivants ?",
  timeEstimateMinutes: 8,
  reference: "Weathers, F.W., et al. (2013). PTSD Checklist for DSM-5 (PCL-5). National Center for PTSD.",
  licenseNote: "Domaine public. U.S. Department of Veterans Affairs.",
  warningMessage: "Ces questions portent sur des expériences traumatisantes. Ces résultats ne remplacent pas une consultation professionnelle.",
  scoreRange: { min: 0, max: 80 },
  items: [

    { id: 1,  text: "Avoir des souvenirs répétitifs, perturbants et non désirés d'une expérience stressante",                                         type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 2,  text: "Faire des rêves répétitifs et perturbants d'une expérience stressante",                                                          type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 3,  text: "Revivre soudainement une expérience stressante comme si elle se reproduisait (flash-back)",                                      type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 4,  text: "Vous sentir très contrarié(e) quand quelque chose vous rappelle une expérience stressante",                                      type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 5,  text: "Avoir de fortes réactions physiques quand quelque chose vous rappelle une expérience stressante",                               type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 6,  text: "Éviter les souvenirs, pensées ou sentiments liés à une expérience stressante",                                                  type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 7,  text: "Éviter les rappels externes (personnes, lieux, conversations, activités, objets, situations) d'une expérience stressante",      type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 8,  text: "Avoir du mal à vous rappeler des parties importantes d'une expérience stressante",                                              type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 9,  text: "Avoir des croyances négatives sur vous-même, les autres ou le monde (comme croire que vous êtes mauvais ou que personne n'est digne de confiance)", type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 10, text: "Vous blâmer ou blâmer quelqu'un d'autre pour une expérience stressante ou ce qui s'est passé",                                  type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 11, text: "Avoir des sentiments négatifs forts tels que peur, horreur, colère, culpabilité ou honte",                                      type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 12, text: "Perdre intérêt pour des activités que vous aimiez autrefois",                                                                   type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 13, text: "Vous sentir éloigné(e) ou coupé(e) des autres",                                                                                type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 14, text: "Avoir du mal à ressentir des émotions positives (par exemple être incapable de ressentir de la joie ou de l'amour)",            type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 15, text: "Être irritable, avoir des accès de colère ou agir de manière agressive",                                                        type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 16, text: "Prendre trop de risques ou faire des choses qui pourraient vous causer du tort",                                               type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 17, text: "Être en état d'alerte maximale, sur vos gardes, ou vigilant(e)",                                                               type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 18, text: "Sursauter facilement",                                                                                                         type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 19, text: "Avoir du mal à vous concentrer",                                                                                               type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 20, text: "Avoir du mal à vous endormir ou à rester endormi(e)",                                                                          type: 'likert', options: opts, subscale: 'hyperarousal' },
  ],
  subscales: [
    { key: 'intrusion',       label: "Intrusion",                       itemIds: [1,2,3,4,5],         range: { min: 0, max: 20 } },
    { key: 'avoidance',       label: "Évitement",                       itemIds: [6,7],               range: { min: 0, max: 8 } },
    { key: 'cognition_mood',  label: "Altérations cognitives et humeur", itemIds: [8,9,10,11,12,13,14], range: { min: 0, max: 28 } },
    { key: 'hyperarousal',    label: "Hyperactivation",                  itemIds: [15,16,17,18,19,20],  range: { min: 0, max: 24 } },
  ],
  interpretation: [
    { min: 0,  max: 20, label: "Sous le seuil clinique",       severity: 'minimal',  description: "Les symptômes sont sous le seuil clinique du TSPT.", referralRequired: false, recommendation: "Maintenir un soutien social et surveiller votre bien-être émotionnel." },
    { min: 21, max: 32, label: "Symptômes sous-cliniques",     severity: 'mild',     description: "Quelques symptômes traumatiques sans atteindre le seuil clinique.", referralRequired: false, recommendation: "Un suivi avec un professionnel de santé mentale peut être utile." },
    { min: 33, max: 49, label: "TSPT probable",                severity: 'severe',   alertLevel: 2, description: "Score ≥ 33 : seuil clinique du TSPT. Un TSPT probable nécessitant une évaluation professionnelle.", referralRequired: true, recommendation: "Consultation avec un psychologue ou psychiatre spécialisé en trauma recommandée." },
    { min: 50, max: 80, label: "TSPT sévère",                  severity: 'severe',   alertLevel: 3, description: "Symptômes traumatiques sévères nécessitant une prise en charge urgente.", referralRequired: true, recommendation: "Consultation urgente avec un spécialiste en trauma. Tu mérites un soutien adapté." },
  ],
};

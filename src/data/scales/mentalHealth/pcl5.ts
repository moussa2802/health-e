import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 0, label: "Pas du tout", subtitle: "Aucun impact" },
  { value: 1, label: "Un peu", subtitle: "Légèrement" },
  { value: 2, label: "Modérément", subtitle: "De façon notable" },
  { value: 3, label: "Beaucoup", subtitle: "De façon importante" },
  { value: 4, label: "Extrêmement", subtitle: "Ça me submerge" },
];

export const PCL5: AssessmentScale = {
  id: 'pcl5',
  name: "Trouble de Stress Post-Traumatique",
  shortName: "PCL-5",
  category: 'mental_health',
  description: "Évalue les symptômes du trouble de stress post-traumatique (TSPT) selon le DSM-5.",
  instructions: "Ces questions portent sur le dernier mois. Si tu as vécu un événement difficile ou traumatisant, dis-moi dans quelle mesure ces situations t'ont {{affecté|affectée}} 🤍",
  timeEstimateMinutes: 8,
  reference: "Weathers, F.W., et al. (2013). PTSD Checklist for DSM-5 (PCL-5). National Center for PTSD.",
  licenseNote: "Domaine public. U.S. Department of Veterans Affairs.",
  warningMessage: "Ces questions portent sur des expériences difficiles. Un score élevé ne veut pas automatiquement dire que tu as besoin d'aide en urgence — ça dépend de ce que tu vis maintenant. 🤍",
  scoreRange: { min: 0, max: 80 },
  items: [

    { id: 1,  text: "Des souvenirs d'un événement difficile te reviennent sans que tu le veuilles — comme un film qui se relance tout seul ? 🎬",                      type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 2,  text: "Tu fais des rêves ou des cauchemars en lien avec cet événement — des nuits agitées à cause de ça ?",                                               type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 3,  text: "Il t'arrive de revivre un moment douloureux comme si tu y étais encore — les images, les sensations, tout revient d'un coup ?",                    type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 4,  text: "Quand quelque chose te rappelle cet événement — un bruit, une odeur, une situation — tu te sens {{submergé|submergée}} d'émotions ?",                         type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 5,  text: "Ton corps réagit physiquement quand quelque chose te rappelle cet événement — le cœur qui s'accélère, des tensions, des sueurs ?",                 type: 'likert', options: opts, subscale: 'intrusion' },
    { id: 6,  text: "Tu évites de penser à cet événement ou de laisser monter les émotions qui y sont liées — comme si tu fermais un tiroir dans ta tête ?",             type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 7,  text: "Tu évites certains endroits, certaines personnes ou situations parce qu'ils te rappellent ce qui s'est passé ?",                                    type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 8,  text: "Tu as des trous de mémoire sur certaines parties de cet événement — comme si ton cerveau avait effacé des passages ?",                              type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 9,  text: "Tu as des pensées négatives persistantes sur toi-même, les autres ou le monde — du genre « je ne vaux rien » ou « on ne peut faire confiance à personne » ?", type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 10, text: "Tu te blâmes pour ce qui s'est passé, ou tu en veux à quelqu'un d'autre — même si rationnellement tu sais que ce n'est peut-être pas si simple ?",  type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 11, text: "Tu ressens souvent des émotions lourdes — peur, colère, culpabilité, honte — qui te pèsent au quotidien ?",                                        type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 12, text: "Les activités qui te faisaient plaisir avant ne t'intéressent plus vraiment — comme si la motivation avait disparu ?",                              type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 13, text: "Tu te sens {{éloigné|éloignée}} des autres, un peu {{coupé|coupée}} du monde — même quand tu es {{entouré|entourée}} ?",                                                      type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 14, text: "Tu as du mal à ressentir des émotions positives — la joie, la tendresse, l'enthousiasme semblent hors de portée ?",                                type: 'likert', options: opts, subscale: 'cognition_mood' },
    { id: 15, text: "Tu t'emportes plus facilement qu'avant, ou tu sens une colère qui monte vite — parfois sans raison apparente ?",                                   type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 16, text: "Tu prends des risques que tu n'aurais pas pris avant — conduire trop vite, boire plus, te mettre en danger ?",                                     type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 17, text: "Tu es constamment sur tes gardes, en alerte, comme si un danger pouvait surgir à tout moment ?",                                                   type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 18, text: "Tu sursautes facilement — un bruit soudain, un mouvement inattendu, et ton corps réagit fort ?",                                                  type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 19, text: "Tu as du mal à te concentrer — ta tête part ailleurs, tu perds le fil facilement ?",                                                               type: 'likert', options: opts, subscale: 'hyperarousal' },
    { id: 20, text: "Le sommeil est compliqué — tu mets du temps à t'endormir, tu te réveilles en pleine nuit, ou tu ne te sens jamais vraiment {{reposé|reposée}} ?",           type: 'likert', options: opts, subscale: 'hyperarousal' },
  ],
  subscales: [
    { key: 'intrusion',       label: "Intrusion",                       itemIds: [1,2,3,4,5],         range: { min: 0, max: 20 } },
    { key: 'avoidance',       label: "Évitement",                       itemIds: [6,7],               range: { min: 0, max: 8 } },
    { key: 'cognition_mood',  label: "Altérations cognitives et humeur", itemIds: [8,9,10,11,12,13,14], range: { min: 0, max: 28 } },
    { key: 'hyperarousal',    label: "Hyperactivation",                  itemIds: [15,16,17,18,19,20],  range: { min: 0, max: 24 } },
  ],
  interpretation: [
    { min: 0,  max: 20, label: "Pas de signal d'alarme",       severity: 'minimal',  description: "Tes réponses sont en dessous du seuil clinique — ça veut dire que les symptômes traumatiques ne semblent pas peser sur ton quotidien en ce moment.", referralRequired: false, recommendation: "Continue à prendre soin de toi et à t'entourer de personnes qui te font du bien. Si les choses changent, n'hésite pas à refaire le point." },
    { min: 21, max: 32, label: "Quelques traces, mais pas de diagnostic",     severity: 'mild',     description: "Tu montres quelques signes de stress post-traumatique, sans atteindre le seuil clinique. C'est comme un bleu qui n'a pas encore complètement disparu.", referralRequired: false, recommendation: "Parler à un professionnel pourrait t'aider à comprendre ces traces et à t'en libérer avant qu'elles ne s'installent. Ce n'est pas urgent, mais c'est un cadeau que tu peux te faire." },
    { min: 33, max: 49, label: "Seuil clinique atteint — ton corps te parle",                severity: 'severe',   alertLevel: 2, description: "Ton score dépasse le seuil clinique (33). Cela ne veut pas dire que tu es « {{cassé|cassée}} » — cela veut dire que ce que tu as vécu a laissé une empreinte profonde qui mérite d'être accompagnée.", referralRequired: true, recommendation: "Je te recommande de consulter un psychologue ou psychiatre spécialisé en trauma. Des approches comme l'EMDR ou la thérapie cognitive du trauma ont fait leurs preuves. Tu mérites ce soutien." },
    { min: 50, max: 80, label: "Impact sévère — tu as besoin de soutien maintenant",                  severity: 'severe',   alertLevel: 3, description: "Ton score indique un niveau de souffrance élevé. Ce n'est pas une faiblesse — c'est le signe que tu portes un poids trop lourd {{tout|toute}} {{seul|seule}}.", referralRequired: true, recommendation: "Une consultation rapide avec un spécialiste du trauma est vraiment importante. En attendant, si tu te sens en détresse, le 3114 (numéro national de prévention du suicide) est disponible 24h/24. Tu n'es pas {{seul|seule}}." },
  ],

  contextQuestion: {
    id: 21,
    text: "L'événement difficile auquel tu penses en répondant à ces questions, c'est quelque chose de... ?",
    options: [
      { value: 1, label: "Lointain — ça remonte à plusieurs années et je m'en suis {{remis|remise}}", subtitle: "J'ai fait le chemin" },
      { value: 2, label: "Passé mais encore un peu présent dans ma tête", subtitle: "Quelques traces persistent" },
      { value: 3, label: "Relativement récent — quelques mois", subtitle: "C'est encore assez frais" },
      { value: 4, label: "Récent ou toujours en cours", subtitle: "Je suis encore dedans" },
    ],
    noScore: true as const,
    resolvedThreshold: 2,
  },

  resolvedInterpretation: [
    {
      min: 0, max: 20,
      label: "Sous le seuil clinique",
      severity: 'minimal' as const,
      description: "Les symptômes traumatiques sont sous le seuil clinique.",
      referralRequired: false,
      recommendation: "Continue à maintenir ton bien-être et ton réseau de soutien."
    },
    {
      min: 21, max: 32,
      label: "Traces d'un traumatisme passé",
      severity: 'mild' as const,
      description: "Il reste quelques traces d'un événement passé, mais elles ne semblent pas envahir ton quotidien actuel.",
      referralRequired: false,
      recommendation: "Ces traces sont normales après un événement difficile. Si elles te gênent, un professionnel peut t'aider à les apaiser davantage."
    },
    {
      min: 33, max: 49,
      label: "Empreinte traumatique résiduelle",
      severity: 'mild' as const,
      alertLevel: 1,
      description: "Ton score indique une empreinte traumatique encore présente, même si l'événement est passé. Le temps ne suffit pas toujours à tout effacer.",
      referralRequired: false,
      recommendation: "Un accompagnement spécialisé en trauma peut t'aider à alléger cette empreinte. Ce n'est pas une urgence, mais tu mérites ce soutien."
    },
    {
      min: 50, max: 80,
      label: "Impact traumatique encore actif",
      severity: 'moderate' as const,
      alertLevel: 2,
      description: "Même si l'événement remonte, ton score montre que le traumatisme a laissé des traces profondes qui continuent de t'affecter.",
      referralRequired: true,
      recommendation: "Une consultation avec un spécialiste du trauma est fortement recommandée. Les traces profondes peuvent être travaillées efficacement avec le bon accompagnement."
    },
  ],
};

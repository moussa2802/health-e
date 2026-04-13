import type { AssessmentScale } from '../../../types/assessment';

// ECR-R : Experiences in Close Relationships — Revised (Fraley, Waller & Brennan, 2000)
// 36 items, échelle 1-7
// Sous-échelles : Anxiété (items impairs 1,3,5…35) + Évitement (items pairs 2,4,6…36)
// Items inversés Évitement : 4, 16, 18, 22, 26, 28, 30, 34, 36 (formulation positive)
// Score : moyenne par sous-échelle (1–7), non une somme
// Quadrants : Sécure (<3.5//<3.5) | Préoccupé (≥3.5//<3.5) | Détaché (<3.5//≥3.5) | Craintif (≥3.5//≥3.5)

const opts = [
  { value: 1, label: "Pas du tout", subtitle: "Ça ne me correspond vraiment pas" },
  { value: 2, label: "Très peu", subtitle: "Presque pas" },
  { value: 3, label: "Un peu", subtitle: "Légèrement" },
  { value: 4, label: "Moyennement", subtitle: "Ni oui ni non" },
  { value: 5, label: "Assez", subtitle: "Plutôt oui" },
  { value: 6, label: "Beaucoup", subtitle: "Oui, clairement" },
  { value: 7, label: "Totalement", subtitle: "C'est tout à fait moi" },
];

export const ECR_R: AssessmentScale = {
  id: 'ecr_r',
  name: "Style d'Attachement Adulte",
  shortName: "ECR-R",
  category: 'mental_health',
  description: "Évalue le style d'attachement adulte selon deux dimensions : l'anxiété d'abandon et l'évitement de l'intimité. Identifie les quatre styles d'attachement (sécure, préoccupé, détaché, craintif).",
  instructions: "Ces affirmations concernent ta façon de vivre tes relations amoureuses. Il n'y a pas de bonne ou mauvaise réponse — fais confiance à ton ressenti 💛",
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
    { id: 1,  text: "Il t'arrive d'avoir peur que ton/ta partenaire arrête de t'aimer ?",                                                type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 3,  text: "Tu te surprends parfois à t'inquiéter que ton/ta partenaire ne veuille plus rester avec toi ?",                     type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 5,  text: "Tu aimerais que ton/ta partenaire ressente des choses aussi fortes que ce que tu ressens pour lui/elle ?",            type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 7,  text: "Tes relations amoureuses, c'est un sujet qui t'occupe beaucoup la tête ?",                                          type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 9,  text: "La peur d'être {{abandonné|abandonnée}}, c'est quelque chose qui te parle ? 🌧️",                                               type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 11, text: "Tu as l'impression que ton besoin d'être proche fait parfois fuir les gens autour de toi ?",                         type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 13, text: "Tu as peur que si ton/ta partenaire te découvrait vraiment — avec tes zones d'ombre — il/elle ne t'aimerait plus ?", type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 15, text: "Ça te frustre de ne pas recevoir autant d'affection et de soutien que ce dont tu aurais besoin ?",                   type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 17, text: "Il t'arrive de douter que ton/ta partenaire t'aime vraiment, au fond ?",                                            type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 19, text: "Tu as du mal à te laisser aller à compter sur tes partenaires ?",                                                    type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 21, text: "Tu as l'impression de donner beaucoup d'amour à des personnes qui t'en donnent moins en retour ?",                   type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 23, text: "Il t'arrive souvent d'avoir peur que ton/ta partenaire ne tienne pas vraiment à toi ?",                             type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 25, text: "Quand ton/ta partenaire passe du temps loin de toi, ça crée une forme de tension en toi ?",                         type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 27, text: "Ça te frustre quand ton/ta partenaire n'est pas aussi disponible que tu le voudrais ?",                              type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 29, text: "Tu as l'impression que ton/ta partenaire ne te remarque que quand tu es en colère ou que ça ne va pas ?",            type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 31, text: "Il t'arrive de te demander ce que ton/ta partenaire ressent vraiment pour toi ?",                                   type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 33, text: "Tu as le sentiment que tes partenaires ne veulent pas se rapprocher autant que toi tu le voudrais ?",                type: 'likert', options: opts, subscale: 'anxiety' },
    { id: 35, text: "Parfois, tu as l'impression de devoir « pousser » tes partenaires pour qu'ils montrent plus d'engagement ? 🫧",      type: 'likert', options: opts, subscale: 'anxiety' },
    // ── Évitement (items pairs) ──
    { id: 2,  text: "Tu préfères garder pour toi ce que tu ressens vraiment, plutôt que de le montrer à ton/ta partenaire ?",             type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 4,  text: "Te rapprocher émotionnellement de ton/ta partenaire, c'est quelque chose qui te vient assez naturellement ?",        type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 6,  text: "T'ouvrir vraiment à tes partenaires amoureux, c'est quelque chose qui te met mal à l'aise ?",                       type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 8,  text: "Tu préfères garder une certaine distance avec tes partenaires, ne pas être trop proche ?",                           type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 10, text: "Quand ton/ta partenaire veut beaucoup de proximité, ça te met un peu mal à l'aise ?",                               type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 12, text: "Tu voudrais te rapprocher de ton/ta partenaire, mais tu finis toujours par reculer un peu ? 🐚",                     type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 14, text: "Tu te sens un peu {{nerveux|nerveuse}} quand tes partenaires s'approchent trop près émotionnellement ?",                      type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 16, text: "Tu sens que ton/ta partenaire te comprend vraiment et comprend tes besoins ?",                                       type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 18, text: "D'habitude, tu parles de tes soucis et de ce qui te préoccupe avec ton/ta partenaire ?",                            type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 20, text: "Compter sur tes partenaires amoureux, c'est quelque chose qui ne te met pas très à l'aise ?",                       type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 22, text: "L'idée que ton/ta partenaire puisse te quitter, c'est un truc qui ne t'inquiète pas trop ?",                        type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 24, text: "Tu essaies d'éviter de trop te rapprocher émotionnellement de ton/ta partenaire ?",                                  type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 26, text: "Dans les moments difficiles, te tourner vers ton/ta partenaire ça te réconforte ? 🤲",                               type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 28, text: "Tu dirais que tu racontes à peu près tout à ton/ta partenaire ?",                                                   type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 30, text: "Quand quelque chose te tracasse, tu en parles avec ton/ta partenaire ?",                                            type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 32, text: "Être proche des gens, ça te met un peu mal à l'aise au fond ?",                                                     type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 34, text: "Compter sur tes partenaires amoureux, c'est quelque chose qui te vient facilement ?",                                type: 'likert', options: opts, subscale: 'avoidance' },
    { id: 36, text: "Être {{affectueux|affectueuse}} avec ton/ta partenaire, c'est naturel pour toi ? 💛",                                            type: 'likert', options: opts, subscale: 'avoidance' },
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
      label: "Attachement sécure — tu es à l'aise dans tes liens",
      severity: 'positive',
      description: "Ton profil montre un bel équilibre : tu n'as pas vraiment peur d'être {{abandonné|abandonnée}}, et tu te sens à l'aise avec l'intimité et la confiance mutuelle. C'est une vraie force dans tes relations — tu arrives à être proche de l'autre tout en gardant ta propre assise 🌿",
      referralRequired: false,
      recommendation: "Continue à nourrir tes relations comme tu le fais déjà : par l'écoute, la communication ouverte et la confiance. Si tu veux aller encore plus loin, explorer ta propre histoire d'attachement peut t'aider à comprendre d'où vient cette sécurité — et à la transmettre autour de toi."
    },
    {
      min: 108, max: 162,
      label: "Attachement en zone intermédiaire — il y a des pistes à explorer",
      severity: 'mild',
      description: "Tes résultats montrent un niveau modéré d'anxiété ou de distance dans tes relations. Concrètement, ça peut vouloir dire que tu oscilles entre le besoin d'être {{rassuré|rassurée}} et l'envie de garder un peu de distance. C'est très courant et ça ne définit pas qui tu es — ça raconte simplement comment tu te protèges en amour.",
      referralRequired: false,
      recommendation: "Regarde de plus près tes deux sous-scores (anxiété et évitement) pour mieux comprendre ta tendance. Un travail avec un professionnel — même quelques séances — peut t'aider à repérer tes schémas relationnels et à te sentir plus {{serein|sereine}} dans tes liens 💛"
    },
    {
      min: 163, max: 252,
      label: "Attachement insécure marqué — tu mérites un accompagnement",
      severity: 'moderate',
      description: "Tes résultats révèlent une anxiété et une distance élevées dans tes relations. Ça peut ressembler à un tiraillement douloureux : vouloir l'amour et la proximité tout en ayant peur d'être {{blessé|blessée}} si tu te montres vulnérable. Ce n'est pas une fatalité — c'est souvent le reflet d'expériences passées qui ont marqué ta façon de t'attacher.",
      referralRequired: true,
      recommendation: "Un accompagnement psychologique centré sur l'attachement peut vraiment changer les choses. Des approches comme la thérapie centrée sur les émotions (EFT) ou la thérapie des schémas sont particulièrement adaptées. Tu mérites des liens où tu te sens en sécurité — et c'est tout à fait possible d'y arriver avec un bon soutien 🌱"
    },
  ],
};

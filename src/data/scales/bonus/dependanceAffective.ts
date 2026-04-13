import type { AssessmentScale } from '../../../types/assessment';

// DAQ adapté : Dépendance Affective — 15 items, Likert 0-4
// Score total : 0-60  |  Seuils : 0-15 / 16-30 / 31-45 / 46-60
// Inspiré du Dependent Personality Questionnaire et de l'échelle de Livesley

const opts = [
  { value: 0, label: 'Pas du tout moi', subtitle: "Ça ne me correspond vraiment pas" },
  { value: 1, label: 'Un peu moi', subtitle: "Ça me ressemble vaguement" },
  { value: 2, label: 'Moyennement moi', subtitle: "Ça dépend des moments" },
  { value: 3, label: 'Beaucoup moi', subtitle: "Ça me correspond bien" },
  { value: 4, label: 'Tout à fait moi', subtitle: "C'est exactement moi" },
];

export const BONUS_DEPENDANCE: AssessmentScale = {
  id: 'bonus_dependance',
  name: 'Dépendance affective',
  shortName: 'DAQ',
  category: 'bonus',
  description: 'Évalue le niveau de dépendance affective dans les relations — la tendance à s\'oublier pour maintenir un lien.',
  instructions: 'Ces questions parlent de toi dans tes relations proches. Indique dans quelle mesure chacune te correspond — pas juste en ce moment, mais en général 💛',
  timeEstimateMinutes: 5,
  reference: 'Adapté du Dependent Personality Questionnaire (Livesley et al.) et des travaux de Bornstein (1993) sur la dépendance.',
  licenseNote: 'Adaptation française à usage d\'auto-évaluation psychologique.',
  warningMessage: 'Ce test explore des dynamiques relationnelles courantes. Il ne remplace pas une évaluation clinique.',
  scoreRange: { min: 0, max: 60 },
  items: [
    { id: 1,  text: 'Tu as besoin qu\'on te rassure souvent pour croire que la personne que tu aimes tient vraiment à toi ?', type: 'likert', options: opts },
    { id: 2,  text: 'Quand tu dois prendre une décision importante, tu as du mal à le faire sans demander l\'avis de quelqu\'un de proche ?', type: 'likert', options: opts },
    { id: 3,  text: 'Il t\'arrive de t\'adapter aux envies des autres — même quand ça ne te convient pas — par peur d\'être {{abandonné|abandonnée}} ou {{rejeté|rejetée}} ?', type: 'likert', options: opts },
    { id: 4,  text: 'Quand tu te retrouves {{seul|seule}}, tu te sens {{perdu|perdue}}, vide, ou profondément mal à l\'aise ? 🫧', type: 'likert', options: opts },
    { id: 5,  text: 'Tu préfères souvent faire selon les envies des autres plutôt que d\'affirmer ce que toi, tu veux vraiment ?', type: 'likert', options: opts },
    { id: 6,  text: 'Dans tes relations, tu as tendance à t\'oublier — à tout donner pour plaire et être {{apprécié|appréciée}} ?', type: 'likert', options: opts },
    { id: 7,  text: 'L\'idée d\'être {{quitté|quittée}} ou {{abandonné|abandonnée}} te fait vraiment paniquer — une peur intense, viscérale ?', type: 'likert', options: opts },
    { id: 8,  text: 'Tu te sens {{incomplet|incomplète}} ou moins bien quand tu n\'as pas de relation proche avec quelqu\'un dans ta vie ?', type: 'likert', options: opts },
    { id: 9,  text: 'Tu as du mal à dire que tu n\'es pas d\'accord avec les personnes dont tu as besoin émotionnellement ?', type: 'likert', options: opts },
    { id: 10, text: 'Tu dépenses beaucoup d\'énergie à éviter les conflits, juste pour ne pas risquer de perdre une relation qui compte ? 🤐', type: 'likert', options: opts },
    { id: 11, text: 'Tu te sens responsable du bonheur et du bien-être émotionnel des personnes que tu aimes — comme si c\'était ton rôle ?', type: 'likert', options: opts },
    { id: 12, text: 'Il t\'est déjà arrivé de tolérer des choses inacceptables juste pour ne pas perdre quelqu\'un d\'important ?', type: 'likert', options: opts },
    { id: 13, text: 'Tu cherches constamment l\'approbation des autres pour te sentir bien dans ta peau ?', type: 'likert', options: opts },
    { id: 14, text: 'La solitude te semble insupportable, même quand c\'est juste pour quelques heures ?', type: 'likert', options: opts },
    { id: 15, text: 'Tu t\'attaches très vite et très fort aux personnes qui entrent dans ta vie — presque instantanément ? 💫', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 15,
      label: 'Très peu de dépendance affective',
      severity: 'minimal',
      description: 'Tu sembles avoir une belle autonomie affective. Tu sais créer des liens forts avec les autres tout en gardant ton identité et ton espace — c\'est un vrai équilibre.',
      referralRequired: false,
      recommendation: 'Continue à cultiver cette capacité à être {{connecté|connectée}} aux autres tout en restant fidèle à toi-même. C\'est une vraie force.',
    },
    {
      min: 16, max: 30,
      label: 'Dépendance affective légère',
      severity: 'mild',
      description: 'Tu as quelques tendances à la dépendance affective — rien d\'alarmant, c\'est très courant, surtout dans les relations intenses. Ces dynamiques peuvent évoluer avec un peu de conscience de soi.',
      referralRequired: false,
      recommendation: 'Prendre le temps d\'explorer tes besoins affectifs — en solo ou avec un thérapeute — peut t\'aider à renforcer ton autonomie émotionnelle et à te sentir plus solide.',
    },
    {
      min: 31, max: 45,
      label: 'Dépendance affective modérée',
      severity: 'moderate',
      description: 'Tu as une dépendance affective assez présente qui peut peser sur tes relations et ton bien-être au quotidien. Tu as tendance à t\'oublier pour maintenir le lien — et ça, ça finit par coûter cher émotionnellement.',
      referralRequired: false,
      recommendation: 'Un accompagnement psychologique peut faire une vraie différence. Apprendre à t\'aimer d\'abord, c\'est la clé pour construire des relations plus équilibrées et plus épanouissantes.',
    },
    {
      min: 46, max: 60,
      label: 'Dépendance affective forte',
      severity: 'severe',
      description: 'Tu présentes une dépendance affective forte qui affecte probablement ta qualité de vie et tes relations de manière significative. Ce n\'est pas une fatalité — mais c\'est important d\'en prendre conscience.',
      referralRequired: true,
      recommendation: 'Un suivi avec un professionnel est vraiment recommandé. La dépendance affective, ça se travaille — et tu n\'as pas à rester {{prisonnier|prisonnière}} de ces schémas. Tu mérites des relations où tu te sens libre.',
      alertLevel: 1,
    },
  ],
};

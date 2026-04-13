import type { AssessmentScale } from '../../../types/assessment';

// HPI — Haut Potentiel Intellectuel : estimation par traits cognitifs et comportementaux
// Inspiré du GATES (Gifted and Talented Evaluation Scales) et des surexcitabilités de Dabrowski
// 15 items, Likert 0-4  |  Score 0-60
// Ce test est une estimation des traits associés au HPI — pas un test de QI

const opts = [
  { value: 0, label: 'Pas du tout moi', subtitle: "Ça ne me correspond vraiment pas" },
  { value: 1, label: 'Un peu moi', subtitle: "Ça me ressemble vaguement" },
  { value: 2, label: 'Moyennement moi', subtitle: "Ça dépend des moments" },
  { value: 3, label: 'Beaucoup moi', subtitle: "Ça me correspond bien" },
  { value: 4, label: 'Tout à fait moi', subtitle: "C'est exactement moi" },
];

export const BONUS_HPI: AssessmentScale = {
  id: 'bonus_hpi',
  name: 'Haut Potentiel Intellectuel',
  shortName: 'HPI / GATES',
  category: 'bonus',
  description: 'Estimation des traits associés au haut potentiel intellectuel — curiosité intense, vitesse de traitement, profondeur de pensée et sensibilité.',
  instructions: 'Ces questions portent sur ta façon de penser, de ressentir et de fonctionner. Dis-moi dans quelle mesure ça te correspond 🧠✨',
  timeEstimateMinutes: 5,
  reference: 'Adapté du GATES (Gifted and Talented Evaluation Scales, Gilliam et al.) et des travaux de Dabrowski sur les surexcitabilités intellectuelles.',
  licenseNote: 'Outil d\'estimation des traits associés au HPI — ne constitue pas un test de QI clinique.',
  warningMessage: 'Ce test mesure des traits comportementaux et cognitifs associés au haut potentiel — il ne remplace pas une évaluation psychométrique du QI.',
  scoreRange: { min: 0, max: 60 },
  items: [
    { id: 1,  text: 'Tes idées arrivent souvent plus vite que tu ne peux les suivre ou les noter ? 💡', type: 'likert', options: opts },
    { id: 2,  text: 'Tu t\'ennuies vite quand ce que tu fais n\'est pas assez complexe ou stimulant pour toi ?', type: 'likert', options: opts },
    { id: 3,  text: 'Tu fais naturellement des liens entre des idées ou des domaines que les autres ne relient pas du tout ?', type: 'likert', options: opts },
    { id: 4,  text: 'Tu te poses souvent des questions profondes — le sens de la vie, la conscience, l\'univers, l\'éthique… ce genre de trucs ? 🌌', type: 'likert', options: opts },
    { id: 5,  text: 'Tu as besoin de comprendre comment les choses fonctionnent vraiment en profondeur — la surface ne te suffit jamais ?', type: 'likert', options: opts },
    { id: 6,  text: 'Tu as souvent le sentiment de penser différemment des gens autour de toi ?', type: 'likert', options: opts },
    { id: 7,  text: 'Tu apprends des choses nouvelles très rapidement, parfois presque sans effort conscient ?', type: 'likert', options: opts },
    { id: 8,  text: 'Analyser, observer et comprendre les choses te procure autant (ou plus) de plaisir que de passer du temps avec les gens ?', type: 'likert', options: opts },
    { id: 9,  text: 'Tu as une mémoire impressionnante pour les faits, les détails ou les schémas complexes ? 🧩', type: 'likert', options: opts },
    { id: 10, text: 'Tu ressens un perfectionnisme intellectuel qui te pousse à creuser encore et encore jusqu\'à ce que tu comprennes vraiment ?', type: 'likert', options: opts },
    { id: 11, text: 'Tu anticipes souvent la suite logique d\'un raisonnement ou d\'une situation avant tout le monde ?', type: 'likert', options: opts },
    { id: 12, text: 'Les injustices ou les grands problèmes du monde t\'affectent émotionnellement, même quand ils ne te touchent pas directement ? 💔', type: 'likert', options: opts },
    { id: 13, text: 'Tu as des centres d\'intérêt très variés et tu t\'y plonges avec une intensité particulière ?', type: 'likert', options: opts },
    { id: 14, text: 'Tu as parfois du mal à trouver des personnes qui te comprennent vraiment — intellectuellement ou émotionnellement ?', type: 'likert', options: opts },
    { id: 15, text: 'Tu as souvent l\'impression que ton cerveau ne s\'arrête jamais complètement — même la nuit ou au repos ? 🔄', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 25,
      label: 'Fonctionnement intellectuel standard',
      severity: 'none',
      description: 'Peu de traits associés au haut potentiel ressortent dans ton profil — et c\'est tout à fait normal ! Tu fonctionnes de manière efficace et équilibrée, à ta façon.',
      referralRequired: false,
      recommendation: 'L\'intelligence prend plein de formes différentes. Ce test mesure un type particulier de fonctionnement cognitif parmi beaucoup d\'autres — ça ne dit rien sur ta valeur ou tes capacités globales 💙',
    },
    {
      min: 26, max: 40,
      label: 'Fonctionnement au-dessus de la moyenne',
      severity: 'mild',
      description: 'Tu présentes plusieurs traits associés à un haut potentiel intellectuel. Ta curiosité et ta profondeur de pensée sont probablement plus développées que la moyenne — tu le sens sûrement au quotidien.',
      referralRequired: false,
      recommendation: 'Ces traits sont une vraie ressource — dans ton travail, tes créations, tes relations. Nourris ta curiosité, elle est précieuse ✨',
    },
    {
      min: 41, max: 52,
      label: 'Indices forts de haut potentiel',
      severity: 'positive',
      description: 'Tu présentes de nombreux traits caractéristiques du haut potentiel intellectuel — pensée rapide, connexions créatives, intensité émotionnelle et intellectuelle. Ça ne m\'étonne pas si tu t\'es souvent {{senti|sentie}} "{{différent|différente}}" 🧠',
      referralRequired: false,
      recommendation: 'Si tu n\'as jamais été {{évalué|évaluée}} officiellement, un bilan psychométrique avec un psychologue pourrait confirmer ce que tu ressens déjà — et t\'aider à mieux comprendre ton fonctionnement.',
    },
    {
      min: 53, max: 60,
      label: 'Profil très fortement associé au HPI',
      severity: 'positive',
      description: 'Ton profil montre une très forte concentration de traits associés au haut potentiel intellectuel et émotionnel. Ce n\'est pas juste "être intelligent" — c\'est un mode de fonctionnement global qui touche tout : ta pensée, tes émotions, ta sensibilité.',
      referralRequired: false,
      recommendation: 'Comprendre son HPI peut vraiment changer la donne — dans tes relations, ton travail, ton bien-être. Un bilan avec un psychologue spécialisé peut être une expérience transformatrice. Tu mérites de te comprendre pleinement 💜',
    },
  ],
};

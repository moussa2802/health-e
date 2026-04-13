import type { AssessmentScale } from '../../../types/assessment';

// MACH-IV adapté : Machiavélisme et traits de manipulation
// 20 items, Likert 0-4  |  Score 0-80
// Christie, R. & Geis, F.L. (1970). Studies in Machiavellianism. Academic Press.

const opts = [
  { value: 0, label: "Pas du tout d'accord", subtitle: "Je rejette complètement cette idée" },
  { value: 1, label: "Plutôt pas d'accord", subtitle: "Je n'y adhère pas vraiment" },
  { value: 2, label: 'Neutre', subtitle: "Je n'ai pas d'avis tranché" },
  { value: 3, label: "Plutôt d'accord", subtitle: "Ça correspond assez à ce que je pense" },
  { value: 4, label: "Tout à fait d'accord", subtitle: "Je suis totalement de cet avis" },
];

export const BONUS_MANIPULATION: AssessmentScale = {
  id: 'bonus_manipulation',
  name: 'Manipulation & Machiavélisme',
  shortName: 'MACH-IV',
  category: 'bonus',
  description: 'Mesure les tendances machiavéliques — la propension à manipuler les autres pour servir ses propres intérêts.',
  instructions: 'Ces questions portent sur ta façon d\'interagir avec les autres et de voir les relations humaines. Pas de jugement — sois honnête 🎭',
  timeEstimateMinutes: 7,
  reference: 'Christie, R. & Geis, F.L. (1970). Studies in Machiavellianism. Academic Press.',
  licenseNote: 'Adaptation française du MACH-IV à usage d\'auto-évaluation psychologique.',
  warningMessage: 'Ce test mesure des tendances comportementales normales. Un score élevé ne fait pas de toi une mauvaise personne — cela indique un mode de fonctionnement pragmatique.',
  scoreRange: { min: 0, max: 80 },
  items: [
    { id: 1,  text: 'Tu penses qu\'il vaut mieux dire aux gens ce qu\'ils veulent entendre plutôt que la vérité, si ça arrange les choses ?', type: 'likert', options: opts },
    { id: 2,  text: 'Donner les vraies raisons de ce qu\'on fait, c\'est pas toujours la meilleure stratégie selon toi ?', type: 'likert', options: opts },
    { id: 3,  text: 'Il t\'arrive d\'utiliser la flatterie délibérément si ça peut te servir ?', type: 'likert', options: opts },
    { id: 4,  text: 'Tu penses que dans ce monde, il faut savoir se défendre — la gentillesse ne paie pas toujours ?', type: 'likert', options: opts },
    { id: 5,  text: 'Tu peux te montrer très aimable avec quelqu\'un si ça peut te faire avancer dans ce que tu veux ?', type: 'likert', options: opts },
    { id: 6,  text: 'Tu crois que la plupart des gens peuvent être convaincus ou influencés quand on sait comment s\'y prendre ?', type: 'likert', options: opts },
    { id: 7,  text: 'Un petit mensonge, c\'est pas si grave si personne ne se fait vraiment blesser — tu es d\'accord ?', type: 'likert', options: opts },
    { id: 8,  text: 'Tu préfères garder tes vraies intentions pour toi et ne les révéler que quand c\'est absolument nécessaire ?', type: 'likert', options: opts },
    { id: 9,  text: 'Omettre certaines informations vaut parfois mieux qu\'une explication trop franche, tu trouves ?', type: 'likert', options: opts },
    { id: 10, text: 'Tu penses qu\'il y a toujours un moyen de convaincre quelqu\'un — il suffit de comprendre ce qui le motive ?', type: 'likert', options: opts },
    { id: 11, text: 'Dans les négociations ou les décisions importantes, tu trouves que laisser les émotions de côté est plus efficace ?', type: 'likert', options: opts },
    { id: 12, text: 'Tu adaptes naturellement ton comportement selon ce qui semble le plus utile dans chaque situation ?', type: 'likert', options: opts },
    { id: 13, text: 'Dans tes relations, tu anticipes toujours ce qui pourrait te protéger en cas de conflit ou de rupture ?', type: 'likert', options: opts },
    { id: 14, text: 'Tu as déjà utilisé ton charme ou ta séduction pour obtenir quelque chose que tu voulais ?', type: 'likert', options: opts },
    { id: 15, text: 'Tu penses que les vrais leaders savent repérer et utiliser les failles ou les besoins des autres ?', type: 'likert', options: opts },
    { id: 16, text: 'Faire confiance trop vite à quelqu\'un, c\'est souvent une erreur stratégique selon toi ?', type: 'likert', options: opts },
    { id: 17, text: 'Tu choisis très soigneusement à qui tu confies tes vraies intentions ou tes faiblesses ?', type: 'likert', options: opts },
    { id: 18, text: 'Tu penses qu\'il est parfois nécessaire d\'être {{perçu|perçue}} comme redoutable pour être {{respecté|respectée}} ?', type: 'likert', options: opts },
    { id: 19, text: 'Tu surveilles les dynamiques de pouvoir dans tes relations et tu t\'y adaptes instinctivement ?', type: 'likert', options: opts },
    { id: 20, text: 'Tu penses que les fins justifient souvent les moyens — surtout quand les enjeux sont importants ?', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 20,
      label: 'Très peu de traits machiavéliques',
      severity: 'minimal',
      description: 'Tu as très peu de tendances stratégiques dans tes relations. Tu penches naturellement vers l\'honnêteté, la transparence et la confiance — c\'est beau, vraiment.',
      referralRequired: false,
      recommendation: 'Ton ouverture aux autres est une qualité précieuse. Veille juste à développer des limites saines pour ne pas te faire marcher dessus 💙',
    },
    {
      min: 21, max: 40,
      label: 'Machiavélisme sous la moyenne',
      severity: 'mild',
      description: 'Tu as quelques tendances pragmatiques dans tes relations, mais tu restes globalement {{ouvert|ouverte}} et sincère. Tu sais être stratégique quand il le faut — sans en faire un mode de vie.',
      referralRequired: false,
      recommendation: 'Cet équilibre entre stratégie et authenticité est une vraie force dans la vie sociale et professionnelle. C\'est un bon dosage 👌',
    },
    {
      min: 41, max: 60,
      label: 'Machiavélisme modéré',
      severity: 'moderate',
      description: 'Tu as un niveau modéré de tendances stratégiques. Tu es assez pragmatique dans tes interactions — parfois au prix de la transparence. Ça t\'a probablement rendu service, mais ça a aussi un coût.',
      referralRequired: false,
      recommendation: 'Réfléchir à l\'impact de ces stratégies sur la confiance dans tes relations proches peut être éclairant. Les gens les plus proches de toi ont besoin de sentir ta vraie version.',
    },
    {
      min: 61, max: 80,
      label: 'Tendances très stratégiques',
      severity: 'severe',
      description: 'Tu fonctionnes de manière très stratégique et pragmatique dans tes relations. Tu n\'hésites pas à manoeuvrer les situations à ton avantage — c\'est efficace, mais ça peut isoler.',
      referralRequired: false,
      recommendation: 'Ce mode de fonctionnement peut être puissant à court terme, mais il a un coût sur les relations profondes et durables. Un accompagnement peut t\'aider à explorer ces dynamiques — et à trouver un équilibre qui te ressemble davantage 🤝',
    },
  ],
};

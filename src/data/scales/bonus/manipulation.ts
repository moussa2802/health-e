import type { AssessmentScale } from '../../../types/assessment';

// MACH-IV adapté : Machiavélisme et traits de manipulation
// 20 items, Likert 0-4  |  Score 0-80
// Christie, R. & Geis, F.L. (1970). Studies in Machiavellianism. Academic Press.

const opts = [
  { value: 0, label: 'Pas du tout d\'accord' },
  { value: 1, label: 'Plutôt pas d\'accord' },
  { value: 2, label: 'Neutre' },
  { value: 3, label: 'Plutôt d\'accord' },
  { value: 4, label: 'Tout à fait d\'accord' },
];

export const BONUS_MANIPULATION: AssessmentScale = {
  id: 'bonus_manipulation',
  name: 'Manipulation & Machiavélisme',
  shortName: 'MACH-IV',
  category: 'bonus',
  description: 'Mesure les tendances machiavéliques — la propension à manipuler les autres pour servir ses propres intérêts.',
  instructions: 'Ces affirmations portent sur comment tu interagis avec les autres. Indique ton niveau d\'accord avec chacune. Sois honnête — il n\'y a pas de jugement.',
  timeEstimateMinutes: 7,
  reference: 'Christie, R. & Geis, F.L. (1970). Studies in Machiavellianism. Academic Press.',
  licenseNote: 'Adaptation française du MACH-IV à usage d\'auto-évaluation psychologique.',
  warningMessage: 'Ce test mesure des tendances comportementales normales. Un score élevé ne fait pas de toi une mauvaise personne — cela indique un mode de fonctionnement pragmatique.',
  scoreRange: { min: 0, max: 80 },
  items: [
    { id: 1,  text: 'Il vaut mieux dire aux gens ce qu\'ils veulent entendre plutôt que la vérité si ça arrange les choses.', type: 'likert', options: opts },
    { id: 2,  text: 'Donner les vraies raisons de ce qu\'on fait n\'est pas toujours la meilleure stratégie.', type: 'likert', options: opts },
    { id: 3,  text: 'Je n\'hésite pas à utiliser la flatterie si ça peut me servir.', type: 'likert', options: opts },
    { id: 4,  text: 'Dans ce monde, se défendre est souvent nécessaire — la gentillesse ne paie pas toujours.', type: 'likert', options: opts },
    { id: 5,  text: 'Je peux me montrer très aimable avec quelqu\'un si cela peut me faire avancer.', type: 'likert', options: opts },
    { id: 6,  text: 'La plupart des gens peuvent être convaincus ou influencés si on sait comment s\'y prendre.', type: 'likert', options: opts },
    { id: 7,  text: 'Il n\'y a rien de vraiment grave à mentir si personne ne se fait sérieusement blesser.', type: 'likert', options: opts },
    { id: 8,  text: 'Je préfère ne révéler mes vraies intentions que lorsque c\'est absolument nécessaire.', type: 'likert', options: opts },
    { id: 9,  text: 'Omettre certaines informations vaut parfois mieux qu\'une explication franche.', type: 'likert', options: opts },
    { id: 10, text: 'Il existe toujours un moyen de convaincre quelqu\'un si on prend le temps de comprendre ce qui le motive.', type: 'likert', options: opts },
    { id: 11, text: 'Laisser les émotions de côté dans les négociations ou les décisions importantes est souvent plus efficace.', type: 'likert', options: opts },
    { id: 12, text: 'J\'adapte naturellement mon comportement selon ce qui semble le plus utile dans une situation donnée.', type: 'likert', options: opts },
    { id: 13, text: 'J\'anticipe toujours ce qui pourrait me protéger dans une relation en cas de conflit ou de rupture.', type: 'likert', options: opts },
    { id: 14, text: 'J\'ai déjà utilisé mon charme ou ma séduction pour obtenir quelque chose que je voulais.', type: 'likert', options: opts },
    { id: 15, text: 'Les vrais leaders savent identifier et utiliser les failles ou les besoins des autres.', type: 'likert', options: opts },
    { id: 16, text: 'Faire confiance trop vite à quelqu\'un est souvent une erreur stratégique.', type: 'likert', options: opts },
    { id: 17, text: 'Je choisis très soigneusement à qui je confie mes vraies intentions ou mes faiblesses.', type: 'likert', options: opts },
    { id: 18, text: 'Il est parfois nécessaire d\'être perçu(e) comme redoutable pour être respecté(e).', type: 'likert', options: opts },
    { id: 19, text: 'Je surveille les dynamiques de pouvoir dans mes relations et je m\'y adapte.', type: 'likert', options: opts },
    { id: 20, text: 'Les fins justifient souvent les moyens — surtout quand les enjeux sont importants.', type: 'likert', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 20,
      label: 'Très peu de traits machiavéliques',
      severity: 'minimal',
      description: 'Tu as très peu de tendances machiavéliques. Tu tends vers l\'honnêteté, la transparence et la confiance dans tes relations.',
      referralRequired: false,
      recommendation: 'Ton ouverture aux autres est une qualité précieuse. Veille à développer des limites saines pour ne pas être exploité(e).',
    },
    {
      min: 21, max: 40,
      label: 'Machiavélisme sous la moyenne',
      severity: 'mild',
      description: 'Tu as quelques tendances pragmatiques dans tes relations, mais tu restes globalement ouvert(e) et honnête. Tu sais être stratégique quand c\'est nécessaire.',
      referralRequired: false,
      recommendation: 'Cet équilibre entre stratégie et sincérité peut être une vraie force dans la vie sociale et professionnelle.',
    },
    {
      min: 41, max: 60,
      label: 'Machiavélisme modéré',
      severity: 'moderate',
      description: 'Tu as un niveau modéré de tendances machiavéliques. Tu es assez pragmatique et stratégique dans tes interactions — parfois au détriment de la transparence.',
      referralRequired: false,
      recommendation: 'Réfléchir à l\'impact de ces stratégies sur la confiance dans tes relations proches peut être utile.',
    },
    {
      min: 61, max: 80,
      label: 'Machiavélisme élevé',
      severity: 'severe',
      description: 'Tu présentes un niveau élevé de traits machiavéliques. Tu es très stratégique, pragmatique et tu n\'hésites pas à manipuler les situations à ton avantage.',
      referralRequired: false,
      recommendation: 'Ce mode de fonctionnement peut être efficace à court terme mais coûteux en termes de relations profondes et durables. Un accompagnement peut aider à explorer ces dynamiques.',
    },
  ],
};

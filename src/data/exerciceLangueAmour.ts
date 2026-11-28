/**
 * L'exercice « Quelle est ta langue de l'amour ? » (séance vidéo 1 du cabinet de Dr Lô, « Mon mari ne m'aime pas »).
 * Validé par Papa Moussa le 28/11/2026 (Claude outputs/seances/videos/E01_exercice_langue_amour.md).
 * Un exercice pour réfléchir, PAS un test : les « cinq langues » viennent d'un livre grand public (Chapman), sans
 * validation clinique ; il n'est donc jamais rangé parmi les tests. 5 situations, une réponse par langue, la carte
 * de la langue la plus choisie (ou des deux, à égalité). Aucun appel à l'IA.
 */

export type Langue = 'presence' | 'mots' | 'actes' | 'tendresse' | 'attentions';
export const LANGUES: Langue[] = ['presence', 'mots', 'actes', 'tendresse', 'attentions'];

export interface Situation { question: string; reponses: Record<Langue, string> }

export const SITUATIONS: Situation[] = [
  {
    question: 'Tu rentres d\'une journée très dure. Ce qui te ferait le plus de bien :',
    reponses: {
      presence: 'Qu\'on s\'asseye avec moi, téléphone posé, pour m\'écouter.',
      mots: 'Qu\'on me dise des mots doux : « Bravo, tu tiens bon. »',
      actes: 'Que le repas soit prêt et que je n\'aie rien à faire.',
      tendresse: 'Un câlin, une main sur l\'épaule.',
      attentions: 'Trouver une petite surprise qui montre qu\'on a pensé à moi.',
    },
  },
  {
    question: 'Pour ton anniversaire, ce qui te toucherait le plus :',
    reponses: {
      presence: 'Une journée entière rien que tous les deux.',
      mots: 'Un long message où l\'autre dit tout ce que je représente.',
      actes: 'Que l\'autre règle enfin un problème qui me pesait.',
      tendresse: 'Un long câlin, dans ses bras.',
      attentions: 'Un cadeau choisi avec soin, qui prouve qu\'on me connaît.',
    },
  },
  {
    question: 'Ce qui te blesse le plus, c\'est quand l\'autre…',
    reponses: {
      presence: 'est là sans être là, toujours sur son téléphone.',
      mots: 'ne dit jamais rien de gentil, ou te parle durement.',
      actes: 'promet de t\'aider, et ne le fait pas.',
      tendresse: 'évite tout contact, même une main.',
      attentions: 'oublie une date ou une chose importante pour toi.',
    },
  },
  {
    question: 'Quand tu veux montrer ton amour à quelqu\'un, tu as tendance à…',
    reponses: {
      presence: 'lui consacrer du temps, rien que pour lui ou pour elle.',
      mots: 'le lui dire, le lui écrire.',
      actes: 'faire des choses pour l\'autre : aider, régler, assurer.',
      tendresse: 'le prendre dans tes bras, être tout près.',
      attentions: 'lui offrir quelque chose, penser à lui ou à elle.',
    },
  },
  {
    question: 'Après une dispute, ce qui te réconcilie vraiment :',
    reponses: {
      presence: 'Qu\'on prenne le temps de parler, vraiment, tous les deux.',
      mots: 'Entendre « pardon », et « je t\'aime ».',
      actes: 'Que l\'autre répare, par des actes plutôt que par des mots.',
      tendresse: 'Un geste tendre, se rapprocher.',
      attentions: 'Un petit signe : mon plat préféré, un message, une attention.',
    },
  },
];

/** L'ordre des réponses à l'écran : mélangé, mais fixe pour chaque situation (pas de saut d'un affichage à l'autre). */
export function ordreReponses(i: number): Langue[] {
  const d = (i * 2 + 1) % LANGUES.length;
  return [...LANGUES.slice(d), ...LANGUES.slice(0, d)];
}

/**
 * La ou les langues du résultat : la plus choisie ; à égalité, les deux premières selon les situations les plus
 * parlantes (ce qui blesse, puis la journée dure, la réconciliation, l'anniversaire, ce qu'on donne).
 */
export function resultat(choix: Langue[]): Langue[] {
  if (!choix.length) return [];
  const n: Record<string, number> = {};
  for (const l of choix) n[l] = (n[l] || 0) + 1;
  const max = Math.max(...Object.values(n));
  const ex = LANGUES.filter(l => n[l] === max);
  if (ex.length === 1) return ex;
  const priorite = [2, 0, 4, 1, 3].map(i => choix[i]).filter(Boolean);
  const vus: Langue[] = [];
  for (const l of priorite) if (ex.includes(l) && !vus.includes(l)) vus.push(l);
  for (const l of ex) if (!vus.includes(l)) vus.push(l);
  return vus.slice(0, 2);
}

export interface CarteLangue { nom: string; titre: string; texte: string; conseil: string; piege: string }

export const CARTES: Record<Langue, CarteLangue> = {
  presence: {
    nom: 'La présence',
    titre: 'Ta langue, c\'est la présence.',
    texte: 'Pour toi, l\'amour se mesure au temps qu\'on te donne, aux yeux qui te regardent vraiment. C\'est la langue d\'Aïssatou. Quand l\'autre est absent, même pour de bonnes raisons, une petite voix te dit « je ne compte pas ». Elle n\'a pas toujours raison.',
    conseil: 'Demande un moment précis plutôt qu\'un reproche. « Ce soir, une heure rien que nous deux ? » s\'entend mieux que « tu n\'es jamais là ».',
    piege: 'Prendre l\'absence de l\'autre pour un manque d\'amour.',
  },
  mots: {
    nom: 'Les mots',
    titre: 'Ta langue, ce sont les mots.',
    texte: 'Un « je pense à toi », un « je suis fier de toi », et ta journée change. Le silence te fait douter. Mais beaucoup de gens aiment fort et parlent peu, surtout ceux à qui personne n\'a appris à le dire.',
    conseil: 'Dis à l\'autre ce que ça te fait quand il te parle gentiment. On répète plus facilement ce qui a fait du bien.',
    piege: 'N\'entendre que les mots, et passer à côté de tout ce que l\'autre fait.',
  },
  actes: {
    nom: 'Les actes',
    titre: 'Ta langue, ce sont les actes.',
    texte: 'Pour toi, aimer, c\'est faire : être là quand il faut porter, régler, assurer, comme le mari d\'Aïssatou. Un service rendu te touche plus qu\'une belle phrase.',
    conseil: 'Ce que tu fais par amour, l\'autre ne le voit pas toujours comme de l\'amour. Dis-le de temps en temps : « Je fais ça pour nous. »',
    piege: 'Tout donner en actes, et ne jamais demander ce dont tu as besoin.',
  },
  tendresse: {
    nom: 'La tendresse',
    titre: 'Ta langue, c\'est la tendresse.',
    texte: 'Une main posée, une étreinte, être tout près : pour toi, les gestes disent ce que les mots ne disent pas. Quand ils manquent, tu te sens loin, même dans la même pièce.',
    conseil: 'Commence par les petits gestes du quotidien, sans attendre, et dis à l\'autre qu\'ils te font du bien.',
    piege: 'Croire qu\'un manque de gestes est un manque d\'amour. Chez beaucoup, c\'est de la pudeur.',
  },
  attentions: {
    nom: 'Les attentions',
    titre: 'Ta langue, ce sont les attentions.',
    texte: 'Ce n\'est pas le prix qui compte : c\'est que l\'autre ait pensé à toi quand tu n\'étais pas là. Un oubli peut te blesser plus qu\'il ne l\'imagine.',
    conseil: 'Dis simplement ce qui compte pour toi (une date, un goût, un rituel). L\'autre n\'est pas devin.',
    piege: 'Tester l\'autre en silence, puis lui en vouloir de ne pas avoir deviné.',
  },
};

export const PHRASE_SEMAINE = '« Je sais que tu m\'aimes à ta façon. Ce qui me ferait du bien, c\'est… » Termine-la avec tes mots, dans ta langue.';
export const AVERTISSEMENT_LANGUES = 'Les cinq langues de l\'amour sont une image utile, tirée d\'un livre grand public : ce n\'est pas un diagnostic.';
export const AVERTISSEMENT_VIOLENCE = 'Si, en plus de l\'absence, il y a du mépris, des menaces ou des coups, ce n\'est plus une question de langue : parles-en à quelqu\'un, ou dépose ta question, anonymement, dans la boîte.';

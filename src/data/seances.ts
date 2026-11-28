/**
 * Les séances (« Le cabinet de Dr Lô ») : Dr Lô parle à la personne comme si elle était assise dans son cabinet, et c'est
 * elle qui répond. Décision de Papa Moussa (25/11/2026) : pas d'autre patient raconté, la personne est impliquée dès la
 * première phrase par des choix à deux réponses ; chaque réponse a sa suite (un court passage audio), les branches se
 * rejoignent à chaque question, et la fin dépend de l'ensemble des réponses (étiquettes comptées).
 * Ses choix vont dans son carnet « Séances » (lié au compte : le compagnon s'en souvient sur tous ses appareils).
 * Rangées avec le Cas du soir. Visibles du propriétaire seulement tant que SEANCES_PUBLIC est false.
 * Le texte à enregistrer est produit à partir de ces données : Claude outputs/seances/<n>_<id>/SCRIPT.md.
 */

export const SEANCES_PUBLIC = false;
export const SEANCES_CARNET = 'Séances';

export interface ChoixSeance {
  /** Ce que la personne répond, avec ses mots */
  label: string;
  /** Le passage qui suit */
  suite: string;
  /** Ce que la réponse dit d'elle (pour choisir la fin) */
  tag?: string;
}

export interface NoeudSeance {
  /** Ce que dit Dr Lô dans ce passage (un paragraphe par bloc) */
  blocs: string[];
  /** Le fichier audio de ce passage (absent tant qu'il n'est pas enregistré : le texte s'affiche seul) */
  audio?: string | null;
  /** La question posée à la fin du passage (rappelée au-dessus des réponses) */
  question?: string;
  choix?: ChoixSeance[];
  /** Pas de choix : le passage suivant */
  suite?: string;
  /** La fin selon les réponses : l'étiquette la plus fréquente décide ; sinon « autre » */
  selon?: Record<string, string> & { autre: string };
  /** Le dernier passage */
  fin?: true;
}

export interface Seance {
  id: string;
  n: number;
  titre: string;
  accroche: string;
  categorie: 'mentale' | 'sexuelle';
  minutes: number;
  image: string;
  depart: string;
  noeuds: Record<string, NoeudSeance>;
  testLie: string | null;
  casLie: { id: string; titre: string } | null;
}

const seance1: Seance = {
  id: 'pourquoi-je-ne-vais-pas-bien',
  n: 1,
  titre: 'Pourquoi je ne vais pas bien ?',
  accroche: 'Tu ne vas pas bien, et tu ne sais pas pourquoi. Cinq questions, et c\'est toi qui réponds.',
  categorie: 'mentale',
  minutes: 5,
  image: '/images/cas-du-soir/drlo-lecon.webp',
  depart: 'accueil',
  testLie: 'phq9',
  casLie: { id: 'goumin', titre: 'Goumin' },
  noeuds: {
    accueil: {
      blocs: [
        'Installe-toi. Ici, personne ne te juge, et personne ne t\'entend à part moi.',
        'Si je te demandais, là, maintenant : comment tu vas, vraiment ? Tu me répondrais quoi ?',
      ],
      question: 'Comment tu vas, vraiment ?',
      choix: [
        { label: 'Ça va… comme d\'habitude.', suite: 'q1a' },
        { label: 'Honnêtement ? Pas très bien.', suite: 'q1b' },
      ],
    },
    q1a: {
      blocs: ['« Comme d\'habitude. » Tu sais, c\'est souvent la réponse de ceux qui ont arrêté de se poser la question. On tient, on avance, on ne regarde plus. Alors regardons, juste un instant.'],
      suite: 'q2',
    },
    q1b: {
      blocs: ['Merci de me le dire. Ce n\'est pas rien. Beaucoup de gens répondent « ça va » toute leur vie, même quand ça ne va pas. Toi, tu viens de faire le premier pas.'],
      suite: 'q2',
    },
    q2: {
      blocs: ['Ce mal-être, ou cette fatigue… est-ce que tu pourrais dire quand ça a commencé ?'],
      question: 'Tu sais quand ça a commencé ?',
      choix: [
        { label: 'Oui, il s\'est passé quelque chose.', suite: 'q2a', tag: 'peine' },
        { label: 'Non, c\'est venu petit à petit.', suite: 'q2b', tag: 'oubli' },
      ],
    },
    q2a: {
      blocs: ['Souvent, on le sait, mais on ne fait pas le lien. Un départ, une rupture, un décès, un mariage, un déménagement, une maladie dans la famille. L\'événement peut être fini, et la peine rester. Ce n\'est pas de la faiblesse : c\'est qu\'on n\'a pas eu le temps, ou le droit, d\'en souffrir.'],
      suite: 'q3',
    },
    q2b: {
      blocs: ['Quand ça vient petit à petit, c\'est souvent l\'usure : trop donner, trop longtemps, sans rien recevoir en retour. On ne s\'effondre pas d\'un coup. On s\'éteint doucement, et on s\'en rend compte un jour où l\'on ne trouve plus de goût à rien.'],
      suite: 'q3',
    },
    q3: {
      blocs: ['Dis-moi : ces derniers temps, tu vis surtout pour qui ?'],
      question: 'Tu vis surtout pour qui ?',
      choix: [
        { label: 'Pour les autres : ma famille, mon travail, ce qu\'on attend de moi.', suite: 'q3a', tag: 'oubli' },
        { label: 'Pour moi… mais je ne sais plus ce que je veux.', suite: 'q3b', tag: 'peine' },
      ],
    },
    q3a: {
      blocs: ['Chez nous, on apprend très tôt à tenir. Muñ. Supporter, c\'est une force. Mais quand on ne fait plus que supporter, on finit par disparaître de sa propre vie. Les autres comptent. Toi aussi.'],
      suite: 'q4',
    },
    q3b: {
      blocs: ['Ne plus savoir ce qu\'on veut, c\'est souvent le signe qu\'on a longtemps voulu ce que les autres voulaient pour nous. Ce n\'est pas un vide. C\'est une place libre, qu\'on peut réapprendre à remplir.'],
      suite: 'q4',
    },
    q4: {
      blocs: ['Est-ce qu\'il y a quelque chose que tu gardes pour toi, que tu n\'as dit à personne ?'],
      question: 'Tu gardes quelque chose pour toi ?',
      choix: [
        { label: 'Oui.', suite: 'q4a', tag: 'peine' },
        { label: 'Non, pas vraiment.', suite: 'q4b', tag: 'oubli' },
      ],
    },
    q4a: {
      blocs: ['Je ne te demande pas de me le dire. Mais sache une chose : ce qu\'on garde seul pèse deux fois plus. Une fatigue, une colère, une peur, une blessure… Le dire à une seule personne de confiance, c\'est déjà en porter moins.'],
      suite: 'q5',
    },
    q4b: {
      blocs: ['D\'accord. Parfois, ce n\'est pas un secret qu\'on garde. C\'est soi-même qu\'on garde à l\'écart : on écoute tout le monde, et personne ne nous demande comment on va. D\'ailleurs, quand est-ce que quelqu\'un te l\'a demandé pour la dernière fois ?'],
      suite: 'q5',
    },
    q5: {
      blocs: ['Dernière question. Si ta tristesse pouvait parler, d\'après toi, elle te demanderait plutôt…'],
      question: 'Ta tristesse te demanderait plutôt…',
      choix: [
        { label: 'Du repos. Qu\'on me laisse souffler.', suite: 'conclusion', tag: 'oubli' },
        { label: 'De l\'aide. De ne plus porter ça seul.', suite: 'conclusion', tag: 'peine' },
      ],
    },
    conclusion: {
      blocs: ['Je vais te dire ce que j\'entends dans tes réponses.'],
      selon: { oubli: 'fin_oubli', peine: 'fin_peine', autre: 'fin_oubli' },
    },
    fin_oubli: {
      blocs: [
        'Tu n\'es pas faible, et tu n\'es pas ingrat. Tu t\'es oublié. À force de tenir pour tout le monde, il ne reste plus beaucoup de place pour toi. La tristesse, c\'est souvent ça : un message qui dit « et moi ? ».',
        'Cette semaine, reprends une seule chose qui était à toi : une marche, une amie, un moment de prière au calme, une heure sans rien devoir à personne. Une seule. C\'est un début.',
      ],
      suite: 'fin',
    },
    fin_peine: {
      blocs: [
        'Tu portes une peine qui n\'a pas eu sa place. Quelque chose s\'est passé, ou quelque chose pèse, et tu continues comme si de rien n\'était. Une peine qu\'on ne dit pas ne s\'en va pas : elle attend.',
        'Cette semaine, choisis une personne de confiance, et dis-lui une phrase, juste une : « Je ne vais pas très bien en ce moment. » C\'est un début.',
      ],
      suite: 'fin',
    },
    fin: {
      blocs: [
        'Chez nous, on dit : « Nit nittay garabam » : l\'homme est le remède de l\'homme. Personne ne guérit seul.',
        'Une chose encore. Si ta tristesse est là presque tous les jours depuis plus de deux semaines, si tu ne dors plus, si tu ne trouves plus de goût à rien, ce n\'est plus seulement un mal-être : parles-en à un médecin ou à un psychologue. Et si un jour tu penses à ne plus vivre, appelle tout de suite quelqu\'un, ou le 1515.',
        'Prends soin de toi. On se retrouve à la prochaine séance.',
      ],
      fin: true,
    },
  },
};

export const SEANCES: Seance[] = [seance1];

/**
 * Les séances en vidéo (« Le cabinet de Dr Lô », virage du 26-27/11) : un dialogue dessiné de 2 minutes, puis un
 * exercice d'une minute sur le site. `publique` reste false (visible du propriétaire seulement) jusqu'à la mise en
 * ligne décidée par Papa Moussa. Elles passent avant les séances en conversation, et répondent aussi à /s/<n>.
 */
export interface SeanceVideo {
  id: string;
  n: number;
  titre: string;
  accroche: string;
  categorie: 'mentale' | 'sexuelle';
  /** Durée de la vidéo, en minutes */
  minutes: number;
  video: string;
  affiche: string;
  /** L'exercice qui suit la vidéo */
  exercice: { lien: string; titre: string; bouton: string };
  publique: boolean;
}

export const SEANCES_VIDEO: SeanceVideo[] = [{
  id: 'mon-mari-ne-m-aime-pas',
  n: 1,
  titre: 'Mon mari ne m\'aime pas',
  accroche: 'Aïssatou est sûre que son mari ne l\'aime pas. Et si elle se trompait de langue ?',
  categorie: 'mentale',
  minutes: 2,
  video: '/videos/seances/e01-mon-mari-ne-m-aime-pas.mp4',
  affiche: '/images/seances/e01-affiche.webp',
  exercice: { lien: '/exercice/langue-amour', titre: 'Quelle est ta langue de l\'amour ?', bouton: 'Fais l\'exercice (1 min)' },
  publique: true,
}];

export const seanceVideoById = (id: string) => SEANCES_VIDEO.find(s => s.id === id || String(s.n) === id) || null;
export const seanceVideoDeLExercice = (lien: string) => SEANCES_VIDEO.find(s => s.exercice.lien === lien) || null;

export const seanceById = (id: string) => SEANCES.find(s => s.id === id || String(s.n) === id) || null;

/** La fin selon les réponses : l'étiquette la plus fréquente (à égalité : la première rencontrée) */
export function finSelon(selon: NonNullable<NoeudSeance['selon']>, tags: string[]): string {
  const n: Record<string, number> = {};
  for (const t of tags) if (selon[t]) n[t] = (n[t] || 0) + 1;
  let best: string | null = null;
  for (const t of tags) if (selon[t] && (best === null || n[t] > n[best])) best = t;
  return best ? selon[best] : selon.autre;
}

/** Vérifie une séance : chaque suite existe, chaque choix a deux réponses, on arrive toujours à une fin (utilisé par les tests) */
export function verifierSeance(s: Seance): string[] {
  const err: string[] = [];
  const ids = Object.keys(s.noeuds);
  if (!s.noeuds[s.depart]) err.push('départ inconnu');
  for (const [id, x] of Object.entries(s.noeuds)) {
    if (!x.blocs.length) err.push(`${id} : pas de texte`);
    const sorties = [x.suite, ...(x.choix || []).map(c => c.suite), ...Object.values(x.selon || {})].filter(Boolean) as string[];
    for (const o of sorties) if (!ids.includes(o)) err.push(`${id} : suite inconnue ${o}`);
    if (x.choix && x.choix.length !== 2) err.push(`${id} : deux réponses`);
    if (!x.fin && !sorties.length) err.push(`${id} : ni suite ni fin`);
  }
  return err;
}

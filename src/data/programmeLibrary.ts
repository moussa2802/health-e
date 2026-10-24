/**
 * programmeLibrary.ts — « Mon programme Dr Lô » : la bibliothèque d'exercices validée par
 * Papa Moussa (doc « Mon programme Dr Lô — bibliothèque d'exercices », 23 oct. 2026).
 * Dr Lô choisit dans cette liste ; il n'invente jamais d'exercice.
 */

export type ProgAxis = 'stress' | 'humeur' | 'sommeil';
export const PROG_AXES: ProgAxis[] = ['stress', 'humeur', 'sommeil'];

export interface ProgExercise {
  id: string;
  week: 1 | 2 | 3 | 4;
  title: string;
  text: string;
  /** Durée affichée (absente = une habitude de la journée, sans durée) */
  duration?: string;
}

export interface ProgLearning {
  id: string;
  axis: ProgAxis | 'tous';
  title: string;
  text: string;
}

export interface AxisInfo {
  /** « Programme Stress & anxiété » */
  name: string;
  /** « Programme Stress » (carte d'accueil) */
  short: string;
  goal: string;
  /** Test de départ conseillé quand aucun résultat ne déclenche ce programme */
  entryScale: string;
}

export const AXES: Record<ProgAxis, AxisInfo> = {
  stress: {
    name: 'Programme Stress & anxiété',
    short: 'Programme Stress',
    goal: 'Calmer le corps quand l\'inquiétude monte, desserrer les pensées qui tournent en boucle et retrouver des moments de répit.',
    entryScale: 'gad7',
  },
  humeur: {
    name: 'Programme Humeur',
    short: 'Programme Humeur',
    goal: 'Remettre du mouvement et du plaisir dans tes journées, renouer avec les autres et adoucir ta voix intérieure.',
    entryScale: 'phq9',
  },
  sommeil: {
    name: 'Programme Sommeil',
    short: 'Programme Sommeil',
    goal: 'Retrouver un rythme régulier, t\'endormir plus facilement et te réveiller en meilleure forme.',
    entryScale: 'bonus_sommeil',
  },
};

/** Respiration d'une minute avec Dr Lô : remplace « Mon action » un jour sur deux en version légère. */
export const BREATH_EXERCISE: ProgExercise = {
  id: 'BR',
  week: 1,
  title: 'Respirer une minute avec Dr Lô',
  text: 'Suis le cercle autour de Dr Lô : il grandit, tu inspires ; il se resserre, tu expires. Une minute, rien de plus.',
  duration: '1 min',
};

export const EXERCISES: Record<ProgAxis, ProgExercise[]> = {
  stress: [
    { id: 'SA1', week: 1, title: 'Respirer 4-6', text: 'Inspire 4 secondes par le nez, souffle 6 secondes par la bouche, 5 fois. Expirer plus long que l\'inspiration dit à ton corps que le danger est passé.', duration: '1 min' },
    { id: 'SA2', week: 1, title: 'Repérer mon signal', text: 'Où sens-tu le stress dans ton corps aujourd\'hui : mâchoire, ventre, épaules, poitrine ? Note juste l\'endroit. Le reconnaître tôt, c\'est déjà le calmer.', duration: '1 min' },
    { id: 'SA3', week: 1, title: 'Ma source du jour', text: 'Écris en une phrase ce qui t\'a le plus stressé aujourd\'hui. Pas besoin de solution : on observe.', duration: '2 min' },
    { id: 'SA4', week: 1, title: 'Ancrage 5-4-3-2-1', text: 'Nomme 5 choses que tu vois, 4 que tu touches, 3 que tu entends, 2 que tu sens, 1 que tu goûtes. Ton esprit revient ici, maintenant.', duration: '2 min' },
    { id: 'SA5', week: 1, title: 'Une pause sans écran', text: '5 minutes sans téléphone : regarde dehors, bois de l\'eau, étire-toi.', duration: '5 min' },
    { id: 'SA6', week: 2, title: 'Marcher 10 minutes', text: 'Une marche à ton rythme, même dans le quartier. Le mouvement brûle l\'adrénaline du stress.', duration: '10 min' },
    { id: 'SA7', week: 2, title: 'Relâcher les muscles', text: 'Serre les poings 5 secondes, relâche. Puis les épaules, puis le visage. Sens la différence entre tendu et détendu.', duration: '3 min' },
    { id: 'SA8', week: 2, title: 'Moins de café et de thé après 15 h', text: 'Le café, l\'attàya ou les boissons énergisantes l\'après-midi entretiennent la nervosité et gâchent le sommeil. Essaie aujourd\'hui.' },
    { id: 'SA9', week: 2, title: 'Respiration carrée', text: 'Inspire 4 s, bloque 4 s, souffle 4 s, bloque 4 s, 4 fois. À garder pour avant un examen, un entretien, une discussion difficile.', duration: '2 min' },
    { id: 'SA10', week: 2, title: 'Couper les infos stressantes', text: 'Aujourd\'hui, pas de vidéos ou de groupes qui t\'angoissent après 20 h.' },
    { id: 'SA11', week: 3, title: 'Mon moment pour m\'inquiéter', text: 'Choisis 10 minutes fixes (par exemple à 18 h). Si une inquiétude arrive avant, dis-toi : « je la garde pour 18 h ». À 18 h, écris-la.', duration: '10 min' },
    { id: 'SA12', week: 3, title: 'Vérifier une pensée', text: 'Prends une pensée qui t\'inquiète. Qu\'est-ce qui la prouve ? Qu\'est-ce qui la contredit ? Que dirais-tu à un ami qui pense ça ?', duration: '5 min' },
    { id: 'SA13', week: 3, title: 'Le pire, le meilleur, le plus probable', text: 'Pour un souci du moment, écris le pire scénario, le meilleur, puis le plus probable. Souvent, le plus probable est gérable.', duration: '5 min' },
    { id: 'SA14', week: 3, title: 'Ce que je contrôle', text: 'Deux colonnes : ce qui dépend de moi, ce qui n\'en dépend pas. Agis sur une seule chose de la première.', duration: '5 min' },
    { id: 'SA15', week: 3, title: 'Découper une tâche', text: 'Une tâche qui t\'écrase ? Écris les 3 premiers petits pas, et fais seulement le premier.', duration: '5 min' },
    { id: 'SA16', week: 3, title: 'En parler à quelqu\'un', text: 'Dis à une personne de confiance ce qui te pèse, même en deux phrases. Porter seul, c\'est plus lourd.', duration: '5 min' },
    { id: 'SA17', week: 4, title: 'Ma liste anti-stress', text: 'Écris 5 choses qui t\'apaisent vraiment (prière, musique, thé entre amis, marche, douche…). Fais-en une aujourd\'hui.', duration: '5 min' },
    { id: 'SA18', week: 4, title: 'Trois choses qui ont marché', text: 'Ce soir, note 3 choses qui se sont bien passées, même petites.', duration: '2 min' },
    { id: 'SA19', week: 4, title: 'Dire non une fois', text: 'Repère une demande de trop aujourd\'hui et refuse-la gentiment, ou reporte-la.' },
    { id: 'SA20', week: 4, title: 'Mon plan pour les jours durs', text: 'Écris ce qui t\'aide quand ça monte : un exercice, une personne à appeler, un endroit où aller. Garde-le dans ton journal.', duration: '5 min' },
  ],
  humeur: [
    { id: 'HU1', week: 1, title: 'Sortir à la lumière', text: '10 minutes dehors le matin, même devant la maison. La lumière du jour aide ton horloge et ton moral.', duration: '10 min' },
    { id: 'HU2', week: 1, title: 'Ce qui m\'a fait du bien', text: 'Ce soir, une seule chose qui t\'a fait un peu de bien aujourd\'hui. Même minuscule.', duration: '1 min' },
    { id: 'HU3', week: 1, title: 'Ma carte d\'énergie', text: 'Note à quel moment de la journée tu as le plus d\'énergie. On mettra les choses importantes là.', duration: '1 min' },
    { id: 'HU4', week: 1, title: 'Une petite tâche finie', text: 'Choisis une tâche de 5 minutes (ranger un coin, répondre à un message) et termine-la. Finir quelque chose redonne de l\'élan.', duration: '5 min' },
    { id: 'HU5', week: 1, title: 'Se laver, s\'habiller', text: 'Douche, vêtements propres, même si tu ne sors pas. Le corps entraîne la tête.', duration: '10 min' },
    { id: 'HU6', week: 2, title: 'Planifier un plaisir', text: 'Prévois pour demain une activité qui te plaisait avant (musique, cuisine, foot, couture, série). Note l\'heure.', duration: '2 min' },
    { id: 'HU7', week: 2, title: 'Faire le plaisir prévu', text: 'Fais l\'activité prévue hier, même sans envie. L\'envie vient souvent en faisant, pas avant.', duration: '15 min' },
    { id: 'HU8', week: 2, title: 'Bouger 15 minutes', text: 'Marche, danse, étirements : ce qui te va. Le mouvement est l\'un des meilleurs soutiens du moral.', duration: '15 min' },
    { id: 'HU9', week: 2, title: 'Manger à heure fixe', text: 'Prends au moins un vrai repas à une heure régulière aujourd\'hui.' },
    { id: 'HU10', week: 2, title: 'Un message à quelqu\'un', text: 'Écris à une personne qui compte pour toi, juste pour prendre des nouvelles.', duration: '2 min' },
    { id: 'HU11', week: 3, title: 'Parler à soi comme à un ami', text: 'Une pensée dure sur toi aujourd\'hui ? Réécris-la comme le dirait un ami bienveillant.', duration: '3 min' },
    { id: 'HU12', week: 3, title: 'Une qualité à moi', text: 'Écris une qualité que les autres reconnaissent en toi, et un moment où tu l\'as montrée.', duration: '3 min' },
    { id: 'HU13', week: 3, title: 'Rendre service', text: 'Aide quelqu\'un d\'une petite façon (un coup de main, un conseil, une visite). Donner fait du bien.' },
    { id: 'HU14', week: 3, title: 'Un moment avec les autres', text: 'Passe un moment avec des proches, en vrai si possible : thé, repas, causerie.', duration: '30 min' },
    { id: 'HU15', week: 3, title: 'Repérer le « tout ou rien »', text: 'Note une pensée en « toujours / jamais / rien » (« je rate tout »). Cherche une exception réelle.', duration: '3 min' },
    { id: 'HU16', week: 3, title: 'Gratitude à voix haute', text: 'Remercie quelqu\'un pour une chose précise aujourd\'hui.', duration: '1 min' },
    { id: 'HU17', week: 4, title: 'Mon petit objectif de la semaine', text: 'Choisis un objectif réaliste pour 7 jours et note le premier pas.', duration: '3 min' },
    { id: 'HU18', week: 4, title: 'Trois choses qui ont marché', text: 'Ce soir, 3 choses qui se sont bien passées.', duration: '2 min' },
    { id: 'HU19', week: 4, title: 'Ma lettre à moi dans un mois', text: 'Écris deux phrases d\'encouragement à la personne que tu seras dans un mois. Elle reste dans ton journal.', duration: '5 min' },
    { id: 'HU20', week: 4, title: 'Mon plan pour les jours gris', text: 'Ce qui m\'aide, qui je peux appeler, où aller. Et les numéros d\'urgence si ça devient trop lourd.', duration: '5 min' },
  ],
  sommeil: [
    { id: 'SO1', week: 1, title: 'Observer mes nuits', text: 'Chaque matin, note ta nuit d\'un tap (mal, moyen, bien) avec ton humeur. On observe une semaine avant de changer.', duration: '10 s' },
    { id: 'SO2', week: 1, title: 'Une heure de lever fixe', text: 'Choisis ton heure de lever et garde-la tous les jours, même le week-end. C\'est la base de ton horloge.' },
    { id: 'SO3', week: 1, title: 'Lumière le matin', text: 'Dans l\'heure qui suit le réveil, 10 minutes à la lumière du jour.', duration: '10 min' },
    { id: 'SO4', week: 1, title: 'Dernier café avant 14 h', text: 'Café, attàya, kinkeliba sucré tard, boissons énergisantes : arrête après 14 h aujourd\'hui.' },
    { id: 'SO5', week: 1, title: 'Le téléphone hors du lit', text: 'Pose le téléphone hors de portée 30 minutes avant de dormir. La lumière de l\'écran retarde le sommeil.' },
    { id: 'SO6', week: 2, title: 'Mon rituel du soir', text: '20 minutes calmes avant le coucher, toujours dans le même ordre : ablutions ou douche, lumière douce, lecture ou prière.', duration: '20 min' },
    { id: 'SO7', week: 2, title: 'Le lit, c\'est pour dormir', text: 'Pas de séries ni de réseaux au lit. Ton cerveau doit associer le lit au sommeil.' },
    { id: 'SO8', week: 2, title: 'Si je ne dors pas en 20 minutes', text: 'Lève-toi, va dans une autre pièce, lumière faible, activité calme. Reviens quand le sommeil arrive.' },
    { id: 'SO9', week: 2, title: 'Respiration du coucher', text: 'Au lit, respire 4-6 (4 s par le nez, 6 s par la bouche) pendant 2 minutes.', duration: '2 min' },
    { id: 'SO10', week: 2, title: 'Une chambre fraîche et sombre', text: 'Ventilateur, rideau, moins de bruit si possible : prépare la pièce avant de dormir.', duration: '5 min' },
    { id: 'SO11', week: 3, title: 'Sieste courte ou pas du tout', text: 'Si tu fais la sieste, 20 minutes maximum et avant 16 h.' },
    { id: 'SO12', week: 3, title: 'Vider ma tête avant de dormir', text: 'Écris ce qui tourne dans ta tête et ce que tu feras demain. Ta tête n\'a plus besoin de le garder cette nuit.', duration: '5 min' },
    { id: 'SO13', week: 3, title: 'Manger léger le soir', text: 'Dernier repas copieux au moins 2 heures avant de te coucher.' },
    { id: 'SO14', week: 3, title: 'Relâcher le corps', text: 'Au lit, relâche un à un les pieds, les jambes, le ventre, les épaules, le visage.', duration: '5 min' },
    { id: 'SO15', week: 3, title: 'Bouger dans la journée', text: '20 minutes de marche ou de sport, mais pas dans les 2 heures avant le coucher.', duration: '20 min' },
    { id: 'SO16', week: 3, title: 'Ne pas regarder l\'heure la nuit', text: 'Retourne le réveil ou le téléphone. Compter les heures entretient l\'insomnie.' },
    { id: 'SO17', week: 4, title: 'Garder ce qui marche', text: 'Regarde tes nuits notées : qu\'est-ce qui a le plus aidé ? On le garde.', duration: '3 min' },
    { id: 'SO18', week: 4, title: 'Même heure, même le week-end', text: 'Lever à l\'heure fixée, même après une soirée ou un événement.' },
    { id: 'SO19', week: 4, title: 'Mon plan pour les mauvaises nuits', text: 'Écris ce que tu fais si une nuit est mauvaise : pas de panique, lever à l\'heure, pas de longue sieste.', duration: '3 min' },
    { id: 'SO20', week: 4, title: 'Ma semaine de sommeil', text: 'Compare tes nuits de cette semaine avec celles de la semaine 1.', duration: '2 min' },
  ],
};

export const LEARNINGS: ProgLearning[] = [
  { id: 'AP1', axis: 'stress', title: 'Le stress n\'est pas l\'ennemi', text: 'Le stress prépare ton corps à réagir. Il devient un problème quand il ne s\'arrête plus. On apprend à lui donner des pauses.' },
  { id: 'AP2', axis: 'stress', title: 'Pourquoi souffler longtemps calme', text: 'Une expiration longue active le frein naturel du cœur (le nerf vague). C\'est pour ça que la respiration 4-6 marche en une minute.' },
  { id: 'AP3', axis: 'stress', title: 'L\'anxiété grossit le danger', text: 'Quand on est anxieux, le cerveau voit le pire comme le plus probable. Vérifier ses pensées, ce n\'est pas se mentir : c\'est remettre les choses à leur taille.' },
  { id: 'AP4', axis: 'stress', title: 'Éviter entretient la peur', text: 'Fuir ce qui fait peur soulage tout de suite, mais renforce la peur ensuite. Y aller par petites étapes la fait baisser.' },
  { id: 'AP5', axis: 'stress', title: 'Le corps garde le stress', text: 'Ventre noué, mâchoire serrée, mal de tête : le stress passe par le corps. Bouger et relâcher les muscles aide autant que réfléchir.' },
  { id: 'AP6', axis: 'humeur', title: 'L\'action avant l\'envie', text: 'Quand le moral est bas, l\'envie ne vient plus en premier. On commence petit, et l\'envie suit souvent.' },
  { id: 'AP7', axis: 'humeur', title: 'Le moral et le corps', text: 'Sommeil, repas, lumière et mouvement pèsent beaucoup sur l\'humeur. Ce sont des leviers simples et puissants.' },
  { id: 'AP8', axis: 'humeur', title: 'La voix critique', text: 'On se parle souvent plus durement qu\'on parlerait à un ami. Changer le ton de cette voix change aussi l\'humeur.' },
  { id: 'AP9', axis: 'humeur', title: 'S\'isoler fait baisser le moral', text: 'Quand ça va mal, on a envie de se retirer. Garder un lien, même petit, protège.' },
  { id: 'AP10', axis: 'humeur', title: 'Quand consulter', text: 'Si la tristesse dure plus de deux semaines et empêche de vivre normalement, parle-en à un professionnel. Ce n\'est pas une faiblesse, c\'est un soin.' },
  { id: 'AP11', axis: 'sommeil', title: 'L\'horloge interne', text: 'Ton corps a une horloge réglée par la lumière et l\'heure de lever. Une heure fixe le matin règle le soir.' },
  { id: 'AP12', axis: 'sommeil', title: 'Les écrans retardent le sommeil', text: 'La lumière des écrans et ce qu\'on y voit gardent le cerveau en éveil. 30 minutes sans écran suffisent à faire une différence.' },
  { id: 'AP13', axis: 'sommeil', title: 'Forcer le sommeil l\'éloigne', text: 'Plus on s\'acharne à dormir, plus on reste éveillé. Se lever et revenir plus tard marche mieux.' },
  { id: 'AP14', axis: 'sommeil', title: 'Le café dure longtemps', text: 'La caféine reste active 5 à 6 heures. Un café à 17 h agit encore à 23 h.' },
  { id: 'AP15', axis: 'sommeil', title: 'Une mauvaise nuit n\'est pas grave', text: 'Une nuit difficile se rattrape seule. Ce qui compte, c\'est le rythme sur la semaine.' },
  { id: 'AP16', axis: 'tous', title: 'Les résultats prennent du temps', text: 'Les effets se voient souvent après 2 à 3 semaines. Un jour sans résultat n\'est pas un échec.' },
  { id: 'AP17', axis: 'tous', title: 'Un jour manqué', text: 'Tu as sauté un jour ? Reprends simplement aujourd\'hui. Le programme n\'est pas un examen.' },
];

export function exerciseById(id: string): ProgExercise | undefined {
  if (id === BREATH_EXERCISE.id) return BREATH_EXERCISE;
  for (const a of PROG_AXES) {
    const e = EXERCISES[a].find(x => x.id === id);
    if (e) return e;
  }
  return undefined;
}

/** Apprentissages d'un programme, dans l'ordre : ceux de l'axe, puis ceux pour tous. */
export function learningsFor(axis: ProgAxis): ProgLearning[] {
  return [...LEARNINGS.filter(l => l.axis === axis), ...LEARNINGS.filter(l => l.axis === 'tous')];
}

// ── Rendre le programme vivant : chaque exercice se FAIT dans l'appli, avec Dr Lô ──────────

/** Comment l'exercice se fait dans l'appli. */
export type Guide =
  | { kind: 'breath'; inhale: number; hold?: number; exhale: number; hold2?: number; cycles: number }
  | { kind: 'steps'; steps: { prompt: string; input?: string }[]; save?: string }
  | { kind: 'chips'; prompt: string; options: string[]; multi: boolean; save: string }
  | { kind: 'write'; prompt: string; lines: number; save: string }
  | { kind: 'habit'; evening: string }
  | { kind: 'timer'; minutes: number }
  | { kind: 'do' };

const tense = (part: string, how: string) => ({ prompt: `${part} : ${how} pendant 5 secondes… puis relâche d'un coup. Sens la différence.` });

export const GUIDES: Record<string, Guide> = {
  BR: { kind: 'breath', inhale: 4, exhale: 6, cycles: 6 },
  // Stress
  SA1: { kind: 'breath', inhale: 4, exhale: 6, cycles: 5 },
  SA2: { kind: 'chips', prompt: 'Où sens-tu le stress aujourd\'hui ?', options: ['Mâchoire', 'Tête', 'Gorge', 'Poitrine', 'Épaules', 'Ventre', 'Dos', 'Mains', 'Nulle part'], multi: true, save: 'Mon signal du jour' },
  SA3: { kind: 'write', prompt: 'Ce qui m\'a le plus stressé aujourd\'hui, en une phrase :', lines: 1, save: 'Ma source de stress' },
  SA4: { kind: 'steps', save: 'Ancrage 5-4-3-2-1', steps: [
    { prompt: 'Regarde autour de toi. Nomme 5 choses que tu vois.', input: 'Ce que je vois' },
    { prompt: '4 choses que tu touches ou sens sur ta peau.', input: 'Ce que je touche' },
    { prompt: '3 choses que tu entends, même lointaines.', input: 'Ce que j\'entends' },
    { prompt: '2 odeurs autour de toi.', input: 'Ce que je sens' },
    { prompt: '1 goût dans ta bouche. Voilà : ton esprit est revenu ici, maintenant.' },
  ] },
  SA5: { kind: 'timer', minutes: 5 },
  SA6: { kind: 'timer', minutes: 10 },
  SA7: { kind: 'steps', steps: [tense('Les poings', 'serre fort'), tense('Les épaules', 'monte-les vers tes oreilles'), tense('Le visage', 'plisse les yeux et serre les dents'), { prompt: 'Respire lentement. Ton corps sait maintenant ce que veut dire « détendu ».' }] },
  SA8: { kind: 'habit', evening: 'Pas de café, d\'attàya ni de boisson énergisante après 15 h : tu as tenu ?' },
  SA9: { kind: 'breath', inhale: 4, hold: 4, exhale: 4, hold2: 4, cycles: 4 },
  SA10: { kind: 'habit', evening: 'Pas de vidéos ni de groupes angoissants après 20 h : tu as tenu ?' },
  SA11: { kind: 'write', prompt: 'L\'inquiétude que tu gardes pour ton moment (par exemple 18 h). Écris-la, puis laisse-la ici :', lines: 2, save: 'Mon moment pour m\'inquiéter' },
  SA12: { kind: 'steps', save: 'Vérifier une pensée', steps: [
    { prompt: 'Quelle pensée t\'inquiète ?', input: 'La pensée' },
    { prompt: 'Qu\'est-ce qui la prouve, vraiment ?', input: 'Ce qui la prouve' },
    { prompt: 'Qu\'est-ce qui la contredit ?', input: 'Ce qui la contredit' },
    { prompt: 'Que dirais-tu à un ami qui pense ça ?', input: 'Ce que je dirais à un ami' },
  ] },
  SA13: { kind: 'steps', save: 'Le pire, le meilleur, le plus probable', steps: [
    { prompt: 'Le souci du moment, en quelques mots :', input: 'Le souci' },
    { prompt: 'Le pire qui pourrait arriver :', input: 'Le pire' },
    { prompt: 'Le meilleur qui pourrait arriver :', input: 'Le meilleur' },
    { prompt: 'Et le plus probable, honnêtement ?', input: 'Le plus probable' },
  ] },
  SA14: { kind: 'steps', save: 'Ce que je contrôle', steps: [
    { prompt: 'Ce qui dépend de moi :', input: 'Dépend de moi' },
    { prompt: 'Ce qui ne dépend pas de moi :', input: 'Ne dépend pas de moi' },
    { prompt: 'La seule chose de la première liste que je fais aujourd\'hui :', input: 'Ce que je fais aujourd\'hui' },
  ] },
  SA15: { kind: 'steps', save: 'Découper une tâche', steps: [
    { prompt: 'La tâche qui t\'écrase :', input: 'La tâche' },
    { prompt: 'Le tout premier petit pas (5 minutes maximum) :', input: 'Pas 1' },
    { prompt: 'Le deuxième :', input: 'Pas 2' },
    { prompt: 'Le troisième. Maintenant, fais seulement le premier.', input: 'Pas 3' },
  ] },
  SA16: { kind: 'habit', evening: 'Tu as pu parler à quelqu\'un de ce qui te pèse ?' },
  SA17: { kind: 'write', prompt: '5 choses qui t\'apaisent vraiment (une par ligne) :', lines: 5, save: 'Ma liste anti-stress' },
  SA18: { kind: 'write', prompt: '3 choses qui se sont bien passées aujourd\'hui :', lines: 3, save: 'Trois choses qui ont marché' },
  SA19: { kind: 'habit', evening: 'Tu as pu dire non (ou reporter) une demande de trop ?' },
  SA20: { kind: 'steps', save: 'Mon plan pour les jours durs', steps: [
    { prompt: 'Un exercice qui t\'aide quand ça monte :', input: 'Mon exercice' },
    { prompt: 'Une personne que tu peux appeler :', input: 'Ma personne' },
    { prompt: 'Un endroit où aller pour souffler :', input: 'Mon endroit' },
  ] },
  // Humeur
  HU1: { kind: 'timer', minutes: 10 },
  HU2: { kind: 'write', prompt: 'Une chose qui t\'a fait un peu de bien aujourd\'hui :', lines: 1, save: 'Ce qui m\'a fait du bien' },
  HU3: { kind: 'chips', prompt: 'À quel moment as-tu le plus d\'énergie ?', options: ['Le matin', 'Vers midi', 'L\'après-midi', 'Le soir', 'La nuit'], multi: false, save: 'Ma carte d\'énergie' },
  HU4: { kind: 'do' },
  HU5: { kind: 'do' },
  HU6: { kind: 'steps', save: 'Mon plaisir de demain', steps: [
    { prompt: 'Une activité qui te plaisait avant :', input: 'L\'activité' },
    { prompt: 'Demain, à quelle heure ?', input: 'L\'heure' },
  ] },
  HU7: { kind: 'habit', evening: 'Tu as fait le plaisir prévu hier ?' },
  HU8: { kind: 'timer', minutes: 15 },
  HU9: { kind: 'habit', evening: 'Tu as pris un vrai repas à heure fixe aujourd\'hui ?' },
  HU10: { kind: 'do' },
  HU11: { kind: 'steps', save: 'Parler à soi comme à un ami', steps: [
    { prompt: 'Une pensée dure sur toi aujourd\'hui :', input: 'La pensée dure' },
    { prompt: 'Réécris-la comme te le dirait un ami bienveillant :', input: 'Ce que dirait un ami' },
  ] },
  HU12: { kind: 'steps', save: 'Une qualité à moi', steps: [
    { prompt: 'Une qualité que les autres reconnaissent en toi :', input: 'Ma qualité' },
    { prompt: 'Un moment où tu l\'as montrée :', input: 'Le moment' },
  ] },
  HU13: { kind: 'habit', evening: 'Tu as pu rendre un petit service aujourd\'hui ?' },
  HU14: { kind: 'do' },
  HU15: { kind: 'steps', save: 'Le « tout ou rien »', steps: [
    { prompt: 'Une pensée en « toujours / jamais / rien » :', input: 'La pensée' },
    { prompt: 'Une exception réelle, même petite :', input: 'L\'exception' },
  ] },
  HU16: { kind: 'habit', evening: 'Tu as remercié quelqu\'un pour une chose précise ?' },
  HU17: { kind: 'steps', save: 'Mon objectif de la semaine', steps: [
    { prompt: 'Ton objectif réaliste pour 7 jours :', input: 'L\'objectif' },
    { prompt: 'Le premier pas :', input: 'Le premier pas' },
  ] },
  HU18: { kind: 'write', prompt: '3 choses qui se sont bien passées aujourd\'hui :', lines: 3, save: 'Trois choses qui ont marché' },
  HU19: { kind: 'write', prompt: 'Deux phrases d\'encouragement à la personne que tu seras dans un mois :', lines: 2, save: 'Ma lettre à moi dans un mois' },
  HU20: { kind: 'steps', save: 'Mon plan pour les jours gris', steps: [
    { prompt: 'Ce qui m\'aide quand c\'est gris :', input: 'Ce qui m\'aide' },
    { prompt: 'Qui je peux appeler :', input: 'Ma personne' },
    { prompt: 'Où je peux aller. Et si ça devient trop lourd : le 1515 répond à toute heure.', input: 'Mon endroit' },
  ] },
  // Sommeil
  SO1: { kind: 'do' },
  SO2: { kind: 'chips', prompt: 'Ton heure de lever, tous les jours :', options: ['5 h', '5 h 30', '6 h', '6 h 30', '7 h', '7 h 30', '8 h'], multi: false, save: 'Mon heure de lever' },
  SO3: { kind: 'timer', minutes: 10 },
  SO4: { kind: 'habit', evening: 'Pas de café ni d\'attàya après 14 h : tu as tenu ?' },
  SO5: { kind: 'habit', evening: 'Le téléphone hors de portée 30 minutes avant de dormir : tu as tenu hier soir ?' },
  SO6: { kind: 'habit', evening: 'Tu as fait ton rituel du soir ?' },
  SO7: { kind: 'habit', evening: 'Pas de séries ni de réseaux au lit : tu as tenu ?' },
  SO8: { kind: 'habit', evening: 'Si tu ne dormais pas au bout de 20 minutes, tu as quitté ton lit un moment ?' },
  SO9: { kind: 'breath', inhale: 4, exhale: 6, cycles: 12 },
  SO10: { kind: 'do' },
  SO11: { kind: 'habit', evening: 'Sieste courte (20 min, avant 16 h) ou pas de sieste : tu as tenu ?' },
  SO12: { kind: 'write', prompt: 'Ce qui tourne dans ta tête, et ce que tu feras demain :', lines: 3, save: 'Vider ma tête' },
  SO13: { kind: 'habit', evening: 'Dernier gros repas au moins 2 heures avant de dormir ?' },
  SO14: { kind: 'steps', steps: [
    { prompt: 'Au lit, relâche tes pieds. Laisse-les lourds.' },
    { prompt: 'Tes jambes, maintenant. Lourdes, posées.' },
    { prompt: 'Ton ventre : laisse-le monter et descendre tout seul.' },
    { prompt: 'Tes épaules, qui descendent loin des oreilles.' },
    { prompt: 'Ton visage : front lisse, mâchoire desserrée. Bonne nuit.' },
  ] },
  SO15: { kind: 'timer', minutes: 20 },
  SO16: { kind: 'habit', evening: 'Tu as évité de regarder l\'heure la nuit ?' },
  SO17: { kind: 'write', prompt: 'D\'après tes nuits notées, qu\'est-ce qui a le plus aidé ?', lines: 2, save: 'Ce qui marche pour mon sommeil' },
  SO18: { kind: 'habit', evening: 'Lever à l\'heure fixée, même aujourd\'hui : tu as tenu ?' },
  SO19: { kind: 'write', prompt: 'Ce que je fais après une mauvaise nuit :', lines: 3, save: 'Mon plan pour les mauvaises nuits' },
  SO20: { kind: 'do' },
};

export const guideOf = (id: string): Guide => GUIDES[id] ?? { kind: 'do' };

/** Les 4 étapes du programme (une par semaine). */
export const CHAPTERS: Record<ProgAxis, { name: string; why: string }[]> = {
  stress: [
    { name: 'Observer', why: 'On apprend à repérer le stress tôt, sans rien forcer.' },
    { name: 'Calmer le corps', why: 'On agit sur le corps : souffle, muscles, mouvement.' },
    { name: 'Apprivoiser les pensées', why: 'On remet les inquiétudes à leur vraie taille.' },
    { name: 'Garder ce qui marche', why: 'On rassemble ce qui t\'aide, pour la suite.' },
  ],
  humeur: [
    { name: 'Observer', why: 'On repère ce qui te fait un peu de bien et quand tu as de l\'énergie.' },
    { name: 'Remettre du mouvement', why: 'On ramène des petits plaisirs et du mouvement dans tes journées.' },
    { name: 'Adoucir la voix intérieure', why: 'On change le ton de la petite voix critique.' },
    { name: 'Garder ce qui marche', why: 'On rassemble ce qui t\'aide, pour la suite.' },
  ],
  sommeil: [
    { name: 'Observer mes nuits', why: 'On regarde tes nuits une semaine avant de changer.' },
    { name: 'Préparer la nuit', why: 'On installe un rituel du soir et une chambre qui aide.' },
    { name: 'Apaiser le coucher', why: 'On calme la tête et le corps avant de dormir.' },
    { name: 'Garder ce qui marche', why: 'On garde ce qui a le plus aidé tes nuits.' },
  ],
};

/** Une question vrai / faux avant chaque apprentissage : on devine, puis on comprend. */
export const QUIZ: Record<string, { q: string; answer: boolean }> = {
  AP1: { q: 'Le stress est toujours mauvais pour toi.', answer: false },
  AP2: { q: 'Souffler longtemps calme le cœur en une minute.', answer: true },
  AP3: { q: 'Quand on est anxieux, le pire paraît plus probable qu\'il ne l\'est.', answer: true },
  AP4: { q: 'Éviter ce qui fait peur fait baisser la peur avec le temps.', answer: false },
  AP5: { q: 'Le stress se passe seulement dans la tête.', answer: false },
  AP6: { q: 'Quand le moral est bas, il vaut mieux attendre d\'avoir envie pour agir.', answer: false },
  AP7: { q: 'Le sommeil et les repas n\'ont rien à voir avec le moral.', answer: false },
  AP8: { q: 'On se parle souvent plus durement qu\'on ne parlerait à un ami.', answer: true },
  AP9: { q: 'Quand ça va mal, s\'isoler aide à aller mieux.', answer: false },
  AP10: { q: 'Consulter pour une tristesse qui dure, c\'est un signe de faiblesse.', answer: false },
  AP11: { q: 'L\'heure du lever règle aussi l\'heure où tu t\'endors.', answer: true },
  AP12: { q: 'Regarder son téléphone au lit aide à s\'endormir.', answer: false },
  AP13: { q: 'Plus on se force à dormir, plus le sommeil vient.', answer: false },
  AP14: { q: 'Un café pris à 17 h agit encore à 23 h.', answer: true },
  AP15: { q: 'Une mauvaise nuit gâche forcément toute la semaine.', answer: false },
  AP16: { q: 'Les effets d\'un programme se voient dès les premiers jours.', answer: false },
  AP17: { q: 'Sauter un jour, c\'est rater le programme.', answer: false },
};

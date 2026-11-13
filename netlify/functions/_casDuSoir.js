/**
 * _casDuSoir — logique pure du « Cas du soir » (sans Firebase, testée dans _tests/casDuSoir.test.js).
 * Rythme personnel de chaque lecteur, droits de lecture, embranchement décidé par la majorité à une date commune, résultats des votes.
 */
const { HISTOIRES } = require('./_casDuSoirHistoires');
const MINUTAGES = require('./_casDuSoirMinutages');

/** Le minutage d'un audio (ou null). */
const minutage = (cle) => (cle && MINUTAGES[cle]) || null;

/**
 * Visible pour tout le monde ? false tant que Papa Moussa n'a pas validé : seul le propriétaire (Dr Lô) le voit.
 * C'est le serveur qui décide ; l'appli n'affiche la carte et la page que s'il répond « visible ».
 * Ouverture à tous : passer à true.
 */
const CAS_DU_SOIR_PUBLIC = false;

/**
 * Prix en étincelles. LES PRIX SONT LA DÉCISION DE PAPA MOUSSA (11/11/2026 : suite 3, 6, 9 ; animal 2 ; autre fin 5).
 *   suite    : lire un épisode tout de suite, sans attendre le lendemain soir (gratuit). Le prix monte avec l'épisode :
 *              { numéro de l'épisode débloqué : prix }. Un épisode absent de la table ne s'achète pas en avance
 *              (l'épisode 4 : la majorité le décide ; l'épisode 1 : il est gratuit).
 *   bonus    : le détail des votes par animal (une fois par histoire)
 *   autreFin : l'autre fin, une fois l'histoire terminée
 * Copie de CAS_DU_SOIR_PRIX dans src/config/contenusPayants.ts (un test vérifie que les deux sont identiques) :
 * le serveur fait foi pour le débit (il ne lit jamais un prix envoyé par l'appli), l'appli s'en sert pour l'affichage.
 */
const PRIX = { suite: { 2: 3, 3: 6, 5: 9 }, bonus: 2, autreFin: 5 };

/** Le prix pour lire l'épisode n tout de suite, ou null s'il ne s'achète pas en avance. */
const prixSuite = (n) => (Number.isInteger(Number(n)) && PRIX.suite[Number(n)] > 0 ? PRIX.suite[Number(n)] : null);

/** Les pourcentages (et ce qu'a choisi chaque animal) ne s'affichent qu'à partir de ce nombre de votes. */
const SEUIL_POURCENTAGES = 30;

const DAY = 86400000;
const ANIMAUX = ['lion', 'aigle', 'cheval', 'loup', 'dauphin', 'elephant', 'cerf', 'hibou', 'panthere', 'renard', 'tortue', 'ours'];
const ANIMAL_PLURIEL = {
  lion: 'les lions', aigle: 'les aigles', cheval: 'les chevaux', loup: 'les loups', dauphin: 'les dauphins', elephant: 'les éléphants',
  cerf: 'les cerfs', hibou: 'les hiboux', panthere: 'les panthères', renard: 'les renards', tortue: 'les tortues', ours: 'les ours',
};

const histoireById = (id) => HISTOIRES.find((h) => h.id === id) || null;

/**
 * LE RYTHME PERSONNEL (décision de Papa Moussa, 11/11/2026). Chaque lecteur a sa propre horloge, qui démarre à la première
 * ouverture de l'épisode 1 avec un compte (« debut », enregistré côté serveur dans casDuSoirAcces). L'épisode n s'ouvre
 * gratuitement pour lui le (n-1)-ième soir après son départ, à l'heure de l'histoire (20 h, heure de Dakar = UTC) :
 * le jour du départ il a l'épisode 1, le lendemain à 20 h le 2, etc. Quelqu'un qui arrive tard repart donc de l'épisode 1.
 * Seule exception : le vote de l'embranchement, qui est UNE décision pour tout le monde, figée à une date globale
 * (l'ouverture publique + h.embranchement jours à 20 h).
 */

/** L'heure d'ouverture quotidienne, en millisecondes depuis minuit (UTC). */
const heureMs = (h) => { const [hh, mm] = String(h.heure || '20:00').split(':').map(Number); return ((hh || 0) * 60 + (mm || 0)) * 60000; };
/** Le début (minuit UTC) du jour de l'instant t. */
const debutJour = (t) => Math.floor(t / DAY) * DAY;

/** L'ouverture publique de l'histoire (ms), ou null tant qu'elle n'a pas de date publique (programmee: false). */
function ouverturePublique(h) {
  return h.programmee === false ? null : Date.parse(`${h.depart}T${h.heure || '20:00'}:00Z`);
}

/** L'histoire est-elle ouverte aux lecteurs à cet instant ? (l'aperçu du propriétaire l'ouvre toujours) */
function estOuverte(h, now = Date.now(), apercu = false) {
  if (apercu) return true;
  const o = ouverturePublique(h);
  return o != null && now >= o;
}

/** L'histoire en cours : la plus récemment ouverte, sinon la prochaine. */
function histoireDuMoment(now = Date.now(), list = HISTOIRES) {
  const date = (h) => Date.parse(`${h.depart}T${h.heure || '20:00'}:00Z`);
  const ouvertes = list.filter((h) => estOuverte(h, now)).sort((a, b) => date(b) - date(a));
  if (ouvertes.length) return ouvertes[0];
  return [...list].sort((a, b) => date(a) - date(b))[0] || null;
}

/** L'instant où l'épisode n s'ouvre gratuitement pour qui a commencé à « debut » (ms) : le (n-1)-ième soir après son départ. */
function ouvertureEpisode(h, n, debut) {
  return debutJour(debut) + (n - 1) * DAY + heureMs(h);
}

/**
 * Combien d'épisodes sont ouverts gratuitement pour ce lecteur (0 : histoire pas encore ouverte).
 *   debut : le départ de son horloge (ms) ou null s'il n'a pas encore ouvert l'épisode 1 avec un compte (visiteur compris) ;
 *   apercu + jour : l'aperçu du propriétaire (il simule « jour »), sans rien enregistrer.
 * Sans horloge, il a l'épisode 1 (toujours ouvert dès que l'histoire l'est).
 */
function parusPour(h, { debut = null, now = Date.now(), apercu = false, jour = 1 } = {}) {
  const total = h.episodes.length;
  if (apercu) return Math.min(total, Math.max(1, Math.round(Number(jour)) || 1));
  if (!estOuverte(h, now)) return 0;
  if (!debut) return 1;
  let n = 1;
  while (n < total && ouvertureEpisode(h, n + 1, debut) <= now) n += 1;
  return n;
}

/** Le départ d'horloge simulé en aperçu : un lecteur qui en serait au « jour » donné (sert à calculer les dates affichées). */
const debutApercu = (now, jour) => debutJour(now) - (Math.max(1, Math.round(Number(jour)) || 1) - 1) * DAY;

/** Le nombre de jours entre l'ouverture publique et la décision du vote (h.decisionJours ; à défaut : le numéro de l'embranchement, soit 3). */
const decisionJours = (h) => Math.max(1, Math.round(Number(h.decisionJours)) || h.embranchement || 1);

/**
 * La date de décision du vote de l'embranchement (ms) : l'ouverture publique + decisionJours jours, à l'heure de l'histoire
 * (20 h) ; null sans embranchement. En aperçu : la même chose pour un lecteur simulé au « jour » donné.
 * ATTENTION : un lecteur qui commence le jour J arrive à l'épisode 3 le soir de J+2 ; avec 3 jours, seuls ceux qui
 * commencent le jour même de l'ouverture votent à temps. Plus decisionJours est grand, plus il y a de votants.
 */
function dateDecision(h, { apercu = false, jour = 1, now = Date.now() } = {}) {
  if (!h.embranchement) return null;
  // Aperçu du propriétaire : la décision tombe quand sa lecture simulée atteint la fin de l'épisode de l'embranchement (« demain soir » au jour 3)
  if (apercu) return debutApercu(now, jour) + (h.embranchement || decisionJours(h)) * DAY + heureMs(h);
  const o = ouverturePublique(h);
  return o == null ? null : o + decisionJours(h) * DAY;
}

/** La décision est-elle prise ? Une seule règle pour tout le monde : à partir de la date de décision. En aperçu : au-delà de l'embranchement. */
function decisionPrise(h, { now = Date.now(), apercu = false, jour = 1 } = {}) {
  if (!h.embranchement) return true;
  if (apercu) return Math.round(Number(jour)) > h.embranchement;
  const d = dateDecision(h);
  return d != null && now >= d;
}

/** L'instant d'ouverture gratuite de l'épisode suivant pour ce lecteur (« demain soir à 20 h ») ; null si inconnu ou si l'histoire est finie. */
function prochaineOuverture(h, { parus, debut = null, now = Date.now(), apercu = false, jour = 1 } = {}) {
  if (parus >= h.episodes.length) return null;
  if (apercu) return ouvertureEpisode(h, parus + 1, debutApercu(now, jour));
  if (!estOuverte(h, now)) return ouverturePublique(h);
  return debut ? ouvertureEpisode(h, parus + 1, debut) : null;
}

/** Après l'embranchement, un épisode a deux versions. */
const aDesVersions = (h, n) => !!h.embranchement && n > h.embranchement;

/** La majorité du vote de l'embranchement ; égalité, ou moins de h.minVotes votes : h.egalite. */
function majorite(h, counts = {}) {
  const a = Number(counts.A) || 0;
  const b = Number(counts.B) || 0;
  if (a === b || a + b < (Number(h.minVotes) || 0)) return h.egalite || 'A';
  return a > b ? 'A' : 'B';
}

/** Le contenu d'un épisode (la bonne version si besoin). null si la branche n'est pas encore connue. */
function episodeContenu(h, n, branche) {
  const e = h.episodes[n - 1];
  if (!e) return null;
  if (!aDesVersions(h, n)) return e;
  return branche && e[branche] ? e[branche] : null;
}

/**
 * Peut-on lire l'épisode n ?
 *   parus : nombre d'épisodes parus ; connecte : a un compte ; debloques : épisodes payés en avance.
 * Visiteur : seulement l'épisode 1. Connecté : les épisodes parus, plus ceux payés en avance.
 */
function peutLire({ n, parus, connecte, debloques = [] }) {
  if (n < 1) return false;
  if (!connecte) return n === 1 && parus >= 1;
  return n <= parus || debloques.includes(n);
}

/**
 * Peut-on payer pour lire l'épisode n tout de suite (sans attendre son soir) ?
 *   parus : les épisodes ouverts gratuitement pour lui ; debloques : ceux qu'il a payés ; commence : son horloge a démarré ;
 *   decisionPrise : le vote de l'embranchement est figé.
 * Seulement l'épisode qui suit le dernier ouvert (payé ou non : on peut enchaîner 2, puis 3), jamais un épisode déjà ouvert,
 * jamais celui qui dépend du vote de tous tant qu'il n'est pas figé, et seulement s'il a un prix (l'épisode 4 n'en a jamais).
 */
function peutAvancer(h, { n, parus, debloques = [], commence = false, decisionPrise: figee = false }) {
  // Pas d'achat avant d'avoir ouvert l'épisode 1 avec un compte (le rythme ne démarre qu'à ce moment-là)
  if (!(parus >= 1) || !commence) return { ok: false, raison: 'pas_commence' };
  const ouvert = Math.max(parus, ...debloques.map(Number).filter(Number.isFinite));
  if (n !== ouvert + 1 || n > h.episodes.length || debloques.includes(n)) return { ok: false, raison: 'pas_maintenant' };
  if (h.embranchement && n === h.embranchement + 1 && !figee) return { ok: false, raison: 'vote_en_cours' };
  if (!prixSuite(n)) return { ok: false, raison: 'pas_de_prix' };
  return { ok: true, prix: prixSuite(n) };
}

/** Un choix valide pour cet épisode ? */
function choixValide(contenu, choix) {
  return !!contenu && Array.isArray(contenu.choix) && contenu.choix.some((c) => c.id === choix);
}

/** Identifiant d'un votant : le compte, ou un visiteur (empreinte d'un identifiant gardé sur son téléphone). */
function votant(uid, visiteurId, hash) {
  if (uid) return `u_${uid}`;
  const v = String(visiteurId || '');
  if (!/^[A-Za-z0-9-]{16,64}$/.test(v)) return null;
  return `v_${hash(v).slice(0, 24)}`;
}

/** Pourcentages par réponse (arrondis, somme 100 si au moins un vote). */
function pourcentages(contenu, counts = {}) {
  const ids = (contenu.choix || []).map((c) => c.id);
  const total = ids.reduce((s, id) => s + (Number(counts[id]) || 0), 0);
  if (!total) return { total: 0, parChoix: Object.fromEntries(ids.map((id) => [id, 0])) };
  const raw = ids.map((id) => ((Number(counts[id]) || 0) * 100) / total);
  const floor = raw.map(Math.floor);
  let reste = 100 - floor.reduce((s, x) => s + x, 0);
  const ordre = raw.map((x, i) => [x - floor[i], i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of ordre) { if (reste <= 0) break; floor[i] += 1; reste -= 1; }
  return { total, parChoix: Object.fromEntries(ids.map((id, i) => [id, floor[i]])) };
}

/** Ce qu'a surtout choisi un animal (null s'il n'y a pas encore de vote de cet animal). */
function choixDeLAnimal(contenu, parAnimal = {}, animal) {
  if (!animal || !parAnimal[animal]) return null;
  const c = parAnimal[animal];
  let best = null;
  for (const ch of contenu.choix || []) {
    const n = Number(c[ch.id]) || 0;
    if (n > 0 && (!best || n > best.n)) best = { id: ch.id, label: ch.label, n };
  }
  return best ? { animal, groupe: ANIMAL_PLURIEL[animal] || animal, choix: best.id, label: best.label } : null;
}

/** Le détail par animal (le bonus) : pour chaque animal qui a voté, ses pourcentages. */
function detailParAnimal(contenu, parAnimal = {}) {
  return ANIMAUX.filter((a) => parAnimal[a]).map((a) => ({ animal: a, groupe: ANIMAL_PLURIEL[a], ...pourcentages(contenu, parAnimal[a]) }));
}

/** Ce qu'on montre d'un épisode (jamais les autres versions). */
function vueEpisode(h, n, contenu) {
  return {
    n, titre: contenu.titre, texte: contenu.texte, image: contenu.image || null, minutage: minutage(contenu.minutage), minutes: Number(contenu.minutes) || 2, question: contenu.question,
    choix: contenu.choix.map((c) => ({ id: c.id, label: c.label })), embranchement: h.embranchement === n,
  };
}

/** Un épisode a-t-il un fichier audio (dans au moins une version) ? */
const aUnAudio = (e) => !!e && (!!e.audio || (!!e.A && !!e.A.audio) || (!!e.B && !!e.B.audio));

/** Ce qu'on montre de l'histoire sur la carte et en haut de la page. */
function vueHistoire(h, { parus, debloques = [], connecte, prochain = null }) {
  const cur = Math.max(1, parus);
  return {
    id: h.id, titre: h.titre, image: h.image || null, intrigue: h.intrigue || null, intrigueMinutage: minutage(h.intrigueMinutage), accroche: (h.accroches && h.accroches[String(cur)]) || h.accroche, avertissement: h.avertissement, total: h.episodes.length, parus,
    prochain,
    lisibles: Array.from({ length: h.episodes.length }, (_, i) => i + 1).filter((n) => peutLire({ n, parus, connecte, debloques })),
    minutes: Number((h.episodes[cur - 1] && (h.episodes[cur - 1].minutes || (h.episodes[cur - 1].A || {}).minutes)) || 2),
    audio: aUnAudio(h.episodes[cur - 1]),
    testLie: h.testLie || null, testAussi: h.testAussi || null,
    autreFin: h.embranchement && h.autreFin ? { mention: h.autreFin.mention } : null,
  };
}

/** L'état d'un cas pour la liste : « bientot », « en_cours » ou « termine ». */
function statut(h, parus) {
  if (!parus) return 'bientot';
  return parus >= h.episodes.length ? 'termine' : 'en_cours';
}

/** L'autre fin (bonus) : la version qui n'a pas été publiée, une fois l'histoire terminée pour la personne. */
const autreBranche = (b) => (b === 'A' ? 'B' : b === 'B' ? 'A' : null);

/** Vérifie une histoire (utilisé par les tests : un oubli dans les données casse le test, pas l'appli). */
function verifierHistoire(h) {
  const err = [];
  if (!/^[a-z0-9-]{2,40}$/.test(h.id)) err.push('id');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(h.depart) || !/^\d{2}:\d{2}$/.test(h.heure)) err.push('date d\'ouverture publique');
  if (h.embranchement && !(decisionJours(h) >= h.embranchement)) err.push('decisionJours : au moins le numéro de l\'embranchement');
  if (h.episodes.length !== 5) err.push('5 épisodes');
  const imageOk = (src) => src == null || /^\/images\/[a-z0-9/-]+\/[A-Za-z0-9-]+\.webp$/.test(src);
  if (!imageOk(h.image)) err.push('image de couverture : /images/…/nom.webp');
  if (h.intrigue != null && h.intrigue !== `/audio/cas-du-soir/${h.id}-intrigue.mp3`) err.push(`intrigue : /audio/cas-du-soir/${h.id}-intrigue.mp3`);
  const minutageOk = (cle) => {
    if (cle == null) return true;
    const m = MINUTAGES[cle];
    return !!m && Array.isArray(m.lignes) && m.lignes.every((l) => l.t1 > l.t0 && l.texte) && (m.images || []).every((x) => /^[A-Za-z0-9-]+\.webp$/.test(x.image));
  };
  if (!minutageOk(h.intrigueMinutage)) err.push('minutage de l\'intrigue');
  h.episodes.forEach((e, i) => {
    const n = i + 1;
    const versions = aDesVersions(h, n) ? ['A', 'B'].map((b) => e[b]) : [e];
    for (const v of versions) {
      if (!v || !v.titre || !v.texte || !v.question) { err.push(`épisode ${n} incomplet`); continue; }
      if (!imageOk(v.image)) err.push(`épisode ${n} : image /images/…/nom.webp`);
      if (!minutageOk(v.minutage)) err.push(`épisode ${n} : minutage`);
      // Audio public seulement pour un épisode ouvert à tous (le 1) : les autres passent par Storage (liens signés)
      if (v.audio && v.audio.startsWith('/') && n !== 1) err.push(`épisode ${n} : audio payant, pas dans public/`);
      const attendu = h.embranchement === n ? 2 : 3;
      if (!Array.isArray(v.choix) || v.choix.length !== attendu) err.push(`épisode ${n} : ${attendu} choix`);
      else if (v.choix.some((c) => !c.id || !c.label || !c.echo)) err.push(`épisode ${n} : choix incomplet`);
      if (h.embranchement === n && v.choix.map((c) => c.id).join() !== 'A,B') err.push(`épisode ${n} : choix A et B`);
    }
  });
  if (!h.fin || !h.fin.texte || !Array.isArray(h.fin.quiz) || h.fin.quiz.length !== 3) err.push('fin : leçon et 3 questions');
  else h.fin.quiz.forEach((q, i) => { if (q.reponses.length !== 3 || !(q.bonne >= 0 && q.bonne < 3)) err.push(`quiz ${i + 1}`); });
  if (h.fin && !minutageOk(h.fin.minutage)) err.push('fin : minutage');
  return err;
}

module.exports = {
  CAS_DU_SOIR_PUBLIC, PRIX, prixSuite, SEUIL_POURCENTAGES, ANIMAUX, ANIMAL_PLURIEL, HISTOIRES, histoireById, histoireDuMoment, aDesVersions,
  DAY, heureMs, debutJour, decisionJours, ouverturePublique, estOuverte, ouvertureEpisode, parusPour, debutApercu, dateDecision, decisionPrise, prochaineOuverture,
  minutage, majorite, statut, autreBranche, aUnAudio, episodeContenu, peutLire, peutAvancer, choixValide, votant, pourcentages, choixDeLAnimal, detailParAnimal, vueEpisode, vueHistoire,
  verifierHistoire,
};

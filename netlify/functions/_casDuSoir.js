/**
 * _casDuSoir — logique pure du « Cas du soir » (sans Firebase, testée dans _tests/casDuSoir.test.js).
 * Publication par date, droits de lecture, embranchement décidé par la majorité, résultats des votes.
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
 * Prix en étincelles. LES PRIX SONT LA DÉCISION DE PAPA MOUSSA.
 * Copie de CAS_DU_SOIR_PRIX dans src/config/contenusPayants.ts (un test vérifie que les deux sont identiques) :
 * le serveur fait foi pour le débit, l'appli s'en sert pour l'affichage.
 */
const PRIX = { suite: 1, bonus: 1, autreFin: 2 };

/** Les pourcentages (et ce qu'a choisi chaque animal) ne s'affichent qu'à partir de ce nombre de votes. */
const SEUIL_POURCENTAGES = 30;

const DAY = 86400000;
const ANIMAUX = ['lion', 'aigle', 'cheval', 'loup', 'dauphin', 'elephant', 'cerf', 'hibou', 'panthere', 'renard', 'tortue', 'ours'];
const ANIMAL_PLURIEL = {
  lion: 'les lions', aigle: 'les aigles', cheval: 'les chevaux', loup: 'les loups', dauphin: 'les dauphins', elephant: 'les éléphants',
  cerf: 'les cerfs', hibou: 'les hiboux', panthere: 'les panthères', renard: 'les renards', tortue: 'les tortues', ours: 'les ours',
};

const histoireById = (id) => HISTOIRES.find((h) => h.id === id) || null;

/** L'histoire en cours : la plus récente déjà commencée, sinon la prochaine. */
function histoireDuMoment(now = Date.now(), list = HISTOIRES) {
  const started = list.filter((h) => h.programmee !== false && publication(h, 1) <= now).sort((a, b) => publication(b, 1) - publication(a, 1));
  if (started.length) return started[0];
  return [...list].sort((a, b) => publication(a, 1) - publication(b, 1))[0] || null;
}

/** Heure de parution de l'épisode n (1 à 5) : le jour n à partir du départ, à l'heure de Dakar (UTC). */
function publication(h, n) {
  return Date.parse(`${h.depart}T${h.heure || '20:00'}:00Z`) + (n - 1) * DAY;
}

/** Combien d'épisodes sont parus à cet instant (0 avant le départ, et toujours 0 sans date publique, hors aperçu). */
function episodesParus(h, now = Date.now(), apercu = false) {
  if (h.programmee === false && !apercu) return 0;
  let n = 0;
  while (n < h.episodes.length && publication(h, n + 1) <= now) n += 1;
  return n;
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
 * Peut-on payer pour lire l'épisode n tout de suite ?
 * Seulement l'épisode qui suit le dernier paru, et jamais celui qui dépend d'un vote encore ouvert (l'embranchement).
 */
function peutAvancer(h, { n, parus, debloques = [] }) {
  // Pas d'achat avant la parution du premier épisode (histoire non commencée ou sans date)
  if (!(parus >= 1)) return { ok: false, raison: 'pas_commence' };
  if (n !== parus + 1 || n > h.episodes.length || debloques.includes(n)) return { ok: false, raison: 'pas_maintenant' };
  if (h.embranchement && n === h.embranchement + 1) return { ok: false, raison: 'vote_en_cours' };
  return { ok: true };
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
function vueHistoire(h, now, { parus, debloques = [], connecte }) {
  const cur = Math.max(1, parus);
  return {
    id: h.id, titre: h.titre, image: h.image || null, intrigue: h.intrigue || null, intrigueMinutage: minutage(h.intrigueMinutage), accroche: (h.accroches && h.accroches[String(cur)]) || h.accroche, avertissement: h.avertissement, total: h.episodes.length, parus,
    prochain: h.programmee === false && !parus ? null : parus < h.episodes.length ? publication(h, parus + 1) : null,
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(h.depart) || !/^\d{2}:\d{2}$/.test(h.heure)) err.push('date');
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
  return err;
}

module.exports = {
  CAS_DU_SOIR_PUBLIC, PRIX, SEUIL_POURCENTAGES, ANIMAUX, ANIMAL_PLURIEL, HISTOIRES, histoireById, histoireDuMoment, publication, episodesParus, aDesVersions,
  minutage, majorite, statut, autreBranche, aUnAudio, episodeContenu, peutLire, peutAvancer, choixValide, votant, pourcentages, choixDeLAnimal, detailParAnimal, vueEpisode, vueHistoire,
  verifierHistoire,
};

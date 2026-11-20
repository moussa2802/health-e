/**
 * cas-du-soir — « Le cas du soir » : une histoire en 5 épisodes, un épisode par soir, un vote à la fin de chacun.
 * POST { action, ... }, jeton Firebase facultatif (visiteur : épisode 1 et son vote seulement). Aucun appel à l'IA.
 *
 *   liste                    → { visible, histoires: [vue + statut] }   la page « Le cas du soir » (tous les cas)
 *   etat { histoire? }       → { visible, histoire, prix, connecte, bonus, apercu, animal, proprio }   (visible:false : rien d'autre)
 *   episodes { histoire }    → la liste des épisodes d'un cas, avec l'état de chacun (lu, à lire, prochain, verrouillé…)
 *   Un cas « cache: true » est en construction : seul le propriétaire le voit.
 *   Toutes les actions acceptent « histoire » (l'identifiant du cas) ; sans lui, c'est le cas du moment.
 *   episode { n }            → l'épisode (texte, lien audio), mon vote et les résultats si j'ai voté, la suite possible
 *   vote { n, choix, visiteurId? } → un vote par personne et par épisode ; renvoie les résultats
 *   debloquer                → ouvrir tout le cas tout de suite avant son ouverture publique (prix h.debloquer, une fois ; option A)
 *   avancer { n }            → lire l'épisode n tout de suite (prix PRIX.suite[n], qui monte avec l'épisode ; débité une fois)
 *   bonus                    → le détail des votes par animal pour toute l'histoire (prix PRIX.bonus, une fois)
 *   autreFin                 → l'autre fin, une fois l'histoire terminée (prix PRIX.autreFin, une fois) ; puis episode { n, autre: true }
 *   fin                      → la leçon (gratuite), le quiz, le test lié, une fois l'épisode 5 lisible
 *   statistiques             → { cas: [...] }   Dr Lô seul : chiffres bruts par cas (espace admin, onglet « Cas du soir »)
 *   evenement { kind: 'page'|'test'|'quiz', id? } → compte un geste, une fois par personne (la page d'un cas, un test proposé ouvert, le quiz terminé)
 *   utile { oui, texte? }    → « Ce cas t'a été utile ? » (une fois la leçon lisible) : oui/non, changeable ; le « non » et son texte restent privés (Dr Lô seul)
 *
 * RYTHME PERSONNEL : chaque lecteur a sa propre horloge (casDuSoirAcces.debut), qui démarre à la première ouverture de l'épisode 1
 * avec un compte. L'épisode n s'ouvre gratuitement pour lui le (n-1)-ième soir après son départ, à 20 h (heure de Dakar = UTC) ;
 * « la suite tout de suite » se paie (prix de l'épisode). Le vote de l'épisode 3 est PERSONNEL : chacun a la suite (A ou B)
 * qui correspond à SON vote, sans date commune ni majorité. Voir _casDuSoir.js.
 *
 * Tant que CAS_DU_SOIR_PUBLIC est false, seul le propriétaire (Dr Lô) le voit. Il peut simuler l'âge de sa lecture (« jour » 1 au nombre d'épisodes du cas)
 * pour tout parcourir (et la suite A ou B à voir : « branche ») : en aperçu, son horloge n'est pas enregistrée et ses votes ne sont pas comptés.
 *
 * Firestore (écrit par le serveur seulement ; fermé au navigateur) :
 *   casDuSoirVotes/{histoire}_{n}_{votant}   { histoire, n, choix, animal, at }
 *   casDuSoirResultats/{histoire}_{n}         { counts: { A, B, C }, parAnimal: { lion: { A, … } }, total }
 *   casDuSoirAcces/{uid}_{histoire}           { debut, episodes: [n…], bonus: true, autreFin: true, anticipe: true }   (son horloge, ce qu'il a payé)
 *   casDuSoirStats/{histoire}                 { lecteurs, utileOui, utileNon }   (lecteurs = comptes dont l'horloge a démarré, hors propriétaire)
 *   casDuSoirUtile/{histoire}_{votant}        { histoire, oui, texte, visiteur, atMs }   (une réponse par personne, modifiable)
 *   casDuSoirEvt/{histoire}_{champ}_{votant}  { histoire, champ, atMs }   (un geste compté une fois par personne : visiteurs, lu_n, lu_fin, quiz, test_<id>)
 *   casDuSoirStats/{histoire} reçoit aussi les compteurs de ces gestes (visiteurs, visiteursCompte, lu_1…, lu_fin, quiz, test_<id>) : Dr Lô seul les voit (action statistiques)
 */
const crypto = require('crypto');
const { admin, db, verifyAuth } = require('./_firebase');
const R = require('./_roles');
const K = require('./_casDuSoir');
const { totemOf, moderate, REASON_TEXT } = require('./_drloComments');
const CP = require('./_compteurs');
const OB = require('./_openBox');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const inc = (n) => admin.firestore.FieldValue.increment(n);
const VOTES = () => db.collection('casDuSoirVotes');
const RES = () => db.collection('casDuSoirResultats');
const ACCES = () => db.collection('casDuSoirAcces');
const STATS = () => db.collection('casDuSoirStats');
const UTILE = () => db.collection('casDuSoirUtile');
const EVT = () => db.collection('casDuSoirEvt');
const sha = (s) => crypto.createHash('sha256').update(`cds|${s}`).digest('hex');

/** Le fichier audio est-il déposé ? (la carte dit alors « Écouter », sinon « Lire ») */
async function audioExiste(path) {
  if (!path) return false;
  if (path.startsWith('/')) return true; // fichier public (épisode gratuit pour tous) : déclaré dans le dépôt
  try { const [exists] = await admin.storage().bucket(BUCKET).file(path).exists(); return !!exists; } catch { return false; }
}

async function audioUrl(path) {
  if (!path) return null;
  if (path.startsWith('/')) return path; // fichier public : pas de lien signé
  try {
    const file = admin.storage().bucket(BUCKET).file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [u] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 });
    return u;
  } catch (e) { console.error('cas-du-soir audio', e.message); return null; }
}

/** Ce que la personne a : son horloge (ms), les épisodes payés, le bonus, l'autre fin. */
async function accesDe(uid, histoireId) {
  const vide = { debut: null, episodes: [], bonus: false, autreFin: false, anticipe: false };
  if (!uid) return vide;
  const ac = await ACCES().doc(`${uid}_${histoireId}`).get();
  if (!ac.exists) return vide;
  const d = ac.data() || {};
  return { debut: Number(d.debut) > 0 ? Number(d.debut) : null, episodes: Array.isArray(d.episodes) ? d.episodes : [], bonus: d.bonus === true, autreFin: d.autreFin === true, anticipe: d.anticipe === true };
}

/** Les compteurs bruts d'un cas (gardés 60 s en mémoire : la page d'accueil des cas les relit à chaque affichage). */
const cacheStats = new Map();
async function statsDe(id) {
  const c = cacheStats.get(id);
  const age = c ? Date.now() - c.t : -1;
  if (c && age >= 0 && age < 60000) return c.v;
  let v = { lecteurs: 0, utileOui: 0, utileNon: 0 };
  try { const d = await STATS().doc(id).get(); if (d.exists) { const x = d.data(); v = { lecteurs: Number(x.lecteurs) || 0, utileOui: Number(x.utileOui) || 0, utileNon: Number(x.utileNon) || 0 }; } } catch (e) { console.error('cas-du-soir stats', e.message); }
  cacheStats.set(id, { t: Date.now(), v });
  return v;
}
/** Ce que voit le public : un chiffre seulement au-dessus du seuil (voir _compteurs.js), sinon rien. */
const statsPubliques = (st) => ({ lecteurs: CP.afficher(st.lecteurs, CP.SEUILS.lecteurs), utile: CP.afficher(st.utileOui, CP.SEUILS.utile) });

/** Compte un geste UNE fois par personne (champ = visiteurs, lu_2, lu_fin, quiz, test_ecr_r…) ; ne bloque jamais la lecture. */
async function noter(h, qui, champ, extra) {
  if (!qui) return;
  try {
    const ref = EVT().doc(`${h.id}_${champ}_${qui}`); const st = STATS().doc(h.id);
    await db.runTransaction(async (tx) => {
      const d = await tx.get(ref);
      if (d.exists) return;
      tx.set(ref, { histoire: h.id, champ, atMs: Date.now() });
      tx.set(st, { [champ]: inc(1), ...(extra || {}) }, { merge: true });
    });
  } catch (e) { console.error('cas-du-soir noter', e.message); }
}

/** Démarre l'horloge personnelle (une seule fois : le premier départ est gardé, même si deux appels se croisent). */
async function demarrerHorloge(histoireId, uid, t, compter) {
  const ref = ACCES().doc(`${uid}_${histoireId}`);
  return db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    const d = cur.exists ? Number(cur.data().debut) : 0;
    if (d > 0) return d;
    tx.set(ref, { uid, histoire: histoireId, debut: t, debutAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    // Un lecteur de plus : une personne = un compte dont l'horloge démarre (jamais le propriétaire, jamais deux fois)
    if (compter) tx.set(STATS().doc(histoireId), { lecteurs: inc(1) }, { merge: true });
    return t;
  });
}

/**
 * LA SUITE DE CETTE PERSONNE : celle de SON vote à l'épisode de l'embranchement ('A' ou 'B'), ou null si elle n'a pas encore voté
 * (un visiteur sans vote n'a pas de suite). En aperçu du propriétaire : la suite demandée (« branche »), 'A' par défaut,
 * sans rien enregistrer. Plus de majorité ni de date commune : chacun a la suite qui correspond à son choix.
 */
async function brancheDe(h, { qui, apercu, brancheApercu }) {
  if (!h.embranchement) return null;
  if (apercu) return brancheApercu === 'B' ? 'B' : 'A';
  if (!qui) return null;
  const v = await VOTES().doc(`${h.id}_${h.embranchement}_${qui}`).get();
  const c = v.exists ? v.data().choix : null;
  return c === 'A' || c === 'B' ? c : null;
}

/** Résultats d'un épisode, vus par une personne (son animal), avec le détail par animal si elle a le bonus. */
function resultats(contenu, r, { choix, animal, bonus }) {
  const d = r || {};
  const p = K.pourcentages(contenu, d.counts || {});
  // Moins de SEUIL_POURCENTAGES votes : ni pourcentages, ni choix de l'animal, ni détail (trop peu pour dire quelque chose)
  const assez = p.total >= K.SEUIL_POURCENTAGES;
  const out = { total: p.total, parChoix: assez ? p.parChoix : null, seuil: K.SEUIL_POURCENTAGES, animal: assez ? K.choixDeLAnimal(contenu, d.parAnimal || {}, animal) : null };
  if (choix) out.echo = (contenu.choix.find((c) => c.id === choix) || {}).echo || '';
  if (bonus && assez) out.parAnimal = K.detailParAnimal(contenu, d.parAnimal || {});
  return out;
}

exports._viderCache = () => cacheStats.clear(); // pour les tests
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const action = String(body.action || '');

  try {
    const user = await verifyAuth(event);
    const uid = user ? user.uid : null;
    const owner = uid ? (await R.roleOf(uid)).owner : false;
    if (!K.CAS_DU_SOIR_PUBLIC && !owner) return action === 'etat' || action === 'liste' ? reply(200, { visible: false }) : reply(404, { error: 'Introuvable' });

    // Aperçu du propriétaire : il choisit le jour à simuler (1 au nombre d'épisodes du cas)
    const jour = owner ? Math.round(Number(body.jour)) : NaN;
    const realNow = Date.now();

    // Statistiques pour l'espace admin (Dr Lô seul) : par cas, lecteurs, progression, achats, votes par épisode, « utile » et les « non »
    if (action === 'statistiques') {
      if (!owner) return reply(403, { error: 'Réservé à Dr Lô.' });
      const cas = await Promise.all(K.HISTOIRES.map(async (x) => {
        const st = await statsDe(x.id);
        let acces = [];
        try { acces = (await ACCES().where('histoire', '==', x.id).get()).docs.map((d) => d.data() || {}); } catch (e2) { console.error('cas-du-soir stats acces', e2.message); }
        let brut = {};
        try { const d = await STATS().doc(x.id).get(); if (d.exists) brut = d.data() || {}; } catch (e2) { console.error('cas-du-soir stats brut', e2.message); }
        const commences = acces.filter((a) => Number(a.debut) > 0).length;
        const payeurs = acces.filter((a) => (Array.isArray(a.episodes) && a.episodes.length > 0) || a.anticipe === true || a.bonus === true || a.autreFin === true).length;
        const episodes = await Promise.all(x.episodes.map(async (e, i) => {
          let r = {};
          try { const d = await RES().doc(`${x.id}_${i + 1}`).get(); if (d.exists) r = d.data() || {}; } catch (e2) { console.error('cas-du-soir stats votes', e2.message); }
          return { n: i + 1, titre: e.titre, votes: Number(r.total) || 0, counts: r.counts || {}, ouverts: acces.filter((a) => Array.isArray(a.episodes) && a.episodes.includes(i + 1)).length, lus: Number(brut[`lu_${i + 1}`]) || 0 };
        }));
        let non = [];
        try { const q = await UTILE().where('histoire', '==', x.id).where('oui', '==', false).limit(100).get(); non = q.docs.map((d) => d.data()).filter((y) => y.texte).sort((a, b) => (b.atMs || 0) - (a.atMs || 0)).slice(0, 20).map((y) => ({ texte: y.texte, atMs: y.atMs || 0 })); } catch (e2) { console.error('cas-du-soir stats non', e2.message); }
        return { id: x.id, titre: x.titre, categorie: x.categorie || null, cache: x.cache === true, lecteurs: st.lecteurs, visiteurs: Number(brut.visiteurs) || 0, visiteursCompte: Number(brut.visiteursCompte) || 0, commences, payeurs, lectureFin: Number(brut.lu_fin) || 0, quiz: Number(brut.quiz) || 0,
          tests: Object.keys(brut).filter((k) => k.startsWith('test_')).map((k) => ({ id: k.slice(5), n: Number(brut[k]) || 0 })).sort((a, b) => b.n - a.n), utileOui: st.utileOui, utileNon: st.utileNon, episodes, non };
      }));
      // Boîte anonyme : les réponses publiées, avec leurs vues et réactions (chiffres bruts)
      let boite = { reponses: 0, vues: 0, utile: 0, moi: 0, pasclair: 0 };
      try {
        (await db.collection('openQuestions').where('status', '==', 'site').get()).docs.forEach((d) => {
          const q = d.data() || {}; const r = q.reactions || {};
          boite = { reponses: boite.reponses + 1, vues: boite.vues + (Number(q.vues) || 0), utile: boite.utile + (Number(r.utile) || 0), moi: boite.moi + (Number(r.moi) || 0), pasclair: boite.pasclair + (Number(r.pasclair) || 0) };
        });
      } catch (e2) { console.error('cas-du-soir stats boite', e2.message); }
      return reply(200, { cas, boite });
    }

    // La liste des cas (page « Le cas du soir ») : la couverture, l'accroche et l'état de chacun, pour CE lecteur
    if (action === 'liste') {
      const histoires = await Promise.all(K.HISTOIRES.filter((x) => !x.cache || owner).map(async (x) => {
        const ap = Number.isInteger(jour) && jour >= 1 && jour <= x.episodes.length;
        const ac = await accesDe(uid, x.id);
        const p = K.parusPour(x, { debut: ac.debut, now: realNow, apercu: ap, jour, anticipe: ac.anticipe });
        const prochain = K.prochaineOuverture(x, { parus: p, debut: ac.debut, now: realNow, apercu: ap, jour });
        const st = await statsDe(x.id);
        return { ...K.vueHistoire(x, { parus: p, debloques: ac.episodes, connecte: !!uid, prochain, anticipe: ac.anticipe, now: realNow }), statut: K.statut(x, p, ac.anticipe), stats: statsPubliques(st), ...(owner ? { chiffres: st } : {}) };
      }));
      return reply(200, { visible: true, histoires, proprio: owner });
    }

    // Un cas précis (adresse /cas-du-soir/:id) ; inconnu : introuvable. Sans identifiant : le cas du moment.
    // Un cas « cache: true » est en construction : seul le propriétaire le voit (ni liste, ni adresse, ni « cas du moment »)
    const visibles = K.HISTOIRES.filter((x) => !x.cache || owner);
    if (body.histoire && !visibles.some((x) => x.id === String(body.histoire))) return reply(404, { error: 'Ce cas n\'existe pas.' });
    const h = body.histoire ? K.histoireById(String(body.histoire)) : K.histoireDuMoment(realNow, visibles);
    if (!h) return reply(action === 'etat' ? 200 : 404, action === 'etat' ? { visible: false } : { error: 'Introuvable' });
    const apercu = Number.isInteger(jour) && jour >= 1 && jour <= h.episodes.length;
    const n = Math.round(Number(body.n));

    // La personne : son animal (révélé), son horloge, ce qu'elle a payé
    let animal = null;
    let acces = { debut: null, episodes: [], bonus: false, autreFin: false, anticipe: false };
    if (uid) {
      const [up, ac] = await Promise.all([db.collection('userProfiles').doc(uid).get(), accesDe(uid, h.id)]);
      animal = totemOf(up.exists ? up.data() : null);
      acces = ac;
    }
    const connecte = !!uid;
    const debloques = acces.episodes;

    // L'horloge démarre à la première ouverture de l'épisode 1 avec un compte (jamais en aperçu, jamais avant l'ouverture publique)
    let debut = acces.debut;
    if (uid && !apercu && !debut && n === 1 && body.autre !== true && (action === 'episode' || action === 'vote') && K.estOuverte(h, realNow)) {
      debut = await demarrerHorloge(h.id, uid, realNow, !owner);
    }
    const commence = apercu || !!debut;
    const debutAffiche = apercu ? K.debutApercu(realNow, jour) : debut;
    const parus = K.parusPour(h, { debut, now: realNow, apercu, jour, anticipe: acces.anticipe });
    // Le vote de l'embranchement est PERSONNEL : la suite de chacun est celle de son propre vote
    const qui = K.votant(uid, body.visiteurId, sha);
    const branche = await brancheDe(h, { qui, apercu, brancheApercu: body.branche });
    const choixFait = !h.embranchement || !!branche;
    const quandOuvre = (k) => (debutAffiche ? K.ouvertureEpisode(h, k, debutAffiche) : null);

    if (action === 'etat') {
      const finie = K.peutLire({ n: h.episodes.length, parus, connecte, debloques });
      const prochain = K.prochaineOuverture(h, { parus, debut, now: realNow, apercu, jour });
      const vue = K.vueHistoire(h, { parus, debloques, connecte, prochain, anticipe: acces.anticipe, now: realNow });
      const e = h.episodes[Math.max(1, parus) - 1];
      vue.audio = await audioExiste(e && (e.audio || (e.A && e.A.audio)));
      const st = await statsDe(h.id);
      vue.stats = statsPubliques(st);
      let chiffres = null;
      if (owner) {
        // Dr Lô seul : les chiffres bruts et les « non » avec leur texte (pour savoir ce qui a manqué)
        let non = [];
        try { const q = await UTILE().where('histoire', '==', h.id).where('oui', '==', false).limit(100).get(); non = q.docs.map((d) => d.data()).filter((x) => x.texte).sort((a, b) => (b.atMs || 0) - (a.atMs || 0)).slice(0, 20).map((x) => ({ texte: x.texte, atMs: x.atMs || 0 })); } catch (e2) { console.error('cas-du-soir non', e2.message); }
        chiffres = { ...st, non };
      }
      return reply(200, {
        visible: true, histoire: vue, prix: K.PRIX, connecte, bonus: acces.bonus, apercu, animal, proprio: owner, ...(chiffres ? { chiffres } : {}),
        autreFin: { achetee: acces.autreFin, possible: connecte && finie && !!h.embranchement && !!branche },
      });
    }

    // Les épisodes d'un cas : une carte par épisode, avec son état pour CE lecteur. Après l'embranchement, seule la version choisie
    // par la majorité est montrée, et seulement une fois la décision figée ; avant, « la suite dépend du vote de tous ».
    if (action === 'episodes') {
      const votes = qui ? await Promise.all(h.episodes.map((_, i) => VOTES().doc(`${h.id}_${i + 1}_${qui}`).get())) : [];
      const ouvert = Math.max(parus, ...debloques.map(Number).filter(Number.isFinite));
      const list = h.episodes.map((_, i) => {
        const k = i + 1;
        const lisible = K.peutLire({ n: k, parus, connecte, debloques });
        const versions = K.aDesVersions(h, k);
        const contenu = K.episodeContenu(h, k, versions ? branche : null);
        if (!contenu) return { n: k, attente: true, etat: 'vote' };
        const vote = votes[i] && votes[i].exists;
        let etat = 'verrouille';
        if (lisible) etat = vote ? 'lu' : 'a_lire';
        else if (!connecte && k > 1) etat = 'compte';
        else if (k === ouvert + 1) etat = 'prochain';
        const avance = etat === 'prochain' ? K.peutAvancer(h, { n: k, parus, debloques, commence, choixFait }) : null;
        // Une version choisie par la majorité ne se révèle (titre, image) qu'à qui peut la lire : pas de spoiler sur la décision
        const cache = versions && !lisible;
        return { n: k, titre: cache ? 'À découvrir' : contenu.titre, image: cache ? null : contenu.image || null, etat, parution: k > parus ? quandOuvre(k) : null, avance };
      });
      const finie = K.peutLire({ n: h.episodes.length, parus, connecte, debloques });
      return reply(200, { episodes: list, finie, prix: K.PRIX, autreFin: { achetee: acces.autreFin, possible: connecte && finie && !!h.embranchement && !!branche }, apercu });
    }

    // L'autre fin (bonus payé) : la version non publiée des épisodes après l'embranchement, en lecture seule (pas de vote)
    if (action === 'episode' && body.autre === true) {
      if (!acces.autreFin || !branche || !K.aDesVersions(h, n) || !K.peutLire({ n: h.episodes.length, parus, connecte, debloques })) return reply(403, { error: 'L\'autre fin n\'est pas ouverte.' });
      const contenu = K.episodeContenu(h, n, K.autreBranche(branche));
      if (!contenu) return reply(409, { error: 'L\'autre fin n\'est pas encore connue.' });
      return reply(200, { episode: { ...K.vueEpisode(h, n, contenu), choix: [] }, autre: true, audioUrl: await audioUrl(contenu.audio), monChoix: null, resultats: null, suite: null, finLisible: false, apercu });
    }

    if (action === 'episode' || action === 'vote') {
      if (!K.peutLire({ n, parus, connecte, debloques })) {
        return reply(403, { error: !connecte && n > 1 ? 'Crée ton espace pour lire la suite.' : 'Cet épisode n\'est pas encore ouvert.', compte: !connecte && n > 1 });
      }
      const contenu = K.episodeContenu(h, n, K.aDesVersions(h, n) ? branche : null);
      if (!contenu) return reply(409, { error: 'Ta suite dépend de ton choix à l\'épisode ' + h.embranchement + '.', raison: 'choix_requis' });
      const resRef = RES().doc(`${h.id}_${n}`);
      if (action === 'episode' && !owner && !apercu) await noter(h, qui, `lu_${n}`);

      if (action === 'vote') {
        const choix = String(body.choix || '');
        if (!K.choixValide(contenu, choix)) return reply(400, { error: 'Choix inconnu.' });
        if (!qui) return reply(400, { error: 'Visiteur inconnu.' });
        if (apercu) {
          const r = await resRef.get();
          return reply(200, { ok: true, apercu: true, monChoix: choix, resultats: resultats(contenu, r.exists ? r.data() : null, { choix, animal, bonus: acces.bonus }) });
        }
        const voteRef = VOTES().doc(`${h.id}_${n}_${qui}`);
        const finalChoix = await db.runTransaction(async (tx) => {
          const v = await tx.get(voteRef);
          if (v.exists) return v.data().choix; // un seul vote par personne et par épisode
          tx.set(voteRef, { histoire: h.id, n, choix, animal: animal || null, visiteur: !uid, at: admin.firestore.FieldValue.serverTimestamp() });
          const upd = { [`counts.${choix}`]: inc(1), total: inc(1) };
          if (animal) upd[`parAnimal.${animal}.${choix}`] = inc(1);
          tx.set(resRef, upd, { merge: true });
          return choix;
        });
        const r = await resRef.get();
        return reply(200, { ok: true, monChoix: finalChoix, resultats: resultats(contenu, r.exists ? r.data() : null, { choix: finalChoix, animal, bonus: acces.bonus }) });
      }

      // episode
      const [v, r] = await Promise.all([qui ? VOTES().doc(`${h.id}_${n}_${qui}`).get() : null, resRef.get()]);
      const monChoix = v && v.exists ? v.data().choix : null;
      const suite = n < h.episodes.length
        ? { n: n + 1, lisible: K.peutLire({ n: n + 1, parus, connecte, debloques }), parution: quandOuvre(n + 1), avance: connecte ? K.peutAvancer(h, { n: n + 1, parus, debloques, commence, choixFait: choixFait || (h.embranchement === n && !!monChoix) }) : { ok: false, raison: 'compte' } }
        : null;
      return reply(200, {
        episode: K.vueEpisode(h, n, contenu), audioUrl: await audioUrl(contenu.audio), monChoix,
        resultats: monChoix ? resultats(contenu, r.exists ? r.data() : null, { choix: monChoix, animal, bonus: acces.bonus }) : null,
        suite, finLisible: n === h.episodes.length, apercu,
      });
    }

    // Débloquer tout le cas tout de suite (option A) : un seul paiement, tous les épisodes ouverts pour cette personne
    if (action === 'debloquer') {
      if (!uid) return reply(401, { error: 'Crée ton espace pour débloquer ce cas.', compte: true });
      const can = K.peutDebloquer(h, { now: realNow, anticipe: acces.anticipe });
      if (!can.ok) {
        if (can.raison === 'deja_debloque') return reply(200, { ok: true, deja: true });
        return reply(409, { error: can.raison === 'deja_ouvert' ? 'Ce cas est déjà ouvert.' : 'Ce cas ne se débloque pas à l\'avance.', raison: can.raison });
      }
      const hold = await reserveKoris(uid, 'cas_du_soir', can.prix, { histoire: h.id, quoi: 'debloquer' });
      if (hold.error) return reply(402, { error: 'Pas assez d\'étincelles', required: can.prix });
      try {
        await ACCES().doc(`${uid}_${h.id}`).set({ uid, histoire: h.id, anticipe: true, anticipeAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      } catch (e) { await releaseKoris(hold.holdId); throw e; }
      await commitKoris(hold.holdId);
      return reply(200, { ok: true, paid: can.prix });
    }

    if (action === 'avancer' || action === 'bonus' || action === 'autreFin') {
      if (!uid) return reply(401, { error: 'Crée ton espace pour lire la suite.', compte: true });
      const ref = ACCES().doc(`${uid}_${h.id}`);
      let price; let meta; let patch;
      if (action === 'avancer') {
        const can = K.peutAvancer(h, { n, parus, debloques, commence, choixFait });
        if (!can.ok) {
          const msg = can.raison === 'choix_requis' ? 'Choisis d\'abord ta suite à l\'épisode ' + h.embranchement + '.' : can.raison === 'pas_commence' ? 'Commence par lire l\'épisode 1.' : 'Cet épisode ne peut pas s\'ouvrir maintenant.';
          return reply(409, { error: msg, raison: can.raison });
        }
        // Le prix de CET épisode, lu dans la table du serveur (jamais un prix envoyé par l'appli)
        price = K.prixPour(h, n); meta = { histoire: h.id, episode: n, quoi: 'suite' };
        patch = { episodes: admin.firestore.FieldValue.arrayUnion(n) };
      } else if (action === 'autreFin') {
        if (acces.autreFin) return reply(200, { ok: true, deja: true });
        if (!h.embranchement || !branche || !K.peutLire({ n: h.episodes.length, parus, connecte, debloques })) return reply(409, { error: 'L\'autre fin s\'ouvre une fois l\'histoire terminée.' });
        price = K.PRIX.autreFin; meta = { histoire: h.id, quoi: 'autre_fin' };
        patch = { autreFin: true };
      } else {
        if (acces.bonus) return reply(200, { ok: true, deja: true });
        price = K.PRIX.bonus; meta = { histoire: h.id, quoi: 'bonus' };
        patch = { bonus: true };
      }
      const hold = await reserveKoris(uid, 'cas_du_soir', price, meta);
      if (hold.error) return reply(402, { error: 'Pas assez d\'étincelles', required: price });
      try {
        await ref.set({ uid, histoire: h.id, ...patch, at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      } catch (e) { await releaseKoris(hold.holdId); throw e; }
      await commitKoris(hold.holdId);
      return reply(200, { ok: true, paid: price });
    }

    // « Ce cas t'a été utile ? » : une réponse par personne (modifiable), une fois la leçon lisible. Le « oui » alimente un chiffre public (au-dessus du seuil) ;
    // le « non » et son texte facultatif restent privés. Le propriétaire (et son aperçu) ne compte jamais.
    if (action === 'utile') {
      if (typeof body.oui !== 'boolean') return reply(400, { error: 'Réponse inconnue.' });
      if (owner || apercu) return reply(200, { ok: true, apercu: true, oui: body.oui });
      if (!K.peutLire({ n: h.episodes.length, parus, connecte, debloques })) return reply(403, { error: 'La fin n\'est pas encore ouverte.' });
      if (!qui) return reply(400, { error: 'Visiteur inconnu.' });
      let texte = '';
      if (body.oui === false) {
        texte = String(body.texte || '').replace(/\s+/g, ' ').trim().slice(0, 300);
        if (texte) { const m = moderate(texte); if (!m.ok && m.reason !== 'crisis') return reply(400, { error: REASON_TEXT[m.reason] || 'Retire les numéros, liens ou mots blessants.' }); }
      }
      // Freins : une personne = une réponse ; et au plus 40 envois par appareil et par jour (contre les inscriptions en série)
      const day = OB.dayKey(); const hd = event.headers || {};
      const ip = String(hd['x-nf-client-connection-ip'] || hd['x-forwarded-for'] || '').split(',')[0].trim();
      const rateRef = db.collection('casDuSoirRate').doc(`${day}_${OB.fingerprint(ip, hd['user-agent'], day)}`);
      const ref = UTILE().doc(`${h.id}_${qui}`); const stRef = STATS().doc(h.id);
      const verdict = await db.runTransaction(async (tx) => {
        const [r, cur, rt] = await Promise.all([tx.get(ref), tx.get(stRef), tx.get(rateRef)]);
        const n = rt.exists ? Number(rt.data().n) || 0 : 0;
        if (n >= 40) return { ok: false };
        tx.set(rateRef, { n: n + 1, day }, { merge: true });
        const prev = r.exists ? r.data().oui : undefined;
        const upd = {};
        if (prev === undefined) upd[body.oui ? 'utileOui' : 'utileNon'] = inc(1);
        else if (prev !== body.oui) { upd[prev ? 'utileOui' : 'utileNon'] = inc(-1); upd[body.oui ? 'utileOui' : 'utileNon'] = inc(1); }
        if (Object.keys(upd).length) tx.set(stRef, upd, { merge: true });
        tx.set(ref, { histoire: h.id, oui: body.oui, texte, visiteur: !uid, atMs: Date.now() }, { merge: true });
        return { ok: true };
      });
      if (!verdict.ok) return reply(429, { error: 'Reviens demain.' });
      cacheStats.delete(h.id);
      return reply(200, { ok: true, oui: body.oui });
    }

    // Un geste compté une fois par personne : la page d'un cas, un test proposé ouvert, le quiz terminé (jamais le propriétaire ni l'aperçu)
    if (action === 'evenement') {
      const kind = String(body.kind || '');
      if (!['page', 'test', 'quiz'].includes(kind)) return reply(400, { error: 'Geste inconnu.' });
      if (owner || apercu) return reply(200, { ok: true, apercu: true });
      if (!qui) return reply(400, { error: 'Visiteur inconnu.' });
      const day = OB.dayKey(); const hd = event.headers || {};
      const ip = String(hd['x-nf-client-connection-ip'] || hd['x-forwarded-for'] || '').split(',')[0].trim();
      const rateRef = db.collection('casDuSoirRate').doc(`evt_${day}_${OB.fingerprint(ip, hd['user-agent'], day)}`);
      const rt = await rateRef.get(); const nb = rt.exists ? Number(rt.data().n) || 0 : 0;
      if (nb >= 120) return reply(429, { error: 'Reviens demain.' });
      await rateRef.set({ n: nb + 1, day }, { merge: true });
      if (kind === 'page') await noter(h, qui, 'visiteurs', uid ? { visiteursCompte: inc(1) } : null);
      else if (kind === 'test') {
        const permis = new Set([...h.episodes.flatMap((e) => e.tests || []), h.testLie, h.testAussi].filter(Boolean));
        const id = String(body.id || '');
        if (!permis.has(id)) return reply(400, { error: 'Test inconnu.' });
        await noter(h, qui, `test_${id}`);
      } else {
        if (!K.peutLire({ n: h.episodes.length, parus, connecte, debloques })) return reply(403, { error: 'La fin n\'est pas encore ouverte.' });
        await noter(h, qui, 'quiz');
      }
      return reply(200, { ok: true });
    }

    if (action === 'fin') {
      if (!K.peutLire({ n: h.episodes.length, parus, connecte, debloques })) return reply(403, { error: 'La fin n\'est pas encore ouverte.' });
      const f = h.fin;
      if (!owner && !apercu) await noter(h, qui, 'lu_fin');
      let monUtile = null;
      if (qui) { try { const u = await UTILE().doc(`${h.id}_${qui}`).get(); if (u.exists) monUtile = u.data().oui === true ? 'oui' : 'non'; } catch { /* pas grave : la question se repose */ } }
      const st = await statsDe(h.id);
      return reply(200, { titre: f.titre, texte: f.texte, audioUrl: await audioUrl(f.audio), minutage: K.minutage(f.minutage), quiz: f.quiz, apresQuiz: f.apresQuiz || '', testLie: h.testLie || null, testAussi: h.testAussi || null, monUtile, utile: statsPubliques(st).utile });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (err) {
    console.error('cas-du-soir error:', err);
    return reply(500, { error: 'Erreur serveur' });
  }
};

/**
 * cas-du-soir — « Le cas du soir » : une histoire en 5 épisodes, un épisode par soir, un vote à la fin de chacun.
 * POST { action, ... }, jeton Firebase facultatif (visiteur : épisode 1 et son vote seulement). Aucun appel à l'IA.
 *
 *   liste                    → { visible, histoires: [vue + statut] }   la page « Le cas du soir » (tous les cas)
 *   etat { histoire? }       → { visible, histoire, prix, connecte, bonus, apercu, animal, proprio }   (visible:false : rien d'autre)
 *   episodes { histoire }    → la liste des épisodes d'un cas, avec l'état de chacun (lu, à lire, prochain, verrouillé…)
 *   Toutes les actions acceptent « histoire » (l'identifiant du cas) ; sans lui, c'est le cas du moment.
 *   episode { n }            → l'épisode (texte, lien audio), mon vote et les résultats si j'ai voté, la suite possible
 *   vote { n, choix, visiteurId? } → un vote par personne et par épisode ; renvoie les résultats
 *   debloquer                → ouvrir tout le cas tout de suite avant son ouverture publique (prix h.debloquer, une fois ; option A)
 *   avancer { n }            → lire l'épisode n tout de suite (prix PRIX.suite[n], qui monte avec l'épisode ; débité une fois)
 *   bonus                    → le détail des votes par animal pour toute l'histoire (prix PRIX.bonus, une fois)
 *   autreFin                 → l'autre fin, une fois l'histoire terminée (prix PRIX.autreFin, une fois) ; puis episode { n, autre: true }
 *   fin                      → la leçon (gratuite), le quiz, le test lié, une fois l'épisode 5 lisible
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
 */
const crypto = require('crypto');
const { admin, db, verifyAuth } = require('./_firebase');
const R = require('./_roles');
const K = require('./_casDuSoir');
const { totemOf } = require('./_drloComments');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const inc = (n) => admin.firestore.FieldValue.increment(n);
const VOTES = () => db.collection('casDuSoirVotes');
const RES = () => db.collection('casDuSoirResultats');
const ACCES = () => db.collection('casDuSoirAcces');
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

/** Démarre l'horloge personnelle (une seule fois : le premier départ est gardé, même si deux appels se croisent). */
async function demarrerHorloge(histoireId, uid, t) {
  const ref = ACCES().doc(`${uid}_${histoireId}`);
  return db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    const d = cur.exists ? Number(cur.data().debut) : 0;
    if (d > 0) return d;
    tx.set(ref, { uid, histoire: histoireId, debut: t, debutAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
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

    // La liste des cas (page « Le cas du soir ») : la couverture, l'accroche et l'état de chacun, pour CE lecteur
    if (action === 'liste') {
      const histoires = await Promise.all(K.HISTOIRES.map(async (x) => {
        const ap = Number.isInteger(jour) && jour >= 1 && jour <= x.episodes.length;
        const ac = await accesDe(uid, x.id);
        const p = K.parusPour(x, { debut: ac.debut, now: realNow, apercu: ap, jour, anticipe: ac.anticipe });
        const prochain = K.prochaineOuverture(x, { parus: p, debut: ac.debut, now: realNow, apercu: ap, jour });
        return { ...K.vueHistoire(x, { parus: p, debloques: ac.episodes, connecte: !!uid, prochain, anticipe: ac.anticipe, now: realNow }), statut: K.statut(x, p, ac.anticipe) };
      }));
      return reply(200, { visible: true, histoires, proprio: owner });
    }

    // Un cas précis (adresse /cas-du-soir/:id) ; inconnu : introuvable. Sans identifiant : le cas du moment.
    if (body.histoire && !K.histoireById(String(body.histoire))) return reply(404, { error: 'Ce cas n\'existe pas.' });
    const h = body.histoire ? K.histoireById(String(body.histoire)) : K.histoireDuMoment(realNow);
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
      debut = await demarrerHorloge(h.id, uid, realNow);
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
      return reply(200, {
        visible: true, histoire: vue, prix: K.PRIX, connecte, bonus: acces.bonus, apercu, animal, proprio: owner,
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

    if (action === 'fin') {
      if (!K.peutLire({ n: h.episodes.length, parus, connecte, debloques })) return reply(403, { error: 'La fin n\'est pas encore ouverte.' });
      const f = h.fin;
      return reply(200, { titre: f.titre, texte: f.texte, audioUrl: await audioUrl(f.audio), minutage: K.minutage(f.minutage), quiz: f.quiz, apresQuiz: f.apresQuiz || '', testLie: h.testLie || null, testAussi: h.testAussi || null });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (err) {
    console.error('cas-du-soir error:', err);
    return reply(500, { error: 'Erreur serveur' });
  }
};

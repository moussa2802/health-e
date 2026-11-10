/**
 * cas-du-soir — « Le cas du soir » : une histoire en 5 épisodes, un épisode par soir, un vote à la fin de chacun.
 * POST { action, ... }, jeton Firebase facultatif (visiteur : épisode 1 et son vote seulement). Aucun appel à l'IA.
 *
 *   etat                     → { visible, histoire, prix, connecte, bonus, apercu, animal, proprio }   (visible:false : rien d'autre)
 *   episode { n }            → l'épisode (texte, lien audio), mon vote et les résultats si j'ai voté, la suite possible
 *   vote { n, choix, visiteurId? } → un vote par personne et par épisode ; renvoie les résultats
 *   avancer { n }            → lire l'épisode n tout de suite (prix PRIX.suite, débité une fois)
 *   bonus                    → le détail des votes par animal pour toute l'histoire (prix PRIX.bonus, une fois)
 *   autreFin                 → l'autre fin, une fois l'histoire terminée (prix PRIX.autreFin, une fois) ; puis episode { n, autre: true }
 *   fin                      → la leçon (gratuite), le quiz, le test lié, une fois l'épisode 5 lisible
 *
 * Tant que CAS_DU_SOIR_PUBLIC est false, seul le propriétaire (Dr Lô) le voit. Il peut simuler un jour (« jour » 1 à 5)
 * pour tout parcourir avant la date de départ : en aperçu, ses votes ne sont pas enregistrés et la suite n'est pas figée.
 *
 * Firestore (écrit par le serveur seulement ; fermé au navigateur) :
 *   casDuSoirVotes/{histoire}_{n}_{votant}   { histoire, n, choix, animal, at }
 *   casDuSoirResultats/{histoire}_{n}         { counts: { A, B, C }, parAnimal: { lion: { A, … } }, total }
 *   casDuSoirResultats/{histoire}_branche     { branche, counts, figeeA }   (la suite choisie par la majorité, figée une fois)
 *   casDuSoirAcces/{uid}_{histoire}           { episodes: [n…], bonus: true, autreFin: true }   (ce qui a été payé)
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

async function audioUrl(path) {
  if (!path) return null;
  try {
    const file = admin.storage().bucket(BUCKET).file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [u] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 });
    return u;
  } catch (e) { console.error('cas-du-soir audio', e.message); return null; }
}

/** La suite choisie par la majorité de l'embranchement ; figée en base au premier passage après sa parution. */
async function brancheDe(h, parus, apercu) {
  if (!h.embranchement || parus <= h.embranchement) return null;
  const ref = RES().doc(`${h.id}_branche`);
  const fixed = await ref.get();
  if (fixed.exists) return fixed.data().branche;
  const r = await RES().doc(`${h.id}_${h.embranchement}`).get();
  const counts = r.exists ? r.data().counts || {} : {};
  const branche = K.majorite(h, counts);
  if (apercu) return branche; // aperçu avant la date : rien n'est figé
  return db.runTransaction(async (tx) => {
    const again = await tx.get(ref);
    if (again.exists) return again.data().branche;
    tx.set(ref, { branche, counts, figeeA: admin.firestore.FieldValue.serverTimestamp() });
    return branche;
  });
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
    if (!K.CAS_DU_SOIR_PUBLIC && !owner) return action === 'etat' ? reply(200, { visible: false }) : reply(404, { error: 'Introuvable' });

    // Aperçu du propriétaire : il choisit le jour à simuler (1 à 5)
    const jour = owner ? Math.round(Number(body.jour)) : NaN;
    const realNow = Date.now();
    let h = K.histoireDuMoment(realNow);
    if (!h) return reply(200, { visible: false });
    const apercu = Number.isInteger(jour) && jour >= 1 && jour <= h.episodes.length;
    const now = apercu ? K.publication(h, jour) + 60000 : realNow;
    const parus = K.episodesParus(h, now, apercu);

    // La personne : son animal (révélé), ce qu'elle a payé
    let animal = null; let acces = { episodes: [], bonus: false, autreFin: false };
    if (uid) {
      const [up, ac] = await Promise.all([db.collection('userProfiles').doc(uid).get(), ACCES().doc(`${uid}_${h.id}`).get()]);
      animal = totemOf(up.exists ? up.data() : null);
      if (ac.exists) acces = { episodes: Array.isArray(ac.data().episodes) ? ac.data().episodes : [], bonus: ac.data().bonus === true, autreFin: ac.data().autreFin === true };
    }
    const connecte = !!uid;
    const debloques = acces.episodes;

    if (action === 'etat') {
      const finie = K.peutLire({ n: h.episodes.length, parus, connecte, debloques });
      return reply(200, {
        visible: true, histoire: K.vueHistoire(h, now, { parus, debloques, connecte }), prix: K.PRIX, connecte, bonus: acces.bonus, apercu, animal, proprio: owner,
        autreFin: { achetee: acces.autreFin, possible: connecte && finie && !!h.embranchement },
        // Pour le vote de l'embranchement : quand la majorité décide (la parution de l'épisode suivant)
        decision: h.embranchement && (h.programmee !== false || apercu) ? K.publication(h, h.embranchement + 1) : null,
      });
    }

    const n = Math.round(Number(body.n));

    // L'autre fin (bonus payé) : la version non publiée des épisodes après l'embranchement, en lecture seule (pas de vote)
    if (action === 'episode' && body.autre === true) {
      if (!acces.autreFin || !K.aDesVersions(h, n) || !K.peutLire({ n: h.episodes.length, parus, connecte, debloques })) return reply(403, { error: 'L\'autre fin n\'est pas ouverte.' });
      const branche = await brancheDe(h, parus, apercu);
      const contenu = K.episodeContenu(h, n, K.autreBranche(branche));
      if (!contenu) return reply(409, { error: 'L\'autre fin n\'est pas encore connue.' });
      return reply(200, { episode: { ...K.vueEpisode(h, n, contenu), choix: [] }, autre: true, audioUrl: await audioUrl(contenu.audio), monChoix: null, resultats: null, suite: null, finLisible: false, apercu });
    }

    if (action === 'episode' || action === 'vote') {
      if (!K.peutLire({ n, parus, connecte, debloques })) {
        return reply(403, { error: !connecte && n > 1 ? 'Crée ton espace pour lire la suite.' : 'Cet épisode n\'est pas encore ouvert.', compte: !connecte && n > 1 });
      }
      const branche = K.aDesVersions(h, n) ? await brancheDe(h, parus, apercu) : null;
      const contenu = K.episodeContenu(h, n, branche);
      if (!contenu) return reply(409, { error: 'La suite dépend du vote : elle s\'ouvre à la parution.' });
      const qui = K.votant(uid, body.visiteurId, sha);
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
        ? { n: n + 1, lisible: K.peutLire({ n: n + 1, parus, connecte, debloques }), parution: K.publication(h, n + 1), avance: connecte ? K.peutAvancer(h, { n: n + 1, parus, debloques }) : { ok: false, raison: 'compte' } }
        : null;
      return reply(200, {
        episode: K.vueEpisode(h, n, contenu), audioUrl: await audioUrl(contenu.audio), monChoix,
        resultats: monChoix ? resultats(contenu, r.exists ? r.data() : null, { choix: monChoix, animal, bonus: acces.bonus }) : null,
        suite, finLisible: n === h.episodes.length, apercu,
      });
    }

    if (action === 'avancer' || action === 'bonus' || action === 'autreFin') {
      if (!uid) return reply(401, { error: 'Crée ton espace pour lire la suite.', compte: true });
      const ref = ACCES().doc(`${uid}_${h.id}`);
      let price; let meta; let patch;
      if (action === 'avancer') {
        const can = K.peutAvancer(h, { n, parus, debloques });
        if (!can.ok) return reply(409, { error: can.raison === 'vote_en_cours' ? 'La suite dépend du vote de tous : elle s\'ouvre demain soir.' : 'Cet épisode ne peut pas s\'ouvrir maintenant.', raison: can.raison });
        price = K.PRIX.suite; meta = { histoire: h.id, episode: n, quoi: 'suite' };
        patch = { episodes: admin.firestore.FieldValue.arrayUnion(n) };
      } else if (action === 'autreFin') {
        if (acces.autreFin) return reply(200, { ok: true, deja: true });
        if (!h.embranchement || !K.peutLire({ n: h.episodes.length, parus, connecte, debloques })) return reply(409, { error: 'L\'autre fin s\'ouvre une fois l\'histoire terminée.' });
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
      return reply(200, { titre: f.titre, texte: f.texte, audioUrl: await audioUrl(f.audio), quiz: f.quiz, apresQuiz: f.apresQuiz || '', testLie: h.testLie || null, testAussi: h.testAussi || null });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (err) {
    console.error('cas-du-soir error:', err);
    return reply(500, { error: 'Erreur serveur' });
  }
};

/**
 * practices — « Pratiques » de Dr Lô (exercices guidés, techniques, carnets). POST { action, ... } avec le jeton Firebase.
 *
 * Espace Dr Lô (staff/{uid}.drlo === true) :
 *   drlo_list → toutes les pratiques (brouillons et retirées comprises), script compris, avec leurs chiffres
 *   drlo_delete { id } → supprime une pratique que personne n'a débloquée (brouillon, publiée sans déblocage ou retirée) : audio, et retrait des épisodes qui la proposaient.
 *                        Si quelqu'un l'a déjà débloquée : refus, utilise « Retirer ».
 *   drlo_save { id?, type, title, summary, theme, minutes, price, freeForMembers, steps[], fields[], script, source, cautions, status, audio?, removeAudio? }
 * Personne connectée :
 *   list   { ids[] }           → résumés de pratiques publiées (carte sous un épisode) : prix, gratuite pour moi, déjà débloquée
 *   get    { id }              → la pratique (contenu et lien d'écoute si débloquée) + mes 28 derniers jours de carnet
 *   unlock { id }              → débloque (étincelles débitées UNE fois ; gratuit si prix 0 ou offerte aux membres d'une de mes chaînes)
 *   finish { id, feeling }     → « mieux / pareil / moins bien » à la fin d'un exercice
 *   stop   { id }              → « J'arrête, ça ne va pas » (compté, anonyme pour Dr Lô)
 *   log    { id, day, values } → enregistre un jour de carnet (AAAA-MM-JJ, aujourd'hui ou les 7 jours d'avant)
 * Le script n'est jamais renvoyé aux personnes. Les liens d'écoute (2 h) seulement à qui a débloqué.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const B = require('./_drloBroadcast');
const P = require('./_practices');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : Number(v) || 0);
const inc = (n) => admin.firestore.FieldValue.increment(n);
const unlockId = (uid, pid) => `${uid}_${pid}`;
const logId = (uid, pid, day) => `${uid}_${pid}_${day}`;

async function isDrLo(uid) {
  const s = await db.collection('staff').doc(uid).get();
  return s.exists && s.data().drlo === true;
}
async function signedUrl(path) {
  if (!path) return null;
  try {
    const [u] = await admin.storage().bucket(BUCKET).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 });
    return u;
  } catch (e) { console.error('practice audio url', e.message); return null; }
}
const dropFile = (path) => (path ? admin.storage().bucket(BUCKET).file(path).delete().catch(() => {}) : Promise.resolve());

const adminView = async (id, p) => ({
  id, type: p.type, title: p.title, summary: p.summary || '', theme: p.theme || 'autre', minutes: Number(p.minutes) || 1, price: Number(p.price) || 0,
  freeForMembers: !!p.freeForMembers, steps: p.steps || [], fields: p.fields || [], script: p.script || '', source: p.source || '', cautions: p.cautions || '',
  status: p.status || 'draft', audioSec: p.audio ? Number(p.audio.durationSec) || 0 : 0, audioUrl: p.audio ? await signedUrl(p.audio.path) : null,
  channelIds: p.channelIds || [], createdAt: ms(p.createdAt), stats: p.stats || {},
});

/** Les chaînes (parmi celles de la pratique) dont la personne est membre. */
async function memberOf(uid, channelIds) {
  const ids = (channelIds || []).slice(0, 10);
  if (!ids.length) return new Set();
  const snaps = await db.getAll(...ids.map((c) => db.collection('channelMembers').doc(`${c}_${uid}`)));
  return new Set(ids.filter((_, i) => snaps[i].exists));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const uid = user.uid;
  const action = body.action;

  try {
    // ───────── Dr Lô ─────────
    if (action === 'drlo_list' || action === 'drlo_save' || action === 'drlo_delete') {
      if (!(await isDrLo(uid))) return reply(403, { error: 'Réservé à Dr Lô' });
      if (action === 'drlo_list') {
        const snap = await db.collection('practices').get();
        const items = await Promise.all(snap.docs.map((d) => adminView(d.id, d.data())));
        items.sort((a, b) => b.createdAt - a.createdAt);
        return reply(200, { items });
      }
      if (action === 'drlo_delete') {
        const id = String(body.id || '');
        const dref = id ? db.collection('practices').doc(id) : null;
        const ds = dref ? await dref.get() : null;
        if (!ds || !ds.exists) return reply(404, { error: 'Pratique introuvable' });
        const dp = ds.data();
        const unlocked = Number(dp.stats && dp.stats.unlocks) || 0;
        const anyUnlock = unlocked > 0 || !(await db.collection('practiceUnlocks').where('practiceId', '==', id).limit(1).get()).empty;
        if (anyUnlock) return reply(409, { error: 'Des personnes ont déjà débloqué cette pratique : elle ne peut pas être supprimée. Utilise « Retirer » pour la cacher.' });
        // Les épisodes qui la proposaient ne la proposent plus
        const posts = await db.collection('channelPosts').where('practiceIds', 'array-contains', id).get();
        for (const d of posts.docs) await d.ref.update({ practiceIds: admin.firestore.FieldValue.arrayRemove(id) });
        await dref.delete();
        if (dp.audio && dp.audio.path) await dropFile(dp.audio.path);
        return reply(200, { ok: true, removedFromPosts: posts.size });
      }
      const isNew = !body.id;
      const ref = isNew ? db.collection('practices').doc() : db.collection('practices').doc(String(body.id));
      let old = null;
      if (!isNew) { const s = await ref.get(); if (!s.exists) return reply(404, { error: 'Pratique introuvable' }); old = s.data(); }
      const v = P.validatePractice(body, { partial: !isNew });
      if (v.error) return reply(400, { error: v.error });
      const data = { ...v.data };
      if (isNew && !data.status) data.status = 'draft';
      let newAudio = null;
      if (body.audio) {
        const au = B.validateAudio(body.audio);
        if (au.error) return reply(400, { error: au.error });
        const path = `practices/${ref.id}/audio-${Date.now()}.${au.ext}`;
        try {
          await admin.storage().bucket(BUCKET).file(path).save(au.buffer, { contentType: au.mime, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
        } catch (e) {
          console.error('practice audio storage', e.code, e.message);
          return reply(502, { error: 'L\'audio n\'a pas pu être enregistré. Rien n\'a été modifié.' });
        }
        data.audio = { path, mime: au.mime, durationSec: au.durationSec };
        newAudio = path;
      } else if (body.removeAudio === true) data.audio = null;
      const final = { ...(old || {}), ...data };
      const problem = P.publishProblem(final);
      if (problem) { await dropFile(newAudio); return reply(400, { error: problem }); }
      if (isNew) await ref.set({ ...data, channelIds: [], version: 1, stats: { unlocks: 0, runs: 0, mieux: 0, pareil: 0, moins: 0, stops: 0, logs: 0, earned: 0 }, createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: uid });
      else await ref.update({ ...data, version: inc(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      if (old && old.audio && (newAudio || body.removeAudio === true)) await dropFile(old.audio.path);
      const fresh = await ref.get();
      return reply(200, { ok: true, practice: await adminView(ref.id, fresh.data()) });
    }

    // ───────── Personne connectée ─────────
    if (action === 'list') {
      const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))].slice(0, 20);
      if (!ids.length) return reply(200, { items: [] });
      const snaps = await db.getAll(...ids.map((i) => db.collection('practices').doc(i)));
      const live = snaps.filter((s) => s.exists && s.data().status === 'published');
      const unl = live.length ? await db.getAll(...live.map((s) => db.collection('practiceUnlocks').doc(unlockId(uid, s.id)))) : [];
      const items = await Promise.all(live.map(async (s, i) => {
        const p = s.data();
        const free = P.isFreeFor(p, await memberOf(uid, p.channelIds));
        return { ...P.publicPractice(s.id, p, { unlocked: false, free }), unlocked: unl[i].exists };
      }));
      return reply(200, { items });
    }

    const id = String(body.id || '');
    if (!id) return reply(400, { error: 'Pratique manquante' });
    const ref = db.collection('practices').doc(id);
    const s = await ref.get();
    if (!s.exists || s.data().status !== 'published') return reply(404, { error: 'Cette pratique n\'est pas disponible.' });
    const p = s.data();
    const uRef = db.collection('practiceUnlocks').doc(unlockId(uid, id));
    const u = await uRef.get();

    if (action === 'get') {
      const free = P.isFreeFor(p, await memberOf(uid, p.channelIds));
      const view = P.publicPractice(id, p, { unlocked: u.exists, free });
      let logs = [];
      if (u.exists) {
        if (p.audio) view.audioUrl = await signedUrl(p.audio.path);
        if (p.type === 'carnet') {
          const ls = await db.collection('practiceLogs').where('uid', '==', uid).where('practiceId', '==', id).get();
          logs = ls.docs.map((d) => ({ day: d.data().day, values: d.data().values || {} })).sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 28);
        }
      }
      return reply(200, { practice: view, logs });
    }

    if (action === 'unlock') {
      if (u.exists) return reply(200, { ok: true, paid: 0, already: true });
      const free = P.isFreeFor(p, await memberOf(uid, p.channelIds));
      const price = free ? 0 : Number(p.price) || 0;
      let holdId = null;
      if (price > 0) {
        const res = await reserveKoris(uid, 'practice', price, { practiceId: id });
        if (res.error) return reply(402, { error: 'Pas assez d\'étincelles', required: price });
        holdId = res.holdId;
      }
      try {
        await db.runTransaction(async (tx) => {
          const cur = await tx.get(uRef);
          if (cur.exists) throw new Error('ALREADY');
          tx.set(uRef, { uid, practiceId: id, paid: price, at: admin.firestore.FieldValue.serverTimestamp() });
          tx.update(ref, { 'stats.unlocks': inc(1), 'stats.earned': inc(price) });
        });
      } catch (e) {
        await releaseKoris(holdId);
        if (e.message === 'ALREADY') return reply(200, { ok: true, paid: 0, already: true });
        throw e;
      }
      await commitKoris(holdId);
      return reply(200, { ok: true, paid: price });
    }

    if (!u.exists) return reply(403, { error: 'Débloque d\'abord cette pratique.' });

    if (action === 'finish') {
      if (!P.FEELINGS.includes(body.feeling)) return reply(400, { error: 'Ressenti inconnu' });
      await db.collection('practiceRuns').add({ uid, practiceId: id, feeling: body.feeling, at: admin.firestore.FieldValue.serverTimestamp() });
      await ref.update({ 'stats.runs': inc(1), [`stats.${body.feeling}`]: inc(1) });
      return reply(200, { ok: true });
    }
    if (action === 'stop') {
      await db.collection('practiceRuns').add({ uid, practiceId: id, stoppedUnwell: true, at: admin.firestore.FieldValue.serverTimestamp() });
      await ref.update({ 'stats.stops': inc(1) });
      return reply(200, { ok: true });
    }
    if (action === 'log') {
      if (p.type !== 'carnet') return reply(400, { error: 'Cette pratique n\'est pas un carnet.' });
      if (!P.validDay(body.day)) return reply(400, { error: 'Jour invalide (aujourd\'hui ou les 7 derniers jours).' });
      const v = P.validateLog(p.fields, body.values);
      if (v.error) return reply(400, { error: v.error });
      const lRef = db.collection('practiceLogs').doc(logId(uid, id, body.day));
      const existed = (await lRef.get()).exists;
      await lRef.set({ uid, practiceId: id, day: body.day, values: v.values, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      if (!existed) await ref.update({ 'stats.logs': inc(1) });
      return reply(200, { ok: true, values: v.values });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('practices', action, e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

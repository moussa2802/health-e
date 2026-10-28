/**
 * drlo-channel-posts — les publications des Chaînes de Dr Lô. POST { action, ... } avec le jeton Firebase.
 *
 * Espace Dr Lô (staff/{uid}.drlo === true) :
 *   post_create { channelId, text?, audio?, preview?, commentsOpen?, notify? } → publie (texte et/ou vocal ≤ 3 min, MP3) ; notify (défaut oui) = prévenir les membres
 *   post_list   { channelId }                → les publications avec leurs chiffres et le lien d'écoute
 *   post_update { id, text?, preview?, commentsOpen? }
 *   post_delete { id }                       → supprime la publication, le vocal et les vues
 *   audience    { channelId, postId?, kind: 'all'|'seen'|'listened'|'unseen', after?, q? }
 *               → prénoms des membres (jamais de résultats de tests), paginés, avec recherche
 * Personne connectée :
 *   feed   { channelId }          → le fil : accessible si membre ou « aperçu » ; sinon la publication est verrouillée (rien du contenu)
 *   seen   { channelId, ids[] }   → marque des publications comme vues (membres)
 *   listen { id }                 → compte l'écoute (membres, une fois)
 *   react  { id, reaction }       → ❤️ 🙏 💪 (membres ; reaction null = retirer)
 * Le lien d'écoute d'un vocal (valable 2 h) n'est jamais donné à quelqu'un qui n'a pas accès à la publication.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const B = require('./_drloBroadcast');
const { deliverPostPush } = require('./_channelPush');
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);
const inc = (n) => admin.firestore.FieldValue.increment(n);
const MAX_POST_TEXT = 4000;
const FEED_LIMIT = 50;
const vid = (pid, uid) => `${pid}_${uid}`;
const mid = (cid, uid) => `${cid}_${uid}`;

async function isDrLo(uid) {
  const s = await db.collection('staff').doc(uid).get();
  return s.exists && s.data().drlo === true;
}
async function signedUrl(path) {
  if (!path) return null;
  try {
    const [u] = await admin.storage().bucket(BUCKET).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 });
    return u;
  } catch (e) { console.error('channel audio url', e.message); return null; }
}
const dropFile = (path) => (path ? admin.storage().bucket(BUCKET).file(path).delete().catch(() => {}) : Promise.resolve());
const cleanText = (t) => String(t ?? '').replace(/\r/g, '').trim();
const counts = (p) => { const r = (p.stats && p.stats.reactions) || {}; return { heart: r.heart || 0, pray: r.pray || 0, strong: r.strong || 0 }; };

/** Une publication telle que la voit Dr Lô. */
const adminPost = async (id, p) => ({
  id, channelId: p.channelId, text: p.text || '', hasAudio: !!p.audio, audioSec: p.audio ? Number(p.audio.durationSec) || 0 : 0,
  audioUrl: p.audio ? await signedUrl(p.audio.path) : null, preview: !!p.preview, commentsOpen: p.commentsOpen !== false,
  createdAt: ms(p.createdAt), stats: { views: (p.stats && p.stats.views) || 0, listens: (p.stats && p.stats.listens) || 0, reactions: counts(p), comments: (p.stats && p.stats.comments) || 0 },
});

/** Une publication telle que la voit une personne : verrouillée = aucun contenu, aucun lien. */
async function userPost(id, p, { member, view }) {
  const open = member || !!p.preview;
  const base = {
    id, at: ms(p.createdAt), preview: !!p.preview, locked: !open, hasAudio: !!p.audio, audioSec: p.audio ? Number(p.audio.durationSec) || 0 : 0,
    commentsOpen: p.commentsOpen !== false, counts: counts(p), comments: (p.stats && p.stats.comments) || 0,
    mine: (view && view.reaction) || null, seen: !!(view && view.seenAt),
  };
  if (!open) return base;
  return { ...base, text: p.text || '', audioUrl: p.audio ? await signedUrl(p.audio.path) : null };
}

/** Parcourt les membres d'une chaîne (500 par page, jusqu'à 80 résultats) et renvoie leurs prénoms. */
async function scanMembers({ channelId, postId, kind, after, q }) {
  const found = [];
  let last = after ? await db.collection('channelMembers').doc(String(after)).get() : null;
  let exhausted = false;
  const needle = String(q || '').trim().toLowerCase();
  for (let round = 0; round < 4 && found.length < 80 && !exhausted; round++) {
    let query = db.collection('channelMembers').where('channelId', '==', channelId).orderBy(admin.firestore.FieldPath.documentId()).limit(500);
    if (last && last.exists) query = query.startAfter(last);
    const page = await query.get();
    if (page.empty) { exhausted = true; break; }
    last = page.docs[page.docs.length - 1];
    if (page.size < 500) exhausted = true;
    const mems = page.docs.map((d) => d.data());
    let views = {};
    if (postId && kind !== 'all') {
      const snaps = await db.getAll(...mems.map((m) => db.collection('channelPostViews').doc(vid(postId, m.uid))));
      views = Object.fromEntries(snaps.map((s) => [s.id, s.exists ? s.data() : null]));
    }
    const names = {};
    const snaps = await db.getAll(...mems.map((m) => db.collection('userProfiles').doc(m.uid)), { fieldMask: ['onboardingProfile.prenom'] });
    snaps.forEach((s) => { names[s.id] = (s.exists && s.data().onboardingProfile && s.data().onboardingProfile.prenom) || ''; });
    for (const m of mems) {
      const v = views[vid(postId, m.uid)];
      let ok = true; let at = ms(m.joinedAt);
      if (kind === 'seen') { ok = !!(v && v.seenAt); at = v ? Number(v.seenAt) || 0 : 0; }
      else if (kind === 'listened') { ok = !!(v && v.listenedAt); at = v ? Number(v.listenedAt) || 0 : 0; }
      else if (kind === 'unseen') ok = !(v && v.seenAt);
      if (!ok) continue;
      const name = String(names[m.uid] || '').slice(0, 30);
      if (needle && !name.toLowerCase().includes(needle)) continue;
      found.push({ name: name || 'Sans prénom', at });
    }
  }
  found.sort((a, b) => b.at - a.at || a.name.localeCompare(b.name));
  return { items: found, next: exhausted ? null : last.id };
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
    if (['post_create', 'post_list', 'post_update', 'post_delete', 'audience'].includes(action)) {
      if (!(await isDrLo(uid))) return reply(403, { error: 'Réservé à Dr Lô' });

      if (action === 'post_create') {
        const channelId = String(body.channelId || '');
        const cs = channelId ? await db.collection('channels').doc(channelId).get() : null;
        if (!cs || !cs.exists) return reply(404, { error: 'Chaîne introuvable' });
        if (cs.data().status !== 'active') return reply(409, { error: 'Cette chaîne est archivée : réactive-la pour publier.' });
        const text = cleanText(body.text);
        if (text.length > MAX_POST_TEXT) return reply(400, { error: `Le texte est trop long (${MAX_POST_TEXT} caractères au plus).` });
        if (!body.audio && text.length < 2) return reply(400, { error: 'Écris un texte ou enregistre un vocal.' });
        const ref = db.collection('channelPosts').doc();
        let audio = null;
        if (body.audio) {
          const au = B.validateAudio(body.audio);
          if (au.error) return reply(400, { error: au.error });
          const path = `channels/${channelId}/posts/${ref.id}.${au.ext}`;
          try {
            await admin.storage().bucket(BUCKET).file(path).save(au.buffer, { contentType: au.mime, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
          } catch (e) {
            console.error('channel post vocal storage', BUCKET, e.code, e.message);
            return reply(502, { error: 'Le vocal n\'a pas pu être enregistré (stockage indisponible ou non autorisé). Rien n\'a été publié.' });
          }
          audio = { path, mime: au.mime, durationSec: au.durationSec };
        }
        await ref.set({
          channelId, text, ...(audio ? { audio } : {}), preview: body.preview === true, commentsOpen: body.commentsOpen !== false, status: 'published', pushDone: body.notify === false, pushCursor: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: uid,
          stats: { views: 0, listens: 0, comments: 0, reactions: { heart: 0, pray: 0, strong: 0 } },
        });
        if (body.notify !== false) await deliverPostPush(ref.id, 6000).catch((e) => console.warn('channel push', e.message)); // le reste partira avec la tâche planifiée
        const fresh = await ref.get();
        return reply(200, { ok: true, post: await adminPost(ref.id, fresh.data()) });
      }

      if (action === 'post_list') {
        const channelId = String(body.channelId || '');
        if (!channelId) return reply(400, { error: 'Chaîne manquante' });
        const snap = await db.collection('channelPosts').where('channelId', '==', channelId).get();
        const items = await Promise.all(snap.docs.map((d) => adminPost(d.id, d.data())));
        items.sort((a, b) => b.createdAt - a.createdAt);
        return reply(200, { items: items.slice(0, 100) });
      }

      if (action === 'post_update' || action === 'post_delete') {
        const id = String(body.id || '');
        const ref = id ? db.collection('channelPosts').doc(id) : null;
        const s = ref ? await ref.get() : null;
        if (!s || !s.exists) return reply(404, { error: 'Publication introuvable' });
        const p = s.data();
        if (action === 'post_delete') {
          await ref.delete();
          await dropFile(p.audio && p.audio.path);
          for (let i = 0; i < 20; i++) { // les commentaires de cette publication
            const cm = await db.collection('channelComments').where('postId', '==', id).limit(400).get();
            if (cm.empty) break;
            const batch = db.batch();
            cm.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            await Promise.all(cm.docs.map((d) => admin.storage().bucket(BUCKET).deleteFiles({ prefix: `channels/${p.channelId}/comments/${d.id}-` }).catch(() => {}))); // vocaux de réponses de ces commentaires
            if (cm.size < 400) break;
          }
          for (let i = 0; i < 20; i++) { // les vues et réactions de cette publication
            const v = await db.collection('channelPostViews').where('postId', '==', id).limit(400).get();
            if (v.empty) break;
            const batch = db.batch();
            v.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            if (v.size < 400) break;
          }
          return reply(200, { ok: true });
        }
        const upd = {};
        if (body.text !== undefined) {
          const t = cleanText(body.text);
          if (t.length > MAX_POST_TEXT) return reply(400, { error: `Le texte est trop long (${MAX_POST_TEXT} caractères au plus).` });
          if (!p.audio && t.length < 2) return reply(400, { error: 'Une publication sans vocal doit garder un texte.' });
          upd.text = t; upd.editedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        if (body.preview !== undefined) upd.preview = body.preview === true;
        if (body.commentsOpen !== undefined) upd.commentsOpen = body.commentsOpen !== false;
        if (!Object.keys(upd).length) return reply(400, { error: 'Rien à modifier.' });
        await ref.update(upd);
        const fresh = await ref.get();
        return reply(200, { ok: true, post: await adminPost(id, fresh.data()) });
      }

      // audience : prénoms des membres, jamais de résultats
      const channelId = String(body.channelId || '');
      if (!channelId) return reply(400, { error: 'Chaîne manquante' });
      const kind = ['all', 'seen', 'listened', 'unseen'].includes(body.kind) ? body.kind : 'all';
      const postId = body.postId ? String(body.postId) : '';
      if (kind !== 'all' && !postId) return reply(400, { error: 'Publication manquante' });
      const r = await scanMembers({ channelId, postId, kind, after: body.after, q: body.q });
      return reply(200, r);
    }

    // ───────── Personne connectée ─────────
    const needChannel = async (channelId) => {
      const [cs, ms_] = await Promise.all([db.collection('channels').doc(channelId).get(), db.collection('channelMembers').doc(mid(channelId, uid)).get()]);
      if (!cs.exists) return { error: reply(404, { error: 'Chaîne introuvable' }) };
      const member = ms_.exists;
      if (cs.data().status === 'archived' && !member) return { error: reply(404, { error: 'Chaîne introuvable' }) };
      return { c: cs.data(), member };
    };

    if (action === 'feed') {
      const channelId = String(body.channelId || '');
      if (!channelId) return reply(400, { error: 'Chaîne manquante' });
      const ch = await needChannel(channelId);
      if (ch.error) return ch.error;
      const snap = await db.collection('channelPosts').where('channelId', '==', channelId).get();
      const docs = snap.docs.filter((d) => d.data().status === 'published').sort((a, b) => ms(b.data().createdAt) - ms(a.data().createdAt)).slice(0, FEED_LIMIT);
      let views = {};
      if (ch.member && docs.length) {
        const vs = await db.getAll(...docs.map((d) => db.collection('channelPostViews').doc(vid(d.id, uid))));
        views = Object.fromEntries(vs.map((v) => [v.id, v.exists ? v.data() : null]));
      }
      const posts = await Promise.all(docs.map((d) => userPost(d.id, d.data(), { member: ch.member, view: views[vid(d.id, uid)] })));
      if (ch.member) await db.collection('channelMembers').doc(mid(channelId, uid)).update({ feedSeenAt: Date.now() }).catch(() => {}); // remet à zéro la pastille « nouvelles publications »
      return reply(200, { member: ch.member, posts });
    }

    if (action === 'seen') {
      const channelId = String(body.channelId || '');
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, 20);
      const ch = await needChannel(channelId);
      if (ch.error) return ch.error;
      if (!ch.member) return reply(200, { ok: true });
      for (const id of ids) {
        const pRef = db.collection('channelPosts').doc(id);
        const vRef = db.collection('channelPostViews').doc(vid(id, uid));
        const [ps, vs] = await Promise.all([pRef.get(), vRef.get()]);
        if (!ps.exists || ps.data().channelId !== channelId || (vs.exists && vs.data().seenAt)) continue;
        await vRef.set({ postId: id, channelId, uid, seenAt: Date.now() }, { merge: true });
        await pRef.update({ 'stats.views': inc(1) }).catch(() => {});
      }
      return reply(200, { ok: true });
    }

    if (action === 'listen' || action === 'react') {
      const id = String(body.id || '');
      const pRef = id ? db.collection('channelPosts').doc(id) : null;
      const ps = pRef ? await pRef.get() : null;
      if (!ps || !ps.exists || ps.data().status !== 'published') return reply(404, { error: 'Publication introuvable' });
      const p = ps.data();
      const ch = await needChannel(p.channelId);
      if (ch.error) return ch.error;
      if (!ch.member) return reply(action === 'listen' ? 200 : 403, action === 'listen' ? { ok: true } : { error: 'Rejoins la chaîne pour réagir.' });
      const vRef = db.collection('channelPostViews').doc(vid(id, uid));
      const v = (await vRef.get());
      const cur = v.exists ? v.data() : {};
      if (action === 'listen') {
        if (!p.audio || cur.listenedAt) return reply(200, { ok: true });
        await vRef.set({ postId: id, channelId: p.channelId, uid, listenedAt: Date.now(), ...(cur.seenAt ? {} : { seenAt: Date.now() }) }, { merge: true });
        const upd = { 'stats.listens': inc(1) };
        if (!cur.seenAt) upd['stats.views'] = inc(1);
        await pRef.update(upd).catch(() => {});
        return reply(200, { ok: true });
      }
      const next = B.cleanReaction(body.reaction);
      if (body.reaction !== null && body.reaction !== undefined && next === null) return reply(400, { error: 'Réaction inconnue' });
      const prev = cur.reaction || null;
      if (prev !== next) {
        const upd = {};
        if (prev) upd[`stats.reactions.${prev}`] = inc(-1);
        if (next) upd[`stats.reactions.${next}`] = inc(1);
        await Promise.all([vRef.set({ postId: id, channelId: p.channelId, uid, reaction: next }, { merge: true }), pRef.update(upd)]);
      }
      const fresh = await pRef.get();
      return reply(200, { ok: true, reaction: next, counts: counts(fresh.data()) });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('drlo-channel-posts', action, e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

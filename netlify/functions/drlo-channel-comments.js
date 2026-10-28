/**
 * drlo-channel-comments — commentaires sous les publications des Chaînes. POST { action, ... } avec le jeton Firebase.
 * Mêmes règles que sous les messages de Dr Lô (voir _drloComments.js) : identité au choix (prénom par défaut), ni numéro, ni lien,
 * ni insulte ; un mot de détresse n'est JAMAIS publié (message privé de soutien, 1515 et CHU Fann) ; 3 commentaires par personne
 * et par publication ; la discussion continue à tour de rôle jusqu'à la clôture par Dr Lô. Réservé aux membres de la chaîne.
 *
 * Espace Dr Lô :
 *   comments_list  { postId }                          → tous les commentaires (détresse = signal sans identité)
 *   comment_hide   { commentId, hidden } · comment_pin { commentId, pinned } · comment_close { commentId, closed }
 *   comment_reply  { commentId, text?, audio? }        → répondre (texte et/ou vocal)
 *   comment_edit   { commentId, index, text?, audio?, removeAudio? }
 * Membre :
 *   comments         { postId }                        → les commentaires visibles (et remet les compteurs « nouveau » à zéro)
 *   comment_add      { postId, text, mode, pseudo? }
 *   comment_report   { commentId } · comment_delete { commentId }
 *   comment_followup { commentId, text }
 */
const { admin, db, verifyAuth } = require('./_firebase');
const B = require('./_drloBroadcast');
const C = require('./_drloComments');
const { sendToUser } = require('./_push');
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);
const inc = (n) => admin.firestore.FieldValue.increment(n);
const vid = (pid, uid) => `${pid}_${uid}`;

async function isDrLo(uid) {
  const s = await db.collection('staff').doc(uid).get();
  return s.exists && s.data().drlo === true;
}
async function signedUrl(path) {
  if (!path) return null;
  try {
    const [u] = await admin.storage().bucket(BUCKET).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 });
    return u;
  } catch (e) { console.error('channel comment audio url', e.message); return null; }
}
const dropFile = (path) => (path ? admin.storage().bucket(BUCKET).file(path).delete().catch(() => {}) : Promise.resolve());

/** Enregistre le vocal d'une réponse AVANT de modifier la discussion. { audio } ou { error, status }. */
async function saveReplyAudio(channelId, commentId, raw) {
  const au = B.validateAudio(raw);
  if (au.error) return { error: au.error, status: 400 };
  const path = `channels/${channelId}/comments/${commentId}-${Date.now()}.${au.ext}`;
  try {
    await admin.storage().bucket(BUCKET).file(path).save(au.buffer, { contentType: au.mime, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
  } catch (e) {
    console.error('channel comment reply vocal storage', BUCKET, e.code, e.message);
    return { error: 'Le vocal n\'a pas pu être enregistré (stockage indisponible ou non autorisé). Rien n\'a été envoyé.', status: 502 };
  }
  return { audio: { path, mime: au.mime, durationSec: au.durationSec } };
}

const adminComment = async (id, c) => ({
  id, name: c.status === 'distress' ? 'Anonyme' : (c.name || 'Anonyme'), text: c.text, status: c.status, hidden: !!c.hidden, pinned: !!c.pinned,
  reports: Number(c.reports) || 0, closed: !!c.closed, createdAt: ms(c.createdAt), lastUserAt: Number(c.lastUserAt) || 0,
  thread: await Promise.all(C.threadOf(c).map(async (e, index) => ({
    index, from: e.from, text: e.text || '', at: Number(e.at) || 0, editedAt: Number(e.editedAt) || null,
    audioSec: e.audio ? Number(e.audio.durationSec) || 0 : 0, audioUrl: e.audio && e.audio.path ? await signedUrl(e.audio.path) : null,
  }))),
});

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
    if (['comments_list', 'comment_hide', 'comment_pin', 'comment_close', 'comment_reply', 'comment_edit'].includes(action)) {
      if (!(await isDrLo(uid))) return reply(403, { error: 'Réservé à Dr Lô' });

      if (action === 'comments_list') {
        const s = await db.collection('channelComments').where('postId', '==', String(body.postId || '')).get();
        const items = (await Promise.all(s.docs.slice(0, 300).map((d) => adminComment(d.id, d.data())))).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
        return reply(200, { items });
      }

      const ref = db.collection('channelComments').doc(String(body.commentId || 'x'));
      const snap = await ref.get();
      if (!snap.exists) return reply(404, { error: 'Commentaire introuvable' });
      const c = snap.data();

      if (action === 'comment_hide') { await ref.update({ hidden: body.hidden !== false }); return reply(200, { ok: true }); }
      if (action === 'comment_pin') { await ref.update({ pinned: body.pinned !== false }); return reply(200, { ok: true }); }
      if (action === 'comment_close') { await ref.update({ closed: body.closed !== false }); return reply(200, { ok: true }); }

      if (c.status !== 'public') return reply(400, { error: 'Ce commentaire n\'est pas public.' });
      const thread = C.threadOf(c).map((e) => ({ ...e }));
      const editing = action === 'comment_edit';
      const idx = Number(body.index);
      const target = editing ? thread[idx] : null;
      if (editing && (!target || target.from !== 'drlo')) return reply(400, { error: 'Cette réponse est introuvable.' });
      if (!editing && c.closed) return reply(409, { error: 'Cette discussion est clôturée. Rouvre-la pour répondre.' });
      if (!editing && thread.length >= C.MAX_THREAD) return reply(400, { error: 'Cette discussion est déjà très longue.' });
      const keepsAudio = editing && !!target.audio && !body.audio && body.removeAudio !== true;
      const v = C.validateEntry(body.text, !!body.audio || keepsAudio);
      if (v.error) return reply(400, { error: v.error });
      let newAudio = null;
      if (body.audio) {
        const sv = await saveReplyAudio(c.channelId, snap.id, body.audio);
        if (sv.error) return reply(sv.status, { error: sv.error });
        newAudio = sv.audio;
      }
      const now = Date.now();
      let oldPath = null;
      if (editing) {
        if (newAudio || body.removeAudio === true) oldPath = target.audio && target.audio.path;
        const next = { ...target, text: v.text, editedAt: now };
        if (newAudio) next.audio = newAudio; else if (body.removeAudio === true) delete next.audio;
        thread[idx] = next;
      } else {
        thread.push({ from: 'drlo', text: v.text, at: now, ...(newAudio ? { audio: newAudio } : {}) });
      }
      await ref.update({ thread });
      await dropFile(oldPath);
      if (!editing) { // notification neutre : jamais le texte de la réponse
        const chs = await db.collection('channels').doc(c.channelId).get().catch(() => null);
        const nm = String((chs && chs.exists && chs.data().name) || 'la chaîne').slice(0, 60);
        await sendToUser(c.uid, { kind: 'broadcast', title: 'Dr Lô', body: `Dr Lô t'a répondu dans ${nm}.`, inboxTitle: `Dr Lô t'a répondu dans ${nm}`, inboxBody: 'Ouvre la chaîne pour lire sa réponse.', link: `/chaines/${c.channelId}` }).catch(() => {});
      }
      return reply(200, { ok: true });
    }

    // ───────── Membre ─────────
    const commentRef = ['comment_report', 'comment_delete', 'comment_followup'].includes(action) ? db.collection('channelComments').doc(String(body.commentId || 'x')) : null;
    let own = null;
    if (commentRef) {
      const cs = await commentRef.get();
      if (!cs.exists) return reply(404, { error: 'Commentaire introuvable' });
      own = cs.data();
    }
    const postId = commentRef ? own.postId : String(body.postId || '');
    if (!postId) return reply(400, { error: 'Publication manquante' });
    const pRef = db.collection('channelPosts').doc(postId);
    const pSnap = await pRef.get();
    if (!pSnap.exists || pSnap.data().status !== 'published') return reply(404, { error: 'Publication introuvable' });
    const post = pSnap.data();
    const [chSnap, memSnap] = await Promise.all([db.collection('channels').doc(post.channelId).get(), db.collection('channelMembers').doc(`${post.channelId}_${uid}`).get()]);
    if (!chSnap.exists || !memSnap.exists) return reply(403, { error: 'Rejoins la chaîne pour participer.' });
    const viewRef = db.collection('channelPostViews').doc(vid(postId, uid));

    if (action === 'comment_delete') {
      if (own.uid !== uid) return reply(403, { error: 'Ce n\'est pas ton commentaire.' });
      await commentRef.delete();
      await admin.storage().bucket(BUCKET).deleteFiles({ prefix: `channels/${post.channelId}/comments/${commentRef.id}-` }).catch(() => {});
      if (own.status === 'public') await pRef.update({ 'stats.comments': inc(-1) }).catch(() => {});
      return reply(200, { ok: true });
    }

    if (action === 'comment_report') {
      if (own.uid === uid) return reply(400, { error: 'C\'est ton propre commentaire.' });
      const by = Array.isArray(own.reportedBy) ? own.reportedBy : [];
      if (!by.includes(uid)) await commentRef.update({ reportedBy: [...by, uid], reports: by.length + 1 });
      return reply(200, { ok: true });
    }

    if (action === 'comment_followup') {
      if (own.uid !== uid) return reply(403, { error: 'Ce n\'est pas ton commentaire.' });
      if (own.status !== 'public' || own.hidden) return reply(404, { error: 'Commentaire introuvable' });
      const v = C.validateComment(body.text);
      if (v.error) return reply(400, { error: v.error });
      const mod = C.moderate(v.text);
      if (!mod.ok && mod.reason === 'crisis') {
        await db.collection('channelComments').add({ postId, channelId: post.channelId, uid, name: own.name || 'Anonyme', text: v.text, status: 'distress', hidden: true, reports: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        await sendToUser(uid, C.CRISIS_NOTIF).catch(() => {});
        return reply(200, { ok: true, published: false, support: true });
      }
      if (!mod.ok) return reply(400, { error: C.REASON_TEXT[mod.reason] || 'Message non accepté.' });
      const now = Date.now();
      const result = await db.runTransaction(async (tx) => {
        const fresh = (await tx.get(commentRef)).data();
        const can = C.userCanFollowUp(fresh);
        if (!can.ok) return can;
        tx.update(commentRef, { thread: [...C.threadOf(fresh), { from: 'user', text: v.text, at: now }], lastUserAt: now });
        return { ok: true };
      });
      if (!result.ok) return reply(400, { error: result.error });
      return reply(200, { ok: true, published: true });
    }

    const all = await db.collection('channelComments').where('postId', '==', postId).get();
    const rows = all.docs.slice(0, 300).map((d) => ({ id: d.id, ...d.data(), createdAt: ms(d.data().createdAt) }));

    if (action === 'comments') {
      const vs = await viewRef.get();
      const seenBefore = Number(vs.exists && vs.data().repliesSeenAt) || 0;
      const shown = C.sortComments(rows.filter((c) => C.visible(c) || (c.uid === uid && c.status === 'public' && !c.hidden))).slice(0, 80);
      const items = await Promise.all(shown.map(async (c) => {
        const entries = await Promise.all(C.threadOf(c).map(async (e) => ({ ...C.presentEntry(e, seenBefore), audioUrl: e.audio && e.audio.path ? await signedUrl(e.audio.path) : null })));
        const mine = c.uid === uid;
        return { id: c.id, name: c.name, text: c.text, at: c.createdAt, mine, pinned: !!c.pinned, thread: entries, closed: !!c.closed, canReply: mine && C.userCanFollowUp(c).ok };
      }));
      await viewRef.set({ postId, channelId: post.channelId, uid, repliesSeenAt: Date.now(), commentsSeen: Math.max(0, Number(post.stats && post.stats.comments) || 0) }, { merge: true }).catch(() => {});
      return reply(200, { open: post.commentsOpen !== false, items });
    }

    // comment_add
    if (post.commentsOpen === false) return reply(400, { error: 'Les commentaires sont fermés pour cette publication.' });
    if (rows.filter((c) => c.uid === uid).length >= C.PER_MESSAGE_LIMIT) return reply(400, { error: `Tu as déjà laissé ${C.PER_MESSAGE_LIMIT} commentaires ici. Merci !` });
    const v = C.validateComment(body.text);
    if (v.error) return reply(400, { error: v.error });
    const mod = C.moderate(v.text);
    let prenom = '';
    if (body.mode === 'prenom') {
      const up = await db.collection('userProfiles').doc(uid).get().catch(() => null);
      prenom = (up && up.exists && up.data().onboardingProfile && up.data().onboardingProfile.prenom) || '';
    }
    const idt = C.resolveIdentity(body.mode, { prenom, pseudo: body.pseudo });
    if (idt.error) return reply(400, { error: idt.error });
    if (!mod.ok && mod.reason === 'crisis') {
      await db.collection('channelComments').add({ postId, channelId: post.channelId, uid, name: idt.name, text: v.text, status: 'distress', hidden: true, reports: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      await sendToUser(uid, C.CRISIS_NOTIF).catch(() => {});
      return reply(200, { ok: true, published: false, support: true });
    }
    if (!mod.ok) return reply(400, { error: C.REASON_TEXT[mod.reason] || 'Commentaire non accepté.' });
    const ref = await db.collection('channelComments').add({ postId, channelId: post.channelId, uid, name: idt.name, mode: idt.mode, text: v.text, status: 'public', hidden: false, pinned: false, reports: 0, reportedBy: [], createdAt: admin.firestore.FieldValue.serverTimestamp() });
    await pRef.update({ 'stats.comments': inc(1) }).catch(() => {});
    await viewRef.set({ postId, channelId: post.channelId, uid, commentsSeen: inc(1) }, { merge: true }).catch(() => {});
    return reply(200, { ok: true, published: true, id: ref.id });
  } catch (e) {
    console.error('drlo-channel-comments', action, e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

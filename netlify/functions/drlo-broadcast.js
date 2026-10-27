/**
 * drlo-broadcast — « Ma communauté » : les messages de Dr Lô à ses abonnés.
 * POST { action, ... } avec le jeton Firebase. Tout passe par le serveur (aucune règle Firestore à déployer).
 *
 * Espace Dr Lô (rôle staff/{uid}.drlo === true) :
 *   drlo_count   { audience }                     → nombre de personnes visées (jamais les noms)
 *   drlo_create  { text, audience, sendAt? }      → envoie maintenant, ou programme (sendAt = ms)
 *   drlo_list                                     → les derniers messages et leurs chiffres
 *   drlo_hide    { id, hidden }                   → masquer / réafficher un message chez les destinataires
 *   drlo_comment_reply { commentId, text?, audio? } → répondre (texte et/ou vocal) ; la discussion continue
 *   drlo_comment_edit  { commentId, index, text?, audio?, removeAudio? } → modifier une de ses réponses (la personne voit « mis à jour »)
 *   drlo_comment_close { commentId, closed }      → clôturer / rouvrir la discussion (clôturée : la personne ne peut plus écrire)
 *   drlo_delete  { id }                           → supprimer pour de bon (message, destinataires, commentaires, vocal)
 * Personne connectée :
 *   inbox                                         → mes messages de Dr Lô
 *   open         { id }                           → lire un message (marqué lu)
 *   react        { id, reaction }                 → ❤️ 🙏 💪 (reaction null = retirer)
 *   comment_followup { commentId, text }          → répondre à Dr Lô (à tour de rôle, tant que la discussion est ouverte)
 *   listen       { id }                           → compte l'écoute du vocal (une fois par personne)
 */
const { admin, db, verifyAuth } = require('./_firebase');
const B = require('./_drloBroadcast');
const S = require('./_broadcastServer');
const C = require('./_drloComments');
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';
const { sendToUser } = require('./_push');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);
const inc = (n) => admin.firestore.FieldValue.increment(n);

async function isDrLo(uid) {
  const s = await db.collection('staff').doc(uid).get();
  return s.exists && s.data().drlo === true;
}

async function signedUrl(path) {
  try {
    const [u] = await admin.storage().bucket(BUCKET).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 });
    return u;
  } catch (e) { console.error('audio url', e.message); return null; }
}
const dropFile = (path) => (path ? admin.storage().bucket(BUCKET).file(path).delete().catch(() => {}) : Promise.resolve());

/** Enregistre le vocal d'une réponse AVANT de modifier la discussion. { audio } ou { error, status }. */
async function saveReplyAudio(bid, cid, raw) {
  const au = B.validateAudio(raw);
  if (au.error) return { error: au.error, status: 400 };
  const path = `broadcasts/${bid}/comments/${cid}-${Date.now()}.${au.ext}`;
  try {
    await admin.storage().bucket(BUCKET).file(path).save(au.buffer, { contentType: au.mime, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
  } catch (e) {
    console.error('drlo-broadcast reply vocal storage', BUCKET, e.code, e.message);
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

const publicMessage = (id, b, r) => ({
  id,
  text: b.text,
  at: ms(b.sentAt) || ms(b.createdAt),
  seen: !!(r && r.seenAt),
  reaction: (r && r.reaction) || null,
  commentsOpen: !!b.commentsOpen,
  audio: b.audio ? { durationSec: b.audio.durationSec } : null,
  muted: !!(r && r.muted),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!db) return reply(503, { error: 'unavailable' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const uid = user.uid;
  const action = String(body.action || '');

  try {
    // ── Espace Dr Lô ──
    if (action.startsWith('drlo_')) {
      if (!(await isDrLo(uid))) return reply(403, { error: 'Accès réservé à Dr Lô' });

      if (action === 'drlo_count' || action === 'drlo_create') {
        const a = B.sanitizeAudience(body.audience);
        if (a.error) return reply(400, { error: a.error });
        if (action === 'drlo_count') {
          const uids = await S.resolveAudience(a.audience);
          return reply(200, { count: uids.length, minForTargeted: B.MIN_TARGETED, fine: B.isFineTargeted(a.audience) });
        }
        const hasAudio = !!body.audio;
        const t = B.validateText(body.text, { optional: hasAudio });
        if (t.error) return reply(400, { error: t.error });
        let au = null;
        if (hasAudio) { au = B.validateAudio(body.audio); if (au.error) return reply(400, { error: au.error }); }
        const sendAt = Number(body.sendAt) || 0;
        const scheduled = sendAt > Date.now() + 60000;
        if (scheduled && sendAt > Date.now() + 90 * 864e5) return reply(400, { error: 'Date trop lointaine.' });
        // On compte tout de suite : un ciblage fin trop petit est refusé (personne ne doit être reconnaissable)
        const count = (await S.resolveAudience(a.audience)).length;
        if (count === 0) return reply(400, { error: 'Personne n\'est concerné par ce ciblage.' });
        if (B.isFineTargeted(a.audience) && count < B.MIN_TARGETED) {
          return reply(400, { error: `Ce ciblage ne concerne que ${count} personne${count > 1 ? 's' : ''} : il en faut au moins ${B.MIN_TARGETED} pour que personne ne soit reconnu.` });
        }
        const ref = db.collection('broadcasts').doc();
        // Le vocal est enregistré AVANT le message : s'il échoue, rien n'est créé ni envoyé
        let audioMeta = null;
        if (au) {
          const path = `broadcasts/${ref.id}/vocal.${au.ext}`;
          try {
            await admin.storage().bucket(BUCKET).file(path).save(au.buffer, { contentType: au.mime, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
          } catch (e) {
            console.error('drlo-broadcast vocal storage', BUCKET, e.code, e.message);
            return reply(502, { error: 'Le vocal n\'a pas pu être enregistré (stockage indisponible ou non autorisé). Rien n\'a été envoyé.' });
          }
          audioMeta = { path, mime: au.mime, durationSec: au.durationSec, bytes: au.buffer.length };
        }
        await ref.set({
          kind: au ? 'audio' : 'text', text: t.text, audience: a.audience, audienceCount: count, commentsOpen: false,
          status: scheduled ? 'scheduled' : 'launching', hidden: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(), sendAt: scheduled ? sendAt : Date.now(), createdBy: uid,
          stats: { views: 0, reactions: { heart: 0, pray: 0, strong: 0 } },
          ...(audioMeta ? { audio: audioMeta } : {}),
        });
        if (scheduled) return reply(200, { ok: true, id: ref.id, status: 'scheduled', count });
        const n = await S.launch(ref.id, a.audience);
        const pending = await S.deliverPending(ref.id, 15000);
        return reply(200, { ok: true, id: ref.id, status: pending ? 'sending' : 'sent', count: n });
      }

      if (action === 'drlo_activity' || action === 'drlo_seen') {
        const stRef = db.collection('drloState').doc(uid);
        if (action === 'drlo_seen') { await stRef.set({ communitySeenAt: Date.now() }, { merge: true }); return reply(200, { ok: true }); }
        const st = await stRef.get();
        if (!st.exists || !st.data().communitySeenAt) { await stRef.set({ communitySeenAt: Date.now() }, { merge: true }); return reply(200, { community: 0, distress: 0, byBroadcast: {} }); }
        const since = Number(st.data().communitySeenAt);
        const snap = await db.collection('broadcastComments').where('createdAt', '>', new Date(since)).limit(300).get();
        const byBroadcast = {}; let community = 0; let distress = 0;
        // Nouveaux messages des personnes dans une discussion déjà ouverte
        const fu = await db.collection('broadcastComments').where('lastUserAt', '>', since).limit(300).get().catch(() => null);
        const counted = new Set(snap.docs.map((d) => d.id));
        if (fu) fu.docs.forEach((d) => {
          const c = d.data();
          if (counted.has(d.id) || c.hidden || c.status !== 'public') return;
          community += 1; byBroadcast[c.broadcastId] = (byBroadcast[c.broadcastId] || 0) + 1;
        });
        snap.docs.forEach((d) => {
          const c = d.data();
          if (c.status === 'distress') { distress += 1; community += 1; byBroadcast[c.broadcastId] = (byBroadcast[c.broadcastId] || 0) + 1; return; }
          if (c.hidden || c.status !== 'public') return;
          community += 1; byBroadcast[c.broadcastId] = (byBroadcast[c.broadcastId] || 0) + 1;
        });
        return reply(200, { community, distress, byBroadcast });
      }

      // Qui a vu / écouté / pas encore vu. Seulement pour un message envoyé à tout le monde ou à un groupe large :
      // un ciblage précis (test, totem, programme) ne montre que des totaux, pour que personne ne soit reconnu.
      if (action === 'drlo_audience') {
        const id = String(body.id || '');
        const kind = ['seen', 'listened', 'unseen'].includes(body.kind) ? body.kind : 'seen';
        if (!id) return reply(400, { error: 'Message manquant' });
        const bSnap = await db.collection('broadcasts').doc(id).get();
        if (!bSnap.exists) return reply(404, { error: 'Message introuvable' });
        const b = bSnap.data();
        if (B.isFineTargeted(b.audience || {})) return reply(200, { restricted: true, items: [], next: null });
        const match = (r) => (kind === 'seen' ? !!r.seenAt : kind === 'listened' ? !!r.listenedAt : !r.seenAt);
        const found = [];
        let last = body.after ? await db.collection('broadcastRecipients').doc(String(body.after)).get() : null;
        let exhausted = false;
        for (let round = 0; round < 4 && found.length < 80 && !exhausted; round++) {
          let q = db.collection('broadcastRecipients').where('broadcastId', '==', id).orderBy(admin.firestore.FieldPath.documentId()).limit(500);
          if (last && last.exists) q = q.startAfter(last);
          const page = await q.get();
          if (page.empty) { exhausted = true; break; }
          last = page.docs[page.docs.length - 1];
          page.docs.forEach((d) => { const r = d.data(); if (match(r)) found.push({ uid: r.uid, at: kind === 'listened' ? Number(r.listenedAt) : Number(r.seenAt) || 0 }); });
          if (page.size < 500) exhausted = true;
        }
        const snaps = found.length ? await db.getAll(...found.map((f) => db.collection('userProfiles').doc(f.uid)), { fieldMask: ['onboardingProfile.prenom'] }) : [];
        const names = Object.fromEntries(snaps.map((x) => [x.id, (x.exists && x.data().onboardingProfile && x.data().onboardingProfile.prenom) || '']));
        const items = found.map((f) => ({ name: String(names[f.uid] || '').slice(0, 30) || 'Sans prénom', at: f.at })).sort((a, b2) => b2.at - a.at || a.name.localeCompare(b2.name));
        return reply(200, { restricted: false, items, next: exhausted ? null : last.id });
      }

      if (action === 'drlo_list') {
        const s = await db.collection('broadcasts').orderBy('createdAt', 'desc').limit(50).get();
        const items = s.docs.map((d) => {
          const b = d.data();
          return {
            id: d.id, text: b.text, audience: b.audience, audienceCount: b.audienceCount || 0, status: b.status, hidden: !!b.hidden, commentsOpen: !!b.commentsOpen, audio: b.audio ? { durationSec: b.audio.durationSec } : null,
            createdAt: ms(b.createdAt), sendAt: ms(b.sendAt), stats: b.stats || { views: 0, reactions: { heart: 0, pray: 0, strong: 0 } },
          };
        });
        return reply(200, { items });
      }

      if (action === 'drlo_hide') {
        if (!body.id) return reply(400, { error: 'Message manquant' });
        await db.collection('broadcasts').doc(String(body.id)).update({ hidden: body.hidden !== false });
        return reply(200, { ok: true });
      }

      if (action === 'drlo_delete') {
        const id = String(body.id || '');
        if (!id) return reply(400, { error: 'Message manquant' });
        const bRef = db.collection('broadcasts').doc(id);
        const bSnap = await bRef.get();
        if (!bSnap.exists) return reply(200, { ok: true });
        const b = bSnap.data();
        if (b.status === 'sending') return reply(409, { error: 'Ce message est en cours d\'envoi. Réessaie dans une minute.' });
        const purge = async (col) => {
          for (;;) {
            const snap = await db.collection(col).where('broadcastId', '==', id).limit(400).get();
            if (snap.empty) break;
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            if (snap.size < 400) break;
          }
        };
        await admin.storage().bucket(BUCKET).deleteFiles({ prefix: `broadcasts/${id}/` }).catch(() => {});
        await purge('broadcastComments');
        await purge('broadcastRecipients');
        await bRef.delete();
        return reply(200, { ok: true });
      }

      if (action === 'drlo_comments_open') {
        if (!body.id) return reply(400, { error: 'Message manquant' });
        await db.collection('broadcasts').doc(String(body.id)).update({ commentsOpen: body.open === true });
        return reply(200, { ok: true });
      }
      if (action === 'drlo_comments') {
        const s = await db.collection('broadcastComments').where('broadcastId', '==', String(body.id || '')).limit(300).get();
        const items = (await Promise.all(s.docs.map((d) => adminComment(d.id, d.data())))).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
        return reply(200, { items });
      }
      if (['drlo_comment_hide', 'drlo_comment_pin', 'drlo_comment_close'].includes(action)) {
        const ref = db.collection('broadcastComments').doc(String(body.commentId || 'x'));
        const snap = await ref.get();
        if (!snap.exists) return reply(404, { error: 'Commentaire introuvable' });
        if (action === 'drlo_comment_hide') await ref.update({ hidden: body.hidden !== false });
        else if (action === 'drlo_comment_pin') await ref.update({ pinned: body.pinned !== false });
        else await ref.update({ closed: body.closed !== false });
        return reply(200, { ok: true });
      }
      if (action === 'drlo_comment_reply' || action === 'drlo_comment_edit') {
        const ref = db.collection('broadcastComments').doc(String(body.commentId || 'x'));
        const snap = await ref.get();
        if (!snap.exists) return reply(404, { error: 'Commentaire introuvable' });
        const c = snap.data();
        if (c.status !== 'public') return reply(400, { error: 'Ce commentaire n\'est pas public.' });
        const thread = C.threadOf(c).map((e) => ({ ...e }));
        const editing = action === 'drlo_comment_edit';
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
          const sv = await saveReplyAudio(c.broadcastId, snap.id, body.audio);
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
        await ref.update({ thread, reply: admin.firestore.FieldValue.delete() });
        await dropFile(oldPath);
        return reply(200, { ok: true });
      }
      return reply(400, { error: 'Action inconnue' });
    }

    // ── Personne connectée ──
    if (action === 'inbox') {
      const recs = await db.collection('broadcastRecipients').where('uid', '==', uid).limit(100).get();
      if (recs.empty) return reply(200, { items: [], unread: 0 });
      const rmap = Object.fromEntries(recs.docs.map((d) => [d.data().broadcastId, d.data()]));
      const ids = Object.keys(rmap);
      const refs = ids.map((id) => db.collection('broadcasts').doc(id));
      const snaps = await db.getAll(...refs);
      // Du neuf côté commentaires : réponses de Dr Lô aux commentaires de la personne, et commentaires des autres depuis sa dernière visite
      const mineSnap = await db.collection('broadcastComments').where('uid', '==', uid).limit(200).get().catch(() => null);
      const myRows = mineSnap ? mineSnap.docs.map((d) => d.data()) : [];
      const items = snaps
        .filter((s) => s.exists && !s.data().hidden && ['sending', 'sent'].includes(s.data().status))
        .map((s) => {
          const r = rmap[s.id] || {};
          const b = s.data();
          const total = b.commentsOpen ? Math.max(0, Number(b.stats && b.stats.comments) || 0) : 0;
          const newReplies = myRows.filter((c) => c.broadcastId === s.id && c.status === 'public' && !c.hidden && C.lastDrloAt(c) > (Number(r.repliesSeenAt) || 0)).length;
          const newComments = b.commentsOpen && !r.muted ? Math.max(0, total - (Number(r.commentsSeen) || 0)) : 0;
          return { ...publicMessage(s.id, b, r), commentsTotal: total, newComments, newReplies };
        })
        .sort((a, b) => b.at - a.at)
        .slice(0, 30);
      const unread = items.filter((i) => !i.seen).length;
      const newReplies = items.reduce((n, i) => n + i.newReplies, 0);
      const newComments = items.reduce((n, i) => n + i.newComments, 0);
      return reply(200, { items, unread, newReplies, newComments, badge: unread + newReplies + newComments });
    }

    if (action === 'mute') {
      const id = String(body.id || '');
      if (!id) return reply(400, { error: 'Message manquant' });
      const rRef = db.collection('broadcastRecipients').doc(B.recipientId(id, uid));
      if (!(await rRef.get()).exists) return reply(404, { error: 'Message introuvable' });
      await rRef.update({ muted: body.muted !== false });
      return reply(200, { ok: true, muted: body.muted !== false });
    }

    if (action === 'open' || action === 'react' || action === 'listen') {
      const id = String(body.id || '');
      if (!id) return reply(400, { error: 'Message manquant' });
      const rRef = db.collection('broadcastRecipients').doc(B.recipientId(id, uid));
      const bRef = db.collection('broadcasts').doc(id);
      const [rSnap, bSnap] = await Promise.all([rRef.get(), bRef.get()]);
      if (!rSnap.exists || !bSnap.exists || bSnap.data().hidden) return reply(404, { error: 'Message introuvable' });
      const r = rSnap.data();
      const b = bSnap.data();

      if (action === 'open') {
        if (!r.seenAt) {
          await rRef.update({ seenAt: Date.now() });
          await bRef.update({ 'stats.views': inc(1) }).catch(() => {});
        }
        const counts = (b.stats && b.stats.reactions) || {};
        let audioUrl = null;
        if (b.audio && b.audio.path) {
          try {
            const [u] = await admin.storage().bucket(BUCKET).file(b.audio.path).getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 });
            audioUrl = u;
          } catch (e) { console.error('audio url', e.message); }
        }
        return reply(200, { message: publicMessage(id, b, { ...r, seenAt: r.seenAt || Date.now() }), counts, audioUrl });
      }

      if (action === 'listen') {
        if (!b.audio || r.listenedAt) return reply(200, { ok: true });
        await rRef.update({ listenedAt: Date.now() });
        await bRef.update({ 'stats.listens': inc(1) }).catch(() => {});
        return reply(200, { ok: true });
      }

      const next = B.cleanReaction(body.reaction);
      if (body.reaction !== null && body.reaction !== undefined && next === null) return reply(400, { error: 'Réaction inconnue' });
      const prev = r.reaction || null;
      if (prev !== next) {
        const upd = {};
        if (prev) upd[`stats.reactions.${prev}`] = inc(-1);
        if (next) upd[`stats.reactions.${next}`] = inc(1);
        await Promise.all([rRef.update({ reaction: next }), bRef.update(upd)]);
      }
      const fresh = (await bRef.get()).data();
      return reply(200, { ok: true, reaction: next, counts: (fresh.stats && fresh.stats.reactions) || {} });
    }

    // ── Commentaires (seulement pour les destinataires du message, si Dr Lô les a ouverts) ──
    if (['comments', 'comment_add', 'comment_report', 'comment_delete', 'comment_followup'].includes(action)) {
      const mineOnly = action === 'comment_report' || action === 'comment_delete' || action === 'comment_followup';
      let bid = String(body.id || '');
      let cRef = null;
      if (mineOnly) {
        cRef = db.collection('broadcastComments').doc(String(body.commentId || 'x'));
        const cs = await cRef.get();
        if (!cs.exists) return reply(404, { error: 'Commentaire introuvable' });
        bid = cs.data().broadcastId;
        if (action === 'comment_delete') {
          if (cs.data().uid !== uid) return reply(403, { error: 'Ce n\'est pas ton commentaire.' });
          await cRef.delete();
          await admin.storage().bucket(BUCKET).deleteFiles({ prefix: `broadcasts/${bid}/comments/${cRef.id}-` }).catch(() => {});
          await db.collection('broadcasts').doc(bid).update({ 'stats.comments': inc(-1) }).catch(() => {});
          return reply(200, { ok: true });
        }
      }
      if (!bid) return reply(400, { error: 'Message manquant' });
      const [rSnap, bSnap] = await Promise.all([db.collection('broadcastRecipients').doc(B.recipientId(bid, uid)).get(), db.collection('broadcasts').doc(bid).get()]);
      if (!rSnap.exists || !bSnap.exists || bSnap.data().hidden) return reply(404, { error: 'Message introuvable' });
      const b = bSnap.data();

      if (action === 'comment_report') {
        const c = (await cRef.get()).data();
        if (c.uid === uid) return reply(400, { error: 'C\'est ton propre commentaire.' });
        const by = Array.isArray(c.reportedBy) ? c.reportedBy : [];
        if (!by.includes(uid)) await cRef.update({ reportedBy: [...by, uid], reports: by.length + 1 });
        return reply(200, { ok: true });
      }

      if (action === 'comment_followup') {
        const cur = (await cRef.get()).data();
        if (cur.uid !== uid) return reply(403, { error: 'Ce n\'est pas ton commentaire.' });
        if (cur.status !== 'public' || cur.hidden) return reply(404, { error: 'Commentaire introuvable' });
        const v = C.validateComment(body.text);
        if (v.error) return reply(400, { error: v.error });
        const mod = C.moderate(v.text);
        if (!mod.ok && mod.reason === 'crisis') {
          // Jamais publié : message privé de soutien, et un signal sans identité pour Dr Lô
          await db.collection('broadcastComments').add({ broadcastId: bid, uid, name: cur.name || 'Anonyme', text: v.text, status: 'distress', hidden: true, reports: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
          await sendToUser(uid, C.CRISIS_NOTIF).catch(() => {});
          return reply(200, { ok: true, published: false, support: true });
        }
        if (!mod.ok) return reply(400, { error: C.REASON_TEXT[mod.reason] || 'Message non accepté.' });
        const now = Date.now();
        const result = await db.runTransaction(async (tx) => {
          const fresh = (await tx.get(cRef)).data();
          const can = C.userCanFollowUp(fresh);
          if (!can.ok) return can;
          tx.update(cRef, { thread: [...C.threadOf(fresh), { from: 'user', text: v.text, at: now }], reply: admin.firestore.FieldValue.delete(), lastUserAt: now });
          return { ok: true };
        });
        if (!result.ok) return reply(400, { error: result.error });
        return reply(200, { ok: true, published: true });
      }

      const all = await db.collection('broadcastComments').where('broadcastId', '==', bid).limit(300).get();
      const rows = all.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: ms(d.data().createdAt) }));

      if (action === 'comments') {
        const seenBefore = Number(rSnap.data().repliesSeenAt) || 0;
        const shown = C.sortComments(rows.filter((c) => C.visible(c) || (c.uid === uid && c.status === 'public' && !c.hidden))).slice(0, 80);
        const items = await Promise.all(shown.map(async (c) => {
          const th = C.threadOf(c);
          const entries = await Promise.all(th.map(async (e) => ({
            ...C.presentEntry(e, seenBefore),
            audioUrl: e.audio && e.audio.path ? await signedUrl(e.audio.path) : null,
          })));
          const mine = c.uid === uid;
          return { id: c.id, name: c.name, text: c.text, at: c.createdAt, mine, pinned: !!c.pinned, thread: entries, closed: !!c.closed, canReply: mine && C.userCanFollowUp(c).ok };
        }));
        // La personne vient de tout voir : on remet les compteurs « nouveau » à zéro
        await db.collection('broadcastRecipients').doc(B.recipientId(bid, uid)).update({ repliesSeenAt: Date.now(), commentsSeen: Math.max(0, Number(b.stats && b.stats.comments) || 0) }).catch(() => {});
        return reply(200, { open: !!b.commentsOpen, items });
      }

      // comment_add
      if (!b.commentsOpen) return reply(400, { error: 'Les commentaires sont fermés pour ce message.' });
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
        // Jamais publié : la personne reçoit un message privé, Dr Lô voit un signal sans identité.
        await db.collection('broadcastComments').add({ broadcastId: bid, uid, name: idt.name, text: v.text, status: 'distress', hidden: true, reports: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        await sendToUser(uid, C.CRISIS_NOTIF).catch(() => {});
        return reply(200, { ok: true, published: false, support: true });
      }
      if (!mod.ok) return reply(400, { error: C.REASON_TEXT[mod.reason] || 'Commentaire non accepté.' });

      const ref = await db.collection('broadcastComments').add({ broadcastId: bid, uid, name: idt.name, mode: idt.mode, text: v.text, status: 'public', hidden: false, pinned: false, reports: 0, reportedBy: [], reply: null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      await db.collection('broadcasts').doc(bid).update({ 'stats.comments': inc(1) }).catch(() => {});
      await db.collection('broadcastRecipients').doc(B.recipientId(bid, uid)).update({ commentsSeen: inc(1) }).catch(() => {});
      return reply(200, { ok: true, published: true, id: ref.id });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('drlo-broadcast error', action, e.message);
    return reply(500, { error: 'Erreur serveur' });
  }
};

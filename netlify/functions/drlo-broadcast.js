/**
 * drlo-broadcast — « Ma communauté » : les messages de Dr Lô à ses abonnés.
 * POST { action, ... } avec le jeton Firebase. Tout passe par le serveur (aucune règle Firestore à déployer).
 *
 * Espace Dr Lô (rôle staff/{uid}.drlo === true) :
 *   drlo_count   { audience }                     → nombre de personnes visées (jamais les noms)
 *   drlo_create  { text, audience, sendAt? }      → envoie maintenant, ou programme (sendAt = ms)
 *   drlo_list                                     → les derniers messages et leurs chiffres
 *   drlo_hide    { id, hidden }                   → masquer / réafficher un message chez les destinataires
 * Personne connectée :
 *   inbox                                         → mes messages de Dr Lô
 *   open         { id }                           → lire un message (marqué lu)
 *   react        { id, reaction }                 → ❤️ 🙏 💪 (reaction null = retirer)
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

const adminComment = (id, c) => ({
  id, name: c.status === 'distress' ? 'Anonyme' : (c.name || 'Anonyme'), text: c.text, status: c.status, hidden: !!c.hidden, pinned: !!c.pinned,
  reports: Number(c.reports) || 0, reply: c.reply || null, createdAt: ms(c.createdAt),
});

const publicMessage = (id, b, r) => ({
  id,
  text: b.text,
  at: ms(b.sentAt) || ms(b.createdAt),
  seen: !!(r && r.seenAt),
  reaction: (r && r.reaction) || null,
  commentsOpen: !!b.commentsOpen,
  audio: b.audio ? { durationSec: b.audio.durationSec } : null,
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
        await ref.set({
          kind: au ? 'audio' : 'text', text: t.text, audience: a.audience, audienceCount: count, commentsOpen: false,
          status: scheduled ? 'scheduled' : 'launching', hidden: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(), sendAt: scheduled ? sendAt : Date.now(), createdBy: uid,
          stats: { views: 0, reactions: { heart: 0, pray: 0, strong: 0 } },
        });
        if (au) {
          const path = `broadcasts/${ref.id}/vocal.${au.ext}`;
          await admin.storage().bucket(BUCKET).file(path).save(au.buffer, { contentType: au.mime, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
          await ref.update({ audio: { path, mime: au.mime, durationSec: au.durationSec, bytes: au.buffer.length } });
        }
        if (scheduled) return reply(200, { ok: true, id: ref.id, status: 'scheduled', count });
        const n = await S.launch(ref.id, a.audience);
        const pending = await S.deliverPending(ref.id, 15000);
        return reply(200, { ok: true, id: ref.id, status: pending ? 'sending' : 'sent', count: n });
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

      if (action === 'drlo_comments_open') {
        if (!body.id) return reply(400, { error: 'Message manquant' });
        await db.collection('broadcasts').doc(String(body.id)).update({ commentsOpen: body.open === true });
        return reply(200, { ok: true });
      }
      if (action === 'drlo_comments') {
        const s = await db.collection('broadcastComments').where('broadcastId', '==', String(body.id || '')).limit(300).get();
        const items = s.docs.map((d) => ({ ...adminComment(d.id, d.data()) })).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
        return reply(200, { items });
      }
      if (['drlo_comment_hide', 'drlo_comment_pin', 'drlo_comment_reply'].includes(action)) {
        const ref = db.collection('broadcastComments').doc(String(body.commentId || 'x'));
        const snap = await ref.get();
        if (!snap.exists) return reply(404, { error: 'Commentaire introuvable' });
        if (action === 'drlo_comment_hide') await ref.update({ hidden: body.hidden !== false });
        else if (action === 'drlo_comment_pin') await ref.update({ pinned: body.pinned !== false });
        else {
          if (snap.data().status !== 'public') return reply(400, { error: 'Ce commentaire n\'est pas public.' });
          const v = C.validateComment(body.text, C.MAX_REPLY);
          if (v.error) return reply(400, { error: v.error });
          await ref.update({ reply: { text: v.text, at: Date.now() } });
        }
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
      const items = snaps
        .filter((s) => s.exists && !s.data().hidden && ['sending', 'sent'].includes(s.data().status))
        .map((s) => publicMessage(s.id, s.data(), rmap[s.id]))
        .sort((a, b) => b.at - a.at)
        .slice(0, 30);
      return reply(200, { items, unread: items.filter((i) => !i.seen).length });
    }

    if (action === 'open' || action === 'react') {
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
    if (['comments', 'comment_add', 'comment_report', 'comment_delete'].includes(action)) {
      const mineOnly = action === 'comment_report' || action === 'comment_delete';
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

      const all = await db.collection('broadcastComments').where('broadcastId', '==', bid).limit(300).get();
      const rows = all.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: ms(d.data().createdAt) }));

      if (action === 'comments') {
        const items = C.sortComments(rows.filter((c) => C.visible(c) || (c.uid === uid && c.status === 'public' && !c.hidden)))
          .slice(0, 80).map((c) => ({ id: c.id, name: c.name, text: c.text, at: c.createdAt, mine: c.uid === uid, pinned: !!c.pinned, reply: c.reply || null }));
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
      return reply(200, { ok: true, published: true, id: ref.id });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('drlo-broadcast error', action, e.message);
    return reply(500, { error: 'Erreur serveur' });
  }
};

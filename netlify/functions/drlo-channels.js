/**
 * drlo-channels — « Chaînes » de Dr Lô. POST { action, ... } avec le jeton Firebase. Tout passe par le serveur.
 *
 * Espace Dr Lô (rôle staff/{uid}.drlo === true) :
 *   drlo_save { id?, name, description, price, framingText?, requireFramingAck?, rules, photo?, status? }
 *             → crée (sans id) ou modifie (avec id) une chaîne. photo = { data (base64), mime }.
 *   drlo_list → toutes les chaînes (même archivées) avec le nombre de membres
 *   drlo_activity → nouveautés depuis ta dernière visite (nouveaux membres, nouveaux commentaires, réponses des personnes)
 *   drlo_seen     → remet ces compteurs à zéro
 * Personne connectée :
 *   list   → les chaînes à découvrir + les miennes, avec « ce qui me manque » pour entrer
 *   detail { id } → une chaîne (cadrage compris), mon statut et ce qui me manque
 *   join   { id, ack? } → entrer dans la chaîne (conditions vérifiées ici, étincelles débitées une seule fois)
 *   leave  { id } → quitter (pas de remboursement)
 *   mute   { id, muted } → couper / rétablir les alertes d'une chaîne
 *   news   → pastilles : nouvelles publications et réponses de Dr Lô à mes commentaires
 * Les membres ne voient que le NOMBRE de membres.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');
const CH = require('./_drloChannels');
const C = require('./_drloComments');
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);
const inc = (n) => admin.firestore.FieldValue.increment(n);
const memberId = (cid, uid) => `${cid}_${uid}`;

async function isDrLo(uid) {
  const s = await db.collection('staff').doc(uid).get();
  return s.exists && s.data().drlo === true;
}
async function signedUrl(path) {
  if (!path) return null;
  try {
    const [u] = await admin.storage().bucket(BUCKET).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 });
    return u;
  } catch (e) { console.error('channel photo url', e.message); return null; }
}
const dropFile = (path) => (path ? admin.storage().bucket(BUCKET).file(path).delete().catch(() => {}) : Promise.resolve());

/** La chaîne telle que la voit Dr Lô (conditions complètes). */
const adminChannel = async (id, c) => ({
  id, name: c.name, description: c.description, price: c.price || 0, framingText: c.framingText || '', requireFramingAck: !!c.requireFramingAck,
  rules: c.rules || {}, status: c.status || 'active', memberCount: Number(c.memberCount) || 0, createdAt: ms(c.createdAt), photoUrl: await signedUrl(c.photoPath),
});

/** La chaîne telle que la voit une personne : seulement le nombre de membres, jamais la liste. */
async function userChannel(id, c, { profile, balance, member, withFraming }) {
  const elig = CH.eligibility(profile, balance, c);
  return {
    id, name: c.name, description: c.description, price: c.price || 0, rules: c.rules || {}, archived: c.status === 'archived',
    memberCount: Number(c.memberCount) || 0, photoUrl: await signedUrl(c.photoPath),
    member: !!member, joinedAt: member ? ms(member.joinedAt) : null, muted: !!(member && member.muted),
    eligible: elig.eligible, missing: member ? [] : elig.missing,
    requireFramingAck: !!c.requireFramingAck, hasFraming: !!c.framingText,
    ...(withFraming ? { framingText: c.framingText || '' } : {}),
  };
}

/** Pastilles d'une personne : nouvelles publications (depuis sa dernière visite) et réponses de Dr Lô à ses commentaires. */
async function computeNews(uid, memberships, channelsById) {
  const byChannel = {};
  const ids = memberships.map((m) => m.channelId).filter((id) => !!channelsById[id]);
  await Promise.all([...new Set(ids)].map(async (cid) => {
    const m = memberships.find((x) => x.channelId === cid);
    const since = Number(m.feedSeenAt) || ms(m.joinedAt);
    let posts = 0;
    if (m.muted !== true) {
      const snap = await db.collection('channelPosts').where('channelId', '==', cid).get();
      posts = snap.docs.filter((d) => d.data().status === 'published' && ms(d.data().createdAt) > since).length;
    }
    byChannel[cid] = { posts, replies: 0 };
  }));
  // Réponses de Dr Lô aux commentaires de la personne, pas encore lues
  const mine = await db.collection('channelComments').where('uid', '==', uid).get();
  const rows = mine.docs.map((d) => d.data()).filter((c) => c.status === 'public' && !c.hidden && byChannel[c.channelId]);
  if (rows.length) {
    const postIds = [...new Set(rows.map((c) => c.postId))];
    const views = await db.getAll(...postIds.map((pid) => db.collection('channelPostViews').doc(`${pid}_${uid}`)));
    const seen = Object.fromEntries(views.map((v) => [v.id.slice(0, -(uid.length + 1)), v.exists ? Number(v.data().repliesSeenAt) || 0 : 0]));
    rows.forEach((c) => { if (C.lastDrloAt(c) > (seen[c.postId] || 0)) byChannel[c.channelId].replies += 1; });
  }
  const badge = Object.values(byChannel).reduce((n, x) => n + x.posts + x.replies, 0);
  return { badge, byChannel };
}

async function loadMe(uid) {
  const [up, pa] = await Promise.all([db.collection('userProfiles').doc(uid).get(), db.collection('patients').doc(uid).get()]);
  const wallet = pa.exists ? (pa.data().korisWallet || {}) : {};
  return { profile: up.exists ? up.data() : {}, balance: Number(wallet.balance) || 0 };
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
    if (action === 'drlo_save' || action === 'drlo_list' || action === 'drlo_activity' || action === 'drlo_seen') {
      if (!(await isDrLo(uid))) return reply(403, { error: 'Réservé à Dr Lô' });

      if (action === 'drlo_seen') {
        await db.collection('drloState').doc(uid).set({ channelsSeenAt: Date.now() }, { merge: true });
        return reply(200, { ok: true });
      }
      if (action === 'drlo_activity') {
        const stRef = db.collection('drloState').doc(uid);
        const st = await stRef.get();
        if (!st.exists || !st.data().channelsSeenAt) { await stRef.set({ channelsSeenAt: Date.now() }, { merge: true }); return reply(200, { badge: 0, distress: 0, byChannel: {} }); }
        const since = Number(st.data().channelsSeenAt);
        const byChannel = {};
        const bump = (cid, k) => { byChannel[cid] = byChannel[cid] || { members: 0, comments: 0, replies: 0 }; byChannel[cid][k] += 1; };
        let distress = 0;
        const [mem, com, fu] = await Promise.all([
          db.collection('channelMembers').where('joinedAt', '>', new Date(since)).limit(300).get(),
          db.collection('channelComments').where('createdAt', '>', new Date(since)).limit(300).get(),
          db.collection('channelComments').where('lastUserAt', '>', since).limit(300).get().catch(() => null),
        ]);
        mem.docs.forEach((d) => bump(d.data().channelId, 'members'));
        const counted = new Set(com.docs.map((d) => d.id));
        com.docs.forEach((d) => {
          const c = d.data();
          if (c.status === 'distress') { distress += 1; bump(c.channelId, 'comments'); return; }
          if (c.hidden || c.status !== 'public') return;
          bump(c.channelId, 'comments');
        });
        if (fu) fu.docs.forEach((d) => { const c = d.data(); if (!counted.has(d.id) && !c.hidden && c.status === 'public') bump(c.channelId, 'replies'); });
        const badge = Object.values(byChannel).reduce((n, x) => n + x.members + x.comments + x.replies, 0);
        return reply(200, { badge, distress, byChannel });
      }

      if (action === 'drlo_list') {
        const snap = await db.collection('channels').get();
        const items = await Promise.all(snap.docs.map((d) => adminChannel(d.id, d.data())));
        items.sort((a, b) => b.createdAt - a.createdAt);
        return reply(200, { items });
      }

      const isNew = !body.id;
      let ref, old = null;
      if (isNew) ref = db.collection('channels').doc();
      else {
        ref = db.collection('channels').doc(String(body.id));
        const s = await ref.get();
        if (!s.exists) return reply(404, { error: 'Chaîne introuvable' });
        old = s.data();
      }
      const v = CH.validateChannel(body, { partial: !isNew });
      if (v.error) return reply(400, { error: v.error });
      const data = { ...v.data };
      if (body.removePhoto && old && old.photoPath) { data.photoPath = null; }
      let newPhoto = null;
      if (body.photo) {
        const ph = CH.validatePhoto(body.photo);
        if (ph.error) return reply(400, { error: ph.error });
        const path = `channels/${ref.id}/cover-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ph.ext}`;
        try {
          await admin.storage().bucket(BUCKET).file(path).save(ph.buffer, { contentType: ph.mime, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
        } catch (e) {
          console.error('drlo-channels photo storage', BUCKET, e.code, e.message);
          return reply(502, { error: 'La photo n\'a pas pu être enregistrée (stockage indisponible ou non autorisé). Rien n\'a été modifié.' });
        }
        data.photoPath = path; newPhoto = path;
      }
      if (isNew) {
        await ref.set({ ...data, status: data.status || 'active', memberCount: 0, createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: uid });
      } else {
        await ref.update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (old.photoPath && (newPhoto || body.removePhoto) && old.photoPath !== data.photoPath) await dropFile(old.photoPath);
      }
      const fresh = await ref.get();
      return reply(200, { ok: true, channel: await adminChannel(ref.id, fresh.data()) });
    }

    // ───────── Personne connectée ─────────
    if (action === 'list') {
      const [snap, me] = await Promise.all([db.collection('channels').get(), loadMe(uid)]);
      const refs = snap.docs.map((d) => db.collection('channelMembers').doc(memberId(d.id, uid)));
      const mems = refs.length ? await db.getAll(...refs) : [];
      const byId = Object.fromEntries(mems.map((m) => [m.id, m.exists ? m.data() : null]));
      const rows = snap.docs
        .map((d) => ({ id: d.id, c: d.data(), member: byId[memberId(d.id, uid)] }))
        .filter((r) => r.c.status !== 'archived' || r.member);
      const items = await Promise.all(rows.map((r) => userChannel(r.id, r.c, { ...me, member: r.member })));
      const memberships = rows.filter((r) => r.member).map((r) => ({ ...r.member, channelId: r.id }));
      const news = memberships.length ? await computeNews(uid, memberships, Object.fromEntries(rows.map((r) => [r.id, r.c]))) : { badge: 0, byChannel: {} };
      items.forEach((i) => { i.news = news.byChannel[i.id] || { posts: 0, replies: 0 }; });
      items.sort((a, b) => Number(b.member) - Number(a.member) || (b.news.posts + b.news.replies) - (a.news.posts + a.news.replies) || b.memberCount - a.memberCount);
      return reply(200, { items, balance: me.balance, badge: news.badge });
    }

    // Pastille légère (accueil) : seulement le total et le détail par chaîne
    if (action === 'news') {
      const snap = await db.collection('channels').get();
      const refs = snap.docs.map((d) => db.collection('channelMembers').doc(memberId(d.id, uid)));
      const mems = refs.length ? await db.getAll(...refs) : [];
      const memberships = mems.filter((m) => m.exists).map((m) => ({ ...m.data(), channelId: m.id.slice(0, -(uid.length + 1)) }));
      if (!memberships.length) return reply(200, { badge: 0, byChannel: {} });
      return reply(200, await computeNews(uid, memberships, Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))));
    }

    if (action === 'mute') {
      const id = String(body.id || '');
      const mRef = db.collection('channelMembers').doc(memberId(id, uid));
      if (!id || !(await mRef.get()).exists) return reply(404, { error: 'Tu n\'es pas membre de cette chaîne.' });
      await mRef.update({ muted: body.muted !== false });
      return reply(200, { ok: true, muted: body.muted !== false });
    }

    if (action === 'detail' || action === 'join' || action === 'leave') {
      const id = String(body.id || '');
      if (!id) return reply(400, { error: 'Chaîne manquante' });
      const chRef = db.collection('channels').doc(id);
      const mRef = db.collection('channelMembers').doc(memberId(id, uid));
      const [cs, ms_] = await Promise.all([chRef.get(), mRef.get()]);
      if (!cs.exists) return reply(404, { error: 'Chaîne introuvable' });
      const c = cs.data();
      const member = ms_.exists ? ms_.data() : null;
      if (c.status === 'archived' && !member) return reply(404, { error: 'Chaîne introuvable' });

      if (action === 'detail') {
        const me = await loadMe(uid);
        return reply(200, { channel: await userChannel(id, c, { ...me, member, withFraming: true }), balance: me.balance });
      }

      if (action === 'leave') {
        if (!member) return reply(409, { error: 'Tu n\'es pas membre de cette chaîne.' });
        await db.runTransaction(async (tx) => {
          const s = await tx.get(mRef);
          if (!s.exists) return;
          tx.delete(mRef);
          tx.update(chRef, { memberCount: inc(-1) });
        });
        return reply(200, { ok: true });
      }

      // join
      if (member) return reply(409, { error: 'Tu es déjà membre de cette chaîne.' });
      if (c.status !== 'active') return reply(410, { error: 'Cette chaîne n\'accepte plus de nouveaux membres.' });
      const me = await loadMe(uid);
      const elig = CH.eligibility(me.profile, me.balance, c);
      if (!elig.eligible) return reply(403, { error: 'Tu ne remplis pas encore les conditions.', missing: elig.missing, balance: me.balance });
      if (c.requireFramingAck && body.ack !== true) return reply(400, { error: 'Confirme que tu as lu le texte avant d\'entrer.' });

      const price = Number(c.price) || 0;
      let holdId = null;
      if (price > 0) {
        const res = await reserveKoris(uid, 'channel', price, { channelId: id });
        if (res.error) return reply(402, { error: 'Pas assez d\'étincelles', required: price, balance: me.balance });
        holdId = res.holdId;
      }
      try {
        await db.runTransaction(async (tx) => {
          const s = await tx.get(mRef);
          if (s.exists) throw new Error('ALREADY_MEMBER');
          tx.set(mRef, { channelId: id, uid, joinedAt: admin.firestore.FieldValue.serverTimestamp(), feedSeenAt: Date.now(), muted: false, paid: price });
          tx.update(chRef, { memberCount: inc(1) });
        });
      } catch (e) {
        await releaseKoris(holdId);
        if (e.message === 'ALREADY_MEMBER') return reply(409, { error: 'Tu es déjà membre de cette chaîne.' });
        throw e;
      }
      await commitKoris(holdId);
      return reply(200, { ok: true, paid: price });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('drlo-channels', action, e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

/**
 * _broadcastServer.js — lecture de l'audience, création des destinataires et envoi des notifications.
 * Partagé par drlo-broadcast (envoi immédiat) et broadcast-scheduled (messages programmés + envois à finir).
 */
const { admin, db } = require('./_firebase');
const { sendToUser } = require('./_push');
const B = require('./_drloBroadcast');

const PATIENT_FIELDS = ['programme', 'lastSeenAt', 'lastActivityAt', 'createdAt'];
const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

/** Les identifiants des personnes visées (jamais renvoyés au navigateur de Dr Lô : seulement leur nombre). */
async function resolveAudience(aud, now = Date.now()) {
  const needProfile = !!(aud.test || aud.totems);
  const uids = [];
  let last = null;
  for (;;) {
    let q = db.collection('patients').select(...PATIENT_FIELDS).orderBy(admin.firestore.FieldPath.documentId()).limit(500);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    if (page.empty) break;
    last = page.docs[page.docs.length - 1];
    let profiles = {};
    if (needProfile) {
      const refs = page.docs.map((d) => db.collection('userProfiles').doc(d.id));
      const snaps = await db.getAll(...refs, { fieldMask: ['scaleResults', 'totem', 'createdAt'] });
      profiles = Object.fromEntries(snaps.map((s) => [s.id, s.exists ? s.data() : null]));
    }
    for (const d of page.docs) {
      if (B.matchesAudience(profiles[d.id] || {}, d.data(), aud, now)) uids.push(d.id);
    }
    if (page.size < 500) break;
  }
  return uids;
}

/** Crée les destinataires d'un message et passe le message en « envoi ». */
async function launch(bid, aud) {
  const uids = await resolveAudience(aud);
  const ref = db.collection('broadcasts').doc(bid);
  const sentAt = Date.now();
  for (const part of chunk(uids, 400)) {
    const batch = db.batch();
    part.forEach((uid) => batch.set(db.collection('broadcastRecipients').doc(B.recipientId(bid, uid)), { broadcastId: bid, uid, sentAt, pushed: false, seenAt: null, reaction: null }));
    await batch.commit();
  }
  await ref.update({ status: 'sending', audienceCount: uids.length, sentAt });
  return uids.length;
}

/** Envoie les notifications en attente, dans la limite du temps donné. Renvoie combien il en reste. */
async function deliverPending(bid, budgetMs = 15000) {
  const ref = db.collection('broadcasts').doc(bid);
  const end = Date.now() + budgetMs;
  while (Date.now() < end) {
    const snap = await db.collection('broadcastRecipients').where('broadcastId', '==', bid).where('pushed', '==', false).limit(100).get();
    if (snap.empty) break;
    for (const group of chunk(snap.docs, 20)) {
      await Promise.all(group.map((d) => sendToUser(d.data().uid, {
        kind: 'broadcast',
        title: 'Dr Lô',
        body: 'Dr Lô t\'a laissé un message.',
        inboxTitle: 'Dr Lô t\'a laissé un message',
        inboxBody: 'Ouvre-le quand tu veux.',
        link: `/messages-dr-lo/${bid}`,
      }).catch(() => null)));
      const batch = db.batch();
      group.forEach((d) => batch.update(d.ref, { pushed: true }));
      await batch.commit();
      if (Date.now() >= end) break;
    }
  }
  const rest = await db.collection('broadcastRecipients').where('broadcastId', '==', bid).where('pushed', '==', false).limit(1).get();
  if (rest.empty) await ref.update({ status: 'sent' }).catch(() => {});
  return !rest.empty;
}

module.exports = { resolveAudience, launch, deliverPending };

/**
 * _push.js — envoyer une notification à une personne : une ligne dans « Mes notifications »
 * (collection notifications, comme le reste du site) + un message sur ses appareils si elle
 * a activé les rappels et que ce type est autorisé maintenant.
 */
const { admin, db } = require('./_firebase');
const { allowed, prefsOf, deadTokens } = require('./_pushDaily');

const SITE = 'https://health-e.sn';

/**
 * msg = { kind, title?, body, link, inboxTitle?, inboxBody? }
 * opts = { noInbox?: boolean, patient?: object (déjà lu) }
 */
async function sendToUser(uid, msg, opts = {}) {
  if (!db || !uid) return { sent: 0 };
  const ref = db.collection('patients').doc(uid);
  let p = opts.patient;
  if (!p) {
    const snap = await ref.get().catch(() => null);
    p = snap && snap.exists ? snap.data() : {};
  }
  if (!opts.noInbox) {
    await db.collection('notifications').add({
      userId: uid,
      type: `drlo_${msg.kind}`,
      title: msg.inboxTitle || msg.title || 'Dr Lô',
      content: msg.inboxBody || msg.body,
      link: msg.link || '/',
      sourceType: 'drlo',
      read: false,
      priority: 'medium',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch((e) => console.warn('inbox write failed', e.message));
  }
  const prefs = prefsOf(p);
  const tokens = Array.isArray(p.pushTokens) ? p.pushTokens.filter((t) => typeof t === 'string' && t) : [];
  if (!tokens.length || !allowed(prefs, msg.kind, new Date())) return { sent: 0 };
  try {
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: msg.title || 'Dr Lô', body: msg.body },
      data: { link: msg.link || '/', kind: msg.kind },
      webpush: {
        notification: { icon: '/icons/drlo-notif.png', badge: '/icons/badge-96.png', tag: `drlo-${msg.kind}` },
        fcmOptions: { link: `${SITE}${msg.link || '/'}` },
      },
    });
    const dead = deadTokens(tokens, res.responses);
    if (dead.length) await ref.update({ pushTokens: admin.firestore.FieldValue.arrayRemove(...dead) }).catch(() => {});
    return { sent: res.successCount };
  } catch (e) {
    console.warn('push send failed', e.message);
    return { sent: 0 };
  }
}

module.exports = { sendToUser };

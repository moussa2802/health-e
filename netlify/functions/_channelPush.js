/**
 * _channelPush.js — prévenir les membres d'une chaîne qu'une publication est en ligne.
 * Notification neutre : « Dr Lô a publié dans {nom de la chaîne} ». Pas de contenu, jamais le texte.
 * sendToUser respecte déjà : rappels activés, préférence « Dr Lô », silence la nuit (22 h – 7 h).
 * Les membres qui ont coupé les alertes de la chaîne (muted) ne reçoivent rien.
 * L'envoi est repris par page (curseur sur la publication) : il peut se terminer dans la tâche planifiée.
 */
const { admin, db } = require('./_firebase');
const { sendToUser } = require('./_push');

const PAGE = 100;
const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

/** Envoie par pages dans la limite du temps donné. Renvoie true s'il reste des membres à prévenir. */
async function deliverPostPush(postId, budgetMs = 8000) {
  const pRef = db.collection('channelPosts').doc(postId);
  const ps = await pRef.get();
  if (!ps.exists) return false;
  const post = ps.data();
  if (post.pushDone === true || post.status !== 'published') return false;
  const cs = await db.collection('channels').doc(post.channelId).get();
  if (!cs.exists || cs.data().status !== 'active') { await pRef.update({ pushDone: true }).catch(() => {}); return false; }
  const name = String(cs.data().name || 'une chaîne').slice(0, 60);
  const end = Date.now() + budgetMs;
  let cursor = post.pushCursor || null;
  let exhausted = false;
  while (Date.now() < end && !exhausted) {
    let q = db.collection('channelMembers').where('channelId', '==', post.channelId).orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
    if (cursor) q = q.startAfter(await db.collection('channelMembers').doc(cursor).get());
    const page = await q.get();
    if (page.empty) { exhausted = true; break; }
    const members = page.docs.map((d) => d.data()).filter((m) => m.muted !== true);
    for (const group of chunk(members, 20)) {
      await Promise.all(group.map((m) => sendToUser(m.uid, {
        kind: 'broadcast',
        title: 'Dr Lô',
        body: `Dr Lô a publié dans ${name}.`,
        inboxTitle: `Dr Lô a publié dans ${name}`,
        inboxBody: 'Ouvre la chaîne quand tu veux.',
        link: `/chaines/${post.channelId}`,
      }).catch(() => null)));
    }
    cursor = page.docs[page.docs.length - 1].id;
    await pRef.update({ pushCursor: cursor }).catch(() => {});
    if (page.size < PAGE) exhausted = true;
  }
  if (exhausted) await pRef.update({ pushDone: true }).catch(() => {});
  return !exhausted;
}

module.exports = { deliverPostPush };

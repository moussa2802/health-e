/**
 * penc-reminders — tâche planifiée (toutes les 5 minutes) :
 *   - « Pénc mi : ça commence dans 10 minutes » aux inscrits ;
 *   - Pénc « chaque semaine » : dès que l'heure d'une séance est passée, la séance de la semaine suivante est créée.
 */
const { admin, db } = require('./_firebase');
const P = require('./_penc');
const { notifyRegistered } = require('./penc');

exports.handler = async () => {
  if (!db) return { statusCode: 503, body: 'no db' };
  let sent = 0;
  try {
    const snap = await db.collection('pencs').where('status', '==', 'scheduled').get();
    const now = Date.now();
    for (const d of snap.docs) {
      const p = d.data();
      if (!P.remindDue(p, now)) continue;
      await d.ref.update({ remindSent: true }); // d'abord, pour ne jamais prévenir deux fois
      sent += await notifyRegistered(d.id, { kind: 'penc', title: 'Pénc mi', body: 'Ça commence dans 10 minutes.', inboxTitle: 'Pénc mi dans 10 minutes', inboxBody: p.title, link: `/penc/${d.id}` });
    }
    // Séances hebdomadaires
    const rep = await db.collection('pencs').where('repeatWeekly', '==', true).get();
    for (const d of rep.docs) {
      const p = d.data();
      const next = P.nextWeekly(p, now);
      if (!next) continue;
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(d.ref);
        if (!fresh.exists || fresh.data().nextCreated) return false;
        const copy = {};
        for (const k of ['title', 'description', 'durationMin', 'access', 'channelId', 'channelName', 'price', 'testScaleId', 'hostUid', 'hostName', 'hostTitle', 'hostPro']) {
          if (p[k] !== undefined) copy[k] = p[k];
        }
        const ref = db.collection('pencs').doc();
        tx.set(ref, { ...copy, startAt: next, repeatWeekly: true, seriesOf: p.seriesOf || d.id, status: 'scheduled', registeredCount: 0, remindSent: false, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.update(d.ref, { nextCreated: ref.id });
        return true;
      });
    }
  } catch (e) {
    console.error('penc-reminders', e.message);
    return { statusCode: 500, body: e.message };
  }
  return { statusCode: 200, body: JSON.stringify({ sent }) };
};

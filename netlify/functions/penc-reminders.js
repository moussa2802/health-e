/**
 * penc-reminders — tâche planifiée (toutes les 5 minutes) : « Pénc mi : ça commence dans 10 minutes » aux inscrits.
 */
const { db } = require('./_firebase');
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
  } catch (e) {
    console.error('penc-reminders', e.message);
    return { statusCode: 500, body: e.message };
  }
  return { statusCode: 200, body: JSON.stringify({ sent }) };
};

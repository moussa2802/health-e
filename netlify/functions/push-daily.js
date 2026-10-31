/**
 * push-daily — tâche planifiée (toutes les heures, voir netlify.toml).
 * Pour chaque personne qui a activé ses rappels et dont c'est l'heure choisie (dans son fuseau),
 * envoie au plus UN message du jour (programme, bilan, routine, défi de l'animal intérieur, ou « prendre des nouvelles »).
 */
const { admin, db } = require('./_firebase');
const { decideDaily, localParts, prefsOf } = require('./_pushDaily');
const { sendToUser } = require('./_push');
const P = require('./_practices');

/** Apprentissages en cours pas encore faits aujourd'hui (ne lit rien si la personne n'a pas d'apprentissage). */
async function routineDueFor(uid, today) {
  try {
    const us = await db.collection('practiceUnlocks').where('uid', '==', uid).where('mode', '==', 'learning').get();
    if (us.empty) return 0;
    const docs = us.docs.map((d) => d.data());
    const ps = await db.getAll(...docs.map((u) => db.collection('practices').doc(u.practiceId)));
    return P.routineDue(docs.map((u, i) => ({ u, p: ps[i].exists ? ps[i].data() : null })), today);
  } catch (e) { console.warn('push-daily routine', e.message); return 0; }
}

exports.handler = async () => {
  if (!db) return { statusCode: 503, body: 'no db' };
  const now = new Date();
  let sent = 0;
  let checked = 0;
  try {
    const snap = await db.collection('patients').where('notifPrefs.on', '==', true).get();
    for (const doc of snap.docs) {
      checked += 1;
      const p = doc.data();
      const prefs = prefsOf(p);
      const { day, hour } = localParts(prefs.tz, now);
      if (hour !== Number(prefs.hour) || p.lastPushDay === day) continue;
      const moodSnap = await db.collection('patients').doc(doc.id).collection('moods').doc(day).get().catch(() => null);
      const msg = decideDaily(p, { now, moodToday: !!(moodSnap && moodSnap.exists), routineDue: await routineDueFor(doc.id, day) });
      if (!msg) continue;
      // Programme et bilan sont déjà visibles en direct dans la cloche : pas de doublon dans « Récemment »
      const out = await sendToUser(doc.id, msg, { patient: p, noInbox: msg.kind === 'programme' || msg.kind === 'bilan' });
      const update = { lastPushDay: day };
      if (msg.kind === 'nudge') update.lastNudgeAt = admin.firestore.FieldValue.serverTimestamp();
      await doc.ref.update(update).catch(() => {});
      sent += out.sent;
    }
  } catch (e) {
    console.error('push-daily error', e.message);
    return { statusCode: 500, body: e.message };
  }
  console.log(`push-daily: ${checked} personnes regardées, ${sent} notifications envoyées`);
  return { statusCode: 200, body: JSON.stringify({ checked, sent }) };
};

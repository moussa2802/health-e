/**
 * channel-push-scheduled — tâche planifiée (toutes les heures) : termine l'envoi des notifications
 * « Dr Lô a publié dans… » restées en attente (grandes chaînes, envoi coupé par la limite de temps).
 */
const { db } = require('./_firebase');
const { deliverPostPush } = require('./_channelPush');

exports.handler = async () => {
  if (!db) return { statusCode: 503, body: 'no db' };
  let finished = 0; let pending = 0;
  try {
    const snap = await db.collection('channelPosts').where('pushDone', '==', false).limit(10).get();
    for (const d of snap.docs) {
      const more = await deliverPostPush(d.id, 8000);
      if (more) pending += 1; else finished += 1;
    }
  } catch (e) {
    console.error('channel-push-scheduled error', e.message);
    return { statusCode: 500, body: e.message };
  }
  console.log(`channel-push-scheduled: ${finished} terminés, ${pending} à reprendre`);
  return { statusCode: 200, body: JSON.stringify({ finished, pending }) };
};

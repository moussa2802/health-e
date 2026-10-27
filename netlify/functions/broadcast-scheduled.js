/**
 * broadcast-scheduled — tâche planifiée (toutes les heures) : envoie les messages de Dr Lô programmés
 * dont l'heure est venue, et termine les envois de notifications restés en attente.
 */
const { db } = require('./_firebase');
const S = require('./_broadcastServer');

exports.handler = async () => {
  if (!db) return { statusCode: 503, body: 'no db' };
  let launched = 0;
  let finished = 0;
  try {
    const due = await db.collection('broadcasts').where('status', '==', 'scheduled').limit(50).get(); // un seul filtre : pas d'index composite à créer
    const now = Date.now();
    for (const d of due.docs) {
      const b = d.data();
      if (!(Number(b.sendAt) <= now)) continue;
      await d.ref.update({ status: 'launching' });
      await S.launch(d.id, b.audience);
      launched += 1;
    }
    const sending = await db.collection('broadcasts').where('status', '==', 'sending').limit(10).get();
    for (const d of sending.docs) {
      const pending = await S.deliverPending(d.id, 8000);
      if (!pending) finished += 1;
    }
  } catch (e) {
    console.error('broadcast-scheduled error', e.message);
    return { statusCode: 500, body: e.message };
  }
  console.log(`broadcast-scheduled: ${launched} lancés, ${finished} terminés`);
  return { statusCode: 200, body: JSON.stringify({ launched, finished }) };
};

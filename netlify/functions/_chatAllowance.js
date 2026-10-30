/**
 * _chatAllowance.js — garde-fou des messages avec Dr Lô.
 * Plus aucun message n'est offert : chaque réponse de l'IA coûte 1 étincelle (voir dr-lo-chat.js).
 * Ce fichier ne sert plus qu'à compter les messages du jour (heure de Dakar = UTC) : au-delà de
 * MAX_PER_DAY, on reprend demain (garde-fou de coût), et toutes les 5 réponses l'appli met à jour
 * ce que Dr Lô retient (cette mise à jour est comprise dans le prix du message).
 * Compté côté serveur dans patients/{uid}.chatDay = { day, count }.
 */
const MAX_PER_DAY = 60;

const dayOf = (now = new Date()) => now.toISOString().slice(0, 10);

/** Logique pure : peut-on répondre à ce message, et le nouveau compteur. */
function nextAllowance(prev, today) {
  const count = prev && prev.day === today ? Number(prev.count) || 0 : 0;
  if (count >= MAX_PER_DAY) return { limit: true, next: { day: today, count } };
  return { limit: false, next: { day: today, count: count + 1 } };
}

/** Réserve une place pour ce message (transaction). */
async function takeSlot(db, uid, now = new Date()) {
  const ref = db.collection('patients').doc(uid);
  const today = dayOf(now);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const out = nextAllowance(snap.exists ? snap.data().chatDay : null, today);
    if (!out.limit) tx.set(ref, { chatDay: out.next }, { merge: true });
    return out;
  });
}

/** Le message n'a pas abouti : on rend la place. */
async function giveBack(db, uid, now = new Date()) {
  const ref = db.collection('patients').doc(uid);
  const today = dayOf(now);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? snap.data().chatDay : null;
    if (cur && cur.day === today && cur.count > 0) tx.set(ref, { chatDay: { day: today, count: cur.count - 1 } }, { merge: true });
  }).catch(() => {});
}

module.exports = { MAX_PER_DAY, dayOf, nextAllowance, takeSlot, giveBack };

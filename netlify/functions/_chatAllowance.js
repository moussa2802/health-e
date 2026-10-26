/**
 * _chatAllowance.js — messages offerts avec Dr Lô.
 * Chaque jour (heure de Dakar = UTC), les FREE_PER_DAY premiers messages sont offerts ; ensuite
 * 1 étincelle par message ; au-delà de MAX_PER_DAY, on reprend demain (garde-fou de coût).
 * Compté côté serveur dans patients/{uid}.chatDay = { day, count }.
 */
const FREE_PER_DAY = 15;
const MAX_PER_DAY = 60;

const dayOf = (now = new Date()) => now.toISOString().slice(0, 10);

/** Logique pure : que faire de ce message, et le nouveau compteur. */
function nextAllowance(prev, today) {
  const count = prev && prev.day === today ? Number(prev.count) || 0 : 0;
  if (count >= MAX_PER_DAY) return { limit: true, free: false, next: { day: today, count }, freeLeft: 0 };
  const free = count < FREE_PER_DAY;
  return { limit: false, free, next: { day: today, count: count + 1 }, freeLeft: Math.max(0, FREE_PER_DAY - (count + 1)) };
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

module.exports = { FREE_PER_DAY, MAX_PER_DAY, dayOf, nextAllowance, takeSlot, giveBack };

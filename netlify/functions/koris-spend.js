const { verifyAuth, db, admin } = require("./_firebase");
const { reserveKoris, commitKoris, releaseKoris } = require("./_koris");

const FREE_RETAKE_DAYS = 30;
// Les 3 premiers tests d'un compte sont offerts (décision du 26 oct.). Un compte qui a déjà passé
// au moins 3 tests avant cette règle est considéré comme ayant utilisé son quota.
const FREE_FIRST_TESTS = 3;

/** Premiers tests offerts : seulement pour un test jamais passé, dans la limite du quota restant. */
function splitFirstFree(billableScales, lastTakenAt, freeUsed) {
  let quota = Math.max(0, FREE_FIRST_TESTS - freeUsed);
  const firstFree = [];
  const stillBillable = [];
  for (const scaleId of billableScales) {
    if (quota > 0 && !lastTakenAt[scaleId]) { firstFree.push(scaleId); quota -= 1; }
    else stillBillable.push(scaleId);
  }
  return { firstFree, stillBillable };
}

async function filterFreeRetakes(userId, scaleIds) {
  const freeScales = [];
  const billableScales = [];

  let lastTakenAt = {};
  let freeUsed = FREE_FIRST_TESTS; // lecture impossible : pas de cadeau, jamais de blocage
  try {
    const patientDoc = await db.collection("patients").doc(userId).get();
    const wallet = patientDoc.data()?.korisWallet ?? {};
    lastTakenAt = wallet.lastTakenAt ?? {};
    freeUsed = typeof wallet.freeTestsUsed === "number" ? wallet.freeTestsUsed : Object.keys(lastTakenAt).length;
  } catch {
    // If read fails, all scales are billable — never block
  }

  for (const scaleId of scaleIds) {
    const takenTs = lastTakenAt[scaleId];
    if (takenTs) {
      const takenDate = takenTs.toDate ? takenTs.toDate() : new Date(takenTs);
      const daysSince = (Date.now() - takenDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= FREE_RETAKE_DAYS) {
        freeScales.push(scaleId);
        continue;
      }
    }
    billableScales.push(scaleId);
  }

  const { firstFree, stillBillable } = splitFirstFree(billableScales, lastTakenAt, freeUsed);

  return { freeScales: [...freeScales, ...firstFree], billableScales: stillBillable, firstFree, freeUsed };
}

function buildLastTakenAtUpdate(scaleIds) {
  const update = {};
  for (const scaleId of scaleIds) {
    update[`korisWallet.lastTakenAt.${scaleId}`] = admin.firestore.FieldValue.serverTimestamp();
  }
  return update;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const user = await verifyAuth(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Non authentifié" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON invalide" }) };
  }

  const { feature, quantity = 1, scaleLastTakenMap } = body;
  if (!feature) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "feature manquant" }) };
  }

  if (feature === "test") {
    const scaleIds = scaleLastTakenMap && typeof scaleLastTakenMap === "object"
      ? Object.keys(scaleLastTakenMap)
      : [];

    if (scaleIds.length > 0) {
      const { freeScales, billableScales, firstFree, freeUsed } = await filterFreeRetakes(user.uid, scaleIds);

      if (billableScales.length === 0) {
        // All free — still write lastTakenAt for every scale so free window resets
        const upd = buildLastTakenAtUpdate(scaleIds);
        if (firstFree.length > 0) upd["korisWallet.freeTestsUsed"] = freeUsed + firstFree.length;
        await db.collection("patients").doc(user.uid).update(upd);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: false, cost: 0, free_retake: firstFree.length < scaleIds.length, free_first: firstFree.length > 0, freeScales }) };
      }

      const reservation = await reserveKoris(user.uid, feature, billableScales.length, { scaleIds: billableScales });
      if (reservation.error === "insufficient_balance") {
        return { statusCode: 402, headers, body: JSON.stringify({ error: "Pas assez d'étincelles", koris_debited: false, required: reservation.required }) };
      }

      // Atomic: lastTakenAt for ALL scales written in the same batch as the commit
      const upd = buildLastTakenAtUpdate(scaleIds);
      if (firstFree.length > 0) upd["korisWallet.freeTestsUsed"] = freeUsed + firstFree.length;
      await commitKoris(reservation.holdId, upd);

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: true, cost: reservation.cost, freeScales }) };
    }
  }

  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const reservation = await reserveKoris(user.uid, feature, qty);
  if (reservation.error === "insufficient_balance") {
    return { statusCode: 402, headers, body: JSON.stringify({ error: "Pas assez d'étincelles", koris_debited: false, required: reservation.required }) };
  }

  await commitKoris(reservation.holdId);
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: true, cost: reservation.cost }) };
};
exports._splitFirstFree = splitFirstFree;
exports.FREE_FIRST_TESTS = FREE_FIRST_TESTS;

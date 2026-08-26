const { verifyAuth } = require("./_firebase");
const { reserveKoris, commitKoris, releaseKoris } = require("./_koris");

const FREE_RETAKE_AFTER_DAYS = 30;

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

  const { feature, quantity = 1, lastTakenAt, scaleLastTakenMap } = body;
  if (!feature) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "feature manquant" }) };
  }

  if (feature === "test") {
    if (scaleLastTakenMap && typeof scaleLastTakenMap === "object") {
      let billableCount = 0;
      const freeScales = [];
      for (const [scaleId, takenAt] of Object.entries(scaleLastTakenMap)) {
        if (takenAt) {
          const daysSince = (Date.now() - new Date(takenAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince >= FREE_RETAKE_AFTER_DAYS) {
            freeScales.push(scaleId);
            continue;
          }
        }
        billableCount++;
      }

      if (billableCount === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: false, cost: 0, free_retake: true, freeScales }) };
      }

      const reservation = await reserveKoris(user.uid, feature, billableCount);
      if (reservation.error === "insufficient_balance") {
        return { statusCode: 402, headers, body: JSON.stringify({ error: "Solde Koris insuffisant", koris_debited: false, required: reservation.required }) };
      }

      await commitKoris(reservation.holdId);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: true, cost: reservation.cost, freeScales }) };
    }

    if (lastTakenAt) {
      const daysSince = (Date.now() - new Date(lastTakenAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= FREE_RETAKE_AFTER_DAYS) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: false, cost: 0, free_retake: true }) };
      }
    }
  }

  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const reservation = await reserveKoris(user.uid, feature, qty);
  if (reservation.error === "insufficient_balance") {
    return { statusCode: 402, headers, body: JSON.stringify({ error: "Solde Koris insuffisant", koris_debited: false, required: reservation.required }) };
  }

  await commitKoris(reservation.holdId);
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: true, cost: reservation.cost }) };
};

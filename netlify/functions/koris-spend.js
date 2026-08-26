const { verifyAuth } = require("./_firebase");
const { reserveKoris, commitKoris, releaseKoris } = require("./_koris");

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

  const { feature, lastTakenAt } = body;
  if (!feature) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "feature manquant" }) };
  }

  const FREE_RETAKE_AFTER_DAYS = 30;
  if (feature === "test" && lastTakenAt) {
    const daysSince = (Date.now() - new Date(lastTakenAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= FREE_RETAKE_AFTER_DAYS) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: false, cost: 0, free_retake: true }) };
    }
  }

  const reservation = await reserveKoris(user.uid, feature);
  if (reservation.error === "insufficient_balance") {
    return { statusCode: 402, headers, body: JSON.stringify({ error: "Solde Koris insuffisant", koris_debited: false }) };
  }

  await commitKoris(reservation.holdId);
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, koris_debited: true, cost: reservation.cost }) };
};

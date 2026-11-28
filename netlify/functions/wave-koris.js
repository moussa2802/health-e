/**
 * wave-koris — achat d'étincelles par Wave (remplace paytech-koris, gardé en place mais désactivé).
 * Crée la commande dans koris_orders (le serveur fixe le prix), ouvre une session Checkout Wave et renvoie
 * l'adresse de paiement Wave. Les étincelles ne sont créditées QUE par wave-webhook (notification signée).
 */
const { verifyAuth, db } = require("./_firebase");
const { KORIS_PACKS } = require("./_korisPacks");
const { waveConfig, waveReady, createWaveCheckout } = require("./_wave");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

/** Seuls les chemins internes du site sont gardés pour le retour (jamais une autre adresse). */
function safeReturnTo(v) {
  return typeof v === "string" && /^\/(?!\/)[\w\-./?=&%#]*$/.test(v) && v.length <= 200 ? v : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });

  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: "Non authentifié" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return reply(400, { error: "JSON invalide" }); }

  const pack = KORIS_PACKS[body.packId];
  if (!pack) return reply(400, { error: "Formule invalide" });

  const cfg = waveConfig();
  if (!waveReady(cfg)) {
    console.error("wave-koris : HEALTHE_RELAIS_SECRET (ou WAVE_API_KEY) ou WAVE_WEBHOOK_SECRET manquante");
    return reply(503, { error: "Le paiement Wave n'est pas encore disponible. Réessaie un peu plus tard." });
  }

  const returnTo = safeReturnTo(body.returnTo);
  const orderId = `KORIS_${user.uid}_${Date.now()}`;
  const orderRef = db.collection("koris_orders").doc(orderId);
  await orderRef.set({
    userId: user.uid,
    packId: body.packId,
    koris: pack.koris,
    price: pack.price,
    currency: "XOF",
    provider: "wave",
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  // Toujours le domaine principal : le relais du manuel n'accepte que des retours vers https://health-e.sn/.
  const siteUrl = "https://health-e.sn";
  const back = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";

  try {
    const s = await createWaveCheckout({
      cfg,
      amount: pack.price,
      clientReference: orderId,
      successUrl: `${siteUrl}/acheter-koris?success=true&order=${encodeURIComponent(orderId)}${back}`,
      errorUrl: `${siteUrl}/acheter-koris?cancelled=true${back}`,
    });
    await orderRef.update({ waveSessionId: s.sessionId, waveExpiresAt: s.expiresAt });
    return reply(200, { success: true, redirect_url: s.launchUrl, orderId });
  } catch (err) {
    console.error("wave-koris :", err.message);
    await orderRef.update({ status: "init_failed", error: String(err.message).slice(0, 200) }).catch(() => {});
    return reply(502, { error: "Wave ne répond pas pour le moment. Réessaie dans un instant." });
  }
};

exports._safeReturnTo = safeReturnTo;

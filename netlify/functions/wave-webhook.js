/**
 * wave-webhook — notifications de Wave (Business Portal › Développeurs › Webhooks), adresse :
 *   https://health-e.sn/.netlify/functions/wave-webhook
 * Événements utilisés : checkout.session.completed et checkout.session.payment_failed.
 * La signature `Wave-Signature` est vérifiée sur le corps brut ; sans signature valide, rien n'est crédité.
 * Doublons : ignorés (wave_events/{id} + état de la commande, dans une transaction).
 */
const { admin, db } = require("./_firebase");
const { waveConfig, verifyWaveSignature, rawBodyOf, headerOf, parseWaveEvent, applyWaveEvent } = require("./_wave");

const headers = { "Content-Type": "application/json" };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

async function log(entry) {
  try {
    await db.collection("payment_logs").add({ ...entry, source: "wave_webhook", receivedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (_) { /* journalisation non bloquante */ }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });

  const raw = rawBodyOf(event);
  const check = verifyWaveSignature(headerOf(event, "wave-signature"), raw, waveConfig().webhookSecrets, new Date());
  if (!check.ok) {
    console.error("wave-webhook : notification refusée :", check.reason);
    await log({ rejected: true, reason: check.reason });
    return reply(check.reason === "secret_absent" ? 503 : 401, { error: "Invalid signature" });
  }

  const parsed = parseWaveEvent(raw);
  if (!parsed.ok) return reply(400, { error: parsed.reason });
  const ev = parsed.event;

  try {
    const r = await applyWaveEvent(db, admin.firestore.FieldValue, ev);
    if (r.outcome === "rejected") {
      console.error("wave-webhook : commande refusée :", r.reason, r.orderId);
      await log({ eventId: ev.id, type: ev.type, orderId: r.orderId || null, error: r.reason });
    } else if (r.outcome === "credited") {
      console.log(`wave-webhook : ${r.koris} étincelles créditées (commande ${r.orderId})`);
    }
    // 200 dans tous les cas traités : Wave n'a pas à renvoyer (la décision est enregistrée).
    return reply(200, { received: true, outcome: r.outcome });
  } catch (err) {
    console.error("wave-webhook : erreur", err);
    // 500 : Wave renverra la notification plus tard ; l'idempotence évite tout double crédit.
    return reply(500, { error: "Internal error" });
  }
};

/**
 * Wave Business — API Checkout (https://docs.wave.com/checkout et /webhook). Repris de l'intégration du « manuel ».
 *
 * - Créer : POST /v1/checkout/sessions {amount (texte, XOF sans décimale), currency, success_url, error_url, client_reference}
 *   → wave_launch_url, à ouvrir dans le navigateur.
 * - Webhook : en-tête `Wave-Signature: t=<unix>,v1=<hex>[,v1=<hex>…]` = HMAC-SHA256(secret du webhook, t + corps brut).
 *   Rejet au-delà de 5 minutes ; plusieurs v1 possibles (rotation chez Wave) ; plusieurs secrets acceptés (rotation chez nous).
 *   Wave peut envoyer un même événement plusieurs fois : idempotence par l'`id` de l'événement ET par l'état de la commande.
 * - Seul le webhook signé crédite les étincelles. Le retour du navigateur (success_url) ne fait qu'afficher un message.
 *
 * Liste blanche IP (porteur, 27/11/2026) : le compte Wave n'accepte l'API que depuis l'IP fixe du manuel. Netlify n'a pas
 * d'IP fixe : la session est donc créée par le RELAIS du manuel (fonction relaisWaveHealthe sur lmuoff, qui sort par
 * l'IP fixe avec la clé Wave du manuel). Health-e signe sa demande avec HEALTHE_RELAIS_SECRET (même schéma que Wave).
 *
 * Variables d'environnement (Netlify, jamais dans le code ; script : scripts/wave-configurer.sh) :
 *   WAVE_WEBHOOK_SECRET    secret du webhook Wave de Health-e (wave_sn_WHS_…) ; « ancien,nouveau » pendant une rotation
 *   HEALTHE_RELAIS_SECRET  secret partagé avec le relais du manuel (même valeur des deux côtés)
 *   WAVE_RELAIS_URL        facultatif : adresse du relais (par défaut celle de lmuoff ci-dessous)
 *   WAVE_API_KEY           seulement pour un appel DIRECT à Wave (si Health-e a un jour une IP autorisée) ; sans relais
 *   WAVE_SIGNING_SECRET    facultatif, appel direct seulement : wave_sn_AKS_… si « signer les requêtes » est coché
 */
const crypto = require("crypto");

const WAVE_API = "https://api.wave.com";
const WAVE_TOLERANCE_S = 300;
const WAVE_SIGNING_OFF = "desactive";
const DEFAULT_RELAY_URL = "https://europe-west1-lmuoff.cloudfunctions.net/relaisWaveHealthe";
const RELAY_HEADER = "X-Healthe-Signature";

function waveConfig(env = process.env) {
  const signing = String(env.WAVE_SIGNING_SECRET || "").trim();
  const relaySecret = String(env.HEALTHE_RELAIS_SECRET || "").trim();
  return {
    relaySecret: relaySecret || null,
    relayUrl: relaySecret ? String(env.WAVE_RELAIS_URL || "").trim() || DEFAULT_RELAY_URL : null,
    apiKey: String(env.WAVE_API_KEY || "").trim(),
    webhookSecrets: String(env.WAVE_WEBHOOK_SECRET || "").split(",").map((s) => s.trim()).filter(Boolean),
    signingSecret: signing && signing !== WAVE_SIGNING_OFF ? signing : null,
  };
}

const hmacHex = (secret, text) => crypto.createHmac("sha256", secret).update(text, "utf8").digest("hex");

/** En-tête `Wave-Signature` pour un corps donné (requêtes signées et tests). */
function signWave(secret, rawBody, tSeconds) {
  return `t=${tSeconds},v1=${hmacHex(secret, `${tSeconds}${rawBody}`)}`;
}

/**
 * Vérifie l'en-tête `Wave-Signature` sur le corps BRUT.
 * @returns {{ ok: true } | { ok: false, reason: 'secret_absent'|'header_absent'|'header_invalid'|'expired'|'bad_signature' }}
 */
function verifyWaveSignature(header, rawBody, secrets, now = new Date(), toleranceS = WAVE_TOLERANCE_S) {
  if (!secrets || !secrets.length) return { ok: false, reason: "secret_absent" };
  if (!header || typeof header !== "string") return { ok: false, reason: "header_absent" };
  let t = null;
  const v1 = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1.push(v.toLowerCase());
  }
  if (!t || !/^\d{1,12}$/.test(t) || !v1.length) return { ok: false, reason: "header_invalid" };
  if (Math.abs(Math.floor(now.getTime() / 1000) - Number(t)) > toleranceS) return { ok: false, reason: "expired" };
  for (const secret of secrets) {
    const expected = Buffer.from(hmacHex(secret, `${t}${rawBody}`), "hex");
    for (const s of v1) {
      if (!/^[0-9a-f]{64}$/.test(s)) continue;
      const got = Buffer.from(s, "hex");
      if (got.length === expected.length && crypto.timingSafeEqual(got, expected)) return { ok: true };
    }
  }
  return { ok: false, reason: "bad_signature" };
}

/** Session Wave → état. Montant inconnu = null (jamais considéré comme conforme). */
function sessionState(s) {
  if (!s || typeof s !== "object") return { state: "unknown", amount: null, currency: null, transaction: null };
  const amount = typeof s.amount === "string" && /^\d+(\.0+)?$/.test(s.amount) ? Number(s.amount)
    : typeof s.amount === "number" && Number.isInteger(s.amount) ? s.amount : null;
  const base = {
    amount,
    currency: typeof s.currency === "string" ? s.currency : null,
    transaction: typeof s.transaction_id === "string" ? s.transaction_id : null,
  };
  if (s.payment_status === "succeeded") return { ...base, state: "paid" };
  if (s.checkout_status === "expired" || s.checkout_status === "failed" || s.payment_status === "cancelled" || s.payment_status === "failed") {
    return { ...base, state: "failed" };
  }
  return { ...base, state: "pending" };
}

/** Lit le corps brut d'un événement Netlify (Wave signe les octets exacts). */
function rawBodyOf(event) {
  const body = event && event.body ? event.body : "";
  return event && event.isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
}

function headerOf(event, name) {
  const h = (event && event.headers) || {};
  const key = Object.keys(h).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? h[key] : undefined;
}

/** Peut-on créer un paiement ? (relais configuré, ou clé directe) et recevoir sa confirmation ? */
function waveReady(cfg) {
  return Boolean(cfg && (cfg.relaySecret || cfg.apiKey) && cfg.webhookSecrets.length);
}

/** Session créée par le relais du manuel (IP fixe autorisée chez Wave). */
async function createViaRelay({ cfg, amount, clientReference, successUrl, errorUrl, fetchImpl, now }) {
  const body = JSON.stringify({ montant_fcfa: amount, reference: clientReference, url_succes: successUrl, url_echec: errorUrl });
  const res = await fetchImpl(cfg.relayUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", [RELAY_HEADER]: signWave(cfg.relaySecret, body, Math.floor(now().getTime() / 1000)) },
    body,
  });
  let json = null;
  try { json = await res.json(); } catch { /* corps vide ou non JSON */ }
  if (res.status < 200 || res.status >= 300) {
    const detail = json ? [json.erreur, json.raison, json.code, json.statut_wave].filter(Boolean).join(" / ") : "";
    const err = new Error(`Relais Wave : ${res.status}${detail ? ` (${detail})` : ""}`);
    err.status = res.status;
    throw err;
  }
  if (!json || !json.id || typeof json.wave_launch_url !== "string" || !/^https:\/\//.test(json.wave_launch_url)) {
    throw new Error("Réponse du relais incomplète (id ou wave_launch_url)");
  }
  return { sessionId: json.id, launchUrl: json.wave_launch_url, expiresAt: json.when_expires || null };
}

/** Crée une session Checkout Wave (par le relais s'il est configuré, sinon en direct). Lève une erreur lisible en cas d'échec. */
async function createWaveCheckout({ cfg, amount, clientReference, successUrl, errorUrl, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("montant invalide");
  if (cfg && cfg.relaySecret && cfg.relayUrl) return createViaRelay({ cfg, amount, clientReference, successUrl, errorUrl, fetchImpl, now });
  if (!cfg || !cfg.apiKey) throw new Error("WAVE_API_KEY absente");
  const body = JSON.stringify({
    amount: String(amount),
    currency: "XOF",
    success_url: successUrl,
    error_url: errorUrl,
    client_reference: clientReference,
  });
  const headers = { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" };
  if (cfg.signingSecret) headers["Wave-Signature"] = signWave(cfg.signingSecret, body, Math.floor(now().getTime() / 1000));
  const res = await fetchImpl(`${WAVE_API}/v1/checkout/sessions`, { method: "POST", headers, body });
  let json = null;
  try { json = await res.json(); } catch { /* corps vide ou non JSON */ }
  if (res.status < 200 || res.status >= 300) {
    const err = new Error(`Wave a répondu ${res.status}${json && json.code ? ` (${json.code})` : ""}`);
    err.status = res.status;
    throw err;
  }
  if (!json || !json.id || typeof json.wave_launch_url !== "string" || !/^https:\/\//.test(json.wave_launch_url)) {
    throw new Error("Réponse Wave incomplète (id ou wave_launch_url)");
  }
  return { sessionId: json.id, launchUrl: json.wave_launch_url, expiresAt: json.when_expires || null };
}

/** Analyse l'événement (déjà signé). */
function parseWaveEvent(rawBody) {
  let ev;
  try { ev = JSON.parse(rawBody); } catch { return { ok: false, reason: "invalid_json" }; }
  if (!ev || typeof ev.id !== "string" || !ev.id || typeof ev.type !== "string") return { ok: false, reason: "invalid_event" };
  return { ok: true, event: ev };
}

const HANDLED_TYPES = ["checkout.session.completed", "checkout.session.payment_failed"];

/**
 * Applique un événement Wave signé sur la commande d'étincelles. Tout se fait dans UNE transaction Firestore :
 * un doublon (même événement, ou commande déjà créditée) ne crédite jamais deux fois.
 * @param {FirebaseFirestore.Firestore} db
 * @param {{ increment: (n:number)=>any, serverTimestamp: ()=>any }} FieldValue
 * @returns {Promise<{ outcome: 'credited'|'duplicate'|'ignored'|'failed'|'rejected', reason?: string, orderId?: string, userId?: string, koris?: number }>}
 */
async function applyWaveEvent(db, FieldValue, ev) {
  if (!HANDLED_TYPES.includes(ev.type)) return { outcome: "ignored", reason: `type ${ev.type}` };
  const data = ev.data || {};
  const orderId = typeof data.client_reference === "string" && data.client_reference ? data.client_reference : null;
  if (!orderId || orderId.includes("/")) return { outcome: "rejected", reason: "no_reference" };

  const evRef = db.collection("wave_events").doc(ev.id);
  const orderRef = db.collection("koris_orders").doc(orderId);
  const st = sessionState(data);
  const failedEvent = ev.type === "checkout.session.payment_failed" || st.state !== "paid";

  return db.runTransaction(async (tx) => {
    // Lectures d'abord (règle des transactions Firestore), écritures ensuite.
    const evSnap = await tx.get(evRef);
    if (evSnap.exists) return { outcome: "duplicate", reason: "event_already_processed", orderId };
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.exists ? orderSnap.data() : null;

    const record = (outcome, reason, extra = {}) => tx.set(evRef, {
      type: ev.type, orderId, sessionId: typeof data.id === "string" ? data.id : null,
      outcome, reason: reason || null, amount: st.amount, currency: st.currency,
      transactionId: st.transaction, processedAt: FieldValue.serverTimestamp(), ...extra,
    });

    if (!order) { record("rejected", "order_not_found"); return { outcome: "rejected", reason: "order_not_found", orderId }; }
    if (order.status === "completed") { record("duplicate", "order_already_completed"); return { outcome: "duplicate", reason: "order_already_completed", orderId }; }
    if (order.provider !== "wave") { record("rejected", "wrong_provider"); return { outcome: "rejected", reason: "wrong_provider", orderId }; }
    if (order.waveSessionId && typeof data.id === "string" && data.id !== order.waveSessionId) {
      record("rejected", "session_mismatch"); return { outcome: "rejected", reason: "session_mismatch", orderId };
    }

    if (failedEvent) {
      if (order.status === "pending") tx.update(orderRef, { status: "failed", failedAt: new Date().toISOString() });
      record("failed", "payment_not_succeeded");
      return { outcome: "failed", reason: "payment_not_succeeded", orderId };
    }

    const price = Number(order.price);
    if (st.amount === null || st.amount !== price || (st.currency !== null && st.currency !== "XOF")) {
      const reason = "amount_mismatch";
      tx.update(orderRef, { anomaly: `${reason}: reçu ${st.amount ?? "?"} ${st.currency ?? ""} ≠ ${price} XOF` });
      record("rejected", reason);
      return { outcome: "rejected", reason, orderId };
    }

    const userId = String(order.userId);
    const koris = Number(order.koris);
    const patientRef = db.collection("patients").doc(userId);
    const patientSnap = await tx.get(patientRef);
    const balanceBefore = (patientSnap.exists && patientSnap.data()?.korisWallet?.balance) || 0;

    tx.set(patientRef, { korisWallet: { balance: FieldValue.increment(koris) } }, { merge: true });
    tx.set(patientRef.collection("korisHistory").doc(), {
      type: "purchase",
      amount: koris,
      feature: "purchase",
      balanceBefore,
      balanceAfter: balanceBefore + koris,
      timestamp: new Date().toISOString(),
      details: `Achat de ${koris.toLocaleString("fr-FR")} étincelles (${price} FCFA, Wave)`,
    });
    tx.set(db.collection("stats").doc("koris"), {
      totalRefilled: FieldValue.increment(koris),
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.update(orderRef, {
      status: "completed",
      completedAt: new Date().toISOString(),
      waveTransactionId: st.transaction,
      paidAmount: st.amount,
    });
    record("credited", null, { userId, koris });
    return { outcome: "credited", orderId, userId, koris };
  });
}

module.exports = {
  WAVE_API,
  WAVE_TOLERANCE_S,
  waveConfig,
  waveReady,
  DEFAULT_RELAY_URL,
  signWave,
  verifyWaveSignature,
  sessionState,
  rawBodyOf,
  headerOf,
  createWaveCheckout,
  parseWaveEvent,
  applyWaveEvent,
};

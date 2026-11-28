// Lancer : node --test netlify/functions/_tests/wave.test.js
// Aucune vraie clé, aucun appel à Wave, aucune base réelle : une petite base en mémoire remplace Firestore.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../_wave");
const { KORIS_PACKS } = require("../_korisPacks");

const SECRET = "wave_sn_WHS_testsecret0000000000";
const NOW = new Date("2026-11-27T12:00:00Z");
const T = Math.floor(NOW.getTime() / 1000);

// ── Base Firestore en mémoire (juste ce qu'utilise applyWaveEvent) ──
function fakeDb(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, structuredClone(v)]));
  let auto = 0;
  const isInc = (v) => v && typeof v === "object" && "__inc" in v;
  const isTs = (v) => v && typeof v === "object" && v.__ts === true;
  const merge = (base, patch) => {
    const out = { ...(base || {}) };
    for (const [k, v] of Object.entries(patch)) {
      if (isInc(v)) out[k] = (Number(out[k]) || 0) + v.__inc;
      else if (isTs(v)) out[k] = "TS";
      else if (v && typeof v === "object" && !Array.isArray(v)) out[k] = merge(out[k], v);
      else out[k] = v;
    }
    return out;
  };
  const docRef = (path) => ({
    path,
    collection: (name) => colRef(`${path}/${name}`),
  });
  const colRef = (path) => ({ doc: (id) => docRef(`${path}/${id || `auto${++auto}`}`) });
  const snap = (path) => ({ exists: store.has(path), data: () => structuredClone(store.get(path)) });
  const write = {
    set: (ref, data, opts) => store.set(ref.path, opts && opts.merge ? merge(store.get(ref.path), data) : merge({}, data)),
    update: (ref, data) => {
      if (!store.has(ref.path)) throw new Error(`NOT_FOUND ${ref.path}`);
      store.set(ref.path, merge(store.get(ref.path), data));
    },
  };
  return {
    store,
    collection: colRef,
    async runTransaction(fn) {
      const pending = [];
      const tx = {
        get: async (ref) => snap(ref.path),
        set: (ref, d, o) => { pending.push(() => write.set(ref, d, o)); return tx; },
        update: (ref, d) => { pending.push(() => write.update(ref, d)); return tx; },
      };
      const r = await fn(tx);
      pending.forEach((w) => w()); // écritures appliquées ensemble à la fin, comme Firestore
      return r;
    },
  };
}
const FieldValue = { increment: (n) => ({ __inc: n }), serverTimestamp: () => ({ __ts: true }) };

const ORDER_ID = "KORIS_user1_1764244800000";
const pack = KORIS_PACKS.pack_populaire;
const baseDb = (order = {}) => fakeDb({
  [`koris_orders/${ORDER_ID}`]: { userId: "user1", packId: "pack_populaire", koris: pack.koris, price: pack.price, currency: "XOF", provider: "wave", status: "pending", waveSessionId: "cos-1", ...order },
  "patients/user1": { korisWallet: { balance: 4 } },
});
const completed = (over = {}, dataOver = {}) => ({
  id: "EV_1", type: "checkout.session.completed",
  data: { id: "cos-1", amount: "1000", currency: "XOF", client_reference: ORDER_ID, checkout_status: "complete", payment_status: "succeeded", transaction_id: "TCN_1", ...dataOver },
  ...over,
});

// ── Signature ──
test("signature : valide acceptée, y compris plusieurs v1 (rotation Wave) et plusieurs secrets (rotation chez nous)", () => {
  const body = JSON.stringify(completed());
  assert.deepEqual(W.verifyWaveSignature(W.signWave(SECRET, body, T), body, [SECRET], NOW), { ok: true });
  const twoV1 = `${W.signWave("autre", body, T)},v1=${W.signWave(SECRET, body, T).split("v1=")[1]}`;
  assert.equal(W.verifyWaveSignature(twoV1, body, [SECRET], NOW).ok, true);
  assert.equal(W.verifyWaveSignature(W.signWave(SECRET, body, T), body, ["ancien", SECRET], NOW).ok, true);
});

test("signature : fausse, corps modifié, mauvais secret, trop vieille, absente ou sans secret → refusée", () => {
  const body = JSON.stringify(completed());
  const sig = W.signWave(SECRET, body, T);
  assert.equal(W.verifyWaveSignature(`t=${T},v1=${"0".repeat(64)}`, body, [SECRET], NOW).reason, "bad_signature");
  assert.equal(W.verifyWaveSignature(sig, body.replace('"1000"', '"10"'), [SECRET], NOW).reason, "bad_signature");
  assert.equal(W.verifyWaveSignature(W.signWave("pas-le-bon", body, T), body, [SECRET], NOW).reason, "bad_signature");
  assert.equal(W.verifyWaveSignature(W.signWave(SECRET, body, T - 301), body, [SECRET], NOW).reason, "expired");
  assert.equal(W.verifyWaveSignature(undefined, body, [SECRET], NOW).reason, "header_absent");
  assert.equal(W.verifyWaveSignature("n'importe quoi", body, [SECRET], NOW).reason, "header_invalid");
  assert.equal(W.verifyWaveSignature(sig, body, [], NOW).reason, "secret_absent");
});

test("configuration : secrets séparés par des virgules, signature des requêtes désactivable", () => {
  const c = W.waveConfig({ WAVE_API_KEY: " k ", WAVE_WEBHOOK_SECRET: "a, b,", WAVE_SIGNING_SECRET: "desactive" });
  assert.deepEqual(c, { relaySecret: null, relayUrl: null, apiKey: "k", webhookSecrets: ["a", "b"], signingSecret: null });
  assert.equal(W.waveConfig({}).webhookSecrets.length, 0);
  const r = W.waveConfig({ HEALTHE_RELAIS_SECRET: "s", WAVE_WEBHOOK_SECRET: "w" });
  assert.equal(r.relayUrl, W.DEFAULT_RELAY_URL);
  assert.equal(W.waveReady(r), true); // relais sans clé Wave directe : suffisant
  assert.equal(W.waveReady(W.waveConfig({ HEALTHE_RELAIS_SECRET: "s" })), false); // sans secret de webhook : non
  assert.equal(W.waveReady(W.waveConfig({ WAVE_WEBHOOK_SECRET: "w" })), false);
});

test("corps brut : en-tête trouvé quelle que soit la casse, corps Base64 décodé", () => {
  const ev = { headers: { "Wave-Signature": "x" }, body: Buffer.from("{}").toString("base64"), isBase64Encoded: true };
  assert.equal(W.headerOf(ev, "wave-signature"), "x");
  assert.equal(W.rawBodyOf(ev), "{}");
});

// ── Crédit des étincelles ──
test("paiement confirmé : étincelles créditées une fois, commande terminée", async () => {
  const db = baseDb();
  const r = await W.applyWaveEvent(db, FieldValue, completed());
  assert.equal(r.outcome, "credited");
  assert.equal(db.store.get("patients/user1").korisWallet.balance, 4 + pack.koris);
  assert.equal(db.store.get(`koris_orders/${ORDER_ID}`).status, "completed");
  assert.equal(db.store.get(`koris_orders/${ORDER_ID}`).waveTransactionId, "TCN_1");
  assert.equal(db.store.get("stats/koris").totalRefilled, pack.koris);
  assert.equal(db.store.get("wave_events/EV_1").outcome, "credited");
  const history = [...db.store.keys()].filter((k) => k.startsWith("patients/user1/korisHistory/"));
  assert.equal(history.length, 1);
});

test("doublon : même événement renvoyé, ou autre événement pour une commande déjà payée → aucun second crédit", async () => {
  const db = baseDb();
  await W.applyWaveEvent(db, FieldValue, completed());
  assert.equal((await W.applyWaveEvent(db, FieldValue, completed())).outcome, "duplicate");
  const again = await W.applyWaveEvent(db, FieldValue, completed({ id: "EV_2" }));
  assert.equal(again.outcome, "duplicate");
  assert.equal(again.reason, "order_already_completed");
  assert.equal(db.store.get("patients/user1").korisWallet.balance, 4 + pack.koris);
});

test("montant : inférieur, supérieur, absent ou autre devise → refusé, rien n'est crédité", async () => {
  for (const data of [{ amount: "100" }, { amount: "5000" }, { amount: undefined }, { amount: "1000", currency: "EUR" }, { amount: "1000,5" }]) {
    const db = baseDb();
    const r = await W.applyWaveEvent(db, FieldValue, completed({}, data));
    assert.equal(r.outcome, "rejected", JSON.stringify(data));
    assert.equal(r.reason, "amount_mismatch");
    assert.equal(db.store.get("patients/user1").korisWallet.balance, 4);
    assert.equal(db.store.get(`koris_orders/${ORDER_ID}`).status, "pending");
    assert.match(db.store.get(`koris_orders/${ORDER_ID}`).anomaly, /amount_mismatch/);
  }
  // "1000.00" est bien 1000 XOF
  assert.equal((await W.applyWaveEvent(baseDb(), FieldValue, completed({}, { amount: "1000.00" }))).outcome, "credited");
});

test("commande inconnue, autre session Wave, ancienne commande PayTech ou sans référence → refusé", async () => {
  assert.equal((await W.applyWaveEvent(baseDb(), FieldValue, completed({}, { client_reference: "KORIS_x_1" }))).reason, "order_not_found");
  assert.equal((await W.applyWaveEvent(baseDb(), FieldValue, completed({}, { id: "cos-autre" }))).reason, "session_mismatch");
  assert.equal((await W.applyWaveEvent(baseDb({ provider: undefined }), FieldValue, completed())).reason, "wrong_provider");
  assert.equal((await W.applyWaveEvent(baseDb(), FieldValue, completed({}, { client_reference: undefined }))).reason, "no_reference");
  assert.equal((await W.applyWaveEvent(baseDb(), FieldValue, completed({}, { client_reference: "a/b" }))).reason, "no_reference");
});

test("paiement échoué ou session non payée : commande marquée échouée, rien crédité ; autres événements ignorés", async () => {
  const db = baseDb();
  const r = await W.applyWaveEvent(db, FieldValue, completed({ type: "checkout.session.payment_failed" }, { payment_status: "failed" }));
  assert.equal(r.outcome, "failed");
  assert.equal(db.store.get(`koris_orders/${ORDER_ID}`).status, "failed");
  assert.equal(db.store.get("patients/user1").korisWallet.balance, 4);
  const db2 = baseDb();
  assert.equal((await W.applyWaveEvent(db2, FieldValue, completed({}, { payment_status: "processing" }))).outcome, "failed");
  assert.equal(db2.store.get("patients/user1").korisWallet.balance, 4);
  assert.equal((await W.applyWaveEvent(baseDb(), FieldValue, { id: "EV_9", type: "merchant.payment_received", data: {} })).outcome, "ignored");
});

test("événement mal formé → refusé avant tout traitement", () => {
  assert.equal(W.parseWaveEvent("pas du json").reason, "invalid_json");
  assert.equal(W.parseWaveEvent(JSON.stringify({ type: "x" })).reason, "invalid_event");
  assert.equal(W.parseWaveEvent(JSON.stringify(completed())).ok, true);
});

// ── Création de la session (Wave simulé, aucun appel réseau) ──
test("création : montant en texte XOF, référence = commande, adresse Wave renvoyée", async () => {
  let sent;
  const fetchImpl = async (url, init) => { sent = { url, init }; return { status: 200, json: async () => ({ id: "cos-1", wave_launch_url: "https://pay.wave.com/c/cos-1", when_expires: "2026-11-27T12:30:00Z" }) }; };
  const r = await W.createWaveCheckout({ cfg: { apiKey: "k", webhookSecrets: [], signingSecret: null }, amount: 1000, clientReference: ORDER_ID, successUrl: "https://health-e.sn/ok", errorUrl: "https://health-e.sn/ko", fetchImpl });
  assert.equal(sent.url, "https://api.wave.com/v1/checkout/sessions");
  assert.equal(sent.init.headers.Authorization, "Bearer k");
  assert.equal(sent.init.headers["Wave-Signature"], undefined);
  assert.deepEqual(JSON.parse(sent.init.body), { amount: "1000", currency: "XOF", success_url: "https://health-e.sn/ok", error_url: "https://health-e.sn/ko", client_reference: ORDER_ID });
  assert.deepEqual(r, { sessionId: "cos-1", launchUrl: "https://pay.wave.com/c/cos-1", expiresAt: "2026-11-27T12:30:00Z" });
});

test("création : requête signée si WAVE_SIGNING_SECRET est posé ; erreur Wave ou réponse incomplète → exception", async () => {
  let h;
  const ok = async (_u, init) => { h = init.headers; return { status: 200, json: async () => ({ id: "c", wave_launch_url: "https://pay.wave.com/c" }) }; };
  await W.createWaveCheckout({ cfg: { apiKey: "k", signingSecret: "wave_sn_AKS_x" }, amount: 500, clientReference: "r", successUrl: "https://a", errorUrl: "https://b", fetchImpl: ok, now: () => NOW });
  assert.match(h["Wave-Signature"], new RegExp(`^t=${T},v1=[0-9a-f]{64}$`));
  await assert.rejects(W.createWaveCheckout({ cfg: { apiKey: "k" }, amount: 500, clientReference: "r", successUrl: "https://a", errorUrl: "https://b", fetchImpl: async () => ({ status: 401, json: async () => ({ code: "no-matching-api-key" }) }) }), /401/);
  await assert.rejects(W.createWaveCheckout({ cfg: { apiKey: "k" }, amount: 500, clientReference: "r", successUrl: "https://a", errorUrl: "https://b", fetchImpl: async () => ({ status: 200, json: async () => ({ id: "c", wave_launch_url: "http://faux" }) }) }), /incomplète/);
  await assert.rejects(W.createWaveCheckout({ cfg: { apiKey: "" }, amount: 500, clientReference: "r", successUrl: "a", errorUrl: "b" }), /WAVE_API_KEY/);
});

// ── Création par le relais du manuel (IP fixe autorisée chez Wave) ──
const RELAY_SECRET = "relais-fictif-0000000000000000000000";
const relayCfg = W.waveConfig({ HEALTHE_RELAIS_SECRET: RELAY_SECRET, WAVE_WEBHOOK_SECRET: SECRET, WAVE_API_KEY: "k-ignoree" });

test("relais : demande signée vers le manuel, jamais d'appel direct à Wave", async () => {
  let sent;
  const fetchImpl = async (url, init) => { sent = { url, init }; return { status: 200, json: async () => ({ id: "cos-9", wave_launch_url: "https://pay.wave.com/c/cos-9", when_expires: null }) }; };
  const r = await W.createWaveCheckout({ cfg: relayCfg, amount: 2500, clientReference: ORDER_ID, successUrl: "https://health-e.sn/ok", errorUrl: "https://health-e.sn/ko", fetchImpl, now: () => NOW });
  assert.equal(sent.url, "https://europe-west1-lmuoff.cloudfunctions.net/relaisWaveHealthe");
  assert.deepEqual(JSON.parse(sent.init.body), { montant_fcfa: 2500, reference: ORDER_ID, url_succes: "https://health-e.sn/ok", url_echec: "https://health-e.sn/ko" });
  assert.equal(sent.init.headers.Authorization, undefined); // la clé Wave ne quitte jamais Health-e par le relais
  // La signature est celle que le relais vérifie (même schéma que Wave) :
  assert.deepEqual(W.verifyWaveSignature(sent.init.headers["X-Healthe-Signature"], sent.init.body, [RELAY_SECRET], NOW), { ok: true });
  assert.deepEqual(r, { sessionId: "cos-9", launchUrl: "https://pay.wave.com/c/cos-9", expiresAt: null });
});

test("relais : refus (signature, IP Wave…) ou réponse incomplète → exception lisible", async () => {
  const base = { cfg: relayCfg, amount: 500, clientReference: ORDER_ID, successUrl: "https://health-e.sn/a", errorUrl: "https://health-e.sn/b", now: () => NOW };
  await assert.rejects(W.createWaveCheckout({ ...base, fetchImpl: async () => ({ status: 502, json: async () => ({ erreur: "wave_refus", statut_wave: 403, code: "ip-not-allowed" }) }) }), /502 \(wave_refus \/ ip-not-allowed \/ 403\)/);
  await assert.rejects(W.createWaveCheckout({ ...base, fetchImpl: async () => ({ status: 401, json: async () => ({ erreur: "signature", raison: "signature_fausse" }) }) }), /401/);
  await assert.rejects(W.createWaveCheckout({ ...base, fetchImpl: async () => ({ status: 200, json: async () => ({ id: "x" }) }) }), /incomplète/);
});

test("formules : mêmes prix qu'avant (500, 1000, 2500, 5000 F)", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(KORIS_PACKS).map(([k, p]) => [k, [p.koris, p.price]])), {
    pack_decouverte: [25, 500], pack_populaire: [55, 1000], pack_confort: [150, 2500], pack_grand: [350, 5000],
  });
});

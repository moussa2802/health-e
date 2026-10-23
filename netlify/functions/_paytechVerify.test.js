// Lancer : node --test netlify/functions/_paytechVerify.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { verifyPaytechIpn, parseCustomField } = require("./_paytechVerify");

const keys = { apiKey: "KEY123", apiSecret: "SECRET456" };
const hmac = (amount, ref) => crypto.createHmac("sha256", keys.apiSecret).update(`${amount}|${ref}|${keys.apiKey}`).digest("hex");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

test("HMAC valide (item_price ou final_item_price)", () => {
  assert.deepEqual(verifyPaytechIpn({ ref_command: "K1", item_price: "1000", hmac_compute: hmac("1000", "K1") }, keys), { ok: true, method: "hmac" });
  assert.equal(verifyPaytechIpn({ ref_command: "K1", item_price: "1000", final_item_price: "900", hmac_compute: hmac("900", "K1") }, keys).ok, true);
});

test("HMAC falsifié, montant ou référence modifiés : refusé", () => {
  assert.equal(verifyPaytechIpn({ ref_command: "K1", item_price: "1000", hmac_compute: "deadbeef" }, keys).ok, false);
  assert.equal(verifyPaytechIpn({ ref_command: "K2", item_price: "1000", hmac_compute: hmac("1000", "K1") }, keys).ok, false);
  assert.equal(verifyPaytechIpn({ ref_command: "K1", item_price: "5000", hmac_compute: hmac("1000", "K1") }, keys).ok, false);
});

test("repli SHA256", () => {
  assert.equal(verifyPaytechIpn({ api_key_sha256: sha("KEY123"), api_secret_sha256: sha("SECRET456") }, keys).ok, true);
  assert.equal(verifyPaytechIpn({ api_key_sha256: sha("KEY123"), api_secret_sha256: sha("autre") }, keys).ok, false);
});

test("sans signature ou sans clés : refusé", () => {
  assert.equal(verifyPaytechIpn({ type_event: "sale_complete", ref_command: "K1", item_price: "1000" }, keys).reason, "no_signature");
  assert.equal(verifyPaytechIpn({ hmac_compute: "x" }, {}).reason, "missing_keys");
});

test("custom_field en JSON ou en Base64", () => {
  const obj = { paymentType: "koris_purchase", orderId: "K1" };
  assert.deepEqual(parseCustomField(JSON.stringify(obj)), obj);
  assert.deepEqual(parseCustomField(Buffer.from(JSON.stringify(obj)).toString("base64")), obj);
  assert.deepEqual(parseCustomField("n'importe quoi"), {});
});

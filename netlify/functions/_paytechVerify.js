/**
 * Vérification des notifications IPN de PayTech (documentation officielle : https://docs.intech.sn/doc_paytech.php).
 *  1. Méthode recommandée : `hmac_compute` = HMAC-SHA256(API_SECRET, "montant|ref_command|API_KEY") en hexadécimal.
 *     Le montant est `final_item_price` (après promotion) ou, à défaut, `item_price`.
 *  2. Repli : `api_key_sha256` et `api_secret_sha256` = SHA256 de nos clés.
 * Sans preuve valide, la notification est refusée : personne ne peut créditer des Koris
 * ou valider une réservation en appelant l'URL IPN à la main.
 */
const crypto = require("crypto");

function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a.trim().toLowerCase(), "utf8");
  const y = Buffer.from(b.trim().toLowerCase(), "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

/**
 * @param {Record<string, any>} body  notification reçue (déjà décodée)
 * @param {{ apiKey?: string, apiSecret?: string }} keys
 * @returns {{ ok: boolean, method?: 'hmac'|'sha256', reason?: string }}
 */
function verifyPaytechIpn(body, keys) {
  const apiKey = keys && keys.apiKey;
  const apiSecret = keys && keys.apiSecret;
  if (!apiKey || !apiSecret) return { ok: false, reason: "missing_keys" };
  if (!body || typeof body !== "object") return { ok: false, reason: "empty" };

  if (body.hmac_compute) {
    const ref = body.ref_command;
    const amounts = [body.final_item_price, body.item_price].filter((v) => v !== undefined && v !== null && v !== "");
    for (const amount of amounts) {
      const expected = crypto.createHmac("sha256", apiSecret).update(`${amount}|${ref}|${apiKey}`).digest("hex");
      if (safeEqualHex(expected, String(body.hmac_compute))) return { ok: true, method: "hmac" };
    }
    return { ok: false, reason: "bad_hmac" };
  }

  if (body.api_key_sha256 && body.api_secret_sha256) {
    const ok = safeEqualHex(sha256(apiKey), String(body.api_key_sha256))
      && safeEqualHex(sha256(apiSecret), String(body.api_secret_sha256));
    return ok ? { ok: true, method: "sha256" } : { ok: false, reason: "bad_sha256" };
  }

  return { ok: false, reason: "no_signature" };
}

/** `custom_field` peut arriver en JSON brut ou encodé en Base64 (selon la doc PayTech). */
function parseCustomField(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { /* essai Base64 */ }
  try { return JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")); } catch { return {}; }
}

module.exports = { verifyPaytechIpn, parseCustomField };

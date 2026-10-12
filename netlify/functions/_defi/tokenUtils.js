const crypto = require('crypto');

function createStartToken(slug, deviceId, secret) {
  const payload = JSON.stringify({ slug, deviceId, t0: Date.now() });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifyStartToken(token, secret, expectedSlug, expectedDeviceId) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch { return null; }

  if (payload.slug !== expectedSlug) return null;
  if (payload.deviceId !== expectedDeviceId) return null;
  if (Date.now() - payload.t0 > 15 * 60 * 1000) return null;

  return payload;
}

module.exports = { createStartToken, verifyStartToken };

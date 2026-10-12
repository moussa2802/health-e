const { db } = require('./_firebase');
const { createStartToken } = require('./_defi/tokenUtils');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secret = process.env.DEFI_TOKEN_SECRET;
  if (!secret) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Service temporairement indisponible' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  try {
    const { slug, deviceId } = payload;

    if (!slug || typeof slug !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'slug requis' }) };
    }
    if (!deviceId || !UUID_RE.test(deviceId)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'deviceId invalide (UUID v4 attendu)' }) };
    }

    const defiDoc = await db.collection('defis').doc(slug).get();
    if (!defiDoc.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Défi introuvable' }) };
    }

    const defi = defiDoc.data();
    const expiresAt = defi.expiresAt?.toDate ? defi.expiresAt.toDate() : new Date(defi.expiresAt);
    if (expiresAt <= new Date()) {
      return { statusCode: 410, headers, body: JSON.stringify({ error: 'Ce défi est terminé' }) };
    }

    const startToken = createStartToken(slug, deviceId, secret);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ startToken, expiresIn: 900 }),
    };
  } catch (err) {
    console.error('defi-start error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

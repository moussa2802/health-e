const crypto = require('crypto');
const { admin, db } = require('./_firebase');
const { moderateMessage } = require('./_defi/moderation');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_LIMIT = 10;

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  try {
    const { slug, deviceId, texte } = payload;

    if (!slug || typeof slug !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Slug manquant' }) };
    }
    if (!deviceId || !UUID_RE.test(deviceId)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'deviceId invalide' }) };
    }
    if (typeof texte !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Texte manquant' }) };
    }

    const trimmed = texte.trim();

    const defiDoc = await db.collection('defis').doc(slug).get();
    if (!defiDoc.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Défi introuvable' }) };
    }
    const defi = defiDoc.data();

    if (defi.petitsMots === false) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Les petits mots ne sont pas activés pour ce défi' }) };
    }

    const expiresAt = defi.expiresAt?.toDate ? defi.expiresAt.toDate() : new Date(defi.expiresAt);
    if (expiresAt <= new Date()) {
      return { statusCode: 410, headers, body: JSON.stringify({ error: 'Ce défi est terminé' }) };
    }

    const deviceHash = sha256(deviceId);
    const responseId = `${slug}_${deviceHash}`;
    const responseDoc = await db.collection('defi_reponses').doc(responseId).get();
    if (!responseDoc.exists) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Tu dois d\'abord répondre au défi' }) };
    }
    const pseudo = responseDoc.data().pseudo || 'Anonyme';

    const privateDoc = await db.collection('defis_private').doc(slug).get();
    if (!privateDoc.exists) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Données du défi incomplètes' }) };
    }
    const creatorUid = privateDoc.data().uid;

    const msgId = `${slug}_${deviceHash}`;
    const msgRef = db.collection('userProfiles').doc(creatorUid).collection('defiMessages').doc(msgId);
    const existingMsg = await msgRef.get();
    if (existingMsg.exists) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Tu as déjà envoyé un petit mot pour ce défi' }) };
    }

    const modResult = await moderateMessage(trimmed, db);
    if (!modResult.ok) {
      const reasons = {
        length: 'Le message doit faire entre 1 et 200 caractères',
        url: 'Les liens ne sont pas autorisés',
        phone: 'Les numéros de téléphone ne sont pas autorisés',
        social: 'Les identifiants de réseaux sociaux ne sont pas autorisés',
        banned_word: 'Le message contient un mot inapproprié',
      };
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: reasons[modResult.reason] || 'Message invalide' }),
      };
    }

    const clientIp = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || '0.0.0.0').split(',')[0].trim();
    const hourBucket = Math.floor(Date.now() / 3600000);
    const rateLimitId = `msg_${sha256(clientIp)}_${hourBucket}`;
    const rateLimitRef = db.collection('rate_limits').doc(rateLimitId);
    const rateLimitDoc = await rateLimitRef.get();
    if (rateLimitDoc.exists && (rateLimitDoc.data().count || 0) >= RATE_LIMIT) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de messages envoyés. Réessaie dans une heure.' }) };
    }

    await msgRef.set({
      slug,
      pseudo,
      texte: trimmed,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      masque: false,
      signale: false,
    });

    if (rateLimitDoc.exists) {
      await rateLimitRef.update({ count: admin.firestore.FieldValue.increment(1) });
    } else {
      await rateLimitRef.set({ count: 1, expireAt: new Date(Date.now() + 2 * 3600000) });
    }

    try {
      await db.collection('notifications').add({
        userId: creatorUid,
        type: 'defi_message',
        title: 'Nouveau petit mot 💌',
        content: `${pseudo} t'a laissé un petit mot sur ton défi`,
        sourceId: slug,
        sourceType: 'defi',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        priority: 'low',
      });
    } catch (notifErr) {
      console.warn('defi-message notification error (non-blocking):', notifErr.message);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('defi-message error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

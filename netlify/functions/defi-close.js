const { admin, db, verifyAuth } = require('./_firebase');
const { getActiveDefis } = require('./_defi/activeDefisHelper');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = await verifyAuth(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { slug } = payload;
  if (!slug || typeof slug !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Slug manquant' }) };
  }

  try {
    const now = admin.firestore.Timestamp.now();

    await db.runTransaction(async (tx) => {
      const privateRef = db.collection('defis_private').doc(slug);
      const privateDoc = await tx.get(privateRef);

      if (!privateDoc.exists) {
        throw new Error('NOT_FOUND');
      }
      if (privateDoc.data().uid !== user.uid) {
        throw new Error('FORBIDDEN');
      }

      const defiRef = db.collection('defis').doc(slug);
      const defiDoc = await tx.get(defiRef);

      const profileRef = db.collection('userProfiles').doc(user.uid);
      const profileDoc = await tx.get(profileRef);

      if (defiDoc.exists) {
        tx.update(defiRef, { expiresAt: now, statut: 'termine' });
      }
      tx.update(privateRef, { expiresAt: now, statut: 'termine' });

      if (profileDoc.exists) {
        const profile = profileDoc.data();
        const activeDefis = getActiveDefis(profile);
        const remaining = activeDefis.filter(ad => ad.slug !== slug);
        tx.update(profileRef, {
          activeDefis: remaining.map(ad => ({
            slug: ad.slug, titre: ad.titre, audience: ad.audience, expiresAt: ad.expiresAt,
          })),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Défi introuvable' }) };
    }
    if (err.message === 'FORBIDDEN') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Tu ne peux terminer que tes propres défis' }) };
    }
    console.error('defi-close error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

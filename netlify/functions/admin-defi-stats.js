const { db, verifyAuth } = require('./_firebase');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = await verifyAuth(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists || userDoc.data().type !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs' }) };
  }

  try {
    const defisSnap = await db.collection('defis').get();
    let totalDefis = 0;
    let totalReponses = 0;
    let activeDefis = 0;
    const now = new Date();

    defisSnap.forEach(doc => {
      const d = doc.data();
      if (d.isTest) return;
      totalDefis++;
      totalReponses += d.nbReponses || 0;
      const exp = d.expiresAt?.toDate ? d.expiresAt.toDate() : new Date(d.expiresAt);
      if (exp > now) activeDefis++;
    });

    const profilesSnap = await db.collection('userProfiles')
      .where('acquisition', '>=', 'defi:')
      .where('acquisition', '<', 'defi;')
      .get();
    const inscriptionsViaDefi = profilesSnap.size;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDefis,
        totalReponses,
        activeDefis,
        moyenneReponses: totalDefis > 0 ? Math.round(totalReponses / totalDefis * 10) / 10 : 0,
        inscriptionsViaDefi,
      }),
    };
  } catch (err) {
    console.error('admin-defi-stats error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

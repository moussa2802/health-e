/**
 * channel-share — carte PUBLIQUE d'une chaîne (lien d'invitation /c/:id). Pas de connexion requise.
 *   GET ?id=…          → { name, description, price, memberCount, minAge, testCount, hasTotems, imageUrl }
 *   GET ?id=…&img=1    → redirige vers la photo de la chaîne (adresse stable pour les aperçus WhatsApp, etc.)
 * Ne montre rien de plus que la carte : jamais les membres ni les publications. Chaîne archivée ou inconnue → 404.
 */
const { admin, db } = require('./_firebase');
const CH = require('./_drloChannels');
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';

const json = (statusCode, body, extra = {}) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60', ...extra }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const id = String((event.queryStringParameters && event.queryStringParameters.id) || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
  if (!id) return json(400, { error: 'Chaîne manquante' });
  try {
    const snap = await db.collection('channels').doc(id).get();
    const card = snap.exists ? CH.publicCard(id, snap.data()) : null;
    if (!card) return json(404, { error: 'Chaîne introuvable' });
    const photoUrl = async () => {
      const path = snap.data().photoPath;
      if (!path) return null;
      const [u] = await admin.storage().bucket(BUCKET).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 6 * 3600 * 1000 });
      return u;
    };
    if (event.queryStringParameters && event.queryStringParameters.img) {
      const u = await photoUrl().catch(() => null);
      if (!u) return { statusCode: 404, body: '' };
      return { statusCode: 302, headers: { Location: u, 'Cache-Control': 'public, max-age=3600' }, body: '' };
    }
    const { hasPhoto, ...rest } = card;
    return json(200, { ...rest, imageUrl: hasPhoto ? `/.netlify/functions/channel-share?id=${encodeURIComponent(id)}&img=1` : null });
  } catch (e) {
    console.error('channel-share', e);
    return json(500, { error: 'Erreur serveur' });
  }
};

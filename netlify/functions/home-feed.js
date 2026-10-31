/**
 * home-feed — les contenus de l'accueil.
 *   GET  (public, sans connexion) → { featured, channels, latest, tools }
 *        featured : { scaleId, label } ou null (choisi par Dr Lô) ; channels : nom + thèmes + photo ;
 *        latest : derniers contenus ouverts à tous ; tools : derniers outils publiés.
 *   POST { action: 'set_featured', scaleId|null, label? } (espace Dr Lô, rôle staff/{uid}.drlo) → change le test à la une.
 */
const { db, verifyAuth } = require('./_firebase');
const H = require('./_homeFeed');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body, extra = {}) => ({ statusCode, headers: { ...headers, ...extra }, body: JSON.stringify(body) });
const CONFIG = () => db.collection('siteConfig').doc('home');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    if (event.httpMethod === 'GET') {
      const [cfg, chSnap, postSnap, prSnap] = await Promise.all([
        CONFIG().get(),
        db.collection('channels').get(),
        db.collection('channelPosts').where('status', '==', 'published').where('preview', '==', true).get(),
        db.collection('practices').where('status', '==', 'published').get(),
      ]);
      const rows = chSnap.docs.map((d) => ({ id: d.id, c: d.data() }));
      const channels = H.publicChannels(rows);
      const byId = Object.fromEntries(channels.map((c) => [c.id, c]));
      const latest = H.latestPosts(postSnap.docs.map((d) => ({ id: d.id, ...d.data() })), byId);
      const tools = H.latestTools(prSnap.docs.map((d) => ({ id: d.id, p: d.data() })));
      const f = cfg.exists ? cfg.data().featured : null;
      const featured = f && f.scaleId ? { scaleId: String(f.scaleId), label: String(f.label || '') } : null;
      return reply(200, { featured, channels, latest, tools }, { 'Cache-Control': 'public, max-age=60' });
    }
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
    const user = await verifyAuth(event);
    if (!user) return reply(401, { error: 'Non authentifié' });
    const staff = await db.collection('staff').doc(user.uid).get();
    if (!(staff.exists && staff.data().drlo === true)) return reply(403, { error: 'Réservé à Dr Lô.' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
    if (body.action !== 'set_featured') return reply(400, { error: 'Action inconnue' });
    const r = H.cleanFeatured(body);
    if (r.error) return reply(400, { error: r.error });
    await CONFIG().set({ featured: r.featured, updatedAt: Date.now() }, { merge: true });
    return reply(200, { ok: true, featured: r.featured });
  } catch (e) {
    console.error('home-feed', e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

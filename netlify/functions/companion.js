/**
 * companion — le compagnon de chaque personne, enregistré sur son compte (suit la personne d'un appareil à l'autre).
 *   POST { action: 'get' }                 → { name, color, icon, stage, seenStage } (le stade est recalculé ici, jamais en arrière)
 *   POST { action: 'save', name?, color?, icon?, style?, lang? } → idem après enregistrement (nom vérifié : jamais « docteur », « Dr », « Lô »…)
 *   POST { action: 'seen' }                → la personne a vu « il a grandi » pour son stade actuel
 * Stocké dans userProfiles/{uid}.companion.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const S = require('./_companionStage');
const { sanitizeCompanionName } = require('./_companion');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

function shape(c) {
  return { name: c.name || '', color: c.color || null, icon: c.icon || null, style: c.style || null, lang: c.lang || null, stage: Number(c.stage) || 0, seenStage: Number(c.seenStage) || 0 };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Requête invalide' }); }
  const uid = user.uid;
  const ref = db.collection('userProfiles').doc(uid);

  try {
    const [prof, pat] = await Promise.all([ref.get(), db.collection('patients').doc(uid).get()]);
    const profile = prof.exists ? prof.data() : {};
    const cur = profile.companion || {};
    const stage = S.keepGrowing(cur.stage, S.computeStage(S.factsOf(profile, pat.exists ? pat.data() : null)));
    const next = { ...cur, stage };

    if (body.action === 'save') {
      if (body.name !== undefined) next.name = sanitizeCompanionName(body.name);
      if (body.color !== undefined) next.color = S.cleanColor(body.color) || cur.color || null;
      if (body.icon !== undefined) next.icon = S.cleanIcon(body.icon) || cur.icon || null;
      if (body.style !== undefined) next.style = S.cleanStyle(body.style) || cur.style || null;
      if (body.lang !== undefined) next.lang = S.cleanLang(body.lang) || cur.lang || null;
    } else if (body.action === 'seen') {
      next.seenStage = stage;
    } else if (body.action !== 'get') {
      return reply(400, { error: 'Action inconnue' });
    }

    const changed = ['name', 'color', 'icon', 'style', 'lang', 'stage', 'seenStage'].some((k) => next[k] !== cur[k]);
    if (changed) {
      await ref.set({ companion: { ...next, ...(next.stage !== cur.stage ? { grewAt: admin.firestore.FieldValue.serverTimestamp() } : {}) } }, { merge: true });
    }
    return reply(200, shape(next));
  } catch (err) {
    console.error('companion error:', err);
    return reply(500, { error: 'Erreur serveur' });
  }
};

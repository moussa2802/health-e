/**
 * drlo-threads — les discussions avec Dr Lô gardées dans le compte, pour les retrouver sur
 * n'importe quel téléphone ou navigateur (users/{uid}/accueil_threads).
 *   pull  { convId }                    → { index, thread }
 *   push  { convId, state, savedAt }    → { ok }
 *   index { index }                     → { ok }
 *   delete { convId }                   → { ok } (discussion supprimée par la personne)
 * Seule la personne connectée lit et écrit ses propres discussions.
 */
const { admin, db, verifyAuth } = require('./_firebase');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const MAX_STATE = 900 * 1024; // un document Firestore fait 1 Mo au plus
const CONV_ID = /^(main|c[a-z0-9]{4,16})$/;
const reply = (code, body) => ({ statusCode: code, headers, body: JSON.stringify(body) });

function cleanIndex(ix) {
  if (!ix || typeof ix !== 'object' || !Array.isArray(ix.list)) return null;
  const list = ix.list
    .filter(c => c && CONV_ID.test(String(c.id)))
    .slice(0, 100)
    .map(c => ({
      id: String(c.id),
      title: String(c.title ?? '').slice(0, 40),
      updatedAt: String(c.updatedAt ?? '').slice(0, 30),
      ...(c.preview ? { preview: String(c.preview).slice(0, 80) } : {}),
    }));
  const deleted = (Array.isArray(ix.deleted) ? ix.deleted : []).filter(id => CONV_ID.test(String(id))).slice(-200);
  return { v: 1, current: CONV_ID.test(String(ix.current)) ? String(ix.current) : 'main', list, deleted };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, {});
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const col = db.collection('users').doc(user.uid).collection('accueil_threads');
  const now = admin.firestore.FieldValue.serverTimestamp();
  try {
    if (body.action === 'pull') {
      const convId = String(body.convId ?? '');
      if (!CONV_ID.test(convId)) return reply(400, { error: 'convId' });
      const [ix, th] = await Promise.all([col.doc('_index').get(), col.doc(convId).get()]);
      return reply(200, {
        index: ix.exists ? ix.data().index ?? null : null,
        thread: th.exists ? { state: th.data().state ?? null, savedAt: th.data().savedAt ?? null } : null,
      });
    }
    if (body.action === 'push') {
      const convId = String(body.convId ?? '');
      const state = typeof body.state === 'string' ? body.state : '';
      if (!CONV_ID.test(convId) || !state) return reply(400, { error: 'convId/state' });
      if (Buffer.byteLength(state, 'utf8') > MAX_STATE) return reply(413, { error: 'trop long' });
      await col.doc(convId).set({ state, savedAt: String(body.savedAt ?? '').slice(0, 30), updatedAt: now });
      return reply(200, { ok: true });
    }
    if (body.action === 'delete') {
      const convId = String(body.convId ?? '');
      if (!CONV_ID.test(convId) || convId === 'main') return reply(400, { error: 'convId' });
      await col.doc(convId).delete();
      return reply(200, { ok: true });
    }
    if (body.action === 'index') {
      const index = cleanIndex(body.index);
      if (!index) return reply(400, { error: 'index' });
      await col.doc('_index').set({ index, updatedAt: now });
      return reply(200, { ok: true });
    }
    return reply(400, { error: 'action' });
  } catch (e) {
    console.error('drlo-threads', e && e.message);
    return reply(500, { error: 'serveur' });
  }
};

exports._cleanIndex = cleanIndex;

/**
 * drlo-box — la boîte à questions anonyme.
 *   GET                           → { answers } : réponses écrites par Dr Lô, publiées sur le site (public).
 *   POST { action:'send', text, website? }  → dépose une question, sans compte (website = piège à robots, doit rester vide).
 *   POST { action:'list' }                  → (espace Dr Lô) les questions reçues.
 *   POST { action:'decide', id, status, publicText?, answer?, note? } → (espace Dr Lô) répondre sur le site, en vidéo, ou classer.
 *   POST { action:'remove', id }            → (espace Dr Lô) supprimer.
 * Aucune identité n'est enregistrée. L'espace Dr Lô demande le rôle staff/{uid}.drlo === true.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const B = require('./_openBox');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body, extra = {}) => ({ statusCode, headers: { ...headers, ...extra }, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : Number(v) || 0);
const COL = () => db.collection('openQuestions');

async function countToday(ref) {
  const s = await ref.get();
  return s.exists ? Number(s.data().n) || 0 : 0;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    if (event.httpMethod === 'GET') {
      const s = await COL().where('status', '==', 'site').limit(60).get();
      return reply(200, { answers: B.publicAnswers(s.docs.map((d) => ({ id: d.id, ...d.data() }))) }, { 'Cache-Control': 'public, max-age=60' });
    }
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }

    if (body.action === 'send') {
      if (body.website) return reply(200, { ok: true }); // robot : on fait comme si
      const q = B.cleanQuestion(body.text);
      if (q.error) return reply(400, { error: q.error });
      const day = B.dayKey();
      const h = event.headers || {};
      const ip = String(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim();
      const fp = B.fingerprint(ip, h['user-agent'], day);
      const devRef = db.collection('openBoxRate').doc(`${day}_${fp}`);
      const globRef = db.collection('openBoxRate').doc(`${day}_all`);
      const verdict = await db.runTransaction(async (tx) => {
        const [d, g] = await Promise.all([tx.get(devRef), tx.get(globRef)]);
        const v = B.allow(d.exists ? Number(d.data().n) || 0 : 0, g.exists ? Number(g.data().n) || 0 : 0);
        if (!v.ok) return v;
        tx.set(devRef, { n: (d.exists ? Number(d.data().n) || 0 : 0) + 1, day }, { merge: true });
        tx.set(globRef, { n: (g.exists ? Number(g.data().n) || 0 : 0) + 1, day }, { merge: true });
        return v;
      });
      if (!verdict.ok) {
        return reply(429, { error: verdict.reason === 'device' ? 'Tu as déjà déposé plusieurs questions aujourd\'hui. Reviens demain.' : 'La boîte est pleine pour aujourd\'hui. Reviens demain.' });
      }
      await COL().add({ text: q.text, crisis: q.crisis, status: 'new', createdAt: admin.firestore.Timestamp.now() });
      return reply(200, { ok: true, support: q.crisis });
    }

    // Espace Dr Lô
    const user = await verifyAuth(event);
    if (!user) return reply(401, { error: 'Non authentifié' });
    const staff = await db.collection('staff').doc(user.uid).get();
    if (!(staff.exists && staff.data().drlo === true)) return reply(403, { error: 'Réservé à Dr Lô.' });

    if (body.action === 'list') {
      const s = await COL().orderBy('createdAt', 'desc').limit(200).get();
      return reply(200, { items: s.docs.map((d) => { const q = d.data(); return { id: d.id, text: q.text, crisis: !!q.crisis, status: q.status, createdAt: ms(q.createdAt), publicText: q.publicText || '', answer: q.answer || '', note: q.note || '' }; }) });
    }
    if (!body.id) return reply(400, { error: 'Question manquante' });
    const ref = COL().doc(String(body.id));
    const snap = await ref.get();
    if (!snap.exists) return reply(404, { error: 'Question introuvable' });
    if (body.action === 'remove') { await ref.delete(); return reply(200, { ok: true }); }
    if (body.action === 'decide') {
      const r = B.cleanDecision(body);
      if (r.error) return reply(400, { error: r.error });
      const patch = { status: r.status, note: r.note || '', decidedAt: admin.firestore.Timestamp.now() };
      if (r.status === 'site') { patch.publicText = r.publicText; patch.answer = r.answer; patch.answeredAt = admin.firestore.Timestamp.now(); }
      await ref.set(patch, { merge: true });
      return reply(200, { ok: true });
    }
    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('drlo-box', e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

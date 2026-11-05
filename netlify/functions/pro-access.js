/**
 * pro-access — l'arrivée des professionnels de santé dans l'Espace pro. POST { action, ... } avec le jeton Firebase.
 * Seule l'ARRIVÉE d'un pro passe par Dr Lô ; ensuite il crée librement ses chaînes (et plus tard ses Pénc).
 * Personne connectée :
 *   me              → { role: 'owner'|'pro'|'none', suspended, profile?, application? }
 *   apply           { fullName, profession, title?, license, city, bio } → demande (ou nouvelle demande après un refus)
 *   profile_update  { title?, city?, bio? }  (pro) → met à jour son profil public (et le titre affiché sur ses chaînes)
 * Dr Lô (propriétaire) :
 *   pros_list                 → toutes les demandes, en attente d'abord
 *   approve  { uid }          → le compte devient pro vérifié
 *   reject   { uid, reason? } → refus (la personne voit la raison et peut redemander)
 *   suspend  { uid, suspended } → suspendre / rétablir un pro (ses chaînes restent, il ne peut plus les gérer)
 */
const { admin, db, verifyAuth } = require('./_firebase');
const R = require('./_roles');
const { sendToUser } = require('./_push');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : Number(v) || 0);
const now = () => admin.firestore.FieldValue.serverTimestamp();

const publicApp = (a) => ({ status: a.status, rejectReason: a.rejectReason || '', fullName: a.fullName, profession: a.profession, title: a.title, city: a.city, bio: a.bio, license: a.license, createdAt: ms(a.createdAt) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const uid = user.uid;
  const action = body.action;

  try {
    const r = await R.roleOf(uid);
    const appRef = db.collection('proApplications').doc(uid);

    if (action === 'me') {
      const a = await appRef.get();
      const s = r.staff;
      return reply(200, {
        role: r.owner ? 'owner' : r.pro ? 'pro' : 'none',
        suspended: s.role === 'pro' && s.suspended === true,
        profile: s.role === 'pro' ? { fullName: s.fullName || '', title: s.title || '', city: s.city || '', bio: s.bio || '' } : null,
        application: a.exists ? publicApp(a.data()) : null,
      });
    }

    if (action === 'apply') {
      if (r.owner || r.pro) return reply(409, { error: 'Tu as déjà accès à l\'Espace pro.' });
      const old = await appRef.get();
      if (old.exists && old.data().status === 'pending') return reply(409, { error: 'Ta demande est déjà en cours d\'examen.' });
      if (old.exists && old.data().status === 'suspended') return reply(403, { error: 'Ton accès pro est suspendu. Écris à l\'équipe Health-e.' });
      const v = R.cleanApplication(body);
      if (v.error) return reply(400, { error: v.error });
      await appRef.set({ uid, ...v.data, email: user.email || '', status: 'pending', rejectReason: '', createdAt: now(), updatedAt: now() });
      return reply(200, { ok: true, status: 'pending' });
    }

    if (action === 'profile_update') {
      if (!r.pro) return reply(403, { error: 'Réservé aux professionnels vérifiés.' });
      const clean = (x, max) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, max);
      const upd = {};
      if (body.title !== undefined) { const t = clean(body.title, 60); if (t.length < 2) return reply(400, { error: 'Ton titre est trop court.' }); upd.title = t; }
      if (body.city !== undefined) upd.city = clean(body.city, 40);
      if (body.bio !== undefined) upd.bio = String(body.bio || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 600);
      if (!Object.keys(upd).length) return reply(400, { error: 'Rien à modifier.' });
      await db.collection('staff').doc(uid).set(upd, { merge: true });
      if (upd.title) { // le titre affiché sur ses chaînes
        const own = await db.collection('channels').where('ownerUid', '==', uid).get();
        await Promise.all(own.docs.map((d) => d.ref.update({ ownerTitle: upd.title }).catch(() => {})));
      }
      return reply(200, { ok: true });
    }

    // ───────── Dr Lô ─────────
    if (!['pros_list', 'approve', 'reject', 'suspend'].includes(action)) return reply(400, { error: 'Action inconnue' });
    if (!r.owner) return reply(403, { error: 'Réservé à Dr Lô' });

    if (action === 'pros_list') {
      const snap = await db.collection('proApplications').get();
      const order = { pending: 0, approved: 1, suspended: 2, rejected: 3 };
      const items = snap.docs.map((d) => ({ uid: d.id, email: d.data().email || '', ...publicApp(d.data()) }))
        .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || b.createdAt - a.createdAt);
      return reply(200, { items, pending: items.filter((i) => i.status === 'pending').length });
    }

    const target = String(body.uid || '');
    if (!target) return reply(400, { error: 'Compte manquant' });
    const tRef = db.collection('proApplications').doc(target);
    const t = await tRef.get();
    if (!t.exists) return reply(404, { error: 'Demande introuvable' });
    const a = t.data();

    if (action === 'approve') {
      await db.collection('staff').doc(target).set({
        role: 'pro', verified: true, suspended: false, fullName: a.fullName, title: a.title, profession: a.profession, city: a.city, bio: a.bio,
        approvedAt: now(), approvedBy: uid,
      }, { merge: true });
      await tRef.update({ status: 'approved', rejectReason: '', updatedAt: now() });
      await sendToUser(target, { kind: 'broadcast', title: 'Health-e', body: 'Ton accès à l\'Espace pro est validé.', inboxTitle: 'Bienvenue dans l\'Espace pro', inboxBody: 'Tu peux créer tes chaînes dès maintenant.', link: '/drlo' }).catch(() => {});
      return reply(200, { ok: true });
    }
    if (action === 'reject') {
      const reason = String(body.reason || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      await tRef.update({ status: 'rejected', rejectReason: reason, updatedAt: now() });
      return reply(200, { ok: true });
    }
    // suspend
    const suspended = body.suspended !== false;
    if (a.status !== 'approved' && a.status !== 'suspended') return reply(400, { error: 'Ce compte n\'est pas un pro validé.' });
    await db.collection('staff').doc(target).set({ suspended }, { merge: true });
    await tRef.update({ status: suspended ? 'suspended' : 'approved', updatedAt: now() });
    return reply(200, { ok: true });
  } catch (e) {
    console.error('pro-access', action, e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

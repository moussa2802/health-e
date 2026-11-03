/**
 * penc — « Pénc mi » : le programme des discussions en direct (étape 2 : programme, inscription, rappels ; la salle audio vient ensuite).
 * POST { action, ... } avec le jeton Firebase.
 *
 * Espace pro (Dr Lô : tous les Pénc ; un pro vérifié : les siens) :
 *   manage_list                      → mes Pénc (tous pour Dr Lô), avec le nombre d'inscrits
 *   save   { id?, title, description?, startAt, durationMin, access, channelId?, price?, testScaleId? }
 *   start  { id }                    → « en direct » (les inscrits sont prévenus)
 *   end    { id, summary?[3] }       → terminé, avec les idées à retenir
 *   cancel { id }                    → annulé (les inscrits sont prévenus)
 *   open_now { title, access?, channelId? } → ouvre un Pénc tout de suite (en direct, 1 h), sans programmation ;
 *                                       s'il est réservé à une chaîne, ses membres sont prévenus
 * Personne connectée :
 *   agenda                → { live, upcoming, past } visibles (un Pénc de chaîne est montré verrouillé aux non-membres)
 *   detail   { id }
 *   register { id, on }   → « Me rappeler » (payant : les étincelles sont débitées à l'inscription, non remboursables)
 */
const { admin, db, verifyAuth } = require('./_firebase');
const R = require('./_roles');
const P = require('./_penc');
const { reserveKoris, commitKoris, releaseKoris } = require('./_koris');
const { sendToUser } = require('./_push');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const inc = (n) => admin.firestore.FieldValue.increment(n);
const regId = (pid, uid) => `${pid}_${uid}`;

const host = (p) => ({ name: p.hostName || 'Dr Lô', title: p.hostTitle || '', pro: !!p.hostPro });
const base = (id, p) => ({
  id, title: p.title, description: p.description || '', startAt: Number(p.startAt), durationMin: Number(p.durationMin) || 60,
  access: p.access || 'all', channelId: p.channelId || null, channelName: p.channelName || null, price: Number(p.price) || 0,
  testScaleId: p.testScaleId || null, status: p.status, host: host(p), registeredCount: Number(p.registeredCount) || 0,
  summary: p.status === 'ended' && Array.isArray(p.summary) ? p.summary : [],
});

/** Prévenir tous les inscrits (notification neutre, jamais le sujet sur l'écran verrouillé). */
async function notifyRegistered(pid, msg) {
  const regs = await db.collection('pencRegs').where('pencId', '==', pid).get();
  const uids = regs.docs.map((d) => d.data().uid).slice(0, 2000);
  for (let i = 0; i < uids.length; i += 25) await Promise.all(uids.slice(i, i + 25).map((u) => sendToUser(u, msg).catch(() => null)));
  return uids.length;
}

/** Fermer la salle audio (tout le monde est déconnecté). Sans configuration LiveKit, rien à faire. */
async function closeRoom(pid) {
  const { LIVEKIT_URL: u, LIVEKIT_API_KEY: k, LIVEKIT_API_SECRET: sec } = process.env;
  if (!u || !k || !sec) return;
  try {
    const { RoomServiceClient } = require('livekit-server-sdk');
    await new RoomServiceClient(u.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'), k, sec).deleteRoom(`penc_${pid}`);
  } catch (e) { console.warn('penc closeRoom', e && e.message); }
}

/** Combien de personnes sont dans la salle (Pénc en direct) : { id: nombre | null }. Jamais bloquant (2,5 s au plus). */
async function liveCounts(ids) {
  const { LIVEKIT_URL: u, LIVEKIT_API_KEY: k, LIVEKIT_API_SECRET: sec } = process.env;
  if (!ids.length || !u || !k || !sec) return {};
  try {
    const { RoomServiceClient } = require('livekit-server-sdk');
    const svc = new RoomServiceClient(u.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'), k, sec);
    const pairs = await Promise.all(ids.slice(0, 10).map(async (id) => {
      try {
        const ps = await Promise.race([svc.listParticipants(`penc_${id}`), new Promise((_, rej) => setTimeout(() => rej(new Error('lent')), 2500))]);
        return [id, ps.length];
      } catch { return [id, null]; }
    }));
    return Object.fromEntries(pairs);
  } catch { return {}; }
}

exports.notifyRegistered = notifyRegistered;
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
    // ───────── Espace pro ─────────
    if (['manage_list', 'save', 'start', 'end', 'cancel', 'open_now'].includes(action)) {
      const role = await R.roleOf(uid);
      if (!role.owner && !role.pro) return reply(403, { error: 'Réservé à l\'Espace pro' });
      const mine = (p) => role.owner || p.hostUid === uid;

      if (action === 'manage_list') {
        const snap = role.owner ? await db.collection('pencs').get() : await db.collection('pencs').where('hostUid', '==', uid).get();
        const items = snap.docs.filter((d) => mine(d.data())).map((d) => base(d.id, d.data()))
          .filter((p) => p.status !== 'cancelled')
          .sort((a, b) => b.startAt - a.startAt).slice(0, 100);
        return reply(200, { items });
      }

      if (action === 'open_now') {
        const now = Date.now();
        const access = body.access === 'channel' ? 'channel' : 'all';
        const v = P.validatePenc({ title: body.title, description: '', startAt: now, durationMin: 60, access, channelId: body.channelId }, now);
        if (v.error) return reply(400, { error: v.error });
        const data = { ...v.data };
        let ch = null;
        if (access === 'channel') {
          const cs = await db.collection('channels').doc(data.channelId).get();
          if (!cs.exists || !R.canManageChannel(role, cs.data(), uid)) return reply(400, { error: 'Choisis une de tes chaînes.' });
          ch = cs.data();
          data.channelName = String(ch.name || '').slice(0, 80);
        } else data.channelName = null;
        const h = role.owner ? { hostName: 'Dr Lô', hostTitle: 'Médecin', hostPro: false } : { hostName: role.staff.fullName || 'Professionnel', hostTitle: role.staff.title || '', hostPro: true };
        const ref = db.collection('pencs').doc();
        await ref.set({ ...data, ...h, hostUid: uid, status: 'live', startedAt: now, registeredCount: 0, remindSent: true, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        if (ch) { // les membres de la chaîne sont prévenus (sauf alertes coupées)
          const mem = await db.collection('channelMembers').where('channelId', '==', data.channelId).get();
          const uids = mem.docs.map((d) => d.data()).filter((m) => m.muted !== true && m.uid !== uid).map((m) => m.uid).slice(0, 2000);
          const msg = { kind: 'penc', title: 'Pénc mi', body: `${h.hostName} a ouvert un Pénc dans ${data.channelName}. Viens écouter.`, inboxTitle: `Pénc en direct dans ${data.channelName}`, inboxBody: data.title, link: `/penc/${ref.id}` };
          for (let i = 0; i < uids.length; i += 25) await Promise.all(uids.slice(i, i + 25).map((u) => sendToUser(u, msg).catch(() => null)));
        }
        const fresh = await ref.get();
        return reply(200, { ok: true, penc: base(ref.id, fresh.data()) });
      }

      if (action === 'save') {
        const isNew = !body.id;
        const ref = isNew ? db.collection('pencs').doc() : db.collection('pencs').doc(String(body.id));
        let old = null;
        if (!isNew) {
          const s = await ref.get();
          if (!s.exists || !mine(s.data())) return reply(404, { error: 'Pénc introuvable' });
          old = s.data();
          if (old.status !== 'scheduled') return reply(409, { error: 'Ce Pénc a déjà commencé : il ne peut plus être modifié.' });
        }
        const v = P.validatePenc(body, Date.now(), { partial: !isNew });
        if (v.error) return reply(400, { error: v.error });
        const data = { ...v.data };
        if (data.access === 'channel') {
          const cs = await db.collection('channels').doc(data.channelId).get();
          if (!cs.exists || !R.canManageChannel(role, cs.data(), uid)) return reply(400, { error: 'Choisis une de tes chaînes.' });
          data.channelName = String(cs.data().name || '').slice(0, 80);
        } else if (data.access) data.channelName = null;
        if (old && data.startAt && data.startAt !== Number(old.startAt)) data.remindSent = false;
        if (isNew) {
          const h = role.owner ? { hostName: 'Dr Lô', hostTitle: 'Médecin', hostPro: false } : { hostName: role.staff.fullName || 'Professionnel', hostTitle: role.staff.title || '', hostPro: true };
          await ref.set({ ...data, ...h, hostUid: uid, status: 'scheduled', registeredCount: 0, remindSent: false, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        } else await ref.update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const fresh = await ref.get();
        return reply(200, { ok: true, penc: base(ref.id, fresh.data()) });
      }

      const ref = db.collection('pencs').doc(String(body.id || 'x'));
      const s = await ref.get();
      if (!s.exists || !mine(s.data())) return reply(404, { error: 'Pénc introuvable' });
      const p = s.data();
      const link = `/penc/${ref.id}`;

      if (action === 'start') {
        if (p.status !== 'scheduled') return reply(409, { error: p.status === 'live' ? 'Ce Pénc est déjà en direct.' : 'Ce Pénc est terminé.' });
        await ref.update({ status: 'live', startedAt: Date.now() });
        await notifyRegistered(ref.id, { kind: 'penc', title: 'Pénc mi', body: `${host(p).name} a commencé. Viens écouter.`, inboxTitle: 'Pénc mi : c\'est commencé', inboxBody: p.title, link });
        return reply(200, { ok: true });
      }
      if (action === 'end') {
        if (p.status !== 'live' && p.status !== 'scheduled') return reply(409, { error: 'Ce Pénc est déjà terminé.' });
        await ref.update({ status: 'ended', endedAt: Date.now(), summary: P.cleanSummary(body.summary) });
        await closeRoom(ref.id);
        return reply(200, { ok: true });
      }
      // cancel
      if (p.status === 'ended') return reply(409, { error: 'Ce Pénc est déjà terminé.' });
      await ref.update({ status: 'cancelled', cancelledAt: Date.now() });
      await closeRoom(ref.id);
      await notifyRegistered(ref.id, { kind: 'penc', title: 'Pénc mi', body: 'Un Pénc auquel tu étais inscrit est annulé.', inboxTitle: 'Pénc annulé', inboxBody: `${p.title}${Number(p.price) > 0 ? ' · tes étincelles te sont rendues.' : ''}`, link: '/penc' });
      if (Number(p.price) > 0) { // les étincelles sont rendues si le Pénc est annulé
        const regs = await db.collection('pencRegs').where('pencId', '==', ref.id).get();
        await Promise.all(regs.docs.filter((d) => Number(d.data().paid) > 0).map(async (d) => {
          const amount = Number(d.data().paid);
          const pRef = db.collection('patients').doc(d.data().uid);
          await pRef.update({ 'korisWallet.balance': inc(amount), 'korisWallet.totalSpent': inc(-amount) }).catch(() => {});
          await pRef.collection('korisHistory').doc().set({ type: 'refund', feature: 'penc', amount, details: 'Pénc annulé : étincelles rendues', timestamp: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
        }));
      }
      return reply(200, { ok: true });
    }

    // ───────── Personne connectée ─────────
    if (action === 'agenda' || action === 'detail') {
      let docs;
      if (action === 'detail') {
        const s = await db.collection('pencs').doc(String(body.id || 'x')).get();
        if (!s.exists || s.data().status === 'cancelled') return reply(404, { error: 'Pénc introuvable' });
        docs = [s];
      } else {
        const snap = await db.collection('pencs').where('status', 'in', ['scheduled', 'live', 'ended']).get();
        docs = snap.docs;
      }
      const now = Date.now();
      const rows = docs.map((d) => ({ id: d.id, p: d.data(), bucket: P.agendaBucket(d.data(), now) })).filter((r) => action === 'detail' || r.bucket);
      const chIds = [...new Set(rows.filter((r) => r.p.access === 'channel' && r.p.channelId).map((r) => r.p.channelId))];
      const [mems, regs] = await Promise.all([
        chIds.length ? db.getAll(...chIds.map((c) => db.collection('channelMembers').doc(`${c}_${uid}`))) : [],
        rows.length ? db.getAll(...rows.map((r) => db.collection('pencRegs').doc(regId(r.id, uid)))) : [],
      ]);
      const memberOf = new Set(mems.filter((m) => m.exists).map((m) => m.id.slice(0, -(uid.length + 1))));
      const registered = new Set(regs.filter((x) => x.exists).map((x) => x.id.slice(0, -(uid.length + 1))));
      const counts = await liveCounts(rows.filter((r) => r.p.status === 'live').map((r) => r.id));
      const shape = (r) => ({ ...base(r.id, r.p), listeners: counts[r.id] ?? null, bucket: r.bucket, registered: registered.has(r.id), locked: r.p.access === 'channel' && !memberOf.has(r.p.channelId), mineAsHost: r.p.hostUid === uid });
      if (action === 'detail') return reply(200, { penc: shape(rows[0]) });
      const out = { live: [], upcoming: [], past: [] };
      rows.forEach((r) => out[r.bucket].push(shape(r)));
      out.live.sort((a, b) => b.startAt - a.startAt);
      out.upcoming.sort((a, b) => a.startAt - b.startAt);
      out.past.sort((a, b) => b.startAt - a.startAt);
      out.past = out.past.slice(0, 10);
      return reply(200, out);
    }

    if (action === 'register') {
      const pid = String(body.id || '');
      const ref = db.collection('pencs').doc(pid || 'x');
      const s = await ref.get();
      if (!pid || !s.exists) return reply(404, { error: 'Pénc introuvable' });
      const p = s.data();
      const rRef = db.collection('pencRegs').doc(regId(pid, uid));
      const cur = await rRef.get();
      if (body.on === false) {
        if (!cur.exists) return reply(200, { ok: true, registered: false });
        if (Number(cur.data().paid) > 0) return reply(409, { error: 'Inscription payée : elle reste valable, on te prévient quand même.' });
        await rRef.delete();
        await ref.update({ registeredCount: inc(-1) });
        return reply(200, { ok: true, registered: false });
      }
      if (cur.exists) return reply(200, { ok: true, registered: true });
      if (p.status !== 'scheduled' && p.status !== 'live') return reply(409, { error: 'Ce Pénc est terminé.' });
      if (p.access === 'channel') {
        const m = await db.collection('channelMembers').doc(`${p.channelId}_${uid}`).get();
        if (!m.exists) return reply(403, { error: 'Ce Pénc est réservé aux membres de la chaîne.', channelId: p.channelId });
      }
      const price = p.access === 'paid' ? Number(p.price) || 0 : 0;
      let holdId = null;
      if (price > 0) {
        const res = await reserveKoris(uid, 'penc', price, { pencId: pid });
        if (res.error) return reply(402, { error: 'Pas assez d\'étincelles', required: price });
        holdId = res.holdId;
      }
      try {
        await rRef.set({ pencId: pid, uid, at: Date.now(), paid: price });
        await ref.update({ registeredCount: inc(1) });
      } catch (e) { await releaseKoris(holdId); throw e; }
      await commitKoris(holdId);
      return reply(200, { ok: true, registered: true, paid: price });
    }

    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('penc', action, e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

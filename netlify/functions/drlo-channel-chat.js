/**
 * drlo-channel-chat — la discussion entre les membres d'une chaîne. POST { action, ... } avec le jeton Firebase.
 * Réservé aux membres de la chaîne (et à Dr Lô). Identité au choix : prénom, anonyme ou pseudo (comme les commentaires).
 * Messages dans channels/{id}/chat. Un mot de détresse n'est jamais publié (message privé de soutien).
 *   list   { channelId }                      → derniers messages (les plus anciens d'abord)
 *   send   { channelId, text, mode, pseudo? }
 *   report { channelId, messageId }           → 3 signalements = masqué
 *   delete { channelId, messageId }           → son propre message (Dr Lô : n'importe lequel)
 * Plafond : 500 messages gardés par chaîne ; au-delà (par paquets) les plus anciens sont supprimés.
 */
const { admin, db, verifyAuth } = require('./_firebase');
const C = require('./_drloComments');
const K = require('./_channelChat');
const { sendToUser } = require('./_push');

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : Number(v) || 0);

async function isDrLo(uid) {
  const s = await db.collection('staff').doc(uid).get();
  return s.exists && s.data().drlo === true;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const uid = user.uid;
  const channelId = String(body.channelId || '');
  if (!channelId) return reply(400, { error: 'Chaîne manquante' });

  try {
    const chRef = db.collection('channels').doc(channelId);
    const memRef = db.collection('channelMembers').doc(`${channelId}_${uid}`);
    const [ch, mem, staff] = await Promise.all([chRef.get(), memRef.get(), isDrLo(uid)]);
    if (!ch.exists) return reply(404, { error: 'Chaîne introuvable' });
    if (!mem.exists && !staff) return reply(403, { error: 'Rejoins la chaîne pour discuter avec les autres membres.' });
    const chat = chRef.collection('chat');

    if (body.action === 'list') {
      const s = await chat.orderBy('createdAt', 'desc').limit(K.SHOWN).get();
      const items = s.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: ms(d.data().createdAt) }))
        .filter((m) => K.shown(m) || staff)
        .reverse()
        .map((m) => ({ id: m.id, name: m.official ? 'Dr Lô' : m.name || 'Anonyme', totem: m.official ? null : m.totem || null, official: !!m.official, text: m.text, at: m.createdAt, mine: m.uid === uid, hidden: !!m.hidden || Number(m.reports) >= C.REPORTS_TO_HIDE }));
      return reply(200, { items, staff });
    }

    if (body.action === 'send') {
      const up = await db.collection('userProfiles').doc(uid).get().catch(() => null);
      const upd = up && up.exists ? up.data() : null;
      const prenom = (upd && upd.onboardingProfile && upd.onboardingProfile.prenom) || '';
      const p = K.prepare(body.text, staff && body.asDrLo ? 'anon' : body.mode, { prenom, pseudo: body.pseudo });
      if (p.error) return reply(400, { error: p.error });
      if (p.crisis) {
        await sendToUser(uid, C.CRISIS_NOTIF).catch(() => {});
        return reply(200, { ok: true, published: false, support: true });
      }
      const now = Date.now();
      const r = K.rate(mem.exists ? mem.data() : null, now);
      if (!r.ok) return reply(429, { error: r.error });
      const official = !!(staff && body.asDrLo);
      await chat.add({ uid, name: p.name, mode: p.mode, totem: official ? null : C.totemOf(upd), official, text: p.text, hidden: false, reports: 0, reportedBy: [], createdAt: admin.firestore.FieldValue.serverTimestamp() });
      if (mem.exists) await memRef.set(r.next, { merge: true }).catch(() => {});
      // Plafond : le compteur est sur la chaîne ; on nettoie par paquets, les plus anciens d'abord.
      const count = (Number(ch.data().chatCount) || 0) + 1;
      await chRef.update({ chatCount: count }).catch(() => {});
      const extra = K.toTrim(count);
      if (extra > 0) {
        try {
          const old = await chat.orderBy('createdAt', 'asc').limit(extra).get();
          const batch = db.batch();
          old.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          await chRef.update({ chatCount: Math.max(0, count - old.size) });
        } catch (e) { console.error('drlo-channel-chat trim', e.message); }
      }
      return reply(200, { ok: true, published: true });
    }

    const mRef = chat.doc(String(body.messageId || 'x'));
    const m = await mRef.get();
    if (!m.exists) return reply(404, { error: 'Message introuvable' });
    const own = m.data();

    if (body.action === 'delete') {
      if (own.uid !== uid && !staff) return reply(403, { error: 'Ce n\'est pas ton message.' });
      await mRef.delete();
      await chRef.update({ chatCount: Math.max(0, (Number(ch.data().chatCount) || 1) - 1) }).catch(() => {});
      return reply(200, { ok: true });
    }
    if (body.action === 'report') {
      if (own.uid === uid) return reply(400, { error: 'C\'est ton propre message.' });
      const by = Array.isArray(own.reportedBy) ? own.reportedBy : [];
      if (!by.includes(uid)) await mRef.update({ reportedBy: [...by, uid], reports: by.length + 1 });
      return reply(200, { ok: true });
    }
    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('drlo-channel-chat', body.action, e);
    return reply(500, { error: 'Erreur serveur' });
  }
};

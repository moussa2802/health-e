/**
 * penc-room — la salle d'écoute de « Pénc mi » (audio en direct via LiveKit). POST { action, pencId, ... } avec le jeton Firebase.
 * Variables d'environnement : LIVEKIT_URL (wss://…), LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
 *
 * Tout le monde entre en AUDITEUR (écoute seule) ; seul le serveur peut donner la parole.
 *   join    { pencId, mode, pseudo? } → { url, token, identity, isHost, isMod, name }   (vérifie l'accès : chaîne, inscription payée, exclusion)
 *   accept  { pencId }                → j'accepte l'invitation : le micro m'est ouvert (6 personnes au plus sur scène)
 *   decline { pencId }                → je refuse l'invitation
 *   leave_stage { pencId }            → je redescends (micro fermé)
 * Hôte (et Dr Lô) :
 *   invite { pencId, identity }       → invite quelqu'un à parler (il doit accepter)
 *   remove { pencId, identity }       → le fait redescendre
 *   mute   { pencId, identity, trackSid } → coupe son micro
 *   kick   { pencId, identity }       → l'exclut de ce Pénc (il ne peut plus revenir)
 * L'identité LiveKit n'est JAMAIS l'identifiant du compte : c'est une empreinte propre à ce Pénc (anonymat entre Pénc).
 * Rien n'est enregistré.
 */
const crypto = require('crypto');
const { db, verifyAuth } = require('./_firebase');
const R = require('./_roles');
const C = require('./_drloComments');
const { AccessToken, RoomServiceClient, TrackSource } = require('livekit-server-sdk');

const STAGE_MAX = 6;
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const env = () => ({ url: process.env.LIVEKIT_URL || '', key: process.env.LIVEKIT_API_KEY || '', secret: process.env.LIVEKIT_API_SECRET || '' });
const roomName = (pid) => `penc_${pid}`;
/** Empreinte stable pour (compte, Pénc) : la même à chaque reconnexion, différente d'un Pénc à l'autre. */
const identityOf = (uid, pid, secret) => `p_${crypto.createHmac('sha256', secret || 'penc').update(`${uid}:${pid}`).digest('hex').slice(0, 20)}`;
const httpUrl = (u) => u.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
const LISTENER = { canSubscribe: true, canPublish: false, canPublishData: true, canPublishSources: [] };
const SPEAKER = { canSubscribe: true, canPublish: true, canPublishData: true, canPublishSources: [TrackSource.MICROPHONE] };

exports.identityOf = identityOf;
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const uid = user.uid;
  const action = body.action;
  const E = env();
  if (!E.url || !E.key || !E.secret) return reply(503, { error: 'La salle d\'écoute n\'est pas encore configurée.' });

  try {
    const pid = String(body.pencId || '');
    const ref = db.collection('pencs').doc(pid || 'x');
    const s = await ref.get();
    if (!pid || !s.exists) return reply(404, { error: 'Pénc introuvable' });
    const p = s.data();
    const role = await R.roleOf(uid);
    const isHost = p.hostUid === uid;
    const isMod = isHost || role.owner;
    const me = identityOf(uid, pid, E.secret);
    const room = roomName(pid);
    const svc = new RoomServiceClient(httpUrl(E.url), E.key, E.secret);
    const banned = Array.isArray(p.banned) ? p.banned : [];

    if (action === 'join') {
      if (p.status !== 'live') return reply(409, { error: p.status === 'ended' ? 'Ce Pénc est terminé.' : 'Ce Pénc n\'a pas encore commencé.' });
      if (banned.includes(me)) return reply(403, { error: 'Tu ne peux plus entrer dans ce Pénc.' });
      if (!isMod) {
        if (p.access === 'channel') {
          const m = await db.collection('channelMembers').doc(`${p.channelId}_${uid}`).get();
          if (!m.exists) return reply(403, { error: 'Ce Pénc est réservé aux membres de la chaîne.' });
        }
        if (p.access === 'paid') {
          const r = await db.collection('pencRegs').doc(`${pid}_${uid}`).get();
          if (!r.exists || !(Number(r.data().paid) > 0)) return reply(402, { error: 'Inscris-toi d\'abord à ce Pénc.' });
        }
      }
      let name;
      if (isHost) name = p.hostName || 'Hôte';
      else {
        const up = await db.collection('userProfiles').doc(uid).get().catch(() => null);
        const prenom = (up && up.exists && up.data().onboardingProfile && up.data().onboardingProfile.prenom) || '';
        const idt = C.resolveIdentity(body.mode, { prenom, pseudo: body.pseudo });
        if (idt.error) return reply(400, { error: idt.error });
        name = idt.name;
      }
      const at = new AccessToken(E.key, E.secret, { identity: me, name, ttl: '4h', attributes: { role: isHost ? 'host' : isMod ? 'mod' : 'listener' } });
      at.addGrant({ room, roomJoin: true, ...(isHost ? SPEAKER : LISTENER), canUpdateOwnMetadata: true });
      return reply(200, { url: E.url, token: await at.toJwt(), identity: me, isHost, isMod, name });
    }

    if (action === 'accept') {
      const pi = await svc.getParticipant(room, me).catch(() => null);
      if (!pi || !pi.attributes || pi.attributes.invited !== '1') return reply(409, { error: 'L\'invitation n\'est plus valable.' });
      const all = await svc.listParticipants(room);
      const onStage = all.filter((x) => x.permission && x.permission.canPublish && x.identity !== me).length;
      if (onStage >= STAGE_MAX) return reply(409, { error: 'La scène est pleine pour le moment.' });
      await svc.updateParticipant(room, me, { permission: SPEAKER, attributes: { invited: '', hand: '', stage: '1' } });
      return reply(200, { ok: true });
    }
    if (action === 'decline') {
      await svc.updateParticipant(room, me, { attributes: { invited: '' } }).catch(() => {});
      return reply(200, { ok: true });
    }
    if (action === 'leave_stage') {
      if (isHost) return reply(400, { error: 'L\'hôte reste sur scène.' });
      await svc.updateParticipant(room, me, { permission: LISTENER, attributes: { stage: '' } });
      return reply(200, { ok: true });
    }

    // ───────── Hôte ─────────
    if (!['invite', 'remove', 'mute', 'kick'].includes(action)) return reply(400, { error: 'Action inconnue' });
    if (!isMod) return reply(403, { error: 'Réservé à l\'hôte' });
    const target = String(body.identity || '');
    if (!/^p_[a-f0-9]{20}$/.test(target)) return reply(400, { error: 'Participant inconnu' });
    if (target === identityOf(p.hostUid, pid, E.secret) && !role.owner) return reply(400, { error: 'C\'est l\'hôte.' });

    if (action === 'invite') {
      await svc.updateParticipant(room, target, { attributes: { invited: '1' } });
      return reply(200, { ok: true });
    }
    if (action === 'remove') {
      await svc.updateParticipant(room, target, { permission: LISTENER, attributes: { stage: '', invited: '' } });
      return reply(200, { ok: true });
    }
    if (action === 'mute') {
      const sid = String(body.trackSid || '');
      if (!sid) return reply(400, { error: 'Micro introuvable' });
      await svc.mutePublishedTrack(room, target, sid, true);
      return reply(200, { ok: true });
    }
    // kick : exclu de ce Pénc pour de bon
    await ref.update({ banned: [...new Set([...banned, target])].slice(-500) });
    await svc.removeParticipant(room, target).catch(() => {});
    return reply(200, { ok: true });
  } catch (e) {
    console.error('penc-room', action, e && e.message);
    return reply(500, { error: 'La salle ne répond pas. Réessaie dans un instant.' });
  }
};

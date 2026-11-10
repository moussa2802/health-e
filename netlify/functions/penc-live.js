/**
 * penc-live — le direct de Pénc mi : aperçu public, questions, commentaires en direct, images de présentation.
 *   GET  ?id=…                       → aperçu public (sans compte) : pour la page du lien partagé et l'aperçu WhatsApp
 *   POST { action: 'preview', id }   → idem
 * Avec le jeton Firebase :
 *   state { id }                      → { questions, pinned, slides:[url], slideIndex, isMod }
 *   ask   { id, text, mode, pseudo }  → question (Anonyme / pseudo / prénom), 3 ouvertes au plus par personne
 *   vote  { id, qid, on }             → « moi aussi »
 *   chat  { id, text }                → commentaire en direct (modéré ici, puis envoyé à toute la salle ; jamais enregistré)
 * Animateur (hôte du Pénc ou propriétaire) :
 *   pin { id, qid|null } · answer { id, qid } · hide { id, qid } · chat_hide { id, cid }
 *   slide_add { id, image (data URL) } · slide_show { id, index|null } · slide_remove { id, index }
 * Chaque changement est signalé à la salle (données LiveKit, sujet « live ») : les écrans se remettent à jour.
 */
const crypto = require('crypto');
const { admin, db, verifyAuth } = require('./_firebase');
const R = require('./_roles');
const C = require('./_drloComments');
const L = require('./_pencLive');

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const lk = () => ({ url: process.env.LIVEKIT_URL || '', key: process.env.LIVEKIT_API_KEY || '', secret: process.env.LIVEKIT_API_SECRET || '' });
const identityOf = (uid, pid, secret) => `p_${crypto.createHmac('sha256', secret || 'penc').update(`${uid}:${pid}`).digest('hex').slice(0, 20)}`;

/** Prévenir la salle (sans LiveKit configuré : rien, les écrans se remettent à jour tout seuls de temps en temps). */
async function signal(pid, payload) {
  const E = lk();
  if (!E.url || !E.key || !E.secret) return;
  try {
    const { RoomServiceClient, DataPacket_Kind } = require('livekit-server-sdk');
    const svc = new RoomServiceClient(E.url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'), E.key, E.secret);
    await svc.sendData(`penc_${pid}`, new TextEncoder().encode(JSON.stringify(payload)), DataPacket_Kind.RELIABLE, { topic: 'live' });
  } catch (e) { console.warn('penc-live signal', e && e.message); }
}

async function signedUrl(path) {
  const [u] = await admin.storage().bucket(BUCKET).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 6 * 3600 * 1000 });
  return u;
}

function preview(id, p) {
  const h = L.hostLabel(p);
  return { id, title: p.title, description: p.description || '', startAt: Number(p.startAt), durationMin: Number(p.durationMin) || 60, status: p.status,
    access: p.access || 'all', price: Number(p.price) || 0, channelName: p.channelName || null, host: h, registeredCount: Number(p.registeredCount) || 0 };
}

async function loadPublic(id) {
  const s = await db.collection('pencs').doc(String(id || 'x')).get();
  if (!s.exists) return null;
  const p = s.data();
  if (p.status === 'cancelled' || p.hidden === true) return null;
  return preview(s.id, p);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod === 'GET') {
    const out = await loadPublic((event.queryStringParameters || {}).id).catch(() => null);
    return out ? { statusCode: 200, headers: { ...headers, 'Cache-Control': 'public, max-age=120' }, body: JSON.stringify(out) } : reply(404, { error: 'Pénc introuvable' });
  }
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Méthode non autorisée' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const action = body.action;
  if (action === 'preview') {
    const out = await loadPublic(body.id).catch(() => null);
    return out ? reply(200, { penc: out }) : reply(404, { error: 'Pénc introuvable' });
  }

  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  const uid = user.uid;

  try {
    const pid = String(body.id || '');
    const ref = db.collection('pencs').doc(pid || 'x');
    const s = await ref.get();
    if (!pid || !s.exists) return reply(404, { error: 'Pénc introuvable' });
    const p = s.data();
    if (p.status === 'cancelled') return reply(404, { error: 'Pénc introuvable' });
    const role = await R.roleOf(uid);
    const E0 = lk();
    const isMod = p.hostUid === uid || role.owner || (Array.isArray(p.mods) && !!E0.secret && p.mods.includes(identityOf(uid, pid, E0.secret)));
    const qCol = ref.collection('questions');

    // Accès : chaîne (membres) et payant (inscrits) ; l'hôte passe toujours
    if (!isMod) {
      if (p.access === 'channel') {
        const m = await db.collection('channelMembers').doc(`${p.channelId}_${uid}`).get();
        if (!m.exists) return reply(403, { error: 'Ce Pénc est réservé aux membres de la chaîne.' });
      }
      if (p.access === 'paid' && ['ask', 'vote', 'chat'].includes(action)) {
        const r = await db.collection('pencRegs').doc(`${pid}_${uid}`).get();
        if (!r.exists) return reply(402, { error: 'Inscris-toi d\'abord à ce Pénc.' });
      }
    }

    if (action === 'state') {
      const snap = await qCol.orderBy('at', 'desc').limit(200).get();
      const questions = L.presentQuestions(snap.docs.map((d) => ({ id: d.id, d: d.data() })), uid, p.pinnedQ || null);
      const slides = Array.isArray(p.slides) ? p.slides : [];
      const urls = await Promise.all(slides.map((x) => signedUrl(x.path).catch(() => null)));
      const pinned = questions.find((q) => q.pinned) || null;
      return reply(200, { questions, pinned, slides: urls, slideIndex: Number.isInteger(p.slideIndex) && urls[p.slideIndex] ? p.slideIndex : null, isMod });
    }

    if (action === 'ask') {
      if (p.status !== 'scheduled' && p.status !== 'live') return reply(409, { error: 'Ce Pénc est terminé.' });
      const t = L.checkText(body.text, L.MAX_QUESTION);
      if (t.crisis) return reply(200, { ok: false, crisis: true });
      if (t.error) return reply(400, { error: t.error });
      const up = await db.collection('userProfiles').doc(uid).get().catch(() => null);
      const prenom = (up && up.exists && up.data().onboardingProfile && up.data().onboardingProfile.prenom) || '';
      const idt = C.resolveIdentity(body.mode, { prenom, pseudo: body.pseudo, seed: `penc:${pid}:${uid}` });
      if (idt.error) return reply(400, { error: idt.error });
      const mine = await qCol.where('uid', '==', uid).where('status', '==', 'open').get();
      if (mine.size >= L.MAX_OPEN_PER_PERSON) return reply(409, { error: `Tu as déjà ${L.MAX_OPEN_PER_PERSON} questions en attente dans ce Pénc.` });
      const animal = up && up.exists ? C.totemOf(up.data()) : null; // photo de profil : l'animal intérieur révélé
      await qCol.doc().set({ text: t.text, name: idt.name, uid, at: Date.now(), votes: 0, voters: [], status: 'open', ...(animal ? { animal } : {}) });
      await signal(pid, { k: 'q' });
      return reply(200, { ok: true });
    }

    if (action === 'vote') {
      const qRef = qCol.doc(String(body.qid || 'x'));
      await db.runTransaction(async (tx) => {
        const q = await tx.get(qRef);
        if (!q.exists || q.data().status === 'hidden') return;
        const voters = Array.isArray(q.data().voters) ? q.data().voters : [];
        const has = voters.includes(uid);
        if (body.on !== false && !has && voters.length < 5000) tx.update(qRef, { voters: [...voters, uid], votes: voters.length + 1 });
        if (body.on === false && has) tx.update(qRef, { voters: voters.filter((v) => v !== uid), votes: voters.length - 1 });
      });
      await signal(pid, { k: 'q' });
      return reply(200, { ok: true });
    }

    if (action === 'chat') {
      if (p.status !== 'live') return reply(409, { error: 'Le Pénc n\'est pas en direct.' });
      const E = lk();
      if (!E.url || !E.key || !E.secret) return reply(503, { error: 'La salle n\'est pas configurée.' });
      const me = identityOf(uid, pid, E.secret);
      if ((Array.isArray(p.banned) ? p.banned : []).includes(me)) return reply(403, { error: 'Tu ne peux plus écrire dans ce Pénc.' });
      const t = L.checkText(body.text, L.MAX_CHAT);
      if (t.crisis) return reply(200, { ok: false, crisis: true });
      if (t.error) return reply(400, { error: t.error });
      const { RoomServiceClient } = require('livekit-server-sdk');
      const svc = new RoomServiceClient(E.url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'), E.key, E.secret);
      const pi = await svc.getParticipant(`penc_${pid}`, me).catch(() => null);
      if (!pi) return reply(409, { error: 'Entre dans la salle pour écrire.' });
      const cid = crypto.randomBytes(6).toString('hex');
      const a = pi.attributes && pi.attributes.animal ? String(pi.attributes.animal) : undefined;
      await signal(pid, { k: 'chat', cid, who: me, n: pi.name || 'Anonyme', t: t.text, h: isMod ? 1 : 0, at: Date.now(), ...(a ? { a } : {}) });
      return reply(200, { ok: true, cid });
    }

    // ───────── Animateur ─────────
    if (!isMod) return reply(403, { error: 'Réservé à l\'hôte et aux modérateurs' });

    if (action === 'pin') {
      const qid = body.qid ? String(body.qid) : null;
      if (qid) { const q = await qCol.doc(qid).get(); if (!q.exists || q.data().status === 'hidden') return reply(404, { error: 'Question introuvable' }); }
      await ref.update({ pinnedQ: qid });
      await signal(pid, { k: 'q' });
      return reply(200, { ok: true });
    }
    if (action === 'answer' || action === 'hide') {
      const qid = String(body.qid || 'x');
      await qCol.doc(qid).update({ status: action === 'answer' ? 'answered' : 'hidden' });
      if (p.pinnedQ === qid) await ref.update({ pinnedQ: null });
      await signal(pid, { k: 'q' });
      return reply(200, { ok: true });
    }
    if (action === 'chat_hide') {
      await signal(pid, { k: 'chat_hide', cid: String(body.cid || '').slice(0, 20) });
      return reply(200, { ok: true });
    }
    if (action === 'slide_add') {
      const slides = Array.isArray(p.slides) ? p.slides : [];
      if (slides.length >= L.MAX_SLIDES) return reply(409, { error: `${L.MAX_SLIDES} images au plus par Pénc.` });
      const img = L.decodeSlide(body.image);
      if (img.error) return reply(400, { error: img.error });
      const path = `pencs/${pid}/slides/${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${img.ext}`;
      await admin.storage().bucket(BUCKET).file(path).save(img.buffer, { contentType: img.mime, resumable: false, metadata: { cacheControl: 'private, max-age=3600' } });
      await ref.update({ slides: [...slides, { path, at: Date.now() }] });
      return reply(200, { ok: true, count: slides.length + 1 });
    }
    if (action === 'slide_show') {
      const slides = Array.isArray(p.slides) ? p.slides : [];
      const i = L.cleanIndex(body.index, slides.length);
      if (i === undefined) return reply(400, { error: 'Image introuvable' });
      await ref.update({ slideIndex: i });
      await signal(pid, { k: 'slide' });
      return reply(200, { ok: true });
    }
    if (action === 'slide_remove') {
      const slides = Array.isArray(p.slides) ? p.slides : [];
      const i = L.cleanIndex(body.index, slides.length);
      if (i === undefined || i === null) return reply(400, { error: 'Image introuvable' });
      await admin.storage().bucket(BUCKET).file(slides[i].path).delete().catch(() => {});
      const cur = Number.isInteger(p.slideIndex) ? p.slideIndex : null;
      const next = cur === null ? null : cur === i ? null : cur > i ? cur - 1 : cur;
      await ref.update({ slides: slides.filter((_, j) => j !== i), slideIndex: next });
      await signal(pid, { k: 'slide' });
      return reply(200, { ok: true });
    }
    return reply(400, { error: 'Action inconnue' });
  } catch (e) {
    console.error('penc-live', action, e && e.message);
    return reply(500, { error: 'Erreur serveur' });
  }
};

/**
 * drlo-question — « Écrire au vrai Dr Lô » : paliers, file d'attente par vagues, parrainage,
 * envoi d'une question, et (admin) réponses. Toute la logique sensible est côté serveur.
 * POST { action, ... } avec le jeton Firebase de la personne.
 *   status            → paliers, place dans la file, mes questions, code de parrainage
 *   join_queue        → réserver sa place
 *   submit            → { text, anonymous, share, includeIntime, includeJournal, videoConsent }
 *   mark_seen         → réponses lues
 *   my_threads        → mes discussions avec Dr Lô (texte, vocal, nouveautés)
 *   followup          → { id, text } : la personne répond, à tour de rôle, jusqu'à la clôture
 *   referral          → { ref } : enregistre le parrain (comptes récents seulement)
 *   drlo_list         → (espace Dr Lô) questions en attente + récentes
 *   drlo_answer       → (espace Dr Lô) { id, answer, audio?, status } : réponse ou suite de la discussion
 *   drlo_entry_edit / drlo_entry_delete / drlo_close → modifier, supprimer une réponse, clôturer
 * L'espace Dr Lô est SÉPARÉ de l'admin : il faut le rôle staff/{uid}.drlo === true
 * (posé à la main dans Firestore), pas le type « admin ».
 */
const { admin, db, verifyAuth } = require('./_firebase');
const Q = require('./_drloQuestions');
const { sendToUser } = require('./_push');
const B = require('./_drloBroadcast');
const C = require('./_drloComments');

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'health-e-af2bf.firebasestorage.app';
const dropFile = (path) => (path ? admin.storage().bucket(BUCKET).file(path).delete().catch(() => {}) : Promise.resolve());
const signed = async (path) => {
  if (!path) return null;
  try { const [u] = await admin.storage().bucket(BUCKET).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 2 * 3600 * 1000 }); return u; } catch (e) { console.error('drlo-question audio url', e.message); return null; }
};

/** La discussion d'une question : messages échangés après la question. Les anciennes réponses (champ `answer`) sont lues comme un premier message de Dr Lô. */
const qThread = (q) => (Array.isArray(q.thread) ? q.thread : q.answer && q.answer.text ? [{ from: 'drlo', text: q.answer.text, at: ms(q.answer.at) }] : []);
const lastDrlo = (t) => { for (let i = t.length - 1; i >= 0; i--) if (t[i].from === 'drlo') return t[i]; return null; };

async function saveAudio(qid, raw) {
  const au = B.validateAudio(raw);
  if (au.error) return { error: au.error, status: 400 };
  const path = `drloQuestions/${qid}/${Date.now()}.${au.ext}`;
  try {
    await admin.storage().bucket(BUCKET).file(path).save(au.buffer, { contentType: au.mime, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
  } catch (e) {
    console.error('drlo-question vocal storage', BUCKET, e.code, e.message);
    return { error: 'Le vocal n\'a pas pu être enregistré (stockage indisponible ou non autorisé). Rien n\'a été envoyé.', status: 502 };
  }
  return { audio: { path, mime: au.mime, durationSec: au.durationSec } };
}

/** Ce que voit la personne : texte, vocal, « Nouveau » ou « Réponse mise à jour » depuis sa dernière visite. */
async function presentThread(q) {
  const seenBefore = Math.max(ms(q.repliesSeenAt), ms(q.seenAt));
  return Promise.all(qThread(q).map(async (e) => ({ ...C.presentEntry(e, seenBefore), audioUrl: e.audio ? await signed(e.audio.path) : null })));
}
const newCount = (q) => {
  const seenBefore = Math.max(ms(q.repliesSeenAt), ms(q.seenAt));
  return qThread(q).filter((e) => e.from === 'drlo' && C.entryTime(e) > seenBefore).length;
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);

async function getConfig() {
  try {
    const s = await db.collection('config').doc('drlo').get();
    const c = s.exists ? s.data() : {};
    return { cap: Number(c.weeklyCap) > 0 ? Number(c.weeklyCap) : Q.WEEKLY_CAP };
  } catch { return { cap: Q.WEEKLY_CAP }; }
}

async function notedDays(uid) {
  const days = new Set();
  const [moods, journal] = await Promise.all([
    db.collection('patients').doc(uid).collection('moods').select('date').get().catch(() => null),
    db.collection('users').doc(uid).collection('journal').orderBy('created_at', 'desc').limit(120).select('created_at').get().catch(() => null),
  ]);
  if (moods) moods.docs.forEach((d) => d.data().date && days.add(String(d.data().date).slice(0, 10)));
  if (journal) journal.docs.forEach((d) => d.data().created_at && days.add(String(d.data().created_at).slice(0, 10)));
  return days.size;
}

async function hasCircle(uid) {
  const checks = await Promise.all([
    db.collection('userProfiles').doc(uid).collection('mesDefis').limit(1).get().then((s) => !s.empty).catch(() => false),
    db.collection('compatibilityHistory').where('userId', '==', uid).limit(1).get().then((s) => !s.empty).catch(() => false),
    db.collection('compatibilityRequests').where('initiatorUserId', '==', uid).limit(1).get().then((s) => !s.empty).catch(() => false),
  ]);
  return checks.some(Boolean);
}

async function myQuestions(uid) {
  const s = await db.collection('drloQuestions').where('uid', '==', uid).get();
  return Promise.all(s.docs.map(async (d) => {
    const q = d.data();
    const thread = qThread(q);
    const last = lastDrlo(thread);
    return {
      id: d.id, text: q.text, status: q.status, anonymous: !!q.anonymous, share: q.share,
      createdAt: ms(q.createdAt), answer: last ? { text: last.text || '', at: C.entryTime(last) } : null,
      seen: !!q.seenAt, thread: await presentThread(q), closed: !!q.closed, canReply: C.userCanFollowUp({ thread, closed: !!q.closed }).ok, news: newCount(q),
    };
  })).then((rows) => rows.sort((a, b) => b.createdAt - a.createdAt));
}

async function referralInfo(uid, profile) {
  let code = profile.referralCode;
  if (!code) {
    code = Q.makeReferralCode();
    await db.collection('userProfiles').doc(uid).set({ referralCode: code }, { merge: true });
  }
  const refs = await db.collection('userProfiles').where('referredBy', '==', code).get().catch(() => null);
  const count = refs ? refs.docs.filter((d) => Object.keys(d.data().scaleResults || {}).length > 0).length : 0;
  return { code, count, goal: Q.REFERRALS_FOR_PRIORITY };
}

async function queueState(uid, cap, now) {
  const [used, queueSnap] = await Promise.all([
    db.collection('drloQuestions').where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(Q.weekStart(now))).count().get()
      .then((c) => c.data().count).catch(() => 0),
    db.collection('drloQueue').get(),
  ]);
  const queue = queueSnap.docs.map((d) => ({ uid: d.id, joinedAt: ms(d.data().joinedAt), priority: !!d.data().priority }));
  return { used, ...Q.admission({ uid, usedThisWeek: used, cap, queue, now }) };
}

async function isDrLo(uid) {
  const s = await db.collection('staff').doc(uid).get();
  return s.exists && s.data().drlo === true;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  const user = await verifyAuth(event);
  if (!user) return reply(401, { error: 'Non authentifié' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'JSON invalide' }); }
  const uid = user.uid;
  const now = Date.now();

  try {
    // ── Admin (espace Dr Lô) ──
    if (['drlo_list', 'drlo_answer', 'drlo_entry_edit', 'drlo_entry_delete', 'drlo_close'].includes(body.action)) {
      if (!(await isDrLo(uid))) return reply(403, { error: 'Accès réservé à Dr Lô' });
      if (body.action === 'drlo_list') {
        const s = await db.collection('drloQuestions').orderBy('createdAt', 'desc').limit(200).get();
        const items = await Promise.all(s.docs.map(async (d) => {
          const q = d.data();
          const thread = qThread(q);
          const last = lastDrlo(thread);
          // Question anonyme : ni compte ni prénom dans l'outil de réponse
          return { id: d.id, text: q.text, status: q.status, anonymous: !!q.anonymous, videoConsent: !!q.videoConsent,
            snapshot: q.snapshot || {}, createdAt: ms(q.createdAt), answer: last ? { text: last.text || '', at: C.entryTime(last) } : null,
            closed: !!q.closed, lastUserAt: Number(q.lastUserAt) || 0,
            thread: await Promise.all(thread.map(async (e, index) => ({ index, from: e.from, text: e.text || '', at: Number(e.at) || 0, editedAt: Number(e.editedAt) || null,
              audioSec: e.audio ? Number(e.audio.durationSec) || 0 : 0, audioUrl: e.audio ? await signed(e.audio.path) : null }))) };
        }));
        const cfg = await getConfig();
        const used = await db.collection('drloQuestions').where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(Q.weekStart(now))).count().get().then((c) => c.data().count).catch(() => 0);
        const queued = await db.collection('drloQueue').count().get().then((c) => c.data().count).catch(() => 0);
        return reply(200, { items, week: { used, cap: cfg.cap, queued } });
      }
      if (!body.id) return reply(400, { error: 'Question manquante' });
      const qRef = db.collection('drloQuestions').doc(String(body.id));
      const qSnap = await qRef.get();
      if (!qSnap.exists) return reply(404, { error: 'Question introuvable' });
      const q = qSnap.data();
      const thread = qThread(q).map((e) => ({ ...e }));
      const sync = (t) => {
        const last = lastDrlo(t);
        return { thread: t, status: last ? (q.status === 'referred' ? 'referred' : 'answered') : 'pending', answer: last ? { text: last.text || '', at: C.entryTime(last), by: uid } : null };
      };

      if (body.action === 'drlo_close') {
        await qRef.update({ closed: body.closed !== false });
        return reply(200, { ok: true });
      }

      if (body.action === 'drlo_entry_delete') {
        const idx = Number(body.index);
        const t = thread[idx];
        if (!t || t.from !== 'drlo') return reply(400, { error: 'Cette réponse est introuvable.' });
        thread.splice(idx, 1);
        await qRef.update(sync(thread));
        await dropFile(t.audio && t.audio.path);
        return reply(200, { ok: true });
      }

      if (body.action === 'drlo_entry_edit') {
        const idx = Number(body.index);
        const target = thread[idx];
        if (!target || target.from !== 'drlo') return reply(400, { error: 'Cette réponse est introuvable.' });
        const keepsAudio = !!target.audio && !body.audio && body.removeAudio !== true;
        const v = C.validateEntry(body.text, !!body.audio || keepsAudio);
        if (v.error) return reply(400, { error: v.error });
        let newAudio = null;
        if (body.audio) { const sv = await saveAudio(qRef.id, body.audio); if (sv.error) return reply(sv.status, { error: sv.error }); newAudio = sv.audio; }
        const oldPath = (newAudio || body.removeAudio === true) ? target.audio && target.audio.path : null;
        const next = { ...target, text: v.text, editedAt: now };
        if (newAudio) next.audio = newAudio; else if (body.removeAudio === true) delete next.audio;
        if (!next.text && !next.audio) return reply(400, { error: 'Ajoute un texte ou un vocal.' });
        thread[idx] = next;
        await qRef.update(sync(thread));
        await dropFile(oldPath);
        return reply(200, { ok: true });
      }

      // drlo_answer : première réponse, ou suite de la discussion. Texte et/ou vocal.
      if (q.closed) return reply(409, { error: 'Cette discussion est clôturée. Rouvre-la pour répondre.' });
      if (thread.length >= C.MAX_THREAD) return reply(400, { error: 'Cette discussion est déjà très longue.' });
      const status = body.status === 'referred' ? 'referred' : 'answered';
      const v = C.validateEntry(body.answer, !!body.audio, 6000);
      if (v.error) return reply(400, { error: v.error });
      let audio = null;
      if (body.audio) { const sv = await saveAudio(qRef.id, body.audio); if (sv.error) return reply(sv.status, { error: sv.error }); audio = sv.audio; }
      if (!v.text && !audio) return reply(400, { error: 'Réponse vide' });
      thread.push({ from: 'drlo', text: v.text, at: now, ...(audio ? { audio } : {}) });
      await qRef.update({ ...sync(thread), status, seenAt: null });
      try {
        if (q.uid) await sendToUser(q.uid, { kind: 'drlo_answer', title: 'Dr Lô', body: 'Le vrai Dr Lô t\'a répondu. Ta réponse t\'attend.', inboxTitle: 'Le vrai Dr Lô t\'a répondu', inboxBody: 'Ta réponse t\'attend.', link: '/messages-dr-lo' });
      } catch (e) { console.warn('drlo answer push failed', e.message); }
      return reply(200, { ok: true });
    }

    const profileSnap = await db.collection('userProfiles').doc(uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    if (body.action === 'referral') {
      const ref = String(body.ref || '').trim().toUpperCase();
      const created = ms(profile.createdAt);
      if (!/^[A-Z2-9]{6}$/.test(ref) || profile.referredBy || ref === profile.referralCode || (created && now - created > 7 * 86400000)) {
        return reply(200, { ok: false });
      }
      await db.collection('userProfiles').doc(uid).set({ referredBy: ref }, { merge: true });
      return reply(200, { ok: true });
    }

    if (body.action === 'mark_seen') {
      const qs = await db.collection('drloQuestions').where('uid', '==', uid).get();
      await Promise.all(qs.docs.filter((d) => qThread(d.data()).length > 0)
        .map((d) => d.ref.update({ seenAt: admin.firestore.FieldValue.serverTimestamp(), repliesSeenAt: now })));
      return reply(200, { ok: true });
    }

    if (body.action === 'my_threads') {
      const mineQ = await myQuestions(uid);
      const rows = mineQ.filter((q) => q.thread.length > 0);
      return reply(200, { items: rows, news: rows.reduce((n, q) => n + q.news, 0) });
    }

    if (body.action === 'followup') {
      const qRef = db.collection('drloQuestions').doc(String(body.id || 'x'));
      const qSnap = await qRef.get();
      if (!qSnap.exists || qSnap.data().uid !== uid) return reply(404, { error: 'Discussion introuvable' });
      const q = qSnap.data();
      const thread = qThread(q).map((e) => ({ ...e }));
      const can = C.userCanFollowUp({ thread, closed: !!q.closed });
      if (!can.ok) return reply(409, { error: can.error });
      const v = C.validateComment(body.text, 600);
      if (v.error) return reply(400, { error: v.error });
      const mod = C.moderate(v.text);
      if (!mod.ok && mod.reason === 'crisis') {
        await sendToUser(uid, C.CRISIS_NOTIF).catch(() => {});
        return reply(200, { ok: true, published: false, support: true });
      }
      if (!mod.ok) return reply(400, { error: C.REASON_TEXT[mod.reason] || 'Message non accepté.' });
      thread.push({ from: 'user', text: v.text, at: now });
      await qRef.update({ thread, lastUserAt: now, answer: q.answer || null });
      return reply(200, { ok: true, published: true });
    }

    const [days, circle, mine, cfg] = await Promise.all([notedDays(uid), hasCircle(uid), myQuestions(uid), getConfig()]);
    const totemRevealed = !!(profile.totem && profile.totem.animal && profile.totem.revealedAt);
    const paliers = Q.computePaliers({ totemRevealed, notedDays: days, circle });
    const ask = Q.askState(mine, now);

    if (body.action === 'join_queue') {
      if (!paliers.unlocked) return reply(400, { error: 'Termine d\'abord les étapes.' });
      const ref = db.collection('drloQueue').doc(uid);
      const s = await ref.get();
      if (!s.exists) await ref.set({ joinedAt: admin.firestore.FieldValue.serverTimestamp(), priority: false });
    }

    const referral = await referralInfo(uid, profile);
    if (referral.count >= Q.REFERRALS_FOR_PRIORITY) {
      const ref = db.collection('drloQueue').doc(uid);
      const s = await ref.get();
      if (s.exists && !s.data().priority) await ref.update({ priority: true });
    }
    const queue = await queueState(uid, cfg.cap, now);

    if (body.action === 'submit') {
      if (!paliers.unlocked) return reply(400, { error: 'Termine d\'abord les étapes.' });
      if (!ask.ok) return reply(400, { error: ask.reason === 'pending' ? 'Ta question précédente attend encore sa réponse.' : 'Ta prochaine question gratuite arrive bientôt.' });
      if (!queue.canSubmit) return reply(409, { error: 'Les places de la semaine sont prises. Réserve ta place pour la prochaine vague.', queue });
      const v = Q.validQuestion(body.text);
      if (!v.ok) return reply(400, { error: v.error });
      const share = ['none', 'totem', 'results'].includes(body.share) ? body.share : 'none';
      let journal = [];
      if (body.includeJournal) {
        const j = await db.collection('users').doc(uid).collection('journal').orderBy('created_at', 'desc').limit(5).get().catch(() => null);
        journal = j ? j.docs.map((d) => d.data()) : [];
      }
      const snapshot = Q.buildSnapshot({ profile, share, includeIntime: !!body.includeIntime, includeJournal: !!body.includeJournal, journal, anonymous: !!body.anonymous });
      await db.collection('drloQuestions').add({
        uid, text: v.text, anonymous: !!body.anonymous, share, videoConsent: !!body.videoConsent,
        snapshot, status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp(), answer: null, seenAt: null,
      });
      await db.collection('drloQueue').doc(uid).delete().catch(() => {});
      return reply(200, { ok: true });
    }

    return reply(200, {
      paliers, notedDays: days, ask, queue: { ...queue, used: undefined }, referral,
      questions: mine, cap: cfg.cap,
    });
  } catch (e) {
    console.error('[drlo-question]', e && e.message);
    return reply(500, { error: 'Erreur serveur. Réessaie dans un instant.' });
  }
};

/**
 * drlo-question — « Écrire au vrai Dr Lô » : paliers, file d'attente par vagues, parrainage,
 * envoi d'une question, et (admin) réponses. Toute la logique sensible est côté serveur.
 * POST { action, ... } avec le jeton Firebase de la personne.
 *   status            → paliers, place dans la file, mes questions, code de parrainage
 *   join_queue        → réserver sa place
 *   submit            → { text, anonymous, share, includeIntime, includeJournal, videoConsent }
 *   mark_seen         → réponses lues
 *   referral          → { ref } : enregistre le parrain (comptes récents seulement)
 *   drlo_list         → (espace Dr Lô) questions en attente + récentes
 *   drlo_answer       → (espace Dr Lô) { id, answer, status: 'answered' | 'referred' }
 * L'espace Dr Lô est SÉPARÉ de l'admin : il faut le rôle staff/{uid}.drlo === true
 * (posé à la main dans Firestore), pas le type « admin ».
 */
const { admin, db, verifyAuth } = require('./_firebase');
const Q = require('./_drloQuestions');

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
  return s.docs.map((d) => {
    const q = d.data();
    return {
      id: d.id, text: q.text, status: q.status, anonymous: !!q.anonymous, share: q.share,
      createdAt: ms(q.createdAt), answer: q.answer ? { text: q.answer.text, at: ms(q.answer.at) } : null,
      seen: !!q.seenAt,
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
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
    // ── Admin ──
    if (body.action === 'drlo_list' || body.action === 'drlo_answer') {
      if (!(await isDrLo(uid))) return reply(403, { error: 'Accès réservé à Dr Lô' });
      if (body.action === 'drlo_list') {
        const s = await db.collection('drloQuestions').orderBy('createdAt', 'desc').limit(200).get();
        const items = s.docs.map((d) => {
          const q = d.data();
          // Question anonyme : ni compte ni prénom dans l'outil de réponse
          return { id: d.id, text: q.text, status: q.status, anonymous: !!q.anonymous, videoConsent: !!q.videoConsent,
            snapshot: q.snapshot || {}, createdAt: ms(q.createdAt), answer: q.answer ? { text: q.answer.text, at: ms(q.answer.at) } : null };
        });
        const cfg = await getConfig();
        const used = await db.collection('drloQuestions').where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(Q.weekStart(now))).count().get().then((c) => c.data().count).catch(() => 0);
        const queued = await db.collection('drloQueue').count().get().then((c) => c.data().count).catch(() => 0);
        return reply(200, { items, week: { used, cap: cfg.cap, queued } });
      }
      const text = String(body.answer || '').trim();
      const status = body.status === 'referred' ? 'referred' : 'answered';
      if (!body.id || text.length < 2) return reply(400, { error: 'Réponse vide' });
      await db.collection('drloQuestions').doc(String(body.id)).update({
        status, answer: { text: text.slice(0, 6000), at: admin.firestore.FieldValue.serverTimestamp(), by: uid }, seenAt: null,
      });
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
      await Promise.all(qs.docs.filter((d) => d.data().answer && !d.data().seenAt)
        .map((d) => d.ref.update({ seenAt: admin.firestore.FieldValue.serverTimestamp() })));
      return reply(200, { ok: true });
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

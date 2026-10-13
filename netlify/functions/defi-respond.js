const crypto = require('crypto');
const { admin, db, verifyAuth } = require('./_firebase');
const { scoreResponse, DEFI_SCALE_CONFIG } = require('./_defi/questionBank');
const { verifyStartToken } = require('./_defi/tokenUtils');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MS = 16000;
const RATE_LIMIT = 10;
const CLASSEMENT_MAX = 50;

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function sanitizePseudo(raw) {
  if (typeof raw !== 'string') return null;
  let name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 20) return null;
  if (/<|>/.test(name)) return null;
  if (/https?:\/\//i.test(name)) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(name)) return null;
  return name;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildDevoilement(defi, truths) {
  if (defi.devoilement !== 'auto') return null;

  const revealed = [];
  for (let i = 0; i < truths.length; i++) {
    const truth = truths[i];
    if (truth.source === 'totem') {
      revealed.push({ questionIndex: i, correctOptionId: truth.correctOptionId });
      continue;
    }
    if (truth.source === 'scale' && truth.scaleId) {
      const rootScale = truth.scaleId.split('.')[0];
      const config = DEFI_SCALE_CONFIG[rootScale];
      if (config && config[defi.mode] === 'auto') {
        revealed.push({ questionIndex: i, correctOptionId: truth.correctOptionId });
      }
    }
  }
  return revealed.length > 0 ? revealed : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secret = process.env.DEFI_TOKEN_SECRET;
  if (!secret) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Service temporairement indisponible' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  try {
    const { slug, deviceId, pseudo: rawPseudo, startToken, answers } = payload;

    // ── 1. Token ────────────────────────────────────────────────────────
    const tokenData = verifyStartToken(startToken, secret, slug, deviceId);
    if (!tokenData) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Token invalide ou expiré' }) };
    }
    const tempsServeur = Date.now() - tokenData.t0;

    // ── 2. Auth optionnelle ─────────────────────────────────────────────
    const user = await verifyAuth(event);

    // ── 3. Validation entrées ───────────────────────────────────────────
    if (!deviceId || !UUID_RE.test(deviceId)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'deviceId invalide' }) };
    }
    const pseudo = sanitizePseudo(rawPseudo);
    if (!pseudo) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pseudo invalide (2-20 caractères)' }) };
    }
    if (!Array.isArray(answers)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Réponses manquantes' }) };
    }

    // ── 4. Charger le défi ──────────────────────────────────────────────
    const defiDoc = await db.collection('defis').doc(slug).get();
    if (!defiDoc.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Défi introuvable' }) };
    }
    const defi = defiDoc.data();
    const expiresAt = defi.expiresAt?.toDate ? defi.expiresAt.toDate() : new Date(defi.expiresAt);
    if (expiresAt <= new Date()) {
      return { statusCode: 410, headers, body: JSON.stringify({ error: 'Ce défi est terminé' }) };
    }

    // Vérifier nombre de réponses
    if (answers.length !== defi.questions.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `${defi.questions.length} réponses attendues` }) };
    }

    // Vérifier chaque réponse
    for (let i = 0; i < answers.length; i++) {
      const a = answers[i];
      if (a.optionId !== null && a.optionId !== undefined) {
        const validIds = defi.questions[i].options.map(o => o.id);
        if (!validIds.includes(a.optionId)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Option invalide pour la question ${i + 1}` }) };
        }
      }
      if (typeof a.ms === 'number' && a.ms > MAX_MS) {
        a.ms = MAX_MS;
      }
    }

    // ── 5. Rate limit ───────────────────────────────────────────────────
    const clientIp = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || '0.0.0.0').split(',')[0].trim();
    const hourBucket = Math.floor(Date.now() / 3600000);
    const rateLimitId = `${sha256(clientIp)}_${hourBucket}`;
    const rateLimitRef = db.collection('rate_limits').doc(rateLimitId);
    const rateLimitDoc = await rateLimitRef.get();

    if (rateLimitDoc.exists && (rateLimitDoc.data().count || 0) >= RATE_LIMIT) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de réponses depuis cette adresse. Réessaie dans une heure.' }) };
    }

    // ── 6. Créateur interdit ────────────────────────────────────────────
    const privateDoc = await db.collection('defis_private').doc(slug).get();
    if (!privateDoc.exists) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Données du défi incomplètes' }) };
    }
    const defiPrivate = privateDoc.data();

    if (user && user.uid === defiPrivate.uid) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Tu ne peux pas répondre à ton propre défi 😄' }) };
    }

    // ── 7. Scoring ──────────────────────────────────────────────────────
    const responses = answers.map(a => (a.optionId ? { optionId: a.optionId } : null));
    const result = scoreResponse(defiPrivate.truths, responses);

    // ── 8. Transaction ──────────────────────────────────────────────────
    const deviceHash = sha256(deviceId);
    const responseId = `${slug}_${deviceHash}`;
    const respondedAt = admin.firestore.FieldValue.serverTimestamp();

    let rang;
    let nbRepondants;

    await db.runTransaction(async (tx) => {
      // Unicité device
      const existingRef = db.collection('defi_reponses').doc(responseId);
      const existingDoc = await tx.get(existingRef);
      if (existingDoc.exists) {
        throw new Error('ALREADY_RESPONDED');
      }

      // Unicité uid
      if (user) {
        const uidLockId = `${slug}_${sha256(user.uid)}`;
        if (uidLockId !== responseId) {
          const uidLockRef = db.collection('defi_reponses').doc(uidLockId);
          const uidLockDoc = await tx.get(uidLockRef);
          if (uidLockDoc.exists) {
            throw new Error('ALREADY_RESPONDED');
          }
          tx.set(uidLockRef, { slug, uid: user.uid, deviceHash, lockOnly: true, createdAt: respondedAt });
        }
      }

      // Écrire la réponse
      tx.set(existingRef, {
        slug,
        deviceHash,
        pseudo: escapeHtml(pseudo),
        score: result.score,
        bonnes: result.bonnes,
        presque: result.presque,
        mauvaises: result.mauvaises,
        tempsServeur,
        answers: answers.map(a => ({ optionId: a.optionId || null, ms: Math.min(a.ms || 0, MAX_MS) })),
        respondedAt,
        uid: user?.uid || null,
        ipHash: sha256(clientIp),
      });

      // Mettre à jour le classement
      const defiRef = db.collection('defis').doc(slug);
      const freshDefi = await tx.get(defiRef);
      const currentData = freshDefi.data();
      const classement = currentData.classement || [];

      classement.push({
        pseudo: escapeHtml(pseudo),
        score: result.score,
        tempsServeur,
        respondedAt: new Date(),
      });

      classement.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tempsServeur !== b.tempsServeur) return a.tempsServeur - b.tempsServeur;
        const aDate = a.respondedAt instanceof Date ? a.respondedAt : (a.respondedAt?.toDate ? a.respondedAt.toDate() : new Date(a.respondedAt));
        const bDate = b.respondedAt instanceof Date ? b.respondedAt : (b.respondedAt?.toDate ? b.respondedAt.toDate() : new Date(b.respondedAt));
        return aDate - bDate;
      });

      const trimmed = classement.slice(0, CLASSEMENT_MAX);
      rang = trimmed.findIndex(e => e.pseudo === escapeHtml(pseudo) && e.tempsServeur === tempsServeur) + 1;
      nbRepondants = (currentData.nbReponses || 0) + 1;

      const newNbReponses = (currentData.nbReponses || 0) + 1;
      const newScoreSum = (currentData.scoreSum || 0) + result.score;

      tx.update(defiRef, {
        classement: trimmed,
        nbReponses: admin.firestore.FieldValue.increment(1),
        scoreSum: admin.firestore.FieldValue.increment(result.score),
        scoreMoyen: Math.round(newScoreSum / newNbReponses),
      });

      // Rate limit
      if (rateLimitDoc.exists) {
        tx.update(rateLimitRef, {
          count: admin.firestore.FieldValue.increment(1),
        });
      } else {
        tx.set(rateLimitRef, {
          count: 1,
          expireAt: new Date(Date.now() + 2 * 3600000),
        });
      }
    });

    // ── 9. Notification créateur (fire-and-forget) ───────────────────────
    try {
      const creatorUid = defiPrivate.uid;
      await db.collection('notifications').add({
        userId: creatorUid,
        type: 'defi_response',
        title: 'Nouvelle réponse à ton défi',
        content: `${pseudo} vient de répondre : ${result.score} % 👀`,
        sourceId: slug,
        sourceType: 'defi',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        priority: 'medium',
      });
    } catch (notifErr) {
      console.warn('defi-respond notification error (non-blocking):', notifErr.message);
    }

    // ── 10. Réponse ──────────────────────────────────────────────────────
    const responseBody = {
      score: result.score,
      bonnes: result.bonnes,
      presque: result.presque,
      mauvaises: result.mauvaises,
      total: result.total,
      rang: rang || 1,
      nbRepondants,
    };

    const devoilement = buildDevoilement(defi, defiPrivate.truths);
    if (devoilement) {
      responseBody.devoilement = devoilement;
    }

    return { statusCode: 200, headers, body: JSON.stringify(responseBody) };

  } catch (err) {
    if (err.message === 'ALREADY_RESPONDED') {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Tu as déjà répondu à ce défi' }) };
    }
    console.error('defi-respond error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

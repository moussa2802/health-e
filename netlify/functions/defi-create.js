const { admin, db, verifyAuth } = require('./_firebase');
const { selectQuestions, buildQuestionsFromKeys, generateSlug, PERSO_QUESTIONS } = require('./_defi/questionBank');
const { getActiveDefis, canCreateDefi, buildActiveDefisUpdate } = require('./_defi/activeDefisHelper');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const DEFI_SCALE_CONFIG = {
  big_five:           { public: 'auto',     intime: 'auto' },
  ecr_r:              { public: 'auto',     intime: 'auto' },
  brs:                { public: 'auto',     intime: 'auto' },
  bonus_tdah:         { public: 'auto',     intime: 'auto' },
  bonus_hsp:          { public: 'auto',     intime: 'auto' },
  bonus_hpi:          { public: 'auto',     intime: 'auto' },
  bonus_jalousie:     { public: 'auto',     intime: 'auto' },
  bonus_eq:           { public: 'auto',     intime: 'auto' },
  bonus_confiance:    { public: 'auto',     intime: 'auto' },
  bonus_personnalite: { public: 'interdit', intime: 'optin' },
  bonus_narcissisme:  { public: 'auto',     intime: 'auto' },
  bonus_manipulation: { public: 'auto',     intime: 'auto' },
  gad7:               { public: 'optin',    intime: 'optin' },
  rses:               { public: 'optin',    intime: 'optin' },
  pss10:              { public: 'optin',    intime: 'optin' },
  social_pressure:    { public: 'optin',    intime: 'optin' },
  bonus_burnout:      { public: 'optin',    intime: 'optin' },
  bonus_dependance:   { public: 'optin',    intime: 'optin' },
};

const VALID_DURATIONS = [48, 72, 168];
const VALID_DEVOILEMENTS = ['aucun', 'auto'];
const VALID_AUDIENCES = ['famille', 'amis', 'couple', 'collegues', 'tous'];

function sanitizeTitre(raw) {
  if (typeof raw !== 'string') return null;
  let name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.length > 30) return null;
  if (/<|>/.test(name)) return null;
  if (/https?:\/\//i.test(name)) return null;
  if (/\d/.test(name)) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(name)) return null;
  return name;
}

function sanitizeDisplayName(raw) {
  if (typeof raw !== 'string') return null;
  let name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 20) return null;
  if (/<|>/.test(name)) return null;
  if (/https?:\/\//i.test(name)) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(name)) return null;
  return name;
}

function buildEligibleResults(scaleResults, optinScales, mode) {
  const optinSet = new Set(Array.isArray(optinScales) ? optinScales : []);
  const eligible = [];

  for (const [scaleId, sr] of Object.entries(scaleResults)) {
    const config = DEFI_SCALE_CONFIG[scaleId];
    if (!config) continue;
    const level = config[mode];
    if (level === 'interdit') continue;
    if (level === 'optin' && !optinSet.has(scaleId)) continue;
    if ((sr.alertLevel ?? 0) >= 3) continue;

    eligible.push({
      scaleId,
      totalScore: sr.totalScore,
      subscaleScores: sr.subscaleScores || null,
      alertLevel: sr.alertLevel ?? 0,
    });
  }

  return eligible;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = await verifyAuth(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  try {
    // ── 1. Feature flag ──────────────────────────────────────────────────
    const featDoc = await db.collection('config').doc('features').get();
    if (!featDoc.exists) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Fonctionnalité non disponible' }) };
    }
    const defiFlag = featDoc.data().defi;
    if (!defiFlag) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Fonctionnalité non disponible' }) };
    }
    const flagEnabled = defiFlag.enabled === true ||
      (Array.isArray(defiFlag.allowlist) && defiFlag.allowlist.includes(user.uid));
    if (!flagEnabled) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Fonctionnalité non disponible' }) };
    }

    // ── 2. Totem révélé ──────────────────────────────────────────────────
    const profileDoc = await db.collection('userProfiles').doc(user.uid).get();
    if (!profileDoc.exists) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Profil introuvable' }) };
    }
    const profile = profileDoc.data();
    if (!profile.totem || !profile.totem.revealedAt) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Tu dois révéler ton totem avant de créer un défi' }) };
    }

    // ── 3. Multi-défi : max 3 actifs simultanés ────────────────────────
    const currentActiveDefis = getActiveDefis(profile);
    if (!canCreateDefi(currentActiveDefis)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Tu as déjà 3 défis actifs. Termine ou attends l\'expiration d\'un défi avant d\'en créer un nouveau.' }),
      };
    }

    // ── 4. Validation des entrées ────────────────────────────────────────
    const displayName = sanitizeDisplayName(payload.displayName);
    if (!displayName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pseudo invalide (2-20 caractères, pas de HTML ni de liens)' }) };
    }

    const titre = sanitizeTitre(payload.titre || 'Mon défi');
    if (!titre) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Titre invalide (3-30 caractères, pas de chiffres, HTML ou liens)' }) };
    }

    const audience = VALID_AUDIENCES.includes(payload.audience) ? payload.audience : 'tous';
    const petitsMots = payload.petitsMots !== false;

    const duration = VALID_DURATIONS.includes(payload.duration) ? payload.duration : 72;
    const devoilement = VALID_DEVOILEMENTS.includes(payload.devoilement) ? payload.devoilement : 'aucun';

    // ── 5. Genre (sauvegarde dans defiGenre si inconnu) ────────────────────
    const scaleResults = profile.scaleResults || {};
    let genre = profile.defiGenre || profile.onboardingProfile?.genre || null;
    if (!genre && (payload.genre === 'masculin' || payload.genre === 'feminin')) {
      genre = payload.genre;
      await db.collection('userProfiles').doc(user.uid).update({ defiGenre: genre });
    }
    const totemAnimal = profile.totem.animal;

    const defiBandsDoc = await db.collection('config').doc('defiBands').get();
    const defiBands = defiBandsDoc.exists ? defiBandsDoc.data() : null;

    const eligibleResults = buildEligibleResults(scaleResults, payload.optinScales, 'public');

    // Validate perso questions
    let persoQuestions = null;
    if (Array.isArray(payload.persoQuestions) && payload.persoQuestions.length > 0) {
      if (payload.persoQuestions.length > 3) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Maximum 3 questions perso' }) };
      }
      const bank = PERSO_QUESTIONS;
      const allPerso = [...(bank.tous || [])];
      if (bank[audience]) allPerso.push(...bank[audience]);
      const validIds = new Set(allPerso.map(p => p.id));
      const validAnswers = new Map(allPerso.map(p => [p.id, new Set(p.options)]));

      for (const pq of payload.persoQuestions) {
        if (!pq.questionId || !validIds.has(pq.questionId)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Question perso inconnue : ${pq.questionId}` }) };
        }
        if (!pq.creatorAnswer || !validAnswers.get(pq.questionId).has(pq.creatorAnswer)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Réponse invalide pour ${pq.questionId}` }) };
        }
      }
      persoQuestions = payload.persoQuestions.map(pq => ({
        questionId: pq.questionId,
        creatorAnswer: pq.creatorAnswer,
      }));
    }

    // Get previous variant ids to avoid repetition
    let previousVariantIds = [];
    try {
      const mesDefisSnap = await db.collection('userProfiles').doc(user.uid)
        .collection('mesDefis').orderBy('createdAt', 'desc').limit(1).get();
      if (!mesDefisSnap.empty) {
        const lastDefi = mesDefisSnap.docs[0].data();
        if (lastDefi.variantIds) previousVariantIds = lastDefi.variantIds;
      }
    } catch {}

    let qResult;
    if (Array.isArray(payload.selectedKeys) && payload.selectedKeys.length > 0) {
      qResult = buildQuestionsFromKeys(
        payload.selectedKeys, eligibleResults, genre, displayName, 'public', totemAnimal, defiBands,
        { audience, persoQuestions, previousVariantIds }
      );
    } else {
      qResult = selectQuestions(
        eligibleResults, genre, displayName, 'public', totemAnimal, defiBands
      );
    }
    const { error: qError, questions, truths, variantIds } = qResult;

    if (qError) {
      const errorMessages = {
        invalid_keys: 'Clés de questions invalides',
        invalid_key_count: 'Il faut entre 6 et 8 questions',
        duplicate_keys: 'Clés de questions en double',
        totem_in_keys: 'Le totem ne doit pas figurer dans les clés',
        unknown_key: `Question inconnue : ${qResult.detail || ''}`,
        ineligible_key: `Question non éligible : ${qResult.detail || ''}`,
        too_many_big_five: 'Trop de questions Big Five (max 3)',
        no_eligible_scales: 'Pas assez de tests complétés pour créer un défi',
        not_enough_scales: 'Pas assez de tests complétés pour créer un défi',
      };
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: errorMessages[qError] || 'Erreur de sélection des questions' }),
      };
    }

    // ── 6. Slug unique ───────────────────────────────────────────────────
    let slug;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSlug();
      const existing = await db.collection('defis').doc(candidate).get();
      if (!existing.exists) {
        slug = candidate;
        break;
      }
    }
    if (!slug) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Impossible de générer un identifiant unique' }) };
    }

    // ── 7. Écriture transactionnelle ─────────────────────────────────────
    const createdAt = admin.firestore.FieldValue.serverTimestamp();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + duration * 60 * 60 * 1000)
    );

    const optionBandMap = {};
    for (const truth of truths) {
      if (truth.optionBands) {
        for (const [optId, band] of Object.entries(truth.optionBands)) {
          optionBandMap[optId] = band;
        }
      }
    }

    await db.runTransaction(async (tx) => {
      const defiRef = db.collection('defis').doc(slug);
      const privateRef = db.collection('defis_private').doc(slug);
      const profileRef = db.collection('userProfiles').doc(user.uid);

      tx.set(defiRef, {
        slug,
        displayName,
        titre,
        audience,
        petitsMots,
        genre,
        mode: 'public',
        statut: 'actif',
        createdAt,
        expiresAt,
        devoilement,
        nbReponses: 0,
        classement: [],
        cagnotte_koris: 0,
        questions: questions.map(q => ({
          text: q.text,
          options: q.options,
          source: q.source,
          ...(q.bonus ? { bonus: q.bonus } : {}),
        })),
      });

      const privateData = {
        uid: user.uid,
        slug,
        statut: 'actif',
        expiresAt,
        truths,
        totemAnimal,
        optionBandMap,
      };
      if (persoQuestions) {
        privateData.persoAnswers = persoQuestions;
      }
      tx.set(privateRef, privateData);

      const newActiveDefis = buildActiveDefisUpdate(currentActiveDefis, {
        slug, titre, audience, expiresAt,
      });

      tx.update(profileRef, {
        activeDefis: newActiveDefis.map(ad => ({
          slug: ad.slug, titre: ad.titre, audience: ad.audience, expiresAt: ad.expiresAt,
        })),
        activeDefi: { slug, expiresAt },
        defiHistory: true,
        updatedAt: createdAt,
      });

      const mesDefiData = {
        slug,
        displayName,
        titre,
        audience,
        createdAt,
        expiresAt,
      };
      if (variantIds && variantIds.length > 0) {
        mesDefiData.variantIds = variantIds;
      }
      tx.set(db.collection('userProfiles').doc(user.uid).collection('mesDefis').doc(slug), mesDefiData);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ slug, url: `https://health-e.sn/api/d/${slug}` }),
    };

  } catch (err) {
    console.error('defi-create error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

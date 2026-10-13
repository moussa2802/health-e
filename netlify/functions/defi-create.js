const { admin, db, verifyAuth } = require('./_firebase');
const { selectQuestions, generateSlug } = require('./_defi/questionBank');

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

    // ── 3. Défi actif existant (via userProfiles, pas de query composite) ─
    const activeDefi = profile.activeDefi;
    if (activeDefi && activeDefi.slug) {
      const expTs = activeDefi.expiresAt;
      const expDate = expTs && expTs.toDate ? expTs.toDate() : expTs;
      if (expDate && expDate > new Date()) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ existing: true, slug: activeDefi.slug, url: `https://health-e.sn/api/d/${activeDefi.slug}` }),
        };
      }
    }

    // ── 4. Validation des entrées ────────────────────────────────────────
    const displayName = sanitizeDisplayName(payload.displayName);
    if (!displayName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pseudo invalide (2-20 caractères, pas de HTML ni de liens)' }) };
    }

    const duration = VALID_DURATIONS.includes(payload.duration) ? payload.duration : 72;
    const devoilement = VALID_DEVOILEMENTS.includes(payload.devoilement) ? payload.devoilement : 'aucun';

    // ── 5. Genre (sauvegarde dans defiGenre si inconnu) ────────────────────
    const scaleResults = profile.scaleResults || {};
    let genre = profile.onboardingProfile?.genre || profile.defiGenre || null;
    if (!genre && (payload.genre === 'masculin' || payload.genre === 'feminin')) {
      genre = payload.genre;
      await db.collection('userProfiles').doc(user.uid).update({ defiGenre: genre });
    }
    const totemAnimal = profile.totem.animal;

    const defiBandsDoc = await db.collection('config').doc('defiBands').get();
    const defiBands = defiBandsDoc.exists ? defiBandsDoc.data() : null;

    const eligibleResults = buildEligibleResults(scaleResults, payload.optinScales, 'public');

    const { error: qError, questions, truths } = selectQuestions(
      eligibleResults, genre, displayName, 'public', totemAnimal, defiBands
    );

    if (qError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pas assez de tests complétés pour créer un défi' }) };
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

      tx.set(privateRef, {
        uid: user.uid,
        slug,
        statut: 'actif',
        expiresAt,
        truths,
        totemAnimal,
        optionBandMap,
      });

      tx.update(profileRef, {
        activeDefi: { slug, expiresAt },
        updatedAt: createdAt,
      });

      tx.set(db.collection('userProfiles').doc(user.uid).collection('mesDefis').doc(slug), {
        slug,
        displayName,
        createdAt,
        expiresAt,
      });
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

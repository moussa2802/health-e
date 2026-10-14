const { db, verifyAuth } = require('./_firebase');
const {
  selectDimensions,
  getQuestionText,
  selectVariant,
  resolveGender,
  DEFI_SCALE_CONFIG,
  DIMENSION_THEMES,
  AUDIENCE_EXCLUSIONS,
  PERSO_QUESTIONS,
} = require('./_defi/questionBank');

const VALID_AUDIENCES = ['famille', 'amis', 'couple', 'collegues', 'tous'];

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

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

function collectAllDimKeys(scaleResults) {
  const keys = new Set();
  for (const [scaleId, sr] of Object.entries(scaleResults)) {
    const config = DEFI_SCALE_CONFIG[scaleId];
    if (!config || config.public === 'interdit') continue;

    if (scaleId === 'big_five') {
      for (const sk of ['extraversion', 'agreeableness', 'conscientiousness', 'emotional_stability', 'openness']) {
        keys.add(`big_five.${sk}`);
      }
    } else if (scaleId === 'ecr_r') {
      for (const sk of ['anxiety', 'avoidance']) {
        keys.add(`ecr_r.${sk}`);
      }
    } else {
      keys.add(scaleId);
    }
  }
  return keys;
}

const SCALE_TEST_NAMES = {
  big_five: 'Personnalité (Big Five)',
  ecr_r: 'Attachement (ECR-R)',
  brs: 'Résilience',
  bonus_tdah: 'Concentration (TDAH)',
  bonus_hsp: 'Sensibilité (HSP)',
  bonus_hpi: 'Cognition (HPI)',
  bonus_jalousie: 'Jalousie',
  bonus_eq: 'Intelligence émotionnelle',
  bonus_confiance: 'Confiance en soi',
  bonus_narcissisme: 'Narcissisme',
  bonus_manipulation: 'Machiavélisme',
  gad7: 'Anxiété (GAD-7)',
  rses: 'Estime de soi (RSES)',
  pss10: 'Stress perçu (PSS-10)',
  social_pressure: 'Pression sociale',
  bonus_burnout: 'Burnout',
  bonus_dependance: 'Dépendance affective',
};

function buildLockedDimensions(completedKeys, audience) {
  const excluded = audience && AUDIENCE_EXCLUSIONS[audience]
    ? AUDIENCE_EXCLUSIONS[audience]
    : new Set();

  const lockedTests = new Set();
  const locked = [];
  for (const [dk, theme] of Object.entries(DIMENSION_THEMES)) {
    if (completedKeys.has(dk)) continue;
    if (excluded.has(dk)) continue;

    const scaleId = dk.includes('.') ? dk.split('.')[0] : dk;
    const config = DEFI_SCALE_CONFIG[scaleId];
    if (!config || config.public === 'interdit') continue;

    const def = QUESTION_DEFS_V4[dk];
    if (!def) continue;
    const hasVariant = def.variants.some(v =>
      v.audiences.includes(audience) || v.audiences.includes('tous')
    );
    if (!hasVariant) continue;

    const testName = SCALE_TEST_NAMES[scaleId] || theme;
    if (lockedTests.has(testName)) continue;
    lockedTests.add(testName);
    locked.push({ key: dk, theme: testName });
  }

  return locked;
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

    const profileDoc = await db.collection('userProfiles').doc(user.uid).get();
    if (!profileDoc.exists) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Profil introuvable' }) };
    }
    const profile = profileDoc.data();
    if (!profile.totem || !profile.totem.revealedAt) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Tu dois révéler ton totem avant de créer un défi' }) };
    }

    const displayName = sanitizeDisplayName(payload.displayName);
    if (!displayName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pseudo invalide (2-20 caractères, pas de HTML ni de liens)' }) };
    }

    const audience = VALID_AUDIENCES.includes(payload.audience) ? payload.audience : 'tous';
    const persoCount = Math.min(3, Math.max(0, parseInt(payload.persoCount) || 0));

    const scaleResults = profile.scaleResults || {};
    const genre = profile.defiGenre || profile.onboardingProfile?.genre || payload.genre || null;

    const eligibleResults = buildEligibleResults(scaleResults, payload.optinScales, 'public');

    const previousVariantIds = [];
    try {
      const mesDefisSnap = await db.collection('userProfiles').doc(user.uid)
        .collection('mesDefis').orderBy('createdAt', 'desc').limit(1).get();
      if (!mesDefisSnap.empty) {
        const lastDefi = mesDefisSnap.docs[0].data();
        if (lastDefi.variantIds) previousVariantIds.push(...lastDefi.variantIds);
      }
    } catch {}

    const { error: selError, selected, available } = selectDimensions(
      eligibleResults, 'public', { audience, persoCount }
    );

    if (selError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pas assez de tests complétés pour créer un défi' }) };
    }

    const dimToPreview = (dim) => {
      const key = dim.subscaleKey ? `${dim.scaleId}.${dim.subscaleKey}` : dim.scaleId;
      const variant = selectVariant(key, audience, previousVariantIds);
      const variantId = variant ? variant.id : null;
      const fullKey = variantId ? `${key}:${variantId}` : key;
      return {
        key: fullKey,
        text: getQuestionText(fullKey, genre, displayName),
        theme: DIMENSION_THEMES[key] || null,
      };
    };

    const completedKeys = collectAllDimKeys(scaleResults);
    const locked = buildLockedDimensions(completedKeys, audience);

    const persoPool = [...(PERSO_QUESTIONS.tous || [])];
    if (audience !== 'tous' && PERSO_QUESTIONS[audience]) {
      persoPool.push(...PERSO_QUESTIONS[audience]);
    }
    const persoList = persoPool.map(p => {
      let stem = resolveGender(p.stem.replace(/\{prenom\}/g, displayName), genre);
      if (!/[?!….]$/.test(stem.trim())) stem = stem.trim() + ' ?';
      const options = p.options.map((o, i) => ({
        idx: i,
        label: resolveGender(o.replace(/\{prenom\}/g, displayName), genre),
      }));
      const item = { id: p.id, stem, options };
      if (p.allowOther) item.allowOther = true;
      if (p.genderChoice) item.genderChoice = true;
      return item;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        selected: selected.map(dimToPreview),
        available: available.map(d => {
          const key = d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId;
          return { key, theme: DIMENSION_THEMES[key] || null };
        }),
        locked,
        perso: persoList,
        totem: { text: `Quel est l'animal totem de ${displayName} ? 🎯 ×2` },
      }),
    };

  } catch (err) {
    console.error('defi-preview error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

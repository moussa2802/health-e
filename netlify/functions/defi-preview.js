const { db, verifyAuth } = require('./_firebase');
const { selectDimensions, getQuestionText, DEFI_SCALE_CONFIG } = require('./_defi/questionBank');

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

    const scaleResults = profile.scaleResults || {};
    const genre = profile.defiGenre || profile.onboardingProfile?.genre || payload.genre || null;

    const eligibleResults = buildEligibleResults(scaleResults, payload.optinScales, 'public');

    const { error: selError, selected, available } = selectDimensions(eligibleResults, 'public');

    if (selError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pas assez de tests complétés pour créer un défi' }) };
    }

    const dimToPreview = (dim) => {
      const key = dim.subscaleKey ? `${dim.scaleId}.${dim.subscaleKey}` : dim.scaleId;
      return { key, text: getQuestionText(key, genre, displayName) };
    };

    const totemText = getQuestionText('__totem__', genre, displayName);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        selected: selected.map(dimToPreview),
        available: available.map(dimToPreview),
        totem: { text: `Quel est l'animal totem de ${displayName} ? 🎯 ×2` },
      }),
    };

  } catch (err) {
    console.error('defi-preview error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

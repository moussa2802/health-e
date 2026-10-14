const { db, verifyAuth } = require('./_firebase');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ELIGIBLE_SCALES = {
  big_five:           { subscales: ['extraversion', 'agreeableness', 'conscientiousness', 'emotional_stability', 'openness'] },
  ecr_r:              { subscales: ['anxiety', 'avoidance'] },
  brs:                {},
  bonus_tdah:         {},
  bonus_hsp:          {},
  bonus_hpi:          {},
  bonus_jalousie:     {},
  bonus_eq:           {},
  bonus_confiance:    {},
  bonus_narcissisme:  {},
  bonus_manipulation: {},
  gad7:               {},
  rses:               {},
  pss10:              {},
  social_pressure:    {},
  bonus_burnout:      {},
  bonus_dependance:   {},
};

function findOptimalCuts(sorted) {
  const n = sorted.length;
  const unique = [...new Set(sorted)].sort((a, b) => a - b);

  if (unique.length < 3) {
    return { c1: unique[0], c2: unique[Math.min(1, unique.length - 1)] };
  }

  let bestC1 = unique[0], bestC2 = unique[unique.length - 1];
  let bestMaxDev = Infinity;

  for (let i = 0; i < unique.length - 1; i++) {
    const c1 = unique[i];
    const nBas = sorted.filter(v => v <= c1).length;

    for (let j = i + 1; j < unique.length; j++) {
      const c2 = unique[j];
      const nHaut = sorted.filter(v => v > c2).length;
      const nMoy = n - nBas - nHaut;

      const maxDev = Math.max(
        Math.abs(nBas / n - 1 / 3),
        Math.abs(nMoy / n - 1 / 3),
        Math.abs(nHaut / n - 1 / 3),
      );

      if (maxDev < bestMaxDev) {
        bestMaxDev = maxDev;
        bestC1 = c1;
        bestC2 = c2;
      }
    }
  }

  return { c1: bestC1, c2: bestC2 };
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

  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists || userDoc.data().type !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs' }) };
  }

  let dryRun = true;
  try {
    const body = JSON.parse(event.body || '{}');
    dryRun = body.dryRun !== false;
  } catch {}

  const scores = {};
  for (const [scaleId, cfg] of Object.entries(ELIGIBLE_SCALES)) {
    if (cfg.subscales) {
      for (const sk of cfg.subscales) {
        scores[`${scaleId}.${sk}`] = [];
      }
    } else {
      scores[scaleId] = [];
    }
  }

  const profilesSnap = await db.collection('userProfiles').get();
  let profileCount = 0;

  for (const doc of profilesSnap.docs) {
    const data = doc.data();
    const results = data.scaleResults;
    if (!results || typeof results !== 'object') continue;
    profileCount++;

    for (const [scaleId, cfg] of Object.entries(ELIGIBLE_SCALES)) {
      const sr = results[scaleId];
      if (!sr) continue;
      if ((sr.alertLevel ?? 0) >= 3) continue;

      if (cfg.subscales && sr.subscaleScores) {
        for (const sk of cfg.subscales) {
          let val = sr.subscaleScores[sk];
          if (val == null && sk === 'emotional_stability' && scaleId === 'big_five' && sr.subscaleScores.neuroticism != null) {
            val = 12 - sr.subscaleScores.neuroticism;
          }
          if (val != null) {
            scores[`${scaleId}.${sk}`].push(val);
          }
        }
      } else if (!cfg.subscales && sr.totalScore != null) {
        scores[scaleId].push(sr.totalScore);
      }
    }
  }

  const bands = {};
  const report = {};

  for (const [key, values] of Object.entries(scores)) {
    values.sort((a, b) => a - b);
    const n = values.length;

    if (n === 0) {
      report[key] = { n, c1: null, c2: null };
      continue;
    }

    const { c1, c2 } = findOptimalCuts(values);
    const nBas = values.filter(v => v <= c1).length;
    const nHaut = values.filter(v => v > c2).length;
    const nMoy = n - nBas - nHaut;

    report[key] = {
      n, c1, c2,
      pctBas: Math.round(nBas / n * 100),
      pctMoy: Math.round(nMoy / n * 100),
      pctHaut: Math.round(nHaut / n * 100),
    };

    if (n >= 50) {
      bands[key] = { c1, c2, n };
    }
  }

  if (!dryRun) {
    await db.collection('config').doc('defiBands').set(
      { ...bands, _meta: { computedAt: new Date().toISOString(), profileCount, computedBy: user.uid, version: 2 } },
    );
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      dryRun,
      profileCount,
      report,
      bandsStored: dryRun ? 0 : Object.keys(bands).length,
      message: dryRun
        ? 'DRY RUN — aucune écriture. Renvoyez avec { "dryRun": false } pour stocker.'
        : `Bandes stockées dans config/defiBands (${Object.keys(bands).length} dimensions avec n≥50).`,
    }),
  };
};

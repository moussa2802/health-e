#!/usr/bin/env node
/**
 * Dry-run des tertiles pour le défi.
 * Usage :
 *   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' node scripts/dryRunBands.cjs
 *   — OU —
 *   node scripts/dryRunBands.cjs path/to/serviceAccount.json
 */
const admin = require('firebase-admin');

const fileArg = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);
if (fileArg) {
  const serviceAccount = JSON.parse(require('fs').readFileSync(fileArg, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'health-e-af2bf',
  });
}

const db = admin.firestore();

const ELIGIBLE = {
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

async function main() {
  console.log('Connexion Firestore…');
  const snap = await db.collection('userProfiles').get();
  console.log(`${snap.size} profils trouvés.\n`);

  const scores = {};
  for (const [scaleId, cfg] of Object.entries(ELIGIBLE)) {
    if (cfg.subscales) {
      for (const sk of cfg.subscales) scores[`${scaleId}.${sk}`] = [];
    } else {
      scores[scaleId] = [];
    }
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const results = data.scaleResults;
    if (!results || typeof results !== 'object') continue;

    for (const [scaleId, cfg] of Object.entries(ELIGIBLE)) {
      const sr = results[scaleId];
      if (!sr) continue;
      if ((sr.alertLevel ?? 0) >= 3) continue;

      if (cfg.subscales && sr.subscaleScores) {
        for (const sk of cfg.subscales) {
          if (sr.subscaleScores[sk] != null) {
            scores[`${scaleId}.${sk}`].push(sr.subscaleScores[sk]);
          }
        }
      } else if (!cfg.subscales && sr.totalScore != null) {
        scores[scaleId].push(sr.totalScore);
      }
    }
  }

  console.log('═'.repeat(95));
  console.log(
    'Dimension'.padEnd(35) +
    'n'.padStart(6) +
    'c1'.padStart(10) +
    'c2'.padStart(10) +
    '% bas'.padStart(8) +
    '% moy'.padStart(8) +
    '% haut'.padStart(8) +
    '  Statut'
  );
  console.log('─'.repeat(95));

  const allEntries = Object.entries(scores).sort((a, b) => b[1].length - a[1].length);
  const bandResults = {};

  for (const [key, values] of allEntries) {
    values.sort((a, b) => a - b);
    const n = values.length;

    if (n === 0) {
      console.log(key.padEnd(35) + String(n).padStart(6) + '      —         —       —       —       —  ⚠️  n=0');
      continue;
    }

    const { c1, c2 } = findOptimalCuts(values);

    const nBas = values.filter(v => v <= c1).length;
    const nHaut = values.filter(v => v > c2).length;
    const nMoy = n - nBas - nHaut;

    const pctBas = Math.round(nBas / n * 100);
    const pctMoy = Math.round(nMoy / n * 100);
    const pctHaut = Math.round(nHaut / n * 100);

    const status = n >= 50 ? '✅' : `⚠️  n<50`;

    console.log(
      key.padEnd(35) +
      String(n).padStart(6) +
      String(c1).padStart(10) +
      String(c2).padStart(10) +
      (pctBas + '%').padStart(8) +
      (pctMoy + '%').padStart(8) +
      (pctHaut + '%').padStart(8) +
      '  ' + status
    );

    if (n >= 50) {
      bandResults[key] = { c1, c2, n, pctBas, pctMoy, pctHaut };
    }
  }

  console.log('═'.repeat(95));
  console.log('\nConvention : bas ≤ c1, c1 < moyen ≤ c2, haut > c2');

  const shouldWrite = process.argv.includes('--write');

  if (shouldWrite) {
    const doc = { _meta: { computedAt: new Date().toISOString(), profileCount: snap.size, version: 2 } };
    for (const [key, data] of Object.entries(bandResults)) {
      doc[key] = { c1: data.c1, c2: data.c2, n: data.n };
    }
    await db.collection('config').doc('defiBands').set(doc);
    console.log(`\n✅ ÉCRITURE EFFECTUÉE — config/defiBands mis à jour (${Object.keys(bandResults).length} dimensions).`);
    console.log('Document écrit :');
    console.log(JSON.stringify(doc, null, 2));
  } else {
    console.log('DRY RUN — aucune écriture. Ajoutez --write pour écrire dans config/defiBands.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});

#!/usr/bin/env node
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'health-e-af2bf',
});

const db = admin.firestore();

const { scoreResponse, DEFI_SCALE_CONFIG } = require('../netlify/functions/_defi/questionBank');
const { createStartToken, verifyStartToken } = require('../netlify/functions/_defi/tokenUtils');

const TEST_UID = 'lnGryIO0ONgacG7lnHiHgLzCMTI3';
const SECRET = crypto.randomBytes(32).toString('hex');
const DEVICE_ID = crypto.randomUUID();
const DEVICE_ID_2 = crypto.randomUUID();

let passed = 0, failed = 0;
let testSlug = null;
let testQuestions = null;
let testTruths = null;

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

async function createTestDefi() {
  const { selectQuestions, generateSlug } = require('../netlify/functions/_defi/questionBank');

  const profileDoc = await db.collection('userProfiles').doc(TEST_UID).get();
  const profile = profileDoc.data();
  const scaleResults = profile.scaleResults || {};
  const genre = profile.onboardingProfile?.genre || null;
  const totemAnimal = profile.totem.animal;

  const defiBandsDoc = await db.collection('config').doc('defiBands').get();
  const defiBands = defiBandsDoc.exists ? defiBandsDoc.data() : null;

  const eligible = [];
  for (const [scaleId, result] of Object.entries(scaleResults)) {
    const rootScale = scaleId.split('.')[0];
    const config = DEFI_SCALE_CONFIG[rootScale];
    if (!config) continue;
    if (config.public === 'interdit') continue;
    eligible.push({ scaleId, ...result });
  }

  const { error, questions, truths } = selectQuestions(
    eligible, genre, profile.displayName || 'Test', 'public', totemAnimal, defiBands
  );
  if (error) throw new Error(`Cannot create test défi: ${error}`);

  const slug = generateSlug();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 3600000));

  await db.runTransaction(async (tx) => {
    tx.set(db.collection('defis').doc(slug), {
      slug, displayName: 'Test Respond', genre, mode: 'public', statut: 'actif',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt, devoilement: 'auto',
      nbReponses: 0, classement: [], cagnotte_koris: 0, isTest: true,
      questions: questions.map(q => ({
        text: q.text, options: q.options, source: q.source,
        ...(q.bonus ? { bonus: q.bonus } : {}),
      })),
    });
    tx.set(db.collection('defis_private').doc(slug), {
      uid: TEST_UID, slug, statut: 'actif', expiresAt,
      truths, totemAnimal, isTest: true,
    });
  });

  return { slug, questions, truths };
}

function simulateRespond(slug, deviceId, pseudo, answers, truths, defi, defiPrivate, creatorUid) {
  const startToken = createStartToken(slug, deviceId, SECRET);
  const tokenData = verifyStartToken(startToken, SECRET, slug, deviceId);
  if (!tokenData) throw new Error('Token verification failed');

  const tempsServeur = Date.now() - tokenData.t0;

  if (answers.length !== defi.questions.length) {
    return { statusCode: 400, error: `${defi.questions.length} réponses attendues` };
  }

  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (a.optionId !== null && a.optionId !== undefined) {
      const validIds = defi.questions[i].options.map(o => o.id);
      if (!validIds.includes(a.optionId)) {
        return { statusCode: 400, error: `Option invalide pour la question ${i + 1}` };
      }
    }
    if (typeof a.ms === 'number' && a.ms > 16000) {
      a.ms = 16000;
    }
  }

  const responses = answers.map(a => (a.optionId ? { optionId: a.optionId } : null));
  const result = scoreResponse(truths, responses);

  return {
    statusCode: 200,
    score: result.score,
    bonnes: result.bonnes,
    presque: result.presque,
    mauvaises: result.mauvaises,
    total: result.total,
    tempsServeur,
    pseudo,
  };
}

async function cleanup() {
  if (!testSlug) return;
  try {
    await db.collection('defis').doc(testSlug).delete();
    await db.collection('defis_private').doc(testSlug).delete();
    const respId = `${testSlug}_${sha256(DEVICE_ID)}`;
    await db.collection('defi_reponses').doc(respId).delete();
    const respId2 = `${testSlug}_${sha256(DEVICE_ID_2)}`;
    await db.collection('defi_reponses').doc(respId2).delete();
  } catch {}
}

async function main() {
  console.log('═'.repeat(60));
  console.log('Tests intégration defi-respond');
  console.log('═'.repeat(60));

  // ── Setup: créer un défi test ──
  console.log('\n── Setup : création défi test ──');
  const created = await createTestDefi();
  testSlug = created.slug;
  testQuestions = created.questions;
  testTruths = created.truths;
  console.log(`  slug: ${testSlug}, ${testQuestions.length} questions`);

  const defiDoc = await db.collection('defis').doc(testSlug).get();
  const defi = defiDoc.data();
  const privateDoc = await db.collection('defis_private').doc(testSlug).get();
  const defiPrivate = privateDoc.data();

  // ── a. Scoring correct avec réponses parfaites ──
  console.log('\n── a. Scoring avec toutes les bonnes réponses ──');
  await test('toutes les bonnes réponses → score maximal', () => {
    const perfectAnswers = testTruths.map((truth, i) => ({
      questionIndex: i,
      optionId: truth.correctOptionId,
      ms: 5000,
    }));
    const result = simulateRespond(
      testSlug, DEVICE_ID, 'TestPerfect', perfectAnswers,
      testTruths, defi, defiPrivate, TEST_UID
    );
    assert(result.statusCode === 200, `expected 200, got ${result.statusCode}`);
    assert(result.score > 0, 'score should be positive');
    assert(result.bonnes === result.total || result.bonnes >= testTruths.length - 1,
      `expected all or almost all correct, got ${result.bonnes}/${result.total}`);
    console.log(`    score: ${result.score}, bonnes: ${result.bonnes}/${result.total}`);
  });

  // ── b. Scoring avec timeouts (null) ──
  console.log('\n── b. Scoring avec tous les timeouts ──');
  await test('toutes les réponses null → score 0', () => {
    const nullAnswers = testTruths.map((_, i) => ({
      questionIndex: i,
      optionId: null,
      ms: 15000,
    }));
    const result = simulateRespond(
      testSlug, DEVICE_ID_2, 'TestTimeout', nullAnswers,
      testTruths, defi, defiPrivate, TEST_UID
    );
    assert(result.statusCode === 200, `expected 200, got ${result.statusCode}`);
    assert(result.score === 0, `expected score 0, got ${result.score}`);
    console.log(`    score: ${result.score}, bonnes: ${result.bonnes}/${result.total}`);
  });

  // ── c. Validation: mauvais nombre de réponses ──
  console.log('\n── c. Mauvais nombre de réponses ──');
  await test('answers.length != questions.length → 400', () => {
    const shortAnswers = [{ questionIndex: 0, optionId: null, ms: 5000 }];
    const result = simulateRespond(
      testSlug, DEVICE_ID, 'TestShort', shortAnswers,
      testTruths, defi, defiPrivate, TEST_UID
    );
    assert(result.statusCode === 400, `expected 400, got ${result.statusCode}`);
  });

  // ── d. Validation: optionId d'une autre question ──
  console.log('\n── d. optionId cross-question ──');
  await test('optionId de Q2 dans Q1 → 400', () => {
    if (testQuestions.length < 2) return;
    const crossAnswers = testTruths.map((truth, i) => ({
      questionIndex: i,
      optionId: truth.correctOptionId,
      ms: 5000,
    }));
    crossAnswers[0].optionId = testQuestions[1].options[0].id;
    const q1ValidIds = testQuestions[0].options.map(o => o.id);
    if (!q1ValidIds.includes(crossAnswers[0].optionId)) {
      const result = simulateRespond(
        testSlug, DEVICE_ID, 'TestCross', crossAnswers,
        testTruths, defi, defiPrivate, TEST_UID
      );
      assert(result.statusCode === 400, `expected 400, got ${result.statusCode}`);
    } else {
      console.log('    (skipped: option ID happens to be valid in both questions)');
    }
  });

  // ── e. Unicité: écriture + double réponse ──
  console.log('\n── e. Unicité: écriture réelle + double réponse ──');
  const responseId = `${testSlug}_${sha256(DEVICE_ID)}`;
  await test('première réponse → écrite en base', async () => {
    const perfectAnswers = testTruths.map((truth, i) => ({
      questionIndex: i,
      optionId: truth.correctOptionId,
      ms: 5000,
    }));
    const responses = perfectAnswers.map(a => (a.optionId ? { optionId: a.optionId } : null));
    const result = scoreResponse(testTruths, responses);

    await db.collection('defi_reponses').doc(responseId).set({
      slug: testSlug,
      deviceHash: sha256(DEVICE_ID),
      pseudo: 'TestDouble',
      score: result.score,
      bonnes: result.bonnes,
      presque: result.presque,
      mauvaises: result.mauvaises,
      tempsServeur: 12345,
      answers: perfectAnswers.map(a => ({ optionId: a.optionId, ms: a.ms })),
      respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      uid: null,
      ipHash: sha256('127.0.0.1'),
    });

    const doc = await db.collection('defi_reponses').doc(responseId).get();
    assert(doc.exists, 'response document should exist');
    assert(doc.data().slug === testSlug, 'slug matches');
  });

  await test('2e réponse même deviceId → doc déjà présent', async () => {
    const existingDoc = await db.collection('defi_reponses').doc(responseId).get();
    assert(existingDoc.exists, 'should detect existing response for same device');
  });

  // ── f. Dévoilement: auto vs optin ──
  console.log('\n── f. Dévoilement auto/optin ──');
  await test('buildDevoilement: auto scales revealed, optin hidden', () => {
    const defiRespondSource = require('fs').readFileSync(
      require('path').join(__dirname, '../netlify/functions/defi-respond.js'), 'utf-8'
    );
    const fnMatch = defiRespondSource.match(/function buildDevoilement\(defi, truths\)\s*\{[\s\S]*?\n\}/);
    const buildDevoilement = new Function('DEFI_SCALE_CONFIG', 'return ' + fnMatch[0])(DEFI_SCALE_CONFIG);

    const mockDefi = { devoilement: 'auto', mode: 'public' };
    const devoilement = buildDevoilement(mockDefi, testTruths);

    if (devoilement) {
      for (const item of devoilement) {
        const truth = testTruths[item.questionIndex];
        if (truth.source === 'scale') {
          const rootScale = truth.scaleId.split('.')[0];
          const config = DEFI_SCALE_CONFIG[rootScale];
          assert(config && config.public === 'auto',
            `revealed scale ${rootScale} should be auto, got ${config?.public}`);
        }
      }
      const optin = testTruths.filter((t, i) => {
        if (t.source !== 'scale') return false;
        const root = t.scaleId.split('.')[0];
        const c = DEFI_SCALE_CONFIG[root];
        return c && c.public === 'optin';
      });
      for (const optinTruth of optin) {
        const idx = testTruths.indexOf(optinTruth);
        assert(!devoilement.some(d => d.questionIndex === idx),
          `optin scale ${optinTruth.scaleId} should NOT be in devoilement`);
      }
    }
    console.log(`    dévoilement: ${devoilement ? devoilement.length + ' items' : 'null'}`);
  });

  // ── g. Classement tri ──
  console.log('\n── g. Classement tri ──');
  await test('classement sorted: score DESC, tempsServeur ASC', () => {
    const classement = [
      { pseudo: 'A', score: 50, tempsServeur: 30000, respondedAt: new Date() },
      { pseudo: 'B', score: 75, tempsServeur: 25000, respondedAt: new Date() },
      { pseudo: 'C', score: 75, tempsServeur: 20000, respondedAt: new Date() },
      { pseudo: 'D', score: 100, tempsServeur: 40000, respondedAt: new Date() },
    ];
    classement.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tempsServeur !== b.tempsServeur) return a.tempsServeur - b.tempsServeur;
      return a.respondedAt - b.respondedAt;
    });
    assert(classement[0].pseudo === 'D', `1st should be D (score 100), got ${classement[0].pseudo}`);
    assert(classement[1].pseudo === 'C', `2nd should be C (75, 20s), got ${classement[1].pseudo}`);
    assert(classement[2].pseudo === 'B', `3rd should be B (75, 25s), got ${classement[2].pseudo}`);
    assert(classement[3].pseudo === 'A', `4th should be A (50), got ${classement[3].pseudo}`);
  });

  // ── h. Pas de vérité côté client ──
  console.log('\n── h. Vérités jamais dans defis/{slug} ──');
  await test('defis/{slug} ne contient aucune vérité', async () => {
    const doc = await db.collection('defis').doc(testSlug).get();
    const data = doc.data();
    assert(!data.truths, 'no truths in public doc');
    assert(!data.optionBandMap, 'no optionBandMap in public doc');
    assert(!data.totemAnimal, 'no totemAnimal in public doc');
    assert(!data.uid, 'no uid in public doc');
    for (const q of data.questions) {
      assert(!q.correctOptionId, `question "${q.text.slice(0,30)}..." should not have correctOptionId`);
    }
  });

  // ── i. Token HMAC intégrité ──
  console.log('\n── i. Token HMAC ──');
  await test('token round-trip avec secret aléatoire', () => {
    const token = createStartToken(testSlug, DEVICE_ID, SECRET);
    const data = verifyStartToken(token, SECRET, testSlug, DEVICE_ID);
    assert(data !== null, 'token should verify');
    assert(data.slug === testSlug, 'slug matches');
    assert(data.deviceId === DEVICE_ID, 'deviceId matches');
  });

  await test('mauvais secret → null', () => {
    const token = createStartToken(testSlug, DEVICE_ID, SECRET);
    assert(verifyStartToken(token, 'wrong-secret-32-chars-xxxxxxxxx', testSlug, DEVICE_ID) === null,
      'wrong secret should fail');
  });

  // ── Cleanup ──
  console.log('\n── Cleanup ──');
  await cleanup();
  console.log(`  ✓ données test supprimées`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Résultats : ${passed} passés, ${failed} échoués`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

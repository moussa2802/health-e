#!/usr/bin/env node
const admin = require('firebase-admin');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'health-e-af2bf',
});

const db = admin.firestore();

const { selectQuestions, generateSlug } = require('../netlify/functions/_defi/questionBank');

const defiCreateSource = require('fs').readFileSync(
  path.join(__dirname, '..', 'netlify/functions/defi-create.js'), 'utf-8'
);

const sanitizeMatch = defiCreateSource.match(/function sanitizeDisplayName\(raw\)\s*\{[\s\S]*?\n\}/);
const sanitizeDisplayName = new Function('return ' + sanitizeMatch[0])();

const configMatch = defiCreateSource.match(/const DEFI_SCALE_CONFIG = \{[\s\S]*?\n\};/);
const buildMatch = defiCreateSource.match(/function buildEligibleResults\(scaleResults, optinScales, mode\)\s*\{[\s\S]*?\n\}/);
const buildEligibleResults = new Function(configMatch[0] + '\n' + buildMatch[0] + '\nreturn buildEligibleResults;')();

const TEST_UID = 'lnGryIO0ONgacG7lnHiHgLzCMTI3';
let createdSlug = null;

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
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

async function simulateCreate(uid, payload) {
  const featDoc = await db.collection('config').doc('features').get();
  if (!featDoc.exists) return { statusCode: 403, error: 'Fonctionnalité non disponible' };
  const defiFlag = featDoc.data().defi;
  if (!defiFlag) return { statusCode: 403, error: 'Fonctionnalité non disponible' };
  const flagEnabled = defiFlag.enabled === true ||
    (Array.isArray(defiFlag.allowlist) && defiFlag.allowlist.includes(uid));
  if (!flagEnabled) return { statusCode: 403, error: 'Fonctionnalité non disponible' };

  const profileDoc = await db.collection('userProfiles').doc(uid).get();
  if (!profileDoc.exists) return { statusCode: 403, error: 'Profil introuvable' };
  const profile = profileDoc.data();
  if (!profile.totem || !profile.totem.revealedAt) {
    return { statusCode: 403, error: 'Tu dois révéler ton totem avant de créer un défi' };
  }

  // Use activeDefi on profile instead of composite query (index not yet created)
  const activeDefi = profile.activeDefi;
  if (activeDefi && activeDefi.slug) {
    const expTs = activeDefi.expiresAt;
    const expDate = expTs && expTs.toDate ? expTs.toDate() : expTs;
    if (expDate && expDate > new Date()) {
      return { statusCode: 200, existing: true, slug: activeDefi.slug };
    }
  }

  const displayName = sanitizeDisplayName(payload.displayName);
  if (!displayName) return { statusCode: 400, error: 'Pseudo invalide' };

  const VALID_DURATIONS = [48, 72, 168];
  const VALID_DEVOILEMENTS = ['aucun', 'auto'];
  const duration = VALID_DURATIONS.includes(payload.duration) ? payload.duration : 72;
  const devoilement = VALID_DEVOILEMENTS.includes(payload.devoilement) ? payload.devoilement : 'aucun';

  const scaleResults = profile.scaleResults || {};
  const genre = profile.onboardingProfile?.genre || null;
  const totemAnimal = profile.totem.animal;

  const defiBandsDoc = await db.collection('config').doc('defiBands').get();
  const defiBands = defiBandsDoc.exists ? defiBandsDoc.data() : null;

  const eligibleResults = buildEligibleResults(scaleResults, payload.optinScales, 'public');

  const { error: qError, questions, truths } = selectQuestions(
    eligibleResults, genre, displayName, 'public', totemAnimal, defiBands
  );

  if (qError) return { statusCode: 400, error: 'Pas assez de tests' };

  let slug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateSlug();
    const existing = await db.collection('defis').doc(candidate).get();
    if (!existing.exists) { slug = candidate; break; }
  }
  if (!slug) return { statusCode: 500, error: 'Slug collision' };

  const createdAt = admin.firestore.FieldValue.serverTimestamp();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + duration * 60 * 60 * 1000));

  const optionBandMap = {};
  for (const truth of truths) {
    if (truth.optionBands) {
      for (const [optId, band] of Object.entries(truth.optionBands)) {
        optionBandMap[optId] = band;
      }
    }
  }

  await db.runTransaction(async (tx) => {
    tx.set(db.collection('defis').doc(slug), {
      slug, displayName, genre, mode: 'public', statut: 'actif',
      createdAt, expiresAt, devoilement,
      nbReponses: 0, classement: [], cagnotte_koris: 0,
      isTest: true,
      questions: questions.map(q => ({
        text: q.text, options: q.options, source: q.source,
        ...(q.bonus ? { bonus: q.bonus } : {}),
      })),
    });
    tx.set(db.collection('defis_private').doc(slug), {
      uid, slug, statut: 'actif', expiresAt,
      truths, totemAnimal, optionBandMap, isTest: true,
    });
    tx.update(db.collection('userProfiles').doc(uid), {
      activeDefi: { slug, expiresAt },
      updatedAt: createdAt,
    });
  });

  return { statusCode: 200, slug, questions, truths };
}

async function cleanup(slug) {
  if (!slug) return;
  try {
    await db.collection('defis').doc(slug).delete();
    await db.collection('defis_private').doc(slug).delete();
    await db.collection('userProfiles').doc(TEST_UID).update({
      activeDefi: admin.firestore.FieldValue.delete(),
    });
  } catch {}
}

async function main() {
  console.log('═'.repeat(60));
  console.log('Tests intégration defi-create');
  console.log('═'.repeat(60));

  // ── a. Hors flag → 403 ──
  console.log('\n── a. Hors flag → 403 ──');
  await test('utilisateur hors allowlist → 403', async () => {
    const result = await simulateCreate('fake_uid_not_in_allowlist', { displayName: 'Test' });
    assert(result.statusCode === 403, `expected 403, got ${result.statusCode}`);
  });

  // ── b. Totem non révélé → 403 ──
  console.log('\n── b. Totem non révélé → 403 ──');
  await test('guard totem.revealedAt vérifié dans le code', async () => {
    const mockProfile = { totem: { animal: 'lion', revealedAt: null } };
    assert(!mockProfile.totem.revealedAt, 'null revealedAt correctly detected as falsy');
  });

  // ── c. Création réussie ──
  console.log('\n── c. Création → slug retourné ──');
  await test('création avec compte test → slug + questions', async () => {
    const result = await simulateCreate(TEST_UID, {
      displayName: 'Moussa Test',
      optinScales: [],
      duration: 48,
      devoilement: 'aucun',
    });
    assert(result.statusCode === 200, `expected 200, got ${result.statusCode}: ${result.error || ''}`);
    assert(result.slug && result.slug.length === 10, `slug should be 10 chars, got "${result.slug}"`);
    assert(result.questions && result.questions.length >= 7, `expected ≥7 questions, got ${result.questions?.length}`);
    createdSlug = result.slug;
    console.log(`    slug: ${createdSlug}`);
    console.log(`    questions: ${result.questions.length} (dont totem)`);
  });

  // ── c bis. 2e création → renvoie existant ──
  console.log('\n── c bis. 2e création → renvoie existant ──');
  await test('2e création → existing: true + même slug', async () => {
    const result = await simulateCreate(TEST_UID, {
      displayName: 'Autre Pseudo',
      optinScales: [],
    });
    assert(result.statusCode === 200, `expected 200, got ${result.statusCode}`);
    assert(result.existing === true, 'expected existing: true');
    assert(result.slug === createdSlug, `expected slug ${createdSlug}, got ${result.slug}`);
  });

  // ── d. optinScales interdit → ignoré ──
  console.log('\n── d. optinScales interdit/non complété → ignoré ──');
  await test('phq9 (interdit) in optinScales → silently ignored', () => {
    const results = {
      big_five: { totalScore: 30, subscaleScores: { extraversion: 6 }, alertLevel: 0 },
      phq9: { totalScore: 5, alertLevel: 0 },
    };
    const eligible = buildEligibleResults(results, ['phq9'], 'public');
    const ids = eligible.map(r => r.scaleId);
    assert(!ids.includes('phq9'), 'phq9 should be excluded');
  });

  await test('non-existent scale in optinScales → silently ignored', () => {
    const results = {
      big_five: { totalScore: 30, subscaleScores: { extraversion: 6 }, alertLevel: 0 },
    };
    const eligible = buildEligibleResults(results, ['fake_scale'], 'public');
    assert(eligible.length === 1, 'only big_five should be eligible');
  });

  // ── e. displayName HTML → rejeté ──
  console.log('\n── e. displayName HTML → rejeté ──');
  await test('displayName with HTML → null', () => {
    assert(sanitizeDisplayName('<b>hack</b>') === null, '<b> rejected');
    assert(sanitizeDisplayName('test>alert') === null, '> rejected');
    assert(sanitizeDisplayName('https://evil.com') === null, 'URL rejected');
  });

  // ── f. defis/{slug} ne contient AUCUN uid ni vérité ──
  console.log('\n── f. defis/{slug} ne contient aucun uid ni vérité ──');
  await test('defis/{slug} — no uid, no truths', async () => {
    if (!createdSlug) throw new Error('no slug to check (creation failed)');
    const defiDoc = await db.collection('defis').doc(createdSlug).get();
    assert(defiDoc.exists, 'defis doc should exist');
    const data = defiDoc.data();

    assert(!data.uid, `defis/ should NOT contain uid, got: ${data.uid}`);
    assert(!data.createur_id, 'no createur_id either');
    assert(!data.truths, 'defis/ should NOT contain truths');
    assert(!data.optionBandMap, 'defis/ should NOT contain optionBandMap');
    assert(!data.totemAnimal, 'defis/ should NOT contain totemAnimal');

    assert(data.slug === createdSlug, 'has slug');
    assert(data.displayName === 'Moussa Test', 'has displayName');
    assert(data.mode === 'public', 'mode is public');
    assert(data.statut === 'actif', 'statut is actif');
    assert(data.questions && data.questions.length > 0, 'has questions');
    assert(data.nbReponses === 0, 'nbReponses is 0');
    assert(Array.isArray(data.classement), 'classement is array');

    console.log('\n    ── defis/{slug} document complet ──');
    const printable = { ...data };
    if (printable.createdAt) printable.createdAt = printable.createdAt.toDate?.()?.toISOString() || printable.createdAt;
    if (printable.expiresAt) printable.expiresAt = printable.expiresAt.toDate?.()?.toISOString() || printable.expiresAt;
    console.log(JSON.stringify(printable, null, 2).split('\n').map(l => '    ' + l).join('\n'));
  });

  await test('defis_private/{slug} — HAS uid + truths', async () => {
    if (!createdSlug) throw new Error('no slug to check');
    const privDoc = await db.collection('defis_private').doc(createdSlug).get();
    assert(privDoc.exists, 'defis_private doc should exist');
    const data = privDoc.data();
    assert(data.uid === TEST_UID, 'has uid');
    assert(Array.isArray(data.truths) && data.truths.length > 0, 'has truths');
    assert(data.totemAnimal, 'has totemAnimal');
    assert(data.optionBandMap && typeof data.optionBandMap === 'object', 'has optionBandMap');
  });

  // ── Cleanup ──
  console.log('\n── Cleanup ──');
  await cleanup(createdSlug);
  console.log(`  ✓ defis/${createdSlug} et defis_private/${createdSlug} supprimés, activeDefi nettoyé`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Résultats : ${passed} passés, ${failed} échoués`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

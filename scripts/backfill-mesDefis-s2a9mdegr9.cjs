#!/usr/bin/env node
/**
 * One-shot: backfill userProfiles/{uid}/mesDefis/s2a9mdegr9
 * for the test defi created before the mesDefis write was added.
 *
 * Usage: GOOGLE_CLOUD_PROJECT=health-e-af2bf node scripts/backfill-mesDefis-s2a9mdegr9.cjs
 */
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const SLUG = 's2a9mdegr9';

async function main() {
  const privateSnap = await db.collection('defis_private').doc(SLUG).get();
  if (!privateSnap.exists) {
    console.error(`defis_private/${SLUG} not found`);
    process.exit(1);
  }
  const uid = privateSnap.data().uid;
  console.log(`Creator uid: ${uid}`);

  const defiSnap = await db.collection('defis').doc(SLUG).get();
  if (!defiSnap.exists) {
    console.error(`defis/${SLUG} not found`);
    process.exit(1);
  }
  const defi = defiSnap.data();

  const mesDefisRef = db.collection('userProfiles').doc(uid).collection('mesDefis').doc(SLUG);
  const existing = await mesDefisRef.get();
  if (existing.exists) {
    console.log(`mesDefis/${SLUG} already exists — nothing to do.`);
    return;
  }

  await mesDefisRef.set({
    slug: SLUG,
    displayName: defi.displayName,
    createdAt: defi.createdAt,
    expiresAt: defi.expiresAt,
  });

  console.log(`Created userProfiles/${uid}/mesDefis/${SLUG}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

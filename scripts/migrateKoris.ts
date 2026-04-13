/**
 * Migration Script: Met à jour les wallets Koris existants vers le nouveau modèle 2 phases.
 *
 * Usage:
 *   npx ts-node scripts/migrateKoris.ts
 *
 * Ce script:
 *   1. Pour chaque wallet existant: ajoute welcomeBonusActive, lastDailyReset, todaySpent
 *   2. Si balance > 0 → welcomeBonusActive: true (encore en phase bienvenue)
 *   3. Si balance <= 0 → welcomeBonusActive: false, balance: 10 (passe en phase quotidienne)
 *   4. Si pas de wallet → crée un wallet avec 25 Koris + welcomeBonusActive: true
 *   5. Met à jour completedTestsCount + lastActivityAt depuis userProfiles
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env variable or service account)
const app = initializeApp();
const db = getFirestore(app);

const WELCOME_BONUS = 25;
const DAILY_AMOUNT = 10;

async function migrateKoris() {
  console.log('🚀 Début de la migration Koris v2 (2 phases)...\n');

  const patientsRef = db.collection('patients');
  const profilesRef = db.collection('userProfiles');

  const [patientsSnap, profilesSnap] = await Promise.all([
    patientsRef.get(),
    profilesRef.get(),
  ]);

  // Build a map of userId -> { testsCount, lastTestDate }
  const profileMap = new Map<string, { testsCount: number; lastTestDate: Date | null }>();
  profilesSnap.forEach(docSnap => {
    const data = docSnap.data();
    const results = data.scaleResults ?? {};
    let lastDate: Date | null = null;
    let count = 0;

    for (const result of Object.values(results) as any[]) {
      count++;
      const completedAt = result?.completedAt?.toDate?.() ?? null;
      if (completedAt && (!lastDate || completedAt > lastDate)) {
        lastDate = completedAt;
      }
    }

    profileMap.set(docSnap.id, { testsCount: count, lastTestDate: lastDate });
  });

  let total = 0;
  let newWallets = 0;
  let upgradedToV2 = 0;
  let switchedToDaily = 0;
  let countersMigrated = 0;
  let skipped = 0;

  let batch = db.batch();
  let batchCount = 0;

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  for (const docSnap of patientsSnap.docs) {
    total++;
    const data = docSnap.data();
    const updates: Record<string, any> = {};
    let needsUpdate = false;

    const existingWallet = data.korisWallet;

    if (!existingWallet) {
      // ── Pas de wallet → créer avec bonus bienvenue ──
      updates.korisWallet = {
        balance: WELCOME_BONUS,
        welcomeBonusActive: true,
        lastDailyReset: today,
        todaySpent: 0,
        totalSpent: 0,
        createdAt: now,
      };

      // Log welcome bonus transaction
      const historyRef = docSnap.ref.collection('korisHistory').doc();
      batch.set(historyRef, {
        type: 'bonus',
        amount: WELCOME_BONUS,
        feature: 'welcome_bonus',
        balanceBefore: 0,
        balanceAfter: WELCOME_BONUS,
        timestamp: now,
        details: 'Bonus de bienvenue (migration v2)',
      });
      batchCount++;
      newWallets++;
      needsUpdate = true;

    } else if (existingWallet.welcomeBonusActive === undefined) {
      // ── Wallet v1 existant → upgrade vers v2 ──
      if (existingWallet.balance <= 0) {
        // Bonus épuisé → passer en phase quotidienne avec 10 Koris
        updates.korisWallet = {
          ...existingWallet,
          balance: DAILY_AMOUNT,
          welcomeBonusActive: false,
          lastDailyReset: today,
          todaySpent: 0,
          totalSpent: existingWallet.totalSpent ?? 0,
        };
        switchedToDaily++;

        // Log phase switch
        const historyRef = docSnap.ref.collection('korisHistory').doc();
        batch.set(historyRef, {
          type: 'phase_switch',
          amount: DAILY_AMOUNT,
          feature: 'phase_switch',
          balanceBefore: 0,
          balanceAfter: DAILY_AMOUNT,
          timestamp: now,
          details: 'Migration v2: bonus épuisé → phase quotidienne',
        });
        batchCount++;
      } else {
        // Encore du solde → rester en phase bienvenue
        updates.korisWallet = {
          ...existingWallet,
          welcomeBonusActive: true,
          lastDailyReset: existingWallet.lastRefillDate ?? today,
          todaySpent: 0,
          totalSpent: existingWallet.totalSpent ?? 0,
        };
      }
      upgradedToV2++;
      needsUpdate = true;
    }

    // --- Completed tests counter ---
    const profileInfo = profileMap.get(docSnap.id);
    if (profileInfo) {
      if (data.completedTestsCount === undefined) {
        updates.completedTestsCount = profileInfo.testsCount;
        needsUpdate = true;
      }
      if (!data.lastActivityAt && profileInfo.lastTestDate) {
        updates.lastActivityAt = profileInfo.lastTestDate;
        needsUpdate = true;
      }
      countersMigrated++;
    }

    if (needsUpdate) {
      batch.update(docSnap.ref, updates);
      batchCount++;
    } else {
      skipped++;
    }

    // Firestore batch limit is 500
    if (batchCount >= 490) {
      await batch.commit();
      console.log(`  ✓ Batch committed (${total} processed so far)`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  // Update global stats
  try {
    const statsRef = db.collection('stats').doc('koris');
    await statsRef.set({
      lastUpdated: new Date(),
      migrationV2Completed: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('  ✗ Erreur mise à jour stats globales:', err);
  }

  console.log('\n━━━ Résultat de la migration v2 ━━━');
  console.log(`  Total utilisateurs: ${total}`);
  console.log(`  Nouveaux wallets créés: ${newWallets}`);
  console.log(`  Wallets v1 → v2: ${upgradedToV2}`);
  console.log(`    dont passés en phase quotidienne: ${switchedToDaily}`);
  console.log(`  Compteurs mis à jour: ${countersMigrated}`);
  console.log(`  Déjà à jour (skipped): ${skipped}`);
  console.log(`\n✅ Migration v2 terminée!`);
}

migrateKoris().catch(err => {
  console.error('❌ Migration échouée:', err);
  process.exit(1);
});

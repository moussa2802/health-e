const { admin, db } = require("./_firebase");

const KORIS_COSTS = {
  test: 1,
  chat: 1,
  journal: 1,
  conseils: 2,
  analysis: 3,
  analysis_refresh: 2,
  refresh_synthesis: 3,
  synthesis: 0,
  compatibility: 4,
  unlock_chat: 3,
};

/**
 * Reserve koris: atomically decrement balance and create a hold.
 * Returns { holdId, cost } on success, { error: 'insufficient_balance' } if short.
 * Free features (cost=0) return { holdId: null, cost: 0 }.
 */
async function reserveKoris(userId, feature, quantity = 1, metadata = {}) {
  const unitCost = KORIS_COSTS[feature];
  if (unitCost === undefined) {
    throw new Error(`Unknown feature: ${feature}`);
  }
  const cost = unitCost * quantity;
  if (cost === 0) return { holdId: null, cost: 0 };

  const patientRef = db.collection("patients").doc(userId);
  const holdRef = db.collection("koris_holds").doc();

  try {
    await db.runTransaction(async (tx) => {
      const patientDoc = await tx.get(patientRef);
      const wallet = patientDoc.data()?.korisWallet;

      if (!wallet || wallet.balance < cost) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      tx.update(patientRef, {
        "korisWallet.balance": admin.firestore.FieldValue.increment(-cost),
      });

      tx.set(holdRef, {
        userId,
        feature,
        amount: cost,
        quantity,
        status: "pending",
        metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { holdId: holdRef.id, cost };
  } catch (err) {
    if (err.message === "INSUFFICIENT_BALANCE") {
      return { error: "insufficient_balance", required: cost };
    }
    throw err;
  }
}

/**
 * Commit a hold: mark as committed, log in korisHistory, and update global stats.
 */
async function commitKoris(holdId, patientUpdates = {}) {
  if (!holdId) return;

  const holdRef = db.collection("koris_holds").doc(holdId);
  const holdDoc = await holdRef.get();
  if (!holdDoc.exists || holdDoc.data().status !== "pending") return;

  const hold = holdDoc.data();
  const patientRef = db.collection("patients").doc(hold.userId);
  const patientDoc = await patientRef.get();
  const balanceBefore = patientDoc.data()?.korisWallet?.balance ?? 0;

  const batch = db.batch();

  batch.update(holdRef, {
    status: "committed",
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const historyRef = db
    .collection("patients")
    .doc(hold.userId)
    .collection("korisHistory")
    .doc();

  batch.set(historyRef, {
    type: "spend",
    feature: hold.feature,
    amount: hold.amount,
    balanceBefore: balanceBefore + hold.amount,
    balanceAfter: balanceBefore,
    ...(hold.metadata && Object.keys(hold.metadata).length > 0 ? { metadata: hold.metadata } : {}),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  const statsRef = db.collection("stats").doc("koris");
  batch.set(
    statsRef,
    {
      totalSpent: admin.firestore.FieldValue.increment(hold.amount),
      totalTransactions: admin.firestore.FieldValue.increment(1),
      [`spendingByType.${hold.feature}`]: admin.firestore.FieldValue.increment(hold.amount),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  batch.update(patientRef, {
    "korisWallet.totalSpent": admin.firestore.FieldValue.increment(hold.amount),
    ...patientUpdates,
  });

  await batch.commit();
}

/**
 * Release a hold: atomically restore the balance and mark hold as released.
 */
async function releaseKoris(holdId) {
  if (!holdId) return;

  const holdRef = db.collection("koris_holds").doc(holdId);

  await db.runTransaction(async (tx) => {
    const holdDoc = await tx.get(holdRef);
    if (!holdDoc.exists || holdDoc.data().status !== "pending") return;

    const hold = holdDoc.data();
    const patientRef = db.collection("patients").doc(hold.userId);
    const patientDoc = await tx.get(patientRef);
    const balanceBefore = patientDoc.data()?.korisWallet?.balance ?? 0;

    tx.update(patientRef, {
      "korisWallet.balance": admin.firestore.FieldValue.increment(hold.amount),
    });

    tx.update(holdRef, {
      status: "released",
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const historyRef = db
      .collection("patients")
      .doc(hold.userId)
      .collection("korisHistory")
      .doc();

    tx.set(historyRef, {
      type: "refund",
      feature: hold.feature,
      amount: hold.amount,
      balanceBefore,
      balanceAfter: balanceBefore + hold.amount,
      details: "Étincelles restituées — opération annulée",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

module.exports = { KORIS_COSTS, reserveKoris, commitKoris, releaseKoris };

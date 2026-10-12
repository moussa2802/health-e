const { admin, db, verifyAuth } = require("./_firebase");

const KORIS_WELCOME_BONUS = 25;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const decoded = await verifyAuth(event);
  if (!decoded) {
    return respond(401, { error: "Non authentifié" });
  }

  const userId = decoded.uid;

  try {
    const patientRef = db.collection("patients").doc(userId);
    const snap = await patientRef.get();

    if (!snap.exists) {
      return respond(200, {
        newBalance: 0,
        walletJustCreated: false,
        error: "no_patient",
      });
    }

    const data = snap.data();
    let wallet = data.korisWallet;

    if (!wallet) {
      const now = new Date().toISOString();

      wallet = {
        balance: KORIS_WELCOME_BONUS,
        totalSpent: 0,
        createdAt: now,
      };

      await patientRef.update({ korisWallet: wallet });

      await patientRef
        .collection("korisHistory")
        .add({
          type: "bonus",
          amount: KORIS_WELCOME_BONUS,
          feature: "welcome_bonus",
          balanceBefore: 0,
          balanceAfter: KORIS_WELCOME_BONUS,
          timestamp: now,
          details: "Bonus de bienvenue",
          serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      await db.collection("stats").doc("koris").set(
        {
          totalRefilled: admin.firestore.FieldValue.increment(KORIS_WELCOME_BONUS),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return respond(200, {
        newBalance: KORIS_WELCOME_BONUS,
        walletJustCreated: true,
      });
    }

    return respond(200, {
      newBalance: wallet.balance,
      walletJustCreated: false,
    });
  } catch (err) {
    console.error("koris-init error:", err);
    return respond(500, { error: "Erreur serveur" });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function respond(status, body) {
  return {
    statusCode: status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

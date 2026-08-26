const { admin, db, verifyAuth } = require("./_firebase");

const KORIS_WELCOME_BONUS = 25;
const KORIS_TRANSITION_BONUS = 50;

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
        wasReset: false,
        phaseSwitched: false,
        welcomeBonusActive: false,
        walletJustCreated: false,
        transitionBonusGranted: false,
        error: "no_patient",
      });
    }

    const data = snap.data();
    let wallet = data.korisWallet;

    // No wallet → initialize with welcome bonus
    if (!wallet) {
      const now = new Date().toISOString();
      const today = now.split("T")[0];

      wallet = {
        balance: KORIS_WELCOME_BONUS,
        welcomeBonusActive: true,
        lastDailyReset: today,
        todaySpent: 0,
        totalSpent: 0,
        createdAt: now,
        transitionBonusGrantedAt: now,
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

      return respond(200, {
        newBalance: KORIS_WELCOME_BONUS,
        wasReset: false,
        phaseSwitched: false,
        welcomeBonusActive: true,
        walletJustCreated: true,
        transitionBonusGranted: false,
      });
    }

    let transitionBonusGranted = false;

    // Transition bonus: existing wallets that haven't received it yet
    if (!wallet.transitionBonusGrantedAt) {
      const now = new Date().toISOString();
      const oldBalance = Math.max(0, wallet.balance);
      const newBal = oldBalance + KORIS_TRANSITION_BONUS;

      await patientRef.update({
        "korisWallet.balance": newBal,
        "korisWallet.transitionBonusGrantedAt": now,
      });

      await patientRef
        .collection("korisHistory")
        .add({
          type: "transition_bonus",
          amount: KORIS_TRANSITION_BONUS,
          feature: "transition_bonus",
          balanceBefore: oldBalance,
          balanceAfter: newBal,
          timestamp: now,
          details: "Bonus de transition — nouvelle économie Koris",
          serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      wallet = { ...wallet, balance: newBal, transitionBonusGrantedAt: now };
      transitionBonusGranted = true;
    }

    // Phase switch: welcome bonus exhausted
    if (wallet.welcomeBonusActive && wallet.balance <= 0) {
      await patientRef.update({
        "korisWallet.welcomeBonusActive": false,
      });

      await patientRef
        .collection("korisHistory")
        .add({
          type: "phase_switch",
          amount: 0,
          feature: "phase_switch",
          balanceBefore: 0,
          balanceAfter: 0,
          timestamp: new Date().toISOString(),
          details: "Bonus de bienvenue épuisé — acheter des Koris pour continuer",
          serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      return respond(200, {
        newBalance: 0,
        wasReset: false,
        phaseSwitched: true,
        welcomeBonusActive: false,
        walletJustCreated: false,
        transitionBonusGranted,
      });
    }

    return respond(200, {
      newBalance: wallet.balance,
      wasReset: false,
      phaseSwitched: false,
      welcomeBonusActive: wallet.welcomeBonusActive ?? false,
      walletJustCreated: false,
      transitionBonusGranted,
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

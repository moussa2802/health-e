const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Initialiser Firebase Admin avec la clé de service
let app;
if (!admin.apps.length) {
  try {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log(
      "💰 [WITHDRAWAL] Initializing Firebase Admin with project:",
      svc.project_id
    );

    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: svc.project_id,
        clientEmail: svc.client_email,
        privateKey: svc.private_key.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error(
      "❌ [WITHDRAWAL] Failed to parse FIREBASE_SERVICE_ACCOUNT:",
      error
    );
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT configuration");
  }
} else {
  app = admin.app();
}

const db = admin.firestore();

exports.handler = async (event) => {
  // Gestion CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Répondre aux requêtes OPTIONS (preflight)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    // Vérifier la méthode HTTP
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "METHOD_NOT_ALLOWED" }),
      };
    }

    // Vérifier le token d'authentification
    const auth = event.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      console.log("❌ [WITHDRAWAL] No Bearer token provided");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "NO_TOKEN" }),
      };
    }

    const idToken = auth.slice(7);
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
      console.log("✅ [WITHDRAWAL] Token verified for user:", decoded.uid);
    } catch (error) {
      console.log("❌ [WITHDRAWAL] Invalid token:", error.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "INVALID_TOKEN" }),
      };
    }

    // Parser et valider le payload
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (error) {
      console.log("❌ [WITHDRAWAL] Invalid JSON payload");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "INVALID_PAYLOAD" }),
      };
    }

    const { withdrawalId } = payload;

    if (!withdrawalId) {
      console.log("❌ [WITHDRAWAL] Missing withdrawalId");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "MISSING_WITHDRAWAL_ID" }),
      };
    }

    // Récupérer les détails du retrait depuis Firestore
    const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      console.log("❌ [WITHDRAWAL] Withdrawal not found:", withdrawalId);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "WITHDRAWAL_NOT_FOUND" }),
      };
    }

    const withdrawalData = withdrawalDoc.data();

    // Vérifier que l'utilisateur est bien le propriétaire
    if (decoded.uid !== withdrawalData.professionalId) {
      console.log("❌ [WITHDRAWAL] User not owner:", {
        tokenUid: decoded.uid,
        withdrawalOwner: withdrawalData.professionalId,
      });
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "NOT_OWNER" }),
      };
    }

    // Vérifier que le retrait est en attente
    if (withdrawalData.status !== "pending") {
      console.log(
        "❌ [WITHDRAWAL] Withdrawal not pending:",
        withdrawalData.status
      );
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "WITHDRAWAL_NOT_PENDING" }),
      };
    }

    console.log("💰 [WITHDRAWAL] Processing withdrawal:", {
      id: withdrawalId,
      amount: withdrawalData.amount,
      method: withdrawalData.method,
      accountNumber: withdrawalData.accountNumber.substring(0, 4) + "***",
    });

    // TODO: Intégrer l'API PayTech pour le retrait réel
    // Pour l'instant, on simule le traitement

    // Simuler un délai de traitement
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mettre à jour le statut du retrait
    await withdrawalRef.update({
      status: "processing",
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: "Retrait en cours de traitement via " + withdrawalData.method,
    });

    console.log("✅ [WITHDRAWAL] Withdrawal status updated to processing");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Retrait en cours de traitement",
        status: "processing",
      }),
    };
  } catch (err) {
    console.error("❌ [WITHDRAWAL] INTERNAL_ERROR:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "INTERNAL_ERROR" }),
    };
  }
};

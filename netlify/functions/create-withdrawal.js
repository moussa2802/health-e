const admin = require("firebase-admin");

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

    const { professionalId, amount, method, accountNumber } = payload;

    // Validation des champs requis
    if (
      !professionalId ||
      !amount ||
      amount <= 0 ||
      !method ||
      !accountNumber
    ) {
      console.log("❌ [WITHDRAWAL] Invalid payload:", {
        professionalId,
        amount,
        method,
        accountNumber,
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "INVALID_PAYLOAD" }),
      };
    }

    // Vérifier que l'utilisateur est bien le propriétaire
    if (decoded.uid !== professionalId) {
      console.log("❌ [WITHDRAWAL] User not owner:", {
        tokenUid: decoded.uid,
        requestedId: professionalId,
      });
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "NOT_OWNER" }),
      };
    }

    // TODO: Vérifier le solde disponible dans Firestore
    // Pour l'instant, on fait confiance au front-end

    console.log("💰 [WITHDRAWAL] Creating withdrawal request:", {
      professionalId,
      amount,
      method,
      accountNumber: accountNumber.substring(0, 4) + "***", // Masquer pour les logs
    });

    // Créer la demande de retrait
    const doc = await db.collection("withdrawals").add({
      professionalId,
      amount: parseFloat(amount),
      method,
      accountNumber,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ [WITHDRAWAL] Withdrawal request created:", { id: doc.id });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: doc.id }),
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

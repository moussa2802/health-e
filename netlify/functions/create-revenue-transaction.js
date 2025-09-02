const admin = require("firebase-admin");

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Vérifier la méthode HTTP
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parser le body de la requête
    const body = JSON.parse(event.body);
    const {
      professionalId,
      patientId,
      bookingId,
      amount,
      patientName,
      professionalName,
      consultationType,
    } = body;

    // Validation des données requises
    if (
      !professionalId ||
      !patientId ||
      !bookingId ||
      !amount ||
      !patientName ||
      !professionalName ||
      !consultationType
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required fields",
          required: [
            "professionalId",
            "patientId",
            "bookingId",
            "amount",
            "patientName",
            "professionalName",
            "consultationType",
          ],
        }),
      };
    }

    // Calcul des montants
    const platformFee = Math.round(amount * 0.15); // 15% de commission
    const professionalAmount = amount - platformFee; // 85% pour le professionnel

    // Créer la transaction de revenu
    const revenueTransaction = {
      professionalId,
      patientId,
      bookingId,
      type: "consultation",
      amount: amount,
      platformFee,
      professionalAmount,
      status: "completed",
      description: `Consultation ${consultationType} - ${patientName}`,
      patientName,
      professionalName,
      consultationType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Sauvegarder dans Firestore
    const docRef = await db
      .collection("revenue_transactions")
      .add(revenueTransaction);

    console.log("✅ Revenue transaction created:", {
      id: docRef.id,
      professionalId,
      amount,
      professionalAmount,
      platformFee,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transactionId: docRef.id,
        message: "Revenue transaction created successfully",
        data: {
          amount,
          platformFee,
          professionalAmount,
        },
      }),
    };
  } catch (error) {
    console.error("❌ Error creating revenue transaction:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (serviceAccount.project_id) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
} else {
  console.warn(
    "⚠️ Firebase service account not configured, using default credentials"
  );
  initializeApp();
}

const db = getFirestore();

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, paydunya-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    console.log("🔔 [PAYDUNYA IPN] Received notification");
    console.log("🔔 [PAYDUNYA IPN] Method:", event.httpMethod);
    console.log("🔔 [PAYDUNYA IPN] Headers:", event.headers);
    console.log("🔔 [PAYDUNYA IPN] Body:", event.body);

    // Vérifier que c'est bien un POST
    if (event.httpMethod !== "POST") {
      console.error("❌ [PAYDUNYA IPN] Invalid method:", event.httpMethod);
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    // Parser le body JSON
    const body = JSON.parse(event.body || "{}");

    // Vérifier la signature PayDunya (optionnel mais recommandé)
    const paydunyaToken = process.env.PAYDUNYA_MASTER_KEY || "test-token";
    const receivedToken = event.headers["paydunya-token"] || body.token;

    if (receivedToken && receivedToken !== paydunyaToken) {
      console.error("❌ [PAYDUNYA IPN] Invalid token");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Extraire les données du paiement
    const paymentData = {
      token: body.token,
      status: body.status,
      transactionId: body.transaction_id || body.token,
      amount: body.amount,
      currency: body.currency || "XOF",
      customerName: body.customer_name,
      customerPhone: body.customer_phone,
      customerEmail: body.customer_email,
      paymentMethod: body.payment_method,
      bookingId: body.booking_id || body.custom_data?.booking_id,
      professionalId: body.professional_id || body.custom_data?.professional_id,
      patientId: body.patient_id || body.custom_data?.patient_id,
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      rawData: body,
    };

    console.log("✅ [PAYDUNYA IPN] Payment data extracted:", paymentData);

    // Enregistrer dans Firestore
    try {
      const paymentRef = await db.collection("payments").add({
        ...paymentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(
        "✅ [PAYDUNYA IPN] Payment saved to Firestore with ID:",
        paymentRef.id
      );

      // Si c'est un paiement confirmé, mettre à jour le statut de la réservation
      if (paymentData.status === "COMPLETED" && paymentData.bookingId) {
        try {
          const bookingRef = db
            .collection("bookings")
            .doc(paymentData.bookingId);
          await bookingRef.update({
            paymentStatus: "paid",
            paymentId: paymentRef.id,
            paidAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(
            "✅ [PAYDUNYA IPN] Booking status updated for:",
            paymentData.bookingId
          );
        } catch (bookingError) {
          console.error(
            "❌ [PAYDUNYA IPN] Error updating booking:",
            bookingError
          );
        }
      }

      // Envoyer une notification au professionnel si nécessaire
      if (paymentData.status === "COMPLETED" && paymentData.professionalId) {
        try {
          await db.collection("notifications").add({
            userId: paymentData.professionalId,
            type: "payment_received",
            title: "Paiement reçu",
            message: `Nouveau paiement reçu de ${paymentData.customerName} - ${paymentData.amount} ${paymentData.currency}`,
            data: {
              paymentId: paymentRef.id,
              bookingId: paymentData.bookingId,
              amount: paymentData.amount,
              currency: paymentData.currency,
            },
            createdAt: new Date(),
            read: false,
          });
          console.log("✅ [PAYDUNYA IPN] Notification sent to professional");
        } catch (notificationError) {
          console.error(
            "❌ [PAYDUNYA IPN] Error sending notification:",
            notificationError
          );
        }
      }
    } catch (firestoreError) {
      console.error(
        "❌ [PAYDUNYA IPN] Error saving to Firestore:",
        firestoreError
      );
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to save payment data" }),
      };
    }

    // Répondre avec succès
    console.log("✅ [PAYDUNYA IPN] Processing completed successfully");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Payment notification received and processed",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("❌ [PAYDUNYA IPN] Unexpected error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};

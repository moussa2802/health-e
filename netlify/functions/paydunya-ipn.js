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

    // Vérifier la signature PayDunya
    const paydunyaToken = process.env.PAYDUNYA_MASTER_KEY || "test-token";
    const receivedToken = event.headers["paydunya-token"] || body.token || body.master_key;

    console.log("🔔 [PAYDUNYA IPN] Token verification:");
    console.log("Expected token:", paydunyaToken);
    console.log("Received token:", receivedToken);

    if (receivedToken && receivedToken !== paydunyaToken) {
      console.error("❌ [PAYDUNYA IPN] Invalid token");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Extraire l'ID de réservation du numéro de facture
    const invoiceNumber = body.invoice?.invoice_number || body.invoice_number;
    let bookingId = null;
    
    if (invoiceNumber) {
      bookingId = invoiceNumber.replace("INV-", "");
      console.log("🔔 [PAYDUNYA IPN] Extracted booking ID from invoice:", bookingId);
    }
    
    // Extraire les données du paiement
    const paymentData = {
      token: body.token,
      status: body.invoice?.status || body.status,
      transactionId: body.transaction_id || body.token,
      amount: body.invoice?.amount || body.amount,
      currency: body.invoice?.currency || body.currency || "XOF",
      customerName: body.invoice?.customer_name || body.customer_name,
      customerPhone: body.invoice?.customer_phone || body.customer_phone,
      customerEmail: body.invoice?.customer_email || body.customer_email,
      paymentMethod: body.payment_method,
      bookingId: bookingId || body.booking_id || body.custom_data?.booking_id,
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
      if ((paymentData.status === "COMPLETED" || paymentData.status === "completed" || paymentData.status === "success") && paymentData.bookingId) {
        try {
          console.log("🔔 [PAYDUNYA IPN] Updating booking status for:", paymentData.bookingId);
          
          const bookingRef = db.collection("bookings").doc(paymentData.bookingId);
          await bookingRef.update({
            status: "confirmed",
            paymentStatus: "completed",
            paymentId: paymentRef.id,
            paidAt: new Date(),
            updatedAt: new Date(),
          });
          
          console.log("✅ [PAYDUNYA IPN] Booking status updated to confirmed for:", paymentData.bookingId);
          
          // Mettre à jour aussi dans la Realtime Database
          try {
            const { getDatabase, ref, update } = require("firebase-admin/database");
            const database = getDatabase();
            const roomRef = database.ref(`scheduled_rooms/${paymentData.bookingId}`);
            await roomRef.update({
              status: "confirmed",
              updatedAt: new Date().toISOString(),
            });
            console.log("✅ [PAYDUNYA IPN] Realtime Database updated for:", paymentData.bookingId);
          } catch (realtimeError) {
            console.warn("⚠️ [PAYDUNYA IPN] Failed to update Realtime Database:", realtimeError);
          }
          
        } catch (bookingError) {
          console.error("❌ [PAYDUNYA IPN] Error updating booking:", bookingError);
        }
      } else {
        console.log("⚠️ [PAYDUNYA IPN] Payment status not completed or no booking ID:", paymentData.status, paymentData.bookingId);
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

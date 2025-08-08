const admin = require("firebase-admin");

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Fonction Netlify pour gérer les webhooks IPN de PayTech
 * Cette fonction est appelée par PayTech pour notifier du statut du paiement
 */
exports.handler = async (event, context) => {
  // Gestion CORS pour Netlify
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
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

  // Vérifier que c'est une requête POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const req = JSON.parse(event.body);
    console.log("🔔 [PAYTECH IPN] Received webhook:", req);

    const {
      type_event,
      ref_command,
      item_price,
      payment_method,
      custom_field,
    } = req;

    // Validation des données reçues selon les instructions officielles
    if (!type_event || !ref_command || !item_price) {
      console.error("❌ [PAYTECH IPN] Missing required fields");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Parser les custom_fields
    let customData = {};
    try {
      customData = JSON.parse(custom_field || "{}");
    } catch (error) {
      console.warn("⚠️ [PAYTECH IPN] Error parsing custom_field:", error);
    }

    const {
      booking_id,
      user_id,
      patientId,
      professionalId,
      patientName,
      professionalName,
      date,
      startTime,
      endTime,
      type,
      price,
    } = customData;

    console.log("🔍 [PAYTECH IPN] Processing payment:", {
      type_event,
      ref_command,
      item_price,
      payment_method,
      booking_id,
      user_id,
    });

    // Si le paiement est réussi, créer le booking
    if (type_event === "sale_complete" && booking_id) {
      try {
        // Créer le booking avec les données complètes
        const bookingData = {
          patientId,
          professionalId,
          patientName,
          professionalName,
          date,
          startTime,
          endTime,
          type,
          duration: 60,
          price: parseFloat(item_price) || price || 0,
          status: "confirmed",
          paymentStatus: "paid",
          paymentRef: ref_command,
          paymentAmount: item_price,
          paymentMethod: payment_method,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        console.log("✅ [PAYTECH IPN] Creating confirmed booking:", booking_id);
        await db.collection("bookings").doc(booking_id).set(bookingData);

        // Créer l'entrée dans la Realtime Database pour la salle
        const { getDatabase, ref, set } = require("firebase/database");
        const database = getDatabase();
        const roomRef = ref(database, `scheduled_rooms/${booking_id}`);
        await set(roomRef, {
          createdAt: new Date().toISOString(),
          scheduledFor: `${date}T${startTime}:00`,
          patientId,
          patientName,
          professionalId,
          professionalName,
          status: "confirmed",
          type,
        });

        console.log(
          "✅ [PAYTECH IPN] Booking created successfully:",
          booking_id
        );

        // Créer une transaction de revenu pour le professionnel
        try {
          const { createConsultationRevenue } = require('./revenueService.js');
          await createConsultationRevenue(
            professionalId,
            patientId,
            booking_id,
            parseFloat(item_price) || price || 0,
            patientName,
            professionalName,
            type
          );
          console.log("✅ [PAYTECH IPN] Revenue transaction created for professional");
        } catch (revenueError) {
          console.error("❌ [PAYTECH IPN] Error creating revenue transaction:", revenueError);
        }

        // Envoyer une notification au patient
        if (user_id) {
          try {
            await db.collection("notifications").add({
              userId: user_id,
              type: "payment_success",
              title: "Paiement confirmé",
              message: `Votre paiement de ${item_price} XOF via ${payment_method} a été confirmé. Votre consultation est confirmée.`,
              bookingId: booking_id,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });
          } catch (notificationError) {
            console.warn(
              "⚠️ [PAYTECH IPN] Error sending notification:",
              notificationError
            );
          }
        }
      } catch (firestoreError) {
        console.error(
          "❌ [PAYTECH IPN] Error creating booking:",
          firestoreError
        );
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Database error" }),
        };
      }
    }

    // Log de l'événement
    await db.collection("payment_logs").add({
      type_event,
      ref_command,
      item_price,
      payment_method,
      customData,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "paytech_ipn",
    });

    console.log("✅ [PAYTECH IPN] IPN processed successfully");

    // Répondre à PayTech
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "IPN processed successfully",
      }),
    };
  } catch (error) {
    console.error("❌ [PAYTECH IPN] Error processing webhook:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

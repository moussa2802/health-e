const admin = require("firebase-admin");

// Initialiser Firebase Admin avec la configuration Netlify
if (!admin.apps.length) {
  try {
    // Vérifier si on a les variables d'environnement Firebase
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log(
        "🔔 [PAYTECH IPN] Initializing Firebase with service account"
      );
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
      });
    } else {
      console.log("🔔 [PAYTECH IPN] Initializing Firebase with default config");
      admin.initializeApp({
        databaseURL:
          process.env.FIREBASE_DATABASE_URL ||
          "https://health-e-af2bf-default-rtdb.firebaseio.com",
      });
    }
  } catch (error) {
    console.error("❌ [PAYTECH IPN] Firebase initialization error:", error);
    throw new Error(`Firebase initialization failed: ${error.message}`);
  }
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
    console.log("🔔 [PAYTECH IPN] Raw event body:", event.body);
    console.log("🔔 [PAYTECH IPN] Event body type:", typeof event.body);
    console.log("🔔 [PAYTECH IPN] Event headers:", event.headers);

    let req;

    // Essayer de parser le JSON
    try {
      req = JSON.parse(event.body);
      console.log("✅ [PAYTECH IPN] Successfully parsed JSON:", req);
    } catch (parseError) {
      console.error("❌ [PAYTECH IPN] JSON parse error:", parseError);
      console.error("❌ [PAYTECH IPN] Raw body content:", event.body);

      // Essayer de parser comme form-data si c'est du texte
      if (typeof event.body === "string") {
        try {
          // Si c'est du form-data, essayer de le parser
          const formData = new URLSearchParams(event.body);
          const formObject = {};
          for (const [key, value] of formData.entries()) {
            formObject[key] = value;
          }
          req = formObject;
          console.log("✅ [PAYTECH IPN] Parsed as form-data:", req);
        } catch (formError) {
          console.error("❌ [PAYTECH IPN] Form-data parse error:", formError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: "Invalid data format",
              details: "Could not parse JSON or form-data",
              rawBody: event.body.substring(0, 100), // Premiers 100 caractères pour debug
            }),
          };
        }
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "Invalid data format",
            details: "Expected JSON or form-data",
          }),
        };
      }
    }

    console.log("🔔 [PAYTECH IPN] Processed webhook data:", req);

    const {
      type_event,
      ref_command,
      item_price,
      payment_method,
      custom_field,
    } = req;

    // Gestion des différents formats PayTech
    // PayTech peut envoyer les données dans différents champs selon le contexte
    const paymentData = {
      type_event:
        type_event || req.type_event || req.typeEvent || req.event_type,
      ref_command:
        ref_command || req.ref_command || req.refCommand || req.reference,
      item_price: item_price || req.item_price || req.itemPrice || req.amount,
      payment_method:
        payment_method || req.payment_method || req.paymentMethod || req.method,
      custom_field:
        custom_field || req.custom_field || req.customField || req.custom_data,
    };

    console.log("🔔 [PAYTECH IPN] Normalized payment data:", paymentData);

    // Validation des données reçues selon les instructions officielles
    if (
      !paymentData.type_event ||
      !paymentData.ref_command ||
      !paymentData.item_price
    ) {
      console.error(
        "❌ [PAYTECH IPN] Missing required fields after normalization"
      );
      console.error("❌ [PAYTECH IPN] Available fields:", Object.keys(req));
      console.error("❌ [PAYTECH IPN] Payment data:", paymentData);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing required fields",
          availableFields: Object.keys(req),
          paymentData: paymentData,
        }),
      };
    }

    // Parser les custom_fields
    let customData = {};
    try {
      customData = JSON.parse(paymentData.custom_field || "{}");
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
      type_event: paymentData.type_event,
      ref_command: paymentData.ref_command,
      item_price: paymentData.item_price,
      payment_method: paymentData.payment_method,
      booking_id,
      user_id,
    });

    // Si le paiement est réussi, créer le booking
    if (paymentData.type_event === "sale_complete" && booking_id) {
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
          price: parseFloat(paymentData.item_price) || price || 0,
          status: "confirmed",
          paymentStatus: "paid",
          paymentRef: paymentData.ref_command,
          paymentAmount: paymentData.item_price,
          paymentMethod: paymentData.payment_method,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        console.log("✅ [PAYTECH IPN] Creating confirmed booking:", booking_id);
        await db.collection("bookings").doc(booking_id).set(bookingData);

        // Créer l'entrée dans la Realtime Database pour la salle
        try {
          const database = admin.database();
          const roomRef = database.ref(`scheduled_rooms/${booking_id}`);
          await roomRef.set({
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
            "✅ [PAYTECH IPN] Room entry created in Realtime Database"
          );
        } catch (realtimeError) {
          console.warn(
            "⚠️ [PAYTECH IPN] Error creating room entry:",
            realtimeError
          );
          // Continuer même si la création de la salle échoue
        }

        console.log(
          "✅ [PAYTECH IPN] Booking created successfully:",
          booking_id
        );

        // Créer une transaction de revenu pour le professionnel
        try {
          const { createConsultationRevenue } = require("./revenueService.js");
          await createConsultationRevenue(
            professionalId,
            patientId,
            booking_id,
            parseFloat(item_price) || price || 0,
            patientName,
            professionalName,
            type
          );
          console.log(
            "✅ [PAYTECH IPN] Revenue transaction created for professional"
          );
        } catch (revenueError) {
          console.error(
            "❌ [PAYTECH IPN] Error creating revenue transaction:",
            revenueError
          );
        }

        // Envoyer une notification au patient
        if (user_id) {
          try {
            await db.collection("notifications").add({
              userId: user_id,
              type: "payment_success",
              title: "Paiement confirmé",
              message: `Votre paiement de ${paymentData.item_price} XOF via ${paymentData.payment_method} a été confirmé. Votre consultation est confirmée.`,
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
      type_event: paymentData.type_event,
      ref_command: paymentData.ref_command,
      item_price: paymentData.item_price,
      payment_method: paymentData.payment_method,
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

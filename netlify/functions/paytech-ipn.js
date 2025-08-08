const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Fonction pour gérer les webhooks IPN de PayTech
 * Cette fonction est appelée par PayTech pour notifier du statut du paiement
 */
exports.paytechIpn = functions.https.onRequest(async (req, res) => {
  try {
    console.log("🔔 [PAYTECH IPN] Received webhook:", req.body);

    // Vérification de la méthode HTTP
    if (req.method !== "POST") {
      console.warn("⚠️ [PAYTECH IPN] Invalid method:", req.method);
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      type_event,
      ref_command,
      item_price,
      payment_method,
      custom_field,
    } = req.body;

    // Validation des données reçues selon les instructions officielles
    if (!type_event || !ref_command || !item_price) {
      console.error("❌ [PAYTECH IPN] Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Parser les custom_fields
    let customData = {};
    try {
      customData = JSON.parse(custom_field || "{}");
    } catch (error) {
      console.warn("⚠️ [PAYTECH IPN] Error parsing custom_field:", error);
    }

    const { booking_id, user_id } = customData;

    console.log("🔍 [PAYTECH IPN] Processing payment:", {
      type_event,
      ref_command,
      item_price,
      payment_method,
      booking_id,
      user_id,
    });

    // Mettre à jour le statut de la réservation dans Firestore
    if (booking_id) {
      try {
        const bookingRef = db.collection("bookings").doc(booking_id);

        const updateData = {
          paymentStatus: type_event,
          paymentRef: ref_command,
          paymentAmount: item_price,
          paymentMethod: payment_method,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Si le paiement est réussi
        if (type_event === "sale_complete") {
          updateData.status = "confirmed";
          updateData.paidAt = admin.firestore.FieldValue.serverTimestamp();

          console.log(
            "✅ [PAYTECH IPN] Payment successful for booking:",
            booking_id
          );
        } else if (type_event === "sale_cancelled") {
          updateData.status = "cancelled";
          console.log(
            "❌ [PAYTECH IPN] Payment cancelled for booking:",
            booking_id
          );
        }

        await bookingRef.update(updateData);

        // Envoyer une notification au patient si le paiement est réussi
        if (type_event === "sale_complete" && user_id) {
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
          "❌ [PAYTECH IPN] Error updating booking:",
          firestoreError
        );
        return res.status(500).json({ error: "Database error" });
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

    // Répondre à PayTech
    res.status(200).json({
      success: true,
      message: "IPN processed successfully",
    });
  } catch (error) {
    console.error("❌ [PAYTECH IPN] Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
      sessionId,
      paymentType,
    } = customData;

    console.log("🔍 [PAYTECH IPN] Processing payment:", {
      type_event: paymentData.type_event,
      ref_command: paymentData.ref_command,
      item_price: paymentData.item_price,
      payment_method: paymentData.payment_method,
      booking_id,
      user_id,
    });

    // Si le paiement est réussi, mettre à jour la réservation existante (update-in-place)
    const successTypes = [
      "sale_complete",
      "payment_success",
      "sale_completed",
      "payment_completed",
    ];
    if (successTypes.includes(String(paymentData.type_event))) {
      const paymentRef = paymentData.ref_command || paymentData.refCommand || paymentData.reference;
      
      // Gérer les thérapies de groupe différemment des bookings
      if (paymentType === "group_therapy" && sessionId && patientId) {
        console.log("🔔 [PAYTECH IPN] Processing group therapy payment:", { sessionId, patientId });
        
        // Idempotence: vérifier si déjà traité
        const ipnRef = db.collection("ipn_processed").doc(String(paymentRef || `group_therapy_${sessionId}_${patientId}`));
        const ipnSnap = await ipnRef.get();
        if (ipnSnap.exists) {
          console.log("IPN already processed for group therapy", { paymentRef, sessionId, patientId });
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: "IPN already processed",
            }),
          };
        }

        // Enregistrer le patient dans la session de thérapie de groupe
        try {
          const sessionRef = db.collection("group_therapy_sessions").doc(sessionId);
          
          await db.runTransaction(async (tx) => {
            const sessionDoc = await tx.get(sessionRef);
            
            if (!sessionDoc.exists) {
              throw new Error("Group therapy session not found");
            }
            
            const sessionData = sessionDoc.data();
            const participants = sessionData.participants || [];
            const capacity = sessionData.capacity || 0;
            
            // Vérifier si la session est complète
            if (participants.length >= capacity) {
              throw new Error("Group therapy session is full");
            }
            
            // Vérifier si l'utilisateur est déjà inscrit
            if (participants.includes(patientId)) {
              console.log("User already registered in group therapy session");
              return; // Déjà inscrit, ne pas réinscrire
            }
            
            // Ajouter le participant
            tx.update(sessionRef, {
              participants: admin.firestore.FieldValue.arrayUnion(patientId),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          
          console.log("✅ [PAYTECH IPN] User registered to group therapy session:", { sessionId, patientId });
          
          // Marquer l'IPN comme traité
          await ipnRef.set({
            at: admin.firestore.FieldValue.serverTimestamp(),
            sessionId,
            patientId,
            paymentType: "group_therapy",
          }, { merge: true });
          
          // Log de l'événement
          await db.collection("payment_logs").add({
            type_event: paymentData.type_event,
            ref_command: paymentRef,
            item_price: paymentData.item_price,
            payment_method: paymentData.payment_method,
            customData,
            sessionId,
            patientId,
            paymentType: "group_therapy",
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "paytech_ipn",
          });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: "Group therapy registration processed successfully",
            }),
          };
        } catch (groupTherapyError) {
          console.error("❌ [PAYTECH IPN] Error processing group therapy registration:", groupTherapyError);
          // Log l'erreur mais répondre 200 pour ne pas faire rejouer PayTech
          await db.collection("payment_logs").add({
            type_event: paymentData.type_event,
            ref_command: paymentRef,
            item_price: paymentData.item_price,
            payment_method: paymentData.payment_method,
            customData,
            error: groupTherapyError.message,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "paytech_ipn",
          });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: "IPN processed (error logged)",
            }),
          };
        }
      }

      // Traitement normal pour les bookings
      // 1) Source fiable: custom_field.booking_id
      let tempId = (customData && typeof customData.booking_id === "string" && customData.booking_id.startsWith("temp_"))
        ? customData.booking_id
        : null;
      // 2) Fallback: regex bornée sur ref_command (temp_<timestamp>_<rand>)
      if (!tempId && paymentRef) {
        const m = String(paymentRef).match(/CMD_(temp_\d+_[A-Za-z0-9]+)/i);
        tempId = m ? m[1] : null;
      }

      if (!tempId) {
        console.error("IPN: missing tempId in paymentRef", { paymentRef });
        // marquer le log et sortir sans créer quoi que ce soit
        await db.collection("payment_logs").add({
          type_event: paymentData.type_event,
          ref_command: paymentRef,
          item_price: paymentData.item_price,
          payment_method: paymentData.payment_method,
          customData,
          note: "missing_tempId_in_paymentRef",
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: "paytech_ipn",
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "IPN processed (no tempId)",
          }),
        };
      }

      // Idempotence: vérifier si déjà traité
      const ipnRef = db.collection("ipn_processed").doc(String(paymentRef || tempId || "unknown_ref"));
      const ipnSnap = await ipnRef.get();
      if (ipnSnap.exists) {
        console.log("IPN already processed", { paymentRef });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "IPN already processed",
          }),
        };
      }

      // Transaction: update bookings/{tempId}
      const bookingRef = db.collection("bookings").doc(tempId);
      let justConfirmed = false;
      let confirmedData = null;

      const computeTimestamp = (dateStr, timeStr, tz) => {
        try {
          const [year, month, day] = String(dateStr || "")
            .split("-")
            .map((x) => parseInt(x, 10));
          const [hour, minute] = String(timeStr || "00:00")
            .split(":")
            .map((x) => parseInt(x, 10));
          const local = new Date(
            Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0)
          );
          // Firestore Timestamp en UTC; l'UI affichera en TZ Africa/Dakar
          return admin.firestore.Timestamp.fromDate(local);
        } catch (e) {
          return null;
        }
      };

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(bookingRef);
        if (!snap.exists) {
          console.error("IPN: temp booking not found", { tempId, paymentRef });
          return;
        }
        const b = snap.data() || {};
        if (b.status === "confirmed") {
          return; // déjà confirmé → idempotence
        }

        const tz = process.env.TZ || "Africa/Dakar";
        const startsAt = computeTimestamp(b.date, b.startTime, tz);
        const endsAt = b.endTime
          ? computeTimestamp(b.date, b.endTime, tz)
          : startsAt;

        const paymentAmountNum = Number(b.price || paymentData.item_price || 0);

        tx.update(bookingRef, {
          status: "confirmed",
          isTemp: false,
          paymentStatus: "paid",
          paymentRef,
          paymentMethod: paymentData.payment_method,
          paymentAmount: paymentAmountNum,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          startsAt,
          endsAt,
          // stocker des champs utiles au runtime pour WhatsApp/email
          patientPhone: customData?.customer_phone || null,
          patientName: b.patientName || customData?.patientName || b.patient?.name || null,
          professionalName: b.professionalName || customData?.professionalName || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        justConfirmed = true;
        confirmedData = { ...b, startsAt, endsAt };
      });

      // Marque l’IPN comme traité
      await ipnRef.set(
        { at: admin.firestore.FieldValue.serverTimestamp(), tempId },
        { merge: true }
      );

      // Notifier le professionnel uniquement si on vient de confirmer dans cette IPN
      if (justConfirmed && confirmedData) {
        try {
          await db.collection("notifications").add({
            userId: confirmedData.professionalId,
            userType: "professional",
            type: "appointment_confirmed",
            title: `Rendez-vous confirmé – ${
              confirmedData.patientName || "patient"
            }`,
            message: `Rendez-vous confirmé avec ${
              confirmedData.patientName || "patient"
            } le ${confirmedData.date || ""} à ${
              confirmedData.startTime || ""
            }.`,
            data: {
              bookingId: tempId,
              date: confirmedData.date || "",
              time: confirmedData.startTime || "",
              redirectPath: "/professional/dashboard",
            },
            channels: ["email"],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (notifErr) {
          console.warn(
            "⚠️ [PAYTECH IPN] Error creating pro email notification:",
            notifErr
          );
        }
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

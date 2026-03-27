const fetch = require("node-fetch");

// Configuration PayTech
const PAYTECH_CONFIG = {
  apiUrl: "https://paytech.sn/api/payment/request-payment",
  apiKey: process.env.PAYTECH_API_KEY,
  apiSecret: process.env.PAYTECH_API_SECRET,
  env: process.env.PAYTECH_ENV || "prod",
  successUrl: process.env.PAYTECH_SUCCESS_URL || "https://health-e.sn/appointment-success",
  cancelUrl: process.env.PAYTECH_CANCEL_URL || "https://health-e.sn/book",
  ipnUrl: process.env.PAYTECH_IPN_URL || "https://health-e.sn/.netlify/functions/paytech-ipn",
};

/**
 * Fonction Netlify pour initier un paiement PayTech
 * Cette fonction est appelée depuis le frontend pour créer une transaction
 */
exports.handler = async (event, context) => {
  try {

    // Gestion CORS pour Netlify
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    // Répondre aux requêtes OPTIONS (preflight)
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers, body: "" };
    }

    // Vérifier les variables d'environnement critiques
    if (!PAYTECH_CONFIG.apiKey || !PAYTECH_CONFIG.apiSecret) {
      console.error("❌ [PAYTECH] Variables d'environnement manquantes: PAYTECH_API_KEY / PAYTECH_API_SECRET");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: 0, error: "Configuration serveur incorrecte" }),
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
      const data = JSON.parse(event.body);
      // Vérification des données requises
      const {
        amount,
        bookingId,
        customerEmail,
        customerPhone,
        customerName,
        professionalId,
        description = "Consultation médicale",
        method = "mobile", // Nouveau champ
        successUrl, // Nouveau champ
        cancelUrl, // Nouveau champ
      } = data;


      // Validation des données (adaptée pour mobile/card)
      if (!amount || !bookingId || !customerName || !professionalId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: 0,
            error: "Données de base manquantes",
          }),
        };
      }

      // Validation conditionnelle selon la méthode
      if (method === "card" && !customerEmail) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: 0,
            error: "Email requis pour les paiements par carte",
          }),
        };
      }

      if (method === "mobile" && !customerPhone) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: 0,
            error: "Téléphone requis pour les paiements mobile money",
          }),
        };
      }

      // Préparation des données pour PayTech selon les instructions officielles
      const paymentData = {
        item_name: description,
        item_price: amount,
        ref_command: `CMD_${bookingId}_${Date.now()}`,
        command_name: data.paymentType === "group_therapy"
          ? `Paiement thérapie de groupe: ${data.description || "thérapie de groupe"}`
          : `Paiement consultation ${
              data.professionalName || "professionnel"
            }`,
        currency: "XOF",
        env: PAYTECH_CONFIG.env,
        // Configuration de l'URL de succès avec l'ID de réservation
        success_url: successUrl || `${PAYTECH_CONFIG.successUrl}/${bookingId}`,
        cancel_url:
          cancelUrl || `${PAYTECH_CONFIG.cancelUrl}/${professionalId}`,
        ipn_url: PAYTECH_CONFIG.ipnUrl,
        custom_field: JSON.stringify({
          booking_id: bookingId,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_name: customerName,
          patientId: data.patientId || "unknown", // Pour l'IPN
          professionalId: professionalId,
          patientName: customerName,
          professionalName: data.professionalName || "Professionnel",
          date: data.date || new Date().toISOString().split("T")[0],
          startTime: data.startTime || "00:00",
          endTime: data.endTime || "01:00",
          type: data.type || "video",
          price: amount,
          // Champs spécifiques aux thérapies de groupe
          sessionId: data.sessionId || null,
          paymentType: data.paymentType || "consultation",
        }),
        target_payment:
          method === "card"
            ? "Carte Bancaire"
            : "Orange Money, Wave, Free Money",
      };

      console.log("🔔 [PAYTECH] Initiating payment for booking:", bookingId);
      console.log(
        "📦 [DEBUG] Final payment data sent to PayTech:",
        paymentData
      );
      console.log("🔔 [PAYTECH] API URL:", PAYTECH_CONFIG.apiUrl);
      console.log("🔔 [PAYTECH] Headers:", {
        API_KEY: PAYTECH_CONFIG.apiKey ? "✅ Présent" : "❌ Manquant",
        API_SECRET: PAYTECH_CONFIG.apiSecret ? "✅ Présent" : "❌ Manquant",
        "Content-Type": "application/json",
      });

      // Appel à l'API PayTech selon les instructions officielles
      const response = await fetch(PAYTECH_CONFIG.apiUrl, {
        method: "POST",
        headers: {
          API_KEY: PAYTECH_CONFIG.apiKey,
          API_SECRET: PAYTECH_CONFIG.apiSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const responseData = await response.json();
      console.log(
        "📩 [DEBUG] Raw response from PayTech:",
        response.status,
        response.statusText,
        responseData
      );

      if (!response.ok) {
        console.error("❌ [PAYTECH] API Error:", {
          status: response.status,
          statusText: response.statusText,
          body: responseData,
        });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: 0,
            error: `Erreur lors de l'initialisation du paiement: ${response.status} ${response.statusText}`,
          }),
        };
      }

      console.log("✅ [PAYTECH] Payment initiated successfully:", responseData);

      // Retourner les données de paiement au frontend selon les instructions officielles
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: 1,
          redirect_url: responseData.redirect_url,
          refCommand: paymentData.ref_command,
        }),
      };
    } catch (error) {
      console.error("❌ [PAYTECH] Error initiating payment:", error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: 0,
          error: "Erreur serveur lors de l'initialisation du paiement",
        }),
      };
    }
  } catch (globalError) {
    console.error("❌ [PAYTECH] Global error:", globalError);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        success: 0,
        error: "Erreur interne du serveur",
      }),
    };
  }
};

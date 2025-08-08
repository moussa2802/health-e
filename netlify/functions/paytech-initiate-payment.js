const fetch = require('node-fetch');

// Configuration PayTech selon les instructions officielles
const PAYTECH_CONFIG = {
  apiUrl: 'https://paytech.sn/api/payment/request-payment',
  apiKey: process.env.PAYTECH_API_KEY,
  apiSecret: process.env.PAYTECH_API_SECRET,
  env: process.env.PAYTECH_ENV || 'test',
  successUrl: process.env.PAYTECH_SUCCESS_URL || 'https://health-e.sn/appointment-success',
  cancelUrl: process.env.PAYTECH_CANCEL_URL || 'https://health-e.sn/book',
  ipnUrl: process.env.PAYTECH_IPN_URL || 'https://health-e.sn/.netlify/functions/paytech-ipn'
};

// Vérification des variables d'environnement
console.log("🔍 [DEBUG] PAYTECH_API_KEY:", PAYTECH_CONFIG.apiKey ? "✅ OK" : "❌ Manquante");
console.log("🔍 [DEBUG] PAYTECH_API_SECRET:", PAYTECH_CONFIG.apiSecret ? "✅ OK" : "❌ Manquante");
console.log("🔍 [DEBUG] PAYTECH_ENV:", PAYTECH_CONFIG.env);
console.log("🔍 [DEBUG] PAYTECH_SUCCESS_URL:", PAYTECH_CONFIG.successUrl);
console.log("🔍 [DEBUG] PAYTECH_CANCEL_URL:", PAYTECH_CONFIG.cancelUrl);
console.log("🔍 [DEBUG] PAYTECH_IPN_URL:", PAYTECH_CONFIG.ipnUrl);

/**
 * Fonction Netlify pour initier un paiement PayTech
 * Cette fonction est appelée depuis le frontend pour créer une transaction
 */
exports.handler = async (event, context) => {
  // Gestion CORS pour Netlify
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Répondre aux requêtes OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Vérifier que c'est une requête POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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
      description = 'Consultation médicale'
    } = data;

    // Validation des données
    if (!amount || !bookingId || !customerEmail || !customerPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: 0, 
          error: 'Données manquantes' 
        })
      };
    }

    // Préparation des données pour PayTech selon les instructions officielles
    const paymentData = {
      item_name: description,
      item_price: amount,
      ref_command: `CMD_${bookingId}_${Date.now()}`,
      command_name: `Paiement consultation ${data.professionalName || 'professionnel'}`,
      currency: 'XOF',
      env: PAYTECH_CONFIG.env,
      success_url: `${PAYTECH_CONFIG.successUrl}/${bookingId}`,
      cancel_url: `${PAYTECH_CONFIG.cancelUrl}/${professionalId}`,
      ipn_url: PAYTECH_CONFIG.ipnUrl,
      custom_field: JSON.stringify({
        booking_id: bookingId,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_name: customerName
      }),
      target_payment: 'Orange Money, Wave, Free Money'
    };

    console.log('🔔 [PAYTECH] Initiating payment for booking:', bookingId);
    console.log('🔔 [PAYTECH] Payment data:', JSON.stringify(paymentData, null, 2));
    console.log('🔔 [PAYTECH] API URL:', PAYTECH_CONFIG.apiUrl);
    console.log('🔔 [PAYTECH] Headers:', {
      'API_KEY': PAYTECH_CONFIG.apiKey ? '✅ Présent' : '❌ Manquant',
      'API_SECRET': PAYTECH_CONFIG.apiSecret ? '✅ Présent' : '❌ Manquant',
      'Content-Type': 'application/json'
    });

    // Appel à l'API PayTech selon les instructions officielles
    const response = await fetch(PAYTECH_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'API_KEY': PAYTECH_CONFIG.apiKey,
        'API_SECRET': PAYTECH_CONFIG.apiSecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ [PAYTECH] API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseData
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: 0, 
          error: `Erreur lors de l'initialisation du paiement: ${response.status} ${response.statusText}` 
        })
      };
    }

    console.log('✅ [PAYTECH] Payment initiated successfully:', responseData);

    // Retourner les données de paiement au frontend selon les instructions officielles
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: 1,
        redirect_url: responseData.redirect_url,
        refCommand: paymentData.ref_command
      })
    };

  } catch (error) {
    console.error('❌ [PAYTECH] Error initiating payment:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: 0, 
        error: 'Erreur serveur lors de l\'initialisation du paiement' 
      })
    };
  }
};

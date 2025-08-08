const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Configuration PayTech selon les instructions officielles
const PAYTECH_CONFIG = {
  apiUrl: 'https://paytech.sn/api/payment/request-payment',
  apiKey: process.env.PAYTECH_API_KEY,
  apiSecret: process.env.PAYTECH_API_SECRET,
  env: process.env.PAYTECH_ENV || 'test',
  successUrl: process.env.PAYTECH_SUCCESS_URL || 'https://health-e.sn/payment/success',
  cancelUrl: process.env.PAYTECH_CANCEL_URL || 'https://health-e.sn/payment/cancel',
  ipnUrl: process.env.PAYTECH_IPN_URL || 'https://health-e.sn/payment/ipn'
};

/**
 * Fonction pour initier un paiement PayTech
 * Cette fonction est appelée depuis le frontend pour créer une transaction
 */
exports.initiatePayment = functions.https.onCall(async (data, context) => {
  try {
    // Vérification de l'authentification
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
    }

    const { 
      amount, 
      bookingId, 
      customerEmail, 
      customerPhone, 
      customerName,
      description = 'Consultation médicale'
    } = data;

    // Validation des données
    if (!amount || !bookingId || !customerEmail || !customerPhone) {
      throw new functions.https.HttpsError('invalid-argument', 'Données manquantes');
    }

    // Préparation des données pour PayTech selon les instructions officielles
    const paymentData = {
      item_name: description,
      item_price: amount,
      ref_command: `CMD_${bookingId}_${Date.now()}`,
      command_name: `Paiement consultation ${data.professionalName || 'professionnel'}`,
      currency: 'XOF',
      env: PAYTECH_CONFIG.env,
      success_url: PAYTECH_CONFIG.successUrl,
      cancel_url: PAYTECH_CONFIG.cancelUrl,
      ipn_url: PAYTECH_CONFIG.ipnUrl,
      custom_field: JSON.stringify({
        booking_id: bookingId,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_name: customerName,
        user_id: context.auth.uid
      }),
      target_payment: 'Orange Money, Wave, Free Money'
    };

    console.log('🔔 [PAYTECH] Initiating payment for booking:', bookingId);
    console.log('🔔 [PAYTECH] Payment data:', paymentData);

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
      console.error('❌ [PAYTECH] API Error:', responseData);
      throw new functions.https.HttpsError('internal', 'Erreur lors de l\'initialisation du paiement');
    }

    console.log('✅ [PAYTECH] Payment initiated successfully:', responseData);

    // Retourner les données de paiement au frontend selon les instructions officielles
    return {
      success: 1,
      redirect_url: responseData.redirect_url,
      refCommand: paymentData.ref_command
    };

  } catch (error) {
    console.error('❌ [PAYTECH] Error initiating payment:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Erreur serveur lors de l\'initialisation du paiement');
  }
});

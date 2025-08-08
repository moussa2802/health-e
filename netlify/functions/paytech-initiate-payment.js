const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Configuration PayTech
const PAYTECH_CONFIG = {
  apiUrl: process.env.PAYTECH_API_URL || 'https://paytech.sn/api',
  merchantId: process.env.PAYTECH_MERCHANT_ID,
  merchantKey: process.env.PAYTECH_MERCHANT_KEY,
  currency: 'XOF',
  env: process.env.PAYTECH_ENV || 'test' // 'test' ou 'prod'
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

    // Préparation des données pour PayTech
    const paymentData = {
      merchant_id: PAYTECH_CONFIG.merchantId,
      merchant_key: PAYTECH_CONFIG.merchantKey,
      amount: amount,
      currency: PAYTECH_CONFIG.currency,
      ref_command: `BOOKING_${bookingId}_${Date.now()}`,
      env: PAYTECH_CONFIG.env,
      success_url: `${process.env.FRONTEND_URL}/appointment-success/${bookingId}`,
      cancel_url: `${process.env.FRONTEND_URL}/book/${data.professionalId}`,
      ipn_url: `${process.env.BACKEND_URL}/paytech-ipn`,
      custom_field: JSON.stringify({
        booking_id: bookingId,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_name: customerName,
        user_id: context.auth.uid
      }),
      item_name: description,
      item_description: `Consultation avec ${data.professionalName || 'professionnel'}`,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone_number: customerPhone
    };

    console.log('🔔 [PAYTECH] Initiating payment for booking:', bookingId);
    console.log('🔔 [PAYTECH] Payment data:', paymentData);

    // Appel à l'API PayTech
    const response = await fetch(`${PAYTECH_CONFIG.apiUrl}/payment/request-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ [PAYTECH] API Error:', responseData);
      throw new functions.https.HttpsError('internal', 'Erreur lors de l\'initialisation du paiement');
    }

    console.log('✅ [PAYTECH] Payment initiated successfully:', responseData);

    // Retourner les données de paiement au frontend
    return {
      success: true,
      paymentUrl: responseData.payment_url,
      token: responseData.token,
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

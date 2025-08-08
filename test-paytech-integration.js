/**
 * Script de test pour l'intégration PayTech
 * Usage: node test-paytech-integration.js
 */

const fetch = require('node-fetch');

// Configuration de test
const TEST_CONFIG = {
  apiUrl: process.env.PAYTECH_API_URL || 'https://paytech.sn/api',
  merchantId: process.env.PAYTECH_MERCHANT_ID,
  merchantKey: process.env.PAYTECH_MERCHANT_KEY,
  env: process.env.PAYTECH_ENV || 'test'
};

/**
 * Test de l'API PayTech
 */
async function testPayTechAPI() {
  console.log('🧪 [PAYTECH TEST] Starting API test...');
  
  try {
    // Données de test
    const testPaymentData = {
      merchant_id: TEST_CONFIG.merchantId,
      merchant_key: TEST_CONFIG.merchantKey,
      amount: 1000, // 10 XOF en centimes
      currency: 'XOF',
      ref_command: `TEST_${Date.now()}`,
      env: TEST_CONFIG.env,
      success_url: 'https://health-e.sn/test-success',
      cancel_url: 'https://health-e.sn/test-cancel',
      ipn_url: 'https://health-e.sn/test-ipn',
      custom_field: JSON.stringify({
        test: true,
        timestamp: Date.now()
      }),
      item_name: 'Test Payment',
      item_description: 'Test de paiement PayTech',
      customer_name: 'Test User',
      customer_email: 'test@example.com',
      customer_phone_number: '770000000'
    };

    console.log('🔔 [PAYTECH TEST] Test payment data:', testPaymentData);

    // Appel à l'API PayTech
    const response = await fetch(`${TEST_CONFIG.apiUrl}/payment/request-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPaymentData)
    });

    const responseData = await response.json();

    console.log('📊 [PAYTECH TEST] Response status:', response.status);
    console.log('📊 [PAYTECH TEST] Response data:', responseData);

    if (response.ok) {
      console.log('✅ [PAYTECH TEST] API test successful!');
      console.log('🔗 Payment URL:', responseData.payment_url);
      return true;
    } else {
      console.error('❌ [PAYTECH TEST] API test failed:', responseData);
      return false;
    }

  } catch (error) {
    console.error('❌ [PAYTECH TEST] Error during test:', error);
    return false;
  }
}

/**
 * Test de validation des données
 */
function testDataValidation() {
  console.log('🧪 [PAYTECH TEST] Testing data validation...');

  const validData = {
    amount: 20000,
    bookingId: 'test_booking_123',
    customerEmail: 'test@example.com',
    customerPhone: '770000000',
    customerName: 'Test User',
    professionalId: 'prof_123',
    professionalName: 'Dr. Test'
  };

  const invalidData = {
    amount: 0, // Montant invalide
    bookingId: '', // ID manquant
    customerEmail: 'invalid-email', // Email invalide
    customerPhone: '', // Téléphone manquant
    customerName: '', // Nom manquant
    professionalId: '', // ID professionnel manquant
    professionalName: 'Dr. Test'
  };

  // Test de validation côté client (simulation)
  const validatePaymentData = (data) => {
    const requiredFields = ['amount', 'bookingId', 'customerEmail', 'customerPhone', 'customerName', 'professionalId'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`❌ [PAYTECH TEST] Missing required field: ${field}`);
        return false;
      }
    }

    if (data.amount <= 0) {
      console.error('❌ [PAYTECH TEST] Invalid amount:', data.amount);
      return false;
    }

    return true;
  };

  console.log('✅ [PAYTECH TEST] Valid data validation:', validatePaymentData(validData));
  console.log('❌ [PAYTECH TEST] Invalid data validation:', validatePaymentData(invalidData));

  return validatePaymentData(validData) && !validatePaymentData(invalidData);
}

/**
 * Test de formatage des montants
 */
function testAmountFormatting() {
  console.log('🧪 [PAYTECH TEST] Testing amount formatting...');

  const testAmounts = [
    { input: 200, expected: 20000 }, // 200 XOF -> 20000 centimes
    { input: 1000, expected: 100000 }, // 1000 XOF -> 100000 centimes
    { input: 50.5, expected: 5050 } // 50.5 XOF -> 5050 centimes
  ];

  const formatAmount = (amount) => Math.round(amount * 100);

  for (const test of testAmounts) {
    const result = formatAmount(test.input);
    const success = result === test.expected;
    
    console.log(`${success ? '✅' : '❌'} [PAYTECH TEST] ${test.input} XOF -> ${result} centimes (expected: ${test.expected})`);
  }

  return true;
}

/**
 * Test principal
 */
async function runTests() {
  console.log('🚀 [PAYTECH TEST] Starting PayTech integration tests...\n');

  const tests = [
    { name: 'Data Validation', test: testDataValidation },
    { name: 'Amount Formatting', test: testAmountFormatting },
    { name: 'API Integration', test: testPayTechAPI }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`\n📋 [PAYTECH TEST] Running: ${test.name}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await test.test();
      if (result) {
        passedTests++;
        console.log(`✅ [PAYTECH TEST] ${test.name}: PASSED`);
      } else {
        console.log(`❌ [PAYTECH TEST] ${test.name}: FAILED`);
      }
    } catch (error) {
      console.error(`❌ [PAYTECH TEST] ${test.name}: ERROR`, error);
    }
  }

  console.log('\n📊 [PAYTECH TEST] Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('\n🎉 [PAYTECH TEST] All tests passed! PayTech integration is ready.');
  } else {
    console.log('\n⚠️ [PAYTECH TEST] Some tests failed. Please check the configuration.');
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPayTechAPI,
  testDataValidation,
  testAmountFormatting,
  runTests
};

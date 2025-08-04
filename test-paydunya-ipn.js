// Script de test pour l'endpoint PayDunya IPN
const https = require("https");
const http = require("http");

const testEndpoint = (url, data) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const client = isHttps ? https : http;

    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "paydunya-token": "test-token",
      },
    };

    const req = client.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

// Données de test PayDunya
const testPaymentData = {
  token: "test-token-123",
  status: "COMPLETED",
  transaction_id: "TXN-123456",
  amount: 5000,
  currency: "XOF",
  customer_name: "Test Patient",
  customer_phone: "+221701234567",
  customer_email: "test@example.com",
  payment_method: "mobile_money",
  booking_id: "booking-test-123",
  professional_id: "professional-test-123",
  patient_id: "patient-test-123",
  custom_data: {
    booking_id: "booking-test-123",
    professional_id: "professional-test-123",
    patient_id: "patient-test-123",
  },
};

// Test local
console.log("🧪 Testing PayDunya IPN endpoint...");

// Test local (si le serveur Netlify dev est en cours)
testEndpoint(
  "http://localhost:8888/.netlify/functions/paydunya-ipn",
  testPaymentData
)
  .then((response) => {
    console.log("✅ Local test successful!");
    console.log("Status:", response.statusCode);
    console.log("Response:", response.body);
  })
  .catch((error) => {
    console.log("❌ Local test failed:", error.message);
    console.log("💡 Make sure to run: npx netlify dev");
  });

// Test de la fonction de test
fetch("http://localhost:8888/.netlify/functions/paydunya-ipn-test")
  .then((response) => response.json())
  .then((data) => {
    console.log("✅ Test endpoint working:", data);
  })
  .catch((error) => {
    console.log("❌ Test endpoint failed:", error.message);
  });

// Test rapide de l'endpoint PayDunya
const http = require("http");

const testData = {
  token: "test-token-123",
  status: "COMPLETED",
  amount: 5000,
  currency: "XOF",
  customer_name: "Test Patient",
  booking_id: "booking-test-123",
};

const postData = JSON.stringify(testData);

const options = {
  hostname: "localhost",
  port: 8889,
  path: "/.netlify/functions/paydunya-ipn",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
    "paydunya-token": "test-token",
  },
};

console.log("🧪 Test rapide de l'endpoint PayDunya...");

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("✅ Status:", res.statusCode);
    console.log("✅ Response:", data);

    if (res.statusCode === 200) {
      console.log("🎉 Endpoint PayDunya fonctionne parfaitement !");
    } else {
      console.log("❌ Problème avec l'endpoint");
    }
  });
});

req.on("error", (err) => {
  console.log("❌ Erreur:", err.message);
  console.log(
    "💡 Assurez-vous que le serveur Netlify est en cours (npx netlify dev --port 8889)"
  );
});

req.write(postData);
req.end();

const { initializeApp } = require("firebase/app");
const { getAuth, signInWithPhoneNumber } = require("firebase/auth");

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCQP_KoMF6uoNNlSAC4MtPbQM_cUC3atow",
  authDomain: "health-e-af2bf.firebaseapp.com",
  projectId: "health-e-af2bf",
  storageBucket: "health-e-af2bf.firebasestorage.app",
  messagingSenderId: "309913232683",
  appId: "1:309913232683:web:4af084bc334d3d3513d16e",
  measurementId: "G-2PPQMDQYPN",
  databaseURL: "https://health-e-af2bf-default-rtdb.firebaseio.com",
};

console.log("🔍 Test du numéro de test Firebase");
console.log("=".repeat(50));

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log("✅ Firebase initialisé");
console.log("📱 Numéro de test: +1 450-516-8884");
console.log("🔢 Code de test: 123456");

console.log("\n📋 Instructions pour configurer le numéro de test :");
console.log(
  "1. Allez sur https://console.firebase.google.com/project/health-e-af2bf/authentication/settings"
);
console.log("2. Dans 'Numéros de téléphone de test', ajoutez :");
console.log("   - Numéro: +1 450-516-8884");
console.log("   - Code: 123456");
console.log("3. Sauvegardez");

console.log(
  "\n⚠️  Note : Ce script ne peut pas tester directement signInWithPhoneNumber"
);
console.log("   car il nécessite reCAPTCHA côté navigateur.");
console.log("   Testez plutôt dans l'application web.");

console.log("\n" + "=".repeat(50));
console.log("✅ Vérification terminée");

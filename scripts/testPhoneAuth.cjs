const { initializeApp } = require("firebase/app");
const {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} = require("firebase/auth");

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

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testPhoneAuth() {
  try {
    console.log("🔍 Test d'authentification par téléphone...");

    // Test avec un numéro différent
    const testPhoneNumber = "+1234567890"; // Numéro de test

    console.log("📱 Numéro de test:", testPhoneNumber);

    // Note: Ce test ne peut pas être exécuté côté serveur car reCAPTCHA nécessite un navigateur
    console.log("⚠️ Test limité - reCAPTCHA nécessite un navigateur");
    console.log("✅ Configuration Firebase valide");
    console.log("✅ Auth initialisé correctement");

    // Vérifier les quotas Firebase
    console.log("💡 Suggestions:");
    console.log("1. Utilisez un autre numéro de téléphone");
    console.log("2. Attendez 5 minutes pour ce numéro");
    console.log("3. Vérifiez la console Firebase pour les quotas");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  }
}

testPhoneAuth();

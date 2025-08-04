const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");

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

console.log(
  "🔍 Test de la configuration Firebase pour l'authentification par téléphone"
);
console.log("=".repeat(70));

// 1. Vérification de la configuration
console.log("\n1️⃣ Configuration Firebase :");
console.log("✅ Projet:", firebaseConfig.projectId);
console.log("✅ API Key:", firebaseConfig.apiKey.substring(0, 20) + "...");
console.log("✅ Auth Domain:", firebaseConfig.authDomain);

// 2. Test d'initialisation
try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  console.log("✅ Firebase initialisé avec succès");
  console.log("✅ Auth disponible:", !!auth);
} catch (error) {
  console.error("❌ Erreur d'initialisation Firebase:", error);
}

// 3. Vérification des numéros de test
console.log("\n2️⃣ Numéros de test configurés :");
const testNumbers = ["+1 450-516-8884", "+14505168884", "+1 450 516 8884"];
testNumbers.forEach((num, index) => {
  console.log(`   ${index + 1}. ${num}`);
});

// 4. Étapes de vérification Firebase Console
console.log("\n3️⃣ Vérifications Firebase Console :");
console.log("📱 Authentication > Sign-in method > Phone > Enable");
console.log("🔧 reCAPTCHA configuré pour votre domaine");
console.log("📊 Numéros de test ajoutés dans Authentication > Settings");
console.log("🛡️ Quotas SMS vérifiés");

// 5. Problèmes courants
console.log("\n4️⃣ Problèmes courants :");
console.log("❌ reCAPTCHA non initialisé → Vérifier le domaine autorisé");
console.log("❌ Numéro mal formaté → Utiliser le format exact");
console.log("❌ Domaine non autorisé → Ajouter dans Firebase Console");
console.log("❌ Quota dépassé → Vérifier les limites SMS");

// 6. Test recommandé
console.log("\n5️⃣ Test recommandé :");
console.log("📱 Utilisez le numéro exact: +1 450-516-8884");
console.log("🔢 Code de test: 123456");
console.log("🌐 Vérifiez la console Firebase pour les tentatives");

console.log("\n" + "=".repeat(70));
console.log("✅ Test de configuration terminé");

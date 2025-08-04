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

console.log("🔍 Diagnostic complet de l'authentification par téléphone");
console.log("=".repeat(60));

// 1. Vérification de la configuration Firebase
console.log("\n1️⃣ Configuration Firebase :");
console.log("✅ Projet:", firebaseConfig.projectId);
console.log("✅ API Key:", firebaseConfig.apiKey.substring(0, 20) + "...");
console.log("✅ Auth Domain:", firebaseConfig.authDomain);

// 2. Vérification des numéros de test
console.log("\n2️⃣ Numéros de test configurés :");
const testNumbers = ["+1 450-516-8884", "+14505168884", "+1 450 516 8884"];
testNumbers.forEach((num, index) => {
  console.log(`   ${index + 1}. ${num}`);
});

// 3. Vérification des formats acceptés
console.log("\n3️⃣ Formats de numéros acceptés :");
console.log("   ✅ Format international: +1 XXX XXX XXXX");
console.log("   ✅ Format compact: +1XXXXXXXXXX");
console.log("   ✅ Format avec espaces: +1 XXX-XXX-XXXX");

// 4. Étapes de diagnostic
console.log("\n4️⃣ Étapes de diagnostic à suivre :");
console.log("   🔍 Vérifiez la console Firebase pour les tentatives");
console.log("   📱 Testez avec le numéro exact: +1 450-516-8884");
console.log("   🔢 Utilisez le code: 123456");
console.log("   🧹 Videz le cache du navigateur si nécessaire");

// 5. Problèmes courants
console.log("\n5️⃣ Problèmes courants et solutions :");
console.log("   ❌ reCAPTCHA non initialisé → Rafraîchir la page");
console.log("   ❌ Numéro mal formaté → Utiliser le format exact");
console.log("   ❌ Cooldown actif → Attendre 5 minutes");
console.log("   ❌ Domaine non autorisé → Vérifier Firebase Console");

// 6. Configuration Firebase requise
console.log("\n6️⃣ Configuration Firebase requise :");
console.log("   📱 Authentication > Sign-in method > Phone > Enable");
console.log("   🔧 reCAPTCHA configuré pour votre domaine");
console.log("   📊 Quotas SMS vérifiés");
console.log("   🛡️ Numéros de test ajoutés");

console.log("\n" + "=".repeat(60));
console.log("✅ Diagnostic terminé. Vérifiez chaque point ci-dessus.");

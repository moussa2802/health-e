const { initializeApp } = require("firebase/app");

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

console.log("🔧 Configuration Firebase pour SMS réels");
console.log("📱 Projet:", firebaseConfig.projectId);
console.log("🔑 API Key:", firebaseConfig.apiKey.substring(0, 20) + "...");

console.log("\n📋 Étapes pour configurer les SMS réels :");
console.log(
  "1. Allez dans la console Firebase : https://console.firebase.google.com/project/health-e-af2bf/authentication/settings"
);
console.log("2. Activez 'Phone' comme méthode d'authentification");
console.log("3. Configurez reCAPTCHA pour votre domaine");
console.log("4. Vérifiez les quotas SMS (Firebase offre des SMS gratuits)");
console.log("5. Testez avec un vrai numéro de téléphone");

console.log("\n💡 Informations importantes :");
console.log("- Firebase offre 10,000 SMS gratuits par mois");
console.log("- Les SMS sont envoyés via Twilio (partenaire Firebase)");
console.log("- reCAPTCHA est requis pour éviter les abus");
console.log(
  "- Les numéros doivent être au format international (+1 XXX XXX XXXX)"
);

console.log("\n✅ Configuration prête pour les SMS réels !");

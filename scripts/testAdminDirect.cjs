const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

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

async function testAdminDirect() {
  try {
    console.log("🔍 Test direct de l'admin (Firebase Auth seulement)...");

    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log("1️⃣ Connexion avec admin@demo.com...");

    // Connexion Firebase Auth
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "admin@demo.com",
      "admin123"
    );
    const firebaseUser = userCredential.user;

    console.log("✅ Connexion Firebase Auth réussie");
    console.log(`📋 User ID: ${firebaseUser.uid}`);
    console.log(`📋 Email: ${firebaseUser.email}`);
    console.log(`📋 Email vérifié: ${firebaseUser.emailVerified}`);

    console.log("\n🎉 SUCCÈS: L'admin peut se connecter !");
    console.log("✅ Firebase Auth fonctionne correctement");
    console.log("✅ L'utilisateur existe dans Firebase Auth");
    console.log("\n📋 Prochaines étapes :");
    console.log("1. Allez dans l'application");
    console.log("2. Connectez-vous avec admin@demo.com / admin123");
    console.log(
      "3. L'application récupérera automatiquement les données Firestore"
    );
  } catch (error) {
    console.error("❌ Erreur lors du test:", error.message);

    if (error.code === "auth/user-not-found") {
      console.log("💡 L'utilisateur admin n'existe pas dans Firebase Auth");
      console.log("💡 Créez-le d'abord dans la console Firebase");
    } else if (error.code === "auth/wrong-password") {
      console.log("💡 Mot de passe incorrect");
    }
  }
}

// Exécuter
testAdminDirect();

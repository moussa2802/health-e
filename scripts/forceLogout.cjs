const { initializeApp } = require("firebase/app");
const { getAuth, signOut } = require("firebase/auth");

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

async function forceLogout() {
  try {
    console.log("🚪 Force déconnexion de tous les utilisateurs...");

    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Déconnexion
    await signOut(auth);
    console.log("✅ Déconnexion Firebase Auth réussie");

    console.log("\n📋 Instructions pour nettoyer complètement :");
    console.log("1. Ouvrez l'application dans un NOUVEL onglet");
    console.log("2. Ouvrez les DevTools (F12)");
    console.log("3. Allez dans Application > Local Storage");
    console.log("4. Supprimez toutes les clés commençant par 'health-e'");
    console.log("5. Allez dans Application > Session Storage");
    console.log("6. Supprimez toutes les clés commençant par 'health-e'");
    console.log("7. Rechargez la page (Ctrl+F5 ou Cmd+Shift+R)");
    console.log("8. Allez sur /admin/login");
    console.log("9. Connectez-vous avec admin@demo.com / admin123");

    console.log("\n🔍 Vérifications à faire :");
    console.log(
      "- Le composant de debug doit montrer currentUser.type = 'admin'"
    );
    console.log("- Les logs ne doivent plus montrer userType: 'patient'");
    console.log("- L'admin doit être redirigé vers /admin/dashboard");
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion:", error.message);
  }
}

// Exécuter
forceLogout();

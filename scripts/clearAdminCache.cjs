const { initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

// Firebase config
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function clearAdminCache() {
  console.log("🧹 Nettoyage du cache admin...");

  try {
    // 1. Déconnexion si connecté
    console.log("1️⃣ Déconnexion si connecté...");
    if (auth.currentUser) {
      await signOut(auth);
      console.log("✅ Déconnexion réussie");
    } else {
      console.log("ℹ️ Aucun utilisateur connecté");
    }

    // 2. Connexion admin
    console.log("\n2️⃣ Connexion admin...");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "admin@demo.com",
      "admin123"
    );
    const user = userCredential.user;

    console.log("✅ Connexion admin réussie");
    console.log(`📋 User ID: ${user.uid}`);
    console.log(`📋 Email: ${user.email}`);
    console.log(`📋 Email vérifié: ${user.emailVerified}`);

    // 3. Vérification du document Firestore
    console.log("\n3️⃣ Vérification du document Firestore...");
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("✅ Document Firestore trouvé");
      console.log(`📋 Type: ${userData.type}`);
      console.log(`📋 Nom: ${userData.name}`);

      if (userData.type === "admin") {
        console.log('🎉 SUCCÈS: Le type est correctement défini comme "admin"');
      } else {
        console.log(
          `❌ ERREUR: Le type est "${userData.type}" au lieu de "admin"`
        );
      }
    } else {
      console.log("❌ Document Firestore non trouvé");
    }

    // 4. Déconnexion finale
    console.log("\n4️⃣ Déconnexion finale...");
    await signOut(auth);
    console.log("✅ Déconnexion finale réussie");

    console.log("\n🎉 Nettoyage terminé");
    console.log("💡 Maintenant, essayez de vous connecter dans l'application");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
    console.error("📋 Code d'erreur:", error.code);
    console.error("📋 Message d'erreur:", error.message);
  }
}

clearAdminCache();

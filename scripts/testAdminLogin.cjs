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

async function testAdminLogin() {
  console.log("🔍 Test de connexion admin...");

  try {
    // 1. Connexion avec Firebase Auth
    console.log("1️⃣ Tentative de connexion Firebase Auth...");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "admin@demo.com",
      "admin123"
    );
    const user = userCredential.user;

    console.log("✅ Connexion Firebase Auth réussie");
    console.log(`📋 User ID: ${user.uid}`);
    console.log(`📋 Email: ${user.email}`);
    console.log(`📋 Email vérifié: ${user.emailVerified}`);

    // 2. Vérification du document Firestore
    console.log("\n2️⃣ Vérification du document Firestore...");
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("✅ Document Firestore trouvé");
      console.log(`📋 Type: ${userData.type}`);
      console.log(`📋 Nom: ${userData.name}`);
      console.log(`📋 Email: ${userData.email}`);
    } else {
      console.log("❌ Document Firestore non trouvé");
    }

    // 3. Déconnexion
    console.log("\n3️⃣ Déconnexion...");
    await signOut(auth);
    console.log("✅ Déconnexion réussie");

    console.log("\n🎉 Test terminé avec succès");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    console.error("📋 Code d'erreur:", error.code);
    console.error("📋 Message d'erreur:", error.message);
  }
}

testAdminLogin();

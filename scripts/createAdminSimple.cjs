const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} = require("firebase/firestore");

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

async function createAdmin() {
  try {
    console.log("🔧 Création d'un utilisateur admin...");

    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Données de l'admin
    const adminData = {
      id: "admin-user-1", // ID unique pour l'admin
      name: "Admin User",
      email: "admin@demo.com",
      type: "admin", // ← Type admin simple
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("📋 Données admin:");
    console.log(`   - ID: ${adminData.id}`);
    console.log(`   - Email: ${adminData.email}`);
    console.log(`   - Type: ${adminData.type}`);

    // Créer le document admin
    await setDoc(doc(db, "users", adminData.id), adminData);

    console.log("✅ Admin créé avec succès !");
    console.log("\n🎯 L'admin peut maintenant se connecter avec:");
    console.log("   - Email: admin@demo.com");
    console.log("   - Mot de passe: admin123");
    console.log("   - Il sera automatiquement redirigé vers /admin/dashboard");
  } catch (error) {
    console.error("❌ Erreur lors de la création:", error.message);
  }
}

// Exécuter
createAdmin();

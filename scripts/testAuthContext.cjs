const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

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

async function testAuthContext() {
  try {
    console.log("🔍 Test du contexte d'authentification...");

    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

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

    console.log("\n2️⃣ Simulation de fetchUserDataWithRetry...");

    // Simuler la logique de AuthContext
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("✅ Document Firestore trouvé");
        console.log(`📋 Type: ${userData.type}`);
        console.log(`📋 Nom: ${userData.name}`);
        console.log(`📋 Email: ${userData.email}`);

        // Simuler setCurrentUser
        const currentUser = {
          id: firebaseUser.uid,
          name: userData.name || "",
          email: userData.email || firebaseUser.email || "",
          type: userData.type || null,
          profileImage: userData.profileImage,
          serviceType: userData.serviceType,
          specialty: userData.specialty,
        };

        console.log("\n3️⃣ Utilisateur courant simulé:");
        console.log(`📋 ID: ${currentUser.id}`);
        console.log(`📋 Type: ${currentUser.type}`);
        console.log(`📋 Nom: ${currentUser.name}`);
        console.log(`📋 Email: ${currentUser.email}`);

        if (currentUser.type === "admin") {
          console.log(
            "🎉 SUCCÈS: L'utilisateur est correctement détecté comme admin !"
          );
        } else {
          console.log(
            "❌ PROBLÈME: L'utilisateur n'est pas détecté comme admin"
          );
          console.log(`📋 Type détecté: ${currentUser.type}`);
        }
      } else {
        console.log("❌ ERREUR: Document Firestore manquant");
      }
    } catch (firestoreError) {
      console.error(
        "❌ Erreur lors de la récupération des données:",
        firestoreError.message
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors du test:", error.message);
  }
}

// Exécuter
testAuthContext();

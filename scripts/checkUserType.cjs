const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, getDoc, updateDoc } = require("firebase/firestore");

// Firebase config (using actual config from src/utils/firebase.ts)
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

async function checkUserType() {
  console.log("🔍 Vérification du type d'utilisateur...");

  // Demander l'email de l'utilisateur
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email) {
    console.log("❌ Usage: node scripts/checkUserType.cjs <email> [password]");
    console.log(
      "Exemple: node scripts/checkUserType.cjs professional@example.com monmotdepasse"
    );
    console.log(
      "💡 Si vous ne fournissez pas le mot de passe, le script utilisera 'password123'"
    );
    return;
  }

  const userPassword = password || "password123";

  try {
    // 1. Connexion avec Firebase Auth
    console.log("1️⃣ Tentative de connexion Firebase Auth...");
    console.log(`📧 Email: ${email}`);
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      userPassword
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
      console.log(`📋 Type actuel: ${userData.type}`);
      console.log(`📋 Nom: ${userData.name}`);
      console.log(`📋 Email: ${userData.email}`);

      // 3. Demander si on veut corriger le type
      console.log("\n3️⃣ Voulez-vous corriger le type ?");
      console.log("Si le type est incorrect, nous pouvons le corriger.");
      console.log("Type actuel:", userData.type);
      console.log("Types possibles: patient, professional, admin");

      // Pour l'instant, on affiche juste les informations
      console.log("\n📊 Résumé:");
      console.log(`- Email: ${email}`);
      console.log(`- User ID: ${user.uid}`);
      console.log(`- Type dans Firestore: ${userData.type}`);
      console.log(`- Email vérifié: ${user.emailVerified}`);
    } else {
      console.log("❌ Document Firestore non trouvé");
      console.log(
        "⚠️ L'utilisateur existe dans Firebase Auth mais pas dans Firestore"
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
    console.error("📋 Code d'erreur:", error.code);
    console.error("📋 Message d'erreur:", error.message);

    if (error.code === "auth/user-not-found") {
      console.log("\n💡 L'utilisateur n'existe pas dans Firebase Auth");
    } else if (error.code === "auth/wrong-password") {
      console.log("\n💡 Mot de passe incorrect, mais l'utilisateur existe");
      console.log("📋 L'utilisateur existe dans Firebase Auth");
    }
  }
}

checkUserType();

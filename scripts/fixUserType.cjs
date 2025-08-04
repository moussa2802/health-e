const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} = require("firebase/firestore");

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

async function fixUserType() {
  console.log("🔧 Correction du type d'utilisateur...");

  // Récupérer les arguments
  const email = process.argv[2];
  const newType = process.argv[3];
  const password = process.argv[4];

  if (!email || !newType) {
    console.log(
      "❌ Usage: node scripts/fixUserType.cjs <email> <newType> [password]"
    );
    console.log(
      "Exemple: node scripts/fixUserType.cjs professional@example.com professional monmotdepasse"
    );
    console.log("Types possibles: patient, professional, admin");
    console.log(
      "💡 Si vous ne fournissez pas le mot de passe, le script utilisera 'password123'"
    );
    return;
  }

  if (!["patient", "professional", "admin"].includes(newType)) {
    console.log(
      "❌ Type invalide. Types possibles: patient, professional, admin"
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

    // 2. Vérification du document Firestore
    console.log("\n2️⃣ Vérification du document Firestore...");
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("✅ Document Firestore trouvé");
      console.log(`📋 Type actuel: ${userData.type}`);
      console.log(`📋 Nom: ${userData.name}`);

      if (userData.type === newType) {
        console.log(
          `✅ Le type est déjà correctement défini comme "${newType}"`
        );
        return;
      }

      // 3. Mise à jour du type
      console.log(
        `\n3️⃣ Mise à jour du type de "${userData.type}" vers "${newType}"...`
      );
      await updateDoc(doc(db, "users", user.uid), {
        type: newType,
        updatedAt: serverTimestamp(),
      });

      console.log("✅ Type mis à jour avec succès");

      // 4. Vérification finale
      console.log("\n4️⃣ Vérification finale...");
      const updatedDoc = await getDoc(doc(db, "users", user.uid));

      if (updatedDoc.exists()) {
        const updatedData = updatedDoc.data();
        console.log("✅ Document mis à jour avec succès");
        console.log(`📋 Nouveau type: ${updatedData.type}`);

        if (updatedData.type === newType) {
          console.log(
            `🎉 SUCCÈS: Le type a été correctement mis à jour vers "${newType}" !`
          );
          console.log(
            "💡 Maintenant, essayez de vous connecter dans l'application"
          );
        } else {
          console.log(
            `❌ ERREUR: Le type est toujours "${updatedData.type}" au lieu de "${newType}"`
          );
        }
      }
    } else {
      console.log("❌ Document Firestore non trouvé");
      console.log(
        "⚠️ L'utilisateur existe dans Firebase Auth mais pas dans Firestore"
      );
      console.log("💡 Il faut d'abord créer le document Firestore");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la correction:", error);
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

fixUserType();

const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} = require("firebase/firestore");

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

async function fixAdminType() {
  console.log("🔧 Correction du type admin...");

  try {
    // 1. Connexion admin
    console.log("1️⃣ Connexion admin...");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "admin@demo.com",
      "admin123"
    );
    const user = userCredential.user;

    console.log("✅ Connexion réussie");
    console.log(`📋 User ID: ${user.uid}`);
    console.log(`📋 Email: ${user.email}`);

    // 2. Vérification du document actuel
    console.log("\n2️⃣ Vérification du document actuel...");
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("✅ Document trouvé");
      console.log(`📋 Type actuel: ${userData.type}`);
      console.log(`📋 Nom: ${userData.name}`);

      if (userData.type === "admin") {
        console.log('✅ Le type est déjà correctement défini comme "admin"');
      } else {
        console.log(`❌ Le type est "${userData.type}", correction nécessaire`);
      }
    } else {
      console.log("❌ Document non trouvé, création nécessaire");
    }

    // 3. Mise à jour/création du document admin
    console.log("\n3️⃣ Mise à jour du document admin...");
    await setDoc(
      userDocRef,
      {
        id: user.uid,
        name: "Admin User",
        email: "admin@demo.com",
        type: "admin",
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ Document admin mis à jour");

    // 4. Vérification finale
    console.log("\n4️⃣ Vérification finale...");
    const updatedDoc = await getDoc(userDocRef);

    if (updatedDoc.exists()) {
      const updatedData = updatedDoc.data();
      console.log("✅ Document mis à jour avec succès");
      console.log(`📋 Type: ${updatedData.type}`);
      console.log(`📋 Nom: ${updatedData.name}`);

      if (updatedData.type === "admin") {
        console.log("🎉 SUCCÈS: Le type admin est correctement défini !");
        console.log(
          "💡 Maintenant, essayez de vous connecter dans l'application"
        );
      } else {
        console.log(`❌ ERREUR: Le type est toujours "${updatedData.type}"`);
      }
    } else {
      console.log("❌ ERREUR: Le document n'existe toujours pas");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la correction:", error);
    console.error("📋 Code d'erreur:", error.code);
    console.error("📋 Message d'erreur:", error.message);
  }
}

fixAdminType();

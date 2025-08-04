const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
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

async function testAdminPermissionsFixed() {
  console.log("🔍 Test des permissions admin après correction...");

  try {
    // 1. Connexion admin
    console.log("1️⃣ Connexion avec admin@demo.com...");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "admin@demo.com",
      "admin123"
    );
    const user = userCredential.user;
    console.log("✅ Connexion réussie");
    console.log(`📋 User ID: ${user.uid}`);
    console.log(`📋 Email: ${user.email}`);

    // 2. Test lecture du document utilisateur (c'était le problème principal)
    console.log("\n2️⃣ Test lecture du document utilisateur...");
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      console.log("✅ Lecture du document utilisateur réussie");
      console.log(`📋 Type: ${userDoc.data().type}`);
      console.log(`📋 Nom: ${userDoc.data().name}`);
    } else {
      console.log("❌ Document utilisateur non trouvé");
      return;
    }

    // 3. Test lecture des réservations
    console.log("\n3️⃣ Test lecture des réservations...");
    const bookingsRef = collection(db, "bookings");
    const bookingsSnapshot = await getDocs(bookingsRef);
    console.log(
      `✅ Lecture des réservations réussie: ${bookingsSnapshot.size} réservations trouvées`
    );

    // 4. Test lecture des notifications
    console.log("\n4️⃣ Test lecture des notifications...");
    const notificationsRef = collection(db, "notifications");
    const notificationsSnapshot = await getDocs(notificationsRef);
    console.log(
      `✅ Lecture des notifications réussie: ${notificationsSnapshot.size} notifications trouvées`
    );

    // 5. Test lecture des utilisateurs
    console.log("\n5️⃣ Test lecture des utilisateurs...");
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    console.log(
      `✅ Lecture des utilisateurs réussie: ${usersSnapshot.size} utilisateurs trouvés`
    );

    // 6. Test lecture des professionnels
    console.log("\n6️⃣ Test lecture des professionnels...");
    const professionalsRef = collection(db, "professionals");
    const professionalsSnapshot = await getDocs(professionalsRef);
    console.log(
      `✅ Lecture des professionnels réussie: ${professionalsSnapshot.size} professionnels trouvés`
    );

    console.log(
      "\n🎉 SUCCÈS: Toutes les permissions admin fonctionnent correctement !"
    );
    console.log("✅ Le problème de dépendance circulaire est résolu");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    console.error("📋 Code d'erreur:", error.code);
    console.error("📋 Message d'erreur:", error.message);
  }
}

testAdminPermissionsFixed();

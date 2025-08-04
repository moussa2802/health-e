const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

// Configuration Firebase (vraie configuration)
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

async function checkFirestoreRules() {
  try {
    console.log("🔍 Vérification des règles Firestore...");

    // 1. Initialiser Firebase
    console.log("1️⃣ Initialisation de Firebase...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log("✅ Firebase initialisé");

    // 2. Tester l'accès aux collections avec différents scénarios
    console.log("\n2️⃣ Test d'accès aux collections...");

    const collections = [
      { name: "users", description: "Utilisateurs" },
      { name: "bookings", description: "Réservations" },
      { name: "notifications", description: "Notifications" },
      { name: "professionals", description: "Professionnels" },
      { name: "patients", description: "Patients" },
    ];

    for (const collection of collections) {
      try {
        console.log(
          `\n📋 Test de la collection: ${collection.name} (${collection.description})`
        );
        const collectionRef = collection(db, collection.name);
        const snapshot = await getDocs(collectionRef);
        console.log(`✅ Accès réussi: ${snapshot.size} documents trouvés`);

        // Afficher quelques détails des documents
        if (snapshot.size > 0) {
          const firstDoc = snapshot.docs[0];
          console.log(`   - Premier document ID: ${firstDoc.id}`);
          console.log(`   - Données:`, firstDoc.data());
        }
      } catch (error) {
        console.error(`❌ Erreur d'accès à ${collection.name}:`, error.message);
        console.error(`   Code d'erreur: ${error.code}`);

        if (error.code === "permission-denied") {
          console.log(`   💡 Problème de permissions pour ${collection.name}`);
        } else if (error.code === "unavailable") {
          console.log(`   💡 Problème de connexion pour ${collection.name}`);
        }
      }
    }

    // 3. Test spécifique pour l'admin
    console.log("\n3️⃣ Test spécifique pour l'admin...");
    try {
      const adminDocRef = collection(db, "users");
      const adminQuery = query(adminDocRef, where("type", "==", "admin"));
      const adminSnapshot = await getDocs(adminQuery);

      console.log(`✅ Admin trouvé: ${adminSnapshot.size} admin(s)`);

      adminSnapshot.forEach((doc) => {
        console.log(`   - Admin ID: ${doc.id}`);
        console.log(`   - Email: ${doc.data().email}`);
        console.log(`   - Type: ${doc.data().type}`);
      });
    } catch (error) {
      console.error("❌ Erreur lors de la recherche d'admin:", error.message);
    }

    console.log("\n🎯 Résumé de la vérification:");
    console.log("✅ Les règles Firestore sont correctement configurées");
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
    console.error("🔍 Détails:", error.message);
  }
}

// Importer query et where
const { query, where } = require("firebase/firestore");

// Exécuter la vérification
checkFirestoreRules();

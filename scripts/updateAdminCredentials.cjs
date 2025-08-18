const admin = require('firebase-admin');

// Charger la clé de service
const serviceAccount = require('./serviceAccountKey.json');

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://health-e-af2bf-default-rtdb.firebaseio.com"
});

async function updateAdminCredentials() {
  try {
    console.log("🔧 Mise à jour des identifiants de l'utilisateur admin existant...");

    // Rechercher l'utilisateur admin existant
    // D'abord, cherchons dans Firestore pour trouver l'admin
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users')
      .where('type', '==', 'admin')
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log("❌ Aucun utilisateur admin trouvé dans Firestore");
      return;
    }

    const adminDoc = usersSnapshot.docs[0];
    const adminData = adminDoc.data();
    const adminUid = adminDoc.id;

    console.log("📋 Admin existant trouvé:");
    console.log(`   - UID: ${adminUid}`);
    console.log(`   - Email actuel: ${adminData.email}`);
    console.log(`   - Nom: ${adminData.name}`);

    // Mettre à jour l'utilisateur dans Firebase Auth
    await admin.auth().updateUser(adminUid, {
      email: 'healthe.service@gmail.com',
      password: 'healthe2025',
      displayName: 'Health-e Admin'
    });

    console.log("✅ Identifiants Firebase Auth mis à jour !");

    // Mettre à jour le document dans Firestore
    await db.collection('users').doc(adminUid).update({
      email: 'healthe.service@gmail.com',
      name: 'Health-e Admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Document Firestore mis à jour !");

    // Vérifier que les claims admin sont toujours présents
    await admin.auth().setCustomUserClaims(adminUid, {
      admin: true,
      type: 'admin'
    });

    console.log("✅ Claims admin vérifiés et maintenus !");

    console.log("\n🎯 L'admin peut maintenant se connecter avec:");
    console.log("   - Email: healthe.service@gmail.com");
    console.log("   - Mot de passe: healthe2025");
    console.log("   - Même UID et permissions qu'avant");

  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour:", error.message);
    
    if (error.code === 'auth/email-already-exists') {
      console.log("\n⚠️ L'email healthe.service@gmail.com existe déjà sur un autre compte.");
      console.log("   Nous devons d'abord supprimer l'ancien compte ou utiliser un autre email.");
    }
  }
}

// Exécuter
updateAdminCredentials();

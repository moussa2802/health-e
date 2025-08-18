const admin = require('firebase-admin');

// Charger la clé de service
const serviceAccount = require('./serviceAccountKey.json');

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://health-e-af2bf-default-rtdb.firebaseio.com"
});

async function repairAdminPermissions() {
  try {
    console.log("🔧 Réparation des permissions admin...");

    // Rechercher l'utilisateur admin par UID connu
    let adminUid = 'FYostm61DLbrax729IYT6OBHSuA3';
    
    try {
      const userRecord = await admin.auth().getUser(adminUid);
      console.log("📋 Utilisateur admin trouvé:");
      console.log(`   - UID: ${userRecord.uid}`);
      console.log(`   - Email: ${userRecord.email}`);
      console.log(`   - Display Name: ${userRecord.displayName}`);
      
      // Vérifier les claims actuels
      const customClaims = userRecord.customClaims || {};
      console.log("🔍 Claims actuels:", customClaims);
      
    } catch (error) {
      console.log("❌ Utilisateur non trouvé par UID, recherche par email...");
      
      // Rechercher par email
      try {
        const userRecord = await admin.auth().getUserByEmail('healthe.service@gmail.com');
        console.log("✅ Utilisateur trouvé par email:", userRecord.uid);
        adminUid = userRecord.uid;
      } catch (emailError) {
        console.log("❌ Utilisateur non trouvé par email non plus");
        return;
      }
    }

    // 1. Restaurer les claims admin
    console.log("\n🔐 Restauration des claims admin...");
    await admin.auth().setCustomUserClaims(adminUid, {
      admin: true,
      type: 'admin',
      role: 'admin'
    });
    console.log("✅ Claims admin restaurés !");

    // 2. Mettre à jour l'utilisateur dans Firebase Auth
    console.log("\n📧 Mise à jour des identifiants...");
    await admin.auth().updateUser(adminUid, {
      email: 'healthe.service@gmail.com',
      password: 'healthe2025',
      displayName: 'Health-e Admin',
      emailVerified: true
    });
    console.log("✅ Identifiants mis à jour !");

    // 3. Mettre à jour le document Firestore
    console.log("\n📄 Mise à jour du document Firestore...");
    const db = admin.firestore();
    const userData = {
      id: adminUid,
      name: 'Health-e Admin',
      email: 'healthe.service@gmail.com',
      type: 'admin',
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(adminUid).set(userData, { merge: true });
    console.log("✅ Document Firestore mis à jour !");

    // 4. Vérifier que tout est bien configuré
    console.log("\n🔍 Vérification finale...");
    const finalUserRecord = await admin.auth().getUser(adminUid);
    const finalClaims = finalUserRecord.customClaims || {};
    
    console.log("📋 Utilisateur final:");
    console.log(`   - UID: ${finalUserRecord.uid}`);
    console.log(`   - Email: ${finalUserRecord.email}`);
    console.log(`   - Display Name: ${finalUserRecord.displayName}`);
    console.log(`   - Claims:`, finalClaims);

    // 5. Vérifier le document Firestore
    const finalDoc = await db.collection('users').doc(adminUid).get();
    if (finalDoc.exists) {
      const finalData = finalDoc.data();
      console.log("📄 Document Firestore final:");
      console.log(`   - Type: ${finalData.type}`);
      console.log(`   - Email: ${finalData.email}`);
      console.log(`   - Nom: ${finalData.name}`);
    }

    console.log("\n🎯 L'admin est maintenant complètement restauré !");
    console.log("   - Email: healthe.service@gmail.com");
    console.log("   - Mot de passe: healthe2025");
    console.log("   - Claims admin: ✅");
    console.log("   - Permissions: ✅");
    console.log("   - Document Firestore: ✅");

  } catch (error) {
    console.error("❌ Erreur lors de la réparation:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Exécuter
repairAdminPermissions();

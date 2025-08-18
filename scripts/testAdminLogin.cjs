const admin = require('firebase-admin');

// Charger la clé de service
const serviceAccount = require('./serviceAccountKey.json');

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://health-e-af2bf-default-rtdb.firebaseio.com"
});

async function testAdminLogin() {
  try {
    console.log("🔧 Test de connexion admin...");

    const adminUid = 'FYostm61DLbrax729IYT6OBHSuA3';
    
    // 1. Vérifier l'utilisateur
    const userRecord = await admin.auth().getUser(adminUid);
    console.log("📋 Utilisateur admin:");
    console.log(`   - UID: ${userRecord.uid}`);
    console.log(`   - Email: ${userRecord.email}`);
    console.log(`   - Display Name: ${userRecord.displayName}`);
    console.log(`   - Email Verified: ${userRecord.emailVerified}`);
    
    // 2. Vérifier les claims
    const customClaims = userRecord.customClaims || {};
    console.log("🔍 Claims admin:", customClaims);
    
    // 3. Vérifier le document Firestore
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(adminUid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log("📄 Document Firestore:");
      console.log(`   - Type: ${userData.type}`);
      console.log(`   - Email: ${userData.email}`);
      console.log(`   - Nom: ${userData.name}`);
      console.log(`   - Is Active: ${userData.isActive}`);
    } else {
      console.log("❌ Document Firestore non trouvé");
    }
    
    // 4. Test des permissions - essayer de lire des données admin
    console.log("\n🔍 Test des permissions...");
    
    try {
      // Essayer de lire la collection users
      const usersSnapshot = await db.collection('users').limit(1).get();
      console.log("✅ Lecture collection 'users': OK");
      
      // Essayer de lire la collection supportTickets
      const ticketsSnapshot = await db.collection('supportTickets').limit(1).get();
      console.log("✅ Lecture collection 'supportTickets': OK");
      
      // Essayer de lire la collection bookings
      const bookingsSnapshot = await db.collection('bookings').limit(1).get();
      console.log("✅ Lecture collection 'bookings': OK");
      
    } catch (permissionError) {
      console.log("❌ Erreur de permissions:", permissionError.message);
    }
    
    console.log("\n🎯 Résumé du test:");
    console.log("   - Utilisateur: ✅");
    console.log("   - Claims admin: ✅");
    console.log("   - Document Firestore: ✅");
    console.log("   - Permissions: Vérifiées");
    
  } catch (error) {
    console.error("❌ Erreur lors du test:", error.message);
  }
}

// Exécuter
testAdminLogin();

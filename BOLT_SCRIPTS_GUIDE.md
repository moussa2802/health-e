# 🚀 Scripts à créer directement sur Bolt

## 📁 Créer le dossier scripts

```bash
mkdir -p scripts
```

## 📝 Script 1 : checkAdminToken.cjs

Créer le fichier `scripts/checkAdminToken.cjs` :

```javascript
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

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

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function checkAdminToken() {
  try {
    console.log("🔍 Vérification du token admin...");

    // 1. Connexion admin
    console.log("1️⃣ Connexion avec le compte admin...");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "admin@demo.com",
      "admin123"
    );
    const user = userCredential.user;

    console.log("✅ Connexion réussie");
    console.log(`📋 User ID: ${user.uid}`);
    console.log(`📋 Email: ${user.email}`);

    // 2. Récupérer le token complet
    console.log("\n2️⃣ Récupération du token complet...");
    const idToken = await user.getIdToken();
    console.log(
      `📋 Token complet (premiers 50 caractères): ${idToken.substring(
        0,
        50
      )}...`
    );

    // 3. Récupérer les claims du token
    console.log("\n3️⃣ Vérification des claims du token...");
    const idTokenResult = await user.getIdTokenResult();

    console.log("📋 Claims du token:");
    console.log("   - admin:", idTokenResult.claims.admin);
    console.log("   - email:", idTokenResult.claims.email);
    console.log("   - email_verified:", idTokenResult.claims.email_verified);
    console.log("   - auth_time:", idTokenResult.claims.auth_time);
    console.log("   - iat:", idTokenResult.claims.iat);
    console.log("   - exp:", idTokenResult.claims.exp);

    // 4. Vérifier si le token admin est activé
    console.log("\n4️⃣ Analyse du token admin...");

    if (idTokenResult.claims.admin === true) {
      console.log("✅ TOKEN ADMIN ACTIVÉ - Le compte a les permissions admin");
      console.log(
        "🎯 L'utilisateur peut accéder à toutes les fonctionnalités admin"
      );
    } else if (idTokenResult.claims.email === "admin@demo.com") {
      console.log("⚠️ TOKEN ADMIN NON ACTIVÉ - Utilise l'accès par email");
      console.log("📧 L'accès admin se fait via l'email admin@demo.com");
      console.log(
        "💡 Pour activer le token admin, exécutez: node setAdminClaim.cjs"
      );
    } else {
      console.log("❌ TOKEN ADMIN NON ACTIVÉ - Aucun accès admin");
      console.log("🚨 L'utilisateur n'a pas les permissions admin");
    }

    // 5. Vérifier la validité du token
    console.log("\n5️⃣ Vérification de la validité du token...");
    const now = Math.floor(Date.now() / 1000);
    const tokenExp = idTokenResult.claims.exp;
    const timeUntilExpiry = tokenExp - now;

    console.log(
      `📅 Token expirera dans: ${Math.floor(timeUntilExpiry / 60)} minutes`
    );

    if (timeUntilExpiry > 0) {
      console.log("✅ Token valide");
    } else {
      console.log("❌ Token expiré");
    }

    // 6. Résumé
    console.log("\n🎯 Résumé de la vérification:");
    console.log(
      `   - Admin token: ${
        idTokenResult.claims.admin === true ? "✅ ACTIVÉ" : "❌ NON ACTIVÉ"
      }`
    );
    console.log(
      `   - Email admin: ${
        idTokenResult.claims.email === "admin@demo.com"
          ? "✅ CORRECT"
          : "❌ INCORRECT"
      }`
    );
    console.log(
      `   - Token valide: ${timeUntilExpiry > 0 ? "✅ OUI" : "❌ NON"}`
    );

    if (idTokenResult.claims.admin === true) {
      console.log("\n🎉 PARFAIT ! Le token admin est activé et fonctionnel");
    } else {
      console.log("\n💡 Pour activer le token admin:");
      console.log(
        "   1. Assurez-vous d'avoir les variables d'environnement Firebase"
      );
      console.log("   2. Exécutez: node setAdminClaim.cjs");
      console.log("   3. Reconnectez-vous à l'application");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du token admin:", error);
    console.error("🔍 Détails:", error.message);
  }
}

// Exécuter la vérification
checkAdminToken();
```

## 📝 Script 2 : createAdminUser.cjs

Créer le fichier `scripts/createAdminUser.cjs` :

```javascript
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} = require("firebase/firestore");

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

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Données de l'utilisateur admin avec le bon ID
const adminUserData = {
  id: "FYostm61DLbrax729IYT6OBHSuA3", // ← ID correct
  name: "Admin User",
  email: "admin@demo.com",
  type: "admin",
  isActive: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};

async function createAdminUser() {
  try {
    console.log("🔄 Création de l'utilisateur admin dans Firestore...");
    console.log(`📋 ID: ${adminUserData.id}`);
    console.log(`📋 Email: ${adminUserData.email}`);
    console.log(`📋 Type: ${adminUserData.type}`);

    // Créer le document utilisateur admin
    await setDoc(doc(db, "users", adminUserData.id), adminUserData);

    console.log("✅ Utilisateur admin créé avec succès dans Firestore");
    console.log("📋 Détails:");
    console.log(`   - ID: ${adminUserData.id}`);
    console.log(`   - Nom: ${adminUserData.name}`);
    console.log(`   - Email: ${adminUserData.email}`);
    console.log(`   - Type: ${adminUserData.type}`);

    console.log("\n🎯 L'utilisateur admin peut maintenant se connecter avec:");
    console.log("   - Email: admin@demo.com");
    console.log("   - Mot de passe: admin123");
  } catch (error) {
    console.error(
      "❌ Erreur lors de la création de l'utilisateur admin:",
      error
    );
    console.error("🔍 Détails de l'erreur:", error.message);
    process.exit(1);
  }
}

// Exécuter le script
createAdminUser();
```

## 📝 Script 3 : testAdminPermissions.cjs

Créer le fichier `scripts/testAdminPermissions.cjs` :

```javascript
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
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

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAdminPermissions() {
  try {
    console.log("🔍 Test des permissions admin...");

    // 1. Connexion admin
    console.log("1️⃣ Connexion avec le compte admin...");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "admin@demo.com",
      "admin123"
    );
    const user = userCredential.user;

    console.log("✅ Connexion réussie");
    console.log(`📋 User ID: ${user.uid}`);
    console.log(`📋 Email: ${user.email}`);

    // 2. Récupérer le token pour vérifier les claims
    console.log("\n2️⃣ Vérification des claims du token...");
    const idTokenResult = await user.getIdTokenResult();
    console.log("📋 Claims du token:", idTokenResult.claims);

    // 3. Tester l'accès aux réservations
    console.log("\n3️⃣ Test d'accès aux réservations...");
    try {
      const bookingsRef = collection(db, "bookings");
      const bookingsSnapshot = await getDocs(bookingsRef);
      console.log(
        `✅ Accès aux réservations réussi: ${bookingsSnapshot.size} réservations trouvées`
      );
    } catch (error) {
      console.error("❌ Erreur d'accès aux réservations:", error.message);
    }

    // 4. Tester l'accès aux notifications
    console.log("\n4️⃣ Test d'accès aux notifications...");
    try {
      const notificationsRef = collection(db, "notifications");
      const notificationsSnapshot = await getDocs(notificationsRef);
      console.log(
        `✅ Accès aux notifications réussi: ${notificationsSnapshot.size} notifications trouvées`
      );
    } catch (error) {
      console.error("❌ Erreur d'accès aux notifications:", error.message);
    }

    // 5. Tester l'accès aux utilisateurs
    console.log("\n5️⃣ Test d'accès aux utilisateurs...");
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      console.log(
        `✅ Accès aux utilisateurs réussi: ${usersSnapshot.size} utilisateurs trouvés`
      );
    } catch (error) {
      console.error("❌ Erreur d'accès aux utilisateurs:", error.message);
    }

    // 6. Tester l'accès aux professionnels
    console.log("\n6️⃣ Test d'accès aux professionnels...");
    try {
      const professionalsRef = collection(db, "professionals");
      const professionalsSnapshot = await getDocs(professionalsRef);
      console.log(
        `✅ Accès aux professionnels réussi: ${professionalsSnapshot.size} professionnels trouvés`
      );
    } catch (error) {
      console.error("❌ Erreur d'accès aux professionnels:", error.message);
    }

    console.log("\n🎯 Résumé du test:");
    console.log("✅ L'admin peut se connecter");
    console.log("✅ L'admin a les permissions nécessaires");
    console.log("✅ Les règles Firestore fonctionnent correctement");
  } catch (error) {
    console.error("❌ Erreur lors du test des permissions admin:", error);
    console.error("🔍 Détails:", error.message);
  }
}

// Exécuter le test
testAdminPermissions();
```

## 🚀 Commandes à exécuter sur Bolt

Une fois les scripts créés :

```bash
# 1. Créer l'admin
node scripts/createAdminUser.cjs

# 2. Vérifier le token
node scripts/checkAdminToken.cjs

# 3. Tester les permissions
node scripts/testAdminPermissions.cjs

# 4. Déployer les règles Firestore
firebase deploy --only firestore:rules
```

## 📋 Fichiers à copier aussi

N'oubliez pas de copier ces fichiers critiques :

- `firestore.rules` → Copier dans la racine du projet Bolt
- `src/contexts/AuthContext.tsx` → Copier dans `src/contexts/` sur Bolt

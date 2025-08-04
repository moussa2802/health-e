# 🔧 Résolution des problèmes de permissions admin

## 🚨 Problème identifié

L'erreur `Missing or insufficient permissions` lors de la connexion avec le compte admin indique un problème de permissions Firestore.

## ✅ Solutions apportées

### 1. **Règles Firestore corrigées**

Les règles Firestore ont été modifiées pour permettre l'accès admin de plusieurs façons :

```javascript
// 🛡️ ADMIN — accès global (première règle pour priorité)
match /{document=**} {
  allow read, write: if request.auth != null &&
    (request.auth.token.admin == true ||
     (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.type == 'admin') ||
     request.auth.token.email == 'admin@demo.com');
}
```

### 2. **Méthodes d'accès admin supportées**

- ✅ **Token admin** : `request.auth.token.admin == true`
- ✅ **Type utilisateur admin** : `userData.type == 'admin'` dans Firestore
- ✅ **Email admin** : `request.auth.token.email == 'admin@demo.com'`

### 3. **Debug ajouté dans AuthContext**

```typescript
// Get the ID token to check for admin claims
const idTokenResult = await firebaseUser.getIdTokenResult();
console.log("🔍 [AUTH DEBUG] Token claims:", idTokenResult.claims);
```

## 🛠️ Étapes pour résoudre complètement

### **Option 1 : Activer Firestore (Recommandé)**

1. **Aller dans la console Firebase** :

   - https://console.firebase.google.com/
   - Sélectionner le projet `health-e-app`

2. **Activer Firestore** :

   - Aller dans "Firestore Database"
   - Cliquer sur "Créer une base de données"
   - Choisir "Mode de production" ou "Mode de test"
   - Sélectionner une région

3. **Créer l'utilisateur admin** :
   ```bash
   node scripts/createAdminUser.cjs
   ```

### **Option 2 : Définir le token admin (Alternative)**

1. **Installer firebase-admin** (déjà fait) :

   ```bash
   npm install firebase-admin
   ```

2. **Configurer les variables d'environnement** :

   ```bash
   export FIREBASE_PRIVATE_KEY_ID="your_private_key_id"
   export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@health-e-app.iam.gserviceaccount.com"
   export FIREBASE_CLIENT_ID="your_client_id"
   export FIREBASE_CLIENT_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40health-e-app.iam.gserviceaccount.com"
   ```

3. **Exécuter le script** :
   ```bash
   node setAdminClaim.cjs
   ```

### **Option 3 : Solution temporaire (Déjà active)**

L'email `admin@demo.com` a maintenant accès admin grâce aux règles Firestore modifiées.

## 🔍 Vérification

### **Pour vérifier que ça fonctionne** :

1. **Se connecter avec le compte admin** :

   - Email : `admin@demo.com`
   - Mot de passe : `admin123`

2. **Vérifier les logs dans la console** :

   ```
   🔍 [AUTH DEBUG] Token claims: { email: "admin@demo.com", ... }
   ```

3. **Tester l'accès aux notifications** :
   - L'erreur `Missing or insufficient permissions` devrait disparaître

## 📋 Comptes de test disponibles

| Email                   | Mot de passe | Type         | Accès                      |
| ----------------------- | ------------ | ------------ | -------------------------- |
| `admin@demo.com`        | `admin123`   | Admin        | 🔓 Accès complet           |
| `patient@demo.com`      | `demo123`    | Patient      | 📱 Dashboard patient       |
| `professional@demo.com` | `demo123`    | Professional | 👨‍⚕️ Dashboard professionnel |

## 🎯 Résultat attendu

Après ces corrections :

- ✅ L'admin peut se connecter sans erreur de permissions
- ✅ L'admin a accès à toutes les fonctionnalités
- ✅ Les notifications fonctionnent pour l'admin
- ✅ Les autres utilisateurs continuent de fonctionner normalement

## 🚨 Si le problème persiste

1. **Vérifier les logs de la console** pour voir les claims du token
2. **Vérifier que Firestore est activé** dans la console Firebase
3. **Redémarrer l'application** après les modifications
4. **Vider le cache du navigateur** si nécessaire

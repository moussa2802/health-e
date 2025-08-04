# 🔍 Comment vérifier si le token admin est activé

## 🛠️ Méthode 1 : Script de vérification

### **Exécuter le script de vérification :**

```bash
node scripts/checkAdminToken.cjs
```

### **Résultat attendu :**

```
🔍 Vérification du token admin...
1️⃣ Connexion avec le compte admin...
✅ Connexion réussie
📋 User ID: FYostm61DLbrax729IYT6OBHSuA3
📋 Email: admin@demo.com

3️⃣ Vérification des claims du token...
📋 Claims du token:
   - admin: true  ← ✅ SI ACTIVÉ
   - email: admin@demo.com
   - email_verified: true

4️⃣ Analyse du token admin...
✅ TOKEN ADMIN ACTIVÉ - Le compte a les permissions admin
```

## 🌐 Méthode 2 : Vérification dans le navigateur

### **1. Ouvrir la console du navigateur (F12)**

### **2. Se connecter avec le compte admin**

- Email : `admin@demo.com`
- Mot de passe : `admin123`

### **3. Exécuter ce code dans la console :**

```javascript
// Vérifier les claims du token admin
import { getAuth } from "firebase/auth";

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  user.getIdTokenResult().then((idTokenResult) => {
    console.log("🔍 Claims du token admin:");
    console.log("admin:", idTokenResult.claims.admin);
    console.log("email:", idTokenResult.claims.email);
    console.log("email_verified:", idTokenResult.claims.email_verified);

    if (idTokenResult.claims.admin === true) {
      console.log("✅ TOKEN ADMIN ACTIVÉ");
    } else {
      console.log("❌ TOKEN ADMIN NON ACTIVÉ");
    }
  });
} else {
  console.log("❌ Aucun utilisateur connecté");
}
```

## 📱 Méthode 3 : Vérification dans l'application

### **1. Se connecter en tant qu'admin**

### **2. Vérifier les logs dans la console :**

Vous devriez voir :

```
🔍 [AUTH DEBUG] Token claims: { admin: true, email: "admin@demo.com", ... }
```

### **3. Vérifier l'accès aux fonctionnalités admin :**

- ✅ Accès au dashboard admin
- ✅ Accès aux réservations
- ✅ Accès aux notifications
- ✅ Accès aux utilisateurs

## 🚨 Si le token admin n'est pas activé

### **Problème :**

```
❌ TOKEN ADMIN NON ACTIVÉ
📋 Claims du token:
   - admin: undefined
   - email: admin@demo.com
```

### **Solution :**

#### **1. Vérifier les variables d'environnement :**

```bash
# Vérifier que ces variables sont définies
echo $FIREBASE_PRIVATE_KEY_ID
echo $FIREBASE_PRIVATE_KEY
echo $FIREBASE_CLIENT_EMAIL
echo $FIREBASE_CLIENT_ID
echo $FIREBASE_CLIENT_CERT_URL
```

#### **2. Activer le token admin :**

```bash
# Exécuter le script pour activer le token admin
node setAdminClaim.cjs
```

#### **3. Se reconnecter :**

- Se déconnecter de l'application
- Se reconnecter avec `admin@demo.com` / `admin123`

## 🔧 Méthode 4 : Vérification complète

### **Script de test complet :**

```bash
# 1. Vérifier le token
node scripts/checkAdminToken.cjs

# 2. Tester les permissions
node scripts/testAdminPermissions.cjs

# 3. Créer l'utilisateur admin si nécessaire
node scripts/createAdminUser.cjs
```

## 📋 Résumé des vérifications

| Vérification       | Méthode                    | Résultat attendu                |
| ------------------ | -------------------------- | ------------------------------- |
| **Token admin**    | `checkAdminToken.cjs`      | `admin: true`                   |
| **Permissions**    | `testAdminPermissions.cjs` | Accès aux collections           |
| **Document admin** | `createAdminUser.cjs`      | Utilisateur créé dans Firestore |
| **Interface**      | Navigateur                 | Dashboard admin accessible      |

## 🎯 États possibles du token admin

### **✅ Token admin activé :**

```
📋 Claims du token:
   - admin: true
   - email: admin@demo.com
   - email_verified: true
```

### **⚠️ Token admin non activé (accès par email) :**

```
📋 Claims du token:
   - admin: undefined
   - email: admin@demo.com
   - email_verified: true
```

### **❌ Aucun accès admin :**

```
📋 Claims du token:
   - admin: undefined
   - email: user@example.com
   - email_verified: true
```

## 🚀 Activation du token admin

Si le token admin n'est pas activé :

1. **Configurer les variables d'environnement Firebase**
2. **Exécuter** `node setAdminClaim.cjs`
3. **Se reconnecter** à l'application
4. **Vérifier** avec `node scripts/checkAdminToken.cjs`

Le token admin est maintenant vérifié et activé ! 🎉

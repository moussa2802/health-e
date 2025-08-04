# 🔧 Solution complète pour le problème admin sur Bolt

## 🚨 Problème identifié par Bolt

**Analyse de Bolt :**

- ❌ User ID used in query: `demo-admin-1` (mauvais ID)
- ❌ Document admin manquant dans Firestore
- ❌ Règles Firestore qui ne fonctionnent pas
- ❌ Les 3 conditions dans les règles échouent

## ✅ Solution complète

### **1. Correction de l'ID admin**

**Problème :** L'ID dans le code était `demo-admin-1` au lieu de `FYostm61DLbrax729IYT6OBHSuA3`

**Solution :** ✅ **CORRIGÉ** dans `src/contexts/AuthContext.tsx`

```typescript
"admin@demo.com": {
  id: "FYostm61DLbrax729IYT6OBHSuA3", // ← ID correct
  name: "Admin User",
  email: "admin@demo.com",
  type: "admin",
},
```

### **2. Création du document admin dans Firestore**

**Script :** `scripts/createAdminUser.cjs` (mis à jour avec le bon ID)

```bash
# Exécuter sur Bolt
node scripts/createAdminUser.cjs
```

### **3. Règles Firestore améliorées**

**Fichier :** `firestore.rules` (déjà corrigé)

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

## 🛠️ Étapes de déploiement sur Bolt

### **Étape 1 : Copier les fichiers corrigés**

```bash
# Fichiers critiques à copier
cp src/contexts/AuthContext.tsx /chemin/vers/bolt/src/contexts/
cp firestore.rules /chemin/vers/bolt/
cp scripts/createAdminUser.cjs /chemin/vers/bolt/scripts/
cp setAdminClaim.cjs /chemin/vers/bolt/
```

### **Étape 2 : Créer le document admin**

```bash
# Dans le projet Bolt
node scripts/createAdminUser.cjs
```

### **Étape 3 : Déployer les règles Firestore**

```bash
# Déployer les nouvelles règles
firebase deploy --only firestore:rules
```

### **Étape 4 : Optionnel - Définir le token admin**

```bash
# Si vous avez les variables d'environnement Firebase
node setAdminClaim.cjs
```

## 🔍 Vérification

### **1. Tester la connexion admin**

- Email : `admin@demo.com`
- Mot de passe : `admin123`

### **2. Vérifier les logs**

Dans la console, vous devriez voir :

```
🔍 [AUTH DEBUG] Token claims: { email: "admin@demo.com", ... }
✅ Utilisateur admin créé avec succès dans Firestore
```

### **3. Vérifier que l'erreur disparaît**

- ❌ Plus d'erreur `Missing or insufficient permissions`
- ✅ Accès aux notifications
- ✅ Accès aux dashboards admin

## 📋 Fichiers à copier sur Bolt

| Fichier                        | Statut           | Description               |
| ------------------------------ | ---------------- | ------------------------- |
| `src/contexts/AuthContext.tsx` | 🔴 **CRITIQUE**  | ID admin corrigé          |
| `firestore.rules`              | 🔴 **CRITIQUE**  | Règles avec accès admin   |
| `scripts/createAdminUser.cjs`  | 🟡 **IMPORTANT** | Script pour créer l'admin |
| `setAdminClaim.cjs`            | 🟢 **OPTIONNEL** | Script pour token admin   |

## 🎯 Résultat attendu

Après ces corrections :

- ✅ L'ID admin est correct : `FYostm61DLbrax729IYT6OBHSuA3`
- ✅ Le document admin existe dans Firestore
- ✅ Les règles Firestore permettent l'accès admin
- ✅ L'admin peut se connecter sans erreur
- ✅ Toutes les fonctionnalités admin fonctionnent

## 🚨 Si le problème persiste

1. **Vérifier que Firestore est activé** sur Bolt
2. **Vérifier les logs** pour voir les claims du token
3. **Redémarrer l'application** après les modifications
4. **Vider le cache du navigateur** si nécessaire

La solution est maintenant complète et prête pour le déploiement sur Bolt ! 🚀

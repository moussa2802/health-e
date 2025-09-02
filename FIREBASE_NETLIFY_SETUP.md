# 🔥 Configuration Firebase pour Netlify Functions

## 🚨 **Problème Actuel :**

L'IPN PayTech fonctionne mais ne peut pas créer les bookings car Firebase n'est pas configuré dans Netlify.

**Erreur :** `Unable to detect a Project Id`

## 🛠️ **Solution : Configurer Firebase dans Netlify**

### **Étape 1 : Obtenir le fichier de compte de service Firebase**

1. **Allez sur [Firebase Console](https://console.firebase.google.com/)**
2. **Sélectionnez votre projet** `health-e-xxxxx`
3. **Paramètres du projet** ⚙️ → **Comptes de service**
4. **Cliquez sur "Générer une nouvelle clé privée"**
5. **Téléchargez le fichier JSON**

### **Étape 2 : Configurer les variables d'environnement Netlify**

#### **Option A : Via Netlify CLI (Recommandé)**

```bash
# Installer Netlify CLI si pas déjà fait
npm install -g netlify-cli

# Se connecter à Netlify
netlify login

# Configurer la variable Firebase
npx netlify env:set FIREBASE_SERVICE_ACCOUNT "$(cat path/to/firebase-service-account.json)"
```

#### **Option B : Via Dashboard Netlify**

1. **Allez sur [Netlify Dashboard](https://app.netlify.com/)**
2. **Sélectionnez votre site** `health-e`
3. **Site settings** → **Environment variables**
4. **Ajoutez une nouvelle variable :**
   - **Key :** `FIREBASE_SERVICE_ACCOUNT`
   - **Value :** **Copiez tout le contenu** du fichier JSON téléchargé
   - **Scope :** **Functions** (important !)

### **Étape 3 : Vérifier la configuration**

```bash
# Lister les variables d'environnement
npx netlify env:list

# Vérifier que FIREBASE_SERVICE_ACCOUNT n'est plus vide
```

### **Étape 4 : Redéployer**

```bash
# Redéployer pour appliquer les changements
npx netlify deploy --prod --dir=dist
```

## 🔍 **Structure attendue de FIREBASE_SERVICE_ACCOUNT :**

```json
{
  "type": "service_account",
  "project_id": "health-e-xxxxx",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@health-e-xxxxx.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## ✅ **Résultat Attendu :**

**Avant (❌) :**

```
❌ [PAYTECH IPN] Error creating booking: Error: Unable to detect a Project Id
```

**Après (✅) :**

```
✅ [PAYTECH IPN] Firebase initialized with service account
✅ [PAYTECH IPN] Creating confirmed booking: temp_xxxxx
✅ [PAYTECH IPN] Booking created successfully
```

## 🚀 **Test :**

1. **Configurez Firebase** (étapes 1-3)
2. **Redéployez** (étape 4)
3. **Testez un paiement** PayTech
4. **Vérifiez les logs** : `npx netlify logs:function paytech-ipn`

## 🔧 **Dépannage :**

### **Si l'erreur persiste :**

- **Vérifiez** que `FIREBASE_SERVICE_ACCOUNT` n'est pas vide
- **Vérifiez** que le scope est bien **Functions**
- **Vérifiez** que le JSON est complet et valide

### **Si vous avez d'autres erreurs :**

- **Vérifiez** que le projet Firebase est actif
- **Vérifiez** que le compte de service a les bonnes permissions

---

**💡 Conseil :** Utilisez l'option A (CLI) car elle évite les problèmes de copier-coller du JSON dans l'interface web.

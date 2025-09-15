# Configuration Firebase pour l'authentification par téléphone

## ⚠️ Configuration obligatoire dans Firebase Console

### 1. Activer l'authentification anonyme

**Console Firebase → Authentication → Méthodes de connexion → Anonyme → Activer**

Cette étape est **obligatoire** car le code utilise `signInAnonymously()` pour vérifier l'existence des utilisateurs dans Firestore avant l'envoi de SMS.

### 2. Configurer les domaines autorisés

**Console Firebase → Authentication → Paramètres → Domaines autorisés**

Ajouter tous les domaines utilisés :

- `localhost` (développement local)
- `127.0.0.1` (développement local)
- Votre domaine de production (ex: `votre-app.netlify.app`)

### 3. Activer l'authentification par téléphone

**Console Firebase → Authentication → Méthodes de connexion → Téléphone → Activer**

### 4. Configuration reCAPTCHA (optionnel)

Si vous voulez utiliser reCAPTCHA Enterprise :

- **Console Firebase → Authentication → Paramètres → reCAPTCHA Enterprise**
- Configurer selon vos besoins

Sinon, le reCAPTCHA v2 par défaut fonctionne parfaitement.

### 5. App Check (optionnel en développement)

Si App Check est activé avec enforcement pour Authentication :

**Option A - Désactiver temporairement :**

- **Console Firebase → App Check → Paramètres**
- Désactiver l'enforcement pour Authentication

**Option B - Mode debug (recommandé pour le développement) :**

- Ajouter dans `src/main.tsx` avant `initializeApp` :

```typescript
// @ts-ignore
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // DEV uniquement
```

- Puis initialiser App Check :

```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("VOTRE_SITE_KEY_RECAPTCHA_V3"),
  isTokenAutoRefreshEnabled: true,
});
```

## 🔧 Code déjà configuré

Le code est déjà configuré pour :

- ✅ Authentification anonyme avant les requêtes Firestore
- ✅ SDK Web Firebase (pas d'appels REST)
- ✅ reCAPTCHA invisible
- ✅ Gestion des erreurs appropriée

## 🚀 Test du flux

1. **Utilisateur existant** : Numéro → Vérification Firestore → SMS login → Connexion
2. **Nouvel utilisateur** : Numéro → Vérification Firestore → Collecte nom/genre → SMS register → Création compte → Connexion

## ❌ Erreurs courantes

- `auth/admin-restricted-operation` → Authentification anonyme non activée
- `Missing or insufficient permissions` → Règles Firestore + auth anonyme
- `auth/invalid-app-credential` → Domaines autorisés ou App Check
- `Failed to verify with reCAPTCHA` → Configuration reCAPTCHA

## 📝 Règles Firestore recommandées

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permettre la lecture si l'utilisateur est authentifié (anonyme ou normal)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

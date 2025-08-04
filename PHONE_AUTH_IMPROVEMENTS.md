# 🔧 Améliorations pour l'authentification par téléphone

## 🚨 Problème identifié

L'erreur `auth/too-many-requests` indique que Firebase a détecté trop de tentatives d'envoi de SMS dans un court laps de temps.

## ✅ Améliorations apportées

### 1. **Gestion spécifique des erreurs Firebase**

- `auth/too-many-requests` → Cooldown de 5 minutes
- `auth/invalid-phone-number` → Message d'erreur clair
- `auth/quota-exceeded` → Message informatif
- `auth/network-request-failed` → Suggestion de vérifier la connexion

### 2. **Système de cooldown amélioré**

- Cooldown par défaut : 60 secondes
- Cooldown pour rate limiting : 5 minutes (300 secondes)
- Affichage du temps restant en format MM:SS
- Protection contre les clics multiples pendant le cooldown

### 3. **Réinitialisation automatique du reCAPTCHA**

- Réinitialisation automatique en cas d'erreur `too-many-requests`
- Fonction `resetRecaptcha()` disponible dans le hook
- Évite les problèmes de reCAPTCHA expiré

### 4. **Composant RateLimitMessage**

- Affichage visuel des erreurs de rate limiting
- Compteur de temps restant
- Bouton de retry quand disponible
- Messages d'erreur contextuels

## 🛠️ Utilisation dans les composants

### Dans PatientAccess.tsx et ProfessionalAccess.tsx :

```typescript
import RateLimitMessage from "../../components/ui/RateLimitMessage";

// Dans le composant
const {
  sendVerificationCodeForLogin,
  cooldownTime,
  isInCooldown,
  error,
  resetRecaptcha,
} = usePhoneAuth();

// Dans le JSX
{
  error && error.includes("Trop de tentatives") && (
    <RateLimitMessage
      cooldownTime={cooldownTime}
      isInCooldown={isInCooldown}
      onRetry={resetRecaptcha}
      errorType="too-many-requests"
    />
  );
}
```

## 📋 Bonnes pratiques pour éviter les erreurs

### 1. **Côté utilisateur**

- Attendre le cooldown avant de réessayer
- Vérifier le format du numéro de téléphone
- S'assurer d'une connexion internet stable
- Ne pas cliquer plusieurs fois sur le bouton d'envoi

### 2. **Côté développeur**

- Implémenter le composant `RateLimitMessage`
- Utiliser la fonction `resetRecaptcha()` en cas d'erreur
- Afficher clairement le temps d'attente restant
- Désactiver les boutons pendant le cooldown

### 3. **Configuration Firebase**

- Vérifier les quotas SMS dans la console Firebase
- Configurer les limites de rate limiting si nécessaire
- Surveiller les métriques d'utilisation

## 🔄 Fonctions disponibles dans usePhoneAuth

```typescript
const {
  sendVerificationCodeForLogin, // Envoyer code pour connexion
  sendVerificationCodeForRegister, // Envoyer code pour inscription
  verifyLoginCode, // Vérifier code de connexion
  verifyRegisterCode, // Vérifier code d'inscription
  cooldownTime, // Temps restant (secondes)
  isInCooldown, // Si en cooldown
  loading, // Si en cours de chargement
  error, // Message d'erreur
  resetRecaptcha, // Réinitialiser reCAPTCHA
} = usePhoneAuth();
```

## 🎯 Résultat attendu

Avec ces améliorations :

- ✅ Meilleure gestion des erreurs de rate limiting
- ✅ Messages d'erreur plus clairs pour l'utilisateur
- ✅ Protection contre les abus
- ✅ Expérience utilisateur améliorée
- ✅ Réduction des erreurs `auth/too-many-requests`

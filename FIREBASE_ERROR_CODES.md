# 🔐 Codes d'Erreur Firebase Auth - Messages Personnalisés

## Vue d'ensemble
Ce document liste tous les codes d'erreur Firebase Auth gérés dans l'application Health-e et les messages d'erreur personnalisés affichés aux utilisateurs.

## 🎯 Objectif
Améliorer l'expérience utilisateur en fournissant des messages d'erreur clairs et spécifiques au lieu du message générique "Identifiants incorrects".

## 📋 Codes d'Erreur Gérés

### 1. **Email Inexistant**
- **Code Firebase :** `auth/user-not-found`
- **Message affiché :** "Aucun compte trouvé avec cet email. Vérifiez votre adresse email ou créez un compte."
- **Action utilisateur :** Vérifier l'email ou créer un compte

### 2. **Mot de Passe Incorrect**
- **Code Firebase :** `auth/wrong-password`
- **Message affiché :** "Mot de passe incorrect. Vérifiez votre mot de passe."
- **Action utilisateur :** Vérifier le mot de passe

### 3. **Compte Désactivé**
- **Code Firebase :** `auth/user-disabled`
- **Message affiché :** "Ce compte a été désactivé. Contactez le support."
- **Action utilisateur :** Contacter le support

### 4. **Trop de Tentatives**
- **Code Firebase :** `auth/too-many-requests`
- **Message affiché :** "Trop de tentatives de connexion. Réessayez plus tard."
- **Action utilisateur :** Attendre et réessayer

### 5. **Format d'Email Invalide**
- **Code Firebase :** `auth/invalid-email`
- **Message affiché :** "Format d'email invalide. Vérifiez votre adresse email."
- **Action utilisateur :** Corriger le format de l'email

### 6. **Identifiants Invalides (Générique)**
- **Code Firebase :** `auth/invalid-credential`
- **Message affiché :** "Email ou mot de passe incorrect. Vérifiez vos identifiants."
- **Action utilisateur :** Vérifier email et mot de passe

## 🔧 Implémentation

### Fichier modifié
- `src/contexts/AuthContext.tsx` - Fonction `login`

### Logique
```typescript
// Check if this is a Firebase Auth error with specific error codes
if (authError && typeof authError === 'object' && 'code' in authError) {
  const errorCode = (authError as any).code;
  
  switch (errorCode) {
    case 'auth/user-not-found':
      throw new Error("Aucun compte trouvé avec cet email...");
    case 'auth/wrong-password':
      throw new Error("Mot de passe incorrect...");
    // ... autres cas
  }
}
```

## 🚀 Avantages

1. **Expérience utilisateur améliorée** : Messages clairs et actionnables
2. **Réduction des appels support** : L'utilisateur sait quoi faire
3. **Sécurité maintenue** : Pas d'exposition d'informations sensibles
4. **Cohérence** : Messages uniformes dans toute l'application

## 🔍 Codes d'Erreur Non Gérés

Les codes d'erreur non explicitement gérés tombent dans le cas `default` et utilisent la logique de fallback (comptes de démonstration en développement).

## 📝 Maintenance

### Ajouter un nouveau code d'erreur
1. Identifier le code Firebase dans la documentation officielle
2. Ajouter un nouveau `case` dans le `switch`
3. Rédiger un message clair et actionnable
4. Tester avec le code d'erreur spécifique

### Modifier un message existant
1. Mettre à jour le message dans le `case` correspondant
2. Vérifier la cohérence avec les autres messages
3. Tester l'affichage

## 🌐 Internationalisation

Les messages sont actuellement en français. Pour l'internationalisation future :
1. Extraire les messages dans des fichiers de traduction
2. Utiliser le contexte de langue existant
3. Adapter les messages selon la culture locale

---

*Dernière mise à jour : $(date)*

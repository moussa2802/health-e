# Configuration PayDunya IPN

## 🚀 Déploiement

### Option 1: Netlify Functions (Recommandé - Déjà configuré)

Votre projet utilise déjà Netlify ! L'endpoint PayDunya est maintenant configuré comme une Netlify Function.

**URL IPN à configurer dans PayDunya :**

```
https://your-app-name.netlify.app/.netlify/functions/paydunya-ipn
```

**URL de test :**

```
https://your-app-name.netlify.app/.netlify/functions/paydunya-ipn-test
```

### Option 2: Railway

1. **Créer un compte sur Railway.app**
2. **Connecter votre repository GitHub**
3. **Configurer les variables d'environnement dans le dashboard Railway**

### Option 3: Render

1. **Créer un compte sur Render.com**
2. **Créer un nouveau Web Service**
3. **Connecter votre repository GitHub**
4. **Configurer les variables d'environnement**

## 🔧 Configuration

### Variables d'environnement requises :

```bash
# PayDunya Master Key (obtenu depuis le dashboard PayDunya)
PAYDUNYA_MASTER_KEY=your_master_key_here

# Firebase Service Account (optionnel pour le développement)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

## 📋 URL IPN à configurer dans PayDunya

Une fois déployé sur Netlify, utilisez cette URL dans le dashboard PayDunya :

```
https://your-app-name.netlify.app/.netlify/functions/paydunya-ipn
```

## 🧪 Test de l'endpoint

Pour tester que l'endpoint fonctionne :

```
GET https://your-app-name.netlify.app/.netlify/functions/paydunya-ipn-test
```

## 📊 Données enregistrées

L'endpoint enregistre les données suivantes dans Firestore :

### Collection `payments`

- `token` : Token PayDunya
- `status` : Statut du paiement
- `transactionId` : ID de transaction
- `amount` : Montant
- `currency` : Devise (XOF par défaut)
- `customerName` : Nom du client
- `customerPhone` : Téléphone du client
- `customerEmail` : Email du client
- `paymentMethod` : Méthode de paiement
- `bookingId` : ID de la réservation
- `professionalId` : ID du professionnel
- `patientId` : ID du patient
- `timestamp` : Timestamp du paiement
- `receivedAt` : Timestamp de réception
- `rawData` : Données brutes reçues

### Mise à jour automatique

Si le statut est "COMPLETED" :

- Met à jour le statut de paiement de la réservation
- Envoie une notification au professionnel

## 🔒 Sécurité

- Vérification du token PayDunya
- Validation de la méthode HTTP (POST uniquement)
- Logs détaillés pour le débogage
- Gestion d'erreur robuste

## 📝 Logs

L'endpoint génère des logs détaillés :

- Réception de notification
- Extraction des données
- Sauvegarde dans Firestore
- Mise à jour des réservations
- Envoi de notifications

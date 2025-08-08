# 🏦 Intégration PayTech - Documentation Complète

## 📋 Vue d'ensemble

Cette documentation décrit l'implémentation complète de PayTech dans l'application Health-e, remplaçant l'ancienne intégration PayDunya.

## 🏗️ Architecture

### Backend (Firebase Functions)
- `paytech-initiate-payment.js` : Initie les paiements
- `paytech-ipn.js` : Gère les webhooks de notification

### Frontend (React)
- `paytechService.ts` : Service pour les appels API
- `PayTechPaymentForm.tsx` : Composant UI pour les paiements

## 🔧 Configuration

### 1. Variables d'environnement

#### Firebase Functions (Backend)
```bash
PAYTECH_API_URL=https://paytech.sn/api
PAYTECH_MERCHANT_ID=votre_merchant_id
PAYTECH_MERCHANT_KEY=votre_merchant_key
PAYTECH_ENV=test  # ou 'prod' pour la production
FRONTEND_URL=https://health-e.sn
BACKEND_URL=https://votre-region-votre-projet.cloudfunctions.net
```

#### Frontend (Netlify)
```bash
REACT_APP_PAYTECH_ENV=test
REACT_APP_FRONTEND_URL=https://health-e.sn
```

### 2. Installation des dépendances

#### Backend (Firebase Functions)
```bash
cd netlify/functions
npm install node-fetch firebase-functions firebase-admin
```

## 🚀 Déploiement

### 1. Déployer les fonctions Firebase
```bash
firebase deploy --only functions:initiatePayment,functions:paytechIpn
```

### 2. Configurer les webhooks PayTech
- URL IPN : `https://votre-region-votre-projet.cloudfunctions.net/paytechIpn`
- URL de succès : `https://health-e.sn/appointment-success/{bookingId}`
- URL d'annulation : `https://health-e.sn/book/{professionalId}`

## 📱 Utilisation

### 1. Intégration dans BookAppointment.tsx

```typescript
import PayTechPaymentForm from '../../components/payment/PayTechPaymentForm';

// Dans le composant
const handlePayment = () => {
  return (
    <PayTechPaymentForm
      bookingId={bookingId}
      amount={professional.price}
      professionalId={professional.id}
      professionalName={professional.name}
      onSuccess={() => {
        // Gérer le succès
      }}
      onError={(error) => {
        // Gérer l'erreur
      }}
    />
  );
};
```

### 2. Service PayTech

```typescript
import paytechService from '../../services/paytechService';

// Initier un paiement
const paymentData = {
  amount: 20000, // 20000 centimes = 200 XOF
  bookingId: 'booking_123',
  customerEmail: 'patient@example.com',
  customerPhone: '770000000',
  customerName: 'John Doe',
  professionalId: 'prof_123',
  professionalName: 'Dr. Smith'
};

const response = await paytechService.initiatePayment(paymentData);
```

## 🔒 Sécurité

### 1. Validation des données
- Toutes les données sont validées côté client et serveur
- Les montants sont formatés en centimes
- Vérification de l'authentification utilisateur

### 2. Gestion des erreurs
- Logs détaillés pour le debugging
- Messages d'erreur utilisateur-friendly
- Fallback en cas d'échec

### 3. Webhooks sécurisés
- Validation des données reçues
- Mise à jour atomique des statuts
- Logs de tous les événements

## 📊 Monitoring

### 1. Logs Firebase
```bash
firebase functions:log --only initiatePayment,paytechIpn
```

### 2. Collection Firestore
- `payment_logs` : Tous les événements de paiement
- `bookings` : Statuts mis à jour automatiquement
- `notifications` : Notifications envoyées aux utilisateurs

## 🐛 Debugging

### 1. Erreurs courantes

#### "Utilisateur non authentifié"
- Vérifier que l'utilisateur est connecté
- Vérifier la configuration Firebase Auth

#### "Données manquantes"
- Vérifier que tous les champs requis sont remplis
- Vérifier le format des données

#### "Erreur API PayTech"
- Vérifier les clés API dans les variables d'environnement
- Vérifier la configuration PayTech (test/prod)

### 2. Tests

#### Test de paiement
```bash
# Créer un booking de test
# Utiliser les données de test PayTech
# Vérifier les logs Firebase
```

## 🔄 Migration depuis PayDunya

### 1. Supprimer l'ancien code
- Supprimer `paydunyaService.ts`
- Supprimer les fonctions PayDunya
- Nettoyer les variables d'environnement

### 2. Mettre à jour les composants
- Remplacer `PayDunyaPaymentForm` par `PayTechPaymentForm`
- Mettre à jour les imports
- Tester les nouveaux flux

## 📈 Métriques

### 1. Suivi des paiements
- Taux de conversion
- Taux d'échec
- Temps de traitement

### 2. Alertes
- Échecs de paiement > 5%
- Temps de réponse > 10s
- Erreurs webhook

## 🆘 Support

### 1. Documentation PayTech
- [Documentation officielle](https://doc.intech.sn/doc_paytech.php)
- [Collection Postman](https://doc.intech.sn/PayTech%20x%20DOC.postman_collection.json)

### 2. Contact
- Support PayTech : support@paytech.sn
- Logs Firebase pour debugging

---

**Note** : Cette implémentation est basée exclusivement sur la documentation officielle PayTech. Pour toute question spécifique à l'API PayTech, consultez leur documentation officielle.

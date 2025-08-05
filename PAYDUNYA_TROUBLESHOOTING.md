# 🔧 Dépannage PayDunya - Page de connexion au lieu de paiement

## 🚨 Problème identifié

PayDunya redirige vers une page de connexion au lieu de la page de paiement classique avec les moyens de paiement (Wave, Orange Money, etc.).

## 🔍 Causes possibles et solutions

### **1. Headers PayDunya incorrects**

**Problème :** Les headers ne sont pas reconnus par PayDunya
**Solution :** Vérifiez que tous les headers sont présents et corrects

```javascript
const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "PAYDUNYA-PUBLIC-KEY": "votre_cle_publique",
  "PAYDUNYA-PRIVATE-KEY": "votre_cle_privee", 
  "PAYDUNYA-MASTER-KEY": "votre_cle_master",
  "PAYDUNYA-TOKEN": "votre_token",
  "PAYDUNYA-MODE": "live",
  "User-Agent": "Health-e/1.0"
};
```

### **2. Structure des données incorrecte**

**Problème :** PayDunya ne reconnaît pas la structure des données
**Solution :** Utilisez la structure exacte attendue

```javascript
const invoiceData = {
  invoice: {
    items: [{
      name: "Consultation Vidéo",
      quantity: 1,
      unit_price: 100,
      total_price: 100,
      description: "Consultation médicale"
    }],
    total_amount: 100,
    description: "Consultation médicale",
    currency: "XOF"
  },
  store: {
    name: "Health-e",
    website_url: "https://health-e.sn",
    tagline: "Plateforme de santé en ligne"
  },
  actions: {
    callback_url: "https://health-e.sn/callback",
    cancel_url: "https://health-e.sn/cancel", 
    return_url: "https://health-e.sn/return"
  },
  custom_data: {
    invoice_number: "INV-123",
    customer_name: "Patient",
    customer_email: "patient@example.com",
    customer_phone: "770000000"
  }
};
```

### **3. Clés API de production incorrectes**

**Vérifications :**
1. **Dashboard PayDunya** : Vérifiez que vous utilisez les clés "Production" (pas "Test")
2. **Variables Netlify** : Vérifiez que `REACT_APP_PAYDUNYA_MODE=live`
3. **URLs** : Vérifiez que vous utilisez `https://app.paydunya.com/api/v1`

### **4. Configuration PayDunya manquante**

**Dans votre dashboard PayDunya :**
1. **Application activée** ✅
2. **Modes de paiement autorisés** ✅
   - Orange Money
   - Wave
   - Carte bancaire
3. **URLs de callback configurées** ✅
4. **Mode production activé** ✅

## 🔧 Solutions à tester

### **Solution 1 : Vérifier les logs**

Après déploiement, vérifiez dans la console :

```
🔍 [PAYDUNYA DEBUG] Configuration chargée:
Mode: live
Base URL: https://app.paydunya.com/api/v1
REACT_APP_PAYDUNYA_MODE: live
REACT_APP_PAYDUNYA_MASTER_KEY: ✅ Configuré
REACT_APP_PAYDUNYA_TOKEN: ✅ Configuré
```

### **Solution 2 : Tester avec des données minimales**

```javascript
const testData = {
  invoice: {
    items: [{
      name: "Test",
      quantity: 1,
      unit_price: 100,
      total_price: 100
    }],
    total_amount: 100,
    currency: "XOF"
  },
  store: {
    name: "Health-e",
    website_url: "https://health-e.sn"
  },
  actions: {
    callback_url: "https://health-e.sn/callback",
    cancel_url: "https://health-e.sn/cancel",
    return_url: "https://health-e.sn/return"
  }
};
```

### **Solution 3 : Vérifier la réponse PayDunya**

Regardez les logs pour voir :

```
🔍 [PAYDUNYA DEBUG] Response object: {...}
🔍 [PAYDUNYA DEBUG] Response code: "00"
🔍 [PAYDUNYA DEBUG] Response text: "https://app.paydunya.com/checkout/..."
```

## ⚠️ Points importants

1. **Ne jamais** utiliser les clés de test en production
2. **Toujours** vérifier que `PAYDUNYA-MODE=live`
3. **Vérifier** que l'URL de retour est accessible
4. **Tester** avec de petits montants d'abord

## 🆘 Si le problème persiste

1. **Contactez PayDunya** avec les logs d'erreur
2. **Vérifiez** que votre compte PayDunya est validé
3. **Testez** avec l'API Postman pour isoler le problème
4. **Vérifiez** que votre domaine est autorisé dans PayDunya 
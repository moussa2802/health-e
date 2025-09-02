# 🚀 Configuration PayTech en Mode Production

## 📋 Vue d'ensemble

Ce guide vous explique comment passer PayTech de **mode test** à **mode production** dans votre application Health-e.

## ⚠️ ATTENTION IMPORTANTE

**En mode production, TOUS les paiements sont RÉELS !** Assurez-vous d'avoir testé exhaustivement en mode test avant de passer en production.

## 🔧 Étapes de Configuration

### 1. 📱 Dashboard PayTech

1. **Connectez-vous** à votre [dashboard PayTech](https://paytech.sn)
2. **Passez en mode "Production"** (pas "Test")
3. **Récupérez vos nouvelles clés API** :
   - `PAYTECH_API_KEY` (clé API de production)
   - `PAYTECH_API_SECRET` (secret API de production)

### 2. 🌐 Variables d'Environnement Netlify

Dans votre dashboard Netlify, mettez à jour les variables d'environnement :

```bash
# Anciennes valeurs (mode test)
PAYTECH_ENV=test

# Nouvelles valeurs (mode production)
PAYTECH_ENV=production
PAYTECH_API_KEY=votre_clé_api_production
PAYTECH_API_SECRET=votre_secret_api_production
```

### 3. 🔄 Redéploiement

Après avoir mis à jour les variables, redéployez vos fonctions Netlify :

```bash
# Option 1: Via le dashboard Netlify
# Allez dans Functions > Trigger deploy

# Option 2: Via CLI
netlify deploy --prod --dir=dist
```

## 📁 Fichiers Modifiés

### ✅ `netlify/functions/paytech-initiate-payment.js`

- **Environnement** : `test` → `production`
- **URL API** : Reste `https://paytech.sn/api/payment/request-payment`

### ✅ `netlify/functions/paytech-ipn.js`

- **Aucune modification** nécessaire
- Fonctionne automatiquement en mode production

### ✅ `env.example`

- **PAYTECH_ENV** : `test` → `production`

## 🧪 Test de la Configuration

### 1. **Test de Paiement**

- Créez un rendez-vous de test
- Tentez un paiement avec un petit montant
- Vérifiez que la redirection PayTech fonctionne

### 2. **Vérification des Logs**

- Surveillez les logs Netlify
- Vérifiez les logs PayTech
- Confirmez que les IPN sont reçus

### 3. **Test des Callbacks**

- Testez l'URL de succès
- Testez l'URL d'annulation
- Vérifiez l'URL IPN

## 🔍 Vérification de la Configuration

### ✅ Mode Production Actif

```javascript
// Dans les logs Netlify, vous devriez voir :
🔍 [DEBUG] ENV: production
🔍 [DEBUG] API URL: https://paytech.sn/api/payment/request-payment
```

### ✅ Clés API Configurées

```javascript
🔍 [DEBUG] PAYTECH_API_KEY: ✅ OK
🔍 [DEBUG] PAYTECH_API_SECRET: ✅ OK
```

## 🚨 Dépannage

### ❌ Erreur "Invalid API Key"

- Vérifiez que vous utilisez les clés de **production**
- Confirmez que `PAYTECH_ENV=production`
- Redéployez après modification des variables

### ❌ Erreur "Environment Mismatch"

- Assurez-vous que votre dashboard PayTech est en mode production
- Vérifiez que `PAYTECH_ENV=production` dans Netlify

### ❌ IPN non reçus

- Vérifiez l'URL IPN dans votre dashboard PayTech
- Confirmez que l'URL est accessible publiquement
- Testez la fonction IPN localement

## 📱 Script de Déploiement Automatique

Utilisez le script fourni pour automatiser le déploiement :

```bash
# Rendre le script exécutable
chmod +x deploy-paytech-production.sh

# Exporter vos variables d'environnement
export PAYTECH_API_KEY='votre_clé_api_production'
export PAYTECH_API_SECRET='votre_secret_api_production'

# Exécuter le script
./deploy-paytech-production.sh
```

## 🔄 Retour en Mode Test

Si vous devez revenir en mode test :

1. **Dashboard PayTech** : Passez en mode "Test"
2. **Variables Netlify** : `PAYTECH_ENV=test`
3. **Redéployez** vos fonctions

## 📞 Support

- **PayTech Support** : [support@paytech.sn](mailto:support@paytech.sn)
- **Documentation PayTech** : [https://paytech.sn/docs](https://paytech.sn/docs)
- **Logs Netlify** : Dashboard Netlify > Functions > Logs

## 🎯 Checklist de Production

- [ ] Dashboard PayTech en mode production
- [ ] Nouvelles clés API de production récupérées
- [ ] Variables d'environnement Netlify mises à jour
- [ ] Application redéployée
- [ ] Test de paiement réussi
- [ ] IPN reçus et traités
- [ ] Callbacks de succès/annulation fonctionnels
- [ ] Logs de production surveillés

---

**🎉 Félicitations ! PayTech est maintenant en mode production !**

⚠️ **Rappel** : Tous les paiements sont maintenant réels. Surveillez attentivement vos transactions !

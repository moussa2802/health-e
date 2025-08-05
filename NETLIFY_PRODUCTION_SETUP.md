# 🚀 Configuration Production Netlify

## 📋 Étapes pour configurer PayDunya en production

### **1. Obtenir vos clés PayDunya Production**

1. **Connectez-vous** à votre [Dashboard PayDunya](https://app.paydunya.com)
2. **Allez dans** "Paramètres" > "Clés API"
3. **Sélectionnez** "Production" (pas "Test")
4. **Copiez** toutes vos clés de production

### **2. Configurer les variables dans Netlify**

#### **Étape 1 : Accéder aux variables d'environnement**
1. Allez sur [Netlify Dashboard](https://app.netlify.com)
2. Sélectionnez votre site `health-e`
3. Cliquez sur "Site settings"
4. Dans le menu de gauche, cliquez sur "Environment variables"

#### **Étape 2 : Ajouter les variables**

**Cliquez sur "Add a variable" et ajoutez une par une :**

| Variable | Valeur | Description |
|----------|---------|-------------|
| `REACT_APP_PAYDUNYA_PUBLIC_KEY` | `live_public_...` | Votre clé publique production |
| `REACT_APP_PAYDUNYA_PRIVATE_KEY` | `live_private_...` | Votre clé privée production |
| `REACT_APP_PAYDUNYA_MASTER_KEY` | `live_master_...` | Votre clé master production |
| `REACT_APP_PAYDUNYA_TOKEN` | `live_token_...` | Votre token production |
| `REACT_APP_PAYDUNYA_MODE` | `live` | Mode production |

#### **Étape 3 : Déployer**
1. Cliquez sur "Save" pour chaque variable
2. Allez dans "Deploys"
3. Cliquez sur "Trigger deploy" > "Deploy site"

### **3. Vérifier la configuration**

Après le déploiement, ouvrez la console du navigateur et vérifiez que vous voyez :

```
🔍 [PAYDUNYA CONFIG DEBUG] Configuration chargée:
Mode: live
Base URL: https://app.paydunya.com/api/v1
REACT_APP_PAYDUNYA_MODE: live
REACT_APP_PAYDUNYA_MASTER_KEY: ✅ Configuré
REACT_APP_PAYDUNYA_TOKEN: ✅ Configuré
```

### **4. Tester le paiement**

1. **Créez un booking** avec paiement
2. **Vérifiez** que PayDunya utilise le mode `live`
3. **Testez** avec un petit montant réel

## ⚠️ Important

- **Ne jamais** commiter les clés de production dans le code
- **Toujours** utiliser les variables d'environnement
- **Tester** d'abord avec de petits montants
- **Vérifier** les logs pour confirmer le mode `live`

## 🔧 Dépannage

### **Si les variables ne sont pas reconnues :**
1. Vérifiez que les noms commencent par `REACT_APP_`
2. Redéployez le site après avoir ajouté les variables
3. Videz le cache du navigateur

### **Si le mode reste en "test" :**
1. Vérifiez que `REACT_APP_PAYDUNYA_MODE=live`
2. Redéployez le site
3. Vérifiez les logs dans la console 
# 🔧 Vérification des Variables Netlify

## 🚨 Problème identifié

Les logs montrent que l'application utilise encore le mode TEST :
- `PAYDUNYA-MODE: test`
- URLs avec `sandbox-checkout`
- Clés de test au lieu de production

## 📋 Étapes pour corriger

### **1. Accéder aux variables Netlify**

1. **Allez sur** [Netlify Dashboard](https://app.netlify.com)
2. **Sélectionnez** votre site `health-e`
3. **Cliquez sur** "Site settings"
4. **Dans le menu de gauche**, cliquez sur "Environment variables"

### **2. Vérifier les variables existantes**

Recherchez ces variables et vérifiez leurs valeurs :

| Variable | Valeur attendue | Valeur actuelle |
|----------|-----------------|-----------------|
| `REACT_APP_PAYDUNYA_MODE` | `live` | `test` ❌ |
| `REACT_APP_PAYDUNYA_PUBLIC_KEY` | `live_public_...` | `test_public_...` ❌ |
| `REACT_APP_PAYDUNYA_PRIVATE_KEY` | `live_private_...` | `test_private_...` ❌ |
| `REACT_APP_PAYDUNYA_MASTER_KEY` | `live_master_...` | `gzt0lrr3...` ❌ |
| `REACT_APP_PAYDUNYA_TOKEN` | `live_token_...` | `wZTFnRBd...` ❌ |

### **3. Ajouter/Modifier les variables**

**Si les variables n'existent pas :**
1. Cliquez sur "Add a variable"
2. Ajoutez chaque variable une par une

**Si les variables existent mais sont incorrectes :**
1. Cliquez sur l'icône de modification (crayon)
2. Modifiez la valeur
3. Cliquez sur "Save"

### **4. Variables à configurer**

```bash
REACT_APP_PAYDUNYA_MODE=live
REACT_APP_PAYDUNYA_PUBLIC_KEY=votre_cle_publique_production
REACT_APP_PAYDUNYA_PRIVATE_KEY=votre_cle_privee_production
REACT_APP_PAYDUNYA_MASTER_KEY=votre_cle_master_production
REACT_APP_PAYDUNYA_TOKEN=votre_token_production
```

### **5. Redéployer après modification**

1. **Sauvegardez** toutes les variables
2. **Allez dans** "Deploys"
3. **Cliquez sur** "Trigger deploy" > "Deploy site"
4. **Attendez** 2-3 minutes

### **6. Vérifier après déploiement**

Dans la console, vous devriez voir :

```
🔍 [PAYDUNYA DEBUG] Configuration chargée:
Mode: live
Base URL: https://app.paydunya.com/api/v1
REACT_APP_PAYDUNYA_MODE: live
REACT_APP_PAYDUNYA_MASTER_KEY: ✅ Configuré
REACT_APP_PAYDUNYA_TOKEN: ✅ Configuré
```

## ⚠️ Points importants

1. **Les variables doivent commencer par `REACT_APP_`**
2. **Pas d'espaces** avant ou après les valeurs
3. **Redéployez** après chaque modification
4. **Videz le cache** du navigateur si nécessaire

## 🔍 Dépannage

### **Si les variables ne sont pas reconnues :**
1. Vérifiez que les noms commencent par `REACT_APP_`
2. Redéployez le site
3. Videz le cache du navigateur

### **Si le mode reste "test" :**
1. Vérifiez que `REACT_APP_PAYDUNYA_MODE=live`
2. Vérifiez qu'il n'y a pas d'espaces
3. Redéployez et attendez 3-5 minutes 
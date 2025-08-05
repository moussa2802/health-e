# 🔧 Configuration PayDunya Production

## 📋 Variables d'environnement à configurer dans Netlify

### **Variables obligatoires :**

```bash
# Clés PayDunya Production (remplacez par vos vraies clés)
REACT_APP_PAYDUNYA_PUBLIC_KEY=votre_cle_publique_production
REACT_APP_PAYDUNYA_PRIVATE_KEY=votre_cle_privee_production
REACT_APP_PAYDUNYA_MASTER_KEY=votre_cle_master_production
REACT_APP_PAYDUNYA_TOKEN=votre_token_production

# Mode de paiement
REACT_APP_PAYDUNYA_MODE=live
```

### **URLs de production :**
- **Base URL** : `https://app.paydunya.com/api/v1` (au lieu de sandbox)
- **IPN URL** : `https://health-e.sn/.netlify/functions/paydunya-ipn`

## 🔑 Où obtenir vos clés PayDunya Production

1. **Connectez-vous** à votre dashboard PayDunya
2. **Allez dans** "Paramètres" > "Clés API"
3. **Sélectionnez** "Production" au lieu de "Test"
4. **Copiez** vos clés de production

## ⚙️ Configuration dans Netlify

### **Étapes :**

1. **Allez sur** [Netlify Dashboard](https://app.netlify.com)
2. **Sélectionnez** votre site `health-e`
3. **Allez dans** "Site settings" > "Environment variables"
4. **Ajoutez** chaque variable ci-dessus

### **Variables à ajouter :**

| Variable | Description | Exemple |
|----------|-------------|---------|
| `REACT_APP_PAYDUNYA_PUBLIC_KEY` | Clé publique production | `live_public_...` |
| `REACT_APP_PAYDUNYA_PRIVATE_KEY` | Clé privée production | `live_private_...` |
| `REACT_APP_PAYDUNYA_MASTER_KEY` | Clé master production | `live_master_...` |
| `REACT_APP_PAYDUNYA_TOKEN` | Token production | `live_token_...` |
| `REACT_APP_PAYDUNYA_MODE` | Mode de paiement | `live` |

## 🔄 Mise à jour du code

Le code détectera automatiquement le mode `live` et utilisera :
- Les URLs de production
- Les clés de production
- Le mode de paiement réel

## ✅ Test de la configuration

Après déploiement, testez avec :
1. **Créer un booking** avec paiement
2. **Vérifier** que PayDunya utilise le mode `live`
3. **Tester** un paiement réel (petit montant)

## ⚠️ Important

- **Ne jamais** commiter les vraies clés de production
- **Toujours** utiliser les variables d'environnement
- **Tester** d'abord avec de petits montants
- **Vérifier** les logs pour confirmer le mode `live` 
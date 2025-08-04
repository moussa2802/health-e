# 🚀 Configuration Cursor + Netlify - Déploiement Automatique

## ✅ **Étapes pour connecter Cursor avec Netlify**

### **1. Créer le repository GitHub**

1. **Allez sur [GitHub.com](https://github.com)**
2. **Cliquez sur "New repository"**
3. **Nom :** `health-e`
4. **Description :** `Health-e: Plateforme de santé connectée avec PayDunya IPN`
5. **Public**
6. **Ne pas initialiser avec README**
7. **Cliquez sur "Create repository"**

### **2. Exécuter le script de configuration**

```bash
./setup-github-deploy.sh
```

### **3. Configuration Netlify**

1. **Allez sur [app.netlify.com](https://app.netlify.com)**
2. **Cliquez sur "Add new site" > "Import an existing project"**
3. **Connectez votre compte GitHub**
4. **Sélectionnez le repository `health-e`**
5. **Configuration automatique détectée**
6. **Cliquez sur "Deploy site"**

### **4. Variables d'environnement Netlify**

Dans le dashboard Netlify de votre site :

1. **Allez dans "Site settings" > "Environment variables"**
2. **Ajoutez :**
   - `PAYDUNYA_MASTER_KEY` = `votre_clé_paydunya`
   - `FIREBASE_SERVICE_ACCOUNT` = `votre_json_firebase`

### **5. URLs PayDunya**

**URL IPN à configurer dans PayDunya :**

```
https://votre-site.netlify.app/.netlify/functions/paydunya-ipn
```

**URL de test :**

```
https://votre-site.netlify.app/.netlify/functions/paydunya-ipn-test
```

## 🎯 **Workflow de développement avec Cursor**

### **Développement local :**

```bash
npm run dev
```

### **Test des fonctions Netlify localement :**

```bash
npx netlify dev
```

### **Déploiement automatique :**

1. **Faites vos modifications dans Cursor**
2. **Commit et push vers GitHub :**
   ```bash
   git add .
   git commit -m "Description des changements"
   git push origin main
   ```
3. **Netlify déploie automatiquement !**

## 🔧 **Configuration Cursor pour Git**

### **Extensions recommandées :**

- **GitLens** - Visualisation Git avancée
- **GitHub Pull Requests** - Gestion des PR
- **Netlify** - Intégration Netlify

### **Paramètres Git dans Cursor :**

```json
{
  "git.enableSmartCommit": true,
  "git.confirmSync": false,
  "git.autofetch": true
}
```

## 📊 **Monitoring du déploiement**

### **Dans Netlify :**

- **Dashboard :** Voir les déploiements en temps réel
- **Logs :** Vérifier les logs de déploiement
- **Functions :** Tester les fonctions serverless

### **Dans Cursor :**

- **Terminal intégré :** Exécuter les commandes Git
- **Source Control :** Gérer les commits
- **Extensions :** Monitoring Netlify

## 🚨 **En cas de problème**

### **Déploiement échoué :**

1. **Vérifiez les logs dans Netlify**
2. **Testez localement :** `npx netlify dev`
3. **Vérifiez les variables d'environnement**

### **Fonctions ne fonctionnent pas :**

1. **Testez localement :** `node test-paydunya-ipn.js`
2. **Vérifiez les logs dans Netlify Functions**
3. **Vérifiez les permissions Firebase**

## 🎉 **Avantages de cette configuration**

✅ **Déploiement automatique** - Chaque push = nouveau déploiement  
✅ **Développement local** - Test complet avant déploiement  
✅ **Fonctions serverless** - PayDunya IPN prêt  
✅ **Monitoring intégré** - Logs et métriques  
✅ **Variables d'environnement** - Configuration sécurisée  
✅ **Rollback facile** - Anciennes versions disponibles

## 📞 **Support**

- **Netlify Docs :** https://docs.netlify.com
- **Netlify Functions :** https://docs.netlify.com/functions/overview/
- **PayDunya Docs :** https://paydunya.com/developers

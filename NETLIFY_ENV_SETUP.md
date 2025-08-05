# Configuration Netlify pour PayDunya IPN

## 🔧 Variables d'environnement à configurer dans Netlify

### **1. Aller dans le dashboard Netlify :**
- Ouvrez https://app.netlify.com
- Sélectionnez votre site `health-e-sn`
- Allez dans **Site settings** > **Environment variables**

### **2. Ajouter ces variables :**

```bash
# Firebase Service Account (JSON complet)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"health-e-xxxxx","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@health-e-xxxxx.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40health-e-xxxxx.iam.gserviceaccount.com"}

# PayDunya Configuration
PAYDUNYA_MASTER_KEY=gzt0lrr3-IhY9-Cl5D-nQjQ-4YiQ3HmHdWtF
PAYDUNYA_PUBLIC_KEY=test_public_p64arhicc9ELdNg7kD78tmEYE3a
PAYDUNYA_PRIVATE_KEY=test_private_CvygOZ3E0kuBE20lWqZbjTxzKhf
PAYDUNYA_TOKEN=wZTFnRBd87rYZIdoQmyh
PAYDUNYA_MODE=test
```

### **3. Comment obtenir FIREBASE_SERVICE_ACCOUNT :**

1. **Allez dans Firebase Console :** https://console.firebase.google.com
2. **Sélectionnez votre projet** `health-e-xxxxx`
3. **Allez dans Project Settings** (⚙️ icône)
4. **Onglet "Service accounts"**
5. **Cliquez sur "Generate new private key"**
6. **Téléchargez le fichier JSON**
7. **Copiez tout le contenu JSON** dans la variable `FIREBASE_SERVICE_ACCOUNT`

### **4. Redéployer après configuration :**

```bash
# Dans votre terminal
git commit --allow-empty -m "Trigger Netlify redeploy with new env vars"
git push
```

## 🔍 Vérification

### **1. Tester l'endpoint IPN :**
```bash
curl -X GET "https://health-e-sn.netlify.app/.netlify/functions/paydunya-ipn-test"
```

### **2. Vérifier dans Netlify Functions :**
- Allez dans **Functions** dans votre dashboard Netlify
- Vous devriez voir `paydunya-ipn` et `paydunya-ipn-test`

### **3. Configurer l'URL IPN dans PayDunya :**
- URL : `https://health-e-sn.netlify.app/.netlify/functions/paydunya-ipn`
- Méthode : POST
- Token : `gzt0lrr3-IhY9-Cl5D-nQjQ-4YiQ3HmHdWtF`

## 🚨 Problèmes courants

### **Si l'endpoint retourne 404 :**
1. Vérifiez que les variables d'environnement sont configurées
2. Redéployez le site
3. Vérifiez les logs dans Netlify Functions

### **Si l'IPN n'arrive pas :**
1. Vérifiez l'URL dans le dashboard PayDunya
2. Testez avec un webhook de test
3. Vérifiez les logs Netlify Functions

### **Si les variables ne sont pas reconnues :**
1. Redéployez après avoir ajouté les variables
2. Vérifiez qu'il n'y a pas d'espaces en trop
3. Vérifiez la syntaxe JSON pour FIREBASE_SERVICE_ACCOUNT 
# Configuration Email pour Health-e

## Services SMTP recommandés

### 1. SendGrid (Recommandé)

- **Avantages :** Fiable, bon délivrabilité, gratuit jusqu'à 100 emails/jour
- **Configuration :**
  - Créez un compte sur https://sendgrid.com
  - Générez une clé API
  - URI SMTP : `smtp://apikey:VOTRE_CLE_API@smtp.sendgrid.net:587`

### 2. Mailgun

- **Avantages :** Bon pour les développeurs, 10,000 emails/mois gratuits
- **Configuration :**
  - Créez un compte sur https://mailgun.com
  - URI SMTP : `smtp://postmaster:VOTRE_CLE_API@smtp.mailgun.org:587`

### 3. Amazon SES

- **Avantages :** Très économique, intégration AWS
- **Configuration :**
  - Créez un compte AWS
  - Activez SES
  - URI SMTP : `smtp://VOTRE_ACCESS_KEY:VOTRE_SECRET_KEY@email-smtp.region.amazonaws.com:587`

## Configuration de l'extension Firebase

1. **Collection path :** `mail`
2. **SMTP connection URI :** [Utilisez l'URI de votre service choisi]
3. **Default FROM address :** `noreply@health-e.sn`
4. **Default reply-to address :** `support@health-e.sn`

## Variables d'environnement Netlify

Ajoutez ces variables dans votre dashboard Netlify :

```
SENDGRID_API_KEY=votre_cle_api_sendgrid
SMTP_URI=smtp://apikey:votre_cle_api@smtp.sendgrid.net:587
FROM_EMAIL=noreply@health-e.sn
REPLY_TO_EMAIL=support@health-e.sn
```

## Test de l'extension

Une fois configurée, l'extension surveillera la collection `mail` dans Firestore.
Pour envoyer un email, ajoutez un document avec cette structure :

```javascript
{
  to: "utilisateur@example.com",
  message: {
    subject: "Notification Health-e",
    html: "<h1>Bonjour !</h1><p>Vous avez une nouvelle notification.</p>"
  }
}
```

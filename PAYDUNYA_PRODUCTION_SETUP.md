# 🔧 Configuration PayDunya Production

## 🚨 Problème actuel
Les variables d'environnement Netlify ne sont pas chargées. L'application utilise toujours le mode test.

## 🔧 Solution temporaire

### 1. Remplacez les clés dans le fichier de configuration

Ouvrez `src/config/paydunyaConfig.ts` et remplacez :

```typescript
// Remplacez ces valeurs par vos vraies clés de production
publicKey: "live_public_YOUR_PRODUCTION_KEY_HERE",
privateKey: "live_private_YOUR_PRODUCTION_KEY_HERE", 
masterKey: "live_master_YOUR_PRODUCTION_KEY_HERE",
token: "live_token_YOUR_PRODUCTION_KEY_HERE",
```

Par vos vraies clés PayDunya de production :

```typescript
// Vos vraies clés de production PayDunya
publicKey: "live_public_abc123...",
privateKey: "live_private_xyz789...", 
masterKey: "live_master_def456...",
token: "live_token_ghi012...",
```

### 2. Où trouver vos clés de production

1. **Allez sur** [PayDunya Dashboard](https://app.paydunya.com)
2. **Connectez-vous** avec vos identifiants
3. **Allez dans** "Settings" > "API Keys"
4. **Copiez** les clés qui commencent par `live_`

### 3. Déployez les changements

```bash
git add .
git commit -m "🔧 Force PayDunya production mode with real keys"
git push
```

## 🔍 Vérification

Après déploiement, vous devriez voir dans la console :

```
🔧 [PAYDUNYA FORCE CONFIG] Configuration forcée:
Mode forcé: live
Base URL forcée: https://app.paydunya.com/api/v1
Force Production: true

🔍 [PAYDUNYA DEBUG] Headers exacts envoyés:
PAYDUNYA-MODE: live
PAYDUNYA-PUBLIC-KEY: live_public_...
PAYDUNYA-PRIVATE-KEY: live_private_...
```

## ⚠️ Important

- **Ne commitez jamais** vos vraies clés de production
- **Utilisez** cette solution temporairement
- **Résolvez** le problème Netlify ensuite

## 🔄 Solution permanente

Une fois que ça marche, nous devrons :
1. **Résoudre** le problème Netlify
2. **Supprimer** ce fichier de configuration forcée
3. **Utiliser** uniquement les variables d'environnement 
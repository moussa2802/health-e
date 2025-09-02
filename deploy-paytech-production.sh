#!/bin/bash

echo "🚀 Déploiement de PayTech en Mode Production"
echo "=============================================="

# Vérifier que les variables d'environnement sont définies
if [ -z "$PAYTECH_API_KEY" ] || [ -z "$PAYTECH_API_SECRET" ]; then
    echo "❌ ERREUR: Variables d'environnement PayTech manquantes"
    echo "   PAYTECH_API_KEY: $([ -z "$PAYTECH_API_KEY" ] && echo "❌ MANQUANT" || echo "✅ OK")"
    echo "   PAYTECH_API_SECRET: $([ -z "$PAYTECH_API_SECRET" ] && echo "❌ MANQUANT" || echo "✅ OK")"
    echo ""
    echo "🔧 Pour résoudre:"
    echo "   1. Exportez vos variables d'environnement:"
    echo "      export PAYTECH_API_KEY='votre_clé_api_production'"
    echo "      export PAYTECH_API_SECRET='votre_secret_api_production'"
    echo "   2. Ou créez un fichier .env avec ces variables"
    echo ""
    exit 1
fi

echo "✅ Variables d'environnement PayTech configurées"
echo ""

# Construire l'application
echo "🔨 Construction de l'application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la construction"
    exit 1
fi

echo "✅ Application construite avec succès"
echo ""

# Déployer sur Netlify
echo "🚀 Déploiement sur Netlify..."
netlify deploy --prod --dir=dist

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du déploiement Netlify"
    exit 1
fi

echo "✅ Déploiement Netlify réussi"
echo ""

# Vérifier les variables d'environnement Netlify
echo "🔍 Vérification des variables d'environnement Netlify..."
netlify env:list

echo ""
echo "🎉 PayTech est maintenant en mode PRODUCTION !"
echo ""
echo "⚠️  ATTENTION: Tous les paiements sont maintenant RÉELS !"
echo ""
echo "🔧 Pour revenir en mode test:"
echo "   - Changez PAYTECH_ENV=test dans vos variables Netlify"
echo "   - Redéployez l'application"
echo ""
echo "📱 Testez votre application:"
echo "   - Créez un rendez-vous de test"
echo "   - Vérifiez que le paiement fonctionne"
echo "   - Surveillez les logs PayTech"

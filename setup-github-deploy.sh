#!/bin/bash

echo "🚀 Configuration du déploiement automatique Netlify"
echo "=================================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Instructions pour créer le repository GitHub:${NC}"
echo "1. Allez sur https://github.com"
echo "2. Cliquez sur 'New repository'"
echo "3. Nom: health-e"
echo "4. Description: Health-e: Plateforme de santé connectée avec PayDunya IPN"
echo "5. Public"
echo "6. Ne pas initialiser avec README"
echo "7. Cliquez sur 'Create repository'"
echo ""

echo -e "${YELLOW}⏳ Attendez que le repository soit créé, puis appuyez sur Entrée...${NC}"
read -p ""

echo -e "${BLUE}🔗 Configuration du remote GitHub...${NC}"
echo "Entrez l'URL de votre repository GitHub (ex: https://github.com/votre-username/health-e.git):"
read github_url

if [ -z "$github_url" ]; then
    echo -e "${RED}❌ URL GitHub requise${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Ajout du remote GitHub...${NC}"
git remote add origin "$github_url"

echo -e "${GREEN}✅ Push vers GitHub...${NC}"
git push -u origin main

echo -e "${GREEN}✅ Repository connecté à GitHub !${NC}"

echo ""
echo -e "${BLUE}🔧 Configuration Netlify...${NC}"
echo "1. Allez sur https://app.netlify.com"
echo "2. Cliquez sur 'Add new site' > 'Import an existing project'"
echo "3. Connectez votre compte GitHub"
echo "4. Sélectionnez le repository 'health-e'"
echo "5. Configuration automatique détectée"
echo "6. Cliquez sur 'Deploy site'"

echo ""
echo -e "${YELLOW}⏳ Une fois le déploiement terminé, appuyez sur Entrée...${NC}"
read -p ""

echo -e "${BLUE}🔐 Configuration des variables d'environnement...${NC}"
echo "Dans le dashboard Netlify de votre site:"
echo "1. Allez dans 'Site settings' > 'Environment variables'"
echo "2. Ajoutez: PAYDUNYA_MASTER_KEY = votre_clé_paydunya"
echo "3. Ajoutez: FIREBASE_SERVICE_ACCOUNT = votre_json_firebase"

echo ""
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo ""
echo -e "${BLUE}📋 URL IPN PayDunya:${NC}"
echo "https://votre-site.netlify.app/.netlify/functions/paydunya-ipn"
echo ""
echo -e "${BLUE}🧪 URL de test:${NC}"
echo "https://votre-site.netlify.app/.netlify/functions/paydunya-ipn-test"
echo ""
echo -e "${GREEN}🎉 Déploiement automatique configuré !${NC}"
echo "Chaque push vers GitHub déclenchera un nouveau déploiement." 
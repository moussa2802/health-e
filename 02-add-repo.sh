#!/bin/bash

# Script 02: Ajout des dépôts Jitsi Meet
# Compatible avec Ubuntu 24.10
# Auteur: Assistant IA

set -e

echo "=========================================="
echo "02 - Ajout des dépôts Jitsi Meet"
echo "=========================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que le script est exécuté en tant que root
if [[ $EUID -ne 0 ]]; then
   print_error "Ce script doit être exécuté en tant que root (utilisez sudo)"
   exit 1
fi

print_status "Ajout de la clé GPG de Jitsi Meet..."

# Ajout de la clé GPG de Jitsi Meet
wget -qO - https://download.jitsi.org/jitsi-key.gpg.key | apt-key add -

print_status "Ajout du dépôt Jitsi Meet..."

# Ajout du dépôt Jitsi Meet
sh -c "echo 'deb https://download.jitsi.org stable/' > /etc/apt/sources.list.d/jitsi-stable.list"

print_status "Mise à jour des dépôts..."

# Mise à jour des dépôts
apt update

print_status "Installation des paquets de base Jitsi Meet..."

# Installation des paquets de base Jitsi Meet
apt install -y \
    jitsi-meet-web \
    jitsi-meet-web-config \
    jitsi-meet-prosody \
    jitsi-meet-turnserver \
    jitsi-meet-coturn \
    jitsi-videobridge2 \
    jitsi-meet

print_status "Vérification de l'installation des paquets..."

# Vérifier que les paquets sont installés
packages=("jitsi-meet-web" "jitsi-meet-prosody" "jitsi-videobridge2")
for package in "${packages[@]}"; do
    if dpkg -l | grep -q "^ii  $package"; then
        print_status "$package est installé"
    else
        print_error "$package n'est pas installé"
    fi
done

print_status "Configuration des variables d'environnement..."

# Configuration des variables d'environnement pour Jitsi Meet
cat >> /etc/environment << 'EOF'
# Variables d'environnement Jitsi Meet
JITSI_MEET_DOMAIN=meet.health-e.sn
JITSI_MEET_PASSWORD_ENABLED=true
JITSI_MEET_LOBBY_ENABLED=false
JITSI_MEET_MAX_PARTICIPANTS=50
EOF

print_status "Création des répertoires de configuration..."

# Création des répertoires de configuration
mkdir -p /etc/jitsi/meet
mkdir -p /etc/jitsi/videobridge
mkdir -p /etc/jitsi/prosody/conf.d
mkdir -p /etc/jitsi/jicofo

print_status "Configuration des permissions..."

# Configuration des permissions
chown -R jitsi:jitsi /etc/jitsi
chmod -R 755 /etc/jitsi

print_status "Vérification de la connectivité réseau..."

# Test de la connectivité réseau
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    print_status "Connectivité réseau OK"
else
    print_error "Problème de connectivité réseau"
fi

print_status "Vérification des ports requis..."

# Vérification des ports requis
ports=(80 443 10000 5349 5222 5280)
for port in "${ports[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        print_status "Port $port est ouvert"
    else
        print_warning "Port $port n'est pas ouvert"
    fi
done

print_status "Affichage des informations des dépôts..."

echo "=========================================="
echo "RÉSUMÉ DES DÉPÔTS AJOUTÉS"
echo "=========================================="
echo "Dépôt Jitsi Meet: https://download.jitsi.org stable/"
echo "Paquets installés:"
dpkg -l | grep jitsi | awk '{print $2}' | while read package; do
    echo "- $package"
done
echo "=========================================="

print_status "Dépôts Jitsi Meet ajoutés avec succès!"
print_status "Les paquets de base sont maintenant disponibles pour l'installation."

echo "=========================================="
echo "Étape 02 terminée avec succès!"
echo "==========================================" 
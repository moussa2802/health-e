#!/bin/bash

# Script 01: Configuration système de base pour Jitsi Meet
# Compatible avec Ubuntu 24.10
# Auteur: Assistant IA

set -e

echo "=========================================="
echo "01 - Configuration système de base"
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

# Variables de configuration
DOMAIN="meet.health-e.sn"
JITSI_MEET_PASSWORD=""
ENABLE_LOBBY="false"
ENABLE_PASSWORD="true"

print_status "Mise à jour du système..."

# Mise à jour du système
apt update
apt upgrade -y

print_status "Installation des paquets de base..."

# Installation des paquets essentiels
apt install -y \
    nginx \
    git \
    curl \
    wget \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    ufw \
    fail2ban \
    htop \
    nano \
    vim \
    unzip \
    zip \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    certbot \
    python3-certbot-nginx

print_status "Configuration du pare-feu..."

# Configuration du pare-feu UFW
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 10000/udp  # Port pour Jitsi Meet
ufw allow 22/tcp

print_status "Configuration de Nginx..."

# Création du répertoire pour les sites
mkdir -p /var/www/html

# Configuration de base de Nginx
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# Redémarrer Nginx
systemctl restart nginx
systemctl enable nginx

print_status "Configuration de l'environnement..."

# Création des répertoires pour Jitsi Meet
mkdir -p /opt/jitsi-meet
mkdir -p /var/log/jitsi-meet

# Configuration des limites système pour Jitsi Meet
cat >> /etc/security/limits.conf << 'EOF'
# Jitsi Meet - Limites système
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Configuration de sysctl pour optimiser les performances réseau
cat >> /etc/sysctl.conf << 'EOF'
# Optimisations réseau pour Jitsi Meet
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq
EOF

# Application des changements sysctl
sysctl -p

print_status "Configuration de la sécurité..."

# Configuration de fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Création d'un fichier de configuration fail2ban basique
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
EOF

# Redémarrer fail2ban
systemctl restart fail2ban

print_status "Nettoyage du système..."

# Nettoyage des paquets inutiles
apt autoremove -y
apt autoclean

print_status "Vérification des services..."

# Vérifier que les services essentiels sont actifs
services=("nginx" "ufw" "fail2ban")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        print_status "$service est actif"
    else
        print_error "$service n'est pas actif"
    fi
done

print_status "Affichage des informations système..."

echo "=========================================="
echo "RÉSUMÉ DE LA CONFIGURATION SYSTÈME"
echo "=========================================="
echo "Système: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "CPU: $(nproc) cœurs"
echo "RAM: $(free -h | awk 'NR==2{printf "%.1f GB", $2/1024}')"
echo "Espace disque: $(df -h / | awk 'NR==2{print $4}') libre"
echo "IP publique: $(curl -s ifconfig.me)"
echo "Domaine configuré: $DOMAIN"
echo "=========================================="

print_status "Configuration système terminée!"
print_status "Le système est maintenant prêt pour l'ajout des dépôts Jitsi Meet."

echo "=========================================="
echo "Étape 01 terminée avec succès!"
echo "==========================================" 
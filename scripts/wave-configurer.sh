#!/bin/bash
# Pose les secrets du paiement Wave de Health-e, SANS rien déployer (porteur, 27/11/2026).
#
#   1. WAVE_WEBHOOK_SECRET    (Netlify, production, fonctions) : le secret du webhook Wave de Health-e, tapé en masqué
#   2. HEALTHE_RELAIS_SECRET  (Netlify ET Secret Manager de lmuoff) : secret partagé avec le relais du manuel,
#                             généré ici au hasard (32 octets), jamais affiché
#
# Lancer depuis le dossier Health-e :  bash scripts/wave-configurer.sh
# Aucune valeur n'est écrite dans un fichier du projet. Les changements prennent effet au prochain déploiement
# (Netlify pour Health-e, Firebase lmuoff pour le relais), qui se fait seulement sur demande.
set -euo pipefail
cd "$(dirname "$0")/.."

NETLIFY="npx --yes netlify-cli@23"
echo "== Paiement Wave de Health-e : pose des secrets (rien n'est déployé) =="

# Le dossier doit être relié au site Netlify de Health-e, et la connexion faite une fois avec :
#   npx netlify-cli@23 login
# (aucune commande Netlify ne lit le clavier ici : stdin fermé, pas de question cachée)
if [ ! -f .netlify/state.json ]; then
  echo "Ce dossier n'est pas relié au site Netlify de Health-e. Rien n'a été modifié."
  exit 1
fi

# 1. Secret du webhook (copié depuis Wave Business › Développeurs › Webhooks)
echo
echo "Colle le secret du webhook Wave de Health-e (il commence par wave_sn_WHS_), puis Entrée."
echo "(Rien ne s'affiche pendant que tu colles : c'est normal.)"
read -r -s WHS
echo
WHS="$(printf '%s' "$WHS" | tr -d '[:space:]')"
if ! [[ "$WHS" =~ ^wave_[a-z]{2}_WHS_[A-Za-z0-9]{10,}$ ]]; then
  echo "Ce n'est pas un secret de webhook Wave (format attendu : wave_sn_WHS_…). Rien n'a été modifié."
  exit 1
fi

# 2. Secret partagé avec le relais du manuel
RELAIS="$(openssl rand -hex 32)"

poser_netlify() { # nom valeur
  if ! $NETLIFY env:set "$1" "$2" --context production --scope functions --secret --force </dev/null >/dev/null 2>&1; then
    if ! $NETLIFY env:set "$1" "$2" --context production --scope functions --force </dev/null >/dev/null; then
      echo "Netlify a refusé. Si tu n'es pas connecté, lance : npx netlify-cli@23 login   puis relance ce script."
      exit 1
    fi
  fi
  echo "  ✓ Netlify : $1"
}

echo "Netlify (production, fonctions) :"
poser_netlify WAVE_WEBHOOK_SECRET "$WHS"
poser_netlify HEALTHE_RELAIS_SECRET "$RELAIS"

echo "Firebase lmuoff (Secret Manager, pour la fonction relaisWaveHealthe du manuel) :"
TMP="$(mktemp)"; chmod 600 "$TMP"; trap 'rm -f "$TMP"' EXIT
printf '%s' "$RELAIS" > "$TMP"
firebase functions:secrets:set HEALTHE_RELAIS_SECRET --project lmuoff --data-file "$TMP" --non-interactive </dev/null >/dev/null  # pas de --force : il redéploierait les fonctions
echo "  ✓ lmuoff : HEALTHE_RELAIS_SECRET"

unset WHS RELAIS
echo
echo "C'est posé. Rien n'est en ligne : il reste les deux déploiements, à faire seulement quand tu le demandes."

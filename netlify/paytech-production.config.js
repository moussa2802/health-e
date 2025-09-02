/**
 * Configuration PayTech en Mode Production
 *
 * Ce fichier contient la configuration pour passer PayTech en mode production
 *
 * IMPORTANT:
 * 1. Remplacez les valeurs par vos vraies clés API de production
 * 2. Obtenez ces clés depuis votre dashboard PayTech en mode production
 * 3. Ne partagez jamais ces clés publiquement
 */

module.exports = {
  // Configuration de l'API PayTech
  apiUrl: "https://paytech.sn/api/payment/request-payment",

  // Clés API de production (à remplacer par vos vraies clés)
  apiKey: process.env.PAYTECH_API_KEY || "your_production_api_key_here",
  apiSecret:
    process.env.PAYTECH_API_SECRET || "your_production_api_secret_here",

  // Environnement
  env: "prod",

  // URLs de callback
  successUrl: "https://health-e.sn/appointment-success",
  cancelUrl: "https://health-e.sn/book",
  ipnUrl: "https://health-e.sn/.netlify/functions/paytech-ipn",

  // Configuration des moyens de paiement
  targetPayment: "Orange Money, Wave, Free Money",

  // Devise
  currency: "XOF",

  // Configuration des logs
  debug: false, // Désactiver les logs de debug en production

  // Configuration de sécurité
  requireHttps: true,
  validateSignature: true, // Valider la signature PayTech en production
};

/**
 * Instructions pour activer le mode production:
 *
 * 1. Connectez-vous à votre dashboard PayTech
 * 2. Passez en mode "Production" (pas "Test")
 * 3. Récupérez vos nouvelles clés API de production
 * 4. Mettez à jour vos variables d'environnement Netlify:
 *    - PAYTECH_API_KEY = votre_clé_api_production
 *    - PAYTECH_API_SECRET = votre_secret_api_production
 *    - PAYTECH_ENV = prod
 *
 * 5. Redéployez vos fonctions Netlify
 *
 * ⚠️ ATTENTION: En mode production, tous les paiements sont réels !
 */

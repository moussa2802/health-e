// 🔄 FORCE PRODUCTION MODE - Configuration temporaire
// Ce fichier force le mode production pour PayDunya

export const PAYDUNYA_FORCE_CONFIG = {
  // 🔧 Force le mode production
  mode: "live",
  baseUrl: "https://app.paydunya.com/api/v1",
  
  // 🔧 Clés de production (à remplacer par vos vraies clés)
  publicKey: "live_public_YOUR_PRODUCTION_KEY_HERE",
  privateKey: "live_private_YOUR_PRODUCTION_KEY_HERE", 
  masterKey: "live_master_YOUR_PRODUCTION_KEY_HERE",
  token: "live_token_YOUR_PRODUCTION_KEY_HERE",
  
  // 🔧 Debug
  debug: true,
  forceProduction: true
};

// 🔍 Debug de la configuration forcée
console.log("🔧 [PAYDUNYA FORCE CONFIG] Configuration forcée:");
console.log("Mode forcé:", PAYDUNYA_FORCE_CONFIG.mode);
console.log("Base URL forcée:", PAYDUNYA_FORCE_CONFIG.baseUrl);
console.log("Force Production:", PAYDUNYA_FORCE_CONFIG.forceProduction); 
// 🔄 FORCE PRODUCTION MODE - Configuration temporaire
// Ce fichier force le mode production pour PayDunya

export const PAYDUNYA_FORCE_CONFIG = {
  // 🔧 Force le mode production
  mode: "live",
  baseUrl: "https://app.paydunya.com/api/v1",
  
  // 🔧 Clés de production PayDunya
  publicKey: "live_public_b1vfRZ9y6DUVjQgiqeknj4hYreV",
  privateKey: "live_private_sQla2xwq509iswceqd2tgFRivxr", 
  masterKey: "gzt0lrr3-IhY9-Cl5D-nQjQ-4YiQ3HmHdWtF",
  token: "OTjTwVBbiqygEmisnvzh",
  
  // 🔧 Debug
  debug: true,
  forceProduction: true
};

// 🔍 Debug de la configuration forcée
console.log("🔧 [PAYDUNYA FORCE CONFIG] Configuration forcée:");
console.log("Mode forcé:", PAYDUNYA_FORCE_CONFIG.mode);
console.log("Base URL forcée:", PAYDUNYA_FORCE_CONFIG.baseUrl);
console.log("Force Production:", PAYDUNYA_FORCE_CONFIG.forceProduction); 
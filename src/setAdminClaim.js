// setAdminClaim.js
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');

// Initialise Firebase Admin SDK
admin.initializeApp({
  credential: applicationDefault(),
});

// Remplace cet UID par l'UID de l'admin (ex: "FYostm61DLbrax729IYT6OBHSuA3")
const uid = 'FYostm61DLbrax729IYT6OBHSuA3';

getAuth()
  .setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ Le rôle admin a bien été défini pour l'utilisateur ${uid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de la définition du rôle admin :', error);
    process.exit(1);
  });
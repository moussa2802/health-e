"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.patients_onWrite = exports.users_onWrite = exports.checkPhoneIndex = void 0;
const crypto = __importStar(require("crypto"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const options_1 = require("firebase-functions/v2/options");
const firestore_2 = require("firebase-admin/firestore");
// import { onUserCreated } from "firebase-functions/v2/identity";
const params_1 = require("firebase-functions/params");
// Secret HMAC pour hasher les numéros (à définir après)
const PHONE_INDEX_SECRET = (0, params_1.defineSecret)("PHONE_INDEX_SECRET");
// Configuration globale des functions
(0, options_1.setGlobalOptions)({
    region: "europe-west1",
    enforceAppCheck: true
});
if (!admin.apps.length) {
    admin.initializeApp();
}
function normalizePhone(input) {
    // conserve + et chiffres, retire espaces, -, ()
    const trimmed = (input || "").trim();
    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/[^\d]/g, "");
    return hasPlus ? `+${digits}` : `+${digits}`;
}
function hashPhone(secret, phone) {
    return crypto.createHmac("sha256", secret).update(phone).digest("hex");
}
async function upsertPhoneIndex(uid, phone, secret) {
    if (!phone)
        return;
    const normalized = normalizePhone(phone);
    const hash = hashPhone(secret, normalized);
    await admin.firestore().doc(`phone_index/${hash}`).set({
        uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function deletePhoneIndex(phone, secret) {
    if (!phone)
        return;
    const normalized = normalizePhone(phone);
    const hash = hashPhone(secret, normalized);
    await admin
        .firestore()
        .doc(`phone_index/${hash}`)
        .delete()
        .catch(() => { });
}
/**
 * Callable: checkPhoneIndex({ phone: "+221..." }) -> { exists: boolean }
 * App Check requis (protection contre l'abus).
 * Vérifie directement dans les collections users et patients.
 */
exports.checkPhoneIndex = (0, https_1.onCall)(async (request) => {
    const phone = (request.data?.phone || "").trim();
    if (!phone.startsWith("+") || phone.length < 8) {
        throw new https_1.HttpsError("invalid-argument", "Numéro invalide");
    }
    const db = (0, firestore_2.getFirestore)();
    // Vérifier dans la collection users
    const usersSnap = await db
        .collection("users")
        .where("type", "==", "patient")
        .where("phoneNumber", "==", phone)
        .limit(1)
        .get();
    if (!usersSnap.empty) {
        return { exists: true };
    }
    // Vérifier dans la collection patients
    const patientsSnap = await db
        .collection("patients")
        .where("phone", "==", phone)
        .limit(1)
        .get();
    return { exists: !patientsSnap.empty };
});
/**
 * Sync index quand /users/{uid} est créé/mis à jour/supprimé
 * (champ attendu: phoneNumber)
 */
exports.users_onWrite = (0, firestore_1.onDocumentWritten)({
    document: "users/{uid}",
    region: "europe-west1",
    secrets: [PHONE_INDEX_SECRET],
}, async (event) => {
    const secret = PHONE_INDEX_SECRET.value();
    const before = event.data?.before.exists
        ? event.data.before.data()
        : undefined;
    const after = event.data?.after.exists
        ? event.data.after.data()
        : undefined;
    const beforePhone = before?.phoneNumber;
    const afterPhone = after?.phoneNumber;
    if (beforePhone && beforePhone !== afterPhone) {
        await deletePhoneIndex(beforePhone, secret);
    }
    if (afterPhone) {
        await upsertPhoneIndex(event.params.uid, afterPhone, secret);
    }
});
/**
 * Sync index quand /patients/{uid} est créé/mis à jour/supprimé
 * (champ attendu: phone)
 */
exports.patients_onWrite = (0, firestore_1.onDocumentWritten)({
    document: "patients/{uid}",
    region: "europe-west1",
    secrets: [PHONE_INDEX_SECRET],
}, async (event) => {
    const secret = PHONE_INDEX_SECRET.value();
    const before = event.data?.before.exists
        ? event.data.before.data()
        : undefined;
    const after = event.data?.after.exists
        ? event.data.after.data()
        : undefined;
    const beforePhone = before?.phone;
    const afterPhone = after?.phone;
    if (beforePhone && beforePhone !== afterPhone) {
        await deletePhoneIndex(beforePhone, secret);
    }
    if (afterPhone) {
        await upsertPhoneIndex(event.params.uid, afterPhone, secret);
    }
});
/**
 * Sync index à la création d'un compte Auth (si phoneNumber présent)
 * Temporairement désactivé - onUserCreated n'est pas disponible dans v2
 */
// export const auth_onCreate = onUserCreated(
//   {
//     region: "europe-west1",
//     secrets: [PHONE_INDEX_SECRET]
//   },
//   async (event) => {
//     const secret = PHONE_INDEX_SECRET.value();
//     const phone = event.data?.phoneNumber;
//     if (phone) {
//       await upsertPhoneIndex(event.data.uid, phone, secret);
//     }
//   }
// );

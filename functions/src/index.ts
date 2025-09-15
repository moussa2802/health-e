import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { getFirestore } from "firebase-admin/firestore";
// import { onUserCreated } from "firebase-functions/v2/identity";
import { defineSecret } from "firebase-functions/params";

// Secret HMAC pour hasher les numéros (à définir après)
const PHONE_INDEX_SECRET = defineSecret("PHONE_INDEX_SECRET");

// Configuration globale des functions
setGlobalOptions({ 
  region: "europe-west1", 
  enforceAppCheck: true 
});

if (!admin.apps.length) {
  admin.initializeApp();
}

function normalizePhone(input: string): string {
  // conserve + et chiffres, retire espaces, -, ()
  const trimmed = (input || "").trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : `+${digits}`;
}

function hashPhone(secret: string, phone: string): string {
  return crypto.createHmac("sha256", secret).update(phone).digest("hex");
}

async function upsertPhoneIndex(uid: string, phone: string, secret: string) {
  if (!phone) return;
  const normalized = normalizePhone(phone);
  const hash = hashPhone(secret, normalized);
  await admin.firestore().doc(`phone_index/${hash}`).set(
    {
      uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function deletePhoneIndex(phone: string, secret: string) {
  if (!phone) return;
  const normalized = normalizePhone(phone);
  const hash = hashPhone(secret, normalized);
  await admin
    .firestore()
    .doc(`phone_index/${hash}`)
    .delete()
    .catch(() => {});
}

/**
 * Callable: checkPhoneIndex({ phone: "+221..." }) -> { exists: boolean }
 * App Check requis (protection contre l'abus).
 * Vérifie directement dans les collections users et patients.
 */
export const checkPhoneIndex = onCall(async (request) => {
  const phone: string = (request.data?.phone || "").trim();
  
  if (!phone.startsWith("+") || phone.length < 8) {
    throw new HttpsError("invalid-argument", "Numéro invalide");
  }

  const db = getFirestore();
  
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
export const users_onWrite = onDocumentWritten(
  {
    document: "users/{uid}",
    region: "europe-west1",
    secrets: [PHONE_INDEX_SECRET],
  },
  async (event) => {
    const secret = PHONE_INDEX_SECRET.value();
    const before = event.data?.before.exists
      ? event.data!.before.data()
      : undefined;
    const after = event.data?.after.exists
      ? event.data!.after.data()
      : undefined;

    const beforePhone = before?.phoneNumber as string | undefined;
    const afterPhone = after?.phoneNumber as string | undefined;

    if (beforePhone && beforePhone !== afterPhone) {
      await deletePhoneIndex(beforePhone, secret);
    }
    if (afterPhone) {
      await upsertPhoneIndex(event.params.uid as string, afterPhone, secret);
    }
  }
);

/**
 * Sync index quand /patients/{uid} est créé/mis à jour/supprimé
 * (champ attendu: phone)
 */
export const patients_onWrite = onDocumentWritten(
  {
    document: "patients/{uid}",
    region: "europe-west1",
    secrets: [PHONE_INDEX_SECRET],
  },
  async (event) => {
    const secret = PHONE_INDEX_SECRET.value();
    const before = event.data?.before.exists
      ? event.data!.before.data()
      : undefined;
    const after = event.data?.after.exists
      ? event.data!.after.data()
      : undefined;

    const beforePhone = before?.phone as string | undefined;
    const afterPhone = after?.phone as string | undefined;

    if (beforePhone && beforePhone !== afterPhone) {
      await deletePhoneIndex(beforePhone, secret);
    }
    if (afterPhone) {
      await upsertPhoneIndex(event.params.uid as string, afterPhone, secret);
    }
  }
);

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

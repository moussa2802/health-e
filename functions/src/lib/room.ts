import * as admin from "firebase-admin";
import { nanoid } from "nanoid";

const db = admin.firestore();

/**
 * Ensures a room token exists for a booking
 * Returns the token if it already exists, otherwise creates a new one
 */
export async function ensureRoomToken(bookingId: string): Promise<string> {
  const q = await db
    .collection("roomLinks")
    .where("bookingId", "==", bookingId)
    .limit(1)
    .get();

  if (!q.empty) {
    return q.docs[0].id;
  }

  const token = nanoid(16);
  await db.doc(`roomLinks/${token}`).set({
    bookingId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return token;
}

/**
 * Find patient phone number from users or patients collection
 */
export async function findPatientPhone(
  patientId: string
): Promise<string | null> {
  if (!patientId) return null;

  const tryDoc = async (coll: "users" | "patients") => {
    const ref = db.doc(`${coll}/${patientId}`);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    return (d.phoneNumber || d.phone || "").toString() || null;
  };

  return (await tryDoc("users")) || (await tryDoc("patients"));
}

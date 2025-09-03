import { getFirestoreInstance, ensureFirestoreReady } from "../utils/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function registerPatientForProfessional(opts: {
  professionalId: string;
  patientId: string;
  bookingId?: string | null;
  patientName?: string | null;
  consultationType?: "video" | "audio";
}) {
  await ensureFirestoreReady();
  const db = getFirestoreInstance();
  if (!db) throw new Error("Firestore not available");

  // clé stable par couple pro-patient (un doc = l'historique condensé du lien)
  const id = `${opts.professionalId}_${opts.patientId}`;
  await setDoc(
    doc(db, "professional_patients", id),
    {
      professionalId: opts.professionalId,
      patientId: opts.patientId,
      lastConsultationAt: serverTimestamp(),
      lastBookingId: opts.bookingId ?? null,
      lastType: opts.consultationType ?? "video",
      patientName: opts.patientName ?? null,
      source: "consultation-room",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // setDoc merge overwrite sans merge => ok
    },
    { merge: true }
  );
}

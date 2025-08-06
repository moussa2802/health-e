import { getFirestoreInstance, ensureFirestoreReady } from "../utils/firebase";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  getDocs,
  query,
  orderBy,
  where,
  collectionGroup,
} from "firebase/firestore";

// Interface for medical record
export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName?: string; // Ajout du nom du patient
  professionalId: string;
  professionalName: string;
  diagnosis: string;
  treatment: string;
  recommendations: string;
  nextAppointmentDate: string;
  consultationDate: string;
  consultationType: string;
  consultationId: string;
  createdAt: Timestamp;
  // Propriétés pour la signature électronique
  isPrescriptionSigned?: boolean;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  useElectronicSignature?: boolean;
}

// Update patient medical record
export async function updatePatientMedicalRecord(
  patientId: string,
  recordData: Omit<MedicalRecord, "id" | "patientId" | "createdAt">
): Promise<string> {
  try {
    console.log("📝 Updating medical record for patient:", patientId);

    // CRITICAL: Ensure Firestore is ready before updating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Check if patient exists
    const patientRef = doc(db, "patients", patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      throw new Error("Patient not found");
    }

    // Create medical records collection if it doesn't exist
    const medicalRecordsRef = collection(
      db,
      "patients",
      patientId,
      "medicalRecords"
    );

    // Add new medical record
    const recordRef = await addDoc(medicalRecordsRef, {
      ...recordData,
      patientId,
      consultationType: recordData.consultationType || "video",
      createdAt: serverTimestamp(),

      // Ajout des infos de signature
      isPrescriptionSigned: recordData.isPrescriptionSigned || false,
      signatureUrl: recordData.signatureUrl || null,
      stampUrl: recordData.stampUrl || null,
      useElectronicSignature: recordData.useElectronicSignature || false,
    });

    // Update patient document with reference to latest medical record
    await updateDoc(patientRef, {
      latestMedicalRecord: {
        id: recordRef.id,
        diagnosis: recordData.diagnosis,
        treatment: recordData.treatment,
        recommendations: recordData.recommendations,
        nextAppointmentDate: recordData.nextAppointmentDate,
        professionalId: recordData.professionalId,
        professionalName: recordData.professionalName,
        consultationDate: recordData.consultationDate,
        consultationType: recordData.consultationType || "video",
        isPrescriptionSigned: recordData.isPrescriptionSigned || false,
        signatureUrl: recordData.signatureUrl || null,
        stampUrl: recordData.stampUrl || null,
        useElectronicSignature: recordData.useElectronicSignature || false,
        updatedAt: serverTimestamp(),
      },
      medicalRecordIds: arrayUnion(recordRef.id),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Medical record updated successfully");
    return recordRef.id;
  } catch (error) {
    console.error("❌ Error updating medical record:", error);
    throw new Error("Failed to update medical record");
  }
}

// Get patient medical records
export async function getPatientMedicalRecords(
  patientId: string
): Promise<MedicalRecord[]> {
  try {
    console.log("📚 Fetching medical records for patient:", patientId);

    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Get medical records collection
    const medicalRecordsRef = collection(
      db,
      "patients",
      patientId,
      "medicalRecords"
    );

    // Create a query with ordering by consultationDate (newest first)
    const q = query(medicalRecordsRef, orderBy("consultationDate", "desc"));

    const snapshot = await getDocs(q);

    const records = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as MedicalRecord)
    );

    console.log(`✅ Fetched ${records.length} medical records`);
    return records;
  } catch (error) {
    console.error("❌ Error fetching medical records:", error);
    throw new Error("Failed to fetch medical records");
  }
}

// Get a specific medical record
export async function getMedicalRecord(
  patientId: string,
  recordId: string
): Promise<MedicalRecord | null> {
  try {
    console.log(
      `📄 Fetching medical record ${recordId} for patient ${patientId}`
    );

    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Get medical record document
    const recordRef = doc(
      db,
      "patients",
      patientId,
      "medicalRecords",
      recordId
    );
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) {
      console.log("⚠️ Medical record not found");
      return null;
    }

    const record = {
      id: recordSnap.id,
      ...recordSnap.data(),
    } as MedicalRecord;

    console.log("✅ Medical record fetched successfully");
    return record;
  } catch (error) {
    console.error("❌ Error fetching medical record:", error);
    throw new Error("Failed to fetch medical record");
  }
}

// Get medical records by professional
export async function getMedicalRecordsByProfessional(
  professionalId: string
): Promise<MedicalRecord[]> {
  try {
    console.log(
      "📚 Fetching medical records for professional:",
      professionalId
    );

    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Use collectionGroup to query across all patients' medical records
    console.log(
      "🔍 [MEDICAL RECORDS DEBUG] Using collectionGroup query for professional:",
      professionalId
    );

    try {
      const q = query(
        collectionGroup(db, "medicalRecords"),
        where("professionalId", "==", professionalId),
        orderBy("consultationDate", "desc")
      );

      const snapshot = await getDocs(q);
      console.log(
        "🔍 [MEDICAL RECORDS DEBUG] CollectionGroup query result:",
        snapshot.docs.length,
        "records"
      );

      const records = snapshot.docs.map((doc) => {
        // Get the patient ID from the path
        const pathSegments = doc.ref.path.split("/");
        const patientId = pathSegments[1]; // patients/{patientId}/medicalRecords/{recordId}

        return {
          id: doc.id,
          patientId,
          ...doc.data(),
        } as MedicalRecord;
      });

      console.log(
        `✅ Fetched ${records.length} medical records for professional`
      );
      return records;
    } catch (collectionGroupError) {
      console.log(
        "🔄 [MEDICAL RECORDS DEBUG] CollectionGroup query failed, falling back to patient-by-patient approach"
      );
      console.log("🔄 [MEDICAL RECORDS DEBUG] Error details:", collectionGroupError);
  } catch (error) {
    console.error("❌ Error fetching medical records by professional:", error);

    // If collectionGroup query fails (might need index), fall back to patient-by-patient approach
    try {
      console.log(
        "🔄 [MEDICAL RECORDS DEBUG] CollectionGroup query failed, falling back to patient-by-patient approach"
      );
      console.log("🔄 [MEDICAL RECORDS DEBUG] Error details:", error);

      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      // Get all patients
      const patientsRef = collection(db, "patients");
      const patientsSnapshot = await getDocs(patientsRef);

      const allRecords: MedicalRecord[] = [];

      // For each patient, get their medical records created by this professional
      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const medicalRecordsRef = collection(
          db,
          "patients",
          patientId,
          "medicalRecords"
        );

        // Query for records by this professional
        const q = query(
          medicalRecordsRef,
          where("professionalId", "==", professionalId)
        );
        const recordsSnapshot = await getDocs(q);

        const patientRecords = recordsSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              patientId, // Ensure patientId is included
            } as MedicalRecord)
        );

        allRecords.push(...patientRecords);
      }

      // Sort by consultationDate (newest first)
      allRecords.sort((a, b) => {
        const dateA = new Date(a.consultationDate);
        const dateB = new Date(b.consultationDate);
        return dateB.getTime() - dateA.getTime();
      });

      console.log(
        `✅ Fetched ${allRecords.length} medical records for professional (fallback method)`
      );
      return allRecords;
    } catch (fallbackError) {
      console.error("❌ Fallback method also failed:", fallbackError);
      throw new Error("Failed to fetch medical records");
    }
  }
}

// Generate prescription PDF
export function generatePrescriptionPDF(): string {
  // This function would normally generate and return a PDF URL
  // For now, we'll just return a placeholder
  console.log("📄 Generating prescription PDF");
  return "prescription.pdf";
}

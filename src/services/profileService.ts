import {
  getFirestoreInstance,
  retryFirestoreOperation,
  ensureFirestoreReady,
} from "../utils/firebase";
import { updateParticipantNameInConversations } from "./messageService";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  limit,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";
import { createAdminNotificationForNewProfessional } from "./notificationService";
import {
  getSpecialtyByKey,
  getSpecialtyLabel,
  getCategoryLabel,
  mapLegacySpecialty,
  isValidSpecialty,
  isValidCategory,
  type Category,
} from "../constants/specialties";

// Types for email preferences
export interface EmailPreferences {
  enabled: boolean;
}

export interface NotificationPreferences {
  email: EmailPreferences;
}

export interface ProfessionalSettings {
  notifications: NotificationPreferences;
}

// Types for patient profile
export interface PatientProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "M" | "F" | "O";
  address?: string;
  profileImage?: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Types for professional profile
export interface ProfessionalProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string; // Legacy field - keep for backward compatibility
  type: "mental" | "sexual"; // Legacy field - keep for backward compatibility
  // New fields for extended specialties
  category?: "mental-health" | "sexual-health";
  primarySpecialty?: string; // Key from SPECIALTIES constant (legacy, kept for compatibility)
  specialties?: string[]; // Array of specialty keys from SPECIALTIES constant
  languages: string[];
  description: string;
  education: string[];
  experience: string;
  profileImage?: string;
  price: number | null;
  currency: string;
  offersFreeConsultations: boolean;
  freeConsultationDuration?: number;
  freeConsultationsPerWeek?: number;
  availability: AvailabilitySlot[];
  isAvailableNow: boolean;
  isActive: boolean;
  isApproved: boolean;
  rating: number;
  reviews: number;
  // Electronic signature fields
  signatureUrl?: string;
  stampUrl?: string;
  useElectronicSignature?: boolean;
  // Email preferences
  settings?: ProfessionalSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Unified availability slot structure
export interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
  slots: string[];
}

// Time slot interface for conversion
interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

// Helper functions for specialty compatibility
export const getProfessionalCategory = (
  profile: ProfessionalProfile
): Category | null => {
  if (profile.category && isValidCategory(profile.category)) {
    return profile.category as Category;
  }
  // Fallback to legacy type field
  if (profile.type === "mental") return "mental-health";
  if (profile.type === "sexual") return "sexual-health";
  return null;
};

export const getProfessionalPrimarySpecialty = (
  profile: ProfessionalProfile
): string | null => {
  // First check if we have multiple specialties and return the first one as primary
  if (profile.specialties && profile.specialties.length > 0) {
    return profile.specialties[0];
  }

  if (profile.primarySpecialty && isValidSpecialty(profile.primarySpecialty)) {
    return profile.primarySpecialty;
  }
  // Fallback to legacy specialty field
  if (profile.specialty) {
    const mapped = mapLegacySpecialty(profile.specialty);
    if (mapped) return mapped;
  }
  return null;
};

export const getProfessionalSpecialties = (
  profile: ProfessionalProfile
): string[] => {
  // Return the new specialties array if available
  if (profile.specialties && profile.specialties.length > 0) {
    const validSpecialties = profile.specialties.filter((specialty) =>
      isValidSpecialty(specialty)
    );
    if (validSpecialties.length > 0) {
      return validSpecialties;
    }
  }

  // Fallback to primary specialty
  const primarySpecialty = getProfessionalPrimarySpecialty(profile);
  if (primarySpecialty) {
    return [primarySpecialty];
  }

  // Fallback to legacy specialty mapping
  if (profile.specialty) {
    const mapped = mapLegacySpecialty(profile.specialty);
    if (mapped) {
      return [mapped];
    }
  }

  // Last resort: try to extract from description or other fields
  if (profile.description) {
    const desc = profile.description.toLowerCase();
    if (desc.includes("psychiatre")) return ["psychiatre"];
    if (desc.includes("psychologue")) return ["psychologue-clinicien"];
    if (desc.includes("sexologue")) return ["sexologue-clinique"];
    if (desc.includes("gynécologue") || desc.includes("gynecologue"))
      return ["gynecologue"];
    if (desc.includes("urologue")) return ["urologue"];
  }

  return [];
};

export const getProfessionalSpecialtyLabel = (
  profile: ProfessionalProfile,
  language: "fr" | "en" = "fr"
): string => {
  const specialties = getProfessionalSpecialties(profile);
  if (specialties.length > 0) {
    if (specialties.length === 1) {
      return getSpecialtyLabel(specialties[0], language);
    } else {
      // Return multiple specialties separated by commas
      return specialties
        .map((specialty) => getSpecialtyLabel(specialty, language))
        .join(", ");
    }
  }
  // Fallback to legacy specialty field
  return profile.specialty || "Non renseigné";
};

export const getProfessionalSpecialtyLabels = (
  profile: ProfessionalProfile,
  language: "fr" | "en" = "fr"
): string[] => {
  const specialties = getProfessionalSpecialties(profile);
  return specialties.map((specialty) => getSpecialtyLabel(specialty, language));
};

export const getProfessionalCategoryLabel = (
  profile: ProfessionalProfile,
  language: "fr" | "en" = "fr"
): string => {
  const category = getProfessionalCategory(profile);
  if (category) {
    return getCategoryLabel(category, language);
  }
  // Fallback to legacy type field
  if (profile.type === "mental")
    return language === "fr" ? "Santé mentale" : "Mental Health";
  if (profile.type === "sexual")
    return language === "fr" ? "Santé sexuelle" : "Sexual Health";
  return "Non renseigné";
};

// Check if email already exists in users collection
export async function isEmailAlreadyRegistered(
  email: string
): Promise<boolean> {
  try {

    // Skip check in web container environment
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
    ) {
      return false;
    }

    // CRITICAL: Ensure Firestore is ready before checking
    const isReady = await ensureFirestoreReady();
    if (!isReady) {
      throw new Error(
        "Vérification impossible. Vous pourrez continuer quand même."
      );
    }

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Check in users collection
    const usersQuery = query(
      collection(db, "users"),
      where("email", "==", email),
      limit(1)
    );

    const usersSnapshot = await getDocs(usersQuery);

    if (!usersSnapshot.empty) {
      return true;
    }

    // Check in patients collection
    const patientsQuery = query(
      collection(db, "patients"),
      where("email", "==", email),
      limit(1)
    );

    const patientsSnapshot = await getDocs(patientsQuery);

    if (!patientsSnapshot.empty) {
      return true;
    }

    // Check in professionals collection
    const professionalsQuery = query(
      collection(db, "professionals"),
      where("email", "==", email),
      limit(1)
    );

    const professionalsSnapshot = await getDocs(professionalsQuery);

    if (!professionalsSnapshot.empty) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Error checking if email exists:", error);
    // In case of error, throw to let the caller handle it
    throw error;
  }
}

// Check if phone already exists in users collection
export async function isPhoneAlreadyRegistered(
  phoneNumber: string
): Promise<boolean> {
  try {

    // Skip check in web container environment
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
    ) {
      return false;
    }

    // CRITICAL: Ensure Firestore is ready before checking
    const isReady = await ensureFirestoreReady();
    if (!isReady) {
      throw new Error(
        "Vérification impossible. Vous pourrez continuer quand même."
      );
    }

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Check in users collection
    const usersQuery = query(
      collection(db, "users"),
      where("phoneNumber", "==", phoneNumber),
      limit(1)
    );

    const usersSnapshot = await getDocs(usersQuery);

    if (!usersSnapshot.empty) {
      return true;
    }

    // Check in patients collection
    const patientsQuery = query(
      collection(db, "patients"),
      where("phoneNumber", "==", phoneNumber),
      limit(1)
    );

    const patientsSnapshot = await getDocs(patientsQuery);

    if (!patientsSnapshot.empty) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Error checking if phone exists:", error);
    // In case of error, throw to let the caller handle it
    throw error;
  }
}

// Check if name already exists in users collection
export async function isNameAlreadyRegistered(
  name: string,
  userType: "patient" | "professional"
): Promise<boolean> {
  try {

    // Skip check in web container environment
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
    ) {
      return false;
    }

    // CRITICAL: Ensure Firestore is ready before checking
    const isReady = await ensureFirestoreReady();
    if (!isReady) {
      throw new Error(
        "Vérification impossible. Vous pourrez continuer quand même."
      );
    }

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Check in the appropriate collection
    const collectionName =
      userType === "patient" ? "patients" : "professionals";
    const nameQuery = query(
      collection(db, collectionName),
      where("name", "==", name),
      limit(1)
    );

    const snapshot = await getDocs(nameQuery);

    if (!snapshot.empty) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Error checking if name exists:", error);
    // In case of error, throw to let the caller handle it
    throw error;
  }
}

// Create default patient profile
export async function createDefaultPatientProfile(
  userId: string,
  name: string,
  email: string = "",
  phoneNumber: string = "",
  gender: "M" | "F" | "O" = "F"
): Promise<PatientProfile> {
  try {

    // Validate required fields
    if (!userId) throw new Error("ID utilisateur manquant");
    if (!name) throw new Error("Nom manquant");
    if (!email && !phoneNumber)
      throw new Error("Email ou numéro de téléphone manquant");

    // CRITICAL: Ensure Firestore is ready before creating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Skip email and name checks in web container environment
    let emailExists = false;
    let nameExists = false;
    let phoneExists = false;

    if (
      !(
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname.includes("webcontainer") ||
          window.location.hostname.includes("health-e.sn"))
      )
    ) {
      // Check if email already exists
      if (email) {
        emailExists = await isEmailAlreadyRegistered(email);
        if (emailExists) {
          throw new Error("Cet email est déjà utilisé par un autre compte");
        }
      }

      // Check if phone already exists
      if (phoneNumber) {
        phoneExists = await isPhoneAlreadyRegistered(phoneNumber);
        if (phoneExists) {
          throw new Error(
            "Ce numéro de téléphone est déjà utilisé par un autre compte"
          );
        }
      }

      // Check if name already exists
      nameExists = await isNameAlreadyRegistered(name, "patient");
      if (nameExists) {
        throw new Error("Cet email est déjà utilisé par un autre compte");
      }
    }

    // Create a new patient document with userId as document ID
    const patientRef = doc(db, "patients", userId); // ✅ Use userId as document ID

    const patientData: Omit<PatientProfile, "id"> = {
      userId,
      name,
      email: email || "",
      phone: phoneNumber || "",
      gender, // Use provided gender
      emergencyContact: {
        name: "",
        phone: "",
        relationship: "",
      },
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Use retry mechanism for patient document creation
    await retryFirestoreOperation(async () => {
      await setDoc(patientRef, patientData);
    });

    // Also create/update a user document with retry mechanism
    const userRef = doc(db, "users", userId);
    await retryFirestoreOperation(async () => {
      await setDoc(
        userRef,
        {
          id: userId,
          name,
          email: email || "",
          phoneNumber: phoneNumber || "",
          type: "patient",
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });


    return {
      id: userId, // ✅ Use userId as document ID
      ...patientData,
    } as PatientProfile;
  } catch (error) {
    console.error("❌ Error creating default patient profile:", error);
    throw new Error(
      "Erreur lors de la création du profil patient: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Create default professional profile
export async function createDefaultProfessionalProfile(
  userId: string,
  name: string,
  email: string,
  type: "mental" | "sexual" = "mental",
  customSpecialty?: string,
  customCategory?: "mental-health" | "sexual-health"
): Promise<ProfessionalProfile> {
  try {

    // Validate required fields
    if (!userId) throw new Error("ID utilisateur manquant");
    if (!name) throw new Error("Nom manquant");
    if (!email) throw new Error("Email manquant");
    if (!type) throw new Error("Type de service manquant");

    // CRITICAL: Ensure Firestore is ready before creating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Skip email and name checks in web container environment
    let emailExists = false;
    let nameExists = false;
    let phoneExists = false;

    if (
      !(
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname.includes("webcontainer") ||
          window.location.hostname.includes("health-e.sn"))
      )
    ) {
      // Check if email already exists
      emailExists = await isEmailAlreadyRegistered(email);
      if (emailExists) {
        throw new Error("Cet email est déjà utilisé par un autre compte");
      }

      // Check if name already exists
      nameExists = await isNameAlreadyRegistered(name, "professional");
      // Note: phoneNumber is not a parameter in this function

      if (nameExists) {
        throw new Error("Ce nom est déjà utilisé par un autre professionnel");
      }
    }

    // Create a new professional document with userId as document ID
    const professionalRef = doc(db, "professionals", userId); // ✅ Use userId as document ID

    // Default availability - empty array (no default slots)
    const defaultAvailability: AvailabilitySlot[] = [];

    const defaultCategory =
      customCategory || (type === "mental" ? "mental-health" : "sexual-health");
    // ✅ Vérifier que customSpecialty est défini ET non vide avant de l'utiliser
    const defaultPrimary =
      customSpecialty && customSpecialty.trim() !== ""
        ? customSpecialty
        : type === "mental"
        ? "psychologue-clinicien"
        : "sexologue-clinique";

    // ✅ Générer le libellé de la spécialité pour le champ legacy 'specialty'
    const specialtyLabel = getSpecialtyLabel(defaultPrimary, "fr");

    const professionalData: Omit<ProfessionalProfile, "id"> = {
      userId,
      name,
      email,
      specialty: specialtyLabel, // ✅ Utiliser le libellé de la spécialité choisie
      type,
      // 🔽 nouveaux champs cohérents
      category: defaultCategory,
      primarySpecialty: defaultPrimary,
      specialties: [defaultPrimary],
      languages: ["fr"],
      description: "Professionnel de santé",
      education: [],
      experience: "",
      price: 100,
      currency: "XOF",
      offersFreeConsultations: false,
      availability: defaultAvailability,
      isAvailableNow: false,
      isActive: true,
      isApproved: false,
      rating: 5.0,
      reviews: 0,
      signatureUrl: "",
      stampUrl: "",
      useElectronicSignature: false,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Use retry mechanism for professional document creation
    await retryFirestoreOperation(async () => {
      await setDoc(professionalRef, professionalData);
    });

    // Also create/update a user document with retry mechanism
    const userRef = doc(db, "users", userId);
    await retryFirestoreOperation(async () => {
      await setDoc(
        userRef,
        {
          id: userId,
          name,
          email,
          type: "professional",
          serviceType: type,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });


    // 🔔 Send notification to admin about new professional registration
    try {
      await createAdminNotificationForNewProfessional(userId, name, email);
    } catch (notificationError) {
      // Don't throw error, as the profile creation was successful
    }

    // 🔄 Synchroniser vers professionals_public
    try {
      const { syncProfessionalToPublic } = await import("./professionalService");
      await syncProfessionalToPublic(userId);
    } catch (syncError) {
      // Don't throw error, as the profile creation was successful
    }

    return {
      id: userId, // ✅ Use userId as document ID
      ...professionalData,
    } as ProfessionalProfile;
  } catch (error) {
    console.error("❌ Error creating default professional profile:", error);
    throw new Error(
      "Erreur lors de la création du profil professionnel: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Generate time slots from start and end time
export function generateTimeSlots(
  startTime: string,
  endTime: string
): string[] {
  const slots: string[] = [];

  if (!startTime || !endTime) {
    return [];
  }


  try {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const start = new Date();
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMinute, 0, 0);

    // If end time is earlier than start time, return empty array
    if (end <= start) {
      return [];
    }

    const current = new Date(start);

    // Add the first slot
    slots.push(current.toTimeString().slice(0, 5));

    // Generate slots in 30-minute increments
    while (current < end) {
      // Add 30-minute increments
      current.setMinutes(current.getMinutes() + 30);

      if (current < end) {
        slots.push(current.toTimeString().slice(0, 5));
      }
    }

    return slots;
  } catch (error) {
    console.error("❌ Error generating time slots:", error);
    return [];
  }
}

// Update patient profile
export async function updatePatientProfile(
  patientId: string,
  updates: Partial<PatientProfile>
): Promise<void> {
  try {

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const patientRef = doc(db, "patients", patientId);

    await retryFirestoreOperation(async () => {
      await updateDoc(patientRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    });

    // ✅ SYNC: Also update the user document to keep authentication context in sync
    if (updates.name) {
      const userRef = doc(db, "users", patientId);
      await updateDoc(userRef, {
        name: updates.name,
        updatedAt: serverTimestamp(),
      });

      // ✅ UPDATE CONVERSATIONS: Update participant name in all conversations
      try {
        await updateParticipantNameInConversations(
          patientId,
          updates.name,
          "patient"
        );
      } catch (conversationError) {
        // Continue anyway, this is not critical
      }

      // ✅ FORCE SYNC: Trigger a custom event to notify the auth context
      if (typeof window !== "undefined") {
        const syncEvent = new CustomEvent("user-name-updated", {
          detail: { userId: patientId, newName: updates.name },
        });
        window.dispatchEvent(syncEvent);
      }
    }

  } catch (error) {
    console.error("❌ Error updating patient profile:", error);
    throw new Error(
      "Erreur lors de la mise à jour du profil: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Upload profile image
export async function uploadProfileImage(
  file: File,
  userId: string,
  progressCallback?: (progress: number) => void
): Promise<string> {
  try {

    if (!storage) throw new Error("Storage not available");

    const imageRef = ref(
      storage,
      `profile-images/${userId}/${Date.now()}-${file.name}`
    );

    // Create upload task
    const uploadTask = uploadBytes(imageRef, file);

    // Monitor upload progress if callback provided
    if (progressCallback) {
      progressCallback(0);
      // Since Firebase storage doesn't have native progress tracking for uploadBytes,
      // we'll simulate progress updates
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          if (progress <= 90) {
            progressCallback(progress);
          } else {
            clearInterval(interval);
          }
        }, 300);

        return interval;
      };

      const progressInterval = simulateProgress();

      // Clear interval when upload completes
      uploadTask
        .then(() => {
          clearInterval(progressInterval);
          progressCallback(100);
        })
        .catch(() => {
          clearInterval(progressInterval);
        });
    }

    const snapshot = await uploadTask;
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error("❌ Error uploading profile image:", error);
    throw new Error(
      "Erreur lors du téléchargement de l'image: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Upload signature or stamp image
export async function uploadSignatureImage(
  file: File,
  userId: string,
  type: "signature" | "stamp",
  progressCallback?: (progress: number) => void
): Promise<string> {
  try {

    if (!storage) throw new Error("Storage not available");

    const imageRef = ref(
      storage,
      `${type}-images/${userId}/${Date.now()}-${file.name}`
    );

    // Create upload task
    const uploadTask = uploadBytes(imageRef, file);

    // Monitor upload progress if callback provided
    if (progressCallback) {
      progressCallback(0);
      // Since Firebase storage doesn't have native progress tracking for uploadBytes,
      // we'll simulate progress updates
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          if (progress <= 90) {
            progressCallback(progress);
          } else {
            clearInterval(interval);
          }
        }, 300);

        return interval;
      };

      const progressInterval = simulateProgress();

      // Clear interval when upload completes
      uploadTask
        .then(() => {
          clearInterval(progressInterval);
          progressCallback(100);
        })
        .catch(() => {
          clearInterval(progressInterval);
        });
    }

    const snapshot = await uploadTask;
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading ${type} image:`, error);
    throw new Error(
      `Erreur lors du téléchargement de l'image ${type}: ` +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Upload and save profile image in one operation
export async function uploadAndSaveProfileImage(
  file: File,
  userId: string,
  userType: "patient" | "professional",
  progressCallback?: (progress: number) => void
): Promise<string> {
  try {

    // First upload the image
    const downloadURL = await uploadProfileImage(
      file,
      userId,
      progressCallback
    );

    // Then update the profile with the image URL
    if (userType === "patient") {
      await updatePatientProfile(userId, { profileImage: downloadURL });
    } else {
      await updateProfessionalProfile(userId, { profileImage: downloadURL });
    }

    // Also update the user document
    const db = getFirestoreInstance();
    if (db) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        profileImage: downloadURL,
        updatedAt: serverTimestamp(),
      });
    }

    return downloadURL;
  } catch (error) {
    console.error("❌ Error uploading and saving profile image:", error);
    throw new Error(
      "Erreur lors du téléchargement et de l'enregistrement de l'image: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Upload and save signature or stamp image
export async function uploadAndSaveSignatureImage(
  file: File,
  userId: string,
  type: "signature" | "stamp",
  progressCallback?: (progress: number) => void
): Promise<string> {
  try {

    // First upload the image
    const downloadURL = await uploadSignatureImage(
      file,
      userId,
      type,
      progressCallback
    );

    // Then update the professional profile with the image URL
    const updateData =
      type === "signature"
        ? { signatureUrl: downloadURL }
        : { stampUrl: downloadURL };

    await updateProfessionalProfile(userId, updateData);

    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading and saving ${type} image:`, error);
    throw new Error(
      `Erreur lors du téléchargement et de l'enregistrement de l'image ${type}: ` +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Migrate availability data
export function migrateAvailabilityData(
  availability: any[]
): AvailabilitySlot[] {
  try {

    if (!Array.isArray(availability)) {
      return [];
    }

    return availability
      .map((slot) => {
        // Ensure slot has required fields
        if (!slot || !slot.day || !slot.startTime || !slot.endTime) {
          console.log(
            "⚠️ Missing required fields in slot:",
            JSON.stringify(slot)
          );
          return null;
        }

        // Generate slots if they don't exist or are empty
        const slots =
          slot.slots && Array.isArray(slot.slots) && slot.slots.length > 0
            ? slot.slots
            : generateTimeSlots(
                slot.startTime || "08:00",
                slot.endTime || "17:00"
              );

        return {
          day: slot.day,
          startTime: slot.startTime || "08:00",
          endTime: slot.endTime || "17:00",
          slots,
        };
      })
      .filter(Boolean) as AvailabilitySlot[];
  } catch (error) {
    console.error("❌ Error migrating availability data:", error);
    return [];
  }
}

// Get patient profile - ✅ FIXED: Direct document access by userId
export async function getPatientProfile(
  patientId: string
): Promise<PatientProfile | null> {
  try {

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // ✅ Direct document access by userId
    const patientRef = doc(db, "patients", patientId);

    const patientSnap = await retryFirestoreOperation(async () => {
      return await getDoc(patientRef);
    });

    if (!patientSnap.exists()) {
      return null;
    }

    const patientData = patientSnap.data() as PatientProfile;

    return {
      id: patientSnap.id,
      ...patientData,
    };
  } catch (error) {
    console.error("❌ Error getting patient profile:", error);
    throw new Error(
      "Erreur lors de la récupération du profil: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Get or create patient profile - ✅ FIXED: Direct document access
export async function getOrCreatePatientProfile(
  patientId: string
): Promise<PatientProfile> {
  try {

    const existingProfile = await getPatientProfile(patientId);

    if (existingProfile) {
      return existingProfile;
    }


    // Get user data to create default profile
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const userRef = doc(db, "users", patientId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Utilisateur non trouvé");
    }

    const userData = userSnap.data();

    // Create default profile
    return await createDefaultPatientProfile(
      patientId,
      userData.name || "Patient",
      userData.email || ""
    );
  } catch (error) {
    console.error("❌ Error getting or creating patient profile:", error);
    throw new Error(
      "Erreur lors de la récupération ou création du profil: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Subscribe to patient profile changes - ✅ FIXED: Direct document subscription
export function subscribeToPatientProfile(
  patientId: string,
  callback: (profile: PatientProfile) => void
): () => void {

  const db = getFirestoreInstance();
  if (!db) {
    return () => {};
  }

  // ✅ Direct document subscription by userId
  const patientRef = doc(db, "patients", patientId);

  const unsubscribe = onSnapshot(
    patientRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const profileData = snapshot.data() as PatientProfile;
        callback({
          id: snapshot.id,
          ...profileData,
        });
      } else {
      }
    },
    (error) => {
      console.error("❌ Error in patient profile subscription:", error);
    }
  );

  return unsubscribe;
}

// Get professional profile - ✅ FIXED: Direct document access by userId
export async function getProfessionalProfile(
  professionalId: string
): Promise<ProfessionalProfile | null> {
  try {

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // ✅ Direct document access by userId
    const professionalRef = doc(db, "professionals", professionalId);

    const professionalSnap = await retryFirestoreOperation(async () => {
      return await getDoc(professionalRef);
    });

    if (!professionalSnap.exists()) {
      return null;
    }

    const raw = professionalSnap.data() as ProfessionalProfile;

    // ✅ Normalisation
    const normalizedCategory = getProfessionalCategory(raw) || undefined;
    const primary = getProfessionalPrimarySpecialty(raw) || undefined;

    const specialties = (
      Array.isArray(raw.specialties) && raw.specialties.length > 0
        ? raw.specialties
        : primary
        ? [primary]
        : []
    ).filter(isValidSpecialty);

    return {
      id: professionalSnap.id,
      ...raw,
      category: normalizedCategory,
      primarySpecialty: primary,
      specialties,
    };
  } catch (error) {
    console.error("❌ Error getting professional profile:", error);
    throw new Error(
      "Erreur lors de la récupération du profil: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Get or create professional profile - ✅ FIXED: Direct document access
export async function getOrCreateProfessionalProfile(
  userId: string
): Promise<ProfessionalProfile> {
  try {

    // ✅ Direct document access by userId
    const existingProfile = await getProfessionalProfile(userId);

    if (existingProfile) {
      return existingProfile;
    }


    // Get user data to create default profile
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Utilisateur non trouvé");
    }

    const userData = userSnap.data();

    // Create profile using existing user data instead of defaults
    const professionalRef = doc(db, "professionals", userId);
    const professionalSnap = await getDoc(professionalRef);

    if (professionalSnap.exists()) {
      // Use existing professional data
      const professionalData = professionalSnap.data();
      return {
        id: userId,
        ...professionalData,
      } as ProfessionalProfile;
    }

    // Fallback to default profile only if no professional data exists
    return await createDefaultProfessionalProfile(
      userId,
      userData.name || "Professionnel",
      userData.email || "",
      userData.serviceType || "mental",
      userData.primarySpecialty, // Use the specialty from user data
      userData.category // Use the category from user data
    );
  } catch (error) {
    console.error("❌ Error getting or creating professional profile:", error);
    throw new Error(
      "Erreur lors de la récupération ou création du profil: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Subscribe to professional profile changes - ✅ FIXED: Direct document subscription
export function subscribeToProfessionalProfile(
  userId: string,
  callback: (profile: ProfessionalProfile) => void
): () => void {

  const db = getFirestoreInstance();
  if (!db) {
    return () => {};
  }

  // ✅ Direct document subscription by userId
  const professionalRef = doc(db, "professionals", userId);

  const unsubscribe = onSnapshot(
    professionalRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const profileData = snapshot.data() as ProfessionalProfile;
        callback({
          id: snapshot.id,
          ...profileData,
        });
      } else {
      }
    },
    (error) => {
      console.error("❌ Error in professional profile subscription:", error);
    }
  );

  return unsubscribe;
}

// Update professional profile - ✅ FIXED: Direct document access
export async function updateProfessionalProfile(
  professionalId: string,
  updates: Partial<ProfessionalProfile>
): Promise<void> {
  try {

    // Validate specialty fields if provided
    if (updates.category && !isValidCategory(updates.category)) {
      throw new Error(`Invalid category: ${updates.category}`);
    }

    if (
      updates.primarySpecialty &&
      !isValidSpecialty(updates.primarySpecialty)
    ) {
      throw new Error(
        `Invalid primarySpecialty: ${updates.primarySpecialty}. Must be a valid specialty key.`
      );
    }

    // Validate specialties array if provided
    if (updates.specialties) {
      if (!Array.isArray(updates.specialties)) {
        throw new Error("Specialties must be an array");
      }

      for (const specialty of updates.specialties) {
        if (!isValidSpecialty(specialty)) {
          throw new Error(
            `Invalid specialty: ${specialty}. Must be a valid specialty key.`
          );
        }
      }
    }

    // Ensure category and specialties are consistent
    if (updates.category && updates.specialties) {
      for (const specialtyKey of updates.specialties) {
        const specialty = getSpecialtyByKey(specialtyKey);
        if (specialty && specialty.category !== updates.category) {
          throw new Error(
            `Specialty ${specialtyKey} does not belong to category ${updates.category}`
          );
        }
      }
    }

    // Ensure category and primarySpecialty are consistent (legacy)
    if (updates.category && updates.primarySpecialty) {
      const specialty = getSpecialtyByKey(updates.primarySpecialty);
      if (specialty && specialty.category !== updates.category) {
        throw new Error(
          `Specialty ${updates.primarySpecialty} does not belong to category ${updates.category}`
        );
      }
    }

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // ✅ Direct document access by userId
    const professionalRef = doc(db, "professionals", professionalId);

    await retryFirestoreOperation(async () => {
      // 🔧 Normalisation en entrée
      const patch: any = { ...updates };

      // Dédupe et nettoie specialties si fourni
      if (Array.isArray(patch.specialties)) {
        patch.specialties = Array.from(
          new Set(
            patch.specialties.filter(
              (s: any) => typeof s === "string" && isValidSpecialty(s)
            )
          )
        );
      }

      // Si primarySpecialty pas fourni mais specialties existe => prendre le 1er
      if (
        !patch.primarySpecialty &&
        Array.isArray(patch.specialties) &&
        patch.specialties.length > 0
      ) {
        patch.primarySpecialty = patch.specialties[0];
      }

      // Si primarySpecialty fourni mais pas specialties => créer un tableau cohérent
      if (patch.primarySpecialty && !Array.isArray(patch.specialties)) {
        patch.specialties = [patch.primarySpecialty];
      }

      // Cohérence category ↔ specialties (si category fourni)
      if (patch.category && Array.isArray(patch.specialties)) {
        for (const s of patch.specialties) {
          const spec = getSpecialtyByKey(s);
          if (spec && spec.category !== patch.category) {
            throw new Error(
              `La spécialité "${s}" n'appartient pas à la catégorie "${patch.category}"`
            );
          }
        }
      }

      // Cohérence category ↔ primarySpecialty
      if (patch.category && patch.primarySpecialty) {
        const spec = getSpecialtyByKey(patch.primarySpecialty);
        if (spec && spec.category !== patch.category) {
          throw new Error(
            `La spécialité "${patch.primarySpecialty}" n'appartient pas à la catégorie "${patch.category}"`
          );
        }
      }

      const updateData = {
        ...patch,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(professionalRef, updateData);

      const updatedDoc = await getDoc(professionalRef);
      if (updatedDoc.exists()) {
      } else {
        console.error("❌ Document not found after update");
      }
    });

    // ✅ SYNC: Also update the user document to keep authentication context in sync
    if (updates.name) {
      const userRef = doc(db, "users", professionalId);
      await updateDoc(userRef, {
        name: updates.name,
        updatedAt: serverTimestamp(),
      });

      // ✅ UPDATE CONVERSATIONS: Update participant name in all conversations
      try {
        await updateParticipantNameInConversations(
          professionalId,
          updates.name,
          "professional"
        );
      } catch (conversationError) {
        // Continue anyway, this is not critical
      }

      // ✅ FORCE SYNC: Trigger a custom event to notify the auth context
      if (typeof window !== "undefined") {
        const syncEvent = new CustomEvent("user-name-updated", {
          detail: { userId: professionalId, newName: updates.name },
        });
        window.dispatchEvent(syncEvent);
      }
    }

    // 🔄 Synchroniser vers professionals_public
    try {
      const { syncProfessionalToPublic } = await import("./professionalService");
      await syncProfessionalToPublic(professionalId);
    } catch (syncError) {
      // Don't throw error, as the profile update was successful
    }

  } catch (error) {
    console.error("❌ Error updating professional profile:", error);
    throw new Error(
      "Erreur lors de la mise à jour du profil: " +
        (error instanceof Error ? error.message : "Erreur inconnue")
    );
  }
}

// Validate patient profile
export function validatePatientProfile(
  profile: Partial<PatientProfile>
): string[] {
  const errors: string[] = [];

  if (!profile.name || profile.name.trim().length < 2) {
    errors.push("Le nom est requis et doit contenir au moins 2 caractères");
  }

  if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.push("Email invalide");
  }

  if (
    profile.phone &&
    !/^\+?[0-9]{8,15}$/.test(profile.phone.replace(/\s/g, ""))
  ) {
    errors.push("Numéro de téléphone invalide");
  }

  return errors;
}

// Validate professional profile
export function validateProfessionalProfile(
  profile: Partial<ProfessionalProfile>
): string[] {
  const errors: string[] = [];

  if (!profile.name || profile.name.trim().length < 2) {
    errors.push("Le nom est requis et doit contenir au moins 2 caractères");
  }

  if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.push("Email invalide");
  }

  const hasNew =
    Array.isArray(profile.specialties) &&
    profile.specialties.length > 0 &&
    !!profile.category;

  const hasLegacy = !!profile.specialty && !!profile.type;

  if (!hasNew && !hasLegacy) {
    errors.push("Choisissez une catégorie et au moins une spécialité.");
  }

  if (hasNew) {
    if (!isValidCategory(profile.category as any)) {
      errors.push("Catégorie invalide");
    }
    (profile.specialties || []).forEach((s) => {
      if (!isValidSpecialty(s)) errors.push(`Spécialité invalide: ${s}`);
    });
  }

  if (!profile.description || profile.description.trim().length < 10) {
    errors.push("La description doit contenir au moins 10 caractères");
  }

  if (
    !profile.languages ||
    !Array.isArray(profile.languages) ||
    profile.languages.length === 0
  ) {
    errors.push("Au moins une langue est requise");
  }

  return errors;
}

// Ensure availability has proper format
export function ensureAvailabilityFormat(
  availability: any[]
): AvailabilitySlot[] {
  if (!Array.isArray(availability)) {
    return [];
  }

  return availability
    .map((slot) => {
      if (!slot || !slot.day || !slot.startTime || !slot.endTime) {
        return null;
      }

      return {
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slots:
          slot.slots && Array.isArray(slot.slots) && slot.slots.length > 0
            ? slot.slots
            : generateTimeSlots(slot.startTime, slot.endTime),
      };
    })
    .filter(Boolean) as AvailabilitySlot[];
}

// Function to migrate all professionals' availability data
export async function migrateAllProfessionalsAvailability(): Promise<number> {
  try {

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // ✅ FIXED: Use simple query without orderBy to avoid index requirements
    const professionalsRef = collection(db, "professionals");
    const snapshot = await getDocs(professionalsRef);


    let migratedCount = 0;
    let skippedCount = 0;

    // Process each professional
    for (const docSnap of snapshot.docs) {
      try {
        const professionalData = docSnap.data();
        const professionalId = docSnap.id;

        console.log(
          `🔍 Checking professional ${professionalId} (${
            professionalData.name || "Unknown"
          })`
        );

        // Check if availability needs migration
        if (
          professionalData.availability &&
          Array.isArray(professionalData.availability)
        ) {
          const needsMigration = professionalData.availability.some(
            (avail: any) =>
              !avail.slots ||
              !Array.isArray(avail.slots) ||
              avail.slots.length === 0
          );

          if (needsMigration) {

            const migratedAvailability = migrateAvailabilityData(
              professionalData.availability
            );

            // Update the document
            await updateDoc(doc(db, "professionals", professionalId), {
              availability: migratedAvailability,
              updatedAt: serverTimestamp(),
            });

            migratedCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }

        // Small delay to avoid overwhelming Firestore
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error migrating professional ${docSnap.id}:`, error);
      }
    }

    return migratedCount;
  } catch (error) {
    console.error("❌ Error during bulk migration:", error);
    throw new Error("Erreur lors de la migration des données de disponibilité");
  }
}

// Function to update email preferences
export async function updateProfessionalEmailPreferences(
  professionalId: string,
  emailEnabled: boolean
): Promise<void> {
  const db = getFirestoreInstance();
  const professionalRef = doc(db, "professionals", professionalId);

  await updateDoc(professionalRef, {
    "settings.notifications.email.enabled": emailEnabled,
    updatedAt: serverTimestamp(),
  });
}

// Function to get email preferences (with default true if not set)
export async function getProfessionalEmailPreferences(
  professionalId: string
): Promise<boolean> {
  const db = getFirestoreInstance();
  const professionalRef = doc(db, "professionals", professionalId);
  const professionalSnap = await getDoc(professionalRef);

  if (!professionalSnap.exists()) {
    return true; // Default to enabled
  }

  const data = professionalSnap.data();
  return data?.settings?.notifications?.email?.enabled ?? true;
}

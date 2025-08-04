import {
  getFirestoreInstance,
  retryFirestoreOperation,
  ensureFirestoreReady,
} from "../utils/firebase";
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
  specialty: string;
  type: "mental" | "sexual";
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

// Check if email already exists in users collection
export async function isEmailAlreadyRegistered(
  email: string
): Promise<boolean> {
  try {
    console.log("🔍 Checking if email already exists:", email);

    // Skip check in web container environment
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
    ) {
      console.log("⚠️ Skipping email check in web container environment");
      return false;
    }

    // CRITICAL: Ensure Firestore is ready before checking
    const isReady = await ensureFirestoreReady();
    if (!isReady) {
      console.warn("⚠️ Firestore not ready for email check, returning false");
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
      console.log("✅ Email already exists in users collection");
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
      console.log("✅ Email already exists in patients collection");
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
      console.log("✅ Email already exists in professionals collection");
      return true;
    }

    console.log("✅ Email is available for registration");
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
    console.log("🔍 Checking if phone already exists:", phoneNumber);

    // Skip check in web container environment
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
    ) {
      console.log("⚠️ Skipping phone check in web container environment");
      return false;
    }

    // CRITICAL: Ensure Firestore is ready before checking
    const isReady = await ensureFirestoreReady();
    if (!isReady) {
      console.warn("⚠️ Firestore not ready for phone check, returning false");
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
      console.log("✅ Phone already exists in users collection");
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
      console.log("✅ Phone already exists in patients collection");
      return true;
    }

    console.log("✅ Phone is available for registration");
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
    console.log("🔍 Checking if name already exists:", name);

    // Skip check in web container environment
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
    ) {
      console.log("⚠️ Skipping name check in web container environment");
      return false;
    }

    // CRITICAL: Ensure Firestore is ready before checking
    const isReady = await ensureFirestoreReady();
    if (!isReady) {
      console.warn("⚠️ Firestore not ready for name check, returning false");
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
      console.log(`✅ Name already exists in ${collectionName} collection`);
      return true;
    }

    console.log("✅ Name is available for registration");
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
    console.log("🔧 Creating default patient profile for user:", userId);

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

    console.log("✅ Default patient profile created successfully");

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
  type: "mental" | "sexual" = "mental"
): Promise<ProfessionalProfile> {
  try {
    console.log("🔧 Creating default professional profile for user:", userId);

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
      // Check if phone already exists
      if (phoneNumber) {
        phoneExists = await isPhoneAlreadyRegistered(phoneNumber);
        if (phoneExists) {
          throw new Error(
            "Ce numéro de téléphone est déjà utilisé par un autre compte"
          );
        }
      }

      if (nameExists) {
        throw new Error("Ce nom est déjà utilisé par un autre professionnel");
      }
    }

    // Create a new professional document with userId as document ID
    const professionalRef = doc(db, "professionals", userId); // ✅ Use userId as document ID

    // Default availability - empty array (no default slots)
    const defaultAvailability: AvailabilitySlot[] = [];

    const professionalData: Omit<ProfessionalProfile, "id"> = {
      userId,
      name,
      email,
      specialty: type === "mental" ? "Psychologue" : "Sexologue",
      type,
      languages: ["fr"],
      description: "Professionnel de santé",
      education: [],
      experience: "",
      price: 25000,
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

    console.log("✅ Default professional profile created successfully");

    // 🔔 Send notification to admin about new professional registration
    try {
      await createAdminNotificationForNewProfessional(userId, name, email);
      console.log("✅ Admin notification sent for new professional");
    } catch (notificationError) {
      console.warn("⚠️ Failed to send admin notification:", notificationError);
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
    console.warn("⚠️ Invalid start or end time:", startTime, endTime);
    return [];
  }

  console.log("🕒 Generating time slots from", startTime, "to", endTime);

  try {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const start = new Date();
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMinute, 0, 0);

    // If end time is earlier than start time, return empty array
    if (end <= start) {
      console.warn(
        "⚠️ End time is earlier than or equal to start time:",
        startTime,
        endTime
      );
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

    console.log(`✅ Generated ${slots.length} time slots:`, slots);
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
    console.log("🔧 Updating patient profile:", patientId);

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

    console.log("✅ Patient profile updated successfully");
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
    console.log("📤 Uploading profile image for user:", userId);

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

    console.log("✅ Profile image uploaded successfully");
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
    console.log(`📤 Uploading ${type} image for professional:`, userId);

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

    console.log(`✅ ${type} image uploaded successfully`);
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
    console.log("📤 Uploading and saving profile image for user:", userId);

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

    console.log("✅ Profile image uploaded and saved successfully");
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
    console.log(
      `📤 Uploading and saving ${type} image for professional:`,
      userId
    );

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

    console.log(`✅ ${type} image uploaded and saved successfully`);
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
    console.log(
      "🔄 Migrating availability data for",
      availability.length,
      "days"
    );

    if (!Array.isArray(availability)) {
      console.warn("⚠️ Availability is not an array, returning empty array");
      return [];
    }

    return availability
      .map((slot) => {
        // Ensure slot has required fields
        if (!slot || !slot.day || !slot.startTime || !slot.endTime) {
          console.warn("⚠️ Invalid availability slot, skipping:", slot);
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
    console.log("🔍 Getting patient profile:", patientId);

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // ✅ Direct document access by userId
    const patientRef = doc(db, "patients", patientId);

    const patientSnap = await retryFirestoreOperation(async () => {
      return await getDoc(patientRef);
    });

    if (!patientSnap.exists()) {
      console.warn("⚠️ Patient profile not found");
      return null;
    }

    const patientData = patientSnap.data() as PatientProfile;

    console.log("✅ Patient profile retrieved successfully");
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
    console.log("🔍 Getting or creating patient profile:", patientId);

    const existingProfile = await getPatientProfile(patientId);

    if (existingProfile) {
      console.log("✅ Existing patient profile found");
      return existingProfile;
    }

    console.log("⚠️ Patient profile not found, creating default profile");

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
  console.log("🔔 Setting up patient profile subscription:", patientId);

  const db = getFirestoreInstance();
  if (!db) {
    console.warn("⚠️ Firestore not available for subscription");
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
        console.warn("⚠️ Patient document does not exist in subscription");
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
    console.log(
      "🔍 Getting professional profile by document ID:",
      professionalId
    );

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // ✅ Direct document access by userId
    const professionalRef = doc(db, "professionals", professionalId);

    const professionalSnap = await retryFirestoreOperation(async () => {
      return await getDoc(professionalRef);
    });

    if (!professionalSnap.exists()) {
      console.warn("⚠️ Professional profile not found");
      return null;
    }

    const professionalData = professionalSnap.data() as ProfessionalProfile;

    console.log("✅ Professional profile retrieved successfully");
    return {
      id: professionalSnap.id,
      ...professionalData,
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
    console.log(
      "🔍 Getting or creating professional profile for userId:",
      userId
    );

    // ✅ Direct document access by userId
    const existingProfile = await getProfessionalProfile(userId);

    if (existingProfile) {
      console.log("✅ Existing professional profile found");
      return existingProfile;
    }

    console.log("⚠️ Professional profile not found, creating default profile");

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

    // Create default profile
    return await createDefaultProfessionalProfile(
      userId,
      userData.name || "Professionnel",
      userData.email || "",
      userData.serviceType || "mental"
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
  console.log(
    "🔔 Setting up professional profile subscription for userId:",
    userId
  );

  const db = getFirestoreInstance();
  if (!db) {
    console.warn("⚠️ Firestore not available for subscription");
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
        console.warn("⚠️ Professional document does not exist in subscription");
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
    console.log("🔧 Updating professional profile:", professionalId, updates);

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // ✅ Direct document access by userId
    const professionalRef = doc(db, "professionals", professionalId);

    await retryFirestoreOperation(async () => {
      // Ensure availability data is properly formatted if it's being updated
      if (updates.availability) {
        console.log(
          "🔧 Formatting availability data before update:",
          updates.availability.length,
          "days"
        );

        // Make sure each availability slot has the required fields
        updates.availability = updates.availability.map((slot) => {
          if (
            !slot.slots ||
            !Array.isArray(slot.slots) ||
            slot.slots.length === 0
          ) {
            console.log(
              "🔧 Generating slots for day:",
              slot.day,
              "from",
              slot.startTime,
              "to",
              slot.endTime
            );
            // Generate slots if they don't exist
            return {
              ...slot,
              slots: generateTimeSlots(
                slot.startTime || "08:00",
                slot.endTime || "17:00"
              ),
            };
          }
          return slot;
        });

        console.log(
          "✅ Availability data formatted correctly:",
          updates.availability
        );
      }

      // ✅ Ensure all fields are properly updated
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      console.log("📝 Updating professional document with data:", updateData);

      await updateDoc(professionalRef, updateData);

      // ✅ Verify the update was successful
      const updatedDoc = await getDoc(professionalRef);
      if (updatedDoc.exists()) {
        console.log("✅ Document updated successfully:", updatedDoc.data());
      } else {
        console.error("❌ Document not found after update");
      }
    });

    console.log("✅ Professional profile updated successfully");
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

  if (!profile.specialty || profile.specialty.trim().length < 2) {
    errors.push("La spécialité est requise");
  }

  if (!profile.type || !["mental", "sexual"].includes(profile.type)) {
    errors.push("Le type de service est requis (mental ou sexual)");
  }

  if (!profile.description || profile.description.trim().length < 10) {
    errors.push(
      "La description est requise et doit contenir au moins 10 caractères"
    );
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
    console.log(
      "🔄 Starting migration of all professionals availability data..."
    );

    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // ✅ FIXED: Use simple query without orderBy to avoid index requirements
    const professionalsRef = collection(db, "professionals");
    const snapshot = await getDocs(professionalsRef);

    console.log(
      `📊 Found ${snapshot.docs.length} professionals to check for migration`
    );

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
            console.log(
              `🔧 Migrating availability for ${
                professionalData.name || "Unknown"
              }...`
            );

            const migratedAvailability = migrateAvailabilityData(
              professionalData.availability
            );

            // Update the document
            await updateDoc(doc(db, "professionals", professionalId), {
              availability: migratedAvailability,
              updatedAt: serverTimestamp(),
            });

            console.log(
              `✅ Successfully migrated ${professionalData.name || "Unknown"}`
            );
            migratedCount++;
          } else {
            console.log(
              `✅ ${
                professionalData.name || "Unknown"
              } already has proper slots`
            );
            skippedCount++;
          }
        } else {
          console.log(
            `⚠️ ${professionalData.name || "Unknown"} has no availability data`
          );
          skippedCount++;
        }

        // Small delay to avoid overwhelming Firestore
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error migrating professional ${docSnap.id}:`, error);
      }
    }

    console.log(
      `🎉 Migration completed! Migrated: ${migratedCount}, Skipped: ${skippedCount}`
    );
    return migratedCount;
  } catch (error) {
    console.error("❌ Error during bulk migration:", error);
    throw new Error("Erreur lors de la migration des données de disponibilité");
  }
}

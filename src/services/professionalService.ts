import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreInstance, ensureFirestoreReady } from "../utils/firebase";
import { retryFirestoreOperation } from "../utils/firebase";

// Récupérer le nom d'un professionnel par son ID
export async function getProfessionalNameById(
  professionalId: string
): Promise<string | null> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) return null;

    // Essayer d'abord dans la collection professionals
    const professionalRef = doc(db, "professionals", professionalId);
    const professionalDoc = await getDoc(professionalRef);

    if (professionalDoc.exists()) {
      const data = professionalDoc.data();
      return data.name || null;
    }

    // Essayer dans la collection users si c'est un userId
    const userRef = doc(db, "users", professionalId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.type === "professional") {
        return data.name || null;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching professional name:", error);
    return null;
  }
}

// Récupérer les informations complètes d'un professionnel
export async function getProfessionalById(
  professionalId: string
): Promise<{ name: string; specialty?: string; profileImage?: string } | null> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) return null;

    // Essayer d'abord dans la collection professionals
    const professionalRef = doc(db, "professionals", professionalId);
    const professionalDoc = await getDoc(professionalRef);

    if (professionalDoc.exists()) {
      const data = professionalDoc.data();
      return {
        name: data.name || "Professionnel",
        specialty: data.specialty || data.primarySpecialty || undefined,
        profileImage: data.profileImage || undefined,
      };
    }

    // Essayer dans la collection users
    const userRef = doc(db, "users", professionalId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.type === "professional") {
        return {
          name: data.name || "Professionnel",
          specialty: data.specialty || data.primarySpecialty || undefined,
          profileImage: data.profileImage || undefined,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching professional:", error);
    return null;
  }
}

// Interface pour les données publiques d'un professionnel
export interface ProfessionalPublicData {
  name: string;
  specialty?: string;
  primarySpecialty?: string;
  profileImage?: string;
  type?: "mental" | "sexual";
  languages?: string[];
  shortBio?: string;
  bio?: string;
  isApproved?: boolean;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Synchroniser un professionnel vers la collection publique
export async function syncProfessionalToPublic(
  professionalId: string
): Promise<void> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Lire le professionnel depuis la collection privée
    const professionalRef = doc(db, "professionals", professionalId);
    const professionalDoc = await getDoc(professionalRef);

    if (!professionalDoc.exists()) {
      console.warn(
        `⚠️ [SYNC] Professional ${professionalId} not found in professionals collection`
      );
      return;
    }

    const data = professionalDoc.data();

    // Extraire uniquement les champs publics (sans données sensibles)
    const publicData: ProfessionalPublicData = {
      name: data.name || "Professionnel",
      specialty: data.specialty || data.primarySpecialty || undefined,
      primarySpecialty: data.primarySpecialty || data.specialty || undefined,
      profileImage: data.profileImage || undefined,
      type: data.type || data.serviceType || undefined,
      languages: Array.isArray(data.languages) ? data.languages : undefined,
      shortBio: data.shortBio || data.bio || undefined,
      bio: data.bio || data.shortBio || undefined,
      isApproved: data.isApproved !== undefined ? data.isApproved : false,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: data.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Écrire dans la collection publique
    const publicRef = doc(db, "professionals_public", professionalId);
    await retryFirestoreOperation(async () => {
      await setDoc(publicRef, publicData, { merge: true });
    });

    console.log(
      `✅ [SYNC] Synchronized professional ${professionalId} to professionals_public`
    );
  } catch (error) {
    console.error(
      `❌ [SYNC] Error syncing professional ${professionalId} to public:`,
      error
    );
    throw error;
  }
}

// Récupérer les informations publiques d'un professionnel
// Lit directement depuis professionals/{id} au lieu de professionals_public/{id}
export async function getProfessionalPublicById(
  professionalId: string
): Promise<ProfessionalPublicData | null> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) return null;

    console.log(
      `[HOMEPAGE] Loading host profile from professionals: ${professionalId}`
    );

    // Lire depuis la collection professionals au lieu de professionals_public
    const professionalRef = doc(db, "professionals", professionalId);
    const professionalDoc = await getDoc(professionalRef);

    if (!professionalDoc.exists()) {
      console.warn(
        `⚠️ [HOMEPAGE] Professional profile not found for ${professionalId}`
      );
      return null;
    }

    const data = professionalDoc.data();
    console.log(
      `✅ [HOMEPAGE] Found professional profile for ${professionalId}`
    );

    // Mapper les champs depuis professionals vers ProfessionalPublicData
    // name: utiliser name directement (pas de fullName/displayName dans professionals)
    const displayName = data.name || "";

    // profileImage: utiliser profileImage directement (pas de photoUrl/profilePhotoUrl/avatarUrl dans professionals)
    const photoURL = data.profileImage || "";

    // specialty: utiliser specialty ou primarySpecialty
    const specialty = data.specialty || data.primarySpecialty || "";

    // bio: utiliser description ou shortBio
    const bio = data.description || data.shortBio || data.bio || "";

    return {
      name: displayName || "Professionnel",
      specialty: specialty || undefined,
      primarySpecialty: data.primarySpecialty || data.specialty || undefined,
      profileImage: photoURL || undefined,
      type: data.type || undefined,
      languages: Array.isArray(data.languages) ? data.languages : undefined,
      shortBio: bio || undefined,
      bio: bio || undefined,
      isApproved: data.isApproved !== undefined ? data.isApproved : false,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
    };
  } catch (error) {
    console.error(
      `❌ [HOMEPAGE] Error fetching professional ${professionalId}:`,
      error
    );
    return null;
  }
}

// Backfill : copier tous les professionnels vers professionals_public
export async function backfillProfessionalsPublic(): Promise<number> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    console.log("[BACKFILL] Starting backfill of professionals_public...");

    const professionalsRef = collection(db, "professionals");
    const professionalsSnapshot = await getDocs(professionalsRef);

    console.log(
      `[BACKFILL] Found ${professionalsSnapshot.docs.length} professionals in professionals collection`
    );

    let copiedCount = 0;

    for (const professionalDoc of professionalsSnapshot.docs) {
      const professionalId = professionalDoc.id;
      try {
        await syncProfessionalToPublic(professionalId);
        copiedCount++;
        console.log(
          `[BACKFILL] Copied professional ${professionalId} to professionals_public`
        );
      } catch (error) {
        console.error(
          `[BACKFILL] ❌ Error copying professional ${professionalId}:`,
          error
        );
        // Continue avec les autres même en cas d'erreur
      }
    }

    console.log(
      `[BACKFILL] ✅ Backfill complete: ${copiedCount} professionals copied to professionals_public`
    );
    return copiedCount;
  } catch (error) {
    console.error("[BACKFILL] ❌ Error during backfill:", error);
    throw error;
  }
}

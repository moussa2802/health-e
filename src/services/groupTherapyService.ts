import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { getFirestoreInstance, ensureFirestoreReady } from "../utils/firebase";
import { retryFirestoreOperation } from "../utils/firebase";

// Types pour les sessions de thérapie de groupe (structure Firestore réelle)
export interface GroupTherapySession {
  id: string;
  title: string;
  description: string;
  price: number; // 0 = gratuit
  date: string; // Format "YYYY-MM-DD"
  time: string; // Format "HH:mm"
  capacity: number; // Nombre maximum de participants
  participants: string[]; // Array d'userIds
  participantsCount?: number; // Nombre de participants (dérivé de participants.length)
  registrationsCount?: number; // Nombre d'inscriptions (mis à jour par transaction atomique)
  primaryHostId: string;
  secondaryHostIds: string[];
  isActive: boolean;
  isCompleted: boolean;
  meetingLink?: string;
  meetingStatus?: "closed" | "open"; // Statut de la réunion: "closed" par défaut, "open" quand le professionnel démarre
  openedBy?: string; // UID du professionnel qui a ouvert la réunion
  openedAt?: Timestamp; // Timestamp quand la réunion a été ouverte
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface GroupTherapyRegistration {
  id: string;
  userId: string;
  createdAt: Timestamp;
}

export interface CreateGroupTherapySessionData {
  title: string;
  description: string;
  price: number;
  date: string;
  time: string;
  capacity: number;
  primaryHostId: string;
  secondaryHostIds: string[];
  createdBy: string;
}

// Récupérer les sessions actives depuis group_therapy_sessions (pour la homepage)
export async function getActiveGroupTherapySessions(): Promise<
  GroupTherapySession[]
> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionsRef = collection(db, "group_therapy_sessions");
    console.log("[HOMEPAGE] Querying collection: group_therapy_sessions");

    // Filtrer directement avec where pour les sessions actives et non terminées
    const q = query(
      sessionsRef,
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const snapshot = await retryFirestoreOperation(
      async () => {
        return await getDocs(q);
      },
      3,
      1000
    );
    console.log(
      `[HOMEPAGE] Found ${snapshot.docs.length} active sessions in group_therapy_sessions`
    );

    // Charger les sessions et vérifier/corriger registrationsCount si nécessaire
    const sessionsWithCounts = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const sessionId = doc.id;

        // S'assurer que participants est toujours un tableau
        const participants = Array.isArray(data.participants)
          ? data.participants
          : [];

        // Vérifier si registrationsCount est correct en comptant les inscriptions réelles
        let registrationsCount = data.registrationsCount ?? 0;

        // Si registrationsCount est 0, vérifier s'il y a vraiment des inscriptions
        if (registrationsCount === 0) {
          try {
            const registrationsRef = collection(
              db,
              "group_therapy_sessions",
              sessionId,
              "registrations"
            );
            const registrationsSnapshot = await getDocs(registrationsRef);
            const actualCount = registrationsSnapshot.docs.length;
            if (actualCount > 0) {
              console.warn(
                `⚠️ [HOMEPAGE] Session ${sessionId} has registrationsCount=0 but ${actualCount} actual registrations. Using actual count.`
              );
              registrationsCount = actualCount;
            }
          } catch (error) {
            console.error(
              `❌ [HOMEPAGE] Error counting registrations for session ${sessionId}:`,
              error
            );
            // Continuer avec registrationsCount = 0 en cas d'erreur
          }
        }

        return {
          id: sessionId,
          title: data.title || "",
          description: data.description || "",
          price: data.price ?? 0,
          date: data.date || "",
          time: data.time || "",
          capacity: data.capacity || 0,
          participants: participants,
          // ✅ Source de vérité pour l'affichage
          participantsCount: registrationsCount,
          registrationsCount: registrationsCount,
          primaryHostId: data.primaryHostId || "",
          secondaryHostIds: (data.secondaryHostIds as string[]) || [],
          isActive: data.isActive !== undefined ? data.isActive : true,
          isCompleted: data.isCompleted ?? false,
          // Ne pas inclure meetingLink, meetingStatus, openedBy, openedAt dans la réponse publique
          meetingLink: undefined,
          meetingStatus: undefined,
          openedBy: undefined,
          openedAt: undefined,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || null,
        } as GroupTherapySession;
      })
    );

    const sessions = sessionsWithCounts.filter(
      (session) => !session.isCompleted
    ); // Filtrer les sessions terminées

    console.log(`✅ [GROUP_THERAPY] Loaded ${sessions.length} active sessions`);
    return sessions;
  } catch (error) {
    console.error("❌ Error fetching group therapy sessions:", error);
    // Retourner un tableau vide plutôt que de lancer une erreur pour ne pas casser l'affichage
    return [];
  }
}

// Récupérer toutes les sessions (admin)
export async function getAllGroupTherapySessions(): Promise<
  GroupTherapySession[]
> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionsRef = collection(db, "group_therapy_sessions");
    const q = query(sessionsRef, orderBy("createdAt", "desc"));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      // S'assurer que participants est toujours un tableau
      const participants = Array.isArray(data.participants)
        ? data.participants
        : [];
      const registrationsCount = data.registrationsCount ?? 0;
      return {
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        price: data.price ?? 0,
        date: data.date || "",
        time: data.time || "",
        capacity: data.capacity || 0,
        participants: participants,
        // ✅ Source de vérité pour l'affichage
        participantsCount: registrationsCount,
        registrationsCount: registrationsCount,
        primaryHostId: data.primaryHostId || "",
        secondaryHostIds: data.secondaryHostIds || [],
        isActive: data.isActive ?? true,
        isCompleted: data.isCompleted ?? false,
        meetingLink: data.meetingLink || "",
        meetingStatus: data.meetingStatus || "closed",
        openedBy: data.openedBy || undefined,
        openedAt: data.openedAt || undefined,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || null,
      } as GroupTherapySession;
    });
  } catch (error) {
    console.error("Error fetching all group therapy sessions:", error);
    throw error;
  }
}

// Récupérer les sessions où un patient est inscrit (stratégie simple sans collectionGroup)
export async function getPatientGroupTherapySessions(
  userId: string
): Promise<GroupTherapySession[]> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    console.log(
      `🔄 [PATIENT_SESSIONS] Récupération des sessions pour userId=${userId}`
    );

    // a) Lire les sessions actives depuis group_therapy_sessions
    const sessionsRef = collection(db, "group_therapy_sessions");
    const q = query(
      sessionsRef,
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const sessionsSnapshot = await getDocs(q);
    console.log(
      `📋 [PATIENT_SESSIONS] ${sessionsSnapshot.docs.length} sessions actives trouvées`
    );

    if (sessionsSnapshot.docs.length === 0) {
      return [];
    }

    // b) Pour chaque session, vérifier l'inscription via getDoc
    const sessionPromises = sessionsSnapshot.docs.map(async (sessionDoc) => {
      const sessionId = sessionDoc.id;
      const registrationRef = doc(
        db,
        "group_therapy_sessions",
        sessionId,
        "registrations",
        userId
      );

      try {
        const registrationDoc = await getDoc(registrationRef);
        const isRegistered = registrationDoc.exists();

        if (!isRegistered) {
          return null; // Patient non inscrit à cette session
        }

        // c) Si registration existe, retourner la session avec registrationsCount
        const data = sessionDoc.data();
        const registrationsCount = data.registrationsCount ?? 0;

        return {
          id: sessionId,
          title: data.title || "",
          description: data.description || "",
          price: data.price ?? 0,
          date: data.date || "",
          time: data.time || "",
          capacity: data.capacity || 0,
          participants: [], // Ne pas utiliser participants
          participantsCount: registrationsCount,
          registrationsCount: registrationsCount,
          primaryHostId: data.primaryHostId || "",
          secondaryHostIds: data.secondaryHostIds || [],
          isActive: data.isActive ?? true,
          isCompleted: data.isCompleted ?? false,
          // Garder meetingStatus et meetingLink depuis le doc principal
          meetingLink: data.meetingLink || undefined,
          meetingStatus: data.meetingStatus || undefined,
          openedBy: data.openedBy || undefined,
          openedAt: data.openedAt || undefined,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || null,
        } as GroupTherapySession;
      } catch (error) {
        console.error(
          `❌ [PATIENT_SESSIONS] Error checking registration for session ${sessionId}:`,
          error
        );
        return null;
      }
    });

    const sessions = (await Promise.all(sessionPromises))
      .filter((session): session is GroupTherapySession => session !== null)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

    console.log(
      `✅ [PATIENT_SESSIONS] ${sessions.length} sessions chargées pour userId=${userId}`
    );
    return sessions;
  } catch (error) {
    console.error("Error fetching patient group therapy sessions:", error);
    throw error;
  }
}

// Récupérer les sessions où un professionnel est host (primary ou secondary)
export async function getProfessionalGroupTherapySessions(
  professionalId: string
): Promise<GroupTherapySession[]> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionsRef = collection(db, "group_therapy_sessions");
    const snapshot = await getDocs(sessionsRef);

    const sessions = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        // S'assurer que participants est toujours un tableau
        const participants = Array.isArray(data.participants)
          ? data.participants
          : [];
        const registrationsCount = data.registrationsCount ?? 0;
        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          price: data.price ?? 0,
          date: data.date || "",
          time: data.time || "",
          capacity: data.capacity || 0,
          participants: participants,
          // ✅ Source de vérité pour l'affichage
          participantsCount: registrationsCount,
          registrationsCount: registrationsCount,
          primaryHostId: data.primaryHostId || "",
          secondaryHostIds: data.secondaryHostIds || [],
          isActive: data.isActive ?? true,
          isCompleted: data.isCompleted ?? false,
          // Ne pas inclure les champs privés
          meetingLink: undefined,
          meetingStatus: undefined,
          openedBy: undefined,
          openedAt: undefined,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || null,
        } as GroupTherapySession;
      })
      .filter(
        (session) =>
          session.primaryHostId === professionalId ||
          session.secondaryHostIds?.includes(professionalId)
      )
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

    return sessions;
  } catch (error) {
    console.error("Error fetching professional group therapy sessions:", error);
    throw error;
  }
}

// Récupérer une session par ID (sans les infos de réunion privées)
export async function getGroupTherapySession(
  sessionId: string
): Promise<GroupTherapySession | null> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return null;
    }

    const data = sessionSnap.data();
    // S'assurer que participants est toujours un tableau
    const participants = Array.isArray(data.participants)
      ? data.participants
      : [];
    const registrationsCount = data.registrationsCount ?? 0;
    return {
      id: sessionSnap.id,
      title: data.title || "",
      description: data.description || "",
      price: data.price ?? 0,
      date: data.date || "",
      time: data.time || "",
      capacity: data.capacity || 0,
      participants: participants,
      // ✅ Source de vérité pour l'affichage
      participantsCount: registrationsCount,
      registrationsCount: registrationsCount,
      primaryHostId: data.primaryHostId || "",
      secondaryHostIds: data.secondaryHostIds || [],
      isActive: data.isActive !== undefined ? data.isActive : true, // Par défaut true si non défini
      isCompleted: data.isCompleted ?? false,
      // Ne pas inclure les champs privés (seront récupérés depuis private/meeting si nécessaire)
      meetingLink: undefined,
      meetingStatus: undefined,
      openedBy: undefined,
      openedAt: undefined,
      createdAt: data.createdAt || Timestamp.now(),
      updatedAt: data.updatedAt || null,
    } as GroupTherapySession;
  } catch (error) {
    console.error("Error fetching group therapy session:", error);
    throw error;
  }
}

// Créer une nouvelle session
export async function createGroupTherapySession(
  data: CreateGroupTherapySessionData
): Promise<string> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionsRef = collection(db, "group_therapy_sessions");

    // Générer une référence de document avec un ID auto-généré
    const sessionRef = doc(sessionsRef);
    const sessionId = sessionRef.id;

    // Construire l'objet de données du document principal (sans champs sensibles)
    const sessionData: Record<string, unknown> = {
      title: data.title,
      description: data.description,
      price: data.price ?? 0,
      date: data.date,
      time: data.time,
      capacity: data.capacity,
      participants: [], // Source de vérité pour le nombre de participants
      registrationsCount: 0, // Mis à jour par transaction atomique lors des inscriptions
      primaryHostId: data.primaryHostId,
      secondaryHostIds: data.secondaryHostIds || [],
      isActive: true,
      isCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Créer le document principal (sans meetingLink, meetingStatus, openedBy, openedAt)
    await retryFirestoreOperation(async () => {
      return await setDoc(sessionRef, sessionData);
    });

    // Créer le document privé pour les informations de réunion
    // meetingLink sera généré lors de l'ouverture de la réunion
    const privateMeetingRef = doc(
      db,
      "group_therapy_sessions",
      sessionId,
      "private",
      "meeting"
    );
    const privateMeetingData: Record<string, unknown> = {
      meetingStatus: "closed",
      meetingLink: "", // Vide initialement, sera généré lors de l'ouverture
      openedBy: null,
      openedAt: null,
      updatedAt: serverTimestamp(),
    };

    await retryFirestoreOperation(async () => {
      return await setDoc(privateMeetingRef, privateMeetingData);
    });

    console.log(
      "✅ Group therapy session created with private meeting doc:",
      sessionId
    );
    return sessionId;
  } catch (error) {
    console.error("Error creating group therapy session:", error);
    throw error;
  }
}

// Vérifier si un utilisateur est déjà inscrit (via la sous-collection registrations)
export async function isUserRegisteredInSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Vérifier dans la sous-collection registrations
    const registrationRef = doc(
      db,
      "group_therapy_sessions",
      sessionId,
      "registrations",
      userId
    );
    const registrationDoc = await getDoc(registrationRef);

    return registrationDoc.exists();
  } catch (error) {
    console.error("Error checking user registration:", error);
    throw error;
  }
}

// Inscrire un utilisateur à une session (via la sous-collection registrations)
// Utilise une transaction atomique pour garantir la cohérence du compteur
// Retourne { status: "registered" } si succès, { status: "alreadyRegistered" } si déjà inscrit
export async function registerUserToSession(
  sessionId: string,
  userId: string
): Promise<{ status: "registered" } | { status: "alreadyRegistered" }> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    console.log(
      `🔄 [REGISTRATION] Tentative d'inscription: sessionId=${sessionId}, userId=${userId}`
    );

    // Références pour la transaction
    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    const registrationRef = doc(
      db,
      "group_therapy_sessions",
      sessionId,
      "registrations",
      userId
    );

    // Transaction atomique
    const result = await runTransaction(db, async (transaction) => {
      // a) Lire le doc session
      const sessionDoc = await transaction.get(sessionRef);

      // b) Vérifier session.exists
      if (!sessionDoc.exists()) {
        throw new Error("Session not found");
      }

      const sessionData = sessionDoc.data();

      // c) Vérifier isActive == true, isCompleted != true
      if (sessionData.isActive !== true) {
        throw new Error("Session is not active");
      }
      if (sessionData.isCompleted === true) {
        throw new Error("Session is already completed");
      }

      // d) Vérifier capacity > (registrationsCount ?? 0)
      const currentCount = sessionData.registrationsCount ?? 0;
      const capacity = sessionData.capacity ?? 0;
      if (currentCount >= capacity) {
        throw new Error("Session is full");
      }

      // e) Lire le doc registration dans la transaction
      const registrationDoc = await transaction.get(registrationRef);

      // f) Si registration existe déjà => retourner alreadyRegistered
      if (registrationDoc.exists()) {
        console.log(
          `ℹ️ [REGISTRATION] User ${userId} already registered to session ${sessionId}`
        );
        return { status: "alreadyRegistered" as const };
      }

      // g) Sinon : créer registration + incrémenter registrationsCount
      // Utiliser increment() pour garantir l'atomicité même en cas de transactions concurrentes
      transaction.set(registrationRef, {
        userId: userId,
        createdAt: serverTimestamp(),
      });

      transaction.update(sessionRef, {
        registrationsCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      console.log(
        `✅ [REGISTRATION] Transaction prepared: registration created, count will be incremented from ${currentCount}`
      );
      return { status: "registered" as const };
    });

    console.log(
      `✅ [REGISTRATION] Transaction committed: status=${result.status}, sessionId=${sessionId}, userId=${userId}`
    );
    return result;
  } catch (error: unknown) {
    console.error(
      `❌ [REGISTRATION] Error in transaction: sessionId=${sessionId}, userId=${userId}`,
      error
    );

    // NE PAS masquer les erreurs de permission
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "permission-denied") {
      console.error(
        `❌ [REGISTRATION] Permission refusée - problème de règles Firestore ou d'authentification`
      );
      throw error;
    }

    throw error;
  }
}

// Désinscrire un utilisateur d'une session (via transaction atomique)
// Retourne { status: "unregistered" } si succès, { status: "notRegistered" } si pas inscrit
export async function unregisterUserFromSession(
  sessionId: string,
  userId: string
): Promise<{ status: "unregistered" } | { status: "notRegistered" }> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    console.log(
      `🔄 [UNREGISTRATION] Tentative de désinscription: sessionId=${sessionId}, userId=${userId}`
    );

    // Références pour la transaction
    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    const registrationRef = doc(
      db,
      "group_therapy_sessions",
      sessionId,
      "registrations",
      userId
    );

    // Transaction atomique
    const result = await runTransaction(db, async (transaction) => {
      // a) Lire session + registration doc
      const sessionDoc = await transaction.get(sessionRef);
      const registrationDoc = await transaction.get(registrationRef);

      // b) Si registration n'existe pas => status "notRegistered"
      if (!registrationDoc.exists()) {
        console.log(
          `ℹ️ [UNREGISTRATION] User ${userId} not registered to session ${sessionId}`
        );
        return { status: "notRegistered" as const };
      }

      // c) Sinon : supprimer registration + décrémenter registrationsCount
      const sessionData = sessionDoc.exists() ? sessionDoc.data() : {};
      const currentCount = sessionData.registrationsCount ?? 0;

      transaction.delete(registrationRef);
      transaction.update(sessionRef, {
        registrationsCount: Math.max(currentCount - 1, 0),
        updatedAt: serverTimestamp(),
      });

      console.log(
        `✅ [UNREGISTRATION] Transaction prepared: registration deleted, count will be ${Math.max(
          currentCount - 1,
          0
        )}`
      );
      return { status: "unregistered" as const };
    });

    console.log(
      `✅ [UNREGISTRATION] Transaction committed: status=${result.status}, sessionId=${sessionId}, userId=${userId}`
    );
    return result;
  } catch (error: unknown) {
    console.error(
      `❌ [UNREGISTRATION] Error in transaction: sessionId=${sessionId}, userId=${userId}`,
      error
    );
    throw error;
  }
}

// Récupérer les participants d'une session (depuis la sous-collection registrations)
export async function getSessionParticipants(
  sessionId: string
): Promise<string[]> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const registrationsRef = collection(
      db,
      "group_therapy_sessions",
      sessionId,
      "registrations"
    );
    const registrationsSnapshot = await getDocs(registrationsRef);

    return registrationsSnapshot.docs.map((doc) => doc.data().userId || doc.id);
  } catch (error) {
    console.error("Error fetching session participants:", error);
    throw error;
  }
}

// Mettre à jour le statut d'une session
export async function updateSessionStatus(
  sessionId: string,
  isActive: boolean
): Promise<void> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    await updateDoc(sessionRef, {
      isActive,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Session status updated:", sessionId);
  } catch (error) {
    console.error("Error updating session status:", error);
    throw error;
  }
}

// Marquer une session comme terminée
export async function markSessionAsCompleted(sessionId: string): Promise<void> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    await updateDoc(sessionRef, {
      isCompleted: true,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Session marked as completed:", sessionId);
  } catch (error) {
    console.error("Error marking session as completed:", error);
    throw error;
  }
}

// Marquer une session comme non terminée (annuler le statut "terminé")
export async function markSessionAsNotCompleted(
  sessionId: string
): Promise<void> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    await updateDoc(sessionRef, {
      isCompleted: false,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Session marked as not completed:", sessionId);
  } catch (error) {
    console.error("Error marking session as not completed:", error);
    throw error;
  }
}

// Mettre à jour une session
export async function updateGroupTherapySession(
  sessionId: string,
  data: Partial<CreateGroupTherapySessionData>
): Promise<void> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.price !== undefined) {
      updateData.price = data.price;
    }
    if (data.date !== undefined) {
      updateData.date = data.date;
    }
    if (data.time !== undefined) {
      updateData.time = data.time;
    }
    if (data.capacity !== undefined) {
      updateData.capacity = data.capacity;
    }
    if (data.primaryHostId !== undefined) {
      updateData.primaryHostId = data.primaryHostId;
    }
    if (data.secondaryHostIds !== undefined) {
      updateData.secondaryHostIds = data.secondaryHostIds;
    }

    await updateDoc(sessionRef, updateData);

    console.log("✅ Session updated:", sessionId);
  } catch (error) {
    console.error("Error updating session:", error);
    throw error;
  }
}

// Récupérer les informations de réunion depuis private/meeting
export async function getMeetingInfo(sessionId: string): Promise<{
  meetingLink: string;
  meetingStatus: "closed" | "open";
  openedBy: string | null;
  openedAt: Timestamp | null;
} | null> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const privateMeetingRef = doc(
      db,
      "group_therapy_sessions",
      sessionId,
      "private",
      "meeting"
    );
    const meetingDoc = await getDoc(privateMeetingRef);

    if (!meetingDoc.exists()) {
      return null;
    }

    const data = meetingDoc.data();
    return {
      meetingLink: data.meetingLink || "",
      meetingStatus: data.meetingStatus || "closed",
      openedBy: data.openedBy || null,
      openedAt: data.openedAt || null,
    };
  } catch (error) {
    console.error("Error fetching meeting info:", error);
    return null;
  }
}

// Ouvrir la réunion (démarrer la réunion pour les patients)
// Retourne le meetingLink pour ouvrir directement la réunion
export async function openGroupTherapyMeeting(
  sessionId: string,
  professionalId: string
): Promise<string> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      throw new Error("Session not found");
    }

    const sessionData = sessionDoc.data();
    const primaryHostId = sessionData.primaryHostId as string;
    const secondaryHostIds = (sessionData.secondaryHostIds as string[]) || [];

    // Vérifier que le professionnel est bien hôte (primary ou secondary)
    const isHost =
      professionalId === primaryHostId ||
      secondaryHostIds.includes(professionalId);

    if (!isHost) {
      throw new Error(
        "Only host professionals can open group therapy meetings"
      );
    }

    // Récupérer ou créer le document private/meeting
    const privateMeetingRef = doc(
      db,
      "group_therapy_sessions",
      sessionId,
      "private",
      "meeting"
    );
    const meetingDoc = await getDoc(privateMeetingRef);

    let meetingLink = "";
    if (meetingDoc.exists()) {
      meetingLink = meetingDoc.data().meetingLink || "";
    }

    // Si le meetingLink n'existe pas, le générer
    if (!meetingLink) {
      meetingLink = `https://meet.health-e.sn/group-therapy-${sessionId}`;
    }

    // Préparer le payload pour private/meeting
    const meetingPayload = {
      meetingStatus: "open",
      openedBy: professionalId,
      openedAt: serverTimestamp(),
      meetingLink: meetingLink,
      updatedAt: serverTimestamp(),
    };

    // Mettre à jour le document principal group_therapy_sessions/{sessionId}
    await updateDoc(sessionRef, {
      meetingStatus: "open",
      openedBy: professionalId,
      openedAt: serverTimestamp(),
      meetingLink: meetingLink,
      updatedAt: serverTimestamp(),
    });

    // Mettre à jour ou créer le document private/meeting
    // a) Essayer updateDoc d'abord
    try {
      await updateDoc(privateMeetingRef, meetingPayload);
    } catch (updateError: unknown) {
      // b) Si erreur "not-found" ou document absent, créer avec setDoc
      const error = updateError as { code?: string; message?: string };
      if (
        error?.code === "not-found" ||
        error?.message?.includes("No document to update") ||
        !meetingDoc.exists()
      ) {
        await setDoc(privateMeetingRef, meetingPayload, { merge: true });
      } else {
        // Si c'est une autre erreur, la propager
        throw updateError;
      }
    }

    console.log(
      "✅ Group therapy meeting opened:",
      sessionId,
      "by",
      professionalId,
      "link:",
      meetingLink
    );

    return meetingLink;
  } catch (error) {
    console.error("Error opening group therapy meeting:", error);
    throw error;
  }
}

// Supprimer une session
export async function deleteGroupTherapySession(
  sessionId: string
): Promise<void> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const sessionRef = doc(db, "group_therapy_sessions", sessionId);
    await retryFirestoreOperation(async () => {
      // Supprimer complètement la session (les sous-collections seront supprimées automatiquement)
      return await deleteDoc(sessionRef);
    });

    console.log("✅ Session deleted:", sessionId);
  } catch (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
}

// Interface pour les statistiques d'un participant
export interface ParticipantStats {
  userId: string;
  userName: string;
  sessionCount: number;
  sessionIds: string[];
  sessionTitles: string[];
}

// Récupérer les statistiques des participants
export async function getGroupTherapyStatistics(): Promise<ParticipantStats[]> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Récupérer toutes les sessions
    const sessionsRef = collection(db, "group_therapy_sessions");
    const sessionsSnapshot = await getDocs(sessionsRef);

    // Agréger les données par participant depuis la sous-collection registrations
    const participantMap = new Map<
      string,
      { sessionIds: string[]; sessionTitles: string[] }
    >();

    // Parcourir chaque session et récupérer ses inscriptions
    await Promise.all(
      sessionsSnapshot.docs.map(async (sessionDoc) => {
        const sessionData = sessionDoc.data();
        const sessionId = sessionDoc.id;
        const sessionTitle = sessionData.title || "Sans titre";

        // Récupérer les inscriptions depuis la sous-collection registrations
        const registrationsRef = collection(
          db,
          "group_therapy_sessions",
          sessionId,
          "registrations"
        );
        const registrationsSnapshot = await getDocs(registrationsRef);

        registrationsSnapshot.docs.forEach((registrationDoc) => {
          const userId = registrationDoc.data().userId || registrationDoc.id;

          if (!participantMap.has(userId)) {
            participantMap.set(userId, { sessionIds: [], sessionTitles: [] });
          }
          const stats = participantMap.get(userId)!;
          if (!stats.sessionIds.includes(sessionId)) {
            stats.sessionIds.push(sessionId);
            stats.sessionTitles.push(sessionTitle);
          }
        });
      })
    );

    // Récupérer les noms des utilisateurs
    const statsArray: ParticipantStats[] = [];

    await Promise.all(
      Array.from(participantMap.entries()).map(async ([userId, data]) => {
        let userName = userId;
        try {
          const userRef = doc(db, "users", userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userName = userData.name || userId;
          }
        } catch (error) {
          console.error(`Error fetching user name for ${userId}:`, error);
        }

        statsArray.push({
          userId,
          userName,
          sessionCount: data.sessionIds.length,
          sessionIds: data.sessionIds,
          sessionTitles: data.sessionTitles,
        });
      })
    );

    // Trier par nombre de sessions (décroissant)
    statsArray.sort((a, b) => b.sessionCount - a.sessionCount);

    console.log(
      "✅ Group therapy statistics retrieved:",
      statsArray.length,
      "participants"
    );
    return statsArray;
  } catch (error) {
    console.error("Error getting group therapy statistics:", error);
    throw error;
  }
}

// Backfill : Corriger les compteurs registrationsCount en comptant les documents dans registrations
export async function backfillRegistrationsCountForSessions(): Promise<{
  updated: number;
}> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    console.log("[BACKFILL] Starting backfill of registrationsCount...");

    // Récupérer toutes les sessions actives (ou toutes si nécessaire)
    const sessionsRef = collection(db, "group_therapy_sessions");
    const sessionsSnapshot = await getDocs(sessionsRef);

    console.log(
      `[BACKFILL] Found ${sessionsSnapshot.docs.length} sessions to process`
    );

    let updatedCount = 0;

    // Traiter chaque session
    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionId = sessionDoc.id;
      const sessionData = sessionDoc.data();

      try {
        // Compter les documents dans la sous-collection registrations
        const registrationsRef = collection(
          db,
          "group_therapy_sessions",
          sessionId,
          "registrations"
        );
        const registrationsSnapshot = await getDocs(registrationsRef);
        const actualCount = registrationsSnapshot.docs.length;

        // Comparer avec le registrationsCount actuel
        const currentCount = sessionData.registrationsCount ?? 0;

        if (actualCount !== currentCount) {
          // Mettre à jour le compteur
          const sessionRef = doc(db, "group_therapy_sessions", sessionId);
          await updateDoc(sessionRef, {
            registrationsCount: actualCount,
            updatedAt: serverTimestamp(),
          });

          console.log(
            `[BACKFILL] Updated session ${sessionId}: ${currentCount} → ${actualCount}`
          );
          updatedCount++;
        } else {
          console.log(
            `[BACKFILL] Session ${sessionId} already correct: ${actualCount}`
          );
        }
      } catch (error) {
        console.error(
          `[BACKFILL] ❌ Error processing session ${sessionId}:`,
          error
        );
        // Continue avec les autres sessions même en cas d'erreur
      }
    }

    // Note: La vérification des sessions orphelines (inscriptions sans document principal)
    // nécessiterait collectionGroup, mais on l'a supprimé pour simplifier.
    // L'admin peut utiliser cette fonction pour corriger les compteurs des sessions existantes.

    console.log(
      `[BACKFILL] ✅ Backfill complete: ${updatedCount} sessions updated out of ${sessionsSnapshot.docs.length}`
    );
    return { updated: updatedCount };
  } catch (error) {
    console.error("[BACKFILL] ❌ Error during backfill:", error);
    throw error;
  }
}

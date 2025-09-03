import { getFirestoreInstance } from "../utils/firebase"; // Use getter function instead of direct import
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDoc,
  FieldValue,
} from "firebase/firestore";
import { getDatabase, ref, set } from "firebase/database";
import {
  retryFirestoreOperation,
  isFirestoreInternalError,
  resetFirestoreConnection,
  ensureFirestoreReady,
} from "../utils/firebase";
import { createNotification } from "./notificationService";
import { normalizeDate } from "../utils/dateUtils";
import { getAuth } from "firebase/auth";
import { app } from "../utils/firebase";

// Types pour les réservations
export interface Booking {
  id: string;
  patientId: string;
  professionalId: string;
  patientName: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "video" | "audio" | "chat";
  status: "pending" | "confirmed" | "completed" | "cancelled";
  duration: number;
  price: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateBookingData {
  patientId: string;
  professionalId: string;
  patientName: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "video" | "audio" | "chat";
  duration: number;
  price: number;
  notes?: string;
}

// CRITICAL: Global registry to prevent duplicate listeners with unique IDs
const activeBookingListeners = new Map<string, () => void>();
let bookingListenerIdCounter = 0;

// Créer une nouvelle réservation avec gestion d'erreur
export async function createBooking(
  bookingData: CreateBookingData
): Promise<string> {
  try {
    console.log(
      "📝 Creating new booking...",
      JSON.stringify(bookingData, null, 2)
    );
    console.log(
      "⏰ Vérification des heures - startTime:",
      bookingData.startTime,
      "- endTime:",
      bookingData.endTime
    );

    // CRITICAL: Ensure Firestore is ready before creating booking
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Vérifier l'authentification
    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    console.log("🔐 Current user:", currentUser?.uid);
    console.log("🔐 User authenticated:", !!currentUser);

    if (!currentUser) {
      throw new Error("Utilisateur non authentifié");
    }

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");
    console.log("📁 Using bookings collection:", bookingsRef.path);

    // Vérifier si le créneau est déjà réservé
    const conflictingQuery = query(
      bookingsRef,
      where("professionalId", "==", bookingData.professionalId),
      where("date", "==", bookingData.date),
      where("startTime", "==", bookingData.startTime.trim()),
      where("status", "in", ["confirmed", "pending"]) // statuts actifs
    );

    console.log("🔍 Checking for conflicting bookings...");
    const conflictingSnap = await getDocs(conflictingQuery);
    if (!conflictingSnap.empty) {
      console.warn(
        "❌ Créneau déjà réservé :",
        bookingData.date,
        bookingData.startTime
      );
      throw new Error(
        "Ce créneau est déjà réservé. Veuillez en choisir un autre."
      );
    }
    console.log("✅ No conflicting bookings found");

    const result = await retryFirestoreOperation(async () => {
      const bookingWithDefaults = {
        ...bookingData,
        // Assurez-vous que les heures sont correctement formatées
        date: bookingData.date, // Garder la date telle quelle
        startTime: bookingData.startTime.trim(), // Garder l'heure telle quelle
        endTime: bookingData.endTime.trim(), // Garder l'heure telle quelle
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log(
        "📝 Création finale de la réservation avec les données:",
        JSON.stringify(bookingWithDefaults, null, 2)
      );
      console.log("🔐 User ID for booking:", currentUser.uid);
      console.log("🔐 Patient ID in booking data:", bookingData.patientId);
      console.log(
        "🔐 User matches patient:",
        currentUser.uid === bookingData.patientId
      );

      return await addDoc(bookingsRef, bookingWithDefaults);
    });

    console.log("✅ Booking document created with ID:", result.id);

    await createNotification(
      bookingData.professionalId,
      "appointment_request",
      "Nouvelle demande de rendez-vous",
      `Vous avez reçu une demande de rendez-vous de la part de ${bookingData.patientName} pour le ${bookingData.date} à ${bookingData.startTime}`,
      result.id,
      "booking"
    );
    console.log("✅ Booking created successfully:", result.id);
    return result.id;
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    console.error("❌ Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    throw new Error("Impossible de créer la réservation. Veuillez réessayer.");
  }
}

// Récupérer toutes les réservations avec gestion d'erreur
export async function getBookings(): Promise<Booking[]> {
  try {
    console.log("📖 Fetching all bookings...");
    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.warn("⛔️ Utilisateur non authentifié. getBookings() annulé.");
      return [];
    }
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");

    // Check if collection exists
    const q = query(bookingsRef, where("professionalId", "==", uid));
    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });

    const bookings = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Booking)
    );

    console.log(`✅ Fetched ${bookings.length} bookings`);
    return bookings;
  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    return []; // Return empty array instead of throwing
  }
}

// Récupérer les réservations d'un utilisateur spécifique
export async function getUserBookings(
  userId: string,
  userType: "patient" | "professional"
): Promise<Booking[]> {
  try {
    console.log(`📖 Fetching bookings for ${userType}:`, userId);

    // CRITICAL: Verify user is authenticated
    if (!userId) {
      console.warn(
        "⛔️ Utilisateur non authentifié. Requête Firestore annulée."
      );
      return [];
    }

    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");

    const fieldName = userType === "patient" ? "patientId" : "professionalId";

    // Check if collection exists
    const q = query(bookingsRef, where(fieldName, "==", userId));

    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });

    // Sort by date on the client side to avoid index requirement
    const bookings = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Booking)
    );

    const sortedBookings = bookings.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    console.log(`✅ Fetched ${sortedBookings.length} bookings for user`);
    return sortedBookings;
  } catch (error) {
    console.error("❌ Error fetching user bookings:", error);
    return []; // Return empty array instead of throwing
  }
}

// S'abonner aux réservations en temps réel avec gestion d'erreur robuste
export function subscribeToBookings(
  userId: string,
  userType: "patient" | "professional" | "admin",
  callback: (bookings: Booking[]) => void
): () => void {
  // CRITICAL: Verify user is authenticated
  if (!userId) {
    console.warn("⛔️ Utilisateur non authentifié. Requête Firestore annulée.");
    callback([]);
    return () => {};
  }

  // Generate unique listener ID to prevent conflicts
  const listenerId = `bookings_${userType}_${userId}_${++bookingListenerIdCounter}_${Date.now()}`;

  console.log(
    `🔔 Setting up booking subscription for ${userType} with ID: ${listenerId}`
  );

  // Clean up any existing listener for this user/type combination
  const existingListenerId = Array.from(activeBookingListeners.keys()).find(
    (id) => id.startsWith(`bookings_${userType}_${userId}_`)
  );
  if (existingListenerId) {
    console.log(
      "🧹 Cleaning up existing booking listener:",
      existingListenerId
    );
    const cleanup = activeBookingListeners.get(existingListenerId);
    if (cleanup) {
      cleanup();
      activeBookingListeners.delete(existingListenerId);
    }
  }

  // CRITICAL: Only set up listener after Firestore is ready
  ensureFirestoreReady()
    .then((isReady) => {
      if (!isReady) {
        console.warn(
          "⚠️ Firestore not ready for booking subscription, providing empty data"
        );
        callback([]);
        return;
      }

      const db = getFirestoreInstance();
      if (!db) {
        console.warn(
          "❌ Firestore not initialized, cannot subscribe to bookings"
        );
        callback([]);
        return;
      }

      try {
        // Ensure bookings collection exists
        const bookingsRef = collection(db, "bookings");

        let q;

        if (userType === "admin") {
          // Les admins voient toutes les réservations
          q = bookingsRef;
        } else {
          // Patients et professionnels voient leurs propres réservations
          // Remove orderBy to avoid composite index requirement
          const fieldName =
            userType === "patient" ? "patientId" : "professionalId";
          q = query(bookingsRef, where(fieldName, "==", userId));
        }

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            try {
              const bookings: Booking[] = snapshot.docs.map(
                (doc) =>
                  ({
                    id: doc.id,
                    ...doc.data(),
                  } as Booking)
              );

              // Sort by date on the client side to avoid index requirement
              const sortedBookings = bookings.sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              );

              console.log(
                `✅ Received ${sortedBookings.length} bookings via subscription (listener: ${listenerId})`
              );

              callback(sortedBookings);
            } catch (error) {
              console.error(
                `❌ Error processing booking snapshot (listener: ${listenerId}):`,
                error
              );
              callback([]); // Provide fallback empty array
            }
          },
          async (error) => {
            console.error(
              `❌ Error in booking subscription (listener: ${listenerId}):`,
              error
            );

            // CRITICAL: Handle Firestore internal assertion failures
            if (isFirestoreInternalError(error)) {
              console.error(
                "🚨 Firestore internal assertion failure in bookings subscription, resetting connection..."
              );

              // Clean up this listener immediately
              if (activeBookingListeners.has(listenerId)) {
                const cleanup = activeBookingListeners.get(listenerId);
                if (cleanup) {
                  cleanup();
                  activeBookingListeners.delete(listenerId);
                }
              }

              try {
                await resetFirestoreConnection();
                console.log(
                  "✅ Firestore connection reset after internal assertion failure in bookings"
                );

                // Return empty array for now, the subscription will be retried
                callback([]);
              } catch (resetError) {
                console.warn(
                  "⚠️ Could not reset Firestore after internal assertion failure:",
                  resetError
                );
                callback([]);
              }
              return;
            }

            // Handle Target ID conflicts specifically
            if (
              error.message &&
              error.message.includes("Target ID already exists")
            ) {
              console.error(
                "🎯 Target ID conflict in bookings, cleaning up..."
              );

              // Clean up this listener immediately
              if (activeBookingListeners.has(listenerId)) {
                const cleanup = activeBookingListeners.get(listenerId);
                if (cleanup) {
                  cleanup();
                  activeBookingListeners.delete(listenerId);
                }
              }

              // Return empty array for now, the subscription will be retried
              callback([]);
              return;
            }

            // Provide specific error handling
            if (error.code === "failed-precondition") {
              console.warn(
                "⚠️ Firestore index required, falling back to empty data"
              );
            } else if (error.code === "unavailable") {
              console.warn("⚠️ Firestore temporarily unavailable");
            }

            // Always provide fallback empty array instead of crashing
            callback([]);
          }
        );

        // Store the listener with unique ID
        activeBookingListeners.set(listenerId, unsubscribe);
      } catch (error) {
        console.error(
          `❌ Error setting up booking subscription (listener: ${listenerId}):`,
          error
        );
        callback([]);
      }
    })
    .catch((error) => {
      console.error(
        `❌ Failed to ensure Firestore ready for booking subscription:`,
        error
      );
      callback([]);
    });

  return () => {
    console.log(`🧹 Cleaning up booking listener: ${listenerId}`);
    if (activeBookingListeners.has(listenerId)) {
      const cleanup = activeBookingListeners.get(listenerId);
      if (cleanup) {
        cleanup();
      }
      activeBookingListeners.delete(listenerId);
    }
  };
}

// Mettre à jour une réservation
export async function updateBooking(
  bookingId: string,
  bookingData: Partial<CreateBookingData>
): Promise<void> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const bookingRef = doc(db, "bookings", bookingId);

    // Préparer les données à mettre à jour
    const updateData = {
      ...bookingData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(bookingRef, updateData);
    console.log("✅ Booking updated successfully:", bookingId);
  } catch (error) {
    console.error("❌ Error updating booking:", error);
    throw error;
  }
}

// Mettre à jour le statut d'une réservation
export async function updateBookingStatus(
  bookingId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled"
): Promise<void> {
  try {
    console.log(`📝 Updating booking ${bookingId} status to:`, status);

    // CRITICAL: Ensure Firestore is ready before updating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");
    const bookingRef = doc(bookingsRef, bookingId);

    // Check if booking exists
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error("Réservation non trouvée");
    }

    await retryFirestoreOperation(async () => {
      return await updateDoc(bookingRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    });

    console.log("✅ Booking status updated successfully");
  } catch (error) {
    console.error("❌ Error updating booking status:", error);
    throw new Error(
      "Impossible de mettre à jour le statut. Veuillez réessayer."
    );
  }
}

// Annuler une réservation
export async function cancelBooking(bookingId: string): Promise<void> {
  try {
    await updateBookingStatus(bookingId, "cancelled");

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Récupérer les données de la réservation
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error("Réservation introuvable");
    }

    const bookingData = bookingSnap.data() as Booking;

    // 🔔 Notification Realtime (Realtime Database)
    // Utiliser les données normalisées pour éviter les problèmes de fuseau horaire
    const database = getDatabase();
    const statusChangeRef = ref(
      database,
      `booking_status_changes/${bookingData.patientId}/${bookingId}`
    );
    await set(statusChangeRef, {
      status: "cancelled",
      timestamp: Date.now(),
      professionalName: bookingData.professionalName,
      date: normalizeDate(bookingData.date) || bookingData.date,
      startTime: bookingData.startTime.trim(),
    });

    // 🔔 Notification Firestore
    await createNotification(
      bookingData.patientId,
      "appointment_cancelled",
      "Rendez-vous annulé",
      `Votre rendez-vous avec ${bookingData.professionalName} le ${bookingData.date} à ${bookingData.startTime} a été annulé.`,
      bookingId,
      "booking"
    );

    console.log("✅ Notification de l'annulation envoyée au patient");
  } catch (error) {
    console.error("❌ Error cancelling booking:", error);
    throw new Error("Impossible d'annuler la réservation. Veuillez réessayer.");
  }
}

// Confirmer une réservation
export async function confirmBooking(bookingId: string): Promise<void> {
  try {
    await updateBookingStatus(bookingId, "confirmed");

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Récupérer les données de la réservation
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error("Réservation introuvable");
    }

    const bookingData = bookingSnap.data() as Booking;

    // 🔔 Notification Realtime
    const database = getDatabase();
    const statusChangeRef = ref(
      database,
      `booking_status_changes/${bookingData.patientId}/${bookingId}`
    );
    await set(statusChangeRef, {
      status: "confirmed",
      timestamp: Date.now(),
      professionalName: bookingData.professionalName,
      date: normalizeDate(bookingData.date) || bookingData.date,
      startTime: bookingData.startTime.trim(),
    });

    // 🔔 Notification Firestore
    await createNotification(
      bookingData.patientId,
      "appointment_confirmed",
      "Rendez-vous confirmé",
      `Votre rendez-vous avec ${bookingData.professionalName} a été confirmé pour le ${bookingData.date} à ${bookingData.startTime}`,
      bookingId,
      "booking"
    );

    console.log("✅ Notification de confirmation envoyée au patient");
  } catch (error) {
    console.error("❌ Error confirming booking:", error);
    throw new Error(
      "Impossible de confirmer la réservation. Veuillez réessayer."
    );
  }
}

// Marquer une réservation comme terminée
export async function completeBooking(
  bookingId: string,
  notes?: string
): Promise<void> {
  try {
    console.log(`📝 Completing booking ${bookingId}...`);

    // CRITICAL: Ensure Firestore is ready before updating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");
    const bookingRef = doc(bookingsRef, bookingId);

    // Check if booking exists
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error("Réservation non trouvée");
    }

    await retryFirestoreOperation(async () => {
      const updateData: {
        status: "completed";
        updatedAt: FieldValue;
        notes?: string;
      } = {
        status: "completed",
        updatedAt: serverTimestamp(),
      };

      if (notes) {
        updateData.notes = notes;
      }

      return await updateDoc(bookingRef, updateData);
    });

    console.log("✅ Booking completed successfully");
  } catch (error) {
    console.error("❌ Error completing booking:", error);
    throw new Error(
      "Impossible de finaliser la réservation. Veuillez réessayer."
    );
  }
}

// Supprimer une réservation (admin uniquement)
export async function deleteBooking(bookingId: string): Promise<void> {
  try {
    console.log(`🗑️ Deleting booking ${bookingId}...`);

    // CRITICAL: Ensure Firestore is ready before deleting
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");
    const bookingRef = doc(bookingsRef, bookingId);

    // Check if booking exists
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error("Réservation non trouvée");
    }

    await retryFirestoreOperation(async () => {
      return await deleteDoc(bookingRef);
    });

    console.log("✅ Booking deleted successfully");
  } catch (error) {
    console.error("❌ Error deleting booking:", error);
    throw new Error(
      "Impossible de supprimer la réservation. Veuillez réessayer."
    );
  }
}

// Vérifier la disponibilité d'un créneau
export async function checkAvailability(
  professionalId: string,
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string
): Promise<boolean> {
  try {
    // Normaliser les entrées
    const date = normalizeDate(dateStr) || dateStr;
    const startTime = startTimeStr.trim();
    const endTime = endTimeStr.trim();

    console.log(
      `🔍 Vérification de disponibilité pour ${professionalId} le ${date} de ${startTime} à ${endTime}`
    );

    // CRITICAL: Verify professional ID is provided
    if (!professionalId) {
      console.warn(
        "⛔️ Professional ID not provided. Availability check cancelled."
      );
      return true; // Assume available to avoid blocking UI
    }

    // CRITICAL: Ensure Firestore is ready before checking
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");

    const q = query(
      bookingsRef,
      where("professionalId", "==", professionalId),
      where("date", "==", date), // Date normalisée
      where("status", "in", ["pending", "confirmed"])
    );

    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });

    // Vérifier les conflits d'horaires
    for (const doc of snapshot.docs) {
      const booking = doc.data() as Booking;
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime;

      // Vérifier si les créneaux se chevauchent
      if (
        (startTime >= bookingStart && startTime < bookingEnd) ||
        (endTime > bookingStart && endTime <= bookingEnd) ||
        (startTime <= bookingStart && endTime >= bookingEnd)
      ) {
        console.log(
          `❌ Conflit de créneau détecté: ${startTime}-${endTime} chevauche ${bookingStart}-${bookingEnd}`
        );
        return false; // Conflit détecté
      }
    }

    console.log("✅ Time slot available");
    return true; // Créneau disponible
  } catch (error) {
    console.error("❌ Error checking availability:", error);
    // En cas d'erreur, on assume que c'est disponible pour ne pas bloquer l'utilisateur
    return true;
  }
}

// Obtenir les statistiques des réservations
export async function getBookingStatistics() {
  try {
    console.log("📊 Fetching booking statistics...");

    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");

    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(bookingsRef);
    });

    const bookings = snapshot.docs.map((doc) => doc.data() as Booking);

    const total = bookings.length;
    const enAttente = bookings.filter((b) => b.status === "pending").length;
    const confirmées = bookings.filter((b) => b.status === "confirmed").length;
    const terminées = bookings.filter((b) => b.status === "completed").length;
    const annulées = bookings.filter((b) => b.status === "cancelled").length;

    const tauxAnnulation = total > 0 ? Math.round((annulées / total) * 100) : 0;
    const tauxCompletion =
      total > 0 ? Math.round((terminées / total) * 100) : 0;

    // Revenus totaux
    const revenuTotal = bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + b.price, 0);

    const stats = {
      total,
      enAttente,
      confirmées,
      terminées,
      annulées,
      tauxAnnulation,
      tauxCompletion,
      revenuTotal,
    };

    console.log("✅ Booking statistics calculated:", stats);
    return stats;
  } catch (error) {
    console.error("❌ Error fetching booking statistics:", error);
    // Return default statistics instead of throwing
    return {
      total: 0,
      enAttente: 0,
      confirmées: 0,
      terminées: 0,
      annulées: 0,
      tauxAnnulation: 0,
      tauxCompletion: 0,
      revenuTotal: 0,
    };
  }
}

// Utility function to clean up all booking listeners
export const cleanupAllBookingListeners = () => {
  console.log(
    `🧹 Cleaning up all ${activeBookingListeners.size} booking listeners`
  );
  activeBookingListeners.forEach((unsubscribe, listenerId) => {
    console.log("🧹 Cleaning up booking listener:", listenerId);
    unsubscribe();
  });
  activeBookingListeners.clear();
  // CRITICAL: Do not reset bookingListenerIdCounter to prevent ID reuse
};

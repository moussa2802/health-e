import { getFirestoreInstance } from "../utils/firebase"; // Use getter function instead of direct import
import {
  collection,
  addDoc,
  setDoc,
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

    // CRITICAL: Ensure Firestore is ready before creating booking
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Vérifier l'authentification
    const auth = getAuth(app);
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Utilisateur non authentifié");
    }

    // Ensure bookings collection exists
    const bookingsRef = collection(db, "bookings");

    // Vérifier si le créneau est déjà réservé
    const conflictingQuery = query(
      bookingsRef,
      where("professionalId", "==", bookingData.professionalId),
      where("date", "==", bookingData.date),
      where("startTime", "==", bookingData.startTime.trim()),
      where("status", "in", ["confirmed", "pending"]) // statuts actifs
    );

    const conflictingSnap = await getDocs(conflictingQuery);
    if (!conflictingSnap.empty) {
      throw new Error(
        "Ce créneau est déjà réservé. Veuillez en choisir un autre."
      );
    }

    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`;
    await retryFirestoreOperation(async () => {
      const bookingWithDefaults = {
        id: tempId,
        ...bookingData,
        date: bookingData.date,
        startTime: bookingData.startTime.trim(),
        endTime: bookingData.endTime.trim(),
        status: "pending" as const,
        isTemp: true,
        duration: Number(bookingData.duration) || 60,
        price: Number(bookingData.price) || 0,
        "notify.sent.initial": true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log(
        "📝 Création finale de la réservation avec les données:",
        JSON.stringify(bookingWithDefaults, null, 2)
      );

      const tempRef = doc(bookingsRef, tempId);
      await setDoc(tempRef, bookingWithDefaults);
    });


    await createNotification(
      bookingData.professionalId,
      "appointment_request",
      "Nouvelle demande de rendez-vous",
      `Vous avez reçu une demande de rendez-vous de la part de ${bookingData.patientName} pour le ${bookingData.date} à ${bookingData.startTime}`,
      tempId,
      "booking"
    );
    return tempId;
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
    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;
    if (!uid) {
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

    // CRITICAL: Verify user is authenticated
    if (!userId) {
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
    const q = query(
      bookingsRef,
      where(fieldName, "==", userId),
      where("status", "in", ["confirmed", "completed"]) // n'afficher que confirmés/terminés
    );

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
    callback([]);
    return () => {};
  }

  // Generate unique listener ID to prevent conflicts
  const listenerId = `bookings_${userType}_${userId}_${++bookingListenerIdCounter}_${Date.now()}`;


  // Clean up any existing listener for this user/type combination
  const existingListenerId = Array.from(activeBookingListeners.keys()).find(
    (id) => id.startsWith(`bookings_${userType}_${userId}_`)
  );
  if (existingListenerId) {
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
        callback([]);
        return;
      }

      const db = getFirestoreInstance();
      if (!db) {
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
          q = query(
            bookingsRef,
            where(fieldName, "==", userId),
            where("status", "in", ["confirmed", "completed"]) // filtrer UI
          );
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

                // Return empty array for now, the subscription will be retried
                callback([]);
              } catch (resetError) {
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
            } else if (error.code === "unavailable") {
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

    // Récupérer les données existantes pour la notification
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error("Réservation non trouvée");
    }

    const existingBooking = bookingSnap.data();
    const professionalId = existingBooking.professionalId;
    const patientName = existingBooking.patientName;

    // Préparer les données à mettre à jour
    const updateData = {
      ...bookingData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(bookingRef, updateData);

    // Créer une notification pour le professionnel
    await createNotification(
      professionalId,
      "appointment_modified",
      "Rendez-vous modifié",
      `Le patient ${patientName} a modifié son rendez-vous pour le ${
        bookingData.date || existingBooking.date
      } à ${bookingData.startTime || existingBooking.startTime}`,
      bookingId,
      "booking"
    );

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


    // CRITICAL: Verify professional ID is provided
    if (!professionalId) {
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
        return false; // Conflit détecté
      }
    }

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
  activeBookingListeners.forEach((unsubscribe) => unsubscribe());
  activeBookingListeners.clear();
  // CRITICAL: Do not reset bookingListenerIdCounter to prevent ID reuse
};

// ─── Remboursement ────────────────────────────────────────────────────────────

export type RefundReason =
  | "professional_cancelled"
  | "patient_cancelled"
  | "technical_issue"
  | "other";

export interface RefundRequest {
  id?: string;
  bookingId: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  amount: number;
  date: string;
  reason: RefundReason;
  reasonDetail?: string;
  status: "pending" | "approved" | "rejected" | "processed";
  createdAt?: FieldValue;
  processedAt?: FieldValue;
  adminNote?: string;
}

/**
 * Demande d'annulation avec remboursement.
 * - Met à jour le statut du booking à "cancelled"
 * - Crée un document refundRequests pour traitement admin
 * - Notifie le patient et l'admin
 */
export async function requestCancellationAndRefund(
  bookingId: string,
  reason: RefundReason,
  reasonDetail?: string
): Promise<string> {
  const db = getFirestoreInstance();
  if (!db) throw new Error("Firestore non disponible");

  const bookingRef = doc(db, "bookings", bookingId);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) throw new Error("Réservation introuvable");

  const booking = bookingSnap.data() as any;

  // Vérifier que le RDV peut encore être annulé (pas déjà terminé)
  if (["completed", "cancelled"].includes(booking.status)) {
    throw new Error(`Impossible d'annuler un rendez-vous avec le statut: ${booking.status}`);
  }

  // Vérifier le délai (24h min avant le RDV pour être remboursé)
  const appointmentDate = new Date(`${booking.date}T${booking.startTime}`);
  const hoursUntilAppointment = (appointmentDate.getTime() - Date.now()) / 36e5;
  const isEligibleForRefund = hoursUntilAppointment >= 24 || reason === "professional_cancelled" || reason === "technical_issue";

  // Annuler le booking
  await cancelBooking(bookingId);

  if (!isEligibleForRefund || !booking.isPaid) {
    // Pas de remboursement éligible — retourner un message
    return "cancelled_no_refund";
  }

  // Créer la demande de remboursement
  const refundData: RefundRequest = {
    bookingId,
    patientId: booking.patientId,
    patientName: booking.patientName,
    professionalId: booking.professionalId,
    professionalName: booking.professionalName,
    amount: booking.price ?? booking.amount ?? 0,
    date: booking.date,
    reason,
    reasonDetail,
    status: "pending",
    createdAt: serverTimestamp(),
  };

  const refundRef = await addDoc(collection(db, "refundRequests"), refundData);

  // Notifier l'admin
  await createNotification(
    "admin",
    "refund_request",
    "Demande de remboursement",
    `${booking.patientName} demande le remboursement de ${booking.price ?? 0} XOF pour le RDV du ${booking.date}.`,
    refundRef.id,
    "refund"
  );

  return refundRef.id;
}

/**
 * Récupère les demandes de remboursement d'un patient.
 */
export async function getPatientRefundRequests(patientId: string): Promise<RefundRequest[]> {
  const db = getFirestoreInstance();
  if (!db) return [];

  const q = query(
    collection(db, "refundRequests"),
    where("patientId", "==", patientId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RefundRequest));
}

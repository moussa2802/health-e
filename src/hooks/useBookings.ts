import { useEffect, useState, useRef } from "react";
import {
  subscribeToBookings,
  type Booking,
  cleanupAllBookingListeners,
} from "../services/bookingService";
import {
  resetFirestoreConnection,
  ensureFirestoreReady,
} from "../utils/firebase";

// Global registry of active listeners to prevent duplicates with unique IDs
const activeBookingListeners = new Map<string, () => void>();
let bookingListenerIdCounter = 0;

export const useBookings = (
  userId: string,
  userType: "patient" | "professional" | "admin"
) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const listenerIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    isMountedRef.current = true;

    const listenerId = `bookings_${userType}_${userId}_${++bookingListenerIdCounter}_${Date.now()}`;
    listenerIdRef.current = listenerId;

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

    setLoading(true);
    setError(null);

    // 💡 Début du timeout immédiat
    const timeoutId = setTimeout(() => {
      if (
        loading &&
        isMountedRef.current &&
        listenerIdRef.current === listenerId
      ) {
        setLoading(false);
        if (bookings.length === 0) {
          setError(
            "Impossible de charger les données. Veuillez vérifier votre connexion internet."
          );
        }
      }
    }, 15000); // tu peux augmenter à 15000ms (15 secondes)

    ensureFirestoreReady()
      .then(() => {
        const unsubscribe = subscribeToBookings(
          userId,
          userType,
          (bookingsData) => {
            if (!isMountedRef.current || listenerIdRef.current !== listenerId) {
              return;
            }

            setBookings(bookingsData);
            setLoading(false);
            setError(null);

            clearTimeout(timeoutId); // ✅ On annule le timeout à la réception
          }
        );

        if (unsubscribe && isMountedRef.current) {
          activeBookingListeners.set(listenerId, unsubscribe);
          unsubscribeRef.current = unsubscribe;
        }
      })
      .catch((error) => {
        console.warn("⚠️ Failed to ensure Firestore is ready:", error);
        setError("Erreur lors de la connexion à la base de données.");
        setLoading(false);
        clearTimeout(timeoutId);
      });

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (
        listenerIdRef.current &&
        activeBookingListeners.has(listenerIdRef.current)
      ) {
        console.log(
          `🧹 Cleaning up booking listener: ${listenerIdRef.current}`
        );
        const listener = activeBookingListeners.get(listenerIdRef.current);
        if (listener) {
          listener();
        }
        activeBookingListeners.delete(listenerIdRef.current);
      }
    };
  }, [userId, userType]);

  // Function to manually refresh data
  const refreshBookings = async () => {
    console.log("🔄 Manually refreshing bookings...");
    setLoading(true);
    setError(null);

    try {
      // CRITICAL: Reset Firestore connection first
      await resetFirestoreConnection();
      console.log("✅ Firestore connection reset before refresh");

      // Then ensure it's ready
      await ensureFirestoreReady();
      console.log("✅ Firestore ready before refresh");

      // Check connection by ensuring Firestore is ready
      try {
        await ensureFirestoreReady();
        console.log("✅ Firestore connection verified for refresh");
      } catch (connectionError) {
        console.warn(
          "⚠️ Firestore connection issue during refresh:",
          connectionError
        );
        setError(
          "Impossible de se connecter à la base de données. Vérifiez votre connexion internet."
        );
        setLoading(false);
        return;
      }

      // Clean up existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (
        listenerIdRef.current &&
        activeBookingListeners.has(listenerIdRef.current)
      ) {
        const cleanup = activeBookingListeners.get(listenerIdRef.current);
        if (cleanup) {
          cleanup();
          activeBookingListeners.delete(listenerIdRef.current);
        }
      }

      // Force a complete reload by incrementing the counter
      bookingListenerIdCounter++;

      console.log(
        "✅ Booking refresh initiated, new subscription will be created"
      );
    } catch (err) {
      console.error("❌ Failed to refresh bookings:", err);
      if (isMountedRef.current) {
        setError("Erreur lors du rafraîchissement des données");
        setLoading(false);
      }
    }
  };

  return { bookings, loading, error, refreshBookings };
};

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
  bookingListenerIdCounter = 0;
};

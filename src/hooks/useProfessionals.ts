import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import {
  getFirestoreInstance,
  resetFirestoreConnection,
  isFirestoreInternalError,
  ensureFirestoreReady,
} from "../utils/firebase"; // Use getter function instead of direct import
import { migrateAvailabilityData } from "../services/profileService";

interface Professional {
  id: string;
  name: string;
  specialty: string; // Legacy field
  profileImage: string;
  description: string;
  rating: number;
  reviews: number;
  languages: string[];
  price: number | null;
  currency: string;
  isAvailableNow: boolean;
  availability: {
    day: string;
    startTime: string;
    endTime: string;
    slots: string[];
  }[];
  education: string[];
  experience: string;
  type: "mental" | "sexual"; // Legacy field
  // New fields for extended specialties
  category?: "mental-health" | "sexual-health";
  primarySpecialty?: string; // Legacy field
  specialties?: string[]; // Array of specialty keys
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

// CRITICAL: Global registry to prevent duplicate listeners with unique IDs
const activeListeners = new Map<string, () => void>();
let listenerIdCounter = 0;

// Cache to reduce redundant Firestore queries - CLEARED after data deletion
const professionalsCache = new Map<
  string,
  { data: Professional[]; timestamp: number }
>();
const CACHE_DURATION = 60000; // 1 minute

// CRITICAL: Clear all caches when data is deleted
const clearAllCaches = () => {
  console.log("Clearing all professionals caches after data deletion");
  professionalsCache.clear();

  // Clear browser storage as well
  if (typeof window !== "undefined") {
    try {
      // Clear any cached professional data from localStorage/sessionStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.includes("professional") || key.includes("cache")) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage).forEach((key) => {
        if (key.includes("professional") || key.includes("cache")) {
          sessionStorage.removeItem(key);
        }
      });

      console.log("Browser storage cleared of professional data");
    } catch (error) {
      console.warn("Could not clear browser storage:", error);
    }
  }
};

export const useProfessionals = (
  filterType?: "mental" | "sexual" | "mental-health" | "sexual-health"
) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const listenerIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    const cacheKey = `professionals_${filterType || "all"}`;

    console.log(
      `Setting up professionals subscription with filter: ${
 filterType || "all"
 }`
    );

    // CRITICAL: Clear caches first to ensure fresh data after deletion
    clearAllCaches();

    // Generate unique listener ID to prevent conflicts
    const listenerId = `professionals_${
      filterType || "all"
    }_${++listenerIdCounter}_${Date.now()}`;
    listenerIdRef.current = listenerId;

    // Clean up any existing listener for this cache key
    const existingListenerId = Array.from(activeListeners.keys()).find((id) =>
      id.startsWith(`professionals_${filterType || "all"}_`)
    );
    if (existingListenerId) {
      console.log("Cleaning up existing listener:", existingListenerId);
      const cleanup = activeListeners.get(existingListenerId);
      if (cleanup) {
        cleanup();
        activeListeners.delete(existingListenerId);
      }
    }

    // Always start fresh - no cache check after data deletion
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
      setProfessionals([]); // Clear existing data
    }

    // Fallback: Try to load data with getDocs if onSnapshot fails
    const fetchProfessionalsWithFallback = async () => {
      try {
        console.log("Fetching professionals with fallback method");

        // CRITICAL: Ensure Firestore is ready before fetching
        await ensureFirestoreReady();

        const db = getFirestoreInstance();
        if (!db) throw new Error("Firestore not available");

        let q;
        if (filterType) {
          // Support both legacy and new filter types
          if (
            filterType === "mental-health" ||
            filterType === "sexual-health"
          ) {
            q = query(
              collection(db, "professionals"),
              where("category", "==", filterType),
              limit(50)
            );
          } else {
            q = query(
              collection(db, "professionals"),
              where("type", "==", filterType),
              limit(50)
            );
          }
        } else {
          q = query(collection(db, "professionals"), limit(50));
        }
        professionalsCache.delete(cacheKey); // ⚠️ Invalide le cache manuellement
        const querySnapshot = await getDocs(q);

        if (!isMountedRef.current) return;

        let results: Professional[] = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Professional)
        );

        // CRITICAL: Migrate availability data if needed
        results = results.map((professional) => {
          if (
            professional.availability &&
            Array.isArray(professional.availability)
          ) {
            const needsMigration = professional.availability.some(
              (avail) =>
                !avail.slots ||
                !Array.isArray(avail.slots) ||
                avail.slots.length === 0
            );

            if (needsMigration) {
              console.log(
                `Migrating availability for ${professional.name} in memory...`
              );
              professional.availability = migrateAvailabilityData(
                professional.availability
              );
            }
          }
          return professional;
        });

        // Sort on client side
        const sortedResults = results.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });

        console.log(
          `Fetched ${sortedResults.length} professionals with fallback (fresh data after deletion)`
        );

        if (isMountedRef.current) {
          setProfessionals(sortedResults);
          setLoading(false);

          // Cache the results (fresh cache)
          professionalsCache.set(cacheKey, {
            data: visibleProfessionals,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error("Fallback fetch failed:", err);
        if (isMountedRef.current) {
          setError(
            "Impossible de charger les données. Vérifiez votre connexion internet."
          );
          setLoading(false);
        }
      }
    };

    // CRITICAL: Only set up listener after Firestore is ready
    ensureFirestoreReady()
      .then((isReady) => {
        if (!isReady) {
          console.warn(
            "Firestore not ready for professionals subscription, using fallback"
          );
          fetchProfessionalsWithFallback();
          return;
        }

        console.log("Firestore ready for professionals subscription");

        try {
          // CRITICAL: Ensure Firestore is ready before setting up subscription
          ensureFirestoreReady().catch((error) => {
            console.warn(
              "Failed to ensure Firestore ready before professionals subscription:",
              error
            );
          });

          const db = getFirestoreInstance();
          if (!db) {
            console.warn(
              "Firestore not available for professionals subscription, using fallback"
            );
            fetchProfessionalsWithFallback();
            return;
          }

          // Create query with or without filter - SIMPLIFIED to avoid index issues
          let q;
          if (filterType) {
            // Support both legacy and new filter types
            if (
              filterType === "mental-health" ||
              filterType === "sexual-health"
            ) {
              q = query(
                collection(db, "professionals"),
                where("category", "==", filterType)
              );
            } else {
              q = query(
                collection(db, "professionals"),
                where("type", "==", filterType)
              );
            }
          } else {
            q = query(collection(db, "professionals"));
          }

          console.log(
            `Setting up real-time subscription with ID: ${listenerId}...`
          );

          // Set up real-time subscription with unique ID tracking
          const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
              if (
                !isMountedRef.current ||
                listenerIdRef.current !== listenerId
              ) {
                console.log(
                  "Ignoring snapshot for unmounted component or old listener"
                );
                return;
              }

              try {
                console.log(
                  `Received ${querySnapshot.docs.length} documents from Firestore (listener: ${listenerId})`
                );

                let results: Professional[] = querySnapshot.docs.map((doc) => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    ...data,
                  } as Professional;
                });

                // CRITICAL: Migrate availability data if needed
                results = results.map((professional) => {
                  if (
                    professional.availability &&
                    Array.isArray(professional.availability)
                  ) {
                    const needsMigration = professional.availability.some(
                      (avail) =>
                        !avail.slots ||
                        !Array.isArray(avail.slots) ||
                        avail.slots.length === 0
                    );

                    if (needsMigration) {
                      console.log(
                        `Migrating availability for ${professional.name} in real-time...`
                      );
                      professional.availability = migrateAvailabilityData(
                        professional.availability
                      );
                    }
                  }
                  return professional;
                });

                // Sort by creation date (newest first) on client side to avoid index requirements
                const sortedResults = results.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return bTime.getTime() - aTime.getTime();
                });

                console.log(
                  `Processed ${sortedResults.length} professionals successfully (listener: ${listenerId})`
                );

                if (
                  isMountedRef.current &&
                  listenerIdRef.current === listenerId
                ) {
                  setProfessionals(sortedResults);
                  setLoading(false);
                  // Cache the results (fresh cache)
                  professionalsCache.set(cacheKey, {
                    data: sortedResults,
                    timestamp: Date.now(),
                  });
                  // Clear error if we successfully receive data
                  if (sortedResults.length >= 0) {
                    // Accept 0 results as valid (empty database)
                    setError(null);
                  }
                }
              } catch (err) {
                console.error("Error processing professionals data:", err);
                if (
                  isMountedRef.current &&
                  listenerIdRef.current === listenerId
                ) {
                  setError(
                    "Erreur lors du traitement des données des professionnels"
                  );
                  setLoading(false);

                  // Try fallback method
                  fetchProfessionalsWithFallback();
                }
              }
            },
            async (err) => {
              if (
                !isMountedRef.current ||
                listenerIdRef.current !== listenerId
              ) {
                console.log(
                  "Ignoring error for unmounted component or old listener"
                );
                return;
              }

              console.error(
                `Error in professionals subscription (listener: ${listenerId}):`,
                err
              );

              // CRITICAL: Handle Firestore internal assertion failures
              if (isFirestoreInternalError(err)) {
                console.error(
                  "Firestore internal assertion failure in professionals subscription, resetting connection..."
                );

                // Clean up this listener immediately
                if (activeListeners.has(listenerId)) {
                  const cleanup = activeListeners.get(listenerId);
                  if (cleanup) {
                    cleanup();
                    activeListeners.delete(listenerId);
                  }
                }

                try {
                  await resetFirestoreConnection();
                  console.log(
                    "Firestore connection reset after internal assertion failure in professionals"
                  );

                  // Wait longer before retrying after internal errors
                  setTimeout(() => {
                    if (isMountedRef.current) {
                      fetchProfessionalsWithFallback();
                    }
                  }, 2000);
                } catch (resetError) {
                  console.warn(
                    "Could not reset Firestore after internal assertion failure:",
                    resetError
                  );
                }

                return; // Don't set error state for internal assertion failures
              }

              // Handle specific Firestore errors
              let errorMessage =
                "Erreur lors du chargement des professionnels. Vérifiez votre connexion internet.";

              if (err.code === "permission-denied") {
                errorMessage =
                  "Accès refusé aux données des professionnels. Veuillez vous reconnecter.";
              } else if (err.code === "unavailable") {
                errorMessage =
                  "Service temporairement indisponible. Veuillez réessayer dans quelques instants.";
              } else if (err.code === "failed-precondition") {
                console.warn(
                  "Firestore index may be required, but continuing with basic query"
                );
                errorMessage =
                  "Chargement en cours... Les données peuvent prendre quelques instants à apparaître.";
              } else if (
                err.message &&
                err.message.includes("Target ID already exists")
              ) {
                console.error("Target ID conflict detected, cleaning up...");
                errorMessage =
                  "Conflit de cache détecté. Rechargement automatique en cours...";

                // Clean up this listener immediately
                if (activeListeners.has(listenerId)) {
                  const cleanup = activeListeners.get(listenerId);
                  if (cleanup) {
                    cleanup();
                    activeListeners.delete(listenerId);
                  }
                }

                // Try fallback method after a short delay
                setTimeout(() => {
                  if (isMountedRef.current) {
                    fetchProfessionalsWithFallback();
                  }
                }, 1000);

                return; // Don't set error state for Target ID conflicts
              }

              if (
                isMountedRef.current &&
                listenerIdRef.current === listenerId
              ) {
                setError(errorMessage);
                setLoading(false);

                // Try fallback method for most errors
                if (!err.message?.includes("Target ID already exists")) {
                  fetchProfessionalsWithFallback();
                }
              }
            }
          );

          // Store the listener with unique ID
          activeListeners.set(listenerId, unsubscribe);
          unsubscribeRef.current = unsubscribe;

          // Set a timeout to stop loading state even if no data comes
          const timeoutId = setTimeout(() => {
            if (
              isMountedRef.current &&
              loading &&
              listenerIdRef.current === listenerId
            ) {
              console.warn(
                `Professionals subscription timeout for listener: ${listenerId}`
              );
              setLoading(false);
              // Don't set error for empty database - this is expected after deletion
              console.log(
                "ℹ No professionals found - this is expected after database cleanup"
              );
            }
          }, 15000); // 15 second timeout

          // Return cleanup function
          return () => {
            isMountedRef.current = false;
            clearTimeout(timeoutId);

            // Clean up the specific listener
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
              unsubscribeRef.current = null;
            }

            // Clean up from global registry
            if (
              listenerIdRef.current &&
              activeListeners.has(listenerIdRef.current)
            ) {
              console.log(
                `Cleaning up professionals listener: ${listenerIdRef.current}`
              );
              const cleanup = activeListeners.get(listenerIdRef.current);
              if (cleanup) {
                cleanup();
              }
              activeListeners.delete(listenerIdRef.current);
            }

            console.log(
              `Cleaned up professionals subscription for: ${listenerId}`
            );
          };
        } catch (error) {
          console.error(
            "Error setting up professionals subscription:",
            error
          );
          if (isMountedRef.current) {
            setError(
              "Erreur lors de la connexion à la base de données. Veuillez réessayer."
            );
            setLoading(false);

            // Try fallback method
            fetchProfessionalsWithFallback();
          }

          return () => {
            isMountedRef.current = false;
          };
        }
      })
      .catch((error) => {
        console.error(
          "Failed to ensure Firestore ready for professionals subscription:",
          error
        );
        if (isMountedRef.current) {
          setError(
            "Problème de connexion à la base de données. Veuillez vérifier votre connexion internet."
          );
          setLoading(false);

          // Try fallback method
          fetchProfessionalsWithFallback();
        }
      });
  }, [filterType]);

  // Function to manually refresh data
  const refreshProfessionals = async () => {
    if (!isMountedRef.current) return;

    console.log("Manually refreshing professionals...");
    const cacheKey = `professionals_${filterType || "all"}`;

    // Clear cache
    professionalsCache.delete(cacheKey);
    clearAllCaches();

    // Clean up existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (listenerIdRef.current && activeListeners.has(listenerIdRef.current)) {
      const cleanup = activeListeners.get(listenerIdRef.current);
      if (cleanup) {
        cleanup();
        activeListeners.delete(listenerIdRef.current);
      }
    }

    setLoading(true);
    setError(null);
    setProfessionals([]); // Clear existing data

    try {
      // CRITICAL: Ensure Firestore is ready before refreshing
      await ensureFirestoreReady();

      // Force a complete reload by incrementing the counter
      listenerIdCounter++;

      console.log("Refresh initiated, new subscription will be created");
    } catch (err) {
      console.error("Failed to refresh professionals:", err);
      if (isMountedRef.current) {
        setError("Erreur lors du rafraîchissement des données");
        setLoading(false);
      }
    }
  };

  return { professionals, loading, error, refreshProfessionals };
};

// Utility function to clean up all listeners (use when unmounting the app)
export const cleanupAllProfessionalsListeners = () => {
  console.log(
    `Cleaning up all ${activeListeners.size} professionals listeners`
  );
  activeListeners.forEach((unsubscribe, listenerId) => {
    console.log("Cleaning up professionals listener:", listenerId);
    unsubscribe();
  });
  activeListeners.clear();
  professionalsCache.clear();
  listenerIdCounter = 0;

  // Also clear browser storage
  if (typeof window !== "undefined") {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.includes("professional") || key.includes("cache")) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage).forEach((key) => {
        if (key.includes("professional") || key.includes("cache")) {
          sessionStorage.removeItem(key);
        }
      });

      console.log("Browser storage cleared of professional data");
    } catch (error) {
      console.warn("Could not clear browser storage:", error);
    }
  }
};

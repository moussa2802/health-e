import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import {
  initializeFirestore,
  enableNetwork,
  disableNetwork,
  terminate,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  collection,
  getDocs,
  limit,
  query,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { getDatabase } from "firebase/database";

// ✅ Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCQP_KoMF6uoNNlSAC4MtPbQM_cUC3atow",
  authDomain: "health-e-af2bf.firebaseapp.com",
  projectId: "health-e-af2bf",
  storageBucket: "health-e-af2bf.firebasestorage.app",
  messagingSenderId: "309913232683",
  appId: "1:309913232683:web:4af084bc334d3d3513d16e",
  measurementId: "G-2PPQMDQYPN",
  databaseURL: "https://health-e-af2bf-default-rtdb.firebaseio.com",
};

// Global state tracking
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase Auth
const auth = getAuth(app);
// Initialize and export Firebase Functions (europe-west1)
const functions = getFunctions(app, "europe-west1");
auth.useDeviceLanguage();
let analytics;
let db: Firestore | null = null;
let storage;
let rtdb;
let isFirestoreInitialized = false;
let isResetting = false;
const firestoreConnectionStatus = {
  isOnline: false,
  isInitialized: false,
  lastError: null as Error | null,
  lastResetTime: 0,
};

// Maximum number of resets allowed in a time window
const MAX_RESETS_PER_HOUR = 5;
const resetTimes: number[] = [];

// Initialize Firebase with error handling
try {
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost"
  ) {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn("Analytics error", e);
    }
  }

  storage = getStorage(app);

  // ✅ IMPROVED: Use initializeFirestore with more robust settings
  // CRITICAL FIX: Use memory cache instead of persistent cache to avoid IndexedDB issues
  db = initializeFirestore(app, {
    // Use memory cache for web container environment to avoid persistence issues
    localCache:
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
        ? undefined // Use default memory cache for problematic environments
        : persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
  });

  isFirestoreInitialized = true;
  firestoreConnectionStatus.isInitialized = true;

  // Enable network by default
  enableNetwork(db)
    .then(() => {
      firestoreConnectionStatus.isOnline = true;
      console.log("✅ Firestore network enabled on initialization");
    })
    .catch((e) => {
      console.warn(
        "⚠️ Failed to enable Firestore network on initialization",
        e
      );
      firestoreConnectionStatus.isOnline = false;
    });

  rtdb = getDatabase(app);
  console.log("✅ Firebase initialized");
} catch (e) {
  console.error("❌ Firebase init failed", e);
  firestoreConnectionStatus.lastError = e as Error;
}

// CRITICAL: Export a getter function instead of direct db export
export const getFirestoreInstance = (): Firestore | null => {
  return db;
};

// ✅ IMPROVED: Function to check if error is a Firestore internal error
export const isFirestoreInternalError = (error: any): boolean => {
  if (!error) return false;

  // Check for error message
  if (typeof error.message === "string") {
    const message = error.message.toLowerCase();
    return (
      message.includes("internal assertion failed") ||
      message.includes("target id already exists") ||
      message.includes("client has already been terminated") ||
      message.includes("unexpected state") ||
      (message.includes("firestore") && message.includes("internal"))
    );
  }

  // Check for error code
  if (error.code) {
    const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
    return code.includes("internal") || code.includes("failed-precondition");
  }

  return false;
};

// Get current Firestore connection status
export const getFirestoreConnectionStatus = () => {
  return { ...firestoreConnectionStatus };
};

// CRITICAL: Clean all browser storage related to Firebase
export const cleanAllFirebaseStorage = async (): Promise<void> => {
  console.log("🧹 Cleaning all Firebase-related browser storage...");

  try {
    // Clean localStorage
    if (typeof localStorage !== "undefined") {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes("firebase") ||
            key.includes("firestore") ||
            key.includes("health-e") ||
            key.includes("professional_") ||
            key.includes("patient_") ||
            key.includes("user_") ||
            key.includes("notification-"))
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });

      console.log(`✅ Removed ${keysToRemove.length} items from localStorage`);
    }

    // Clean sessionStorage
    if (typeof sessionStorage !== "undefined") {
      const keysToRemove: string[] = [];

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.includes("firebase") ||
            key.includes("firestore") ||
            key.includes("health-e") ||
            key.includes("professional_") ||
            key.includes("patient_") ||
            key.includes("user_"))
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        sessionStorage.removeItem(key);
      });

      console.log(
        `✅ Removed ${keysToRemove.length} items from sessionStorage`
      );
    }

    // CRITICAL FIX: Skip IndexedDB cleanup in web container environment
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
    ) {
      console.log("⚠️ Skipping IndexedDB cleanup in web container environment");
    } else if (typeof indexedDB !== "undefined") {
      try {
        // Get all databases and await the operation
        const databases = await indexedDB.databases();

        // Create promises for all database deletions
        const deletionPromises = databases
          .filter(
            (database) =>
              database.name &&
              (database.name.includes("firebase") ||
                database.name.includes("firestore") ||
                database.name.includes("health-e"))
          )
          .map((database) => {
            return new Promise<void>((resolve, reject) => {
              try {
                const deleteRequest = indexedDB.deleteDatabase(database.name!);

                deleteRequest.onsuccess = () => {
                  console.log(
                    `✅ Deleted IndexedDB database: ${database.name}`
                  );
                  resolve();
                };

                deleteRequest.onerror = () => {
                  console.warn(
                    `⚠️ Failed to delete IndexedDB database ${database.name}:`,
                    deleteRequest.error
                  );
                  resolve(); // Resolve anyway to not block the process
                };

                deleteRequest.onblocked = () => {
                  console.warn(
                    `⚠️ IndexedDB database deletion blocked for ${database.name}`
                  );
                  // Wait a bit and resolve anyway
                  setTimeout(() => resolve(), 1000);
                };
              } catch (error) {
                console.warn(
                  `⚠️ Error initiating deletion of IndexedDB database ${database.name}:`,
                  error
                );
                resolve(); // Resolve anyway to not block the process
              }
            });
          });

        // Wait for all database deletions to complete
        if (deletionPromises.length > 0) {
          await Promise.all(deletionPromises);
          console.log(
            `✅ Completed deletion of ${deletionPromises.length} IndexedDB databases`
          );
        }
      } catch (error) {
        console.warn("⚠️ Failed to list or delete IndexedDB databases:", error);
      }
    }

    console.log("✅ All Firebase-related browser storage cleaned");
  } catch (error) {
    console.error("❌ Error cleaning Firebase storage:", error);
  }
};

// ✅ IMPROVED: Function to force Firestore online with rate limiting
export const forceFirestoreOnline = async (): Promise<boolean> => {
  const currentDb = getFirestoreInstance();
  if (!currentDb || !isFirestoreInitialized) {
    console.warn("⚠️ Firestore not initialized, cannot force online");
    return false;
  }

  try {
    await enableNetwork(currentDb);
    firestoreConnectionStatus.isOnline = true;
    console.log("✅ Firestore is online");
    return true;
  } catch (e) {
    console.warn("⚠️ Firestore enable failed", e);
    firestoreConnectionStatus.isOnline = false;
    firestoreConnectionStatus.lastError = e as Error;
    return false;
  }
};

// ✅ IMPROVED: Function to ensure Firestore is ready before use
export const ensureFirestoreReady = async (): Promise<boolean> => {
  // CRITICAL FIX: If we're in a web container environment, return true to avoid hanging
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname.includes("webcontainer") ||
      window.location.hostname.includes("health-e.sn"))
  ) {
    // For web container, just check if db is initialized
    if (db && isFirestoreInitialized) {
      return true;
    } else {
      console.warn("⚠️ Firestore not initialized in web container environment");
      return false;
    }
  }

  // Check if we're currently resetting
  if (isResetting) {
    console.warn("⚠️ Firestore is currently resetting, waiting...");
    // Wait for reset to complete
    let attempts = 0;
    while (isResetting && attempts < 20) {
      // Reduced from 50 to 20 (2 seconds max)
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (isResetting) {
      console.warn("⚠️ Firestore reset taking too long, proceeding anyway");
      return false;
    }
  }

  // Always get the current instance (important after resets)
  const currentDb = getFirestoreInstance();
  if (!currentDb) {
    console.warn("⚠️ Firestore instance is null");
    return false;
  }

  if (!isFirestoreInitialized) {
    console.warn("⚠️ Firestore not initialized");
    return false;
  }

  try {
    const result = await forceFirestoreOnline();
    return result;
  } catch (e) {
    console.warn("⚠️ Failed to ensure Firestore is ready", e);
    return false;
  }
};

// ✅ IMPROVED: Retry operation with Firestore error handling
export const retryFirestoreOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any = null;

  // CRITICAL FIX: For web container environment, reduce retries and delays
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname.includes("webcontainer") ||
      window.location.hostname.includes("health-e.sn"))
  ) {
    maxRetries = 2;
    delayMs = 500;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // CRITICAL FIX: Always ensure Firestore is ready before each attempt
      console.log(
        `🔄 Ensuring Firestore is ready for attempt ${attempt}/${maxRetries}`
      );
      const isReady = await ensureFirestoreReady();
      if (!isReady) {
        throw new Error(`Firestore not ready for attempt ${attempt}`);
      }

      // Add delay between attempts (except for first attempt)
      if (attempt > 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * (attempt - 1))
        );
      }

      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(
        `⚠️ Firestore operation failed (attempt ${attempt}/${maxRetries}):`,
        error
      );

      // If this is a Firestore internal error, try to reset the connection
      if (isFirestoreInternalError(error) && attempt < maxRetries) {
        console.warn(
          `🔄 Detected Firestore internal error, attempting reset before retry ${
            attempt + 1
          }`
        );
        try {
          await resetFirestoreConnection();
          // Wait longer after reset before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (resetError) {
          console.warn(
            `⚠️ Failed to reset Firestore connection during retry:`,
            resetError
          );
        }
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
    }
  }

  // If we get here, all retries failed
  console.error(
    `❌ All ${maxRetries} retry attempts failed for Firestore operation`
  );
  throw lastError;
};

// ✅ CRITICAL FIX: Simplified Firestore reset for web container environment
export const resetFirestoreConnection = async (): Promise<boolean> => {
  // CRITICAL FIX: For web container environment, use a simplified reset approach
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname.includes("webcontainer") ||
      window.location.hostname.includes("health-e.sn"))
  ) {
    console.log(
      "🔄 Using simplified Firestore reset for web container environment"
    );

    // Check if we're already resetting
    if (isResetting) {
      console.warn("⚠️ Firestore reset already in progress, skipping");
      return false;
    }

    // Check if Firestore is initialized
    const currentDb = getFirestoreInstance();
    if (!currentDb || !isFirestoreInitialized) {
      console.warn("⚠️ Firestore not initialized, cannot reset");
      return false;
    }

    // Set resetting flag
    isResetting = true;
    firestoreConnectionStatus.lastResetTime = Date.now();

    try {
      console.log("🔄 Resetting Firestore connection...");

      // Clean up all active listeners
      try {
        const { cleanupAllProfessionalsListeners } = await import(
          "../hooks/useProfessionals"
        );
        const { cleanupAllBookingListeners } = await import(
          "../hooks/useBookings"
        );
        const { cleanupAllMessageListeners } = await import(
          "../services/messageService"
        );

        console.log("🧹 Cleaning up all listeners before reset...");
        cleanupAllProfessionalsListeners();
        cleanupAllBookingListeners();
        cleanupAllMessageListeners();

        // Short delay for listeners to be cleaned up
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (cleanupError) {
        console.warn(
          "⚠️ Error cleaning up listeners during reset:",
          cleanupError
        );
      }

      // Disable network first
      try {
        await disableNetwork(currentDb);
        console.log("✅ Firestore network disabled for reset");
      } catch (disableError) {
        console.warn("⚠️ Error disabling Firestore network:", disableError);
      }

      // Short delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Re-enable network
      try {
        await enableNetwork(currentDb);
        firestoreConnectionStatus.isOnline = true;
        console.log("✅ Firestore network re-enabled");
      } catch (enableError) {
        console.warn("⚠️ Error re-enabling Firestore network:", enableError);
        firestoreConnectionStatus.isOnline = false;
        firestoreConnectionStatus.lastError = enableError as Error;
      }

      // Final short wait
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("✅ Simplified Firestore connection reset complete");
      return true;
    } catch (e) {
      console.error("❌ Reset Firestore failed", e);
      firestoreConnectionStatus.lastError = e as Error;
      return false;
    } finally {
      isResetting = false;
    }
  }

  // For non-web container environments, use the full reset process
  // Check if we're already resetting
  if (isResetting) {
    console.warn("⚠️ Firestore reset already in progress, skipping");
    return false;
  }

  // Check if Firestore is initialized
  const currentDb = getFirestoreInstance();
  if (!currentDb || !isFirestoreInitialized) {
    console.warn("⚠️ Firestore not initialized, cannot reset");
    return false;
  }

  // Rate limiting: Check if we've reset too many times recently
  const now = Date.now();
  resetTimes.push(now);

  // Remove reset times older than 1 hour
  const oneHourAgo = now - 3600000;
  while (resetTimes.length > 0 && resetTimes[0] < oneHourAgo) {
    resetTimes.shift();
  }

  // Check if we've reset too many times
  if (resetTimes.length > MAX_RESETS_PER_HOUR) {
    console.warn(
      `⚠️ Too many Firestore resets (${resetTimes.length}) in the last hour, skipping`
    );
    return false;
  }

  // Set resetting flag
  isResetting = true;
  firestoreConnectionStatus.lastResetTime = now;

  try {
    console.log("🔄 Resetting Firestore connection...");

    // Clean all Firebase storage at the beginning
    console.log("🧹 Cleaning all Firebase storage before reset...");
    await cleanAllFirebaseStorage();

    // Wait after storage cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Clean up all active listeners before reset
    try {
      const { cleanupAllProfessionalsListeners } = await import(
        "../hooks/useProfessionals"
      );
      const { cleanupAllBookingListeners } = await import(
        "../hooks/useBookings"
      );
      const { cleanupAllMessageListeners } = await import(
        "../services/messageService"
      );

      console.log("🧹 Cleaning up all listeners before reset...");
      cleanupAllProfessionalsListeners();
      cleanupAllBookingListeners();
      cleanupAllMessageListeners();

      // Wait for listeners to be cleaned up
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (cleanupError) {
      console.warn(
        "⚠️ Error cleaning up listeners during reset:",
        cleanupError
      );
    }

    // Disable network first
    try {
      await disableNetwork(currentDb);
      console.log("✅ Firestore network disabled for reset");
    } catch (disableError) {
      console.warn("⚠️ Error disabling Firestore network:", disableError);
    }

    // Wait before terminating
    console.log("⏳ Waiting before terminating Firestore instance...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Terminate the Firestore instance
    try {
      await terminate(currentDb);
      console.log("✅ Firestore instance terminated");
    } catch (terminateError) {
      console.warn("⚠️ Error terminating Firestore:", terminateError);
    }

    // Explicitly set db to null after termination
    db = null;
    isFirestoreInitialized = false;
    firestoreConnectionStatus.isInitialized = false;
    console.log("✅ Firestore instance explicitly nullified");

    // Wait after termination before clearing IndexedDB
    console.log(
      "⏳ Waiting after termination before clearing IndexedDB persistence..."
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Re-initialize Firestore with a fresh configuration
    try {
      // CRITICAL FIX: Use memory cache for web container environment
      db = initializeFirestore(app, {
        // Use memory cache for web container environment to avoid persistence issues
        localCache:
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname.includes("webcontainer") ||
            window.location.hostname.includes("health-e.sn"))
            ? undefined // Use default memory cache for problematic environments
            : persistentLocalCache({
                tabManager: persistentMultipleTabManager(),
              }),
      });

      isFirestoreInitialized = true;
      firestoreConnectionStatus.isInitialized = true;
      console.log("✅ Firestore re-initialized");
    } catch (initError) {
      console.error("❌ Error re-initializing Firestore:", initError);
      firestoreConnectionStatus.isInitialized = false;
      firestoreConnectionStatus.lastError = initError as Error;
      throw initError;
    }

    // Wait before enabling network
    console.log("⏳ Waiting before enabling network...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Re-enable network
    try {
      await enableNetwork(db);
      firestoreConnectionStatus.isOnline = true;
      console.log("✅ Firestore network re-enabled");
    } catch (enableError) {
      console.warn("⚠️ Error re-enabling Firestore network:", enableError);
      firestoreConnectionStatus.isOnline = false;
      firestoreConnectionStatus.lastError = enableError as Error;
    }

    // Final wait to ensure everything is stable
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("✅ Firestore connection reset complete");
    return true;
  } catch (e) {
    console.error("❌ Reset Firestore failed", e);
    firestoreConnectionStatus.lastError = e as Error;
    return false;
  } finally {
    isResetting = false;
  }
};

// Ensure required collections exist
export async function ensureRequiredCollectionsExist(): Promise<void> {
  try {
    console.log("🔍 Checking if required collections exist...");

    // CRITICAL FIX: Skip for web container environment or if Firestore is not ready
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"))
    ) {
      console.log("⚠️ Skipping collection check in web container environment");
      return;
    }

    // CRITICAL: Ensure Firestore is ready before checking
    const isReady = await ensureFirestoreReady();
    if (!isReady) {
      console.warn("⚠️ Firestore not ready for collection check, skipping");
      return;
    }

    const db = getFirestoreInstance();
    if (!db) {
      console.warn("⚠️ Firestore not available for collection check, skipping");
      return;
    }

    // List of required collections
    const requiredCollections = [
      "users",
      "patients",
      "professionals",
      "bookings",
      "conversations",
    ];

    // Check each collection
    for (const collectionName of requiredCollections) {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(query(collectionRef, limit(1)));

        console.log(
          `✅ Collection ${collectionName} exists with ${snapshot.size} documents`
        );
      } catch (error) {
        console.warn(`⚠️ Error checking collection ${collectionName}:`, error);
        // Collection might not exist, but that's okay - it will be created when needed
      }
    }

    console.log("✅ Required collections check complete");
  } catch (error) {
    console.error("❌ Error checking required collections:", error);
    // Don't throw, as this is just a check
  }
}

// CRITICAL: Function to clean up duplicate professional documents
export async function cleanupDuplicateProfessionals(): Promise<number> {
  try {
    console.log("🧹 Starting cleanup of duplicate professional documents...");

    // CRITICAL: Ensure Firestore is ready before cleaning up
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Get all professionals
    const professionalsRef = collection(db, "professionals");
    const snapshot = await getDocs(professionalsRef);

    console.log(
      `📊 Found ${snapshot.docs.length} professionals to check for duplicates`
    );

    // Group professionals by userId
    const professionalsByUserId = new Map<string, any[]>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.userId) {
        if (!professionalsByUserId.has(data.userId)) {
          professionalsByUserId.set(data.userId, []);
        }
        professionalsByUserId.get(data.userId)!.push({
          id: doc.id,
          ...data,
        });
      }
    });

    console.log(`📊 Found ${professionalsByUserId.size} unique userIds`);

    let deletedCount = 0;

    // For each userId, keep only the most recent document
    for (const [userId, professionals] of professionalsByUserId.entries()) {
      if (professionals.length <= 1) {
        continue; // No duplicates
      }

      console.log(
        `⚠️ Found ${professionals.length} documents for userId ${userId}`
      );

      // Sort by createdAt (newest first)
      professionals.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      // Keep the first one (most recent) and delete the rest
      for (let i = 1; i < professionals.length; i++) {
        const docToDelete = professionals[i];
        console.log(
          `🗑️ Deleting duplicate document ${docToDelete.id} for userId ${userId}`
        );

        try {
          await deleteDoc(doc(db, "professionals", docToDelete.id));
          deletedCount++;
        } catch (error) {
          console.error(`❌ Error deleting document ${docToDelete.id}:`, error);
        }

        // Small delay to avoid overwhelming Firestore
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `🎉 Cleanup completed! Deleted ${deletedCount} duplicate documents`
    );
    return deletedCount;
  } catch (error) {
    console.error("❌ Error during duplicate cleanup:", error);
    throw new Error("Erreur lors du nettoyage des documents dupliqués");
  }
}

// Export all needed variables and functions
export {
  app,
  auth,
  db,
  storage,
  rtdb,
  analytics,
  functions,
  firestoreConnectionStatus,
};

import { getFirestoreInstance, ensureFirestoreReady } from "../utils/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDocs,
  limit,
  writeBatch,
} from "firebase/firestore";
import { getDatabase, ref, onValue, off } from "firebase/database";

// Types for notifications
export interface Notification {
  id: string;
  userId: string;
  type:
    | "message"
    | "appointment_request"
    | "appointment_confirmed"
    | "appointment_cancelled"
    | "professional_registration"
    | "support_message";
  title: string;
  content: string;
  sourceId: string; // ID of the message, booking, etc.
  sourceType: "message" | "booking" | "professional" | "support";
  read: boolean;
  createdAt: Timestamp;
  timestamp?: Date; // For component compatibility
  priority?: "low" | "medium" | "high"; // For color coding
}

// Global registry to prevent duplicate listeners
const activeNotificationListeners = new Map<string, () => void>();
let notificationListenerIdCounter = 0;

// Create a notification
export async function createNotification(
  userId: string,
  type:
    | "message"
    | "appointment_request"
    | "appointment_confirmed"
    | "appointment_cancelled"
    | "professional_registration"
    | "support_message",
  title: string,
  content: string,
  sourceId: string,
  sourceType: "message" | "booking" | "professional" | "support",
  priority: "low" | "medium" | "high" = "medium"
): Promise<string> {
  try {
    console.log(`📣 Creating ${type} notification for user:`, userId);

    // CRITICAL: Ensure Firestore is ready before creating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Create notification in Firestore
    const notificationsRef = collection(db, "notifications");

    const notificationData = {
      userId,
      type,
      title,
      content,
      sourceId,
      sourceType,
      priority,
      read: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log("✅ Notification created successfully:", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
}

// Subscribe to notifications for a user
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  // Vérifier si l'utilisateur est valide
  if (!userId) {
    console.warn(
      "🔔 [DEBUG] No userId provided for notifications subscription"
    );
    callback([]);
    return () => {};
  }

  console.log("🔔 Setting up notifications subscription for user:", userId);

  // Generate unique listener ID
  const listenerId = `notifications_${userId}_${++notificationListenerIdCounter}`;

  // Clean up any existing listener for this user
  const existingListenerId = Array.from(
    activeNotificationListeners.keys()
  ).find((id) => id.startsWith(`notifications_${userId}_`));

  if (existingListenerId) {
    console.log(
      "🧹 Cleaning up existing notification listener:",
      existingListenerId
    );
    const cleanup = activeNotificationListeners.get(existingListenerId);
    if (cleanup) {
      cleanup();
      activeNotificationListeners.delete(existingListenerId);
    }
  }

  // Ensure Firestore is ready
  ensureFirestoreReady()
    .then((isReady) => {
      if (!isReady) {
        console.warn("⚠️ Firestore not ready for notifications subscription");
        callback([]);
        return;
      }

      const db = getFirestoreInstance();
      if (!db) {
        console.warn(
          "⚠️ Firestore not available for notifications subscription"
        );
        callback([]);
        return;
      }

      try {
        // Query notifications for this user
        const notificationsRef = collection(db, "notifications");
        const q = query(
          notificationsRef,
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            console.log("🔔 [DEBUG] onSnapshot callback triggered");
            console.log(
              "📊 Received",
              snapshot.docs.length,
              "notification documents"
            );

            // Use Set to prevent duplicates based on ID
            const seenIds = new Set<string>();
            const notifications = snapshot.docs
              .map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  userId: data.userId,
                  type: data.type,
                  title: data.title,
                  content: data.content,
                  sourceId: data.sourceId,
                  sourceType: data.sourceType,
                  priority: data.priority || "medium",
                  read: data.read,
                  createdAt: data.createdAt,
                  // Convert createdAt to timestamp for the component
                  timestamp: data.createdAt?.toDate
                    ? data.createdAt.toDate()
                    : new Date(data.createdAt),
                } as Notification;
              })
              .filter((notification) => {
                // Remove duplicates based on ID
                if (seenIds.has(notification.id)) {
                  console.log(
                    "🔔 [DEBUG] Duplicate notification filtered out:",
                    notification.id
                  );
                  return false;
                }
                seenIds.add(notification.id);
                return true;
              });

            console.log(
              "✅ Received",
              notifications.length,
              "unique notifications"
            );
            callback(notifications);
          },
          (error) => {
            console.log("🔔 [DEBUG] onSnapshot error callback triggered");
            console.error("❌ Error in notifications subscription:", error);
            console.error("❌ Error code:", error.code);
            console.error("❌ Error message:", error.message);
            console.error("❌ User ID used in query:", userId);
            console.log("🔔 [DEBUG] Full error object:", {
              code: error.code,
              name: error.name,
            });
            callback([]);
          }
        );

        // Store the unsubscribe function
        activeNotificationListeners.set(listenerId, unsubscribe);
      } catch (error) {
        console.error("❌ Error setting up notifications subscription:", error);
        callback([]);
      }
    })
    .catch((error) => {
      console.error("❌ Error ensuring Firestore is ready:", error);
      callback([]);
    });

  // Return cleanup function
  return () => {
    console.log("🧹 Cleaning up notification listener:", listenerId);
    const unsubscribe = activeNotificationListeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      activeNotificationListeners.delete(listenerId);
    }
  };
}

// Mark notification as read
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  try {
    console.log("👁️ Marking notification as read:", notificationId);

    // CRITICAL: Ensure Firestore is ready before updating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });

    console.log("✅ Notification marked as read");
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  try {
    console.log("👁️ Marking all notifications as read for user:", userId);

    // CRITICAL: Ensure Firestore is ready before updating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Get unread notifications
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      where("read", "==", false),
      limit(100) // Limit to avoid performance issues
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("✅ No unread notifications to mark as read");
      return;
    }

    // Use batch update for better performance
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    console.log(`✅ Marked ${snapshot.size} notifications as read`);
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
  }
}

// Get unread notifications count
export async function getUnreadNotificationsCount(
  userId: string
): Promise<number> {
  try {
    console.log("🔢 Getting unread notifications count for user:", userId);

    // CRITICAL: Ensure Firestore is ready before querying
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Query unread notifications
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(q);
    console.log(`✅ Found ${snapshot.size} unread notifications`);

    return snapshot.size;
  } catch (error) {
    console.error("❌ Error getting unread notifications count:", error);
    return 0;
  }
}

// Listen for real-time booking status changes
export function listenForBookingStatusChanges(
  userId: string,
  callback: (bookingId: string, status: string) => void
): () => void {
  console.log("🔔 Setting up booking status changes listener for:", userId);

  const database = getDatabase();
  const bookingsRef = ref(database, `booking_status_changes/${userId}`);

  // Listen for changes
  onValue(bookingsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Process each booking status change
    Object.entries(data).forEach(
      ([bookingId, statusData]: [string, unknown]) => {
        const status = (statusData as { status: string }).status;
        console.log(`📣 Booking ${bookingId} status changed to: ${status}`);

        // Call the callback with the booking ID and status
        callback(bookingId, status);
      }
    );
  });

  // Return cleanup function
  return () => {
    console.log("🧹 Cleaning up booking status changes listener");
    off(bookingsRef);
  };
}

// Clean up all notification listeners
export function cleanupAllNotificationListeners(): void {
  console.log(
    `🧹 Cleaning up all ${activeNotificationListeners.size} notification listeners`
  );

  activeNotificationListeners.forEach((unsubscribe, listenerId) => {
    console.log("🧹 Cleaning up notification listener:", listenerId);
    unsubscribe();
  });

  activeNotificationListeners.clear();
  notificationListenerIdCounter = 0;
}

export function subscribeToAdminNotifications(
  adminId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const db = getFirestoreInstance();
  if (!db) {
    console.warn(
      "⚠️ Firestore not available for admin notifications subscription"
    );
    callback([]);
    return () => {};
  }
  const notificationsRef = collection(db, "notifications");

  const q = query(
    notificationsRef,
    where("userId", "==", adminId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Notification)
    );
    callback(notifications);
  });

  return unsubscribe;
}

// Create admin notification for new professional registration
export async function createAdminNotificationForNewProfessional(
  professionalId: string,
  professionalName: string,
  professionalEmail: string
): Promise<string> {
  try {
    console.log(
      "🔔 Creating admin notification for new professional:",
      professionalName
    );

    // CRITICAL: Ensure Firestore is ready before creating
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Find admin user - use a simpler approach that doesn't require complex queries
    // We'll use the known admin ID directly
    const adminId = "FYostm61DLbrax729IYT6OBHSuA3"; // Known admin ID

    console.log("✅ Using known admin ID:", adminId);

    // Create notification in Firestore
    const notificationsRef = collection(db, "notifications");

    const notificationData = {
      userId: adminId,
      type: "new_professional_registration",
      title: "Nouveau professionnel inscrit",
      content: `Un professionnel s'est inscrit et attend votre approbation. Nom: ${professionalName}, Email: ${professionalEmail}`,
      sourceId: professionalId,
      sourceType: "professional_registration",
      read: false,
      redirectPath: "/admin/users",
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log("✅ Admin notification created successfully:", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("❌ Error creating admin notification:", error);
    throw new Error("Failed to create admin notification");
  }
}

// Créer une notification de demande de retrait pour un professionnel
export const createWithdrawalRequestNotification = async (
  professionalId: string,
  amount: number,
  method: string,
  status: "pending" | "approved" | "rejected" | "paid" | "cancelled"
): Promise<string> => {
  try {
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    let title = "";
    let message = "";

    switch (status) {
      case "pending":
        title = "Demande de retrait en attente";
        message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${method} est en cours de traitement.`;
        break;
      case "approved":
        title = "Demande de retrait approuvée";
        message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${method} a été approuvée. Le paiement sera effectué prochainement.`;
        break;
      case "rejected":
        title = "Demande de retrait rejetée";
        message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${method} a été rejetée. Contactez l'administrateur pour plus d'informations.`;
        break;
      case "paid":
        title = "Retrait effectué";
        message = `Votre retrait de ${amount.toLocaleString()} FCFA via ${method} a été effectué avec succès.`;
        break;
      case "cancelled":
        title = "Demande de retrait annulée";
        message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${method} a été annulée.`;
        break;
    }

    const notification = {
      userId: professionalId,
      type: "withdrawal_request",
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      data: {
        amount,
        method,
        status,
        type: "withdrawal",
      },
    };

    const docRef = await addDoc(collection(db, "notifications"), notification);
    console.log("✅ [NOTIF] Notification de retrait créée:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ [NOTIF] Erreur création notification retrait:", error);
    throw error;
  }
};

// Créer une notification de mise à jour de statut de retrait
export const createWithdrawalStatusUpdateNotification = async (
  professionalId: string,
  amount: number,
  method: string,
  oldStatus: string,
  newStatus: string,
  adminNote?: string
): Promise<string> => {
  try {
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    let title = "";
    let message = "";

    switch (newStatus) {
      case "approved":
        title = "Retrait approuvé";
        message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${method} a été approuvée.`;
        break;
      case "rejected":
        title = "Retrait rejeté";
        message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${method} a été rejetée.`;
        if (adminNote) {
          message += ` Raison: ${adminNote}`;
        }
        break;
      case "paid":
        title = "Retrait payé";
        message = `Votre retrait de ${amount.toLocaleString()} FCFA via ${method} a été effectué avec succès.`;
        break;
      case "cancelled":
        title = "Retrait annulé";
        message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${method} a été annulée.`;
        if (adminNote) {
          message += ` Raison: ${adminNote}`;
        }
        break;
      default:
        title = "Mise à jour du statut de retrait";
        message = `Le statut de votre demande de retrait de ${amount.toLocaleString()} FCFA via ${method} est passé de "${oldStatus}" à "${newStatus}".`;
    }

    const notification = {
      userId: professionalId,
      type: "withdrawal_status_update",
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      data: {
        amount,
        method,
        oldStatus,
        newStatus,
        adminNote,
        type: "withdrawal",
      },
    };

    const docRef = await addDoc(collection(db, "notifications"), notification);
    console.log(
      "✅ [NOTIF] Notification de mise à jour de statut créée:",
      docRef.id
    );
    return docRef.id;
  } catch (error) {
    console.error(
      "❌ [NOTIF] Erreur création notification mise à jour:",
      error
    );
    throw error;
  }
};

// Créer une notification de transaction (consultation ou retrait)
export const createTransactionNotification = async (
  professionalId: string,
  transactionType: "consultation" | "withdrawal",
  amount: number,
  status: "pending" | "completed" | "failed" | "cancelled",
  details: {
    patientName?: string;
    consultationType?: string;
    method?: string;
    accountNumber?: string;
    reason?: string;
  } = {}
): Promise<string> => {
  try {
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    let title = "";
    let message = "";

    if (transactionType === "consultation") {
      switch (status) {
        case "pending":
          title = "Consultation en attente de paiement";
          message = `Consultation ${details.consultationType || ""} avec ${
            details.patientName || "le patient"
          } - Montant: ${amount.toLocaleString()} FCFA`;
          break;
        case "completed":
          title = "Consultation payée";
          message = `Consultation ${details.consultationType || ""} avec ${
            details.patientName || "le patient"
          } - Paiement reçu: ${amount.toLocaleString()} FCFA`;
          break;
        case "failed":
          title = "Échec du paiement de consultation";
          message = `Le paiement de la consultation ${
            details.consultationType || ""
          } avec ${details.patientName || "le patient"} a échoué.`;
          break;
        case "cancelled":
          title = "Consultation annulée";
          message = `La consultation ${details.consultationType || ""} avec ${
            details.patientName || "le patient"
          } a été annulée.`;
          break;
      }
    } else if (transactionType === "withdrawal") {
      switch (status) {
        case "pending":
          title = "Demande de retrait en attente";
          message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${
            details.method || ""
          } est en cours de traitement.`;
          break;
        case "completed":
          title = "Retrait effectué";
          message = `Votre retrait de ${amount.toLocaleString()} FCFA via ${
            details.method || ""
          } a été effectué avec succès.`;
          break;
        case "failed":
          title = "Échec du retrait";
          message = `Votre retrait de ${amount.toLocaleString()} FCFA via ${
            details.method || ""
          } a échoué.`;
          break;
        case "cancelled":
          title = "Retrait annulé";
          message = `Votre demande de retrait de ${amount.toLocaleString()} FCFA via ${
            details.method || ""
          } a été annulée.`;
          if (details.reason) {
            message += ` Raison: ${details.reason}`;
          }
          break;
      }
    }

    // Filtrer les champs undefined pour éviter les erreurs Firestore
    const cleanDetails = Object.fromEntries(
      Object.entries(details).filter(([, value]) => value !== undefined)
    );

    const notification = {
      userId: professionalId,
      type: "transaction_update",
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      data: {
        transactionType,
        amount,
        status,
        ...cleanDetails,
        type: "transaction",
      },
    };

    const docRef = await addDoc(collection(db, "notifications"), notification);
    console.log("✅ [NOTIF] Notification de transaction créée:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error(
      "❌ [NOTIF] Erreur création notification transaction:",
      error
    );
    throw error;
  }
};

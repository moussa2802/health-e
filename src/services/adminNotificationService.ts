import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { retryFirestoreOperation } from "../utils/firebase";

// Types pour les notifications admin
export interface AdminNotification {
  id: string;
  type:
    | "withdrawal"
    | "user"
    | "new_professional_registration"
    | "appointment"
    | "system"
    | "message"
    | "support"
    | "support_message";
  title: string;
  message: string;
  status: "unread" | "read";
  createdAt: unknown; // Timestamp
  data?: Record<string, unknown>; // Données supplémentaires selon le type
  actionUrl?: string; // URL pour agir sur la notification
  adminId?: string; // ID de l'admin qui a traité la notification
}

// Types pour la création
export interface CreateAdminNotificationData {
  type: AdminNotification["type"];
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

// Récupérer les notifications admin
export async function getAdminNotifications(
  adminId: string,
  status?: "unread" | "read",
  type?: AdminNotification["type"],
  limitCount: number = 100
): Promise<AdminNotification[]> {
  try {
    const db = getFirestore();

    const notificationsRef = collection(db, "notifications");
    const filters = [where("userId", "==", adminId)];

    if (status) {
      filters.push(where("read", "==", status === "read"));
    }
    if (type) {
      filters.push(where("type", "==", type));
    }

    const q = query(
      notificationsRef,
      ...filters,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const notifications: AdminNotification[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const message = data.message ?? data.content ?? "Aucun message";
      const statusStr: "read" | "unread" = data.read ? "read" : "unread";

      notifications.push({
        id: doc.id,
        type: (data.type as AdminNotification["type"]) || "system",
        title: data.title || "Notification",
        message,
        status: statusStr,
        createdAt: data.createdAt,
        data: data.data || {},
        actionUrl: data.actionUrl || "",
      });
    });

    console.log(`✅ ${notifications.length} notifications admin récupérées`);
    return notifications;
  } catch (error) {
    console.error("❌ Erreur récupération notifications admin:", error);
    return [];
  }
}

// Subscription en temps réel pour les notifications admin
export function subscribeToAdminNotificationsRealtime(
  adminId: string,
  callback: (notifications: AdminNotification[]) => void
): Unsubscribe {
  try {
    const db = getFirestore();

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", adminId),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications: AdminNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const message = data.message ?? data.content ?? "Aucun message";
        const statusStr: "read" | "unread" = data.read ? "read" : "unread";

        notifications.push({
          id: doc.id,
          type: (data.type as AdminNotification["type"]) || "system",
          title: data.title || "Notification",
          message,
          status: statusStr,
          createdAt: data.createdAt,
          data: data.data || {},
          actionUrl: data.actionUrl || "",
        });
      });
      callback(notifications);
    });
  } catch (error) {
    console.error("❌ [ADMIN] Erreur subscription notifications:", error);
    return () => {};
  }
}

// Marquer une notification comme lue
export async function markAdminNotificationAsRead(
  notificationId: string,
  adminId: string
): Promise<void> {
  try {
    const db = getFirestore();

    await retryFirestoreOperation(() =>
      updateDoc(doc(db, "notifications", notificationId), {
        read: true,
        readAt: serverTimestamp(),
        adminId,
      })
    );

    console.log("✅ [ADMIN] Notification marquée comme lue:", notificationId);
  } catch (error) {
    console.error("❌ [ADMIN] Erreur marquage notification:", error);
    throw error;
  }
}

// Marquer toutes les notifications comme lues
export async function markAllAdminNotificationsAsRead(
  adminId: string
): Promise<void> {
  try {
    const db = getFirestore();

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", adminId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, {
        read: true,
        readAt: serverTimestamp(),
        adminId,
      });
    });

    await batch.commit();
    console.log(
      `✅ [ADMIN] ${snapshot.size} notifications marquées comme lues`
    );
  } catch (error) {
    console.error("❌ [ADMIN] Erreur marquage toutes notifications:", error);
    throw error;
  }
}

// Supprimer une notification
export async function deleteAdminNotification(
  notificationId: string
): Promise<void> {
  try {
    const db = getFirestore();

    await retryFirestoreOperation(() =>
      deleteDoc(doc(db, "notifications", notificationId))
    );

    console.log("✅ [ADMIN] Notification supprimée:", notificationId);
  } catch (error) {
    console.error("❌ [ADMIN] Erreur suppression notification:", error);
    throw error;
  }
}

// Créer une notification de demande de retrait
export const createAdminWithdrawalRequestNotification = async (
  professionalId: string,
  professionalName: string,
  amount: number,
  method: string,
  withdrawalId: string
): Promise<string> => {
  try {
    const db = getFirestore();

    const adminId = "FYostm61DLbrax729IYT6OBHSuA3"; // ID admin connu

    const notification = {
      userId: adminId,
      type: "withdrawal",
      title: "Nouvelle demande de retrait",
      message: `${professionalName} a demandé un retrait de ${amount.toLocaleString()} FCFA via ${method}`,
      read: false,
      createdAt: serverTimestamp(),
      data: {
        professionalId,
        professionalName,
        amount,
        method,
        withdrawalId,
        type: "withdrawal",
      },
      actionUrl: "/admin/withdrawals",
    };

    const docRef = await addDoc(collection(db, "notifications"), notification);
    console.log(
      "✅ [ADMIN NOTIF] Notification de retrait admin créée:",
      docRef.id
    );
    return docRef.id;
  } catch (error) {
    console.error(
      "❌ [ADMIN NOTIF] Erreur création notification retrait admin:",
      error
    );
    throw error;
  }
};

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { retryFirestoreOperation } from "../utils/firebase";

// Types pour les notifications admin
export interface AdminNotification {
  id: string;
  type: "withdrawal" | "user" | "appointment" | "system" | "message" | "support";
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

// Créer une nouvelle notification admin
export const createAdminNotification = async (
  notificationData: CreateAdminNotificationData
): Promise<string> => {
  try {
    const db = getFirestore();

    const notification = {
      ...notificationData,
      status: "unread" as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await retryFirestoreOperation(() =>
      addDoc(collection(db, "adminNotifications"), notification)
    );

    console.log("✅ [ADMIN] Notification créée:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ [ADMIN] Erreur création notification:", error);
    throw error;
  }
};

// Créer une notification de demande de retrait
export const createWithdrawalNotification = async (
  professionalId: string,
  professionalName: string,
  amount: number,
  method: string
): Promise<string> => {
  return createAdminNotification({
    type: "withdrawal",
    title: "Nouvelle demande de retrait",
    message: `${professionalName} a demandé un retrait de ${amount.toLocaleString()} FCFA via ${method}`,
    data: {
      professionalId,
      professionalName,
      amount,
      method,
    },
    actionUrl: "/admin/withdrawals",
  });
};

// Créer une notification de nouveau professionnel
export const createNewProfessionalNotification = async (
  professionalId: string,
  professionalName: string,
  specialty: string
): Promise<string> => {
  return createAdminNotification({
    type: "user",
    title: "Nouveau professionnel inscrit",
    message: `${professionalName} (${specialty}) s'est inscrit et attend validation`,
    data: {
      professionalId,
      professionalName,
      specialty,
    },
    actionUrl: "/admin/professionals",
  });
};

// Créer une notification de consultation annulée
export const createCancelledAppointmentNotification = async (
  appointmentId: string,
  patientName: string,
  appointmentDate: string
): Promise<string> => {
  return createAdminNotification({
    type: "appointment",
    title: "Consultation annulée",
    message: `Consultation du ${appointmentDate} annulée par ${patientName}`,
    data: {
      appointmentId,
      patientName,
      appointmentDate,
    },
    actionUrl: "/admin/appointments",
  });
};

// Récupérer toutes les notifications admin
export const getAdminNotifications = async (
  status?: "unread" | "read",
  type?: AdminNotification["type"],
  limitCount: number = 100
): Promise<AdminNotification[]> => {
  try {
    const db = getFirestore();

    // Utiliser la collection "notifications" au lieu de "adminNotifications"
    const notificationsRef = collection(db, "notifications");

    // Filtrer par userId pour l'admin connecté
    // TODO: Récupérer l'adminId depuis le contexte d'authentification
    const adminId = "FYostm61DLbrax729IYT6OBHSuA3"; // ID admin connu

    let q = query(
      notificationsRef,
      where("userId", "==", adminId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    // Ajouter les filtres si spécifiés
    if (status && type) {
      q = query(
        notificationsRef,
        where("userId", "==", adminId),
        where("read", "==", status === "read"),
        where("type", "==", type),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    } else if (status) {
      q = query(
        notificationsRef,
        where("userId", "==", adminId),
        where("read", "==", status === "read"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    } else if (type) {
      q = query(
        notificationsRef,
        where("userId", "==", adminId),
        where("type", "==", type),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }

    const snapshot = await retryFirestoreOperation(() => getDocs(q));

    const notifications: AdminNotification[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Adapter la structure des données réelles au format AdminNotification
      const notification: AdminNotification = {
        id: doc.id,
        type: mapNotificationType(data.type),
        title: data.title || "Notification",
        message: data.content || "Aucun message", // content → message
        status: data.read ? "read" : "unread", // read → status
        createdAt: data.createdAt,
        data: {
          sourceId: data.sourceId,
          sourceType: data.sourceType,
          redirectPath: data.redirectPath,
        },
        actionUrl: data.redirectPath || "", // redirectPath → actionUrl
      };

      notifications.push(notification);
    });

    return notifications;
  } catch (error) {
    console.error("❌ [ADMIN] Erreur récupération notifications:", error);
    return [];
  }
};

// Fonction helper pour mapper les types de notifications
const mapNotificationType = (
  firestoreType: string
): AdminNotification["type"] => {
  switch (firestoreType) {
    case "new_professional_registration":
      return "user";
    case "withdrawal_request":
      return "withdrawal";
    case "appointment_cancelled":
      return "appointment";
    case "new_message":
      return "message";
    case "support_request":
      return "support";
    case "system_maintenance":
      return "system";
    default:
      return "system";
  }
};

// Marquer une notification comme lue
export const markNotificationAsRead = async (
  notificationId: string,
  adminId: string
): Promise<void> => {
  try {
    const db = getFirestore();

    const docRef = doc(db, "adminNotifications", notificationId);
    await retryFirestoreOperation(() =>
      updateDoc(docRef, {
        status: "read",
        adminId,
      })
    );

    console.log("✅ [ADMIN] Notification marquée comme lue:", notificationId);
  } catch (error) {
    console.error("❌ [ADMIN] Erreur marquage lu:", error);
    throw error;
  }
};

// Marquer toutes les notifications comme lues
export const markAllNotificationsAsRead = async (
  adminId: string
): Promise<void> => {
  try {
    const db = getFirestore();

    const unreadNotifications = await getAdminNotifications("unread");

    const updatePromises = unreadNotifications.map((notification) => {
      const docRef = doc(db, "adminNotifications", notification.id);
      return retryFirestoreOperation(() =>
        updateDoc(docRef, {
          status: "read",
          adminId,
        })
      );
    });

    await Promise.all(updatePromises);

    console.log("✅ [ADMIN] Toutes les notifications marquées comme lues");
  } catch (error) {
    console.error("❌ [ADMIN] Erreur marquage toutes lues:", error);
    throw error;
  }
};

// Supprimer une notification
export const deleteAdminNotification = async (
  notificationId: string
): Promise<void> => {
  try {
    const db = getFirestore();

    const docRef = doc(db, "adminNotifications", notificationId);
    await retryFirestoreOperation(() =>
      updateDoc(docRef, {
        status: "deleted",
        deletedAt: serverTimestamp(),
      })
    );

    console.log("✅ [ADMIN] Notification supprimée:", notificationId);
  } catch (error) {
    console.error("❌ [ADMIN] Erreur suppression notification:", error);
    throw error;
  }
};

// S'abonner aux notifications en temps réel
export const subscribeToAdminNotifications = (
  callback: (notifications: AdminNotification[]) => void,
  status?: "unread" | "read",
  type?: AdminNotification["type"]
): Unsubscribe => {
  try {
    const db = getFirestore();

    const notificationsRef = collection(db, "adminNotifications");
    let q = query(notificationsRef, orderBy("createdAt", "desc"), limit(100));

    // Ajouter les filtres si spécifiés
    if (status && type) {
      q = query(
        notificationsRef,
        where("status", "==", status),
        where("type", "==", type),
        orderBy("createdAt", "desc"),
        limit(100)
      );
    } else if (status) {
      q = query(
        notificationsRef,
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(100)
      );
    } else if (type) {
      q = query(
        notificationsRef,
        where("type", "==", type),
        orderBy("createdAt", "desc"),
        limit(100)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const notifications: AdminNotification[] = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
        } as AdminNotification);
      });

      callback(notifications);
    });
  } catch (error) {
    console.error("❌ [ADMIN] Erreur abonnement notifications:", error);
    // Retourner une fonction no-op en cas d'erreur
    return () => {};
  }
};

// Obtenir le nombre de notifications non lues
export const getUnreadNotificationsCount = async (): Promise<number> => {
  try {
    const unreadNotifications = await getAdminNotifications("unread");
    return unreadNotifications.length;
  } catch (error) {
    console.error("❌ [ADMIN] Erreur comptage notifications non lues:", error);
    return 0;
  }
};

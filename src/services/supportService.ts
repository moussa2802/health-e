import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { createNotification } from "./notificationService";
import { db } from "../utils/firebase";

export interface SupportTicket {
  id?: string;
  userId: string;
  userType: "patient" | "professional";
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  category: "technical" | "billing" | "account" | "consultation" | "other";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  assignedTo?: string | null;
  adminNotes?: string | null;
}

export interface SupportMessage {
  id?: string;
  ticketId: string;
  senderId: string;
  senderType: "user" | "admin";
  senderName: string;
  message: string;
  timestamp: Timestamp;
  isRead: boolean;
}

// Créer un nouveau ticket de support
export async function createSupportTicket(
  userId: string,
  userType: "patient" | "professional",
  userName: string,
  userEmail: string,
  subject: string,
  description: string,
  priority: "low" | "medium" | "high" | "urgent" = "medium",
  category:
    | "technical"
    | "billing"
    | "account"
    | "consultation"
    | "other" = "other"
): Promise<string> {
  try {
    if (!db) {
      throw new Error("Firestore non initialisé");
    }

    const ticketData: Omit<SupportTicket, "id" | "createdAt" | "updatedAt"> = {
      userId,
      userType,
      userName,
      userEmail,
      subject,
      description,
      priority,
      status: "open",
      category,
      assignedTo: null,
      adminNotes: null,
    };

    const docRef = await addDoc(collection(db, "supportTickets"), {
      ...ticketData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Créer une notification pour les administrateurs
    try {
      await createNotification(
        "admin", // ID spécial pour les administrateurs
        "support_message",
        "Nouveau ticket de support",
        `${userName} a créé un ticket de support: ${subject}`,
        docRef.id,
        "support",
        priority === "urgent" || priority === "high" ? "high" : "medium"
      );
      console.log("✅ Notification de support créée pour les administrateurs");
    } catch (notifyError) {
      console.warn(
        "⚠️ Échec de la création de la notification de support:",
        notifyError
      );
      // Continuer même si la notification échoue
    }

    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de la création du ticket:", error);
    throw new Error("Impossible de créer le ticket de support");
  }
}

// Ajouter un message à un ticket
export async function addMessageToTicket(
  ticketId: string,
  senderId: string,
  senderType: "user" | "admin",
  senderName: string,
  message: string
): Promise<string> {
  try {
    const messageData: Omit<SupportMessage, "id" | "timestamp"> = {
      ticketId,
      senderId,
      senderType,
      senderName,
      message,
      isRead: false,
    };

    const docRef = await addDoc(collection(db, "supportMessages"), {
      ...messageData,
      timestamp: serverTimestamp(),
    });

    // Mettre à jour le timestamp du ticket
    await updateDoc(doc(db, "supportTickets", ticketId), {
      updatedAt: serverTimestamp(),
    });

    // Créer une notification pour l'utilisateur si c'est un admin qui répond
    if (senderType === "admin") {
      try {
        // Récupérer les informations du ticket pour la notification
        const ticketRef = doc(db, "supportTickets", ticketId);
        const ticketSnap = await getDoc(ticketRef);
        if (ticketSnap.exists()) {
          const ticketData = ticketSnap.data();
          await createNotification(
            ticketData.userId, // Notifier l'utilisateur qui a créé le ticket
            "support_message",
            "Réponse du support",
            `Le support a répondu à votre ticket: ${ticketData.subject}`,
            ticketId,
            "support",
            "medium"
          );
          console.log("✅ Notification de réponse du support créée");
        }
      } catch (notifyError) {
        console.warn(
          "⚠️ Échec de la création de la notification de réponse:",
          notifyError
        );
        // Continuer même si la notification échoue
      }
    }

    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de l'ajout du message:", error);
    throw new Error("Impossible d'ajouter le message");
  }
}

// Récupérer tous les tickets (pour admin)
export async function getAllSupportTickets(): Promise<SupportTicket[]> {
  try {
    const q = query(
      collection(db, "supportTickets"),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SupportTicket[];
  } catch (error) {
    console.error("Erreur lors de la récupération des tickets:", error);
    throw new Error("Impossible de récupérer les tickets");
  }
}

// Récupérer les tickets d'un utilisateur
export async function getUserSupportTickets(
  userId: string
): Promise<SupportTicket[]> {
  try {
    const q = query(
      collection(db, "supportTickets"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SupportTicket[];
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des tickets utilisateur:",
      error
    );
    throw new Error("Impossible de récupérer les tickets");
  }
}

// Récupérer les messages d'un ticket
export async function getTicketMessages(
  ticketId: string
): Promise<SupportMessage[]> {
  try {
    const q = query(
      collection(db, "supportMessages"),
      where("ticketId", "==", ticketId),
      orderBy("timestamp", "asc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SupportMessage[];
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    throw new Error("Impossible de récupérer les messages");
  }
}

// Mettre à jour le statut d'un ticket
export async function updateTicketStatus(
  ticketId: string,
  status: SupportTicket["status"],
  adminNotes?: string | null
): Promise<void> {
  try {
    const updateData: Partial<SupportTicket> = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    await updateDoc(doc(db, "supportTickets", ticketId), updateData);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du ticket:", error);
    throw new Error("Impossible de mettre à jour le ticket");
  }
}

// Marquer les messages comme lus
export async function markMessagesAsRead(
  ticketId: string,
  userId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, "supportMessages"),
      where("ticketId", "==", ticketId),
      where("senderId", "!=", userId),
      where("isRead", "==", false)
    );

    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map((doc) =>
      updateDoc(doc.ref, { isRead: true })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Erreur lors du marquage des messages:", error);
  }
}

// Récupérer les statistiques de support
export async function getSupportStatistics(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
}> {
  try {
    const tickets = await getAllSupportTickets();

    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      inProgress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      closed: tickets.filter((t) => t.status === "closed").length,
      urgent: tickets.filter((t) => t.priority === "urgent").length,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      urgent: 0,
    };
  }
}

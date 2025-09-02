import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { retryFirestoreOperation } from "../utils/firebase";
import {
  createWithdrawalStatusUpdateNotification,
  createWithdrawalRequestNotification,
} from "./notificationService";

// Types pour les demandes de retrait
export interface WithdrawalRequest {
  id: string;
  professionalId: string;
  amount: number;
  method: "wave" | "orange-money" | "bank-transfer";
  accountNumber: string;
  status: "pending" | "approved" | "rejected" | "paid" | "cancelled";
  createdAt: unknown; // Timestamp
  processedAt?: unknown; // Timestamp
  processedBy?: string; // Admin ID
  note?: string;
  txId?: string; // Transaction ID externe
}

// Interface étendue avec les infos du professionnel
export interface WithdrawalWithProfessionalInfo extends WithdrawalRequest {
  professionalName: string;
  professionalEmail: string;
  professionalSpecialty: string;
}

// Types pour les mises à jour
export interface WithdrawalUpdate {
  status?: "pending" | "approved" | "rejected" | "paid";
  processedAt?: unknown;
  processedBy?: string;
  note?: string;
  txId?: string;
}

// Créer une nouvelle demande de retrait
export const createWithdrawalRequest = async (
  professionalId: string,
  amount: number,
  method: "wave" | "orange-money" | "bank-transfer",
  accountNumber: string
): Promise<string> => {
  try {
    const db = getFirestore();

    const withdrawalData = {
      professionalId,
      amount,
      method,
      accountNumber,
      status: "pending" as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await retryFirestoreOperation(() =>
      addDoc(collection(db, "withdrawalRequests"), withdrawalData)
    );

    // Créer une notification pour le professionnel
    await createWithdrawalRequestNotification(
      professionalId,
      amount,
      method,
      "pending"
    );

    console.log("✅ [WITHDRAWAL] Demande de retrait créée:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ [WITHDRAWAL] Erreur création demande:", error);
    throw error;
  }
};

// Récupérer les demandes de retrait d'un professionnel
export const getProfessionalWithdrawalRequests = async (
  professionalId: string,
  limitCount: number = 50
): Promise<WithdrawalRequest[]> => {
  try {
    const db = getFirestore();

    const requestsRef = collection(db, "withdrawalRequests");
    const q = query(
      requestsRef,
      where("professionalId", "==", professionalId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await retryFirestoreOperation(() => getDocs(q));

    const requests: WithdrawalRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      } as WithdrawalRequest);
    });

    return requests;
  } catch (error) {
    console.error("❌ [WITHDRAWAL] Erreur récupération demandes:", error);
    return [];
  }
};

// Récupérer toutes les demandes de retrait (pour admin)
export const getAllWithdrawalRequests = async (
  status?: "pending" | "approved" | "rejected" | "paid",
  limitCount: number = 100
): Promise<WithdrawalRequest[]> => {
  try {
    const db = getFirestore();

    const requestsRef = collection(db, "withdrawalRequests");
    let q = query(requestsRef, orderBy("createdAt", "desc"), limit(limitCount));

    // Ajouter le filtre par statut si spécifié
    if (status) {
      q = query(
        requestsRef,
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }

    const snapshot = await retryFirestoreOperation(() => getDocs(q));

    const requests: WithdrawalRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      } as WithdrawalRequest);
    });

    return requests;
  } catch (error) {
    console.error(
      "❌ [WITHDRAWAL] Erreur récupération toutes demandes:",
      error
    );
    return [];
  }
};

// Supprimer cette première version de la fonction

// Récupérer toutes les demandes de retrait enrichies avec les infos du professionnel (pour admin)
export const getAllWithdrawalRequestsWithProfessionalInfo = async (
  status?: "pending" | "approved" | "rejected" | "paid",
  limitCount: number = 100
): Promise<WithdrawalRequest[]> => {
  try {
    const db = getFirestore();

    const requestsRef = collection(db, "withdrawalRequests");
    let q = query(requestsRef, orderBy("createdAt", "desc"), limit(limitCount));

    // Ajouter le filtre par statut si spécifié
    if (status) {
      q = query(
        requestsRef,
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }

    const snapshot = await retryFirestoreOperation(() => getDocs(q));

    const requests: WithdrawalRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      } as WithdrawalRequest);
    });

    // Enrichir avec les informations des professionnels
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        try {
          const professionalRef = doc(
            db,
            "professionals",
            request.professionalId
          );
          const professionalSnap = await retryFirestoreOperation(() =>
            getDoc(professionalRef)
          );

          if (professionalSnap.exists()) {
            const professionalData = professionalSnap.data();
            return {
              ...request,
              professionalName: professionalData.name || "Nom non disponible",
              professionalEmail:
                professionalData.email || "Email non disponible",
              professionalSpecialty:
                professionalData.specialty || "Spécialité non disponible",
            };
          }

          return {
            ...request,
            professionalName: "Professionnel non trouvé",
            professionalEmail: "Email non disponible",
            professionalSpecialty: "Spécialité non disponible",
          };
        } catch (error) {
          console.warn(
            "⚠️ [WITHDRAWAL] Erreur enrichissement professionnel:",
            request.professionalId,
            error
          );
          return {
            ...request,
            professionalName: "Erreur chargement",
            professionalEmail: "Email non disponible",
            professionalSpecialty: "Spécialité non disponible",
          };
        }
      })
    );

    return enrichedRequests;
  } catch (error) {
    console.error(
      "❌ [WITHDRAWAL] Erreur récupération toutes demandes enrichies:",
      error
    );
    return [];
  }
};

// Récupérer une demande de retrait spécifique
export const getWithdrawalRequest = async (
  requestId: string
): Promise<WithdrawalRequest | null> => {
  try {
    const db = getFirestore();

    const docRef = doc(db, "withdrawalRequests", requestId);
    const docSnap = await retryFirestoreOperation(() => getDoc(docRef));

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as WithdrawalRequest;
    }

    return null;
  } catch (error) {
    console.error("❌ [WITHDRAWAL] Erreur récupération demande:", error);
    return null;
  }
};

// Mettre à jour le statut d'une demande de retrait
export const updateWithdrawalRequestStatus = async (
  withdrawalId: string,
  newStatus: WithdrawalRequest["status"],
  adminId: string,
  note?: string,
  txId?: string
): Promise<void> => {
  try {
    const db = getFirestore();
    const withdrawalRef = doc(db, "withdrawalRequests", withdrawalId);

    // Récupérer les données actuelles pour obtenir l'ancien statut
    const currentData = await retryFirestoreOperation(() =>
      getDoc(withdrawalRef)
    );
    if (!currentData.exists()) {
      throw new Error("Demande de retrait non trouvée");
    }

    const currentWithdrawal = currentData.data() as WithdrawalRequest;
    const oldStatus = currentWithdrawal.status;

    // Mettre à jour le statut
    const updateData: Partial<WithdrawalRequest> = {
      status: newStatus,
      processedAt: serverTimestamp(),
      processedBy: adminId,
    };

    if (note) updateData.note = note;
    if (txId) updateData.txId = txId;

    await retryFirestoreOperation(() => updateDoc(withdrawalRef, updateData));

    // Créer une notification pour le professionnel
    await createWithdrawalStatusUpdateNotification(
      currentWithdrawal.professionalId,
      currentWithdrawal.amount,
      currentWithdrawal.method,
      oldStatus,
      newStatus,
      note
    );

    console.log(
      "✅ [WITHDRAWAL] Statut mis à jour:",
      withdrawalId,
      "de",
      oldStatus,
      "à",
      newStatus
    );
  } catch (error) {
    console.error("❌ [WITHDRAWAL] Erreur mise à jour statut:", error);
    throw error;
  }
};

// Approuver une demande de retrait
export const approveWithdrawalRequest = async (
  requestId: string,
  adminId: string,
  note?: string
): Promise<void> => {
  await updateWithdrawalRequestStatus(requestId, "approved", adminId, note);
};

// Rejeter une demande de retrait
export const rejectWithdrawalRequest = async (
  requestId: string,
  adminId: string,
  note: string
): Promise<void> => {
  await updateWithdrawalRequestStatus(requestId, "rejected", adminId, note);
};

// Marquer une demande comme payée
export const markWithdrawalAsPaid = async (
  requestId: string,
  adminId: string,
  txId: string,
  note?: string
): Promise<void> => {
  await updateWithdrawalRequestStatus(requestId, "paid", adminId, note, txId);
};

// Annuler une demande de retrait
export const cancelWithdrawalRequest = async (
  requestId: string,
  adminId: string,
  reason?: string
): Promise<void> => {
  await updateWithdrawalRequestStatus(requestId, "cancelled", adminId, reason);
};

// Calculer les statistiques de retrait pour un professionnel
export const calculateWithdrawalStats = async (
  professionalId: string
): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  paid: number;
  cancelled: number;
  total: number;
}> => {
  try {
    const requests = await getProfessionalWithdrawalRequests(
      professionalId,
      1000
    );

    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      cancelled: 0,
      total: 0,
    };

    requests.forEach((request) => {
      stats[request.status] += request.amount;
      stats.total += request.amount;
    });

    return stats;
  } catch (error) {
    console.error("❌ [WITHDRAWAL] Erreur calcul stats:", error);
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      cancelled: 0,
      total: 0,
    };
  }
};

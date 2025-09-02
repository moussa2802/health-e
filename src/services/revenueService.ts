import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { retryFirestoreOperation } from "../utils/firebase";
import { getAuth } from "firebase/auth";
import {
  getProfessionalWithdrawalRequests,
  calculateWithdrawalStats,
} from "./withdrawalService";

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

export interface RevenueTransaction {
  id?: string;
  professionalId: string;
  patientId?: string;
  bookingId?: string;
  type: "consultation" | "withdrawal";
  amount: number; // Montant total
  platformFee: number; // Commission plateforme (15%)
  professionalAmount: number; // Montant professionnel (85%)
  status: "pending" | "completed" | "failed" | "cancelled";
  description: string;
  patientName?: string;
  professionalName?: string;
  consultationType?: string;
  withdrawalMethod?: "wave" | "orange-money" | "bank-transfer";
  accountNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  notes?: string;
}

export interface WithdrawalRequest {
  id?: string;
  professionalId: string;
  amount: number;
  method: "wave" | "orange-money" | "bank-transfer";
  accountNumber: string;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  notes?: string;
  transactionId?: string; // Référence vers revenue_transactions
}

export interface RevenueCalculation {
  totalEarned: number; // Total gagné (85% des consultations)
  available: number; // Disponible pour retrait
  pending: number; // Retraits en attente
  withdrawn: number; // Retraits effectués
  platformFees: number; // Total des commissions
  thisMonth: number; // Revenus du mois en cours
  lastMonth: number; // Revenus du mois précédent
}

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Crée une transaction de revenu pour une consultation PayTech
 * @param professionalId ID du professionnel
 * @param patientId ID du patient
 * @param bookingId ID du rendez-vous
 * @param amount Montant total de la consultation
 * @param patientName Nom du patient
 * @param professionalName Nom du professionnel
 * @param consultationType Type de consultation
 * @returns ID de la transaction créée
 */
export const createConsultationRevenue = async (
  professionalId: string,
  patientId: string,
  bookingId: string,
  amount: number,
  patientName: string,
  professionalName: string,
  consultationType: string
): Promise<string> => {
  try {
    console.log("💰 [REVENUE] Creating consultation revenue:", {
      professionalId,
      bookingId,
      amount,
    });

    // Calcul des montants
    const platformFee = Math.round(amount * 0.15); // 15% de commission
    const professionalAmount = amount - platformFee; // 85% pour le professionnel

    const transaction: Omit<RevenueTransaction, "id"> = {
      professionalId,
      patientId,
      bookingId,
      type: "consultation",
      amount,
      platformFee,
      professionalAmount,
      status: "completed", // PayTech = paiement immédiat
      description: `Consultation ${consultationType} - ${patientName}`,
      patientName,
      professionalName,
      consultationType,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      completedAt: serverTimestamp() as Timestamp,
    };

    const db = getFirestore();
    const transactionsRef = collection(db, "revenue_transactions");

    const docRef = await retryFirestoreOperation(() =>
      addDoc(transactionsRef, transaction)
    );

    console.log("✅ [REVENUE] Consultation revenue created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ [REVENUE] Error creating consultation revenue:", error);
    throw new Error("Erreur lors de la création de la transaction de revenu");
  }
};

/**
 * Crée une demande de retrait
 * @param withdrawalData Données du retrait
 * @returns ID du retrait créé
 */
export const createWithdrawalRequest = async (
  withdrawalData: Omit<WithdrawalRequest, "id" | "status" | "requestedAt">
): Promise<string> => {
  try {
    console.log("💰 [REVENUE] Creating withdrawal request:", withdrawalData);

    // Récupérer le token Firebase
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Utilisateur non connecté");
    }

    const token = await currentUser.getIdToken();

    // Appeler la fonction Netlify pour créer le retrait
    const response = await fetch("/.netlify/functions/create-withdrawal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(withdrawalData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [REVENUE] HTTP error:", response.status, errorText);

      if (response.status === 401) {
        throw new Error("Token d'authentification invalide");
      } else if (response.status === 403) {
        throw new Error("Vous n'êtes pas autorisé à effectuer cette action");
      } else if (response.status === 400) {
        throw new Error("Données de retrait invalides");
      } else {
        throw new Error(`Erreur serveur: ${response.status}`);
      }
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    console.log("✅ [REVENUE] Withdrawal request created:", result.id);
    return result.id;
  } catch (error) {
    console.error("❌ [REVENUE] Error creating withdrawal request:", error);
    throw new Error("Erreur lors de la création de la demande de retrait");
  }
};

/**
 * Calcule les revenus d'un professionnel
 * @param professionalId ID du professionnel
 * @returns Calcul complet des revenus
 */
export const calculateProfessionalRevenue = async (
  professionalId: string
): Promise<RevenueCalculation> => {
  try {
    console.log(
      "💰 [REVENUE] Calculating revenue for professional:",
      professionalId
    );

    const db = getFirestore();

    // 1. Récupérer toutes les transactions de consultation
    const transactionsRef = collection(db, "revenue_transactions");
    const transactionsQuery = query(
      transactionsRef,
      where("professionalId", "==", professionalId),
      where("type", "==", "consultation"),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc")
    );

    const transactionsSnapshot = await retryFirestoreOperation(() =>
      getDocs(transactionsQuery)
    );

    const transactions: RevenueTransaction[] = [];
    transactionsSnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
      } as RevenueTransaction);
    });

    // 2. Récupérer les demandes de retrait (nouvelle collection)
    const withdrawalStats = await calculateWithdrawalStats(professionalId);

    // 3. Calculs
    const totalEarned = transactions.reduce(
      (sum, t) => sum + t.professionalAmount,
      0
    );

    const platformFees = transactions.reduce(
      (sum, t) => sum + t.platformFee,
      0
    );

    // Utiliser les nouvelles stats de retrait
    const pending = withdrawalStats.pending + withdrawalStats.approved;
    const withdrawn = withdrawalStats.paid;
    const available = totalEarned - withdrawn; // Ne pas déduire le pending

    // 4. Calculs par mois
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = transactions
      .filter((t) => {
        const transactionDate = t.createdAt.toDate();
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + t.professionalAmount, 0);

    const lastMonth = transactions
      .filter((t) => {
        const transactionDate = t.createdAt.toDate();
        const lastMonthDate = new Date(currentYear, currentMonth - 1);
        return (
          transactionDate.getMonth() === lastMonthDate.getMonth() &&
          transactionDate.getFullYear() === lastMonthDate.getFullYear()
        );
      })
      .reduce((sum, t) => sum + t.professionalAmount, 0);

    const revenue: RevenueCalculation = {
      totalEarned,
      available: Math.max(0, available),
      pending,
      withdrawn,
      platformFees,
      thisMonth,
      lastMonth,
    };

    return revenue;
  } catch (error: any) {
    // Si c'est une erreur de permissions, les collections n'existent pas encore
    if (
      error?.code === "permission-denied" ||
      error?.message?.includes("permissions")
    ) {
      console.log(
        "ℹ️ [REVENUE] Collections not accessible yet, returning default values"
      );
      return {
        totalEarned: 0,
        available: 0,
        pending: 0,
        withdrawn: 0,
        platformFees: 0,
        thisMonth: 0,
        lastMonth: 0,
      };
    }

    console.error("❌ [REVENUE] Error calculating revenue:", error);
    return {
      totalEarned: 0,
      available: 0,
      pending: 0,
      withdrawn: 0,
      platformFees: 0,
      thisMonth: 0,
      lastMonth: 0,
    };
  }
};

/**
 * Récupère l'historique des transactions d'un professionnel
 * @param professionalId ID du professionnel
 * @param limit Nombre maximum de transactions
 * @returns Liste des transactions
 */
export const getProfessionalTransactions = async (
  professionalId: string,
  limit: number = 50
): Promise<RevenueTransaction[]> => {
  try {
    const db = getFirestore();

    // Récupérer les transactions de revenus
    const transactionsRef = collection(db, "revenue_transactions");
    const transactionsQuery = query(
      transactionsRef,
      where("professionalId", "==", professionalId),
      orderBy("createdAt", "desc")
    );

    // Récupérer les demandes de retrait (nouvelle collection)
    const withdrawalRequests = await getProfessionalWithdrawalRequests(
      professionalId,
      limit
    );

    // Exécuter la requête des transactions
    const transactionsSnapshot = await retryFirestoreOperation(() =>
      getDocs(transactionsQuery)
    );

    const transactions: RevenueTransaction[] = [];

    // Ajouter les transactions de revenus
    transactionsSnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
      } as RevenueTransaction);
    });

    // Ajouter les demandes de retrait (convertis au format RevenueTransaction)
    withdrawalRequests.forEach((request) => {
      transactions.push({
        id: request.id,
        professionalId: request.professionalId,
        patientId: "", // Pas de patient pour un retrait
        bookingId: "", // Pas de booking pour un retrait
        type: "withdrawal",
        amount: request.amount,
        platformFee: 0, // Pas de commission sur les retraits
        professionalAmount: request.amount,
        status: request.status === "paid" ? "completed" : request.status,
        description: `Demande de retrait vers ${request.method}`,
        patientName: "", // Pas de patient pour un retrait
        professionalName: "", // Sera rempli si nécessaire
        consultationType: "", // Pas de consultation pour un retrait
        createdAt: request.createdAt,
        updatedAt: request.processedAt || request.createdAt,
        completedAt: request.processedAt || null,
        withdrawalMethod: request.method,
        accountNumber: request.accountNumber,
      } as RevenueTransaction);
    });

    // Trier par date (plus récent en premier) et limiter
    const sortedTransactions = transactions.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedTransactions.slice(0, limit);
  } catch (error) {
    console.error("❌ [REVENUE] Error getting transactions:", error);
    return [];
  }
};

/**
 * Met à jour le statut d'un retrait
 * @param withdrawalId ID du retrait
 * @param status Nouveau statut
 * @param notes Notes optionnelles
 */
export const updateWithdrawalStatus = async (
  withdrawalId: string,
  status: WithdrawalRequest["status"],
  notes?: string
): Promise<void> => {
  try {
    const db = getFirestore();
    const withdrawalRef = doc(db, "withdrawals", withdrawalId);

    const updateData: Partial<WithdrawalRequest> & { processedAt?: any } = {
      status,
    };
    if (status === "completed") {
      updateData.processedAt = serverTimestamp();
    }
    if (notes) {
      updateData.notes = notes;
    }

    await retryFirestoreOperation(() => updateDoc(withdrawalRef, updateData));
    console.log(
      "💰 [REVENUE] Withdrawal status updated:",
      withdrawalId,
      status
    );
  } catch (error) {
    console.error("❌ [REVENUE] Error updating withdrawal status:", error);
    throw error;
  }
};

/**
 * Approuve un retrait (admin)
 * @param withdrawalId ID du retrait
 */
export const approveWithdrawal = async (
  withdrawalId: string
): Promise<void> => {
  await updateWithdrawalStatus(withdrawalId, "approved");
};

/**
 * Rejette un retrait (admin)
 * @param withdrawalId ID du retrait
 * @param reason Raison du rejet
 */
export const rejectWithdrawal = async (
  withdrawalId: string,
  reason: string
): Promise<void> => {
  await updateWithdrawalStatus(withdrawalId, "rejected", reason);
};

/**
 * Marque un retrait comme complété (admin)
 * @param withdrawalId ID du retrait
 * @param notes Notes de traitement
 */
export const completeWithdrawal = async (
  withdrawalId: string,
  notes?: string
): Promise<void> => {
  await updateWithdrawalStatus(withdrawalId, "completed", notes);
};
